import type { EsBuildActions, LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { packagingMessages } from '../runtime-contracts';

import { dirname, basename, join, resolve } from 'node:path';
import { emptyDir, outputFile, rename } from 'fs-extra';
import { createEsBundle } from '../bundlers/es';
import type { EsLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { getFileSizeBytes, getFirstExistingPath, getFolderSizeBytes } from '../fs/files';

const toUnixPath = (value: string) => value.replace(/\\/g, '/');

/**
 * Traced functions get their handler wrapped at the bundle boundary: packaging generates this
 * entry, which imports the user's real module and re-exports every handler-shaped export wrapped in
 * the self-contained OTel runtime. Doing it here — instead of an AWS layer — is what makes tracing
 * work for bundled AND ESM code: runtime require/import hooks never see what the bundler inlined.
 */
const generateTracingWrapperEntry = async ({
  distFolderPath,
  entryfilePath,
  runtimeFilePath,
  handlerFunction
}: {
  distFolderPath: string;
  entryfilePath: string;
  runtimeFilePath: string;
  handlerFunction?: string | undefined;
}): Promise<string> => {
  const exportedNames = [
    ...new Set(['handler', ...(handlerFunction && handlerFunction !== 'default' ? [handlerFunction] : [])])
  ];
  const wrapperPath = join(dirname(distFolderPath), `${basename(distFolderPath)}-tracing-entry.ts`);
  const lines = [
    `import { wrapLambdaHandler } from '${toUnixPath(runtimeFilePath)}';`,
    `import * as __stpUserModule from '${toUnixPath(entryfilePath)}';`,
    'const __stpWrap = (candidate: unknown) =>',
    '  typeof candidate === "function" ? wrapLambdaHandler(candidate as any) : (candidate as any);',
    'export default __stpWrap((__stpUserModule as any).default ?? (__stpUserModule as any).handler);',
    ...exportedNames.map(
      (name) =>
        `export const ${name} = __stpWrap((__stpUserModule as any).${name} ?? (__stpUserModule as any).default);`
    )
  ];
  await outputFile(wrapperPath, `${lines.join('\n')}\n`);
  return wrapperPath;
};

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
  tracingRuntimeFilePath,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions &
  EsBuildActions & {
    zippedSizeLimit: number;
    nodeTarget: string;
    minify: boolean;
    sharedLayerExternals?: string[] | undefined;
    usesSharedLayer?: boolean | undefined;
    /** When set, the bundle entry wraps the handler with the OTel runtime at this path. */
    tracingRuntimeFilePath?: string | undefined;
  }): Promise<PackagingOutput> => {
  await emptyDir(distFolderPath);

  let entryfilePath = (otherProps as { entryfilePath: string }).entryfilePath;
  if (tracingRuntimeFilePath) {
    // Released CLIs carry the runtime beside their compiled code; source-built CLIs pass the dist
    // path — same resolution order the source-map banner asset uses.
    const resolvedRuntimePath = getFirstExistingPath([
      resolve(__dirname, './lambda-tracing-runtime.mjs'),
      tracingRuntimeFilePath
    ]);
    if (!resolvedRuntimePath) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `The Lambda tracing runtime asset is missing (looked beside the CLI and at ${tracingRuntimeFilePath}). This is a Stacktape build problem, not a project problem.`
      });
    }
    entryfilePath = await generateTracingWrapperEntry({
      distFolderPath,
      entryfilePath,
      runtimeFilePath: resolvedRuntimePath,
      handlerFunction: (otherProps as { handlerFunction?: string }).handlerFunction
    });
  }

  const bundlingOutput = await createEsBundle({
    ...otherProps,
    entryfilePath,
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

  const layerInfo = usesSharedLayer ? ' · uses shared layer' : '';
  await progressLogger.finishEvent({
    eventType: 'ZIP_PACKAGE',
    finalMessage: `${packagingMessages.lambdaBundle({ size: `${unzippedSize} MB`, zippedSize: `${zippedSize} MB` })}${layerInfo}`
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
