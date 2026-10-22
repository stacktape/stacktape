import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { getFolder } from '../fs/files';
import { DEFAULT_PYTHON_VERSION } from '../bundlers/constants';
import { buildPythonArtifact } from '../bundlers/py';
import { resolvePythonDependencyFile } from '../bundlers/py/utils';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import { getEntryPathInArtifact } from './project-root';
import type { PythonBuildpackConfig, SupportedPythonVersion } from '@stacktape/config/deployment-artifacts';

type PythonLambdaLocation = { cwd: string; entryfilePath: string; packageManagerFile?: string | undefined };

/** The directory that becomes the ZIP root: the dependency file's directory, or the entry file's without one. */
const resolvePythonLambdaRoot = ({ cwd, entryfilePath, packageManagerFile }: PythonLambdaLocation) => {
  const packageManagerFilePath = packageManagerFile
    ? isAbsolute(packageManagerFile)
      ? packageManagerFile
      : join(cwd, packageManagerFile)
    : null;
  const relativeSourcePath = packageManagerFilePath ? getFolder(packageManagerFilePath) : getFolder(entryfilePath);
  const initialSourcePath = isAbsolute(relativeSourcePath) ? relativeSourcePath : join(cwd, relativeSourcePath);
  const resolvedDependencyFile = resolvePythonDependencyFile({
    cwd,
    sourcePath: initialSourcePath,
    packageManagerFile
  });
  return resolvedDependencyFile ? getFolder(resolvedDependencyFile) : initialSourcePath;
};

/**
 * The module Lambda imports the handler from: the entry file's path inside the ZIP, dotted. With `pyproject.toml` at
 * the project root, `src/handler.py` is `src.handler`; beside its dependency file it is `handler`.
 */
export const getPythonLambdaHandlerModule = (location: PythonLambdaLocation) =>
  getEntryPathInArtifact({ ...location, artifactRoot: resolvePythonLambdaRoot(location) }).replaceAll('/', '.');

export const buildPythonLambda = async ({
  progressLogger,
  name,
  sizeLimit,
  python: languageSpecificConfig,
  pythonVersion,
  entryfilePath,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    python?: PythonBuildpackConfig | undefined;
    /** From the function's runtime; the buildpack default otherwise. */
    pythonVersion?: SupportedPythonVersion | undefined;
  }): Promise<PackagingOutput> => {
  const sourcePath = resolvePythonLambdaRoot({
    cwd,
    entryfilePath,
    packageManagerFile: languageSpecificConfig?.packageManagerFile
  });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildPythonArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    lambdaZip: true,
    pythonVersion: pythonVersion ?? DEFAULT_PYTHON_VERSION,
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
