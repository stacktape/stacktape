import { join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildJavaDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { buildJavaArtifact } from './bundlers/java';

const DEFAULT_JAVA_VERSION = 11;

export const buildUsingStacktapeJavaImageBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  ...otherProps
}: StpBuildpackInput & {
  languageSpecificConfig: JavaLanguageSpecificConfig;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const rootSourcePath = sourcePath.substring(0, sourcePath.search(/src(\/|\\)main(\/|\\)java/));

  const bundlingOutput = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    useMaven: languageSpecificConfig?.useMaven ?? false,
    name,
    entryfilePath,
    sourcePath: rootSourcePath,
    progressLogger,
    rawEntryfilePath: entryfilePath,
    dockerBuildOutputArchitecture,
    languageSpecificConfig
  });

  const { digest, outcome, distFolderPath, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildJavaDockerfile({
      javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
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
