/* eslint-disable no-await-in-loop -- Package lookup and graph materialization follow dependency order and stay intentionally bounded. */
import { nodeFileTrace } from '@vercel/nft';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { copy, ensureDir, pathExists, readJson } from 'fs-extra';
import { realpath, stat } from 'node:fs/promises';

type TracedPackage = {
  dependencies: Set<string>;
  files: Set<string>;
  includeEntirePackage: boolean;
  name: string;
  root: string;
};

type PackageManifest = {
  dependencies?: Record<string, string> | undefined;
  name?: string | undefined;
  optionalDependencies?: Record<string, string> | undefined;
  peerDependencies?: Record<string, string> | undefined;
  version?: string | undefined;
};

const isInside = (parent: string, child: string) => {
  const relativePath = relative(parent, child);
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.includes(`..${sep}`));
};

const findPackageRoot = async ({
  filePath,
  traceBasePath,
  requirePackageName = true
}: {
  filePath: string;
  traceBasePath: string;
  requirePackageName?: boolean | undefined;
}) => {
  let candidate = dirname(filePath);
  while (isInside(traceBasePath, candidate)) {
    const manifestPath = join(candidate, 'package.json');
    if (await pathExists(manifestPath)) {
      if (!requirePackageName) return candidate;
      const manifest: unknown = await readJson(manifestPath);
      if (
        typeof manifest === 'object' &&
        manifest !== null &&
        'name' in manifest &&
        typeof manifest.name === 'string' &&
        manifest.name.length > 0
      ) {
        return candidate;
      }
    }
    const parent = dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
  return undefined;
};

const readPackageName = async (packageRoot: string): Promise<string> => {
  const manifest: unknown = await readJson(join(packageRoot, 'package.json'));
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('name' in manifest) ||
    typeof manifest.name !== 'string' ||
    manifest.name.length === 0
  ) {
    throw new Error(`Traced Node.js package at ${packageRoot} does not have a valid name.`);
  }
  return manifest.name;
};

const readPackageManifest = async (packageRoot: string): Promise<PackageManifest> =>
  readJson(join(packageRoot, 'package.json')) as Promise<PackageManifest>;

const canonicalizeExistingPath = async (path: string) => realpath(resolve(path));

const getRuntimeDependencyNames = (manifest: PackageManifest) =>
  new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {})
  ]);

const findInstalledPackageRoot = async ({
  dependencyName,
  fromPackageRoot,
  traceBasePath
}: {
  dependencyName: string;
  fromPackageRoot: string;
  traceBasePath: string;
}) => {
  let candidateRoot = fromPackageRoot;
  while (isInside(traceBasePath, candidateRoot)) {
    const logicalPackagePath = join(candidateRoot, 'node_modules', ...dependencyName.split('/'));
    if (await pathExists(join(logicalPackagePath, 'package.json'))) {
      const realPackagePath = await realpath(logicalPackagePath);
      return findPackageRoot({
        filePath: join(realPackagePath, 'package.json'),
        traceBasePath
      });
    }
    const parent = dirname(candidateRoot);
    if (parent === candidateRoot) break;
    candidateRoot = parent;
  }
  return undefined;
};

/** Resolve an installed transitive package from the same package graph the framework build used. */
export const resolveInstalledNodePackage = async ({
  applicationRoot,
  packageName,
  resolveFromPackage,
  traceBasePath
}: {
  applicationRoot: string;
  packageName: string;
  resolveFromPackage?: string | undefined;
  traceBasePath: string;
}) => {
  const absoluteTraceBasePath = await canonicalizeExistingPath(traceBasePath);
  let fromPackageRoot = await canonicalizeExistingPath(applicationRoot);
  if (resolveFromPackage) {
    const resolvedParent = await findInstalledPackageRoot({
      dependencyName: resolveFromPackage,
      fromPackageRoot,
      traceBasePath: absoluteTraceBasePath
    });
    if (!resolvedParent) return undefined;
    fromPackageRoot = resolvedParent;
  }
  const packageRoot = await findInstalledPackageRoot({
    dependencyName: packageName,
    fromPackageRoot,
    traceBasePath: absoluteTraceBasePath
  });
  if (!packageRoot) return undefined;
  const manifest = await readPackageManifest(packageRoot);
  if (!manifest.version) return undefined;
  return { name: packageName, path: packageRoot, version: manifest.version };
};

