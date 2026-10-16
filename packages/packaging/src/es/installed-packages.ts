/* eslint-disable no-await-in-loop -- Package lookup and graph materialization follow dependency order. */
/**
 * Reads packages the way Node.js finds them on disk, whichever package manager installed them, and copies them into an
 * artifact in the same layout.
 *
 * npm, Yarn's node-modules linker, pnpm and Bun all leave a `node_modules/<name>` entry that Node.js resolves by walking
 * up from the importing package. pnpm and Bun's isolated layout make that entry a link into a store, so every package
 * is identified by its real directory. An artifact gets each package's real directory once, at the same path relative
 * to the project, and the `node_modules` entries and links that lead to it. Every package therefore resolves exactly
 * what it resolved on the build machine, and Node.js, which identifies modules by real path, loads each one once.
 */
import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { copy, ensureDir, pathExists, readJson } from 'fs-extra';
import { lstat, open, readdir, readFile, realpath, stat, symlink } from 'node:fs/promises';

export type PackageManifest = {
  name?: string | undefined;
  version?: string | undefined;
  dependencies?: Record<string, string> | undefined;
  optionalDependencies?: Record<string, string> | undefined;
  peerDependencies?: Record<string, string> | undefined;
  peerDependenciesMeta?: Record<string, unknown> | undefined;
  scripts?: Record<string, string> | undefined;
  os?: string[] | undefined;
  cpu?: string[] | undefined;
  libc?: string[] | undefined;
  gypfile?: boolean | undefined;
  binary?: { module_path?: string | undefined } | undefined;
};

/** An installed package and the installed packages it uses at run time. */
export type InstalledPackage = {
  name: string;
  version: string;
  /** The real directory of the package. */
  root: string;
  /** The packages it depends on: the name it requires each by, and that package's real directory. */
  dependencies: Map<string, string>;
  /** The files to copy; the whole package (except what `isLeftOut` names) when not set. */
  files?: Set<string> | undefined;
};

export const isInside = (parent: string, child: string) => {
  const relativePath = relative(parent, child);
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.includes(`..${sep}`));
};

const manifests = new Map<string, Promise<PackageManifest>>();

/** The package's `package.json`, read once per process. */
export const readPackageManifest = (packageRoot: string): Promise<PackageManifest> => {
  let manifest = manifests.get(packageRoot);
  if (!manifest) {
    manifest = readJson(join(packageRoot, 'package.json')) as Promise<PackageManifest>;
    manifests.set(packageRoot, manifest);
  }
  return manifest;
};

/** Dependencies, optional dependencies and peers: everything a package may load at run time. */
export const getRuntimeDependencyNames = (manifest: PackageManifest) =>
  new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {})
  ]);

/** Whether a package is a build for one platform, as napi-rs and esbuild publish their binaries. */
export const declaresPlatform = (manifest: PackageManifest) =>
  Boolean(manifest.os?.length || manifest.cpu?.length || manifest.libc?.length);

/** Whether `manifest` lets its package run without `name`: an optional dependency, or an optional peer. */
const isOptionalDependency = (manifest: PackageManifest, name: string) => {
  if (Object.hasOwn(manifest.optionalDependencies ?? {}, name)) return true;
  if (Object.hasOwn(manifest.dependencies ?? {}, name)) return false;
  const meta = manifest.peerDependenciesMeta?.[name];
  return typeof meta === 'object' && meta !== null && (meta as { optional?: unknown }).optional === true;
};

const SCRIPT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

/** The package's scripts, outside its own `node_modules`. */
const listScripts = async (directory: string): Promise<string[]> => {
  const entries: Dirent[] = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const scripts = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listScripts(path);
      return entry.isFile() && SCRIPT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    })
  );
  return scripts.flat();
};

const mentions = new Map<string, Promise<boolean>>();

/**
 * Whether the package's code names `name` as a module: `'name'` or `'name/...'`, in any quotes, in one of its scripts.
 * Code that loads a package names it, also where a bundler cannot follow the `require`: Sequelize passes `'sqlite3'`
 * to a `require(moduleName)`.
 */
