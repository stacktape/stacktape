import { isAbsolute, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { buildPythonDockerfile } from '@shared/utils/dockerfiles';
import { getFolder } from '@shared/utils/fs-utils';
import { outputFile } from 'fs-extra';
import { DEFAULT_PYTHON_VERSION } from './bundlers/constants';
import { buildPythonArtifact } from './bundlers/py';

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
  cwd,
  ...otherProps
}: StpBuildpackInput & {
  languageSpecificConfig: PyLanguageSpecificConfig;
  cacheFromRef?: string;
  cacheToRef?: string;
}): Promise<PackagingOutput> => {
  const { filePath, handler } = parsePythonEntryfile(entryfilePath);
  const packageManagerFilePath = languageSpecificConfig?.packageManagerFile
    ? isAbsolute(languageSpecificConfig.packageManagerFile)
      ? languageSpecificConfig.packageManagerFile
      : join(cwd, languageSpecificConfig.packageManagerFile)
    : null;
  const relativeSourcePath = packageManagerFilePath ? getFolder(packageManagerFilePath) : getFolder(filePath);
  const sourcePath = isAbsolute(relativeSourcePath) ? relativeSourcePath : join(cwd, relativeSourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);
  const bundlingOutput = await buildPythonArtifact({
    ...otherProps,
    distFolderPath,
    pythonVersion: languageSpecificConfig?.pythonVersion || DEFAULT_PYTHON_VERSION,
    sourcePath,
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
    buildPythonDockerfile({
      pythonVersion: languageSpecificConfig?.pythonVersion || DEFAULT_PYTHON_VERSION,
      entryfilePath: filePath,
      handler,
      packageManagerFile: packageManagerFilePath || undefined,
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
    sourceFiles,
    details: { ...otherOutputProps, dockerOutput, duration, imageCreated: created },
    jobName: name
  };
};

const parsePythonEntryfile = (entryfilePath: string) => {
  const colonIndex = entryfilePath.lastIndexOf(':');
  const lastSlashIndex = Math.max(entryfilePath.lastIndexOf('/'), entryfilePath.lastIndexOf('\\'));
  const hasHandler = colonIndex !== -1 && colonIndex > lastSlashIndex;
  if (!hasHandler) {
    return { filePath: entryfilePath, handler: undefined };
  }
  const filePath = entryfilePath.slice(0, colonIndex);
  const handler = entryfilePath.slice(colonIndex + 1);
  return { filePath, handler };
};
