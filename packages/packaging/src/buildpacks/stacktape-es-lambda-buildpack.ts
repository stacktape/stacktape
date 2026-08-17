import type { EsBuildActions, LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';

import { emptyDir, rename } from 'fs-extra';
import { createEsBundle } from '../bundlers/es';
import type { EsLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { getFileSizeBytes, getFolderSizeBytes } from '../fs/files';

const FILE_SIZE_UNIT = 'MB';
const BYTES_PER_MB = 1024 * 1024;
const formatSizeMb = (sizeBytes: number): number => Math.round((sizeBytes / BYTES_PER_MB) * 100) / 100;

export const buildUsingStacktapeEsLambdaBuildpack = async ({
  progressLogger,
  name,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  sharedLayerExternals = [],
  usesSharedLayer = false,
  distFolderPath,
  archiveItem,
  createPackagingError,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions &
  EsBuildActions & {
    zippedSizeLimit: number;
    nodeTarget: string;
    minify: boolean;
    sharedLayerExternals?: string[] | undefined;
    usesSharedLayer?: boolean | undefined;
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
    createPackagingError,
    dockerBuildOutputArchitecture,
    isLambda: true,
    externals: sharedLayerExternals,
    ...(sharedLayerExternals?.length && { dependenciesToExcludeFromDeploymentPackage: sharedLayerExternals })
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

  const unzippedSizeBytes = await getFolderSizeBytes(bundledDistFolderPath);
  const unzippedSize = formatSizeMb(unzippedSizeBytes);

  if (sizeLimit && unzippedSizeBytes > sizeLimit * BYTES_PER_MB) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Function ${name} has size ${unzippedSize}${FILE_SIZE_UNIT}. Should be less than ${sizeLimit}${FILE_SIZE_UNIT}.`
    });
  }

  let zippedSize: number;
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

  const zippedSizeBytes = await getFileSizeBytes(originalZipPath);
  zippedSize = formatSizeMb(zippedSizeBytes);
  if (zippedSizeLimit && zippedSizeBytes > zippedSizeLimit * BYTES_PER_MB) {
    throw createPackagingError({
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
