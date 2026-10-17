import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Creates an exclusively owned temporary build file without touching an existing customer file. */
export const createTemporaryBuildFile = async ({
  contents,
  directoryPath,
  prefix,
  suffix
}: {
  contents: string;
  directoryPath: string;
  prefix: string;
  suffix: string;
}): Promise<{ fileName: string; filePath: string }> => {
  const fileName = `${prefix}${randomUUID()}${suffix}`;
  const filePath = join(directoryPath, fileName);
  await writeFile(filePath, contents, { flag: 'wx' });
  return { fileName, filePath };
};

/**
 * Writes a generated build file alone in a new directory under `parentDirectoryPath`. Docker sends a Dockerfile by
 * syncing the directory that contains it, and in a busy shared directory such as the system temp directory that sync
 * loses the file when a neighbouring entry disappears meanwhile ("failed to read dockerfile"). Remove `directoryPath`
 * afterwards.
 */
export const createPrivateBuildFile = async ({
  contents,
  parentDirectoryPath,
  prefix,
  fileName
}: {
  contents: string;
  parentDirectoryPath: string;
  prefix: string;
  fileName: string;
}): Promise<{ directoryPath: string; filePath: string }> => {
  const directoryPath = await mkdtemp(join(parentDirectoryPath, prefix));
  const filePath = join(directoryPath, fileName);
  await writeFile(filePath, contents, { flag: 'wx' });
  return { directoryPath, filePath };
};
