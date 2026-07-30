import type { RubyLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';

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
  additionalDigestInput?: string | undefined;
  rawEntryfilePath: string;
  languageSpecificConfig?: RubyLanguageSpecificConfig | undefined;
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
