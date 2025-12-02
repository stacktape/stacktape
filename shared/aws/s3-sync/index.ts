// ORIGINALLY this repo https://github.com/auth0/node-s3-client
// Refactored to TypeScript and modernized for Bun compatibility
import type { Stats } from 'node:fs';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import url from 'node:url';
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Pend, stringMatchesGlob } from '@shared/utils/misc';
import fsExtra from 'fs-extra';
import mime from 'mime';
import StreamSink from 'streamsink';
import { MultipartETag } from './multipart-etag';

const { mkdirp, remove } = fsExtra;
const MAX_PUTOBJECT_SIZE = 5 * 1024 * 1024 * 1024;
const MAX_DELETE_COUNT = 1000;
const MIN_MULTIPART_SIZE = 5 * 1024 * 1024;
const TO_UNIX_RE = new RegExp(quotemeta(path.sep), 'g');

interface S3SyncOptions {
  clientArgs: any;
  s3Plugins: any[];
  s3RetryCount?: number;
  s3RetryDelay?: number;
  multipartUploadThreshold?: number;
  multipartUploadSize?: number;
  multipartDownloadThreshold?: number;
  multipartDownloadSize?: number;
}

interface UploadFileParams {
  localFile: string;
  s3Params: any;
  defaultContentType?: string;
}

interface DownloadFileParams {
  localFile: string;
  s3Params: any;
}

interface ListObjectsParams {
  recursive?: boolean;
  s3Params: any;
}

interface DeleteObjectsParams {
  Bucket: string;
  Delete: any;
  MFA?: string;
}

interface SyncDirParams {
  localDir: string;
  deleteRemoved?: boolean;
  followSymlinks?: boolean;
  s3Params: any;
  getS3Params?: (filePath: string, stat: any, callback: (err: any, s3Params?: any) => void) => void;
  defaultContentType?: string;
  skipFiles?: string[];
}

interface LocalFileStat extends Stats {
  path: string;
  s3Path: string;
  multipartETag?: MultipartETag;
}

export class S3Sync {
  public s3: S3;
  public s3Pend: Pend;
  public s3RetryCount: number;
  public s3RetryDelay: number;
  public multipartUploadThreshold: number;
  public multipartUploadSize: number;
  public multipartDownloadThreshold: number;
  public multipartDownloadSize: number;

  constructor(options: S3SyncOptions) {
    this.s3 = new S3(options.clientArgs);
    options.s3Plugins.forEach((plugin) => {
      this.s3.middlewareStack.use(plugin);
    });
    this.s3Pend = new Pend({ max: 20 });
    this.s3RetryCount = options.s3RetryCount || 3;
    this.s3RetryDelay = options.s3RetryDelay || 1000;
    this.multipartUploadThreshold = options.multipartUploadThreshold || 20 * 1024 * 1024;
    this.multipartUploadSize = options.multipartUploadSize || 15 * 1024 * 1024;
    this.multipartDownloadThreshold = options.multipartDownloadThreshold || 20 * 1024 * 1024;
    this.multipartDownloadSize = options.multipartDownloadSize || 15 * 1024 * 1024;

    if (this.multipartUploadThreshold < MIN_MULTIPART_SIZE) throw new Error('Minimum multipartUploadThreshold is 5MB.');

    if (this.multipartUploadThreshold > MAX_PUTOBJECT_SIZE) throw new Error('Maximum multipartUploadThreshold is 5GB.');

    if (this.multipartUploadSize < MIN_MULTIPART_SIZE) throw new Error('Minimum multipartUploadSize is 5MB.');

    if (this.multipartUploadSize > MAX_PUTOBJECT_SIZE) throw new Error('Maximum multipartUploadSize is 5GB.');
  }

  deleteObjects(s3Params: DeleteObjectsParams): EventEmitter {
    const ee = new EventEmitter();

    const params = {
      Bucket: s3Params.Bucket,
      Delete: extend({}, s3Params.Delete),
      MFA: s3Params.MFA
    };
    const slices = chunkArray(params.Delete.Objects, MAX_DELETE_COUNT);
    const pend = new Pend();

    (ee as any).progressAmount = 0;
    (ee as any).progressTotal = params.Delete.Objects.length;

    slices.forEach((slice) => {
      pend.go((cb) => {
        doWithRetry(
          (innerCb) => {
            this.s3Pend.go(async (pendCb) => {
              params.Delete.Objects = slice;
              try {
                const data = await this.s3.deleteObjects(params);
                pendCb();
                innerCb(null, data);
              } catch (err) {
                pendCb();
                innerCb(err);
              }
            });
          },
          this.s3RetryCount,
          this.s3RetryDelay,
          (err, data) => {
            if (err) {
              cb(err);
            } else {
              (ee as any).progressAmount += slice.length;
              ee.emit('progress');
              ee.emit('data', data);
              cb();
            }
          }
        );
      });
    });

    pend.wait((err) => {
      if (err) {
        ee.emit('error', err);
        return;
      }
      ee.emit('end');
    });

    return ee;
  }

