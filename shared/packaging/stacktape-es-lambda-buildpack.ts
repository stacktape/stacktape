import { getFileSize, getFolderSize } from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import { rename } from 'fs-extra';
import { createEsBundle } from './bundlers/es';

const FILE_SIZE_UNIT = 'MB';

export const buildUsingStacktapeEsLambdaBuildpack = async ({
  progressLogger,
  name,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  sharedLayerExternals = [],
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  nodeTarget: string;
  minify: boolean;
  sharedLayerExternals?: string[];
}): Promise<PackagingOutput> => {
  const bundlingOutput = await createEsBundle({
    ...otherProps,
    ...languageSpecificConfig,
    installNonStaticallyBuiltDepsInDocker: true,
    ...((languageSpecificConfig as EsLanguageSpecificConfig)?.disableSourceMaps && { sourceMaps: 'disabled' }),
    name,
    progressLogger,
    dockerBuildOutputArchitecture,
    isLambda: true,
    externals: sharedLayerExternals
  });

  const { digest, outcome, distFolderPath, sourceFiles, resolvedModules, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    // await remove(distFolderPath);
    return { ...bundlingOutput, size: null, jobName: name, resolvedModules };
  }

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
    sourceFiles,
    zippedSize,
    size: unzippedSize,
    artifactPath: adjustedZipPath,
    details: { ...otherOutputProps },
    jobName: name,
    resolvedModules
  };
};