const namesModule = (packageRoot: string, name: string): Promise<boolean> => {
  const key = `${packageRoot}\0${name}`;
  let result = mentions.get(key);
  if (!result) {
    result = (async () => {
      const needles = ['"', "'", '`'].flatMap((quote) => [
        Buffer.from(`${quote}${name}${quote}`),
        Buffer.from(`${quote}${name}/`)
      ]);
      const scripts = await listScripts(packageRoot);
      // Read a batch at a time: in parallel, but without opening thousands of files at once.
      for (let start = 0; start < scripts.length; start += 64) {
        const contents = await Promise.all(
          scripts.slice(start, start + 64).map((path) => readFile(path).catch(() => Buffer.alloc(0)))
        );
        if (contents.some((script) => needles.some((needle) => script.includes(needle)))) return true;
      }
      return false;
    })();
    mentions.set(key, result);
  }
  return result;
};

/**
 * Whether the package at `packageRoot` can load its installed dependency `name`. A dependency or peer it requires can.
 * An optional one can when it is a build for one platform, which the package loads by a name it puts together for
 * the machine it runs on, or when the package's code names it. Nothing loads an optional one that no code names:
 * Prisma lists TypeScript as an optional peer, and none of `@prisma/client`'s code requires it.
 */
export const mayLoadDependency = async ({
  packageRoot,
  manifest,
  name,
  dependencyManifest
}: {
  packageRoot: string;
  manifest: PackageManifest;
  name: string;
  dependencyManifest: PackageManifest;
}) => !isOptionalDependency(manifest, name) || declaresPlatform(dependencyManifest) || namesModule(packageRoot, name);

/**
 * The real directory Node.js would load `name` from when a module in `fromDirectory` requires it: the nearest
 * `node_modules/<name>` on the way up. The search does not climb past `stopAt`.
 */
export const findInstalledPackage = async ({
  name,
  fromDirectory,
  stopAt
}: {
  name: string;
  fromDirectory: string;
  stopAt?: string | undefined;
}): Promise<string | undefined> => {
  let directory = fromDirectory;
  while (true) {
    const candidate = join(directory, 'node_modules', ...name.split('/'));
    if (await pathExists(join(candidate, 'package.json'))) return realpath(candidate);
    const parent = dirname(directory);
    if (parent === directory || (stopAt && !isInside(stopAt, parent))) return undefined;
    directory = parent;
  }
};

/**
 * Adds the packages `start` loads at run time to `packages`, following each package's dependencies from where it is
 * installed. A dependency that is not installed is skipped: optional dependencies and peers often are not, and a
 * missing required one already fails where it is imported. An installed optional one is followed only when the package
 * may load it (`mayLoadDependency`). `accept` can leave out installed dependencies by the name they are required
 * under or by their manifest, such as excluded packages and the binaries of other platforms.
 */
export const addRuntimeDependencies = async ({
  packages,
  start,
  accept = () => true,
  stopAt
}: {
  packages: Map<string, InstalledPackage>;
  start: string[];
  accept?: ((name: string, manifest: PackageManifest) => boolean) | undefined;
  stopAt?: ((root: string) => string | undefined) | undefined;
}) => {
  const pending = [...start];
  while (pending.length > 0) {
    const root = pending.pop()!;
    if (packages.has(root)) continue;
    const manifest = await readPackageManifest(root);
    const installedPackage: InstalledPackage = {
      name: manifest.name ?? '',
      version: manifest.version ?? '',
      root,
      dependencies: new Map()
    };
    packages.set(root, installedPackage);
    for (const name of getRuntimeDependencyNames(manifest)) {
      const dependencyRoot = await findInstalledPackage({ name, fromDirectory: root, stopAt: stopAt?.(root) });
      if (!dependencyRoot) continue;
      const dependencyManifest = await readPackageManifest(dependencyRoot);
      if (!accept(name, dependencyManifest)) continue;
      if (!(await mayLoadDependency({ packageRoot: root, manifest, name, dependencyManifest }))) continue;
      installedPackage.dependencies.set(name, dependencyRoot);
      pending.push(dependencyRoot);
    }
  }
};