  uploadFile(params: UploadFileParams): EventEmitter {
    const uploader = new EventEmitter();
    (uploader as any).progressMd5Amount = 0;
    (uploader as any).progressAmount = 0;
    (uploader as any).progressTotal = 0;

    const localFile = params.localFile;
    const s3Params = extend({}, params.s3Params);

    if (s3Params.ContentType === undefined) {
      s3Params.ContentType = mime.getType(localFile);
    }

    (uploader as any).abort = () => {
      fatalError = true;
    };

    (uploader as any).getPublicUrl = () => {
      return getPublicUrl(s3Params.Bucket, s3Params.Key, this.s3.config.region, this.s3.config.endpoint);
    };

    (uploader as any).getPublicUrlHttp = () => {
      return getPublicUrlHttp(s3Params.Bucket, s3Params.Key, this.s3.config.endpoint);
    };

    let fatalError = false;

    const handleError = (err: any) => {
      if (fatalError) {
        return;
      }
      fatalError = true;
      uploader.emit('error', err);
    };

    // Start the upload process
    fs.stat(localFile, async (err, stat) => {
      if (err) {
        return handleError(err);
      }

      (uploader as any).progressTotal = stat.size;

      try {
        // Use @aws-sdk/lib-storage for better Bun compatibility
        const fileStream = fs.createReadStream(localFile);

        uploader.emit('fileOpened', fileStream);

        const upload = new Upload({
          client: this.s3,
          params: {
            ...s3Params,
            Body: fileStream,
            ContentLength: stat.size
          },
          partSize: this.multipartUploadSize,
          queueSize: 4
        });

        // Only use Upload's progress tracking to avoid conflicts
        upload.on('httpUploadProgress', (progress) => {
          if (fatalError) {
            return;
          }
          if (progress.loaded !== undefined && progress.total !== undefined) {
            (uploader as any).progressAmount = progress.loaded;
            (uploader as any).progressTotal = progress.total;
            uploader.emit('progress');
          }
        });

        const result = await upload.done();

        if (fatalError) {
          return;
        }

        uploader.emit('fileClosed');
        uploader.emit('end', result);
      } catch (error) {
        handleError(error);
      }
    });

    return uploader;
  }

  downloadFile(params: DownloadFileParams): EventEmitter {
    const downloader = new EventEmitter();
    const localFile = params.localFile;
    const s3Params = extend({}, params.s3Params);

    const dirPath = path.dirname(localFile);
    (downloader as any).progressAmount = 0;

    mkdirp(dirPath, (err) => {
      if (err) {
        downloader.emit('error', err);
        return;
      }

      doWithRetry(
        (cb) => {
          this.s3Pend.go(async (pendCb) => {
            try {
              await this.doDownload(localFile, s3Params, downloader);
              pendCb();
              cb(null);
            } catch (error) {
              pendCb();
              cb(error);
            }
          });
        },
        this.s3RetryCount,
        this.s3RetryDelay,
        (err) => {
          if (err) {
            downloader.emit('error', err);
            return;
          }
          downloader.emit('end');
        }
      );
    });

    return downloader;
  }

  private async doDownload(localFile: string, s3Params: any, downloader: EventEmitter): Promise<void> {
    return new Promise((resolve, reject) => {
      let errorOccurred = false;

      const handleError = (err: any) => {
        if (!err || errorOccurred) {
          return;
        }
        errorOccurred = true;
        reject(err);
      };

      this.s3
        .getObject(s3Params)
        .then((response) => {
          const contentLength = response.ContentLength || 0;
          const eTag = cleanETag(response.ETag);
          const eTagCount = getETagCount(eTag);

          (downloader as any).progressTotal = contentLength;
          (downloader as any).progressAmount = 0;
          downloader.emit('progress');

          const outStream = fs.createWriteStream(localFile);
          const multipartETag = new MultipartETag({ size: contentLength, count: eTagCount });

          outStream.on('error', handleError);

          multipartETag.on('progress', () => {
            (downloader as any).progressAmount = multipartETag.bytes;
            downloader.emit('progress');
          });

          multipartETag.on('end', () => {
            if (multipartETag.bytes !== contentLength) {
              handleError(new Error('Downloaded size does not match Content-Length'));
              return;
            }
            if (eTagCount === 1 && !multipartETag.anyMatch(eTag)) {
              handleError(new Error('ETag does not match MD5 checksum'));
            }
          });

          outStream.on('close', () => {
            if (!errorOccurred) {
              resolve();
            }
          });

          if (response.Body instanceof Readable) {
            response.Body.pipe(multipartETag);
            multipartETag.pipe(outStream);
          } else {
            handleError(new Error('Response body is not a readable stream'));
          }
        })
        .catch(handleError);
    });
  }

