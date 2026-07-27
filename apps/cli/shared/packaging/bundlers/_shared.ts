import { isAbsolute, join } from 'node:path';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '@shared/utils/fs-utils';
import objectHash from 'object-hash';

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
  extraFiles?: string[];
  externalDependencies?: { name: string; version: string }[];
  additionalDigestInput?: string;
  rawEntryfilePath?: string;
  languageSpecificConfig?: Record<string, any>;
}) => {
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

export const getSourceFilesFromGlobs = async ({
  rootPath,
  fileGlobs,
  extraFiles = []
}: {
  rootPath: string;
  fileGlobs: string[];
  extraFiles?: string[];
}): Promise<{ path: string }[]> => {
  const matchingFiles = await getMatchingFilesByGlob({ globPattern: fileGlobs, cwd: rootPath });
  const files = [...matchingFiles, ...extraFiles].filter(Boolean);
  return files.map((filePath) => ({ path: isAbsolute(filePath) ? filePath : join(rootPath, filePath) }));
};
