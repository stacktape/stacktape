import type {
  ArchiveItem,
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import { packagingMessages } from '../runtime-contracts';
import { rename } from 'fs-extra';
import { getFileSizeBytes, getFolderSizeBytes } from '../fs/files';

const FILE_SIZE_UNIT = 'MB';

export const createLambdaZipArtifact = async ({
  name,
  distFolderPath,
  digest,
  sizeLimit,
  progressLogger,
  finalMessageSuffix,
  archiveItem,
  createPackagingError
}: {
  name: string;
  distFolderPath: string;
  digest: string;
  /** Lambda's limit for the unzipped function and its layers, in MB. Code deployed from S3 has no zipped limit. */
  sizeLimit?: number | undefined;
  progressLogger: ProgressLogger;
  finalMessageSuffix?: string | undefined;
  archiveItem: ArchiveItem;
  createPackagingError: CreatePackagingError;
}) => {
  const unzippedSizeBytes = await getFolderSizeBytes(distFolderPath);
  const unzippedSize = Number((unzippedSizeBytes / 1024 / 1024).toFixed(2));

  if (sizeLimit && unzippedSizeBytes > sizeLimit * 1024 * 1024) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Function ${name} is ${unzippedSize}${FILE_SIZE_UNIT} unzipped. AWS Lambda allows ${sizeLimit}${FILE_SIZE_UNIT} for a function and all its layers together; layers attached outside Stacktape are not counted here.`
    });
  }

  await progressLogger.startEvent({
    eventType: 'ZIP_PACKAGE',
    description: 'Getting folder size and zipping package'
  });

  await archiveItem({
    absoluteSourcePath: distFolderPath,
    format: 'zip',
    useNativeZip: true
  });

  const originalZipPath = `${distFolderPath}.zip`;
  const zippedSizeBytes = await getFileSizeBytes(originalZipPath);
  const zippedSize = Number((zippedSizeBytes / 1024 / 1024).toFixed(2));

  const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
  await rename(originalZipPath, adjustedZipPath);

  const suffix = finalMessageSuffix ? ` ${finalMessageSuffix}` : '';
  await progressLogger.finishEvent({
    eventType: 'ZIP_PACKAGE',
    finalMessage: `${packagingMessages.lambdaBundle({ size: `${unzippedSize} MB`, zippedSize: `${zippedSize} MB` })}${suffix}`
  });

  return {
    unzippedSize,
    zippedSize,
    artifactPath: adjustedZipPath
  };
};
