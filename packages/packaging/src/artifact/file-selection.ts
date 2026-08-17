import type { CreatePackagingError } from '../runtime-contracts';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { copy, remove, stat } from 'fs-extra';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '../fs/files';

/** Local repository state that must never become part of a deployment artifact. */
export const DEFAULT_ARTIFACT_EXCLUDE_GLOBS = [
  '**/.git',
  '**/.git/**',
  '**/.stacktape',
  '**/.stacktape/**',
  '**/node_modules',
  '**/node_modules/**',
  '**/.venv',
  '**/.venv/**',
  '**/__pycache__',
  '**/__pycache__/**',
  '**/.pytest_cache',
  '**/.pytest_cache/**',
  '**/.mypy_cache',
  '**/.mypy_cache/**',
  '**/.ruff_cache',
  '**/.ruff_cache/**'
];

export const copyExplicitlyIncludedFiles = ({
  explicitlyIncludedFiles,
  outputDirectory,
  cwd
}: {
  explicitlyIncludedFiles: string[];
  outputDirectory: string;
  cwd: string;
}) =>
  Promise.all(
    explicitlyIncludedFiles.map((filePath) => {
      const src = isAbsolute(filePath) ? filePath : join(cwd, filePath);
      const destinationIdentity = isAbsolute(filePath) ? filePath.split(/[\\/]/).at(-1)! : filePath;
      return copy(src, join(outputDirectory, destinationIdentity), { overwrite: true });
    })
  );

/** Resolves include globs once so the cache digest and the copied artifact refer to the same file set. */
export const resolveArtifactFileSelection = async ({
  cwd,
  includeFiles = []
}: {
  cwd: string;
  includeFiles?: string[] | undefined;
}) => {
  const explicitlyIncludedFiles = includeFiles.length
    ? (await getMatchingFilesByGlob({ globPattern: includeFiles, cwd, followSymbolicLinks: false })).toSorted()
    : [];
  const hash = await getHashFromMultipleFiles({
    files: explicitlyIncludedFiles.map((filePath) => ({
      path: isAbsolute(filePath) ? filePath : join(cwd, filePath),
      identity: filePath.replace(/\\/g, '/')
    }))
  });
  return { explicitlyIncludedFiles, digest: hash.digest('hex') };
};

export const mergeExplicitlyIncludedSourceFiles = ({
  cwd,
  sourceFiles,
  explicitlyIncludedFiles
}: {
  cwd: string;
  sourceFiles: { path: string }[];
  explicitlyIncludedFiles: string[];
}): { path: string }[] =>
  [
    ...new Set([
      ...sourceFiles.map(({ path }) => path),
      ...explicitlyIncludedFiles.map((path) => (isAbsolute(path) ? path : join(cwd, path)))
    ])
  ].map((path) => ({ path }));

export const removeExplicitlyExcludedFiles = async ({
  createPackagingError,
  excludeFiles,
  outputDirectory
}: {
  createPackagingError: CreatePackagingError;
  excludeFiles: string[];
  outputDirectory: string;
}) => {
  if (excludeFiles.length === 0) {
    return;
  }
  const matchedPaths = await getMatchingFilesByGlob({
    globPattern: excludeFiles,
    cwd: outputDirectory,
    followSymbolicLinks: false
  });
  const normalizedOutputRoot = resolve(outputDirectory);
  const comparableOutputRoot = process.platform === 'win32' ? normalizedOutputRoot.toLowerCase() : normalizedOutputRoot;
  const outputRootPrefix = comparableOutputRoot.endsWith(sep) ? comparableOutputRoot : `${comparableOutputRoot}${sep}`;
  const absolutePaths = matchedPaths.map((matchedPath) => {
    const absolutePath = resolve(outputDirectory, matchedPath);
    const comparablePath = process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath;
    if (comparablePath !== comparableOutputRoot && !comparablePath.startsWith(outputRootPrefix)) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `The excludeFiles pattern matched a path outside the deployment package: ${matchedPath}.`,
        hint: 'Use excludeFiles patterns that stay within the packaged artifact.'
      });
    }
    return absolutePath;
  });
  await Promise.all(absolutePaths.map((path) => remove(path)));
};

/** Applies the shared include/exclude contract after a language build has produced its final artifact tree. */
export const applyArtifactFileSelection = async ({
  cwd,
  outputDirectory,
  includeFiles = [],
  excludeFiles = [],
  explicitlyIncludedFiles: resolvedIncludedFiles,
  createPackagingError
}: {
  cwd: string;
  outputDirectory: string;
  includeFiles?: string[] | undefined;
  excludeFiles?: string[] | undefined;
  explicitlyIncludedFiles?: string[] | undefined;
  createPackagingError: CreatePackagingError;
}) => {
  const explicitlyIncludedFiles =
    resolvedIncludedFiles ??
    (includeFiles.length
      ? await getMatchingFilesByGlob({ globPattern: includeFiles, cwd, followSymbolicLinks: false })
      : []);
  await copyExplicitlyIncludedFiles({ explicitlyIncludedFiles, outputDirectory, cwd });
  await removeExplicitlyExcludedFiles({
    createPackagingError,
    excludeFiles: [...DEFAULT_ARTIFACT_EXCLUDE_GLOBS, ...excludeFiles],
    outputDirectory
  });
};

export const assertRequiredArtifactFile = async ({
  outputDirectory,
  relativePath,
  description,
  createPackagingError
}: {
  outputDirectory: string;
  relativePath: string;
  description: string;
  createPackagingError: CreatePackagingError;
}) => {
  const absolutePath = resolve(outputDirectory, relativePath);
  const outputRoot = resolve(outputDirectory);
  const relativeToOutput = absolutePath.slice(outputRoot.length);
  if (absolutePath !== outputRoot && !relativeToOutput.startsWith(sep)) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Required ${description} resolves outside the artifact.`
    });
  }
  const details = await stat(absolutePath).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `The packaged artifact is missing its required ${description}: ${relativePath}.`,
      hint: 'Check entryfilePath and excludeFiles; required runtime files cannot be excluded.'
    });
  }
};
