import { packagingMessages } from '../runtime-contracts';
import type {
  ArchiveItem,
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { basename, isAbsolute, join } from 'node:path';
import { getFileExtension, isDirAccessible, isFileAccessible } from '../fs/files';

import { copy } from 'fs-extra';
import objectHash from 'object-hash';

import type { CustomArtifactLambdaPackagingProps } from '@stacktape/config/deployment-artifacts';
import {
  type ArchiveEntry,
  getArchiveLayoutDigest,
  listArchiveEntries,
  UnsupportedArchiveEntryError
} from './archive-entries';
import { getArchiveInventoryChecksum, mergeHashes } from './hashing';
import { getAllFilesInDir, getFileHash, getFileSizeBytes, getFolderSizeBytes } from '../fs/files';
import { getZipUncompressedSizeBytes } from './zip-metadata';

/** Lambda's limit for the unzipped function and its layers, in MB. Code deployed from S3 has no zipped limit. */
const SIZE_LIMIT = 250;
const FILE_SIZE_UNIT = 'MB';

export const buildUsingCustomArtifact = async ({
  packagePath,
  name,
  cwd,
  distFolderPath,
  progressLogger,
  existingDigests,
  handler,
  additionalDigestInput = '',
  archiveItem,
  createPackagingError
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  distFolderPath: string;
  existingDigests: string[];
  additionalDigestInput?: string | undefined;
  archiveItem: ArchiveItem;
  createPackagingError: CreatePackagingError;
} & CustomArtifactLambdaPackagingProps): Promise<PackagingOutput> => {
  const start = Date.now();
  const absolutePackagePath = isAbsolute(packagePath) ? packagePath : join(cwd, packagePath);
  const isDir = isDirAccessible(absolutePackagePath);
  const isFile = isFileAccessible(absolutePackagePath);
  if (!isDir && !isFile) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Custom Lambda package was not found at ${absolutePackagePath}.`,
      hint: 'Build the artifact first or correct properties.packagePath.'
    });
  }
  const isZipped = isFile && getFileExtension(absolutePackagePath).toLowerCase() === 'zip';

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  /*
   * Stacktape zips a directory or a non-ZIP file itself, so the archive's entries, normalized modes and format are part
   * of what it uploads; a chmod-only change must produce a new artifact. A prebuilt ZIP is uploaded byte for byte and
   * keeps the identity of its bytes. Listing first also rejects an unsupported link before anything reads through it.
   */
  let archiveEntries: ArchiveEntry[] | null = null;
  if (!isZipped) {
    try {
      archiveEntries = (await listArchiveEntries({ sourcePath: absolutePackagePath })).entries;
    } catch (cause) {
      if (cause instanceof UnsupportedArchiveEntryError) {
        throw createPackagingError({ type: 'PACKAGING', message: cause.message, cause });
      }
      throw cause;
    }
  }
  const archiveLayoutDigest = archiveEntries ? getArchiveLayoutDigest(archiveEntries) : null;
  let packageCheckSum: string;
  if (isDir) {
    // Every entry the archive holds participates in cache identity, whatever the directory is called or where it is.
    packageCheckSum = await getArchiveInventoryChecksum(archiveEntries!);
  } else {
    packageCheckSum = await getFileHash(absolutePackagePath);
  }
  /*
   * Identity is the bytes plus the handler, never where the build put them.
   *
   * `packagePath` used to be hashed here. Web builders pass a path under
   * `.stacktape/build/<invocationId>/…`, and the invocation id is new for every CLI process, so the digest
   * changed on every run and the largest Lambda zips Stacktape produces were rebuilt and re-uploaded on
   * every deploy. An ordinary custom artifact lost its cache whenever the checkout moved, which a cache
   * shared between a laptop and CI cannot afford. The path carries no identity the checksum lacks: each
   * workload looks up its own digests by job name, so two artifacts never compete for one entry.
   */
  const digest = mergeHashes(
    packageCheckSum,
    objectHash({ handler }),
    additionalDigestInput,
    ...(archiveLayoutDigest ? [archiveLayoutDigest] : [])
  );
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: packagingMessages.unchanged
    });
    return {
      digest,
      outcome: 'skipped' as const,
      details: { duration: Date.now() - start },
      sourceFiles: [],
      jobName: name,
      size: null
    };
  }

  let sizeBytes: number;
  try {
    sizeBytes = isZipped
      ? await getZipUncompressedSizeBytes(absolutePackagePath)
      : isDir
        ? await getFolderSizeBytes(absolutePackagePath)
        : await getFileSizeBytes(absolutePackagePath);
  } catch (cause) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Could not inspect custom Lambda ZIP package ${absolutePackagePath}.`,
      cause
    });
  }
  const size = Number((sizeBytes / 1024 / 1024).toFixed(2));
  if (sizeBytes > SIZE_LIMIT * 1024 * 1024) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Function ${name} is ${size}${FILE_SIZE_UNIT} unzipped. AWS Lambda allows ${SIZE_LIMIT}${FILE_SIZE_UNIT} for a function and all its layers together; layers attached outside Stacktape are not counted here.`
    });
  }

  let artifactPath: string;
  if (!isZipped) {
    await progressLogger.startEvent({
      eventType: 'ZIP_PACKAGE',
      description: 'Zipping package'
    });
    artifactPath = await archiveItem({
      absoluteSourcePath: absolutePackagePath,
      absoluteDestDirPath: distFolderPath,
      format: 'zip',
      useNativeZip: true
    });
    await progressLogger.finishEvent({ eventType: 'ZIP_PACKAGE' });
  } else {
    artifactPath = join(distFolderPath, basename(absolutePackagePath));
    await copy(absolutePackagePath, artifactPath);
  }

  await progressLogger.startEvent({
    eventType: 'CALCULATE_SIZE',
    description: 'Calculating size'
  });
  const zippedSizeBytes = await getFileSizeBytes(artifactPath);
  const zippedSize = Number((zippedSizeBytes / 1024 / 1024).toFixed(2));
  await progressLogger.finishEvent({ eventType: 'CALCULATE_SIZE' });

  const sourceFiles =
    isZipped || !isDir
      ? [{ path: absolutePackagePath }]
      : (await getAllFilesInDir(absolutePackagePath, false)).map((file) => ({ path: file }));

  return {
    outcome: 'bundled',
    digest,
    // @todo
    sourceFiles,
    artifactPath,
    zippedSize,
    details: { duration: Date.now() - start },
    size,
    jobName: name
  };
};