/**
 * Copies only the Node.js packages and package files reachable from a framework server entrypoint. The package graph
 * is materialized as ordinary directories, so pnpm/Yarn symlinks never enter the Lambda ZIP. A single traced version
 * is hoisted; conflicting versions stay below the package that actually imports them.
 */
export const copyTracedNodeRuntimeFiles = async ({
  bundledApplicationPackages = [],
  entrypointPath,
  serverFunctionPath,
  traceBasePath,
  processCwd
}: {
  /** Declared framework packages proven to be bundled into this framework's server output. */
  bundledApplicationPackages?: string[] | undefined;
  entrypointPath: string;
  serverFunctionPath: string;
  traceBasePath: string;
  processCwd: string;
}) => {
  const absoluteTraceBasePath = await canonicalizeExistingPath(traceBasePath);
  const absoluteEntrypointPath = await canonicalizeExistingPath(entrypointPath);
  const applicationManifestRoot = await canonicalizeExistingPath(processCwd);
  const applicationPackageRoot = await findPackageRoot({
    filePath: absoluteEntrypointPath,
    traceBasePath: absoluteTraceBasePath,
    requirePackageName: false
  });
  const trace = await nodeFileTrace([absoluteEntrypointPath], {
    base: absoluteTraceBasePath,
    processCwd: applicationManifestRoot,
    conditions: ['node', 'production'],
    mixedModules: true
  });
  const tracedPaths = new Set([...trace.fileList, ...trace.esmFileList]);
  const packages = new Map<string, TracedPackage>();
  const packageRootByTracePath = new Map<string, string>();
  const rootDependencies = new Set<string>();

  for (const tracedPath of tracedPaths) {
    const sourcePath = join(absoluteTraceBasePath, tracedPath);
    if (!(await pathExists(sourcePath))) continue;
    const realSourcePath = await realpath(sourcePath);
    const packageRoot = await findPackageRoot({
      filePath: realSourcePath,
      traceBasePath: absoluteTraceBasePath
    });
    if (!packageRoot || packageRoot === applicationPackageRoot) continue;

    packageRootByTracePath.set(tracedPath, packageRoot);
    let tracedPackage = packages.get(packageRoot);
    if (!tracedPackage) {
      tracedPackage = {
        dependencies: new Set(),
        files: new Set(),
        includeEntirePackage: false,
        name: await readPackageName(packageRoot),
        root: packageRoot
      };
      packages.set(packageRoot, tracedPackage);
    }
    if ((await stat(realSourcePath)).isDirectory()) continue;
    if (isInside(packageRoot, realSourcePath)) tracedPackage.files.add(realSourcePath);
  }

  // NFT cannot discover packages whose names are selected at runtime. Application production dependencies are an
  // explicit deployment contract, so include their complete runtime package graphs while continuing to trace
  // framework/build output. This keeps pnpm's store out of the ZIP without breaking plugin-style dynamic imports.
  const applicationManifestPath = join(applicationManifestRoot, 'package.json');
  if (await pathExists(applicationManifestPath)) {
    const applicationManifest = await readPackageManifest(applicationManifestRoot);
    const bundledApplicationPackageNames = new Set(bundledApplicationPackages);
    const pendingDependencies = [
      ...getRuntimeDependencyNames({
        dependencies: applicationManifest.dependencies,
        optionalDependencies: applicationManifest.optionalDependencies
      })
    ]
      .filter((name) => !bundledApplicationPackageNames.has(name))
      .map((name) => ({
        fromPackageRoot: applicationManifestRoot,
        name,
        parentPackageRoot: undefined as string | undefined
      }));
    const visitedEdges = new Set<string>();

    while (pendingDependencies.length > 0) {
      const dependency = pendingDependencies.pop()!;
      const edgeIdentity = `${dependency.fromPackageRoot}\0${dependency.name}`;
      if (visitedEdges.has(edgeIdentity)) continue;
      visitedEdges.add(edgeIdentity);

      const packageRoot = await findInstalledPackageRoot({
        dependencyName: dependency.name,
        fromPackageRoot: dependency.fromPackageRoot,
        traceBasePath: absoluteTraceBasePath
      });
      // Missing optional/peer dependencies are valid. A missing required direct dependency will already fail the
      // framework build, and keeping this traversal tolerant also supports platform-specific package graphs.
      if (!packageRoot) continue;

      let runtimePackage = packages.get(packageRoot);
      const packageWasStaticallyTraced = runtimePackage !== undefined;
      if (!runtimePackage) {
        runtimePackage = {
          dependencies: new Set(),
          files: new Set(),
          includeEntirePackage: true,
          name: await readPackageName(packageRoot),
          root: packageRoot
        };
        packages.set(packageRoot, runtimePackage);
      }

      if (dependency.parentPackageRoot) {
        packages.get(dependency.parentPackageRoot)?.dependencies.add(packageRoot);
      } else {
        rootDependencies.add(packageRoot);
      }

      if (!packageWasStaticallyTraced) {
        const manifest = await readPackageManifest(packageRoot);
        for (const childName of getRuntimeDependencyNames(manifest)) {
          pendingDependencies.push({
            fromPackageRoot: packageRoot,
            name: childName,
            parentPackageRoot: packageRoot
          });
        }
      }
    }
  }

  for (const [tracedPath, reason] of trace.reasons) {
    const childRoot = packageRootByTracePath.get(tracedPath);
    if (!childRoot) continue;
    for (const parentPath of reason.parents) {
      const parentRoot = packageRootByTracePath.get(parentPath);
      if (parentRoot && parentRoot !== childRoot) {
        packages.get(parentRoot)?.dependencies.add(childRoot);
      } else if (!parentRoot) {
        rootDependencies.add(childRoot);
      }
    }
  }

  // If a tracer reason starts inside a package before crossing its boundary, it may not expose a direct root edge.
  // Every otherwise-unparented package is safe to hoist and remains substantially smaller than copying node_modules.
  const childPackageRoots = new Set<string>();
  for (const { dependencies } of packages.values()) {
    for (const dependency of dependencies) childPackageRoots.add(dependency);
  }
  for (const packageRoot of packages.keys()) {
    if (!childPackageRoots.has(packageRoot)) rootDependencies.add(packageRoot);
  }

  const packagesByName = new Map<string, TracedPackage[]>();
  for (const tracedPackage of packages.values()) {
    const namedPackages = packagesByName.get(tracedPackage.name) ?? [];
    namedPackages.push(tracedPackage);
    packagesByName.set(tracedPackage.name, namedPackages);
  }
  const hoistedPackageRootByName = new Map<string, string>();
  for (const [name, namedPackages] of packagesByName) {
    const rootPackage = namedPackages.find(({ root }) => rootDependencies.has(root));
    hoistedPackageRootByName.set(name, (rootPackage ?? namedPackages[0])!.root);
  }

  const materializedDestinations = new Set<string>();
  const materializePackage = async (tracedPackage: TracedPackage, destinationPath: string): Promise<void> => {
    const destinationIdentity = `${tracedPackage.root}\0${destinationPath}`;
    if (materializedDestinations.has(destinationIdentity)) return;
    materializedDestinations.add(destinationIdentity);

    if (tracedPackage.includeEntirePackage) {
      await copy(tracedPackage.root, destinationPath, {
        dereference: true,
        overwrite: true,
        filter: (sourcePath) => {
          const relativeSourcePath = relative(tracedPackage.root, sourcePath);
          return !relativeSourcePath.split(sep).includes('node_modules');
        }
      });
    } else {
      await Promise.all(
        [...tracedPackage.files].map(async (sourcePath) => {
          const destinationFilePath = join(destinationPath, relative(tracedPackage.root, sourcePath));
          await ensureDir(dirname(destinationFilePath));
          await copy(sourcePath, destinationFilePath, {
            dereference: true,
            overwrite: true
          });
        })
      );
    }

    for (const dependencyRoot of tracedPackage.dependencies) {
      const dependency = packages.get(dependencyRoot);
      if (!dependency || hoistedPackageRootByName.get(dependency.name) === dependency.root) continue;
      await materializePackage(dependency, join(destinationPath, 'node_modules', dependency.name));
    }
  };

  for (const [name, packageRoot] of hoistedPackageRootByName) {
    const tracedPackage = packages.get(packageRoot);
    if (tracedPackage) await materializePackage(tracedPackage, join(serverFunctionPath, 'node_modules', name));
  }

  return {
    packageCount: packages.size,
    tracedFileCount: [...packages.values()].reduce((count, tracedPackage) => count + tracedPackage.files.size, 0),
    warnings: [...trace.warnings]
  };
};
