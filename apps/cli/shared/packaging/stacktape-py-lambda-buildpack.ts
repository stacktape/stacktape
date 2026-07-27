import { isAbsolute, join } from 'node:path';
import { getFolder } from '@shared/utils/fs-utils';
import { DEFAULT_PYTHON_VERSION } from './bundlers/constants';
import { buildPythonArtifact } from './bundlers/py';
import { createLambdaZipArtifact } from './lambda-artifact';

export const buildUsingStacktapePyLambdaBuildpack = async ({
  progressLogger,
  name,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  entryfilePath,
  cwd,
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  languageSpecificConfig: PyLanguageSpecificConfig;
}): Promise<PackagingOutput> => {
  const packageManagerFilePath = languageSpecificConfig?.packageManagerFile
    ? isAbsolute(languageSpecificConfig.packageManagerFile)
      ? languageSpecificConfig.packageManagerFile
      : join(cwd, languageSpecificConfig.packageManagerFile)
    : null;
  const relativeSourcePath = packageManagerFilePath ? getFolder(packageManagerFilePath) : getFolder(entryfilePath);
  const sourcePath = isAbsolute(relativeSourcePath) ? relativeSourcePath : join(cwd, relativeSourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildPythonArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    pythonVersion: languageSpecificConfig?.pythonVersion ?? DEFAULT_PYTHON_VERSION,
    sourcePath,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    cwd,
    languageSpecificConfig
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name } as PackagingOutput;
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    zippedSizeLimit,
    progressLogger
  });

  return {
    digest,
    outcome,
    zippedSize,
    size: unzippedSize,
    artifactPath,
    details: { ...otherOutputProps },
    sourceFiles: otherOutputProps.sourceFiles,
    jobName: name
  };
};
