/**
 * An artifact's identity must not depend on where the project was built (owner decision, 2026-10-09): the same
 * project built from two directories, or on two machines, produces byte-identical functions and layers, so the
 * customer's own bucket can reuse them and no developer path ends up in a deployed artifact. Bun's output depends on
 * the absolute build path in three places, which this module neutralizes after every build:
 *
 * - a chunk's `[hash]` name: Bun salts it with the absolute path, so the same bytes get different names in different
 *   directories and every file importing the chunk changes with it. Chunks are renamed after their content, with
 *   chunk references and the debug ID masked, so a chunk's name follows its bytes alone;
 * - the `debugId` in every bundle's trailing comment and in its map: derived by Bun from the absolute path. It is
 *   replaced with a value derived from the bundle's content, identical in the bundle and in its map, so tooling that
 *   pairs them by ID keeps working;
 * - the `// <path>` module comments of unminified output and a map's `sources`: Bun writes both relative to the
 *   output directory, which lies under the build directory. They
 *   are re-expressed relative to the project root (`src/lib/shared.ts`); a source outside the project keeps only its
 *   `node_modules/...` tail, or its name under `external/`. A runtime resolves them from the map's location, so a
 *   stack frame reads `/var/task/src/lib/shared.ts` for function code and `/opt/nodejs/chunks/src/lib/shared.ts` for
 *   a layered chunk: the original file is always named, and never the build host.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const DEBUG_ID_COMMENT = /\/\/# debugId=[0-9A-Fa-f]+/;
const SOURCE_MAPPING_URL_COMMENT = /\/\/# sourceMappingURL=\S+/;
/** The chunk names Bun emits (`chunk-[hash].js`): eight base-36 characters; the content-derived names match too. */
const CHUNK_NAME = /chunk-[a-z0-9]{8}/g;

const toPosix = (path: string) => path.replace(/\\/g, '/');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * `source`, an absolute path, as a map ships it: relative to the project root with `/` separators. A source outside
 * the root keeps its `node_modules/...` tail (a dependency), or its file name under `external/`, so neither the
 * build host's layout nor a home directory appears.
 */
export const projectRelativeSource = (source: string, projectRoot: string): string => {
  const relativePath = toPosix(relative(projectRoot, source));
  if (relativePath !== '' && !relativePath.startsWith('../') && !relativePath.startsWith('/')) return relativePath;
  const posix = toPosix(source);
  const dependencyIndex = posix.lastIndexOf('/node_modules/');
  if (dependencyIndex !== -1) return posix.slice(dependencyIndex + 1);
  return `external/${basename(source)}`;
};

/**
 * The debug ID of a bundle: 32 hexadecimal digits from the SHA-256 of its code with its own debug-ID and map
 * comments left out, so the ID describes the code and the same code gets the same ID everywhere.
 */
export const deterministicDebugId = (code: string): string =>
  sha256(code.replace(DEBUG_ID_COMMENT, '').replace(SOURCE_MAPPING_URL_COMMENT, '')).slice(0, 32).toUpperCase();

/**
 * Bun's unminified output precedes each module with `// <path>` relative to its output directory, which lies under
 * the build directory. Such comments are rewritten relative to the project root. A comment line carries no mapping
 * segments, so the map stays correct.
 */
const PATH_COMMENT_LINE = /^\/\/ (\.{1,2}\/\S+|\S+\/\S+)$/gm;
const rewritePathComments = (code: string, resolveFrom: string, projectRoot: string) =>
  code.replace(PATH_COMMENT_LINE, (line, path: string) =>
    /^[a-z][a-z\d+.-]*:/i.test(path) ? line : `// ${projectRelativeSource(resolve(resolveFrom, path), projectRoot)}`
  );

/** A chunk's content-derived name: its code with chunk references and the debug ID masked. */
const contentChunkName = (code: string) =>
  `chunk-${sha256(code.replace(CHUNK_NAME, 'chunk-xxxxxxxx').replace(DEBUG_ID_COMMENT, '')).slice(0, 8)}`;

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;

/**
 * Stamps `javascriptPath` and its map, when it has one, with the bundle's content-derived debug ID. A bundle Bun
 * built without a debug-ID comment (no source map) is left alone.
 */
