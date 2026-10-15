/* eslint-disable no-await-in-loop -- Package lookup and graph materialization follow dependency order. */
/**
 * Reads packages the way Node.js finds them on disk, whichever package manager installed them.
 *
 * npm, Yarn's node-modules linker, pnpm and Bun all leave a `node_modules/<name>` entry that Node.js resolves by walking
 * up from the importing package. pnpm and Bun's isolated layout make that entry a link into a store, so every package
 * is identified by its real directory. Copying a package graph writes plain directories, so no link into a store ever
 * reaches an artifact.
 */
import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { copy, ensureDir, pathExists, readJson } from 'fs-extra';
import { readdir, readFile, realpath, stat, symlink } from 'node:fs/promises';

export type PackageManifest = {
  name?: string | undefined;
  version?: string | undefined;
  bin?: string | Record<string, string> | undefined;
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
  /** The files to copy; the whole package (without its own `node_modules`) when not set. */
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
 * missing required one already fails where it is imported. `accept` can leave out installed dependencies by the name
 * they are required under or by their manifest, such as excluded packages and the binaries of other platforms.
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
      if (!dependencyRoot || !accept(name, await readPackageManifest(dependencyRoot))) continue;
      installedPackage.dependencies.set(name, dependencyRoot);
      pending.push(dependencyRoot);
    }
  }
};

/** The files a package is copied with: everything except its own `node_modules`, in a stable order. */
const listPackageFiles = async (packageRoot: string): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (directory: string) => {
    const entries: Dirent[] = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.toSorted((left, right) => (left.name < right.name ? -1 : 1))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') await visit(path);
      } else {
        files.push(path);
      }
    }
  };
  await visit(packageRoot);
  return files;
};

const fingerprints = new Map<string, Promise<string>>();

/**
 * A hash of what copying the package puts into an artifact: each file's path, bytes and, where the host records it,
 * whether it is executable. A package edited or rebuilt in place keeps its version but changes this.
 */
export const getPackageFingerprint = (packageRoot: string): Promise<string> => {
  let fingerprint = fingerprints.get(packageRoot);
  if (!fingerprint) {
    fingerprint = (async () => {
      const files = await listPackageFiles(packageRoot);
      const records: string[] = [];
      // Files are hashed a batch at a time: in parallel, but without opening thousands of files at once.
      for (let start = 0; start < files.length; start += 64) {
        const batch = files.slice(start, start + 64).map(async (path) => {
          const [contents, { mode }] = await Promise.all([readFile(path), stat(path)]);
          // Windows records no execute bit; the Lambda archive decides executability there from the file's header.
          const executable = process.platform !== 'win32' && (mode & 0o111) !== 0;
          const contentHash = createHash('sha256').update(contents).digest('hex');
          return `${relative(packageRoot, path).replaceAll(sep, '/')}\0${executable}\0${contentHash}`;
        });
        records.push(...(await Promise.all(batch)));
      }
      return createHash('sha256').update(records.join('\n')).digest('hex');
    })();
    fingerprints.set(packageRoot, fingerprint);
  }
  return fingerprint;
};

/** The `node_modules` directories Node.js searches for a module required from `directory`, nearest first. */
const getSearchedDirectories = (directory: string, artifactRoot: string) => {
  const searched: string[] = [];
  for (let current = directory; isInside(artifactRoot, current); current = dirname(current)) {
    if (basename(current) !== 'node_modules') searched.push(join(current, 'node_modules'));
    if (current === artifactRoot) break;
  }
  return searched;
};

/** Links `node_modules/.bin/<command>` to each command of a package copied to `node_modules/<name>`, as npm does. */
const linkCommands = async (nodeModulesDirectory: string, name: string, manifest: PackageManifest) => {
  const commands = typeof manifest.bin === 'string' ? { [basename(name)]: manifest.bin } : (manifest.bin ?? {});
  for (const [command, target] of Object.entries(commands)) {
    const linkPath = join(nodeModulesDirectory, '.bin', command);
    if (!(await pathExists(join(nodeModulesDirectory, name, target))) || (await pathExists(linkPath))) continue;
    await ensureDir(dirname(linkPath));
    await symlink(join('..', name, target).replaceAll(sep, '/'), linkPath);
  }
};

