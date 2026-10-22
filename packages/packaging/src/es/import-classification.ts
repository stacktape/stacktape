/**
 * How a bare import is classified during an ES build: bundled, left to the runtime, or externalized
 * and installed separately.
 *
 * Both ES bundlers ask exactly these questions in exactly this order. The per-Lambda bundler
 * (`bundlers/es`) records the answers in flat arrays because it serves one workload; the split
 * bundler records them per importer because one build serves many Lambdas. That difference is in
 * the recording, not in the decision, so the decision lives here and neither bundler owns a copy of
 * it. A rule added here reaches both.
 *
 * The functions are deliberately split around module resolution: a caller runs its own
 * `findModulePath` between them, and inserts whatever extra steps it needs (workspace packages and
 * dynamically imported modules in the per-Lambda bundler) without reordering the shared ones.
 */
import { existsSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { basename, dirname, isAbsolute, join } from 'node:path';
import type { ResolvedPackageDependency } from '../runtime-contracts';
import { isBareImportSpecifier } from './bun-plugins';
import { determineIfAlias, isRequireImportKind } from './bundler-helpers';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE } from './config';
import {
  findInstalledPackage,
  isOptionalPeer,
  readPackageManifest,
  type PackageAnalysisCache
} from './installed-packages';
import { getNativeReason } from './native-packages';
import { readsOwnFilesAtRunTime } from './self-reading-packages';

/** The package a specifier belongs to: `lodash/merge` is `lodash`, `@scope/pkg/sub` is `@scope/pkg`. */
export const getModuleName = (importPath: string): string => {
  const normalized = importPath.endsWith('/') ? importPath.slice(0, -1) : importPath;
  const [firstPart, secondPart] = normalized.split('/');
  if (!firstPart) return normalized;
  return firstPart.startsWith('@') && secondPart ? `${firstPart}/${secondPart}` : firstPart;
};

export const isNodeBuiltinImport = (specifier: string): boolean => isBuiltin(specifier);

/** The directory of the `package.json` that owns `directory`, as Node.js finds a module's package scope. */
const findPackageScope = (directory: string): string | undefined => {
  for (let current = directory; ; current = dirname(current)) {
    if (existsSync(join(current, 'package.json'))) return current;
    if (dirname(current) === current) return undefined;
  }
};

/** The entry of an `imports` map that matches `specifier`, with the text a `*` pattern captured. */
const matchImportsEntry = (
  imports: Record<string, unknown>,
  specifier: string
): { target: unknown; captured?: string } | undefined => {
  if (!specifier.includes('*') && Object.hasOwn(imports, specifier)) return { target: imports[specifier] };
  // Node.js prefers the pattern with the longest text before the `*`, then the longest pattern.
  let best: { key: string; base: string; captured: string } | undefined;
  for (const key of Object.keys(imports)) {
    const star = key.indexOf('*');
    if (star === -1 || star !== key.lastIndexOf('*')) continue;
    const base = key.slice(0, star);
    const trailer = key.slice(star + 1);
    if (specifier === base || specifier.length < key.length) continue;
    if (!specifier.startsWith(base) || !specifier.endsWith(trailer)) continue;
    if (
      best &&
      (base.length < best.base.length || (base.length === best.base.length && key.length <= best.key.length))
    ) {
      continue;
    }
    best = { key, base, captured: specifier.slice(base.length, specifier.length - trailer.length) };
  }
  return best && { target: imports[best.key], captured: best.captured };
};

/** The string a target selects under the build's conditions: the first matching key wins, as in Node.js. */
const selectImportsTarget = (target: unknown, conditions: Set<string>): string | undefined => {
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) {
    for (const candidate of target) {
      const selected = selectImportsTarget(candidate, conditions);
      if (selected !== undefined) return selected;
    }
    return undefined;
  }
  if (typeof target !== 'object' || target === null) return undefined;
  for (const [condition, value] of Object.entries(target)) {
    if (!conditions.has(condition)) continue;
    const selected = selectImportsTarget(value, conditions);
    if (selected !== undefined) return selected;
  }
  return undefined;
};

/**
 * The package specifier the dependency rules classify an import by, or `undefined` when the import names no package.
 *
 * A subpath import (`#name`) is defined by the importing package's `imports` map. When the map points it at a
 * package, as `"#native": "fixture-native"` does, it is an import of that package and the rules decide about that
 * package: Bun's resolver would otherwise follow the map without asking the plugins, and bundle a native or excluded
 * package. A package left out of the bundle is then imported by its own name, because the artifact keeps no `imports`
 * map. A subpath import of a file in the package, as Prisma's `#main-entry-point` is, names no package and is bundled.
 */
