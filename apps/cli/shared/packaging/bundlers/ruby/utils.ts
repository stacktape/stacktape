import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../_shared';

const FILE_GLOBS = ['./**/*.rb'];
const EXTRA_FILES = [
  'Gemfile',
  'Gemfile.lock',
  'gems.rb',
  'gems.locked',
  'Rakefile',
  '.ruby-version',
  '.bundle/config'
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
  languageSpecificConfig?: RubyLanguageSpecificConfig;
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
