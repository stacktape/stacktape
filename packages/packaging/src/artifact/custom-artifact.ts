import type {
  ArchiveItem,
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { basename, isAbsolute, join } from 'node:path';
import { getFileExtension, isDirAccessible } from '../fs/files';

import { copy } from 'fs-extra';
import objectHash from 'object-hash';

import type { CustomArtifactLambdaPackagingProps } from '@stacktape/config/deployment-artifacts';
import { EXCLUDE_FROM_CHECKSUM_GLOBS, getDirectoryChecksum, mergeHashes } from './hashing';
import { getAllFilesInDir, getFileHash, getFileSize, getFolderSize } from '../fs/files';

const SIZE_LIMIT = 250;
const ZIPPED_SIZE_LIMIT = 50;
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
  const isZipped = !isDir && getFileExtension(absolutePackagePath) === 'zip';

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  let packageCheckSum: string;
  if (isDir) {
    packageCheckSum = await getDirectoryChecksum({
      absoluteDirectoryPath: absolutePackagePath,
      excludeGlobs: EXCLUDE_FROM_CHECKSUM_GLOBS
    });
  } else {
    packageCheckSum = await getFileHash(absolutePackagePath);
  }
  const digest = mergeHashes(packageCheckSum, objectHash({ handler, packagePath }), additionalDigestInput);
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: 'Same artifact is already deployed, skipping.'
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

  let size: number | undefined;
  if (!isZipped) {
    if (isDir) {
      size = await getFolderSize(absolutePackagePath, 'MB', 2);
    } else {
      size = await getFileSize(absolutePackagePath, 'MB', 2);
    }
    if (size > SIZE_LIMIT) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Lambda function ${name} has size ${size}${FILE_SIZE_UNIT}. Should be less than ${SIZE_LIMIT}${FILE_SIZE_UNIT}.`
      });
    }
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
  const zippedSize = await getFileSize(artifactPath, FILE_SIZE_UNIT, 2);
  await progressLogger.finishEvent({ eventType: 'CALCULATE_SIZE' });

  if (zippedSize > ZIPPED_SIZE_LIMIT) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `${name} has size ${zippedSize}. Should be less than ${ZIPPED_SIZE_LIMIT}.`
    });
  }

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