export const getClassifiedSpecifier = async ({
  path: specifier,
  importer,
  kind
}: {
  /** The import's specifier, as Bun's `onResolve` arguments name it. */
  path: string;
  importer: string | undefined;
  kind: Bun.ImportKind | undefined;
}): Promise<string | undefined> => {
  if (!specifier.startsWith('#')) return isBareImportSpecifier(specifier) ? specifier : undefined;
  const packageScope = importer && isAbsolute(importer) ? findPackageScope(dirname(importer)) : undefined;
  if (!packageScope) return undefined;
  const { imports } = await readPackageManifest(packageScope).catch(() => ({ imports: undefined }));
  if (typeof imports !== 'object' || imports === null || Array.isArray(imports)) return undefined;
  const entry = matchImportsEntry(imports as Record<string, unknown>, specifier);
  const conditions = new Set(['node', isRequireImportKind(kind) ? 'require' : 'import', 'default']);
  const target = entry && selectImportsTarget(entry.target, conditions);
  if (target === undefined) return undefined;
  const packageSpecifier = entry?.captured === undefined ? target : target.replaceAll('*', entry.captured);
  return isBareImportSpecifier(packageSpecifier) ? packageSpecifier : undefined;
};

/**
 * Lambda Node runtimes that ship the AWS SDK v3. Bundling it into the artifact on one of these only
 * makes the upload bigger; the runtime already has it.
 */
const NODE_LAMBDA_RUNTIMES_PROVIDING_SDK_V3 = new Set([18, 20, 22, 24]);

/**
 * The SDK families left to those runtimes. The runtime carries far more of `@aws-sdk/*` than this —
 * the probe in `scripts/synthetic-node-lambda-e2e.ts` resolves `util-*`, `middleware-*` and the
 * presigners as well — but a sampled probe is not a guarantee, and a family that turns out to be
 * missing fails at load, not at build. Clients and the `lib-*` helpers built on them are what
 * application code imports directly, and both are certainly present. Keeping `lib-*` with the
 * clients also keeps them at one version: a bundled `lib-dynamodb` driving a runtime-provided
 * `client-dynamodb` is two SDK versions in one process.
 */
const RUNTIME_PROVIDED_AWS_SDK_FAMILIES = ['@aws-sdk/client-', '@aws-sdk/lib-'];

/** `24`, `'24'` and `'nodejs24.x'` all mean Node 24. Anything unrecognizable means "do not assume". */
const getNodeMajorVersion = (nodeTarget: number | string | undefined): number | undefined => {
  if (nodeTarget === undefined) return undefined;
  if (typeof nodeTarget === 'number') return Number.isInteger(nodeTarget) ? nodeTarget : undefined;
  const major = nodeTarget.match(/(\d+)/)?.[1];
  return major ? Number(major) : undefined;
};

/**
 * Whether the Lambda runtime already provides this module, so the build should leave it alone.
 *
 * Container workloads get no such runtime, so this answers `false` for them however new their Node
 * version is. `bundleAwsSdk` is the user's way out when the runtime's SDK is older than the one their
 * code needs: the SDK is then treated like any other dependency.
 */
export const isRuntimeProvidedLambdaModule = ({
  bundleAwsSdk,
  isLambda,
  moduleName,
  nodeTarget
}: {
  bundleAwsSdk?: boolean | undefined;
  isLambda: boolean | undefined;
  moduleName: string;
  nodeTarget: number | string | undefined;
}): boolean => {
  if (!isLambda || bundleAwsSdk) return false;
  const major = getNodeMajorVersion(nodeTarget);
  if (major === undefined || !NODE_LAMBDA_RUNTIMES_PROVIDING_SDK_V3.has(major)) return false;
  return RUNTIME_PROVIDED_AWS_SDK_FAMILIES.some((family) => moduleName.startsWith(family));
};

/**
 * The installed package required as `name` from `path`, or `null` when its manifest cannot be read. The name is the
 * one it is required by, which an npm alias makes different from its manifest's.
 */
const describeInstalledPackage = async ({
  name,
  path,
  note
}: {
  name: string;
  path: string;
  note: string;
}): Promise<ResolvedPackageDependency | null> => {
  try {
    const { version } = await readPackageManifest(path);
    return version ? { name, version, path, note } : null;
  } catch {
    return null;
  }
};

