import type { DirectoryUpload } from '@stacktape/config/buckets';
import type { Stats } from 'node:fs';
import type { Readable } from 'node:stream';
import type {
  _Object,
  BucketLocationConstraint,
  CORSRule,
  ObjectIdentifier,
  ObjectVersion,
  S3Client,
  Tag
} from '@aws-sdk/client-s3';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketAccelerateConfigurationCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutBucketTaggingCommand,
  PutObjectCommand,
  S3ServiceException
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

/**
 * S3 refuses to create or delete a bucket name while an earlier operation on it settles ("OperationAborted"), for
 * example when a deploy creates the deployment bucket again right after a failed first deploy deleted it.
 */
const isRecentBucketOperationConflict = (error: { name?: string }) => error?.name === 'OperationAborted';

const retryWhile = async <T>(
  isRetryable: (error: { name?: string }) => boolean,
  operation: () => Promise<T>,
  { attempts = 15, delayMs = 2000 } = {}
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error as { name?: string })) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

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

  /**
   * Creates a bucket in `region`, or takes the one this account already owns under the name, and applies the given
   * settings. Every call applies all of them, so a retry completes a bucket an interrupted call left behind. S3 gives
   * every new bucket SSE-S3 encryption and blocks public access by default.
   */
  createBucket = async ({
    bucketName,
    region,
    corsRules,
    policy,
    enableTransferAcceleration,
    tags
  }: {
    bucketName: string;
    region: string;
    corsRules?: CORSRule[];
    policy?: Record<string, unknown>;
    enableTransferAcceleration?: boolean;
    tags?: Tag[];
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to create bucket ${bucketName}.`);
    const client = this.#createClient();
    await retryWhile(isRecentBucketOperationConflict, () =>
      client.send(
        new CreateBucketCommand({
          Bucket: bucketName,
          ObjectOwnership: 'BucketOwnerEnforced',
          ...(region !== 'us-east-1' && {
            CreateBucketConfiguration: { LocationConstraint: region as BucketLocationConstraint }
          })
        })
      )
    ).catch((error) => {
      if (error?.name === 'BucketAlreadyOwnedByYou') return;
      return errorHandler(error);
    });
    // S3 refuses concurrent configuration of a new bucket ("OperationAborted"), and its SDK retries that only after
    // seconds, so the settings are applied one after another. A bucket created moments ago can answer "NoSuchBucket".
    const configure = <T>(send: () => Promise<T>) =>
      retryWhile((error) => error?.name === 'NoSuchBucket', send, { delayMs: 500 }).catch(errorHandler);
    if (enableTransferAcceleration) {
      await configure(() =>
        client.send(
          new PutBucketAccelerateConfigurationCommand({
            Bucket: bucketName,
            AccelerateConfiguration: { Status: 'Enabled' }
          })
        )
      );
    }
    if (policy) {
      await configure(() =>
        client.send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: JSON.stringify(policy) }))
      );
    }
    if (corsRules) {
      await configure(() =>
        client.send(new PutBucketCorsCommand({ Bucket: bucketName, CORSConfiguration: { CORSRules: corsRules } }))
      );
    }
    if (tags?.length) {
      await configure(() =>
        client.send(new PutBucketTaggingCommand({ Bucket: bucketName, Tagging: { TagSet: tags } }))
      );
    }
  };

  /** Deletes a bucket with every object version in it. A bucket that does not exist counts as deleted. */
  deleteBucket = async ({ bucketName }: { bucketName: string }) => {
    if (!(await this.bucketExists({ bucketName }))) return;
    // A later pass deletes what was written while the previous one ran.
    for (let pass = 0; pass < 3; pass++) {
      const versions = await this.listObjectVersions(bucketName);
      if (!versions.length) break;
      await this.deleteObjects(bucketName, versions as ObjectIdentifier[]);
    }
    await retryWhile(isRecentBucketOperationConflict, () =>
      this.#createClient().send(new DeleteBucketCommand({ Bucket: bucketName }))
    ).catch((error) => {
      if (error?.name === 'NoSuchBucket') return;
      return this.#getErrorHandler(`Failed to delete bucket ${bucketName}.`)(error);
    });
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
    contentEncoding,
    bucketName,
    useS3Acceleration,
    metadata
  }: {
    bucketName: string;
    filePath: string;
    s3Key: string;
    contentType?: string;
    /** `gzip` for a file stored compressed; readers decompress it. */
    contentEncoding?: 'gzip';
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
        ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
        ...(metadata ? { Metadata: metadata } : {})
      },
      client: useS3Acceleration ? this.#createAcceleratedClient() : this.#createClient()
    });
    return uploadCommand.done().catch(errorHandler);
  };

  getObjectBytes = async ({ bucketName, s3Key }: { bucketName: string; s3Key: string }): Promise<Uint8Array> => {
    const response = await this.#createClient()
      .send(new GetObjectCommand({ Bucket: bucketName, Key: s3Key }))
      .catch(this.#getErrorHandler('Failed to read a deployment artifact.'));
    if (!response.Body) throw new Error('The deployment artifact has no body.');
    return response.Body.transformToByteArray();
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

  /** With `onlyIfMissing`, the write fails with `PreconditionFailed` when the key already exists. */
  putObject = async ({
    bucketName,
    s3Key,
    body,
    contentType,
    onlyIfMissing
  }: {
    bucketName: string;
    s3Key: string;
    body: string;
    contentType?: string;
    onlyIfMissing?: boolean;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to put object to bucket ${bucketName}. S3 key: ${s3Key}.`);
    return this.#createClient()
      .send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: body,
          ContentType: contentType,
          ...(onlyIfMissing ? { IfNoneMatch: '*' } : {})
        })
      )
      .catch(errorHandler);
  };

  copyObject = async ({
    bucketName,
    sourceKey,
    targetKey
  }: {
    bucketName: string;
    sourceKey: string;
    targetKey: string;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to copy ${sourceKey} to ${targetKey} in bucket ${bucketName}.`);
    return this.#createClient()
      .send(new CopyObjectCommand({ Bucket: bucketName, CopySource: `${bucketName}/${sourceKey}`, Key: targetKey }))
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
