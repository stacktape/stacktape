import { basename, dirname, isAbsolute, join } from 'node:path';
import { exists } from 'fs-extra';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../_shared';

const FILE_GLOBS = ['./**/*.py'];
const EXTRA_FILES = [
  'pyproject.toml',
  'requirements.txt',
  'requirements-dev.txt',
  'requirements-prod.txt',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'uv.lock'
];

export const getBundleDigest = ({
  rootPath,
  externalDependencies,
  additionalDigestInput,
  rawEntryfilePath,
  languageSpecificConfig
}: {
  rootPath: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput?: string;
  rawEntryfilePath: string;
  languageSpecificConfig?: PyLanguageSpecificConfig;
}) =>
  getBundleDigestFromGlobs({
    rootPath,
    fileGlobs: FILE_GLOBS,
    extraFiles: EXTRA_FILES,
    externalDependencies,
    additionalDigestInput,
    rawEntryfilePath,
    languageSpecificConfig
  });

export const getSourceFiles = ({ rootPath }: { rootPath: string }) =>
  getSourceFilesFromGlobs({ rootPath, fileGlobs: FILE_GLOBS, extraFiles: EXTRA_FILES });

export const resolvePythonDependencyFile = async ({
  cwd,
  sourcePath,
  packageManagerFile
}: {
  cwd: string;
  sourcePath: string;
  packageManagerFile?: string;
}) => {
  const candidates: string[] = [];
  if (packageManagerFile) {
    candidates.push(isAbsolute(packageManagerFile) ? packageManagerFile : join(cwd, packageManagerFile));
  }

  const roots = [sourcePath, cwd].filter(Boolean);
  const defaultNames = ['pyproject.toml', 'requirements.txt', 'Pipfile'];
  roots.forEach((root) => {
    defaultNames.forEach((name) => {
      candidates.push(join(root, name));
    });
  });

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
};

export const getPythonDependencyFileType = (dependencyFilePath?: string | null) => {
  if (!dependencyFilePath) {
    return null;
  }
  const baseName = basename(dependencyFilePath);
  if (baseName === 'Pipfile') {
    return 'pipfile';
  }
  if (baseName === 'pyproject.toml') {
    return 'pyproject';
  }
  if (baseName === 'uv.lock') {
    return 'uv-lock';
  }
  if (baseName.endsWith('.txt')) {
    return 'requirements';
  }
  return 'requirements';
};

export const getPythonDependencyRootPath = (dependencyFilePath: string | null, sourcePath: string) =>
  dependencyFilePath ? dirname(dependencyFilePath) : sourcePath;
