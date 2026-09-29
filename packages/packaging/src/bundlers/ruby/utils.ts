import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../../artifact/language-build-context';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';

const FILE_GLOBS = STACKTAPE_LANGUAGE_SOURCE_GLOBS;
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
  lambdaZip
}: {
  rootPath: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput?: string | undefined;
  rawEntryfilePath: string;
  lambdaZip?: boolean | undefined;
}) =>
  getBundleDigestFromGlobs({
    rootPath,
    fileGlobs: FILE_GLOBS,
    extraFiles: EXTRA_FILES,
    externalDependencies,
    additionalDigestInput,
    rawEntryfilePath,
    lambdaZip
  });

export const getSourceFiles = ({ rootPath }: { rootPath: string }) =>
  getSourceFilesFromGlobs({ rootPath, fileGlobs: FILE_GLOBS, extraFiles: EXTRA_FILES });