/** Why a package stays out of the bundle, or `undefined` when it is bundled. */
const getExclusionNote = async ({
  dependency,
  dependenciesToExcludeFromBundle,
  cache
}: {
  dependency: { path: string; name: string };
  dependenciesToExcludeFromBundle: string[];
  cache: PackageAnalysisCache;
}): Promise<string | undefined> => {
  const nativeReason = await getNativeReason(dependency.path, cache);
  if (nativeReason) return `native: ${nativeReason}`;
  if (dependenciesToExcludeFromBundle.includes(dependency.name)) return 'EXCLUDED_FROM_BUNDLE_BY_USER';
  if (DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE.includes(dependency.name)) return 'EXCLUDED_FROM_BUNDLE_BY_STACKTAPE';
  if (await readsOwnFilesAtRunTime(dependency.path, cache)) return 'reads its own files at run time';
  return undefined;
};

/**
 * The packages a dependency needs installed beside the bundle: itself when it is native or excluded from the bundle,
 * and its installed peer dependencies that are native. A bundled package can reach a peer through a `require()` the
 * bundler cannot follow, so a native peer is installed even when nothing imports it directly. A pure-JavaScript peer
 * such as `zod` bundles safely. An optional peer is marked `optionalPeer`: the bundler keeps it only when the project
 * depends on it in production, as Sequelize projects do with their database driver.
 *
 * Unreadable package metadata is not fatal: the import falls through to the bundler, which reports a resolution
 * failure with the context a packaging error here would lack.
 */
const analyzeDependency = async ({
  dependency,
  dependenciesToExcludeFromBundle,
  cache
}: {
  dependency: { path: string; name: string };
  dependenciesToExcludeFromBundle: string[];
  cache: PackageAnalysisCache;
}): Promise<ResolvedPackageDependency[]> => {
  const manifest = await readPackageManifest(dependency.path).catch(() => null);
  if (!manifest) return [];

  const externalDependencies: ResolvedPackageDependency[] = [];
  const note = await getExclusionNote({ dependency, dependenciesToExcludeFromBundle, cache });
  if (note) {
    const installedPackage = await describeInstalledPackage({ name: dependency.name, path: dependency.path, note });
    if (installedPackage) externalDependencies.push(installedPackage);
  }

  const peerNames = new Set([
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.peerDependenciesMeta ?? {})
  ]);
  const nativePeers = await Promise.all(
    [...peerNames].map(async (peerName) => {
      const peerPath = await findInstalledPackage({ name: peerName, fromDirectory: dependency.path });
      const nativeReason = peerPath && (await getNativeReason(peerPath, cache));
      if (!nativeReason) return null;
      const peer = await describeInstalledPackage({
        name: peerName,
        path: peerPath,
        note: `native peer of ${dependency.name}: ${nativeReason}`
      });
      if (peer && isOptionalPeer(manifest, peerName)) peer.optionalPeer = true;
      return peer;
    })
  );
  for (const peer of nativePeers) if (peer) externalDependencies.push(peer);
  return externalDependencies;
};

/** What the shared rules decide about a bare import before anyone has located it on disk. */
export type PreResolutionVerdict =
  /** A Node builtin: the runtime supplies it. */
  | { outcome: 'builtin' }
  /** The Lambda runtime supplies it, so it leaves the artifact without being installed anywhere. */
  | { outcome: 'runtime-provided' }
  /** A tsconfig path alias, which points at project sources rather than a package. */
  | { outcome: 'alias' }
  /** None of the shared rules apply; the caller resolves the module and asks again. */
  | { outcome: 'continue' };

export const classifyBeforeResolution = ({
  aliases,
  bundleAwsSdk,
  isLambda,
  moduleName,
  nodeTarget,
  specifier
}: {
  aliases: Record<string, string>;
  bundleAwsSdk?: boolean | undefined;
  isLambda: boolean | undefined;
  moduleName: string;
  nodeTarget: number | string | undefined;
  specifier: string;
}): PreResolutionVerdict => {
  if (isNodeBuiltinImport(specifier)) return { outcome: 'builtin' };
  if (isRuntimeProvidedLambdaModule({ bundleAwsSdk, isLambda, moduleName, nodeTarget })) {
    return { outcome: 'runtime-provided' };
  }
  if (determineIfAlias({ moduleName, aliases })) return { outcome: 'alias' };
  return { outcome: 'continue' };
};

