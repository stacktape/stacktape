import { getFileSize, getFolder, getFolderSize } from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import { rename } from 'fs-extra';
import { buildPythonArtifact } from './bundlers/py';

const FILE_SIZE_UNIT = 'MB';
const DEFAULT_PYTHON_VERSION = 3.9;

export const buildUsingStacktapePyLambdaBuildpack = async ({
  progressLogger,
  name,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  entryfilePath,
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  languageSpecificConfig: PyLanguageSpecificConfig;
}): Promise<PackagingOutput> => {
  const sourcePath = languageSpecificConfig?.packageManagerFile
    ? getFolder(languageSpecificConfig.packageManagerFile)
    : getFolder(entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildPythonArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    pythonVersion: languageSpecificConfig?.pythonVersion ?? DEFAULT_PYTHON_VERSION,
    sourcePath,
    entryfilePath,
    rawEntryfilePath: entryfilePath,
    name,
    packageManager: languageSpecificConfig?.packageManager,
    progressLogger,
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
    format: 'zip',
    useNativeZip: true
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
