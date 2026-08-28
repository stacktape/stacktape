/**
 * Bundles multiple Lambda entrypoints together with code splitting enabled,
 * automatically creating shared chunks for code used by multiple functions.
 *
 * Uses Bun's metafile feature for efficient chunk dependency analysis
 * instead of reading and parsing chunk files manually.
 */
import type { BunPlugin } from 'bun';
import type {
  BuildMetafile,
  BuildSplitBundleOptions,
  ChunkUsageAnalysis,
  LambdaSplitOutput,
  SplitBundleResult
} from './types';
import type { PackageJsonDepsInfo } from '../es/bundler-helpers';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, posix, resolve } from 'node:path';
import { rewriteChunkImports } from './chunk-rewriter';
import { copy, emptyDir, ensureDir, outputJSON, readFile, writeFile } from 'fs-extra';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE, IGNORED_MODULES, NODE_BUILTIN_MODULES } from '../es/config';
import { findProjectRoot } from '../es/project-root';
import { formatBuildError } from './error-format';
import {
  createModuleResolver,
  determineIfAlias,
  ensureDefaultExport,
  ESM_SOURCE_MAP_BANNER,
  getInfoFromPackageJson,
  getTsconfigAliases,
  isRequireImportKind,
  packageEntryConditions,
  resolveWithRequireCondition
} from '../es/bundler-helpers';
import { rewriteLambdaAssetReferences } from '../artifact/lambda-assets';

const transformToUnixPath = (path: string): string => path.replace(/\\/g, '/');

/**
 * Bundle multiple Lambda entrypoints together using Bun's code splitting.
 *
 * Output structure:
 * - sharedOutdir/
 *   - [relative-path]/index.js (entry points)
 *   - chunks/chunk-[hash].js (shared code)
 *
 * Each Lambda package includes its entry file + all chunks it imports.
 *
 * Uses Bun's metafile for efficient dependency analysis - no need to read/parse chunks.
 */
export const buildSplitBundle = async ({
  entrypoints,
  sharedOutdir,
  cwd,
  tsConfigPath,
  minify = true,
  sourceMaps = 'external',
  sourceMapBannerType = 'pre-compiled',
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  installDependencies,
  createPackagingError
}: BuildSplitBundleOptions): Promise<SplitBundleResult> => {
  const startTime = Date.now();

  // Install dependencies first
  await installDependencies();

  // Setup tsconfig aliases and path resolution
  const aliases = tsConfigPath ? await getTsconfigAliases(tsConfigPath) : {};

  // Find monorepo root for resolving workspace package paths in resolver plugin.
  const monorepoRoot = await findProjectRoot(cwd);

  // Track dependencies during bundling (source files now come from metafile)
  const tracker = createDependencyTracker();
  const shouldIgnoreAllDeps = dependenciesToExcludeFromBundle.includes('*');

  // Build all entrypoints together with code splitting (with metafile enabled)
  const { buildResult, metafile } = await executeBunBuild({
    entrypoints,
    sharedOutdir,
    cwd,
    monorepoRoot,
    ...(tsConfigPath ? { tsConfigPath } : {}),
    minify,
    sourceMaps,
    sourceMapBannerType,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    shouldIgnoreAllDeps,
    aliases,
    tracker,
    createPackagingError
  });

  // Separate entry files from chunk files
  const { chunkFiles, assetFiles } = categorizeOutputFiles(buildResult.outputs);

  // Build mapping from metafile relative paths to absolute paths on disk
  const metafileToAbsolutePath = buildMetafilePathMapping(buildResult.outputs, sharedOutdir);

  // Process lambdas using metafile for chunk dependency analysis
  const { lambdaOutputs, chunkUsageMap } = await processLambdaOutputsWithMetafile({
    entrypoints,
    metafile,
    tracker,
    assetFiles,
    metafileToAbsolutePath,
    createPackagingError
  });

  // Build chunk usage analysis from the metafile plus emitted source-map sizes.
  const chunkAnalysis = buildChunkAnalysisFromMetafile(metafile, chunkUsageMap, metafileToAbsolutePath);

  return {
    lambdaOutputs,
    sharedChunkCount: chunkFiles.length,
    bundleTimeMs: Date.now() - startTime,
    chunkAnalysis
  };
};

