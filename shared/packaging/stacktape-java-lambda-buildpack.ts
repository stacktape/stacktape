import { getFileSize, getFolder, getFolderSize } from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import { rename } from 'fs-extra';
import { buildJavaArtifact } from './bundlers/java';

const FILE_SIZE_UNIT = 'MB';
const DEFAULT_JAVA_VERSION = 11;

export const buildUsingStacktapeJavaLambdaBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  languageSpecificConfig: JavaLanguageSpecificConfig;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const rootSourcePath = sourcePath.substring(0, sourcePath.search(/src(\/|\\)main(\/|\\)java/));

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    sourcePath: rootSourcePath,
    entryfilePath,
    name,
    progressLogger,
    rawEntryfilePath: entryfilePath,
    languageSpecificConfig
  });

  const unzippedSize = await getFolderSize(distFolderPath, FILE_SIZE_UNIT, 2);

  if (sizeLimit && unzippedSize > sizeLimit) {
    throw getError({
      type: 'PACKAGING',
      message: `Function ${name} has size ${unzippedSize}${FILE_SIZE_UNIT}. Should be less than ${sizeLimit}${FILE_SIZE_UNIT}.`
    });
  }

  let zippedSize: number = null;
  await progressLogger.startEvent({
    eventType: 'ZIP_PACKAGE',
    description: 'Getting folder size and zipping package'
  });

  await archiveItem({
    absoluteSourcePath: distFolderPath,
    format: 'zip'
  });

  const originalZipPath = `${distFolderPath}.zip`;
  zippedSize = await getFileSize(originalZipPath, FILE_SIZE_UNIT, 2);
  if (zippedSizeLimit && zippedSize > zippedSizeLimit) {
    throw getError({
      type: 'PACKAGING',
      message: `${name} has size ${zippedSize}. Should be less than ${zippedSizeLimit}.`
    });
  }

  const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
  await rename(originalZipPath, adjustedZipPath);

  await progressLogger.finishEvent({
    eventType: 'ZIP_PACKAGE',
    finalMessage: `Artifact size: ${unzippedSize} MB. Zipped artifact size: ${zippedSize} MB.`
  });

  return {
    digest,
    outcome,
    zippedSize,
    size: unzippedSize,
    artifactPath: adjustedZipPath,
    details: { ...otherOutputProps },
    jobName: name
  };
};
