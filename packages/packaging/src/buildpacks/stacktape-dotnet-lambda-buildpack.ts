import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { DEFAULT_DOTNET_VERSION } from '../bundlers/constants';
import { buildDotnetArtifact } from '../bundlers/dotnet';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { DotnetLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot, resolveExplicitProjectRoot } from './project-root';

export const buildUsingStacktapeDotnetLambdaBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    zippedSizeLimit: number;
    languageSpecificConfig?: DotnetLanguageSpecificConfig | undefined;
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
    sourcePath: absoluteSourcePath,
    dotnetVersion: languageSpecificConfig?.dotnetVersion ?? DEFAULT_DOTNET_VERSION,
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
    zippedSizeLimit,
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