/** Dependency tracking state during bundling (source files now from metafile) */
type DependencyTracker = {
  resolvedModulesByImporter: Map<string, Set<string>>;
  dependenciesByImporter: Map<string, PackageJsonDepsInfo[]>;
  externalModules: Array<{ name: string; note: string }>;
};

const createDependencyTracker = (): DependencyTracker => ({
  resolvedModulesByImporter: new Map(),
  dependenciesByImporter: new Map(),
  externalModules: []
});

const trackResolvedModule = (tracker: DependencyTracker, importer: string, moduleName: string) => {
  const importerKey = canonicalizeEntrypointPath(importer);
  const resolvedModules = tracker.resolvedModulesByImporter.get(importerKey) ?? new Set<string>();
  resolvedModules.add(moduleName);
  tracker.resolvedModulesByImporter.set(importerKey, resolvedModules);
};

const trackDependencies = (tracker: DependencyTracker, importer: string, dependencies: PackageJsonDepsInfo[]) => {
  if (dependencies.length === 0) return;
  const importerKey = canonicalizeEntrypointPath(importer);
  const trackedDependencies = tracker.dependenciesByImporter.get(importerKey) ?? [];
  trackedDependencies.push(...dependencies);
  tracker.dependenciesByImporter.set(importerKey, trackedDependencies);
};

/** Execute Bun.build with all plugins and configuration, returns build result and metafile */
const executeBunBuild = async ({
  entrypoints,
  sharedOutdir,
  cwd,
  monorepoRoot,
  tsConfigPath,
  minify,
  sourceMaps,
  sourceMapBannerType,
  excludeDependencies,
  dependenciesToExcludeFromBundle,
  shouldIgnoreAllDeps,
  aliases,
  tracker,
  createPackagingError
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  sharedOutdir: string;
  cwd: string;
  monorepoRoot: string | null;
  tsConfigPath?: string | undefined;
  minify: boolean;
  sourceMaps: 'inline' | 'external' | 'disabled';
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  excludeDependencies: string[];
  dependenciesToExcludeFromBundle: string[];
  shouldIgnoreAllDeps: boolean;
  aliases: Record<string, string>;
  tracker: DependencyTracker;
  createPackagingError: BuildSplitBundleOptions['createPackagingError'];
}): Promise<{ buildResult: Awaited<ReturnType<typeof Bun.build>>; metafile: BuildMetafile }> => {
  const analyzePlugin = createAnalyzePlugin({
    cwd,
    monorepoRoot,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    shouldIgnoreAllDeps,
    aliases,
    tracker
  });

  const nativeModulesPlugin = createNativeModulesPlugin();
  const bunFfiShimPlugin: BunPlugin = {
    name: 'stacktape-bun-ffi-shim',
    setup(build) {
      build.onResolve({ filter: /^bun:ffi$/ }, () => {
        return { path: 'bun:ffi', namespace: 'stacktape-bun-ffi-shim' };
      });

      build.onLoad({ filter: /^bun:ffi$/, namespace: 'stacktape-bun-ffi-shim' }, () => {
        return {
          loader: 'js',
          contents: [
            'const fail = (name) => () => {',
            '  throw new Error("Unsupported Bun module bun:ffi in Node runtime (attempted export: " + name + ").");',
            '};',
            "export const dlopen = fail('dlopen');",
            "export const toArrayBuffer = fail('toArrayBuffer');",
            "export const JSCallback = class { constructor() { fail('JSCallback')(); } };",
            "export const ptr = fail('ptr');"
          ].join('\n')
        };
      });
    }
  };
  const banner = await getSourceMapBanner(sourceMapBannerType);

  // A packaging manager can rebuild the same invocation paths in dev mode. Bun does not remove outputs that are no
  // longer emitted, so retaining this directory would leak stale chunks and source maps into later artifacts.
  await emptyDir(sharedOutdir);
  let result: Awaited<ReturnType<typeof Bun.build>>;

  try {
    // Use monorepo root for module resolution if available, otherwise cwd
    const buildRoot = monorepoRoot || cwd;

    result = await Bun.build({
      entrypoints: entrypoints.map((ep) => ep.entryfilePath),
      outdir: sharedOutdir,
      target: 'node',
      format: 'esm',
      splitting: true,
      minify,
      sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
      external: ['fsevents', ...tracker.externalModules.map((m) => m.name)],
      define: {
        // Avoid baking the packaging process's development mode into every deployed Lambda.
        'process.env.NODE_ENV': 'process.env.NODE_ENV',
        __dirname: '__stp_dirname',
        __filename: '__stp_filename'
      },
      plugins: [
        bunFfiShimPlugin,
        analyzePlugin,
        nativeModulesPlugin,
        createWindowsPathNormalizationPlugin({ cwd, monorepoRoot })
      ],
      root: buildRoot,
      ...(sourceMapBannerType === 'pre-compiled' && banner ? { banner } : {}),
      ...(tsConfigPath ? { tsconfig: tsConfigPath } : {}),
      naming: {
        entry: '[dir]/[name].js',
        chunk: 'chunks/chunk-[hash].js'
      },
      // Enable metafile for efficient chunk dependency analysis
      metafile: true,
      throw: false
    });
  } catch (error) {
    const errorDetails = formatBuildError(error);
    throw createPackagingError({
      message: `Split bundle failed: ${errorDetails}`,
      hint: 'Check that all entrypoint files exist and are valid TypeScript/JavaScript.',
      cause: error
    });
  }

  if (!result.success) {
    const errors = result.logs
      .filter((log) => log.level === 'error')
      .map((log) => log.message)
      .join('\n');
    throw createPackagingError({
      message: `Split bundle build failed: ${errors}`
    });
  }

  const assetFiles = result.outputs.filter((output) => output.kind === 'asset').map(({ path }) => path);
  if (assetFiles.length > 0) {
    await Promise.all(
      result.outputs
        .filter(({ path }) => path.endsWith('.js'))
        .map(async ({ path }) => {
          const contents = await readFile(path, 'utf8');
          await writeFile(path, rewriteLambdaAssetReferences(contents, assetFiles));
        })
    );
  }

  return {
    buildResult: result,
    metafile: result.metafile as BuildMetafile
  };
};

