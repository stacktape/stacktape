import { isAbsolute, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildJavaDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { DEFAULT_JAVA_VERSION } from './bundlers/constants';
import { buildJavaArtifact } from './bundlers/java';

export const buildUsingStacktapeJavaImageBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  cwd,
  ...otherProps
}: StpBuildpackInput & {
  languageSpecificConfig: JavaLanguageSpecificConfig;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const rootSourceIndex = absoluteSourcePath.search(/src(\/|\\)main(\/|\\)java/);
  const rootSourcePath = rootSourceIndex === -1 ? absoluteSourcePath : absoluteSourcePath.slice(0, rootSourceIndex);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const bundlingOutput = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    useMaven: languageSpecificConfig?.useMaven ?? false,
    name,
    entryfilePath: absoluteEntryfilePath,
    sourcePath: rootSourcePath,
    progressLogger,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    dockerBuildOutputArchitecture,
    languageSpecificConfig
  });

  const { digest, outcome, distFolderPath, sourceFiles, ...otherOutputProps } = bundlingOutput;

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
    sourceFiles,
    details: { ...otherOutputProps, dockerOutput, duration, imageCreated: created },
    jobName: name
  };
};
