import type {
  ArchiveItem,
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import { rename } from 'fs-extra';
import { getFileSize, getFolderSize } from '../fs/files';

const FILE_SIZE_UNIT = 'MB';

export const createLambdaZipArtifact = async ({
  name,
  distFolderPath,
  digest,
  sizeLimit,
  zippedSizeLimit,
  progressLogger,
  finalMessageSuffix,
  archiveItem,
  createPackagingError
}: {
  name: string;
  distFolderPath: string;
  digest: string;
  sizeLimit?: number | undefined;
  zippedSizeLimit?: number | undefined;
  progressLogger: ProgressLogger;
  finalMessageSuffix?: string | undefined;
  archiveItem: ArchiveItem;
  createPackagingError: CreatePackagingError;
}) => {
  const unzippedSize = await getFolderSize(distFolderPath, FILE_SIZE_UNIT, 2);

  if (sizeLimit && unzippedSize > sizeLimit) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Function ${name} has size ${unzippedSize}${FILE_SIZE_UNIT}. Should be less than ${sizeLimit}${FILE_SIZE_UNIT}.`
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
  const zippedSize = await getFileSize(originalZipPath, FILE_SIZE_UNIT, 2);
  if (zippedSizeLimit && zippedSize > zippedSizeLimit) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `${name} has size ${zippedSize}. Should be less than ${zippedSizeLimit}.`
    });
  }

  const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
  await rename(originalZipPath, adjustedZipPath);

  const suffix = finalMessageSuffix ? ` ${finalMessageSuffix}` : '';
  await progressLogger.finishEvent({
    eventType: 'ZIP_PACKAGE',
    finalMessage: `Artifact size: ${unzippedSize} MB. Zipped artifact size: ${zippedSize} MB.${suffix}`
  });

  return {
    unzippedSize,
    zippedSize,
    artifactPath: adjustedZipPath
  };
};