// Module resolver is created per-build in createAnalyzePlugin

/** Create plugin for analyzing and tracking dependencies */
const createAnalyzePlugin = ({
  cwd,
  monorepoRoot,
  excludeDependencies,
  dependenciesToExcludeFromBundle,
  shouldIgnoreAllDeps,
  aliases,
  tracker
}: {
  cwd: string;
  monorepoRoot: string | null;
  excludeDependencies: string[];
  dependenciesToExcludeFromBundle: string[];
  shouldIgnoreAllDeps: boolean;
  aliases: Record<string, string>;
  tracker: DependencyTracker;
}): BunPlugin => {
  // Create module resolver with loose resolution (mimics esbuild behavior)
  const moduleResolver = createModuleResolver({ cwd, monorepoRoot });

  return {
    name: 'stp-analyze-deps',
    setup(build) {
      // Note: Source file tracking moved to metafile.inputs (more accurate, no plugin overhead)

      // Analyze and handle external dependencies
      build.onResolve({ filter: /^[^.]/ }, async (args): Promise<{ path: string; external?: boolean } | undefined> => {
        if (args.path.startsWith('.') || args.path.startsWith('/') || isAbsolute(args.path)) {
          return undefined;
        }

        const moduleName = getModuleName(args.path);
        trackResolvedModule(tracker, args.importer, moduleName);

        // Skip built-in modules
        if (NODE_BUILTIN_MODULES.includes(moduleName) || args.path.startsWith('node:')) {
          return undefined;
        }

        // Check if it's a tsconfig alias
        if (await determineIfAlias({ moduleName, aliases })) {
          return undefined;
        }

        // Find module using loose resolution (handles nested node_modules)
        const modulePath = moduleResolver.findModulePath(moduleName, args.importer);

        // Handle wildcard externalization
        if (shouldIgnoreAllDeps && modulePath) {
          const pkgInfo = await getInfoFromPackageJson({
            directoryPath: modulePath,
            parentModule: null,
            dependencyType: 'root'
          }).catch(() => null);
          if (pkgInfo) {
            trackDependencies(tracker, args.importer, [{ ...pkgInfo, note: 'WILDCARD_EXTERNALIZED' }]);
          }
          if (!tracker.externalModules.some(({ name }) => name === moduleName)) {
            tracker.externalModules.push({ name: moduleName, note: 'WILDCARD_EXTERNALIZED' });
          }
          return { path: args.path, external: true };
        }

        // Handle ignored modules
        if (IGNORED_MODULES.concat(excludeDependencies).includes(moduleName)) {
          if (modulePath) {
            const pkgInfo = await getInfoFromPackageJson({
              directoryPath: modulePath,
              parentModule: null,
              dependencyType: 'root'
            }).catch(() => null);
            if (pkgInfo) {
              trackDependencies(tracker, args.importer, [{ ...pkgInfo, note: 'IGNORED' }]);
            }
          }
          if (!tracker.externalModules.some(({ name }) => name === moduleName)) {
            tracker.externalModules.push({ name: moduleName, note: 'IGNORED' });
          }
          return { path: args.path, external: true };
        }

        // Analyze dependency for native binaries
        if (modulePath) {
          const { dependenciesToInstallInDocker, allExternalDeps } = await analyzeDependency({
            dependency: { name: moduleName, path: modulePath },
            dependenciesToExcludeFromBundle
          });

          trackDependencies(tracker, args.importer, dependenciesToInstallInDocker);

          if (dependenciesToInstallInDocker.find((dep) => dep.name === moduleName)) {
            if (!tracker.externalModules.some(({ name }) => name === moduleName)) {
              tracker.externalModules.push({ name: moduleName, note: 'INSTALLED_IN_DOCKER' });
            }
            for (const dep of allExternalDeps) {
              if (!tracker.externalModules.find((m) => m.name === dep)) {
                tracker.externalModules.push({ name: dep, note: `ADDED_BY_${moduleName}` });
              }
            }
            return { path: args.path, external: true };
          }
        }

        return undefined;
      });
    }
  };
};

