import dockerIgnore from '@balena/dockerignore';
import { createHash, type Hash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, readlink } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import fastGlob from 'fast-glob';
import { pathExists } from 'fs-extra';
import { withFileDescriptor } from './archive-entries';

/** How many entries are inspected, and their small files read, at once. They are then hashed in order. */
const BATCH_ENTRIES = 64;
/**
 * Files up to this size are read whole with their batch; larger ones are streamed into the hash at their turn. At most
 * one batch of such files, 16 MiB, is held at once, whatever the size of the context.
 */
const BUFFERED_FILE_BYTES = 256 * 1024;
/** Large files are streamed in chunks of this size. */
const STREAM_CHUNK_BYTES = 1024 * 1024;

const toDockerPath = (path: string) => path.replaceAll('\\', '/').replace(/\/$/, '');

type InspectedEntry = { absolutePath: string; entry: string; mode: number } & (
  | { kind: 'directory' }
  | { kind: 'symlink'; target: string }
  | { kind: 'file'; size: number; contents: Buffer | undefined }
);

const inspectEntry = async (absoluteBuildContextPath: string, entry: string): Promise<InspectedEntry> => {
  const absolutePath = join(absoluteBuildContextPath, entry);
  const stats = await lstat(absolutePath);
  const mode = stats.mode & 0o777;
  if (stats.isSymbolicLink()) {
    return { absolutePath, entry, mode, kind: 'symlink', target: await readlink(absolutePath) };
  }
  if (stats.isFile()) {
    const contents =
      stats.size <= BUFFERED_FILE_BYTES ? await withFileDescriptor(() => readFile(absolutePath)) : undefined;
    return { absolutePath, entry, mode, kind: 'file', size: stats.size, contents };
  }
  return { absolutePath, entry, mode, kind: 'directory' };
};

/**
 * Streams the whole file into the hash after a frame that already declared its `lstat` size. A file that grew or shrank
 * since then no longer matches its frame, so the checksum fails instead of describing bytes Docker will not receive.
 */
const hashFileBytes = (
  hash: Hash,
  { absolutePath, entry, size }: { absolutePath: string; entry: string; size: number }
) =>
  withFileDescriptor(async () => {
    let hashedBytes = 0;
    for await (const chunk of createReadStream(absolutePath, { highWaterMark: STREAM_CHUNK_BYTES })) {
      hashedBytes += chunk.length;
      hash.update(chunk);
    }
    if (hashedBytes !== size) {
      throw new Error(`${entry} in the Docker build context changed while its checksum was being calculated.`);
    }
  });

const getDockerIgnorePath = async ({
  absoluteBuildContextPath,
  absoluteDockerfilePath
}: {
  absoluteBuildContextPath: string;
  absoluteDockerfilePath: string;
}): Promise<string | undefined> => {
  const dockerfileSpecificIgnorePath = `${absoluteDockerfilePath}.dockerignore`;
  if (await pathExists(dockerfileSpecificIgnorePath)) return dockerfileSpecificIgnorePath;

  const defaultIgnorePath = join(absoluteBuildContextPath, '.dockerignore');
  return (await pathExists(defaultIgnorePath)) ? defaultIgnorePath : undefined;
};

/**
 * Hashes the context Docker actually receives. Unlike ordinary Stacktape source hashing, this deliberately does not
 * exclude VCS, editor, dependency, or build-output directories: a custom Dockerfile can consume any of them. The
 * selected Dockerfile-specific ignore file takes precedence over the root `.dockerignore`, matching Docker.
 */
export const getDockerContextChecksum = async ({
  absoluteBuildContextPath,
  dockerfilePath = 'Dockerfile',
  includeDockerfile = true,
  applyDockerIgnore = true
}: {
  absoluteBuildContextPath: string;
  dockerfilePath?: string | undefined;
  includeDockerfile?: boolean | undefined;
  applyDockerIgnore?: boolean | undefined;
}): Promise<{
  checksum: string;
  absoluteDockerfilePath: string;
  includedFilePaths: string[];
}> => {
  const absoluteDockerfilePath = isAbsolute(dockerfilePath)
    ? dockerfilePath
    : join(absoluteBuildContextPath, dockerfilePath);
  const dockerIgnorePath = applyDockerIgnore
    ? await getDockerIgnorePath({ absoluteBuildContextPath, absoluteDockerfilePath })
    : undefined;
  const matcher = dockerIgnore();
  if (dockerIgnorePath) matcher.add(await readFile(dockerIgnorePath, 'utf8'));

  const contextEntries = await fastGlob('**/*', {
    cwd: absoluteBuildContextPath,
    dot: true,
    followSymbolicLinks: false,
    markDirectories: true,
    onlyFiles: false,
    unique: true
  });
  const includedEntries = matcher
    .filter(contextEntries)
    .map(toDockerPath)
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right));

  const hash = createHash('sha1');
  const includedFilePaths: string[] = [];
  for (let start = 0; start < includedEntries.length; start += BATCH_ENTRIES) {
    // oxlint-disable-next-line no-await-in-loop -- Batches bound open files and held bytes; the hash takes them in order.
    const batch = await Promise.all(
      includedEntries.slice(start, start + BATCH_ENTRIES).map((entry) => inspectEntry(absoluteBuildContextPath, entry))
    );
    for (const inspected of batch) {
      const identity = `${inspected.kind}:${inspected.mode.toString(8)}:${inspected.entry}`;
      hash.update(`${Buffer.byteLength(identity)}:${identity}`);

      if (inspected.kind === 'symlink') {
        hash.update(`${Buffer.byteLength(inspected.target)}:${inspected.target}`);
        includedFilePaths.push(inspected.absolutePath);
      } else if (inspected.kind === 'file') {
        if (inspected.contents) {
          hash.update(`${inspected.contents.byteLength}:`);
          hash.update(inspected.contents);
        } else {
          hash.update(`${inspected.size}:`);
          // oxlint-disable-next-line no-await-in-loop -- A large file is streamed into the hash at its turn.
          await hashFileBytes(hash, inspected);
        }
        includedFilePaths.push(inspected.absolutePath);
      } else {
        hash.update('0:');
      }
    }
  }

  // A Dockerfile may be outside the context and therefore absent from the inventory above.
  if (includeDockerfile) {
    const dockerfileContents = await readFile(absoluteDockerfilePath);
    const dockerfileIdentity = toDockerPath(relative(absoluteBuildContextPath, absoluteDockerfilePath));
    hash.update(
      `dockerfile:${Buffer.byteLength(dockerfileIdentity)}:${dockerfileIdentity}:${dockerfileContents.byteLength}:`
    );
    hash.update(dockerfileContents);
  }

  return { checksum: hash.digest('hex'), absoluteDockerfilePath, includedFilePaths };
};
