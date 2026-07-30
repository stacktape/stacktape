import { isAbsolute, join } from 'node:path';
import objectHash from 'object-hash';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '../fs/files';

/**
 * The source-set digest every language bundler caches on.
 *
 * The digest covers the selected source files plus anything else that changes the produced artifact:
 * external dependency versions, language-specific configuration, and the entry file path. Two builds
 * with the same digest are expected to produce the same artifact, so any change here invalidates
 * every cached build.
 */
export const getBundleDigestFromGlobs = async ({
  rootPath,
  fileGlobs,
  extraFiles = [],
  externalDependencies = [],
  additionalDigestInput,
  rawEntryfilePath,
  languageSpecificConfig
}: {
  rootPath: string;
  fileGlobs: string[];
  extraFiles?: string[] | undefined;
  externalDependencies?: { name: string | undefined; version: string }[] | undefined;
  additionalDigestInput?: string | undefined;
  rawEntryfilePath?: string | undefined;
  /** Language config object; hashed structurally, never indexed, so the concrete shape is free. */
  languageSpecificConfig?: object | undefined;
}): Promise<string> => {
  const matchingFiles = await getMatchingFilesByGlob({ globPattern: fileGlobs, cwd: rootPath });
  const filesToInclude = [...matchingFiles, ...extraFiles]
    .filter(Boolean)
    .map((filePath) => (isAbsolute(filePath) ? filePath : join(rootPath, filePath)));

  const hash = await getHashFromMultipleFiles(filesToInclude);
  if (externalDependencies.length) {
    hash.update(objectHash(externalDependencies));
  }
  if (languageSpecificConfig) {
    hash.update(objectHash(languageSpecificConfig));
  }
  if (rawEntryfilePath) {
    hash.update(rawEntryfilePath);
  }
  if (additionalDigestInput) {
    hash.update(additionalDigestInput);
  }
  return hash.digest('hex');
};

/** The concrete source files a bundle was built from, for reporting and change tracking. */
export const getSourceFilesFromGlobs = async ({
  rootPath,
  fileGlobs,
  extraFiles = []
}: {
  rootPath: string;
  fileGlobs: string[];
  extraFiles?: string[] | undefined;
}): Promise<{ path: string }[]> => {
  const matchingFiles = await getMatchingFilesByGlob({ globPattern: fileGlobs, cwd: rootPath });
  const files = [...matchingFiles, ...extraFiles].filter(Boolean);
  return files.map((filePath) => ({ path: isAbsolute(filePath) ? filePath : join(rootPath, filePath) }));
};