/**
 * Windows-only path normalization, mirroring the es bundler's workaround. An import no other plugin
 * claims is resolved by Bun natively, and on Windows that resolution can hand the bundler a
 * backslash path that panics Bun 1.3.14 while formatting source maps. This plugin runs last, so
 * externalization decisions keep precedence; everything still bundled resolves through a
 * forward-slash real path.
 */
const createWindowsPathNormalizationPlugin = ({
  cwd,
  monorepoRoot
}: {
  cwd: string;
  monorepoRoot: string | null;
}): BunPlugin => ({
  name: 'stp-windows-path-normalization',
  setup(build) {
    if (process.platform !== 'win32') return;
    const moduleResolver = createModuleResolver({ cwd, monorepoRoot });

    /**
     * `Bun.resolveSync` answers specifiers Bun shims at runtime (node-fetch and friends) with the
     * bare specifier instead of a file path, while its bundler still resolves them to the real
     * package. This manual entry resolution is those modules' only forward-slash route.
     */
    const resolveEntryManually = (
      specifier: string,
      moduleName: string,
      importer: string | undefined,
      kind: Bun.ImportKind
    ) => {
      const moduleDirectory = moduleResolver.findModulePath(moduleName, importer);
      if (!moduleDirectory) return undefined;
      try {
        const subpath = specifier.slice(moduleName.length).replace(/^\//, '');
        if (subpath) {
          for (const extension of ['', '.js', '.mjs', '.cjs', '.ts', '.json']) {
            const candidate = join(moduleDirectory, subpath) + extension;
            if (existsSync(candidate) && statSync(candidate).isFile()) {
              return { path: realpathSync(candidate).replace(/\\/g, '/') };
            }
          }
          return undefined;
        }
        const packageJson = JSON.parse(readFileSync(join(moduleDirectory, 'package.json'), 'utf-8')) as {
          exports?: unknown;
          module?: string;
          main?: string;
        };
        const dotExport = (() => {
          const exportsField = packageJson.exports;
          if (typeof exportsField === 'string') return exportsField;
          if (exportsField && typeof exportsField === 'object') {
            const dot = (exportsField as Record<string, unknown>)['.'];
            if (typeof dot === 'string') return dot;
            if (dot && typeof dot === 'object') {
              const conditions = dot as Record<string, unknown>;
              for (const condition of packageEntryConditions(kind)) {
                const value = conditions[condition];
                if (typeof value === 'string') return value;
                if (value && typeof value === 'object') {
                  const nested = (value as Record<string, unknown>).default;
                  if (typeof nested === 'string') return nested;
                }
              }
            }
          }
          return undefined;
        })();
        // `module` names an ESM entry, so a `require()` call has to reach `main` first.
        const legacyEntries = isRequireImportKind(kind)
          ? [packageJson.main, packageJson.module]
          : [packageJson.module, packageJson.main];
        for (const entry of [dotExport, ...legacyEntries, 'index.js']) {
          if (!entry) continue;
          const candidate = join(moduleDirectory, entry);
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return { path: realpathSync(candidate).replace(/\\/g, '/') };
          }
        }
      } catch {
        // Fall through to Bun's own diagnostics.
      }
      return undefined;
    };

    const normalize = (
      specifier: string,
      importer: string | undefined,
      resolveDir: string | undefined,
      kind: Bun.ImportKind
    ) => {
      try {
        // A `require()` call must keep CommonJS resolution: `Bun.resolveSync` would answer with the
        // package's ESM entry and turn `module.exports` into a namespace object at runtime.
        const requireResolved = isRequireImportKind(kind)
          ? resolveWithRequireCondition({ specifier, importer, resolveDir })
          : undefined;
        if (requireResolved) {
          return { path: realpathSync(requireResolved).replace(/\\/g, '/') };
        }
        const importerDirectory = resolveDir || (importer && isAbsolute(importer) ? dirname(importer) : cwd);
        const resolved = Bun.resolveSync(specifier, importerDirectory);
        if (isAbsolute(resolved)) {
          return { path: realpathSync(resolved).replace(/\\/g, '/') };
        }
      } catch {
        // Let Bun surface the unresolved import through its normal build diagnostics.
      }
      return undefined;
    };
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (isAbsolute(args.path) || args.path.startsWith('node:') || args.path === 'bun:ffi') return undefined;
      const moduleName = getModuleName(args.path);
      if (NODE_BUILTIN_MODULES.includes(moduleName)) return undefined;
      return (
        normalize(args.path, args.importer, args.resolveDir, args.kind) ??
        resolveEntryManually(args.path, moduleName, args.importer, args.kind)
      );
    });
    build.onResolve({ filter: /^\.\.?[\\/]/ }, (args) => {
      if (!args.importer) return undefined;
      return normalize(args.path, args.importer, args.resolveDir, args.kind);
    });
  }
});

