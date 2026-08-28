import { packagingMessages } from '../runtime-contracts';
import type { ImageBuildActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join, relative } from 'node:path';
import { buildRubyDockerfile } from '../docker/dockerfiles';
import { DEFAULT_RUBY_VERSION } from '../bundlers/constants';
import { buildRubyArtifact } from '../bundlers/ruby';
import type { RubyLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot } from './project-root';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';
import { transformToUnixPath } from '../fs/files';

export const buildUsingStacktapeRbImageBuildpack = async ({
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
    languageSpecificConfig?: RubyLanguageSpecificConfig | undefined;
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
  }): Promise<PackagingOutput> => {
  const absoluteSourcePath = findNearestProjectRoot({ cwd, entryfilePath, markerFiles: ['Gemfile', 'gems.rb'] });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const bundlingOutput = await buildRubyArtifact({
    ...otherProps,
    distFolderPath,
    rubyVersion: languageSpecificConfig?.rubyVersion ?? DEFAULT_RUBY_VERSION,
    sourcePath: absoluteSourcePath,
    entryfilePath: absoluteEntryfilePath,
    name,
    rawEntryfilePath: absoluteEntryfilePath,
    progressLogger,
    requiresGlibcBinaries,
    dockerBuildOutputArchitecture,
    cwd,
    languageSpecificConfig
  });

  const { digest, outcome, sourceFiles, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfileContents = buildRubyDockerfile({
    rubyVersion: languageSpecificConfig?.rubyVersion ?? DEFAULT_RUBY_VERSION,
    entryfilePath: transformToUnixPath(relative(absoluteSourcePath, absoluteEntryfilePath)),
    alpine: !requiresGlibcBinaries,
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
    finalMessage: packagingMessages.containerImage(size)
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
