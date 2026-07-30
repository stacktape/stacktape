import { readdir } from 'node:fs/promises';
import { DIST_PACKAGE_FOLDER_PATH } from '@shared/naming/project-fs-paths';

export const EXPECTED_RELEASE_ARCHIVES = [
  'alpine.tar.gz',
  'linux-arm.tar.gz',
  'linux.tar.gz',
  'macos-arm.tar.gz',
  'macos.tar.gz',
  'windows.zip'
] as const;

export const verifyCandidateArchives = async (directory = DIST_PACKAGE_FOLDER_PATH) => {
  const actualArchives = (await readdir(directory))
    .filter((fileName) => fileName.endsWith('.tar.gz') || fileName.endsWith('.zip'))
    .sort();

  if (
    actualArchives.length !== EXPECTED_RELEASE_ARCHIVES.length ||
    actualArchives.some((fileName, index) => fileName !== EXPECTED_RELEASE_ARCHIVES[index])
  ) {
    throw new Error(
      `Release candidate archive set mismatch. Expected ${EXPECTED_RELEASE_ARCHIVES.join(', ')}; received ${
        actualArchives.join(', ') || '(none)'
      }.`
    );
  }

  return actualArchives;
};

if (import.meta.main) {
  verifyCandidateArchives()
    .then((archives) => console.info(`Verified ${archives.length} release candidate archives.`))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
