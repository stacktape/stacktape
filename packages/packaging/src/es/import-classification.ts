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
import { isBuiltin } from 'node:module';
import type { PackageJsonDepsInfo } from './bundler-helpers';
import { determineIfAlias, getInfoFromPackageJson } from './bundler-helpers';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE, IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER } from './config';

/** The package a specifier belongs to: `lodash/merge` is `lodash`, `@scope/pkg/sub` is `@scope/pkg`. */
export const getModuleName = (importPath: string): string => {
  const normalized = importPath.endsWith('/') ? importPath.slice(0, -1) : importPath;
  const [firstPart, secondPart] = normalized.split('/');
  if (!firstPart) return normalized;
  return firstPart.startsWith('@') && secondPart ? `${firstPart}/${secondPart}` : firstPart;
};

export const isNodeBuiltinImport = (specifier: string): boolean => isBuiltin(specifier);

/** Every name in a dependency's transitive `dependencies` tree. */
export const getExternalDeps = (depsInfo: PackageJsonDepsInfo, depsList: Set<string>): Set<string> => {
  for (const dep of depsInfo.dependencies) {
    depsList.add(dep.name);
    getExternalDeps(dep, depsList);
  }
  return depsList;
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
 * What a dependency needs beyond bundling: a native binary has to be installed on the target
 * platform instead, and so does anything the user or Stacktape excluded from the bundle. Peer
 * dependencies come along only when they carry a binary of their own — a pure-JS peer such as `zod`
 * bundles safely.
 *
 * Unreadable package metadata is not fatal: the import falls through to the bundler, which reports
 * a resolution failure with the context a packaging error here would lack.
 */
export const analyzeDependency = async ({
  dependency,
  dependenciesToExcludeFromBundle
}: {
  dependency: { path: string; name: string };
  dependenciesToExcludeFromBundle: string[];
}): Promise<{
  dependenciesToInstallInDocker: PackageJsonDepsInfo[];
  allExternalDeps: string[];
}> => {
  const packageInfo = await getInfoFromPackageJson({
    directoryPath: dependency.path,
    parentModule: null,
    dependencyType: 'root'
  });
  if (!packageInfo) {
    return { dependenciesToInstallInDocker: [], allExternalDeps: [] };
  }

  const allExternalDeps = Array.from(getExternalDeps(packageInfo, new Set<string>()));
  const dependenciesToInstallInDocker: PackageJsonDepsInfo[] = [];

  if (packageInfo.hasBinary) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'HAS_BINARY' });
  } else if (dependenciesToExcludeFromBundle.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_USER' });
  } else if (DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_STACKTAPE' });
  }

  packageInfo.optionalPeerDependencies
    ?.filter((dep) => !IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER.includes(dep.name))
    .filter((dep) => dep.hasBinary)
    .forEach((dep) => {
      dependenciesToInstallInDocker.push({ ...dep, note: 'OPTIONAL_PEER_DEPENDENCY' });
    });

  packageInfo.peerDependencies
    ?.filter((dep) => dep.hasBinary)
    .forEach((dep) => {
      dependenciesToInstallInDocker.push({ ...dep, note: 'PEER_DEPENDENCY' });
    });

  return { dependenciesToInstallInDocker, allExternalDeps };
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
 * `dependenciesToInstallInDocker` is reported either way: a bundled module can still carry a peer
 * dependency with a native binary, which has to be installed even though the module itself is
 * bundled.
 */
export type ResolvedModuleVerdict = { dependenciesToInstallInDocker: PackageJsonDepsInfo[] } & (
  | {
      outcome: 'external';
      /** Why it left the bundle, recorded against the module for later reporting. */
      note: string;
      /**
       * Names that must be external too, because an externalized package resolves them from its own
       * installed tree. Bundling them as well would ship a second copy.
       */
      alsoExternal: string[];
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
  shouldIgnoreAllDeps
}: {
  dependenciesToExcludeFromBundle: string[];
  excludeDependencies: string[];
  ignoredModules: readonly string[];
  /** Nullish when the module could not be located; only the name-based rules can apply then. */
  modulePath: string | null | undefined;
  moduleName: string;
  shouldIgnoreAllDeps: boolean;
}): Promise<ResolvedModuleVerdict> => {
  const readPackageInfo = async (note: string): Promise<PackageJsonDepsInfo[]> => {
    if (!modulePath) return [];
    const packageInfo = await getInfoFromPackageJson({
      directoryPath: modulePath,
      parentModule: null,
      dependencyType: 'root'
    }).catch(() => null);
    return packageInfo ? [{ ...packageInfo, note }] : [];
  };

  if (shouldIgnoreAllDeps && modulePath) {
    return {
      outcome: 'external',
      note: 'WILDCARD_EXTERNALIZED',
      dependenciesToInstallInDocker: await readPackageInfo('WILDCARD_EXTERNALIZED'),
      alsoExternal: []
    };
  }

  if (ignoredModules.includes(moduleName) || excludeDependencies.includes(moduleName)) {
    return {
      outcome: 'external',
      note: 'IGNORED',
      dependenciesToInstallInDocker: await readPackageInfo('IGNORED'),
      alsoExternal: []
    };
  }

  if (!modulePath) return { outcome: 'bundle', dependenciesToInstallInDocker: [] };

  const { allExternalDeps, dependenciesToInstallInDocker } = await analyzeDependency({
    dependenciesToExcludeFromBundle,
    dependency: { name: moduleName, path: modulePath }
  });

  return dependenciesToInstallInDocker.some((dep) => dep.name === moduleName)
    ? {
        outcome: 'external',
        note: 'INSTALLED_IN_DOCKER',
        dependenciesToInstallInDocker,
        alsoExternal: allExternalDeps
      }
    : { outcome: 'bundle', dependenciesToInstallInDocker };
};