/**
 * Writes a package graph as a `node_modules` directory in which every package loads exactly the installation it
 * loaded here. A dependency goes to the top-level `node_modules` when nothing there has its name yet, and under the
 * package that requires it when a different installation would be found first, as npm installs conflicting versions.
 * Installations are compared by real directory, so pnpm's copies of one version with different peers stay apart, and
 * each dependency keeps the name it is required by, so an npm alias still resolves.
 */
export const copyPackageGraph = async ({
  packages,
  topLevelPackages,
  nodeModulesPath
}: {
  packages: Map<string, InstalledPackage>;
  /** What the artifact's own code requires: the name it uses and the package's real directory. */
  topLevelPackages: Map<string, string>;
  nodeModulesPath: string;
}) => {
  const artifactRoot = dirname(nodeModulesPath);
  /** Which installation each `node_modules` directory of the artifact holds under each name. */
  const contents = new Map<string, Map<string, string>>();
  const placements: { root: string; nodeModulesDirectory: string; name: string }[] = [];
  const place = (nodeModulesDirectory: string, name: string, root: string) => {
    const names = contents.get(nodeModulesDirectory) ?? new Map<string, string>();
    names.set(name, root);
    contents.set(nodeModulesDirectory, names);
    placements.push({ root, nodeModulesDirectory, name });
    return join(nodeModulesDirectory, name);
  };
  const findPlaced = (directory: string, name: string) => {
    for (const searched of getSearchedDirectories(directory, artifactRoot)) {
      const root = contents.get(searched)?.get(name);
      if (root) return root;
    }
    return undefined;
  };

  // Breadth first, so packages nearer the code that requires them claim the top-level names.
  const pending = [...topLevelPackages].map(([name, root]) => ({
    root,
    directory: place(nodeModulesPath, name, root)
  }));
  while (pending.length > 0) {
    const { root, directory } = pending.shift()!;
    for (const [name, dependencyRoot] of packages.get(root)?.dependencies ?? []) {
      const found = findPlaced(directory, name);
      if (found === dependencyRoot) continue;
      const nodeModulesDirectory = found === undefined ? nodeModulesPath : join(directory, 'node_modules');
      pending.push({ root: dependencyRoot, directory: place(nodeModulesDirectory, name, dependencyRoot) });
    }
  }

  const copyPlacement = async ({ root, nodeModulesDirectory, name }: (typeof placements)[number]) => {
    const installedPackage = packages.get(root)!;
    const destination = join(nodeModulesDirectory, name);
    if (installedPackage.files) {
      await Promise.all(
        [...installedPackage.files].map(async (sourcePath) => {
          const destinationPath = join(destination, relative(root, sourcePath));
          await ensureDir(dirname(destinationPath));
          await copy(sourcePath, destinationPath, { dereference: true, overwrite: true });
        })
      );
      return;
    }
    await copy(root, destination, {
      dereference: true,
      overwrite: true,
      filter: (sourcePath) => !relative(root, sourcePath).split(sep).includes('node_modules')
    });
  };
  // A nested package is copied after the package it sits in, so two copies never create the same directory.
  const depthOf = ({ nodeModulesDirectory }: (typeof placements)[number]) =>
    relative(nodeModulesPath, nodeModulesDirectory)
      .split(sep)
      .filter((segment) => segment === 'node_modules').length;
  const depths = [...new Set(placements.map(depthOf))].toSorted((left, right) => left - right);
  for (const depth of depths) {
    await Promise.all(placements.filter((placement) => depthOf(placement) === depth).map(copyPlacement));
  }
  // Windows cannot create links without extra privileges, and a command copied from Windows has no execute bit.
  if (process.platform !== 'win32') {
    for (const { root, nodeModulesDirectory, name } of placements) {
      if (!packages.get(root)!.files) await linkCommands(nodeModulesDirectory, name, await readPackageManifest(root));
    }
  }
};
