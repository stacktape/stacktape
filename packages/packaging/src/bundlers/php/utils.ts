import type { PhpLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';

const FILE_GLOBS = ['./**/*.php'];
const EXTRA_FILES = ['composer.json', 'composer.lock', 'symfony.lock'];

export const getBundleDigest = ({
  rootPath,
  externalDependencies,
  additionalDigestInput,
  rawEntryfilePath,
  languageSpecificConfig
}: {
  rootPath: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput?: string | undefined;
  rawEntryfilePath: string;
  languageSpecificConfig?: PhpLanguageSpecificConfig | undefined;
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