  /**
   * Lists objects in S3 bucket
   * @param params.recursive - whether to list recursively
   * @param params.s3Params - S3 parameters (Bucket, Delimiter, Marker, MaxKeys, Prefix)
   */
  listObjects(params: ListObjectsParams): EventEmitter {
    const ee = new EventEmitter();
    const s3Details = extend({}, params.s3Params);
    const recursive = !!params.recursive;
    let abort = false;

    (ee as any).progressAmount = 0;
    (ee as any).objectsFound = 0;
    (ee as any).dirsFound = 0;

    (ee as any).abort = () => {
      abort = true;
    };

    const findAllS3Objects = (marker: string | null, prefix: string, cb: (err?: any) => void) => {
      if (abort) {
        return;
      }

      const listObjectsInternal = (innerCb: (err: any, data?: any) => void) => {
        if (abort) {
          return;
        }
        this.s3Pend.go(async (pendCb) => {
          if (abort) {
            pendCb();
            return;
          }
          s3Details.Marker = marker;
          s3Details.Prefix = prefix;

          try {
            const data = await this.s3.listObjects(s3Details);
            pendCb();
            if (abort) {
              return;
            }
            innerCb(null, data);
          } catch (err) {
            pendCb();
            if (abort) {
              return;
            }
            innerCb(err);
          }
        });
      };

      doWithRetry(listObjectsInternal, this.s3RetryCount, this.s3RetryDelay, (err, data) => {
        if (abort) {
          return;
        }
        if (err) {
          return cb(err);
        }

        if (!data.Contents) {
          data.Contents = [];
        }
        if (!data.CommonPrefixes) {
          data.CommonPrefixes = [];
        }
        (ee as any).progressAmount += 1;
        (ee as any).objectsFound += data.Contents.length;
        (ee as any).dirsFound += data.CommonPrefixes.length;
        ee.emit('progress');
        ee.emit('data', data);

        const pend = new Pend();

        if (recursive) {
          data.CommonPrefixes.forEach((dirObj: any) => {
            const prefix = dirObj.Prefix;
            pend.go((cb) => {
              findAllS3Objects(null, prefix, cb);
            });
          });
          data.CommonPrefixes = [];
        }

        if (data.IsTruncated) {
          pend.go((cb) => {
            const nextMarker = data.NextMarker || data.Contents[data.Contents.length - 1].Key;
            findAllS3Objects(nextMarker, prefix, cb);
          });
        }

        pend.wait((err) => {
          cb(err);
        });
      });
    };

    findAllS3Objects(s3Details.Marker, s3Details.Prefix, (err) => {
      if (err) {
        ee.emit('error', err);
        return;
      }
      ee.emit('end');
    });

    return ee;
  }

  /**
   * Uploads a directory to S3 bucket
   * @param params.deleteRemoved - delete s3 objects with no corresponding local file (default: false)
   * @param params.localDir - path on local file system to sync
   * @param params.s3Params - S3 parameters (Bucket, Key required)
   */
  uploadDir(params: SyncDirParams): EventEmitter {
    return syncDir(this, params, true);
  }

  downloadDir(params: SyncDirParams): EventEmitter {
    return syncDir(this, params, false);
  }

  deleteDir(s3Params: any): EventEmitter {
    const ee = new EventEmitter();
    const bucket = s3Params.Bucket;
    const mfa = s3Params.MFA;
    const listObjectsParams = {
      recursive: true,
      s3Params: {
        Bucket: bucket,
        Prefix: s3Params.Prefix
      }
    };
    const finder = this.listObjects(listObjectsParams);
    const pend = new Pend();
    (ee as any).progressAmount = 0;
    (ee as any).progressTotal = 0;

    finder.on('error', (err) => {
      ee.emit('error', err);
    });

    finder.on('data', (objects: any) => {
      (ee as any).progressTotal += objects.Contents.length;
      ee.emit('progress');
      if (objects.Contents.length > 0) {
        pend.go((cb) => {
          const params = {
            Bucket: bucket,
            Delete: {
              Objects: objects.Contents.map(keyOnly),
              Quiet: true
            },
            MFA: mfa
          };
          const deleter = this.deleteObjects(params);
          deleter.on('error', (err) => {
            (finder as any).abort();
            ee.emit('error', err);
          });
          deleter.on('end', () => {
            (ee as any).progressAmount += objects.Contents.length;
            ee.emit('progress');
            cb();
          });
        });
      }
    });

    finder.on('end', () => {
      pend.wait(() => {
        ee.emit('end');
      });
    });

    return ee;
  }

