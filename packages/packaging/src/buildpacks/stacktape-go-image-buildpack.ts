import type { ImageBuildActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildGoDockerfile } from '../docker/dockerfiles';
import { buildGoArtifact } from '../bundlers/go';
import { findGoProjectRoots } from './project-root';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';

export const buildUsingStacktapeGoImageBuildpack = async ({
  buildDockerImage,
  progressLogger,
  name,
  entryfilePath,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  ImageBuildActions & {
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
  }): Promise<PackagingOutput> => {
  const { buildRoot: absoluteSourcePath, moduleRoot } = findGoProjectRoots({ cwd, entryfilePath });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);
  const bundlingOutput = await buildGoArtifact({
    ...otherProps,
    sourcePath: absoluteSourcePath,
    progressLogger,
    name,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    artifactSourcePath: moduleRoot,
    cwd,
    dockerBuildOutputArchitecture
  });

  const { digest, outcome, distFolderPath, sourceFiles, ...otherOutputProps } = bundlingOutput;
  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfileContents = buildGoDockerfile({
    alpine: !otherProps?.requiresGlibcBinaries,
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
