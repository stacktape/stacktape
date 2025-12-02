import { join } from 'node:path';
import { getHashFromMultipleFiles, getMatchingFilesByGlob } from '@shared/utils/fs-utils';
import { exists } from 'fs-extra';
import objectHash from 'object-hash';

const FILES_TO_INCLUDE_IN_DIGEST = ['pyproject.toml', 'requirements.txt', 'pipenv'];
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
  languageSpecificConfig: PyLanguageSpecificConfig;
}) => {
  const pythonFiles = await getMatchingFilesByGlob({ globPattern: './**/*.py', cwd });
  const makeAbsolute = (filePath) => join(cwd, filePath);
  const filesToIncludeInDigest = [...pythonFiles, ...FILES_TO_INCLUDE_IN_DIGEST].map(makeAbsolute);

  const hash = await getHashFromMultipleFiles(filesToIncludeInDigest);
  hash.update(objectHash(externalDependencies));
  hash.update(objectHash(languageSpecificConfig || {}));
  hash.update(rawEntryfilePath);
  hash.update(additionalDigestInput || '');

  return hash.digest('hex');
};

export const detectPackageManager = async (sourcePath: string) =>
  (await exists(`${sourcePath}/requirements.txt`))
    ? 'pip'
    : (await exists(`${sourcePath}/Pipfile`))
      ? 'pipenv'
      : (await exists(`${sourcePath}/pyproject.toml`))
        ? 'poetry'
        : undefined;