  copyObject(s3Params: any): EventEmitter {
    const ee = new EventEmitter();
    const params = extend({}, s3Params);
    delete params.MFA;

    doWithRetry(
      (cb) => {
        this.s3Pend.go(async (pendCb) => {
          try {
            const data = await this.s3.copyObject(params);
            pendCb();
            cb(null, data);
          } catch (err) {
            pendCb();
            cb(err);
          }
        });
      },
      this.s3RetryCount,
      this.s3RetryDelay,
      (err, data) => {
        if (err) {
          ee.emit('error', err);
        } else {
          ee.emit('end', data);
        }
      }
    );

    return ee;
  }

  moveObject(s3Params: any): EventEmitter {
    const ee = new EventEmitter();
    const copier = this.copyObject(s3Params);
    const copySource = s3Params.CopySource;
    const mfa = s3Params.MFA;

    copier.on('error', (err) => {
      ee.emit('error', err);
    });

    copier.on('end', (data) => {
      ee.emit('copySuccess', data);
      const slashIndex = copySource.indexOf('/');
      const sourceBucket = copySource.substring(0, slashIndex);
      const sourceKey = copySource.substring(slashIndex + 1);
      const deleteS3Params = {
        Bucket: sourceBucket,
        Delete: {
          Objects: [
            {
              Key: sourceKey
            }
          ],
          Quiet: true
        },
        MFA: mfa
      };
      const deleter = this.deleteObjects(deleteS3Params);
      deleter.on('error', (err) => {
        ee.emit('error', err);
      });
      let deleteData: any;
      deleter.on('data', (data) => {
        deleteData = data;
      });
      deleter.on('end', () => {
        ee.emit('end', deleteData);
      });
    });

    return ee;
  }

  downloadBuffer(s3Params: any): EventEmitter {
    const downloader = new EventEmitter();
    const params = extend({}, s3Params);

    (downloader as any).progressAmount = 0;

    doWithRetry(
      (cb) => {
        this.s3Pend.go(async (pendCb) => {
          try {
            const response = await this.s3.getObject(params);
            const contentLength = response.ContentLength || 0;
            const eTag = cleanETag(response.ETag);
            const eTagCount = getETagCount(eTag);

            (downloader as any).progressTotal = contentLength;
            (downloader as any).progressAmount = 0;
            downloader.emit('progress');

            const outStream = new StreamSink();
            const multipartETag = new MultipartETag({ size: contentLength, count: eTagCount });

            multipartETag.on('progress', () => {
              (downloader as any).progressAmount = multipartETag.bytes;
              downloader.emit('progress');
            });

            if (response.Body instanceof Readable) {
              response.Body.pipe(multipartETag);
              multipartETag.pipe(outStream);

              outStream.on('finish', () => {
                if (multipartETag.bytes !== contentLength) {
                  pendCb();
                  cb(new Error('Downloaded size does not match Content-Length'));
                  return;
                }
                if (eTagCount === 1 && !multipartETag.anyMatch(eTag)) {
                  pendCb();
                  cb(new Error('ETag does not match MD5 checksum'));
                  return;
                }
                pendCb();
                cb(null, outStream.toBuffer());
              });

              outStream.on('error', (err) => {
                pendCb();
                cb(err);
              });
            } else {
              pendCb();
              cb(new Error('Response body is not a readable stream'));
            }
          } catch (err) {
            pendCb();
            cb(err);
          }
        });
      },
      this.s3RetryCount,
      this.s3RetryDelay,
      (err, buffer) => {
        if (err) {
          downloader.emit('error', err);
          return;
        }
        downloader.emit('end', buffer);
      }
    );

    return downloader;
  }

  downloadStream(s3Params: any): PassThrough {
    const downloadStream = new PassThrough();
    const params = extend({}, s3Params);

    this.s3Pend.go(async (pendCb) => {
      try {
        const response = await this.s3.getObject(params);

        if (response.Body instanceof Readable) {
          response.Body.pipe(downloadStream);
          response.Body.on('error', (err) => {
            downloadStream.emit('error', err);
          });
        } else {
          downloadStream.emit('error', new Error('Response body is not a readable stream'));
        }
        pendCb();
      } catch (err) {
        downloadStream.emit('error', err);
        pendCb();
      }
    });

    return downloadStream;
  }
}

