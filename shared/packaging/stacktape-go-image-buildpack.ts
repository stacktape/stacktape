import { join } from 'node:path';
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
  ...otherProps
}: StpBuildpackInput & {
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const bundlingOutput = await buildGoArtifact({
    ...otherProps,
    sourcePath,
    progressLogger,
    name,
    entryfilePath,
    rawEntryfilePath: entryfilePath,
    dockerBuildOutputArchitecture
  });

  const { digest, outcome, distFolderPath, ...otherOutputProps } = bundlingOutput;
  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildGoDockerfile({
      entryfilePath,
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
    details: { ...otherOutputProps, dockerOutput, duration, imageCreated: created },
    jobName: name
  };
};
