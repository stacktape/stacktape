import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildDotnetArtifact } from '../bundlers/dotnet';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { DotnetBuildpackConfig, SupportedDotnetVersion } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot, resolveExplicitProjectRoot } from './project-root';

export const buildDotnetLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  dotnet: languageSpecificConfig,
  dotnetVersion,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    dotnet?: DotnetBuildpackConfig | undefined;
    /**
     * The version of the function's Lambda runtime, the one the template deploys. There is no default here: a default
     * of its own let the build use another version than the runtime, and native dependencies then failed to load.
     */
    dotnetVersion: SupportedDotnetVersion;
  }): Promise<PackagingOutput> => {
  const absoluteSourcePath = languageSpecificConfig?.projectFile
    ? resolveExplicitProjectRoot({ cwd, projectFile: languageSpecificConfig.projectFile })
    : findNearestProjectRoot({
        cwd,
        entryfilePath,
        markerFiles: ['Directory.Build.props'],
        markerFileExtensions: ['.csproj']
      });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildDotnetArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    lambdaZip: true,
    sourcePath: absoluteSourcePath,
    dotnetVersion,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    cwd,
    languageSpecificConfig,
    target: 'lambda'
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name };
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    archiveItem: otherProps.archiveItem,
    createPackagingError: otherProps.createPackagingError,
    progressLogger
  });

  return {
    digest,
    outcome,
    zippedSize,
    size: unzippedSize,
    artifactPath,
    details: { ...otherOutputProps },
    sourceFiles: otherOutputProps.sourceFiles,
    jobName: name
  };
};