/** Code that can name its source map: the map's own name without `.map` ends in one of these. */
const MAPPED_CODE = /\.(?:[cm]?js|css|d\.[cm]?ts)$/;
/** How much of the end of a code file is searched for its `sourceMappingURL` comment, which bundlers write last. */
const MAP_COMMENT_SEARCH_BYTES = 4096;

/**
 * The URL a code file's source-map comment names, when that comment is the whole of its last non-empty line:
 * `//# sourceMappingURL=<url>` or `/*# sourceMappingURL=<url> *\/`, the older `@` in place of `#`, and in CSS only the
 * block form. The same text anywhere else, such as in a string the package's code reads, names no map. `tail` is the
 * end of the file, or all of it when `isWholeFile`.
 */
const getTrailingSourceMapUrl = ({
  tail,
  isWholeFile,
  isCss
}: {
  tail: string;
  isWholeFile: boolean;
  isCss: boolean;
}) => {
  const lines = tail.trimEnd().split(/\r\n|\n|\r|\u2028|\u2029/);
  // A tail without a line break may start inside the last line, which then is not known.
  if (lines.length === 1 && !isWholeFile) return undefined;
  const lastLine = lines.at(-1)!.trim();
  const match =
    /^\/\*[#@]\s*sourceMappingURL=(\S+?)\s*\*\/$/.exec(lastLine) ??
    (isCss ? null : /^\/\/[#@]\s*sourceMappingURL=(\S+)$/.exec(lastLine));
  return match?.[1];
};

/**
 * Whether `path` is a source map an installed package ships beside its code: a `.map` file whose sibling without the
 * suffix, such as `index.js` for `index.js.map`, ends with a `sourceMappingURL` comment naming it
 * (`getTrailingSourceMapUrl`). Node.js reads such a map only under `--enable-source-maps`, to rewrite a stack trace;
 * the maps of installed packages are often larger than their code. Any other `.map` file may be data the package reads,
 * and is kept.
 */
const isInstalledSourceMap = async (path: string) => {
  if (!path.endsWith('.map')) return false;
  const codePath = path.slice(0, -'.map'.length);
  if (!MAPPED_CODE.test(codePath)) return false;
  let url: string | undefined;
  try {
    const file = await open(codePath, 'r');
    try {
      const { size } = await file.stat();
      const length = Math.min(size, MAP_COMMENT_SEARCH_BYTES);
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, size - length);
      url = getTrailingSourceMapUrl({
        tail: buffer.toString('utf8'),
        isWholeFile: length === size,
        isCss: codePath.endsWith('.css')
      });
    } finally {
      await file.close();
    }
  } catch {
    return false;
  }
  if (!url || /^[a-z][\w+.-]*:/i.test(url)) return false;
  try {
    return resolve(dirname(codePath), decodeURIComponent(url.split(/[?#]/)[0]!)) === resolve(path);
  } catch {
    return false;
  }
};

/**
 * Which of a package's files an artifact gets. `withoutSourceMaps` leaves out its source maps
 * (`isInstalledSourceMap`), for an artifact whose functions do not run with `--enable-source-maps`.
 */
export type PackageFileSelection = { withoutSourceMaps?: boolean | undefined };

const isSelected = async (path: string, { withoutSourceMaps }: PackageFileSelection) =>
  !(withoutSourceMaps && (await isInstalledSourceMap(path)));

/**
 * Whether a path in a package, relative to the package's directory, stays out of every copy: the package's own
 * `node_modules`, whose packages the layout places separately, and `.yarn`, Yarn's release and install state, which
 * some packages publish by mistake and nothing loads (pdfkit 0.20 ships 3.7 MB of it).
 */
const isLeftOut = (relativePath: string) => {
  const segments = relativePath.split(sep);
  return segments[0] === '.yarn' || segments.includes('node_modules');
};

/**
 * The files a package is copied with, in a stable order: everything except what `isLeftOut` names and the files
 * `selection` leaves out, with linked directories followed, so a directory reached through two names is listed under
 * both, as copying writes it. A link back to a directory being listed is skipped; copying it would never end.
 */
const listPackageFiles = async (packageRoot: string, selection: PackageFileSelection): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (directory: string, enclosing: Set<string>) => {
    const realDirectory = await realpath(directory);
    if (enclosing.has(realDirectory)) return;
    const withThis = new Set(enclosing).add(realDirectory);
    const entries: Dirent[] = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.toSorted((left, right) => (left.name < right.name ? -1 : 1))) {
      const path = join(directory, entry.name);
      const isDirectory = entry.isSymbolicLink() ? (await stat(path)).isDirectory() : entry.isDirectory();
      if (!isDirectory) {
        if (await isSelected(path, selection)) files.push(path);
      } else if (!isLeftOut(relative(packageRoot, path))) await visit(path, withThis);
    }
  };
  await visit(packageRoot, new Set());
  return files;
};

const fingerprints = new Map<string, { signature: string; fingerprint: string }>();

/**
 * A hash of what copying the package with `selection` puts into an artifact: each file's path, bytes and, where the
 * host records it, whether it is executable. A package edited or rebuilt in place keeps its version but changes this.
 * File names, sizes and modification times decide whether a hash computed earlier in this process still holds, so a
 * watched rebuild sees edits.
 */
export const getPackageFingerprint = async (
  packageRoot: string,
  selection: PackageFileSelection = {}
): Promise<string> => {
  const files = await listPackageFiles(packageRoot, selection);
  const stats = await Promise.all(files.map((path) => stat(path)));
  const signature = files
    .map(
      (path, index) =>
        `${relative(packageRoot, path)}:${stats[index]!.size}:${stats[index]!.mtimeMs}:${stats[index]!.mode}`
    )
    .join('\n');
  const cacheKey = `${packageRoot}\0${Boolean(selection.withoutSourceMaps)}`;
  const cached = fingerprints.get(cacheKey);
  if (cached?.signature === signature) return cached.fingerprint;

  const records: string[] = [];
  // Files are hashed a batch at a time: in parallel, but without opening thousands of files at once.
  for (let start = 0; start < files.length; start += 64) {
    const batch = files.slice(start, start + 64).map(async (path, index) => {
      // Windows records no execute bit; the Lambda archive decides executability there from the file's header.
      const executable = process.platform !== 'win32' && (stats[start + index]!.mode & 0o111) !== 0;
      const contentHash = createHash('sha256')
        .update(await readFile(path))
        .digest('hex');
      return `${relative(packageRoot, path).replaceAll(sep, '/')}\0${executable}\0${contentHash}`;
    });
    records.push(...(await Promise.all(batch)));
  }
  const fingerprint = createHash('sha256').update(records.join('\n')).digest('hex');
  fingerprints.set(cacheKey, { signature, fingerprint });
  return fingerprint;
};

/** Where a package's files come from when they are not its installed directory, and packages it gets beside them. */
export type PackageSource = {
  /** The directory to copy the package's files from, such as a Lambda build image installation. */
  copyFrom: string;
  /** Packages to put in the package's own `node_modules`, by name, such as the Lambda build of a napi-rs addon. */
  nestedPackages: Map<string, string>;
};

/**
 * What an artifact's `node_modules` holds, relative to the artifact's root: package directories and the links that lead
 * to them. Paths use `/`, so the layout of the same installation is the same on every machine.
 */
export type PackageLayout = {
  directories: { path: string; root: string }[];
  links: { path: string; target: string }[];
};

const toLayoutPath = (path: string) => path.split(sep).join('/');

/**
 * The project directory whose layout the artifact repeats: the deepest directory that holds every package's
 * outermost `node_modules`.
 */
const findMirrorRoot = (roots: string[]) => {
  const bases = roots.map((root) => {
    const segments = root.split(sep);
    const nodeModulesIndex = segments.indexOf('node_modules');
    return nodeModulesIndex === -1 ? dirname(root) : segments.slice(0, nodeModulesIndex).join(sep) || sep;
  });
  let mirrorRoot = bases[0]!;
  while (!bases.every((base) => isInside(mirrorRoot, base))) mirrorRoot = dirname(mirrorRoot);
  return mirrorRoot;
};

/** Where a link leads, or `undefined` for a broken link, which no package can load through. */
const realpathOfLink = (linkPath: string) =>
  realpath(linkPath).then(
    (target) => target,
    () => undefined
  );

/** The `node_modules` directories Node.js searches from `directory` up to `mirrorRoot`, nearest first. */
const getSearchedDirectories = (directory: string, mirrorRoot: string) => {
  const searched: string[] = [];
  for (let current = directory; isInside(mirrorRoot, current); current = dirname(current)) {
    if (basename(current) !== 'node_modules') searched.push(join(current, 'node_modules'));
    if (current === mirrorRoot) break;
  }
  return searched;
};

/** The entries of a `node_modules` directory, with scoped packages as `@scope/name`; none when it does not exist. */
const listNodeModulesEntries = async (nodeModulesDirectory: string): Promise<string[]> => {
  if (!(await pathExists(nodeModulesDirectory))) return [];
  const entries: string[] = [];
  for (const name of await readdir(nodeModulesDirectory)) {
    if (name.startsWith('@') && (await stat(join(nodeModulesDirectory, name))).isDirectory()) {
      for (const scopedName of await readdir(join(nodeModulesDirectory, name))) entries.push(`${name}/${scopedName}`);
    } else {
      entries.push(name);
    }
  }
  return entries;
};

/** Where the installed layout is repeated inside an artifact's `node_modules`. */
const INSTALLED_LAYOUT_PATH = 'node_modules/.installed';

/**
 * The layout that gives every package in `packages` the resolution it has here, and the artifact's own code the
 * packages it resolved when it was bundled.
 *
 * The installed layout is repeated under `node_modules/.installed`: each package's directory at its path relative to
 * the project, each link in a `node_modules` directory a package searches when it leads to a copied package, and each
 * `.bin` command that runs a copied file. The artifact's top-level `node_modules` holds a link for each package its
 * code requires, to the installation it resolved, even where the project's root has another version of that name (as
 * a workspace package with its own dependencies does), and the project root's commands.
 */
export const planPackageLayout = async ({
  packages,
  topLevelPackages
}: {
  packages: Map<string, InstalledPackage>;
  /** What the artifact's own code requires: the name it uses and the package's real directory. */
  topLevelPackages: Map<string, string>;
}): Promise<PackageLayout> => {
  const roots = [...packages.keys()];
  if (roots.length === 0) return { directories: [], links: [] };
  const mirrorRoot = findMirrorRoot(roots);
  const projectNodeModules = join(mirrorRoot, 'node_modules');
  const layoutPath = (path: string) => `${INSTALLED_LAYOUT_PATH}/${toLayoutPath(relative(mirrorRoot, path))}`;
  /**
   * Whether copying puts this file into the artifact: it is in a package and not left out of it (`isLeftOut`), and
   * among the package's files when only some of them are copied.
   */
  const isCopiedFile = (realPath: string) =>
    [...packages.values()].some(
      ({ root, files }) =>
        isInside(root, realPath) && !isLeftOut(relative(root, realPath)) && (!files || files.has(realPath))
    );

  const directories = roots.map((root) => ({ path: layoutPath(root), root }));
  const links = new Map<string, string>();
  const searched = new Set(roots.flatMap((root) => getSearchedDirectories(root, mirrorRoot)));
  for (const nodeModulesDirectory of searched) {
    for (const name of await listNodeModulesEntries(nodeModulesDirectory)) {
      const entryPath = join(nodeModulesDirectory, name);
      if (!(await lstat(entryPath)).isSymbolicLink()) continue;
      const target = await realpathOfLink(entryPath);
      if (target && packages.has(target)) links.set(layoutPath(entryPath), layoutPath(target));
    }
    if (process.platform === 'win32') continue;
    // npm, Yarn and Bun link commands; pnpm and Windows write wrapper scripts with the build machine's paths, which
    // are left out. A command is kept when it links to a file that is copied.
    for (const command of await listNodeModulesEntries(join(nodeModulesDirectory, '.bin'))) {
      const commandPath = join(nodeModulesDirectory, '.bin', command);
      if (!(await lstat(commandPath)).isSymbolicLink()) continue;
      const target = await realpathOfLink(commandPath);
      if (!target || !isCopiedFile(target)) continue;
      links.set(layoutPath(commandPath), layoutPath(target));
      if (nodeModulesDirectory === projectNodeModules) links.set(`node_modules/.bin/${command}`, layoutPath(target));
    }
  }
  for (const [name, root] of topLevelPackages) links.set(`node_modules/${name}`, layoutPath(root));

  return {
    directories: directories.toSorted((left, right) => (left.path < right.path ? -1 : 1)),
    links: [...links]
      .map(([path, target]) => ({ path, target }))
      .toSorted((left, right) => (left.path < right.path ? -1 : 1))
  };
};

const depthOf = (layoutPath: string) => layoutPath.split('/').length;

/** Whether anything, a broken link included, is at `path`. */
const hasEntry = (path: string) =>
  lstat(path).then(
    () => true,
    () => false
  );

/**
 * Writes a layout under `artifactRoot`. A link is written relative to its directory; on Windows a directory link is a
 * junction, which needs no extra privileges and which the Lambda archive stores as a relative link. Windows cannot
 * write a file link without extra privileges either, so a Windows-built artifact has no `.bin` commands.
 */
export const writePackageLayout = async ({
  layout,
  packages,
  artifactRoot,
  sources = new Map(),
  selection = {}
}: {
  layout: PackageLayout;
  packages: Map<string, InstalledPackage>;
  artifactRoot: string;
  /** Packages whose files come from somewhere other than their installed directory, by real directory. */
  sources?: Map<string, PackageSource> | undefined;
  /** Files of every package the artifact leaves out. */
  selection?: PackageFileSelection | undefined;
}) => {
  const copyDirectory = async ({ path, root }: PackageLayout['directories'][number]) => {
    const destination = join(artifactRoot, path);
    const { files } = packages.get(root)!;
    const source = sources.get(root);
    if (files && !source) {
      await Promise.all(
        [...files].map(async (sourcePath) => {
          if (!(await isSelected(sourcePath, selection))) return;
          const destinationPath = join(destination, relative(root, sourcePath));
          await ensureDir(dirname(destinationPath));
          await copy(sourcePath, destinationPath, { dereference: true, overwrite: true });
        })
      );
    } else {
      const from = source?.copyFrom ?? root;
      await copy(from, destination, {
        dereference: true,
        overwrite: true,
        filter: async (sourcePath) =>
          !isLeftOut(relative(from, sourcePath)) && (await isSelected(sourcePath, selection))
      });
    }
    for (const [name, nestedRoot] of source?.nestedPackages ?? []) {
      await copy(nestedRoot, join(destination, 'node_modules', name), {
        dereference: true,
        overwrite: true,
        filter: (sourcePath) => isSelected(sourcePath, selection)
      });
    }
  };
  // A nested package is copied after the package it sits in, so two copies never create the same directory.
  const depths = [...new Set(layout.directories.map(({ path }) => depthOf(path)))].toSorted(
    (left, right) => left - right
  );
  for (const depth of depths) {
    await Promise.all(layout.directories.filter(({ path }) => depthOf(path) === depth).map(copyDirectory));
  }

  for (const { path, target } of layout.links) {
    const linkPath = join(artifactRoot, path);
    const targetPath = join(artifactRoot, target);
    // An earlier write to the same artifact, such as a framework's traced files, may already have put an entry here.
    if (await hasEntry(linkPath)) continue;
    await ensureDir(dirname(linkPath));
    const isDirectory = (await stat(targetPath)).isDirectory();
    if (process.platform === 'win32' && !isDirectory) continue;
    await (process.platform === 'win32'
      ? symlink(targetPath, linkPath, 'junction')
      : symlink(relative(dirname(linkPath), targetPath), linkPath, isDirectory ? 'dir' : 'file'));
  }
};
