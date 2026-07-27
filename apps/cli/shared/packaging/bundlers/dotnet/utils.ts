import { basename, dirname, isAbsolute, join } from 'node:path';
import { exists } from 'fs-extra';
import { getMatchingFilesByGlob } from '@shared/utils/fs-utils';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../_shared';

const FILE_GLOBS = ['./**/*.cs', './**/*.csproj', './**/*.sln', './**/*.props', './**/*.targets'];
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
  languageSpecificConfig
}: {
  rootPath: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput?: string;
  rawEntryfilePath: string;
  languageSpecificConfig?: DotnetLanguageSpecificConfig;
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

export const resolveDotnetProjectFile = async ({
  rootPath,
  entryfilePath,
  projectFile
}: {
  rootPath: string;
  entryfilePath: string;
  projectFile?: string;
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
  return isAbsolute(selected) ? selected : join(rootPath, selected);
};

export const getDotnetAssemblyName = (projectFilePath: string) => basename(projectFilePath).replace('.csproj', '');
