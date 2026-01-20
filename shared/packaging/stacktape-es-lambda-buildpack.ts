import { getFileSize, getFolderSize } from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import { emptyDir, rename } from 'fs-extra';
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
  usesSharedLayer = false,
  dependencyDiscoveryOnly = false,
  distFolderPath,
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  nodeTarget: string;
  minify: boolean;
  sharedLayerExternals?: string[];
  usesSharedLayer?: boolean;
  /** When true, only run bundler to discover dependencies - skip zipping and size checks */
  dependencyDiscoveryOnly?: boolean;
}): Promise<PackagingOutput> => {
  await emptyDir(distFolderPath);

  const bundlingOutput = await createEsBundle({
    ...otherProps,
    distFolderPath,
    ...languageSpecificConfig,
    installNonStaticallyBuiltDepsInDocker: true,
    ...((languageSpecificConfig as EsLanguageSpecificConfig)?.disableSourceMaps && { sourceMaps: 'disabled' }),
    name,
    progressLogger,
    dockerBuildOutputArchitecture,
    isLambda: true,
    externals: sharedLayerExternals,
    ...(sharedLayerExternals?.length && { dependenciesToExcludeFromDeploymentPackage: sharedLayerExternals }),
    dependencyDiscoveryOnly
  });

  const {
    digest,
    outcome,
    distFolderPath: bundledDistFolderPath,
    sourceFiles,
    resolvedModules,
    ...otherOutputProps
  } = bundlingOutput;

  if (outcome === 'skipped') {
    // await remove(distFolderPath);
    return { ...bundlingOutput, size: null, jobName: name, resolvedModules };
  }

  // For dependency discovery (first-pass), return early with just the resolved modules
  if (dependencyDiscoveryOnly) {
    return {
      digest,
      outcome,
      sourceFiles,
      size: null,
      jobName: name,
      resolvedModules
    };
  }

  const unzippedSize = await getFolderSize(bundledDistFolderPath, FILE_SIZE_UNIT, 2);

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
    absoluteSourcePath: bundledDistFolderPath,
    format: 'zip',
    useNativeZip: true
  });
  const originalZipPath = `${bundledDistFolderPath}.zip`;

  zippedSize = await getFileSize(originalZipPath, FILE_SIZE_UNIT, 2);
  if (zippedSizeLimit && zippedSize > zippedSizeLimit) {
    throw getError({
      type: 'PACKAGING',
      message: `${name} has size ${zippedSize}. Should be less than ${zippedSizeLimit}.`
    });
  }

  const adjustedZipPath = `${bundledDistFolderPath}-${digest}.zip`;
  await rename(originalZipPath, adjustedZipPath);

  const layerInfo = usesSharedLayer ? ' Uses shared layer.' : '';
  await progressLogger.finishEvent({
    eventType: 'ZIP_PACKAGE',
    finalMessage: `Artifact size: ${unzippedSize} MB. Zipped artifact size: ${zippedSize} MB.${layerInfo}`
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
