import type { ImageBuildActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildPhpDockerfile } from '../docker/dockerfiles';
import { getFolder } from '../fs/files';
import { outputFile } from 'fs-extra';
import { DEFAULT_PHP_VERSION } from '../bundlers/constants';
import { buildPhpArtifact } from '../bundlers/php';
import type { PhpLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';

export const buildUsingStacktapePhpImageBuildpack = async ({
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
    languageSpecificConfig?: PhpLanguageSpecificConfig | undefined;
    cacheFromRef?: string | undefined;
    cacheToRef?: string | undefined;
  }): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const bundlingOutput = await buildPhpArtifact({
    ...otherProps,
    distFolderPath,
    phpVersion: languageSpecificConfig?.phpVersion ?? DEFAULT_PHP_VERSION,
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

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildPhpDockerfile({
      phpVersion: languageSpecificConfig?.phpVersion ?? DEFAULT_PHP_VERSION,
      entryfilePath: absoluteEntryfilePath,
      alpine: !requiresGlibcBinaries,
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
