import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH } from '@shared/naming/project-fs-paths';

export const RELEASE_CHECKSUMS_FILE_NAME = 'SHA256SUMS';

export const calculateSha256 = async (filePath: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
};

export const parseReleaseChecksums = (content: string) => {
  const checksums = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const match = /^([a-f0-9]{64})\s{2}([^\s/\\]+)$/.exec(line);
    if (!match) {
      throw new Error(`Invalid release checksum line: ${rawLine}`);
    }
    const [, checksum, fileName] = match;
    if (checksums.has(fileName)) {
      throw new Error(`Duplicate release checksum entry: ${fileName}`);
    }
    checksums.set(fileName, checksum);
  }
  return checksums;
};

export const generateReleaseChecksums = async ({
  directory = DIST_PACKAGE_FOLDER_PATH
}: {
  directory?: string;
} = {}) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const archiveNames = entries
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.tar.gz') || entry.name.endsWith('.zip')))
    .map((entry) => entry.name)
    .sort();

  if (archiveNames.length === 0) {
    throw new Error(`No release archives found in ${directory}.`);
  }

  const lines = await Promise.all(
    archiveNames.map(async (fileName) => `${await calculateSha256(join(directory, fileName))}  ${fileName}`)
  );
  const manifestPath = join(directory, RELEASE_CHECKSUMS_FILE_NAME);
  await writeFile(manifestPath, `${lines.join('\n')}\n`, 'utf8');
  return manifestPath;
};

export const verifyReleaseChecksum = async ({ filePath, manifestPath }: { filePath: string; manifestPath: string }) => {
  const checksums = parseReleaseChecksums(await readFile(manifestPath, 'utf8'));
  const fileName = basename(filePath);
  const expected = checksums.get(fileName);
  if (!expected) {
    throw new Error(`Release checksum manifest has no entry for ${fileName}.`);
  }
  const actual = await calculateSha256(filePath);
  if (actual !== expected) {
    throw new Error(`Release checksum mismatch for ${fileName}. Expected ${expected}, received ${actual}.`);
  }
};

if (import.meta.main) {
  generateReleaseChecksums()
    .then((manifestPath) => {
      console.info(`Generated release checksums at ${manifestPath}.`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
