import { join } from 'node:path';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '@shared/utils/fs-utils';
import objectHash from 'object-hash';

const FILES_TO_INCLUDE_IN_DIGEST = ['go.mod', 'go.sum'];
export const getBundleDigest = async ({
  cwd,
  externalDependencies,
  additionalDigestInput,
  rawEntryfilePath,
  languageSpecificConfig
}: {
  cwd: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput: string;
  rawEntryfilePath: string;
  languageSpecificConfig: GoLanguageSpecificConfig;
}) => {
  const goFiles = await getMatchingFilesByGlob({ globPattern: './**/*.go', cwd });
  const makeAbsolute = (filePath) => join(cwd, filePath);
  const filesToIncludeInDigest = [...goFiles, ...FILES_TO_INCLUDE_IN_DIGEST].map(makeAbsolute);

  const hash = await getHashFromMultipleFiles(filesToIncludeInDigest);
  hash.update(objectHash(externalDependencies));
  hash.update(objectHash(languageSpecificConfig || {}));
  hash.update(rawEntryfilePath);
  hash.update(additionalDigestInput || '');

  return hash.digest('hex');
};
