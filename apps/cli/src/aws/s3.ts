import type { DirectoryUpload } from '@stacktape/config/buckets';
import type { Stats } from 'node:fs';
import type { Readable } from 'node:stream';
import type { _Object, ObjectIdentifier, ObjectVersion, S3Client } from '@aws-sdk/client-s3';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketAccelerateConfigurationCommand,
  PutBucketEncryptionCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3ServiceException,
  waitUntilBucketExists
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createWaiter, WaiterState } from '@smithy/util-waiter';
import { getRelativePath } from '@utils/fs-utils';
import { chunkArray, streamToString, stringMatchesGlob } from '@utils/misc';
import { CliError } from '@utils/errors';
import { pascalCase } from 'change-case';
import fsExtra from 'fs-extra';
import path from 'node:path';
import { S3Sync } from './s3-sync';
import { automaticUploadFilterPresets, isS3NativeUploadHeader } from './s3-upload-options';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export type S3SyncInfo = {
  progressPercent: number | string;
  activeTransfers: number;
  progressAmount: number;
  progressTotal: number;
  progressMd5Amount: number;
  progressMd5Total: number;
  objectsFound: number;
  filesFound: number;
  deleteAmount: number;
  deleteTotal: number;
};

export class AwsS3 {
  readonly #createClient: () => S3Client;
  readonly #createAcceleratedClient: () => S3Client;
  readonly #createSyncClient: () => S3Sync;
  readonly #createAcceleratedSyncClient: () => S3Sync;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    createAcceleratedClient,
    createSyncClient,
    createAcceleratedSyncClient,
    getErrorHandler
  }: {
    createClient: () => S3Client;
    createAcceleratedClient: () => S3Client;
    createSyncClient: () => S3Sync;
    createAcceleratedSyncClient: () => S3Sync;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#createAcceleratedClient = createAcceleratedClient;
    this.#createSyncClient = createSyncClient;
    this.#createAcceleratedSyncClient = createAcceleratedSyncClient;
    this.#getErrorHandler = getErrorHandler;
  }

  createBucket = async ({
    bucketName,
    setEncryption,
    bucketPolicy,
    enableTransferAcceleration
  }: {
    bucketName: string;
    setEncryption?: boolean;
    bucketPolicy?: any;
    enableTransferAcceleration?: boolean;
  }) => {
    const errorHandler = this.#getErrorHandler(`Error when creating bucket with name ${bucketName}.`);
    await this.#createClient()
      .send(new CreateBucketCommand({ Bucket: bucketName }))
      .catch(errorHandler);
    if (setEncryption) {
      await this.#createClient()
        .send(
          new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
              Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
            }
          })
        )
        .catch(errorHandler);
    }
    if (bucketPolicy) {
      await this.#createClient()
        .send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: JSON.stringify(bucketPolicy) }))
        .catch(errorHandler);
    }
    if (enableTransferAcceleration) {
      await this.#createClient().send(
        new PutBucketAccelerateConfigurationCommand({
          Bucket: bucketName,
          AccelerateConfiguration: { Status: 'Enabled' }
        })
      );
    }
    await waitUntilBucketExists({ client: this.#createClient(), maxWaitTime: 30 }, { Bucket: bucketName });
  };

  bucketExists = async ({ bucketName }: { bucketName: string }) => {
    const errorHandler = this.#getErrorHandler(`Error when checking for bucket with name ${bucketName}.`);
    try {
      await this.#createClient().send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        return false;
      }
      errorHandler(error as Error);
    }
    return true;
  };

  waitForBucketExists = async ({ bucketName, maxTime }: { bucketName: string; maxTime: number }) => {
    const errorHandler = this.#getErrorHandler(`Waiting for bucket creation timed-out (bucket ${bucketName}).`);
    const waiterResult = await createWaiter(
      { client: this.#createClient(), maxWaitTime: maxTime, minDelay: 1, maxDelay: 1 },
      { bucketName },
      async (_client, input) => {
        const bucketExists = await this.bucketExists(input);

        if (bucketExists) {
          return {
            state: WaiterState.SUCCESS,
            reason: `Bucket ${bucketName} created successfully (available).`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: `Bucket ${bucketName} not available.`
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errorHandler(new Error(waiterResult.reason));
    }
  };

  uploadFile = async ({
    filePath,
    s3Key,
    contentType,
    bucketName,
    useS3Acceleration,
    metadata
  }: {
    bucketName: string;
    filePath: string;
    s3Key: string;
    contentType?: string;
    useS3Acceleration?: boolean;
    metadata?: Record<string, string>;
  }) => {
    const errorHandler = this.#getErrorHandler(
      `Failed to upload file ${filePath} to bucket ${bucketName}. S3 key: ${s3Key}.`
    );
    const uploadCommand = new Upload({
      params: {
        Bucket: bucketName,
        Key: s3Key,
        Body: fsExtra.createReadStream(filePath),
        ...(contentType ? { ContentType: contentType } : {}),
        ...(metadata ? { Metadata: metadata } : {})
      },
      client: useS3Acceleration ? this.#createAcceleratedClient() : this.#createClient()
    });
    return uploadCommand.done().catch(errorHandler);
  };

  getObjectText = async ({
    bucketName,
    s3Key,
    injectedS3Client
  }: {
    bucketName: string;
    s3Key: string;
    injectedS3Client?: S3Client;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to get object from bucket ${bucketName}. S3 key: ${s3Key}.`);
    const response = await (injectedS3Client || this.#createClient())
      .send(new GetObjectCommand({ Bucket: bucketName, Key: s3Key }))
      .catch(errorHandler);

    return streamToString(response.Body as Readable);
  };

  putObject = async ({
    bucketName,
    s3Key,
    body,
    contentType
  }: {
    bucketName: string;
    s3Key: string;
    body: string;
    contentType?: string;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to put object to bucket ${bucketName}. S3 key: ${s3Key}.`);
    return this.#createClient()
      .send(new PutObjectCommand({ Bucket: bucketName, Key: s3Key, Body: body, ContentType: contentType }))
      .catch(errorHandler);
  };

  restoreObjectVersion = async ({
    bucketName,
    key,
    versionId
  }: {
    bucketName: string;
    key: string;
    versionId: string;
  }) => {
    const errorHandler = this.#getErrorHandler(
      `Failed to copy object version ${versionId} of ${key} in bucket ${bucketName}.`
    );
    return this.#createClient()
      .send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${key}?versionId=${versionId}`,
          Key: key
        })
      )
      .catch(errorHandler);
  };

  syncDirectory = async ({
    uploadConfiguration: {
      directoryPath,
      fileOptions,
      excludeFilesPatterns,
      disableS3TransferAcceleration,
      headersPreset
    },
    bucketName,
    deleteRemoved,
    onProgress
  }: {
    bucketName: string;
    deleteRemoved?: boolean;
    onProgress: (params: S3SyncInfo) => any;
    uploadConfiguration: DirectoryUpload;
  }): Promise<S3SyncInfo> => {
    if (!fsExtra.existsSync(directoryPath)) {
      throw new CliError({
        category: 'SYNC_BUCKET',
        code: 'SYNC_BUCKET_DIRECTORY_INACCESSIBLE',
        message: `Directory \`${directoryPath}\` does not exist or is not accessible.`
      });
    }

    const finalFilters = (headersPreset ? automaticUploadFilterPresets[headersPreset] : []).concat(fileOptions || []);
    const syncClient =
      disableS3TransferAcceleration === true ? this.#createSyncClient() : this.#createAcceleratedSyncClient();
    const uploader = syncClient.uploadDir({
      localDir: directoryPath,
      deleteRemoved,
      skipFiles: excludeFilesPatterns,
      s3Params: {
        Bucket: bucketName
      },
      getS3Params: (localFilePath: string, _localFileStats: Stats, callback: (error: any, s3Params: any) => void) => {
        const localFileRelativePath = path.relative(directoryPath, localFilePath);
        const cumulatedMetadataHeaders: Record<string, string> = {};
        const cumulatedTags: string[] = [];
        const nativelySupportedHeaders: Record<string, string> = {};
        (finalFilters || []).forEach((filter) => {
          if (
            stringMatchesGlob(localFileRelativePath, filter.includePattern) &&
            !(filter.excludePattern && stringMatchesGlob(localFileRelativePath, filter.excludePattern))
          ) {
            filter.headers?.forEach(({ key, value }) => {
              if (isS3NativeUploadHeader(key)) {
                nativelySupportedHeaders[pascalCase(key)] = value;
              } else {
                cumulatedMetadataHeaders[key] = value;
              }
            });
            filter.tags?.forEach(({ key, value }) => {
              cumulatedTags.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            });
          }
        });
        callback(null, {
          Metadata: cumulatedMetadataHeaders,
          Tagging: cumulatedTags.join('&'),
          ...nativelySupportedHeaders
        });
      }
    });
    let maxProgressPercent = 0;
    const getStats = (): S3SyncInfo => {
      const {
        activeTransfers,
        progressAmount,
        progressTotal,
        progressMd5Amount,
        progressMd5Total,
        objectsFound,
        filesFound,
        deleteAmount,
        deleteTotal
      } = uploader as any;
      const total = Number(progressTotal);
      const amount = Number(progressAmount);
      if (total > 0 && Number.isFinite(amount)) {
        const rawPercent = (amount / total) * 100;
        if (rawPercent > maxProgressPercent) {
          maxProgressPercent = Math.min(rawPercent, 100);
        }
      }
      return {
        activeTransfers,
        progressAmount,
        progressTotal,
        progressMd5Amount,
        progressMd5Total,
        objectsFound,
        filesFound,
        deleteAmount,
        deleteTotal,
        progressPercent: maxProgressPercent > 0 ? maxProgressPercent.toFixed(2) : '0'
      };
    };
    let lastStats = getStats();
    const interval = setInterval(async () => {
      await onProgress(lastStats);
    }, 50);
    return new Promise((resolve, reject) => {
      uploader.on('error', (error: any) => {
        reject(
          new CliError({
            category: 'SYNC_BUCKET',
            code: 'SYNC_BUCKET_UPLOAD_FAILED',
            message: `Syncing files from directory '${getRelativePath(
              directoryPath
            )}' into ${bucketName} failed. Error:\n${error}.`,
            cause: error
          })
        );
      });
      uploader.on('progress', () => {
        lastStats = getStats();
      });
      uploader.on('end', () => {
        clearInterval(interval);
        resolve(getStats());
      });
    });
  };

  deleteObjects = async (bucketName: string, objectKeys: ObjectIdentifier[]) => {
    const errorHandler = this.#getErrorHandler(`Failed to batch delete objects from bucket ${bucketName}.`);
    const validObjectKeys: ObjectIdentifier[] = objectKeys
      .filter((object) => object?.Key)
      .map(({ Key, VersionId }) => (VersionId ? { Key, VersionId } : { Key }));
    if (validObjectKeys.length) {
      return Promise.all(
        chunkArray(validObjectKeys, 1000).map((chunk) =>
          this.#createClient()
            .send(
              new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: { Objects: chunk }
              })
            )
            .catch(errorHandler)
        )
      );
    }
    return Promise.resolve();
  };

  listObjects = async (bucketName: string, injectedS3Client?: S3Client) => {
    let result: _Object[] = [];
    const errorHandler = this.#getErrorHandler(`Failed to list all objects in bucket ${bucketName}.`);
    let { Contents, NextContinuationToken } = await (injectedS3Client || this.#createClient())
      .send(new ListObjectsV2Command({ Bucket: bucketName }))
      .catch(errorHandler);

    if (Contents) result = result.concat(Contents);
    while (NextContinuationToken) {
      ({ Contents, NextContinuationToken } = await (injectedS3Client || this.#createClient())
        .send(new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken: NextContinuationToken }))
        .catch(errorHandler));
      if (Contents) result = result.concat(Contents);
    }
    return result;
  };

  listObjectVersions = async (bucketName: string, injectedS3Client?: S3Client) => {
    let result: ObjectVersion[] = [];
    const errorHandler = this.#getErrorHandler(`Failed to list all versioned objects in bucket ${bucketName}.`);
    let { Versions, DeleteMarkers, NextKeyMarker, NextVersionIdMarker } = await (
      injectedS3Client || this.#createClient()
    )
      .send(new ListObjectVersionsCommand({ Bucket: bucketName }))
      .catch(errorHandler);

    if (Versions) result = result.concat(Versions);
    if (DeleteMarkers) result = result.concat(DeleteMarkers);
    while (NextKeyMarker || NextVersionIdMarker) {
      ({ Versions, DeleteMarkers, NextKeyMarker, NextVersionIdMarker } = await (
        injectedS3Client || this.#createClient()
      )
        .send(
          new ListObjectVersionsCommand({
            Bucket: bucketName,
            KeyMarker: NextKeyMarker,
            VersionIdMarker: NextVersionIdMarker
          })
        )
        .catch(errorHandler));
      if (Versions) result = result.concat(Versions);
      if (DeleteMarkers) result = result.concat(DeleteMarkers);
    }
    return result;
  };
}
