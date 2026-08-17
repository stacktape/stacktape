import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { getFolder } from '../fs/files';
import { DEFAULT_PYTHON_VERSION } from '../bundlers/constants';
import { buildPythonArtifact } from '../bundlers/py';
import { resolvePythonDependencyFile } from '../bundlers/py/utils';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { PyLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';

export const buildUsingStacktapePyLambdaBuildpack = async ({
  progressLogger,
  name,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  entryfilePath,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    zippedSizeLimit: number;
    languageSpecificConfig: PyLanguageSpecificConfig;
  }): Promise<PackagingOutput> => {
  const packageManagerFilePath = languageSpecificConfig?.packageManagerFile
    ? isAbsolute(languageSpecificConfig.packageManagerFile)
      ? languageSpecificConfig.packageManagerFile
      : join(cwd, languageSpecificConfig.packageManagerFile)
    : null;
  const relativeSourcePath = packageManagerFilePath ? getFolder(packageManagerFilePath) : getFolder(entryfilePath);
  const initialSourcePath = isAbsolute(relativeSourcePath) ? relativeSourcePath : join(cwd, relativeSourcePath);
  const resolvedDependencyFile = await resolvePythonDependencyFile({
    cwd,
    sourcePath: initialSourcePath,
    packageManagerFile: languageSpecificConfig?.packageManagerFile
  });
  const sourcePath = resolvedDependencyFile ? getFolder(resolvedDependencyFile) : initialSourcePath;
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
    languageSpecificConfig,
    target: 'lambda',
    // Managed Lambda runtimes are glibc-based. Alpine-built native wheels are not ABI-compatible.
    requiresGlibcBinaries: true
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name };
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    zippedSizeLimit,
    archiveItem: otherProps.archiveItem,
    createPackagingError: otherProps.createPackagingError,
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
