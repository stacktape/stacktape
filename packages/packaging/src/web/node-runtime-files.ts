/* eslint-disable no-await-in-loop -- Package lookup follows dependency order and stays intentionally bounded. */
import { nodeFileTrace } from '@vercel/nft';
import { dirname, join, resolve } from 'node:path';
import { pathExists } from 'fs-extra';
import { realpath, stat } from 'node:fs/promises';
import {
  addRuntimeDependencies,
  copyPackageGraph,
  findInstalledPackage,
  getRuntimeDependencyNames,
  isInside,
  readPackageManifest,
  type InstalledPackage
} from '../es/installed-packages';

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
    if (await pathExists(join(candidate, 'package.json'))) {
      if (!requirePackageName) return candidate;
      const { name } = await readPackageManifest(candidate);
      if (typeof name === 'string' && name.length > 0) return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
  return undefined;
};

const canonicalizeExistingPath = async (path: string) => realpath(resolve(path));

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
  const stopAt = await canonicalizeExistingPath(traceBasePath);
  let fromDirectory = await canonicalizeExistingPath(applicationRoot);
  if (resolveFromPackage) {
    const resolvedParent = await findInstalledPackage({ name: resolveFromPackage, fromDirectory, stopAt });
    if (!resolvedParent) return undefined;
    fromDirectory = resolvedParent;
  }
  const packageRoot = await findInstalledPackage({ name: packageName, fromDirectory, stopAt });
  if (!packageRoot) return undefined;
  const { version } = await readPackageManifest(packageRoot);
  if (!version) return undefined;
  return { name: packageName, path: packageRoot, version };
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
  const packages = new Map<string, InstalledPackage>();
  const packageRootByTracePath = new Map<string, string>();
  const rootDependencies = new Set<string>();
  /** The application's own dependencies, under the names it requires them by. */
  const directDependencies = new Map<string, string>();

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
      const { name, version } = await readPackageManifest(packageRoot);
      tracedPackage = {
        name: name!,
        version: version ?? '',
        root: packageRoot,
        dependencies: new Map(),
        files: new Set()
      };
      packages.set(packageRoot, tracedPackage);
    }
    if ((await stat(realSourcePath)).isDirectory()) continue;
    if (isInside(packageRoot, realSourcePath)) tracedPackage.files?.add(realSourcePath);
  }

  // NFT cannot discover packages whose names are selected at runtime. Application production dependencies are an
  // explicit deployment contract, so include their complete runtime package graphs while continuing to trace
  // framework/build output. This keeps pnpm's store out of the ZIP without breaking plugin-style dynamic imports.
  if (await pathExists(join(applicationManifestRoot, 'package.json'))) {
    const applicationManifest = await readPackageManifest(applicationManifestRoot);
    const bundledApplicationPackageNames = new Set(bundledApplicationPackages);
    const directDependencyNames = [
      ...getRuntimeDependencyNames({
        dependencies: applicationManifest.dependencies,
        optionalDependencies: applicationManifest.optionalDependencies
      })
    ].filter((name) => !bundledApplicationPackageNames.has(name));
    for (const name of directDependencyNames) {
      // Missing optional/peer dependencies are valid. A missing required direct dependency will already fail the
      // framework build, and keeping this traversal tolerant also supports platform-specific package graphs.
      const packageRoot = await findInstalledPackage({
        name,
        fromDirectory: applicationManifestRoot,
        stopAt: absoluteTraceBasePath
      });
      if (packageRoot) directDependencies.set(name, packageRoot);
    }
    for (const packageRoot of directDependencies.values()) rootDependencies.add(packageRoot);
    // A package the trace already found keeps its traced files and is not expanded again.
    await addRuntimeDependencies({
      packages,
      start: [...directDependencies.values()],
      stopAt: () => absoluteTraceBasePath
    });
  }

  for (const [tracedPath, reason] of trace.reasons) {
    const childRoot = packageRootByTracePath.get(tracedPath);
    if (!childRoot) continue;
    for (const parentPath of reason.parents) {
      const parentRoot = packageRootByTracePath.get(parentPath);
      if (parentRoot && parentRoot !== childRoot) {
        packages.get(parentRoot)?.dependencies.set(packages.get(childRoot)!.name, childRoot);
      } else if (!parentRoot) {
        rootDependencies.add(childRoot);
      }
    }
  }

  // If a tracer reason starts inside a package before crossing its boundary, it may not expose a direct root edge.
  // Every otherwise-unparented package is safe to hoist and remains substantially smaller than copying node_modules.
  const childPackageRoots = new Set<string>();
  for (const { dependencies } of packages.values()) {
    for (const dependency of dependencies.values()) childPackageRoots.add(dependency);
  }
  for (const packageRoot of packages.keys()) {
    if (!childPackageRoots.has(packageRoot)) rootDependencies.add(packageRoot);
  }

  const topLevelPackages = new Map(directDependencies);
  for (const packageRoot of rootDependencies) {
    const { name } = packages.get(packageRoot)!;
    if (!topLevelPackages.has(name)) topLevelPackages.set(name, packageRoot);
  }
  await copyPackageGraph({
    packages,
    topLevelPackages,
    nodeModulesPath: join(serverFunctionPath, 'node_modules')
  });

  return {
    packageCount: packages.size,
    tracedFileCount: [...packages.values()].reduce(
      (count, tracedPackage) => count + (tracedPackage.files?.size ?? 0),
      0
    ),
    warnings: [...trace.warnings]
  };
};
