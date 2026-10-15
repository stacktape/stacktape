/* eslint-disable no-await-in-loop -- Package lookup and graph materialization follow dependency order. */
/**
 * Reads packages the way Node.js finds them on disk, whichever package manager installed them.
 *
 * npm, Yarn's node-modules linker, pnpm and Bun all leave a `node_modules/<name>` entry that Node.js resolves by walking
 * up from the importing package. pnpm and Bun's isolated layout make that entry a link into a store, so every package
 * is identified by its real directory. Copying a package graph writes plain directories, so no link into a store ever
 * reaches an artifact.
 */
import { dirname, join, relative, sep } from 'node:path';
import { copy, ensureDir, pathExists, readJson } from 'fs-extra';
import { realpath } from 'node:fs/promises';

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
  /** Real directories of the packages it depends on. */
  dependencies: Set<string>;
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
 * missing required one already fails where it is imported. `accept` can leave out installed packages, such as the
 * binaries of other platforms. `replace` swaps a package for another installation of it, and its dependencies are then
 * read from there.
 */
export const addRuntimeDependencies = async ({
  packages,
  start,
  accept = () => true,
  replace = (root) => root,
  stopAt
}: {
  packages: Map<string, InstalledPackage>;
  start: string[];
  accept?: ((manifest: PackageManifest) => boolean) | undefined;
  replace?: ((root: string) => string) | undefined;
  stopAt?: ((root: string) => string | undefined) | undefined;
}) => {
  const pending = start.map(replace);
  while (pending.length > 0) {
    const root = pending.pop()!;
    if (packages.has(root)) continue;
    const manifest = await readPackageManifest(root);
    const installedPackage: InstalledPackage = {
      name: manifest.name ?? '',
      version: manifest.version ?? '',
      root,
      dependencies: new Set()
    };
    packages.set(root, installedPackage);
    for (const name of getRuntimeDependencyNames(manifest)) {
      const dependencyRoot = await findInstalledPackage({ name, fromDirectory: root, stopAt: stopAt?.(root) });
      if (!dependencyRoot || !accept(await readPackageManifest(dependencyRoot))) continue;
      const replacedRoot = replace(dependencyRoot);
      installedPackage.dependencies.add(replacedRoot);
      pending.push(replacedRoot);
    }
  }
};

/**
 * Writes a package graph as a `node_modules` directory. One version of each package name sits at the top; that is the
 * version a top-level package uses when there is one. Any other version is copied under the package that depends on
 * it, as npm would install it.
 */
export const copyPackageGraph = async ({
  packages,
  topLevelPackages,
  nodeModulesPath
}: {
  packages: Map<string, InstalledPackage>;
  /** Packages the artifact's own code loads; they decide which version of a name sits at the top. */
  topLevelPackages: Set<string>;
  nodeModulesPath: string;
}) => {
  const hoisted = new Map<string, InstalledPackage>();
  const byPreference = [...packages.values()].toSorted(
    (left, right) => Number(topLevelPackages.has(right.root)) - Number(topLevelPackages.has(left.root))
  );
  for (const installedPackage of byPreference) {
    if (!hoisted.has(installedPackage.name)) hoisted.set(installedPackage.name, installedPackage);
  }

  const copied = new Set<string>();
  const copyPackage = async (installedPackage: InstalledPackage, destination: string): Promise<void> => {
    if (copied.has(destination)) return;
    copied.add(destination);
    if (installedPackage.files) {
      await Promise.all(
        [...installedPackage.files].map(async (sourcePath) => {
          const destinationPath = join(destination, relative(installedPackage.root, sourcePath));
          await ensureDir(dirname(destinationPath));
          await copy(sourcePath, destinationPath, { dereference: true, overwrite: true });
        })
      );
    } else {
      await copy(installedPackage.root, destination, {
        dereference: true,
        overwrite: true,
        filter: (sourcePath) => !relative(installedPackage.root, sourcePath).split(sep).includes('node_modules')
      });
    }
    for (const dependencyRoot of installedPackage.dependencies) {
      const dependency = packages.get(dependencyRoot);
      const topLevel = dependency && hoisted.get(dependency.name);
      if (!dependency || !topLevel || topLevel.version === dependency.version) continue;
      await copyPackage(dependency, join(destination, 'node_modules', dependency.name));
    }
  };

  for (const [name, installedPackage] of hoisted) {
    await copyPackage(installedPackage, join(nodeModulesPath, name));
  }
};
