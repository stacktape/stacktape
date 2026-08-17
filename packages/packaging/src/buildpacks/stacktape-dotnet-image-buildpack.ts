import type { ImageBuildActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildDotnetDockerfile } from '../docker/dockerfiles';
import { DEFAULT_DOTNET_VERSION } from '../bundlers/constants';
import { buildDotnetArtifact } from '../bundlers/dotnet';
import type { DotnetLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot, resolveExplicitProjectRoot } from './project-root';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';

export const buildUsingStacktapeDotnetImageBuildpack = async ({
  buildDockerImage,
  progressLogger,
  name,
  entryfilePath,
  languageSpecificConfig,
  distFolderPath,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  ImageBuildActions & {
    languageSpecificConfig?: DotnetLanguageSpecificConfig | undefined;
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
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

  const bundlingOutput = await buildDotnetArtifact({
    ...otherProps,
    distFolderPath,
    dotnetVersion: languageSpecificConfig?.dotnetVersion ?? DEFAULT_DOTNET_VERSION,
    sourcePath: absoluteSourcePath,
    entryfilePath: absoluteEntryfilePath,
    name,
    rawEntryfilePath: absoluteEntryfilePath,
    progressLogger,
    requiresGlibcBinaries,
    dockerBuildOutputArchitecture,
    cwd,
    languageSpecificConfig,
    target: 'container'
  });

  const { digest, outcome, sourceFiles, assemblyName, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfileContents = buildDotnetDockerfile({
    dotnetVersion: languageSpecificConfig?.dotnetVersion ?? DEFAULT_DOTNET_VERSION,
    assemblyName: assemblyName || 'app',
    customDockerBuildCommands: otherProps.customDockerBuildCommands
  });

  await progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });

  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image' });
  const { size, dockerOutput, duration, created } = await buildGeneratedDockerImage({
    dockerfileContents,
    buildDockerImage,
    imageTag: name,
    buildContextPath: distFolderPath,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef
  });

  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: `Image size: ${size} MB.`
  });

  return {
    outcome,
    imageName: name,
    size,
    digest,
    sourceFiles,
    details: { ...otherOutputProps, dockerOutput, duration, imageCreated: created },
    jobName: name
  };
};