/** Create plugin for handling native .node modules */
const createNativeModulesPlugin = (): BunPlugin => ({
  name: 'native-node-modules',
  setup(build) {
    build.onResolve({ filter: /\.node$/ }, (args) => {
      return { path: args.path, external: true };
    });
  }
});

/** Extract module name from import path (handles scoped packages) */
const getModuleName = (importPath: string): string => {
  const normalized = importPath.endsWith('/') ? importPath.slice(0, -1) : importPath;
  const [firstPart, secondPart] = normalized.split('/');
  if (!firstPart) return normalized;
  return firstPart.startsWith('@') && secondPart ? `${firstPart}/${secondPart}` : firstPart;
};

/** Analyze a dependency for native binaries and special handling */
const analyzeDependency = async ({
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
    throw new Error(`Could not read package metadata for dependency "${dependency.name}" at ${dependency.path}.`);
  }

  const dependenciesToInstallInDocker: PackageJsonDepsInfo[] = [];
  const allExternalDeps: string[] = [];

  if (packageInfo.hasBinary) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'HAS_BINARY' });
  } else if (dependenciesToExcludeFromBundle.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_USER' });
  } else if (DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_STACKTAPE' });
  }

  // Handle peer dependencies with native binaries
  packageInfo.optionalPeerDependencies
    ?.filter((dep) => dep.hasBinary)
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

/** Get the ESM compatibility banner for source maps */
const getSourceMapBanner = (bannerType: 'node_modules' | 'pre-compiled' | 'disabled'): string | undefined => {
  if (bannerType === 'disabled') return undefined;
  if (bannerType === 'pre-compiled') return ESM_SOURCE_MAP_BANNER;
  return undefined;
};

