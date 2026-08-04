import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH } from 'src/config/project-paths';

export const EXPECTED_RELEASE_ARCHIVES = [
  'alpine.tar.gz',
  'linux-arm.tar.gz',
  'linux.tar.gz',
  'macos-arm.tar.gz',
  'macos.tar.gz',
  'windows.zip'
] as const;

const MEBIBYTE = 1024 * 1024;

/** A deliberate ceiling: update it only after reviewing the extracted artifact delta. */
export const MAX_RELEASE_ARCHIVE_BYTES: Record<(typeof EXPECTED_RELEASE_ARCHIVES)[number], number> = {
  'alpine.tar.gz': 90 * MEBIBYTE,
  'linux-arm.tar.gz': 90 * MEBIBYTE,
  'linux.tar.gz': 90 * MEBIBYTE,
  'macos-arm.tar.gz': 80 * MEBIBYTE,
  'macos.tar.gz': 80 * MEBIBYTE,
  'windows.zip': 90 * MEBIBYTE
};

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

  for (const fileName of actualArchives as (typeof EXPECTED_RELEASE_ARCHIVES)[number][]) {
    const { size } = await stat(join(directory, fileName));
    const maximumSize = MAX_RELEASE_ARCHIVE_BYTES[fileName];
    if (size > maximumSize) {
      throw new Error(
        `Release archive ${fileName} is ${(size / MEBIBYTE).toFixed(1)} MiB; the reviewed ceiling is ${(
          maximumSize / MEBIBYTE
        ).toFixed(0)} MiB.`
      );
    }
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