export const stampDebugId = async (javascriptPath: string) => {
  const code = await readFile(javascriptPath, 'utf8');
  if (!DEBUG_ID_COMMENT.test(code)) return;
  const debugId = deterministicDebugId(code);
  await writeFile(javascriptPath, code.replace(DEBUG_ID_COMMENT, `//# debugId=${debugId}`));
  const mapPath = `${javascriptPath}.map`;
  if (existsSync(mapPath)) {
    const map = await readJson(mapPath);
    if (typeof map.debugId === 'string') await writeFile(mapPath, JSON.stringify({ ...map, debugId }));
  }
};

/** Rewrites the map of `javascriptPath`, when it has one, with `sources` relative to the project root. */
export const rebaseMapSourcesToProject = async ({
  javascriptPath,
  projectRoot,
  resolveFrom = dirname(javascriptPath)
}: {
  javascriptPath: string;
  projectRoot: string;
  /** The folder the map's current `sources` are relative to; the map's own folder unless said otherwise. */
  resolveFrom?: string;
}) => {
  const mapPath = `${javascriptPath}.map`;
  if (!existsSync(mapPath)) return;
  const map = await readJson(mapPath);
  if (!Array.isArray(map.sources)) return;
  const { sourceRoot, ...rest } = map;
  const root = typeof sourceRoot === 'string' ? sourceRoot : '';
  await writeFile(
    mapPath,
    JSON.stringify({
      ...rest,
      sources: map.sources.map((source) =>
        typeof source === 'string' && !/^[a-z][a-z\d+.-]*:/i.test(source)
          ? projectRelativeSource(resolve(resolveFrom, root, source), projectRoot)
          : source
      )
    })
  );
};

/**
 * Gives every chunk among `javascriptFiles` its content-derived name: the files and their maps are renamed, every
 * reference in the JavaScript files and in the maps' `file` fields is rewritten, and each bundle is then stamped with
 * its debug ID. Returns the renames (old base name to new base name, without extension) for callers holding paths.
 */
export const normalizeSplitBuildIdentity = async ({
  javascriptFiles,
  projectRoot,
  sourcesResolveFrom
}: {
  javascriptFiles: string[];
  projectRoot: string;
  /** The folder the maps' `sources` are relative to as Bun wrote them (its output directory). */
  sourcesResolveFrom: string;
}): Promise<Map<string, string>> => {
  const codes = new Map(
    await Promise.all(
      javascriptFiles.map(
        async (path) =>
          [path, rewritePathComments(await readFile(path, 'utf8'), sourcesResolveFrom, projectRoot)] as const
      )
    )
  );
  const renames = new Map<string, string>();
  for (const [path, code] of codes) {
    const name = basename(path, '.js');
    if (!/^chunk-[a-z0-9]{8}$/.test(name)) continue;
    const next = contentChunkName(code);
    if (next !== name) renames.set(name, next);
  }
  const rewrite = (text: string) => text.replace(CHUNK_NAME, (name) => renames.get(name) ?? name);
  const finalPaths = await Promise.all(
    [...codes].map(async ([path, code]) => {
      const name = basename(path, '.js');
      const nextPath = renames.has(name) ? join(dirname(path), `${renames.get(name)!}.js`) : path;
      await writeFile(path, rewrite(code));
      const mapPath = `${path}.map`;
      if (existsSync(mapPath)) {
        const map = await readJson(mapPath);
        await writeFile(
          mapPath,
          JSON.stringify(typeof map.file === 'string' ? { ...map, file: rewrite(map.file) } : map)
        );
        if (nextPath !== path) await rename(mapPath, `${nextPath}.map`);
      }
      if (nextPath !== path) await rename(path, nextPath);
      return nextPath;
    })
  );
  await Promise.all(
    finalPaths.map(async (path) => {
      await rebaseMapSourcesToProject({ javascriptPath: path, projectRoot, resolveFrom: sourcesResolveFrom });
      await stampDebugId(path);
    })
  );
  return renames;
};

/** The identity normalization of one bundle built on its own: project-relative `sources`, then the debug ID. */
export const normalizeBundleIdentity = async ({
  javascriptPath,
  projectRoot,
  sourcesResolveFrom
}: {
  javascriptPath: string;
  projectRoot: string;
  /** Bun's output directory, which its path comments and map `sources` are relative to. */
  sourcesResolveFrom: string;
}) => {
  const code = await readFile(javascriptPath, 'utf8');
  const rewritten = rewritePathComments(code, sourcesResolveFrom, projectRoot);
  if (rewritten !== code) await writeFile(javascriptPath, rewritten);
  await rebaseMapSourcesToProject({ javascriptPath, projectRoot, resolveFrom: sourcesResolveFrom });
  await stampDebugId(javascriptPath);
};
