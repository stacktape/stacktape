import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { S3Client } from '@aws-sdk/client-s3';
import { DeleteObjectsCommand, ListObjectsV2Command, ListObjectVersionsCommand } from '@aws-sdk/client-s3';
import type { S3Sync } from '../../src/aws/s3-sync';
import { AwsS3 } from '../../src/aws/s3';

type Send = S3Client['send'];

const capabilityWith = ({ send, syncClient }: { send: Send; syncClient?: S3Sync }) =>
  new AwsS3({
    createClient: () => ({ send }) as S3Client,
    createAcceleratedClient: () => ({ send }) as S3Client,
    createSyncClient: () => syncClient || unexpectedSyncClient(),
    createAcceleratedSyncClient: () => syncClient || unexpectedSyncClient(),
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

const unexpectedSyncClient = (): never => {
  throw new Error('S3 sync was not expected in this test.');
};

describe('S3 operations', () => {
  test('follows object and object-version pagination tokens without reordering results', async () => {
    const objectRequests: ListObjectsV2Command[] = [];
    const versionRequests: ListObjectVersionsCommand[] = [];
    const objectPages = [
      { Contents: [{ Key: 'first' }], NextContinuationToken: 'objects-2' },
      { Contents: [{ Key: 'second' }] }
    ];
    const versionPages = [
      {
        Versions: [{ Key: 'version', VersionId: 'v2' }],
        DeleteMarkers: [{ Key: 'deleted', VersionId: 'd2' }],
        NextKeyMarker: 'versions-2',
        NextVersionIdMarker: 'v1'
      },
      { Versions: [{ Key: 'version', VersionId: 'v1' }] }
    ];
    const s3 = capabilityWith({
      send: (async (command: ListObjectsV2Command | ListObjectVersionsCommand) => {
        if (command instanceof ListObjectsV2Command) {
          objectRequests.push(command);
          return objectPages.shift();
        }
        versionRequests.push(command);
        return versionPages.shift();
      }) as Send
    });

    await expect(s3.listObjects('artifacts')).resolves.toEqual([{ Key: 'first' }, { Key: 'second' }]);
    await expect(s3.listObjectVersions('artifacts')).resolves.toEqual([
      { Key: 'version', VersionId: 'v2' },
      { Key: 'deleted', VersionId: 'd2' },
      { Key: 'version', VersionId: 'v1' }
    ]);
    expect(objectRequests.map(({ input }) => input)).toEqual([
      { Bucket: 'artifacts' },
      { Bucket: 'artifacts', ContinuationToken: 'objects-2' }
    ]);
    expect(versionRequests.map(({ input }) => input)).toEqual([
      { Bucket: 'artifacts' },
      { Bucket: 'artifacts', KeyMarker: 'versions-2', VersionIdMarker: 'v1' }
    ]);
  });

  test('deletes only valid S3 identifiers in service-sized batches', async () => {
    const requests: DeleteObjectsCommand[] = [];
    const s3 = capabilityWith({
      send: (async (command: DeleteObjectsCommand) => {
        requests.push(command);
        return {};
      }) as Send
    });
    const objects = Array.from({ length: 1001 }, (_, index) => ({
      Key: `object-${index}`,
      VersionId: `version-${index}`,
      ignored: 'not part of ObjectIdentifier'
    }));

    await s3.deleteObjects('artifacts', [{}, ...objects] as any);

    expect(requests).toHaveLength(2);
    expect(requests[0].input.Delete?.Objects).toHaveLength(1000);
    expect(requests[1].input.Delete?.Objects).toEqual([{ Key: 'object-1000', VersionId: 'version-1000' }]);
    expect(requests[0].input.Delete?.Objects?.[0]).toEqual({ Key: 'object-0', VersionId: 'version-0' });
  });

  test('keeps directory-sync header, metadata, tag, and progress behavior together', async () => {
    let uploadParams: any;
    const uploader = Object.assign(new EventEmitter(), {
      activeTransfers: 0,
      progressAmount: 2,
      progressTotal: 2,
      progressMd5Amount: 2,
      progressMd5Total: 2,
      objectsFound: 1,
      filesFound: 1,
      deleteAmount: 0,
      deleteTotal: 0
    });
    const syncClient = {
      uploadDir(params: any) {
        uploadParams = params;
        queueMicrotask(() => uploader.emit('end'));
        return uploader;
      }
    } as unknown as S3Sync;
    const s3 = capabilityWith({
      send: (async () => ({})) as Send,
      syncClient
    });

    await expect(
      s3.syncDirectory({
        bucketName: 'website',
        deleteRemoved: true,
        onProgress: () => undefined,
        uploadConfiguration: {
          directoryPath: import.meta.dir,
          disableS3TransferAcceleration: true,
          excludeFilesPatterns: ['**/*.map'],
          fileOptions: [
            {
              includePattern: '**/*.html',
              headers: [
                { key: 'cache-control', value: 'no-cache' },
                { key: 'x-stacktape-origin', value: 'static' }
              ],
              tags: [{ key: 'release channel', value: 'v4/preview' }]
            }
          ]
        }
      })
    ).resolves.toMatchObject({ progressAmount: 2, progressPercent: '100.00', progressTotal: 2 });

    expect(uploadParams).toMatchObject({
      deleteRemoved: true,
      localDir: import.meta.dir,
      s3Params: { Bucket: 'website' },
      skipFiles: ['**/*.map']
    });
    let perFileParams: Record<string, unknown> | undefined;
    uploadParams.getS3Params(`${import.meta.dir}/index.html`, {}, (error: unknown, params: Record<string, unknown>) => {
      expect(error).toBeNull();
      perFileParams = params;
    });
    expect(perFileParams).toEqual({
      CacheControl: 'no-cache',
      Metadata: { 'x-stacktape-origin': 'static' },
      Tagging: 'release%20channel=v4%2Fpreview'
    });
  });
});