/**
 * What the shared rules decide once the module's directory is known.
 *
 * `externalDependencies` is reported either way: a bundled module can still carry a native peer dependency, which has
 * to be installed even though the module itself is bundled. A module left out of the bundle for any reason does not
 * take its own dependencies out with it: the module resolves them from where it is installed, and a bundled importer of
 * the same package keeps its own copy, which may be another version.
 */
export type ResolvedModuleVerdict = { externalDependencies: ResolvedPackageDependency[] } & (
  | {
      outcome: 'external';
      /** Why it left the bundle, recorded against the module for later reporting. */
      note: string;
    }
  /** Nothing keeps it out of the bundle. */
  | { outcome: 'bundle' }
);

export const classifyResolvedModule = async ({
  dependenciesToExcludeFromBundle,
  excludeDependencies,
  ignoredModules,
  modulePath,
  moduleName,
  shouldIgnoreAllDeps,
  importer,
  importKind,
  cache
}: {
  dependenciesToExcludeFromBundle: string[];
  excludeDependencies: string[];
  ignoredModules: readonly string[];
  /** Nullish when the module could not be located; only the name-based rules can apply then. */
  modulePath: string | null | undefined;
  moduleName: string;
  shouldIgnoreAllDeps: boolean;
  /** The file doing the import and how, when the bundler knows them. */
  importer?: string | undefined;
  importKind?: Bun.ImportKind | undefined;
  /** The build's cache (`createPackageAnalysisCache`). */
  cache: PackageAnalysisCache;
}): Promise<ResolvedModuleVerdict> => {
  // `excludeDependencies` and the ignored modules leave the deployment package altogether.
  if (ignoredModules.includes(moduleName) || excludeDependencies.includes(moduleName)) {
    return { outcome: 'external', note: 'EXCLUDED', externalDependencies: [] };
  }

  if (shouldIgnoreAllDeps && modulePath) {
    const installedPackage = await describeInstalledPackage({
      name: moduleName,
      path: modulePath,
      note: 'WILDCARD_EXTERNALIZED'
    });
    return {
      outcome: 'external',
      note: 'WILDCARD_EXTERNALIZED',
      externalDependencies: installedPackage ? [installedPackage] : []
    };
  }

  if (!modulePath) {
    // A dependency that `require()`s or `import()`s a package nobody installed is probing for an optional integration: NestJS
    // asks for `@nestjs/microservices`, `ws` for `bufferutil`, inside a try/catch. Node answers that with a runtime
    // MODULE_NOT_FOUND the library handles; failing the whole bundle instead breaks every such framework. The
    // project's own code gets no such leniency: a missing import there is a real error.
    const fromDependency = importer !== undefined && /[\\/]node_modules[\\/]/.test(importer);
    if (fromDependency && (isRequireImportKind(importKind) || importKind === 'dynamic-import')) {
      return { outcome: 'external', note: 'OPTIONAL_NOT_INSTALLED', externalDependencies: [] };
    }
    return { outcome: 'bundle', externalDependencies: [] };
  }

  const externalDependencies = await analyzeDependency({
    dependenciesToExcludeFromBundle,
    dependency: { name: moduleName, path: modulePath },
    cache
  });
  const self = externalDependencies.find((dependency) => dependency.path === modulePath);
  if (!self) return { outcome: 'bundle', externalDependencies };
  // cosmiconfig imports TypeScript, its optional peer, to read `.ts` configuration files. A production install has the
  // peer only when the project needs it for another reason, so the bundler ships it only then (`optionalPeer`).
  if (importer && (await isOptionalPeerOfImporter(importer, moduleName))) self.optionalPeer = true;
  return { outcome: 'external', note: self.note ?? 'EXTERNAL', externalDependencies };
};

/** Whether the installed package that contains `importer` lists `name` only as an optional peer. */
const isOptionalPeerOfImporter = async (importer: string, name: string) => {
  if (!isAbsolute(importer) || !/[\\/]node_modules[\\/]/.test(importer)) return false;
  const directories: string[] = [];
  for (let directory = dirname(importer); basename(directory) !== 'node_modules'; directory = dirname(directory)) {
    directories.push(directory);
    if (dirname(directory) === directory) break;
  }
  // A nested `package.json` without a name, such as `dist/package.json` setting the module type, is not the package's.
  const manifests = await Promise.all(
    directories.map((directory) => readPackageManifest(directory).catch(() => undefined))
  );
  const manifest = manifests.find((candidate) => candidate?.name);
  return manifest ? isOptionalPeer(manifest, name) : false;
};
