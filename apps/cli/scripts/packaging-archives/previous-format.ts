/**
 * How a CLI before the Lambda archive format zipped and identified Lambda artifacts, reproduced so the acceptance can
 * seed a deployment bucket exactly as such a CLI left it. Everything here is a deliberate copy of that behavior and
 * must not call the current archive policy: the acceptance proves the current code rejects what these produce.
 */
import { createHash, type Hash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { lstat, readdir, readlink, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { getDirectoryChecksum, mergeHashes } from '@stacktape/packaging/artifact/hashing';
import { getFileHash } from '@stacktape/packaging/fs/files';
import { ZipArchive } from 'archiver';
import objectHash from 'object-hash';

const writeZip = (outputPath: string, addEntries: (archive: ZipArchive) => void) =>
  new Promise<void>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 1 } });
    const output = createWriteStream(outputPath);
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', reject);
    archive.pipe(output);
    addEntries(archive);
    archive.finalize().catch(reject);
  });

/** The previous fallback archiver: every file 0644, whatever the host said, directories 0755. */
export const writePreviousFallbackZip = async ({
  sourcePath,
  outputPath
}: {
  sourcePath: string;
  outputPath: string;
}) => {
  const isDirectory = (await stat(sourcePath)).isDirectory();
  await writeZip(outputPath, (archive) => {
    if (isDirectory) {
      archive.directory(sourcePath, false, (entry) => {
        entry.mode = entry.stats?.isDirectory() ? 0o755 : 0o644;
        return entry;
      });
    } else {
      archive.append(createReadStream(sourcePath), { name: basename(sourcePath), mode: 0o644 });
    }
  });
};

/**
 * The previous native zip on a host whose umask is 077: raw host modes, so files are readable only by their owner, and
 * nothing in Lambda, which runs functions as a different user, can read them.
 */
export const writePreviousOwnerOnlyZip = async ({
  sourcePath,
  outputPath
}: {
  sourcePath: string;
  outputPath: string;
}) =>
  writeZip(outputPath, (archive) => {
    archive.directory(sourcePath, false, (entry) => {
      entry.mode = entry.stats?.isDirectory() ? 0o700 : (entry.stats?.mode ?? 0o600) & 0o700;
      return entry;
    });
  });

/** A custom artifact's digest: its checksum, handler and additional input. */
export const getPreviousCustomArtifactDigest = async ({
  packagePath,
  handler,
  additionalDigestInput = ''
}: {
  packagePath: string;
  handler: string;
  additionalDigestInput?: string;
}) =>
  mergeHashes(
    (await stat(packagePath)).isDirectory()
      ? await getDirectoryChecksum({ absoluteDirectoryPath: packagePath })
      : await getFileHash(packagePath),
    objectHash({ handler }),
    additionalDigestInput
  );

/**
 * A split function's digest: its directory checksum, the chunk layers it uses and its native dependency layer, as the
 * packaging manager composed it.
 */
export const getPreviousSplitFunctionDigest = async ({
  distFolderPath,
  chunkLayers,
  nativeLayer
}: {
  distFolderPath: string;
  chunkLayers: { layerNumber: number; contentHash: string }[];
  nativeLayer: { layerNumber: number; contentHash: string } | null;
}) =>
  mergeHashes(
    await getDirectoryChecksum({ absoluteDirectoryPath: distFolderPath }),
    chunkLayers.length
      ? chunkLayers
          .map(({ layerNumber }) => layerNumber)
          .sort()
          .map(
            (layerNumber) =>
              `${layerNumber}:${chunkLayers.find((layer) => layer.layerNumber === layerNumber)!.contentHash}`
          )
          .join(',')
      : 'none',
    nativeLayer ? `native:${nativeLayer.layerNumber}:${nativeLayer.contentHash}` : 'native:none'
  );

/** A shared chunk layer's hash, which named its S3 object: the directory checksum, truncated. */
export const getPreviousChunkLayerHash = async (layerPath: string) =>
  (await getDirectoryChecksum({ absoluteDirectoryPath: layerPath })).slice(0, 12);

const updateHashPart = (hash: Hash, part: string) => {
  hash.update(`${Buffer.byteLength(part)}:`);
  hash.update(part);
};

/** A native dependency layer's hash: entry kinds, paths, file bytes and raw link targets, without modes. */
export const getPreviousNativeLayerHash = async (layerPath: string) => {
  const entries: { absolutePath: string; relativePath: string; type: string; size?: number; target?: string }[] = [];
  const collect = async (directory: string): Promise<void> => {
    for (const name of await readdir(directory)) {
      const absolutePath = join(directory, name);
      const stats = await lstat(absolutePath);
      const relativePath = relative(layerPath, absolutePath).replace(/\\/g, '/');
      if (stats.isSymbolicLink()) {
        entries.push({ absolutePath, relativePath, type: 'symlink', target: await readlink(absolutePath) });
      } else if (stats.isDirectory()) {
        entries.push({ absolutePath, relativePath, type: 'directory' });
        await collect(absolutePath);
      } else {
        entries.push({ absolutePath, relativePath, type: stats.isFile() ? 'file' : 'other', size: stats.size });
      }
    }
  };
  await collect(layerPath);
  entries.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
  );
  const hash = createHash('sha256');
  for (const entry of entries) {
    updateHashPart(hash, entry.type);
    updateHashPart(hash, entry.relativePath);
    if (entry.type === 'file') {
      hash.update(`${entry.size}:`);
      for await (const chunk of createReadStream(entry.absolutePath)) hash.update(chunk as Buffer);
    } else if (entry.type === 'symlink') {
      updateHashPart(hash, entry.target ?? '');
    }
  }
  return hash.digest('hex').slice(0, 12);
};
