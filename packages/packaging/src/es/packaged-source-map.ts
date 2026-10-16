import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync, gzip } from 'node:zlib';

const compress = promisify(gzip);

/** The map a Lambda package ships: `map` without `sourcesContent`. See `writePackagedSourceMap`. */
export const withoutSourcesContent = <Map extends Record<string, unknown>>(map: Map): Map => {
  const packaged = { ...map };
  delete packaged.sourcesContent;
  return packaged;
};

/**
 * Writes the source map a Lambda package ships: the map at `from` without `sourcesContent` (owner decision,
 * 2026-09-25). Node maps stack frames from `sources`, `names` and `mappings` alone, so mapped file, line and function
 * stay; only the original-source excerpt Node prints above a fatal error is lost, and the map shrinks to a fraction.
 * `from` may equal `to`; otherwise the full map at `from` is left as it was for any later external use.
 */
export const writePackagedSourceMap = async ({ from, to }: { from: string; to: string }) => {
  const map = JSON.parse(await readFile(from, 'utf8')) as Record<string, unknown>;
  await writeFile(to, JSON.stringify(withoutSourcesContent(map)));
};

/**
 * The source maps of one Lambda package, kept outside it. Each map is stored under the path its JavaScript file has in
 * the execution environment, which is the path a stack frame names: `/var/task/index.js` for function code and
 * `/opt/nodejs/chunks/chunk-….js` for a layered chunk. Maps carry no `sourcesContent`.
 */
export type SourceMapBundle = { files: Record<string, Record<string, unknown>> };

const SOURCE_MAP_FILE = /\.[cm]?js\.map$/;

/**
 * Moves the source maps the bundler wrote into `packagePath` out of the package, into one gzip-compressed bundle file
 * beside it (`<package>.source-maps.json.gz`), so the deployed package carries code only. Only `directories` (relative
 * to the package) are searched: the bundle and its chunks live there, while installed packages under `node_modules`
 * keep their own files. Mappings are base64 text and compress to about a fifth; the deployment stores the compressed
 * bytes with `Content-Encoding: gzip`.
 *
 * Returns the bundle's path and the SHA-256 of its uncompressed content, or `undefined` when the package had no map. The
 * caller puts that hash into the artifact's identity: a changed map must produce a new artifact even when the code is
 * byte for byte the same, so every deployment can be traced to its own maps.
 */
export const takeSourceMapsOutOfPackage = async ({
  packagePath,
  runtimeRoot,
  directories
}: {
  packagePath: string;
  /** Where the package is mounted at runtime: `/var/task` for a function, `/opt` for a layer. */
  runtimeRoot: '/var/task' | '/opt';
  directories: string[];
}): Promise<{ path: string; sha256: string } | undefined> => {
  const mapPaths = (
    await Promise.all(
      directories.map(async (directory) =>
        existsSync(join(packagePath, directory))
          ? (await readdir(join(packagePath, directory)))
              .filter((name) => SOURCE_MAP_FILE.test(name))
              .map((name) => posix.join(directory, name))
          : []
      )
    )
  )
    .flat()
    .toSorted();
  if (!mapPaths.length) return undefined;

  const maps = await Promise.all(
    mapPaths.map(async (mapPath) => {
      const map = JSON.parse(await readFile(join(packagePath, mapPath), 'utf8')) as Record<string, unknown>;
      await rm(join(packagePath, mapPath));
      return [posix.join(runtimeRoot, mapPath.slice(0, -'.map'.length)), withoutSourcesContent(map)] as const;
    })
  );
  const content = JSON.stringify({ files: Object.fromEntries(maps) } satisfies SourceMapBundle);
  const path = `${packagePath}.source-maps.json.gz`;
  // Level 6: on a 1.6 MB bundle, level 9 took 2.7 times as long for 1.4 % fewer bytes.
  await writeFile(path, await compress(content, { level: 6 }));
  return { path, sha256: createHash('sha256').update(content).digest('hex') };
};

/** Reads a bundle `takeSourceMapsOutOfPackage` wrote. */
export const readSourceMapBundle = async (path: string): Promise<SourceMapBundle> =>
  JSON.parse(gunzipSync(await readFile(path)).toString('utf8')) as SourceMapBundle;
