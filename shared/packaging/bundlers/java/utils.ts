import { join } from 'node:path';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '@shared/utils/fs-utils';
import objectHash from 'object-hash';

const FILES_TO_INCLUDE_IN_DIGEST = ['build.gradle', 'pom.xml'];
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
  languageSpecificConfig: JavaLanguageSpecificConfig;
}) => {
  const javaFiles = await getMatchingFilesByGlob({ globPattern: './**/*.java', cwd });
  const makeAbsolute = (filePath) => join(cwd, filePath);
  const filesToIncludeInDigest = [...javaFiles, ...FILES_TO_INCLUDE_IN_DIGEST].map(makeAbsolute);

  const hash = await getHashFromMultipleFiles(filesToIncludeInDigest);
  hash.update(objectHash(languageSpecificConfig || {}));
  hash.update(rawEntryfilePath);
  hash.update(objectHash(externalDependencies));
  hash.update(additionalDigestInput ?? '');

  return hash.digest('hex');
};
