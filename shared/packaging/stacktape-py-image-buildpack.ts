import { extname, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildPythonDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { buildPythonArtifact } from './bundlers/py';

const DEFAULT_PYTHON_VERSION = 3.9;

export const buildUsingStacktapePyImageBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  languageSpecificConfig,
  distFolderPath,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  ...otherProps
}: StpBuildpackInput & {
  languageSpecificConfig: PyLanguageSpecificConfig;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const handler = extname(entryfilePath).split(':')[1];
  const filePath = handler ? entryfilePath.substring(0, entryfilePath.length - handler.length - 1) : entryfilePath;
  const sourcePath = languageSpecificConfig?.packageManagerFile
    ? getFolder(languageSpecificConfig.packageManagerFile)
    : getFolder(entryfilePath);
  const bundlingOutput = await buildPythonArtifact({
    ...otherProps,
    distFolderPath,
    pythonVersion: languageSpecificConfig?.pythonVersion || DEFAULT_PYTHON_VERSION,
    sourcePath,
    entryfilePath,
    name,
    rawEntryfilePath: entryfilePath,
    packageManager: languageSpecificConfig?.packageManager,
    progressLogger,
    requiresGlibcBinaries,
    dockerBuildOutputArchitecture,
    languageSpecificConfig
  });

  const { digest, outcome, ...otherOutputProps } = bundlingOutput;

  if (outcome === 'skipped') {
    return { ...bundlingOutput, size: null, jobName: name };
  }

  await progressLogger.startEvent({ eventType: 'CREATE_DOCKERFILE', description: 'Creating Dockerfile' });

  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  await outputFile(
    dockerfilePath,
    buildPythonDockerfile({
      pythonVersion: languageSpecificConfig?.pythonVersion || DEFAULT_PYTHON_VERSION,
      entryfilePath: filePath,
      handler,
      packageManagerFile: languageSpecificConfig?.packageManagerFile,
      alpine: !requiresGlibcBinaries,
      runAppAs: languageSpecificConfig?.runAppAs,
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
