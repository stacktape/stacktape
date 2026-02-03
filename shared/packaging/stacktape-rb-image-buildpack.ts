import { isAbsolute, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildRubyDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { DEFAULT_RUBY_VERSION } from './bundlers/constants';
import { buildRubyArtifact } from './bundlers/ruby';

export const buildUsingStacktapeRbImageBuildpack = async ({
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
}: StpBuildpackInput & {
  languageSpecificConfig?: RubyLanguageSpecificConfig;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
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

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildRubyDockerfile({
      rubyVersion: languageSpecificConfig?.rubyVersion ?? DEFAULT_RUBY_VERSION,
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