function syncDir(self: S3Sync, params: SyncDirParams, directionIsToS3: boolean): EventEmitter {
  const ee = new EventEmitter();
  const followSymlinks = params.followSymlinks == null ? true : !!params.followSymlinks;
  const localDir = params.localDir;
  const deleteRemoved = params.deleteRemoved === true;
  let fatalError = false;
  const prefix = params.s3Params.Prefix ? ensureSlash(params.s3Params.Prefix) : '';
  const bucket = params.s3Params.Bucket;
  const listObjectsParams = {
    recursive: true,
    s3Params: {
      Bucket: bucket,
      Prefix: prefix
    }
  };
  const getS3Params = params.getS3Params;
  const baseUpDownS3Params = extend({}, params.s3Params);
  const upDownFileParams: any = {
    s3Params: baseUpDownS3Params,
    defaultContentType: params.defaultContentType
  };
  delete upDownFileParams.s3Params.Prefix;

  // skipped files are considered non-existent
  // this only works when direction is to S3
  const skipFiles: string[] = params.skipFiles || [];

  (ee as any).activeTransfers = 0;
  (ee as any).progressAmount = 0;
  (ee as any).progressTotal = 0;
  (ee as any).progressMd5Amount = 0;
  (ee as any).progressMd5Total = 0;
  (ee as any).objectsFound = 0;
  (ee as any).filesFound = 0;
  (ee as any).deleteAmount = 0;
  (ee as any).deleteTotal = 0;
  (ee as any).doneFindingFiles = false;
  (ee as any).doneFindingObjects = false;
  (ee as any).doneMd5 = false;

  const allLocalFiles: LocalFileStat[] = [];
  const allS3Objects: any[] = [];
  let localFileCursor = 0;
  let s3ObjectCursor = 0;
  let objectsToDelete: any[] = [];

  findAllS3Objects();
  startFindAllFiles();

  return ee;

  function flushDeletes() {
    if (objectsToDelete.length === 0) {
      return;
    }
    const thisObjectsToDelete = objectsToDelete;
    objectsToDelete = [];
    const params = {
      Bucket: bucket,
      Delete: {
        Objects: thisObjectsToDelete,
        Quiet: true
      }
    };
    const deleter = self.deleteObjects(params);
    deleter.on('error', handleError);
    deleter.on('end', () => {
      if (fatalError) {
        return;
      }
      (ee as any).deleteAmount += thisObjectsToDelete.length;
      ee.emit('progress');
      checkDoMoreWork();
    });
  }

  function checkDoMoreWork() {
    if (fatalError) {
      return;
    }

    const localFileStat = allLocalFiles[localFileCursor];
    const s3Object = allS3Objects[s3ObjectCursor];

    // need to wait for a file or object. checkDoMoreWork will get called
    // again when that happens.
    if (!localFileStat && !(ee as any).doneMd5) {
      return;
    }
    if (!s3Object && !(ee as any).doneFindingObjects) {
      return;
    }

    // need to wait until the md5 is done computing for the local file
    if (localFileStat && !localFileStat.multipartETag) {
      return;
    }

    // localFileStat or s3Object could still be null - in that case we have
    // reached the real end of the list.

    // if they're both null, we've reached the true end
    if (!localFileStat && !s3Object) {
      // if we don't have any pending deletes or uploads, we're actually done
      flushDeletes();
      if (
        (ee as any).deleteAmount >= (ee as any).deleteTotal &&
        (ee as any).progressAmount >= (ee as any).progressTotal &&
        (ee as any).activeTransfers === 0
      ) {
        ee.emit('end');
        // prevent checkDoMoreWork from doing any more work
        fatalError = true;
      }
      // either way, there's nothing else to do in this method
      return;
    }

    // special case for directories when deleteRemoved is true and we're
    // downloading a dir from S3. We don't add directories to the list
    // unless this case is true, so we assert that fact here.
    if (localFileStat && localFileStat.isDirectory()) {
      assert.ok(!directionIsToS3);
      assert.ok(deleteRemoved);

      localFileCursor += 1;
      setImmediate(checkDoMoreWork);

      if (!s3Object || s3Object.key.indexOf(localFileStat.s3Path) !== 0) {
        deleteLocalDir();
      }
      return;
    }

    if (directionIsToS3) {
      if (!localFileStat) {
        deleteS3Object();
      } else if (!s3Object) {
        uploadLocalFile();
      } else if (localFileStat.s3Path < s3Object.key) {
        uploadLocalFile();
      } else if (localFileStat.s3Path > s3Object.key) {
        deleteS3Object();
      } else if (!compareMultipartETag(s3Object.ETag, localFileStat.multipartETag)) {
        // both file cursor and s3 cursor should increment
        s3ObjectCursor += 1;
        uploadLocalFile();
      } else {
        // we always update the metadata
        // i.e even if file has not changed, metadata or tags could have and therefore we need to do this
        // @todo in future - we might detect when metadata has changed and update only in those cases
        // both file cursor and s3 cursor should increment
        localFileCursor += 1;
        s3ObjectCursor += 1;
        updateMetadataOfObject();
      }
    } else if (!localFileStat) {
      downloadS3Object();
    } else if (!s3Object) {
      deleteLocalFile();
    } else if (localFileStat.s3Path < s3Object.key) {
      deleteLocalFile();
    } else if (localFileStat.s3Path > s3Object.key) {
      downloadS3Object();
    } else if (!compareMultipartETag(s3Object.ETag, localFileStat.multipartETag)) {
      // both file cursor and s3 cursor should increment
      localFileCursor += 1;
      downloadS3Object();
    } else {
      skipThisOne();
    }

    function deleteLocalDir() {
      const fullPath = path.join(localDir, localFileStat!.path);
      (ee as any).deleteTotal += 1;
      remove(fullPath, (err) => {
        if (fatalError) {
          return;
        }
        if (err && (err as any).code !== 'ENOENT') {
          return handleError(err);
        }
        (ee as any).deleteAmount += 1;
        ee.emit('progress');
        checkDoMoreWork();
      });
    }

    function deleteLocalFile() {
      localFileCursor += 1;
      setImmediate(checkDoMoreWork);
      if (!deleteRemoved) {
        return;
      }
      (ee as any).deleteTotal += 1;
      const fullPath = path.join(localDir, localFileStat!.path);
      fs.unlink(fullPath, (err) => {
        if (fatalError) {
          return;
        }
        if (err && (err as any).code !== 'ENOENT') {
          return handleError(err);
        }
        (ee as any).deleteAmount += 1;
        ee.emit('progress');
        checkDoMoreWork();
      });
    }

    function downloadS3Object() {
      s3ObjectCursor += 1;
      setImmediate(checkDoMoreWork);
      const fullPath = path.join(localDir, toNativeSep(s3Object.key));

      if (getS3Params) {
        getS3Params(fullPath, s3Object, haveS3Params);
      } else {
        startDownload();
      }

      function haveS3Params(err, s3Params) {
        if (fatalError) {
          return;
        }
        if (err) {
          return handleError(err);
        }

        if (!s3Params) {
          // user has decided to skip this file
          return;
        }

        upDownFileParams.s3Params = extend(extend({}, baseUpDownS3Params), s3Params);
        startDownload();
      }

      function startDownload() {
        (ee as any).progressTotal += s3Object.Size;
        const fullKey = s3Object.Key;
        upDownFileParams.s3Params.Key = fullKey;
        upDownFileParams.localFile = fullPath;
        const downloader = self.downloadFile(upDownFileParams);
        let prevAmountDone = 0;
        (ee as any).activeTransfers++;
        ee.emit('fileDownloadStart', fullPath, fullKey);
        downloader.on('error', handleError);
        downloader.on('progress', () => {
          if (fatalError) {
            return;
          }
          const delta = (downloader as any).progressAmount - prevAmountDone;
          prevAmountDone = (downloader as any).progressAmount;
          (ee as any).progressAmount += delta;
          ee.emit('progress');
        });
        downloader.on('end', () => {
          (ee as any).activeTransfers--;
          ee.emit('fileDownloadEnd', fullPath, fullKey);
          ee.emit('progress');
          checkDoMoreWork();
        });
      }
    }

    function skipThisOne() {
      s3ObjectCursor += 1;
      localFileCursor += 1;
      setImmediate(checkDoMoreWork);
    }

    function updateMetadataOfObject() {
      setImmediate(checkDoMoreWork);
      const fullPath = path.join(localDir, localFileStat.path);

      if (getS3Params) {
        getS3Params(fullPath, localFileStat, haveS3Params);
      } else {
        upDownFileParams.s3Params = baseUpDownS3Params;
        startCopy();
      }

      function haveS3Params(err, s3Params) {
        if (fatalError) {
          return;
        }
        if (err) {
          return handleError(err);
        }

        if (!s3Params) {
          // user has decided to skip this file
          return;
        }

        upDownFileParams.s3Params = extend(extend({}, baseUpDownS3Params), s3Params);
        startCopy();
      }

      function startCopy() {
        const fullKey = prefix + localFileStat!.s3Path;
        upDownFileParams.s3Params.Key = fullKey;
        const copier = self.copyObject({
          CopySource: `${upDownFileParams.s3Params.Bucket}/${upDownFileParams.s3Params.Key}`,
          TaggingDirective: 'REPLACE',
          MetadataDirective: 'REPLACE',
          ContentType: mime.getType(fullPath),
          ...upDownFileParams.s3Params
        });
        (ee as any).activeTransfers++;
        ee.emit('copyStart', fullKey);
        copier.on('error', (err) => {
          handleError(err);
        });
        copier.on('progress', () => {
          if (fatalError) {
            return;
          }
          ee.emit('progress');
        });
        copier.on('end', () => {
          (ee as any).activeTransfers--;
          ee.emit('copySuccess', fullKey);
          ee.emit('progress');
          checkDoMoreWork();
        });
      }
    }

    function uploadLocalFile() {
      localFileCursor += 1;
      setImmediate(checkDoMoreWork);
      const fullPath = path.join(localDir, localFileStat.path);

      if (getS3Params) {
        getS3Params(fullPath, localFileStat, haveS3Params);
      } else {
        upDownFileParams.s3Params = baseUpDownS3Params;
        startUpload();
      }

      function haveS3Params(err, s3Params) {
        if (fatalError) {
          return;
        }
        if (err) {
          return handleError(err);
        }

        if (!s3Params) {
          // user has decided to skip this file
          return;
        }

        upDownFileParams.s3Params = extend(extend({}, baseUpDownS3Params), s3Params);
        startUpload();
      }

      function startUpload() {
        (ee as any).progressTotal += localFileStat!.size;
        const fullKey = prefix + localFileStat!.s3Path;
        upDownFileParams.s3Params.Key = fullKey;
        upDownFileParams.localFile = fullPath;
        const uploader = self.uploadFile(upDownFileParams);
        let prevAmountDone = 0;
        let prevAmountTotal = localFileStat!.size;
        (ee as any).activeTransfers++;
        ee.emit('fileUploadStart', fullPath, fullKey);
        uploader.on('error', handleError);
        uploader.on('progress', () => {
          if (fatalError) {
            return;
          }
          const amountDelta = (uploader as any).progressAmount - prevAmountDone;
          prevAmountDone = (uploader as any).progressAmount;
          (ee as any).progressAmount += amountDelta;

          const totalDelta = (uploader as any).progressTotal - prevAmountTotal;
          prevAmountTotal = (uploader as any).progressTotal;
          (ee as any).progressTotal += totalDelta;

          ee.emit('progress');
        });
        uploader.on('end', () => {
          (ee as any).activeTransfers--;
          ee.emit('fileUploadEnd', fullPath, fullKey);
          ee.emit('progress');
          checkDoMoreWork();
        });
      }
    }

    function deleteS3Object() {
      s3ObjectCursor += 1;
      setImmediate(checkDoMoreWork);
      if (!deleteRemoved) {
        return;
      }
      objectsToDelete.push({ Key: s3Object.Key });
      (ee as any).deleteTotal += 1;
      ee.emit('progress');
      assert.ok(objectsToDelete.length <= 1000);
      if (objectsToDelete.length === 1000) {
        flushDeletes();
      }
    }
  }

  function handleError(err) {
    if (fatalError) {
      return;
    }
    fatalError = true;
    ee.emit('error', err);
  }

  function findAllS3Objects() {
    const finder = self.listObjects(listObjectsParams);
    finder.on('error', handleError);
    finder.on('data', (data: any) => {
      if (fatalError) {
        return;
      }
      (ee as any).objectsFound += data.Contents.length;
      ee.emit('progress');

      data.Contents.forEach((object: any) => {
        object.key = object.Key.substring(prefix.length);
        allS3Objects.push(object);
      });
      checkDoMoreWork();
    });
    finder.on('end', () => {
      if (fatalError) {
        return;
      }
      (ee as any).doneFindingObjects = true;
      ee.emit('progress');
      checkDoMoreWork();
    });
  }

  function startFindAllFiles() {
    findAllFiles((err) => {
      if (fatalError) {
        return;
      }
      if (err) {
        return handleError(err);
      }

      (ee as any).doneFindingFiles = true;
      ee.emit('progress');

      allLocalFiles.sort((a, b) => {
        if (a.s3Path < b.s3Path) {
          return -1;
        }
        if (a.s3Path > b.s3Path) {
          return 1;
        }
        return 0;
      });
      startComputingMd5Sums();
    });
  }

  function startComputingMd5Sums() {
    let index = 0;
    computeOne();

    function computeOne() {
      if (fatalError) {
        return;
      }
      const localFileStat = allLocalFiles[index];
      if (!localFileStat) {
        (ee as any).doneMd5 = true;
        ee.emit('progress');
        checkDoMoreWork();
        return;
      }
      if (localFileStat.multipartETag) {
        index += 1;
        setImmediate(computeOne);
        return;
      }
      const fullPath = path.join(localDir, localFileStat.path);
      const inStream = fs.createReadStream(fullPath);
      const multipartETag = new MultipartETag();
      inStream.on('error', handleError);
      let prevBytes = 0;
      multipartETag.on('progress', () => {
        const delta = multipartETag.bytes - prevBytes;
        prevBytes = multipartETag.bytes;
        (ee as any).progressMd5Amount += delta;
      });
      multipartETag.on('end', () => {
        if (fatalError) {
          return;
        }
        localFileStat.multipartETag = multipartETag;
        checkDoMoreWork();
        ee.emit('progress');
        index += 1;
        computeOne();
      });
      inStream.pipe(multipartETag);
      multipartETag.resume();
    }
  }

  function findAllFiles(cb: (err?: any) => void) {
    const dirWithSlash = ensureSep(localDir);

    // Check if directory exists
    if (!fsExtra.existsSync(dirWithSlash)) {
      // when uploading, we don't want to delete based on a nonexistent source directory
      // but when downloading, the destination directory does not have to exist.
      if (!directionIsToS3) {
        return cb();
      }
      return cb(new Error(`ENOENT: Directory not found: ${dirWithSlash}`));
    }

    const walkDirectory = async (dir: string) => {
      if (fatalError) {
        return;
      }

      const entries = await fsExtra.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (fatalError) {
          return;
        }

        const fullPath = path.join(dir, entry.name);
        let stat: Stats;
        let actualPath = fullPath;

        // Handle symlinks if followSymlinks is enabled
        if (entry.isSymbolicLink() && followSymlinks) {
          try {
            actualPath = await fsExtra.realpath(fullPath);
            stat = await fsExtra.stat(actualPath);
          } catch {
            // Skip broken symlinks
            continue;
          }
        } else if (entry.isSymbolicLink()) {
          // Skip symlinks if not following
          continue;
        } else {
          stat = await fsExtra.stat(fullPath);
        }

        if (stat.isDirectory()) {
          // we only need to save directories when deleteRemoved is true
          // and we're syncing to disk from s3
          if (deleteRemoved && !directionIsToS3) {
            const relPath = path.relative(localDir, fullPath);
            if (relPath !== '') {
              const fileStat = stat as LocalFileStat;
              fileStat.path = relPath;
              fileStat.s3Path = `${toUnixSep(relPath)}/`;
              fileStat.multipartETag = new MultipartETag();
              allLocalFiles.push(fileStat);
            }
          }
          // Recurse into directory
          await walkDirectory(fullPath);
        } else if (stat.isFile()) {
          const relPath = path.relative(localDir, actualPath !== fullPath ? actualPath : fullPath);

          // ignoring local files (considering them non-existent)
          // works only for directionToS3=true
          if (directionIsToS3 && skipFiles?.some((globPattern) => stringMatchesGlob(relPath, globPattern))) {
            continue;
          }

          const fileStat = stat as LocalFileStat;
          fileStat.path = relPath;
          fileStat.s3Path = toUnixSep(relPath);
          (ee as any).filesFound += 1;
          (ee as any).progressMd5Total += stat.size;
          ee.emit('progress');
          allLocalFiles.push(fileStat);
        }
      }
    };

    walkDirectory(dirWithSlash)
      .then(() => cb())
      .catch((err) => cb(err));
  }
}

