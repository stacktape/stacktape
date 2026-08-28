import { packagingMessages } from '../runtime-contracts';
import type { ImageBuildActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildJavaDockerfile } from '../docker/dockerfiles';
import { DEFAULT_JAVA_VERSION } from '../bundlers/constants';
import { buildJavaArtifact } from '../bundlers/java';
import type { JavaLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { findJavaProjectRoots } from './project-root';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';

export const buildUsingStacktapeJavaImageBuildpack = async ({
  buildDockerImage,
  progressLogger,
  name,
  entryfilePath,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  ImageBuildActions & {
    languageSpecificConfig: JavaLanguageSpecificConfig;
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
  }): Promise<PackagingOutput> => {
  const useMaven =
    languageSpecificConfig?.useMaven ?? languageSpecificConfig?.packageManagerFile?.endsWith('pom.xml') ?? false;
  const { buildRoot: rootSourcePath } = findJavaProjectRoots({
    cwd,
    entryfilePath,
    useMaven,
    explicitProjectFile: languageSpecificConfig?.packageManagerFile
  });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const bundlingOutput = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    useMaven,
    name,
    entryfilePath: absoluteEntryfilePath,
    sourcePath: rootSourcePath,
    progressLogger,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    dockerBuildOutputArchitecture,
    languageSpecificConfig,
    target: 'container'
  });

  const { digest, outcome, distFolderPath, sourceFiles, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfileContents = buildJavaDockerfile({
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    entryfilePath,
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
