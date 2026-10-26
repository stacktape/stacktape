import { existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { exists, readFile } from 'fs-extra';

import type { PythonBuildpackConfig } from '@stacktape/config/deployment-artifacts';
import type { CreatePackagingError } from '../../runtime-contracts';
import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../../artifact/language-build-context';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';

const FILE_GLOBS = STACKTAPE_LANGUAGE_SOURCE_GLOBS;
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
  languageSpecificConfig,
  lambdaZip
}: {
  rootPath: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput?: string | undefined;
  rawEntryfilePath: string;
  languageSpecificConfig?: PythonBuildpackConfig | undefined;
  lambdaZip?: boolean | undefined;
}) =>
  getBundleDigestFromGlobs({
    rootPath,
    fileGlobs: FILE_GLOBS,
    extraFiles: EXTRA_FILES,
    externalDependencies,
    additionalDigestInput,
    rawEntryfilePath,
    languageSpecificConfig,
    lambdaZip
  });

export const getSourceFiles = ({ rootPath }: { rootPath: string }) =>
  getSourceFilesFromGlobs({ rootPath, fileGlobs: FILE_GLOBS, extraFiles: EXTRA_FILES });

export const resolvePythonDependencyFile = ({
  cwd,
  sourcePath,
  packageManagerFile
}: {
  cwd: string;
  sourcePath: string;
  packageManagerFile?: string | undefined;
}) => {
  const candidates: string[] = [];
  if (packageManagerFile) {
    candidates.push(isAbsolute(packageManagerFile) ? packageManagerFile : join(cwd, packageManagerFile));
  }

  const roots = [sourcePath, cwd].filter(Boolean);
  // Prefer a committed lock over its pyproject input so default builds are reproducible.
  const defaultNames = ['uv.lock', 'pyproject.toml', 'requirements.txt', 'Pipfile'];
  roots.forEach((root) => {
    defaultNames.forEach((name) => {
      candidates.push(join(root, name));
    });
  });

  // Dependency files are chosen by precedence; later paths must not win.
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
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

/** A pinned requirement: `name[extras]==version`, optionally with an environment marker and hashes. */
const PINNED_REQUIREMENT =
  /^[A-Za-z0-9][A-Za-z0-9._-]*(\[[A-Za-z0-9._,\s-]*\])?\s*==\s*[A-Za-z0-9.!+_-]+\s*(;[^#\\]*)?(\s+--hash=[A-Za-z0-9]+:[A-Fa-f0-9]+)*\s*(#.*)?$/;
/** Files at the dependency root that uv reads, or that select another project or interpreter. */
const REQUIREMENTS_SOURCE_INPUTS = [
  'uv.toml',
  'pyproject.toml',
  'uv.lock',
  'Pipfile',
  'Pipfile.lock',
  'setup.py',
  'setup.cfg',
  '.python-version'
];

/**
 * Whether the dependency file is a root `requirements.txt` whose install reads nothing from the source: every line is
 * blank, a comment or a pinned requirement (no nested, constraint, editable, local, URL or option lines), and no uv
 * configuration or other project file sits beside it. A requirement may continue over lines ending in `\`, as
 * `pip-compile --generate-hashes` and `uv pip compile --generate-hashes` write its hashes.
 */
export const canInstallRequirementsWithoutSource = async (dependencyFilePath: string | null) => {
  if (!dependencyFilePath || basename(dependencyFilePath) !== 'requirements.txt') return false;
  const root = dirname(dependencyFilePath);
  if ((await Promise.all(REQUIREMENTS_SOURCE_INPUTS.map((file) => exists(join(root, file))))).some(Boolean)) {
    return false;
  }
  const lines = (await readFile(dependencyFilePath, 'utf8'))
    .replaceAll(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim());
  return lines.every((line) => line === '' || line.startsWith('#') || PINNED_REQUIREMENT.test(line));
};

const UV_SELECTOR_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const getPythonUvDependencySelectorBuildArgs = (
  languageSpecificConfig: PythonBuildpackConfig | undefined,
  createPackagingError: CreatePackagingError
) => {
  const selectors = {
    uvOptionalDependencies: languageSpecificConfig?.uvOptionalDependencies || [],
    uvWithGroups: languageSpecificConfig?.uvWithGroups || [],
    uvWithoutGroups: languageSpecificConfig?.uvWithoutGroups || [],
    uvOnlyGroups: languageSpecificConfig?.uvOnlyGroups || []
  };

  Object.entries(selectors).forEach(([propertyName, values]) => {
    values.forEach((value) => {
      if (!UV_SELECTOR_NAME_PATTERN.test(value)) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: `Invalid Python uv dependency selector "${value}" in python.${propertyName}. Use only letters, numbers, ".", "_" and "-".`
        });
      }
    });
  });

  return {
    optionalDependencies: selectors.uvOptionalDependencies.join(' '),
    withGroups: selectors.uvWithGroups.join(' '),
    withoutGroups: selectors.uvWithoutGroups.join(' '),
    onlyGroups: selectors.uvOnlyGroups.join(' ')
  };
};

/** One source file `compileall` could not compile, as its output names it. */
export type PythonCompileError = { file: string; line?: number; error: string; code?: string };

/**
 * The files the build's `compileall` step rejected, read from the Docker build output. Each starts with
 * `*** Error compiling './x.py'...`, followed by Python's report: a syntax error as `File "./x.py", line 6`, the code
 * and `SyntaxError: ...`; an indentation or tab error as `Sorry: TabError: ... (x.py, line 3)`. BuildKit prefixes each
 * line with its step and time and prints the step's output twice; each file is reported once. Paths are relative to
 * the build root.
 */
export const parsePythonCompileErrors = (dockerOutput: string): PythonCompileError[] => {
  const lines = dockerOutput.split(/\r?\n/).map((line) => line.replace(/^(#\d+ )?\d+\.\d+ /, ''));
  const errors = new Map<string, PythonCompileError>();
  for (let index = 0; index < lines.length; index++) {
    const file = /^\*\*\* Error compiling '(?:\.\/)?(.+)'\.\.\.$/.exec(lines[index]!.trim())?.[1];
    if (!file || errors.has(file)) continue;
    let line: number | undefined;
    let code: string | undefined;
    let error = 'could not be compiled';
    for (let next = index + 1; next < Math.min(lines.length, index + 12); next++) {
      const text = lines[next]!.trim();
      if (text.startsWith('*** Error compiling')) break;
      const sorry = /^Sorry: (\w+): (.+) \(.+, line (\d+)\)$/.exec(text);
      if (sorry) {
        error = `${sorry[1]}: ${sorry[2]}`;
        line = Number(sorry[3]);
        break;
      }
      const location = /^File ".+", line (\d+)/.exec(text);
      if (location) {
        line = Number(location[1]);
        const codeLine = lines[next + 1]?.trim();
        if (codeLine && !/^\^+$/.test(codeLine)) code = codeLine;
        continue;
      }
      const reported = /^(\w+(?:Error|Exception|Warning)): (.+)$/.exec(text);
      if (reported) {
        error = `${reported[1]}: ${reported[2]}`;
        break;
      }
    }
    errors.set(file, { file, ...(line !== undefined && { line }), error, ...(code && { code }) });
  }
  return [...errors.values()];
};
