import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../_shared';

const FILE_GLOBS = ['./**/*.go'];
const EXTRA_FILES = ['go.mod', 'go.sum', 'go.work', 'go.work.sum'];

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
  languageSpecificConfig?: GoLanguageSpecificConfig;
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
