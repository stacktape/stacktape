import { basename, dirname, isAbsolute, join } from 'node:path';
import { exists } from 'fs-extra';

import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../../artifact/language-build-context';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';
import { getMatchingFilesByGlob } from '../../fs/files';

const FILE_GLOBS = STACKTAPE_LANGUAGE_SOURCE_GLOBS;
const EXTRA_FILES = [
  'global.json',
  'NuGet.config',
  'packages.lock.json',
  'Directory.Build.props',
  'Directory.Build.targets'
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
  /** Hashed structurally into the digest; the concrete shape is free. */
  languageSpecificConfig?: object | undefined;
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

export const resolveDotnetProjectFile = async ({
  rootPath,
  entryfilePath,
  projectFile
}: {
  rootPath: string;
  entryfilePath: string;
  projectFile?: string | undefined;
}) => {
  if (projectFile) {
    const absoluteProjectFile = isAbsolute(projectFile) ? projectFile : join(rootPath, projectFile);
    if (await exists(absoluteProjectFile)) {
      return absoluteProjectFile;
    }
  }

  const projectFiles = await getMatchingFilesByGlob({ globPattern: './**/*.csproj', cwd: rootPath });
  if (!projectFiles.length) {
    return null;
  }
  const entryDir = dirname(entryfilePath);
  const matchingInEntryDir = projectFiles.find((filePath) => dirname(join(rootPath, filePath)) === entryDir);
  const selected = matchingInEntryDir || projectFiles[0];
  if (!selected) {
    return null;
  }
  return isAbsolute(selected) ? selected : join(rootPath, selected);
};

export const getDotnetAssemblyName = (projectFilePath: string) => basename(projectFilePath).replace('.csproj', '');
