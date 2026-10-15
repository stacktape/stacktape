import type { EsBuildActions, JsBundleOptions, LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';

import { dirname, basename, join, resolve } from 'node:path';
import { emptyDir, outputFile } from 'fs-extra';
import { createEsBundle } from '../bundlers/es';
import { getFirstExistingPath } from '../fs/files';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';

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

export const buildJsBundleLambda = async ({
  progressLogger,
  name,
  sizeLimit,
  dockerBuildOutputArchitecture,
  sharedLayerExternals = [],
  usesSharedLayer = false,
  distFolderPath,
  archiveItem,
  createPackagingError,
  tracingRuntimeFilePath,
  ...otherProps
}: StpBuildpackInput &
  JsBundleOptions &
  LambdaArtifactActions &
  EsBuildActions & {
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
    packageExternalDependencies: true,
    ...(otherProps.disableSourceMaps && { sourceMaps: 'disabled' }),
    lambdaZip: true,
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
    return { ...bundlingOutput, size: null, jobName: name, resolvedModules };
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath: bundledDistFolderPath,
    digest,
    sizeLimit,
    progressLogger,
    finalMessageSuffix: usesSharedLayer ? '· uses shared layer' : undefined,
    archiveItem,
    createPackagingError
  });

  return {
    digest,
    outcome,
    sourceFiles,
    zippedSize,
    size: unzippedSize,
    artifactPath,
    details: { ...otherOutputProps },
    jobName: name,
    resolvedModules
  };
};
