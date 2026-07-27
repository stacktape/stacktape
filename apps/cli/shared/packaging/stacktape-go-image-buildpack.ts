import { isAbsolute, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildGoDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { buildGoArtifact } from './bundlers/go';

export const buildUsingStacktapeGoImageBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  cwd,
  ...otherProps
}: StpBuildpackInput & {
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);
  const bundlingOutput = await buildGoArtifact({
    ...otherProps,
    sourcePath: absoluteSourcePath,
    progressLogger,
    name,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    dockerBuildOutputArchitecture
  });

  const { digest, outcome, distFolderPath, sourceFiles, ...otherOutputProps } = bundlingOutput;
  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildGoDockerfile({
      alpine: !otherProps?.requiresGlibcBinaries,
      customDockerBuildCommands: otherProps.customDockerBuildCommands
    })
  );

  await progressLogger.finishEvent({ eventType: 'CREATE_DOCKERFILE' });

  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image' });
  const { size, dockerOutput, duration, created } = await buildDockerImage({
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