/** Build mapping from metafile relative paths to absolute paths on disk */
const buildMetafilePathMapping = (outputs: Array<{ path: string }>, sharedOutdir: string): Map<string, string> => {
  const mapping = new Map<string, string>();
  const normalizedOutdir = transformToUnixPath(sharedOutdir);

  for (const output of outputs) {
    const absolutePath = output.path;
    const normalizedAbsPath = transformToUnixPath(absolutePath);

    // Convert absolute path to the relative format used in metafile keys
    // e.g., "C:/Projects/.stp/shared/server/lambdas/auth.js" -> "./server/lambdas/auth.js"
    const relativePath = normalizedAbsPath.replace(normalizedOutdir, '').replace(/^\//, './');

    mapping.set(relativePath, absolutePath);

    // Also add without leading ./ for flexibility
    if (relativePath.startsWith('./')) {
      mapping.set(relativePath.slice(2), absolutePath);
    }
  }

  return mapping;
};

/** Bun may prefix otherwise equivalent metafile keys with one or more `./` segments. */
const resolveMetafileOutputPath = (mapping: Map<string, string>, metafilePath: string): string | undefined =>
  mapping.get(metafilePath) ?? mapping.get(posix.normalize(transformToUnixPath(metafilePath)));

/** Categorize build outputs into entry files and chunk files */
const categorizeOutputFiles = (
  outputs: Array<{ path: string; kind?: string | undefined }>
): { entryFiles: string[]; chunkFiles: string[]; assetFiles: string[] } => {
  const entryFiles: string[] = [];
  const chunkFiles: string[] = [];
  const assetFiles: string[] = [];

  for (const output of outputs) {
    const outputPath = output.path;
    if (output.kind === 'asset') {
      assetFiles.push(outputPath);
    } else if (outputPath.includes('chunks/') || outputPath.includes('chunks\\')) {
      chunkFiles.push(outputPath);
    } else if (outputPath.endsWith('.js')) {
      entryFiles.push(outputPath);
    }
  }

  return { entryFiles, chunkFiles, assetFiles };
};

/** Find all chunks required by an output (direct + transitive) using metafile */
const findAllChunksFromMetafile = (outputPath: string, metafile: BuildMetafile): Set<string> => {
  const allChunks = new Set<string>();
  const toProcess = [outputPath];
  const processed = new Set<string>();

  while (toProcess.length > 0) {
    const current = toProcess.pop()!;
    if (processed.has(current)) continue;
    processed.add(current);

    const outputMeta = metafile.outputs[current];
    if (!outputMeta) continue;

    for (const imp of outputMeta.imports) {
      // Normalize path for comparison (handle both / and \)
      const normalizedPath = transformToUnixPath(imp.path);
      if (normalizedPath.includes('chunk-') && normalizedPath.endsWith('.js')) {
        // Find the full output path that matches this import
        const fullChunkPath = Object.keys(metafile.outputs).find((outPath) => {
          const normalizedOutPath = transformToUnixPath(outPath);
          return normalizedOutPath.endsWith(normalizedPath) || normalizedPath.endsWith(basename(normalizedOutPath));
        });
        if (fullChunkPath && !allChunks.has(fullChunkPath)) {
          allChunks.add(fullChunkPath);
          toProcess.push(fullChunkPath);
        }
      }
    }
  }

  return allChunks;
};

/** Bun records metafile entrypoints relative to the process working directory, even when its build root differs. */
const canonicalizeEntrypointPath = (path: string): string => {
  const absolutePath = isAbsolute(path) ? resolve(path) : resolve(process.cwd(), path);
  const normalizedPath = transformToUnixPath(absolutePath);
  return process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
};

const collectOutputInputPaths = ({
  outputPath,
  chunkPaths,
  metafile
}: {
  outputPath: string;
  chunkPaths: Set<string>;
  metafile: BuildMetafile;
}): Set<string> => {
  const inputPaths = new Set<string>();
  for (const emittedPath of [outputPath, ...chunkPaths]) {
    for (const inputPath of Object.keys(metafile.outputs[emittedPath]?.inputs ?? {})) {
      inputPaths.add(inputPath);
    }
  }
  return inputPaths;
};

const getTrackedDependenciesForInputs = (
  tracker: DependencyTracker,
  inputPaths: Set<string>
): PackageJsonDepsInfo[] => {
  const dependencies = Array.from(inputPaths).flatMap(
    (inputPath) => tracker.dependenciesByImporter.get(canonicalizeEntrypointPath(inputPath)) ?? []
  );
  const seen = new Set<string>();
  return dependencies.filter((dependency) => {
    const identity = [dependency.name, dependency.version, dependency.note ?? '', dependency.path].join('\0');
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

const getTrackedModulesForInputs = (tracker: DependencyTracker, inputPaths: Set<string>): string[] =>
  Array.from(
    new Set(
      Array.from(inputPaths).flatMap((inputPath) =>
        Array.from(tracker.resolvedModulesByImporter.get(canonicalizeEntrypointPath(inputPath)) ?? [])
      )
    )
  );

/** Process lambda outputs using metafile for chunk dependency analysis */
const processLambdaOutputsWithMetafile = async ({
  entrypoints,
  metafile,
  tracker,
  assetFiles,
  metafileToAbsolutePath,
  createPackagingError
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  metafile: BuildMetafile;
  tracker: DependencyTracker;
  assetFiles: string[];
  metafileToAbsolutePath: Map<string, string>;
  createPackagingError: BuildSplitBundleOptions['createPackagingError'];
}): Promise<{
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  chunkUsageMap: Map<string, Set<string>>;
}> => {
  const lambdaOutputs = new Map<string, LambdaSplitOutput>();
  const chunkUsageMap = new Map<string, Set<string>>();

  // Build a map from entryPoint path to output path using metafile
  const entryPointToOutput = new Map<string, string>();
  for (const [outputPath, outputMeta] of Object.entries(metafile.outputs)) {
    if (outputMeta.entryPoint) {
      entryPointToOutput.set(canonicalizeEntrypointPath(outputMeta.entryPoint), outputPath);
    }
  }

  // Pre-create all lambda directories
  await Promise.all(
    entrypoints.map(async (ep) => {
      // Rebuilding into the same invocation path must not retain chunks or source maps from an earlier graph.
      await emptyDir(ep.distFolderPath);
      await ensureDir(join(ep.distFolderPath, 'chunks'));
    })
  );

  // Process all lambdas in parallel
  await Promise.all(
    entrypoints.map(async (entrypoint) => {
      // Find output file for this entrypoint using metafile's entryPoint field
      const normalizedEntryPath = canonicalizeEntrypointPath(entrypoint.entryfilePath);
      const outputPath = entryPointToOutput.get(normalizedEntryPath);

      if (!outputPath) {
        throw createPackagingError({
          message: `Could not find output for lambda: ${entrypoint.name}.\nEntry: ${normalizedEntryPath}\nAvailable entries: ${Array.from(entryPointToOutput.keys()).join(', ')}`
        });
      }

      // Find all required chunks using metafile (no file reading needed!)
      const allRequiredChunks = findAllChunksFromMetafile(outputPath, metafile);
      const inputPaths = collectOutputInputPaths({ outputPath, chunkPaths: allRequiredChunks, metafile });

      // Track chunk usage for layer analysis
      for (const chunk of allRequiredChunks) {
        if (!chunkUsageMap.has(chunk)) {
          chunkUsageMap.set(chunk, new Set());
        }
        chunkUsageMap.get(chunk)!.add(entrypoint.name);
      }

      // Convert metafile relative paths to absolute paths for file operations
      const absoluteOutputPath = resolveMetafileOutputPath(metafileToAbsolutePath, outputPath);
      if (!absoluteOutputPath) {
        throw createPackagingError({
          message: `Could not resolve absolute path for: ${outputPath}`
        });
      }

      const absoluteChunkPaths = new Set<string>();
      for (const chunkPath of allRequiredChunks) {
        const absPath = resolveMetafileOutputPath(metafileToAbsolutePath, chunkPath);
        if (absPath) {
          absoluteChunkPaths.add(absPath);
        }
      }

      // Process the entry file (still need to read for rewriting imports)
      await processLambdaEntrypointWithMetafile({
        entrypoint,
        outputPath: absoluteOutputPath,
        allRequiredChunks: absoluteChunkPaths,
        assetFiles
      });

      lambdaOutputs.set(entrypoint.name, {
        name: entrypoint.name,
        entryFile: join(entrypoint.distFolderPath, 'index.js'),
        files: [
          join(entrypoint.distFolderPath, 'index.js'),
          ...Array.from(absoluteChunkPaths, (path) => join(entrypoint.distFolderPath, 'chunks', basename(path))),
          ...assetFiles.map((path) => join(entrypoint.distFolderPath, basename(path)))
        ],
        sourceFiles: Array.from(inputPaths)
          .filter((inputPath) => !transformToUnixPath(inputPath).includes('/node_modules/'))
          .map((path) => ({ path })),
        dependenciesToInstallInDocker: getTrackedDependenciesForInputs(tracker, inputPaths),
        resolvedModules: getTrackedModulesForInputs(tracker, inputPaths)
      });
    })
  );

  return { lambdaOutputs, chunkUsageMap };
};

/** Process a single lambda entrypoint (simplified - chunk deps already known from metafile) */
const processLambdaEntrypointWithMetafile = async ({
  entrypoint,
  outputPath,
  allRequiredChunks,
  assetFiles
}: {
  entrypoint: BuildSplitBundleOptions['entrypoints'][0];
  outputPath: string;
  allRequiredChunks: Set<string>;
  assetFiles: string[];
}): Promise<void> => {
  // Read and process entry file
  let entryContent = await readFile(outputPath, 'utf-8');

  // Rewrite chunk imports to local path
  entryContent = rewriteChunkImports(entryContent, './chunks/');

  // Ensure default export exists
  entryContent = ensureDefaultExport(entryContent);

  // Fix sourceMappingURL
  entryContent = entryContent.replace(/\/\/# sourceMappingURL=.+\.js\.map/, '//# sourceMappingURL=index.js.map');

  // Write entry file
  const destIndexPath = join(entrypoint.distFolderPath, 'index.js');
  await writeFile(destIndexPath, entryContent);

  const chunksDestDir = join(entrypoint.distFolderPath, 'chunks');

  await Promise.all(
    assetFiles.map((assetPath) => copy(assetPath, join(entrypoint.distFolderPath, basename(assetPath))))
  );

  // Copy and rewrite chunks in parallel
  await Promise.all(
    Array.from(allRequiredChunks).map(async (chunkPath) => {
      const chunkDest = join(chunksDestDir, basename(chunkPath));
      let chunkContent = await readFile(chunkPath, 'utf-8');
      chunkContent = rewriteChunkImports(chunkContent, './');
      await writeFile(chunkDest, chunkContent);

      // Copy source map if exists
      const chunkMapPath = `${chunkPath}.map`;
      if (existsSync(chunkMapPath)) {
        await copy(chunkMapPath, `${chunkDest}.map`);
      }
    })
  );

  // Copy entry source map
  const sourceMapPath = `${outputPath}.map`;
  if (existsSync(sourceMapPath)) {
    await copy(sourceMapPath, join(entrypoint.distFolderPath, 'index.js.map'));
  }

  // Create package.json for ESM
  await outputJSON(join(entrypoint.distFolderPath, 'package.json'), { type: 'module' });
};

/** Build chunk usage analysis from metafile metadata and emitted sidecar source maps. */
const buildChunkAnalysisFromMetafile = (
  metafile: BuildMetafile,
  chunkUsageMap: Map<string, Set<string>>,
  metafileToAbsolutePath: Map<string, string>
): ChunkUsageAnalysis[] => {
  const analysis: ChunkUsageAnalysis[] = [];

  for (const [relativeChunkPath, lambdaNames] of chunkUsageMap) {
    const chunkMeta = metafile.outputs[relativeChunkPath];
    if (!chunkMeta) continue;

    // Convert to absolute path for file operations
    const absoluteChunkPath = resolveMetafileOutputPath(metafileToAbsolutePath, relativeChunkPath) ?? relativeChunkPath;

    const chunkName = basename(relativeChunkPath);
    const sourceMapPath = `${absoluteChunkPath}.map`;
    const sizeBytes = chunkMeta.bytes + (existsSync(sourceMapPath) ? statSync(sourceMapPath).size : 0);
    const usedByLambdas = Array.from(lambdaNames);
    const usageCount = usedByLambdas.length;
    const deduplicationValue = sizeBytes * (usageCount - 1);

    // Get chunk dependencies directly from metafile imports
    const dependsOn = chunkMeta.imports
      .filter((imp) => imp.path.includes('chunk-') && imp.path.endsWith('.js'))
      .map((imp) => basename(imp.path));

    analysis.push({
      chunkName,
      chunkPath: absoluteChunkPath,
      sizeBytes,
      usedByLambdas,
      usageCount,
      deduplicationValue,
      dependsOn
    });
  }

  // Sort by deduplication value (highest first) - best candidates for layers
  analysis.sort((a, b) => b.deduplicationValue - a.deduplicationValue);

  return analysis;
};
