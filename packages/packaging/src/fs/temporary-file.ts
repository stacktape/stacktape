import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Creates an exclusively owned temporary file inside a build context without touching customer files. */
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