function ensureChar(str, c) {
  return str[str.length - 1] === c ? str : str + c;
}

function ensureSep(dir) {
  return ensureChar(dir, path.sep);
}

function ensureSlash(dir) {
  return ensureChar(dir, '/');
}

function doWithRetry(fn, tryCount, delay, cb) {
  let tryIndex = 0;

  tryOnce();

  function tryOnce() {
    fn((err, result) => {
      if (err) {
        if (err.retryable === false) {
          cb(err);
        } else {
          tryIndex += 1;
          if (tryIndex >= tryCount) {
            cb(err);
          } else {
            setTimeout(tryOnce, delay);
          }
        }
      } else {
        cb(null, result);
      }
    });
  }
}

function extend(target, source) {
  for (const propName in source) {
    target[propName] = source[propName];
  }
  return target;
}

function chunkArray(array, maxLength) {
  const slices = [array];
  while (slices[slices.length - 1].length > maxLength) {
    slices.push(slices[slices.length - 1].splice(maxLength));
  }
  return slices;
}

function cleanETag(eTag) {
  if (!eTag) return '';
  // Remove quotes, apostrophes, and whitespace
  return eTag.replace(/^['"\s]+|['"\s]+$/g, '');
}

function compareMultipartETag(eTag, multipartETag) {
  return multipartETag.anyMatch(cleanETag(eTag));
}

function getETagCount(eTag) {
  const match = (eTag || '').match(/[a-f0-9]{32}-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 1;
}

function keyOnly(item) {
  return {
    Key: item.Key,
    VersionId: item.VersionId
  };
}

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return encodeURI(filename).replace(/[!'()* ]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16)}`;
  });
}

function getPublicUrl(bucket, key, bucketLocation, endpoint) {
  const nonStandardBucketLocation = bucketLocation && bucketLocation !== 'us-east-1';
  const hostnamePrefix = nonStandardBucketLocation ? `s3-${bucketLocation}` : 's3';
  const parts = {
    protocol: 'https:',
    hostname: `${hostnamePrefix}.${endpoint || 'amazonaws.com'}`,
    pathname: `/${bucket}/${encodeSpecialCharacters(key)}`
  };
  return url.format(parts);
}

function getPublicUrlHttp(bucket, key, endpoint) {
  const parts = {
    protocol: 'http:',
    hostname: `${bucket}.${endpoint || 's3.amazonaws.com'}`,
    pathname: `/${encodeSpecialCharacters(key)}`
  };
  return url.format(parts);
}

function toUnixSep(str) {
  return str.replace(TO_UNIX_RE, '/');
}

function toNativeSep(str) {
  return str.replace(/\//g, path.sep);
}

function quotemeta(str) {
  return String(str).replace(/(\W)/g, '\\$1');
}
