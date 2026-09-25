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
import type { TextEdit } from '../es/source-map-edits';
import { assertNoRootChunkImports, getChunkImportEdits } from './chunk-rewriter';
import { copy, emptyDir, ensureDir, outputJSON, readFile } from 'fs-extra';
import { IGNORED_MODULES, NODE_BUILTIN_MODULES } from '../es/config';
import { findProjectRoot } from '../es/project-root';
import { formatBuildError } from './error-format';
import {
  createModuleResolver,
  ESM_SOURCE_MAP_BANNER,
  getDefaultExportEdit,
  getTsconfigAliases,
  isRequireImportKind,
  packageEntryConditions,
  resolveWithRequireCondition
} from '../es/bundler-helpers';
import { createBunFfiShimPlugin, createNativeNodeModulesPlugin, isBareImportSpecifier } from '../es/bun-plugins';
import { classifyBeforeResolution, classifyResolvedModule, getModuleName } from '../es/import-classification';
import { getBunMinifyConfig } from '../es/minify';
import { writeEditedJavaScript } from '../es/source-map-edits';
import { resolvePrisma } from '../bundlers/es/utils';
import { getLambdaAssetReferenceEdits } from '../artifact/lambda-assets';

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
  minifyIdentifiers = false,
  sourceMaps = 'external',
  sourceMapBannerType = 'pre-compiled',
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  bundleAwsSdk = false,
  isLambda = true,
  nodeTarget,
  installDependencies,
  createPackagingError
}: BuildSplitBundleOptions): Promise<SplitBundleResult> => {
  const startedAt = performance.now();

  // Install dependencies first
  await installDependencies();
  const installedAt = performance.now();

  // Setup tsconfig aliases and path resolution
  const aliases = tsConfigPath ? await getTsconfigAliases(tsConfigPath) : {};

  // Find monorepo root for resolving workspace package paths in resolver plugin.
  const monorepoRoot = await findProjectRoot(cwd);

  // Track dependencies during bundling (source files now come from metafile)
  const tracker = createDependencyTracker();
  const shouldIgnoreAllDeps = dependenciesToExcludeFromBundle.includes('*');

  // Build all entrypoints together with code splitting (with metafile enabled)
  const { buildResult, metafile, bunBuildStartedAt, bunBuildFinishedAt } = await executeBunBuild({
    entrypoints,
    sharedOutdir,
    cwd,
    monorepoRoot,
    ...(tsConfigPath ? { tsConfigPath } : {}),
    minify,
    minifyIdentifiers,
    sourceMaps,
    sourceMapBannerType,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    bundleAwsSdk,
    isLambda,
    nodeTarget,
    shouldIgnoreAllDeps,
    aliases,
    tracker,
    createPackagingError
  });

  // Separate entry files from chunk files
  const { entryFiles, chunkFiles, assetFiles } = categorizeOutputFiles(buildResult.outputs);

  // Build mapping from metafile relative paths to absolute paths on disk
  const metafileToAbsolutePath = buildMetafilePathMapping(buildResult.outputs, sharedOutdir);

  // Process lambdas using metafile for chunk dependency analysis
  const { lambdaOutputs, chunkUsageMap } = await processLambdaOutputsWithMetafile({
    entrypoints,
    cwd,
    metafile,
    tracker,
    assetFiles,
    javascriptFiles: [...entryFiles, ...chunkFiles].filter((path) => path.endsWith('.js')),
    metafileToAbsolutePath,
    createPackagingError
  });

  // Build chunk usage analysis from the metafile plus the sizes of the source maps as Bun emitted them.
  const chunkAnalysis = buildChunkAnalysisFromMetafile(
    metafile,
    chunkUsageMap,
    metafileToAbsolutePath,
    new Map(buildResult.outputs.filter(({ kind }) => kind === 'sourcemap').map(({ path, size }) => [path, size]))
  );
  const finishedAt = performance.now();

  return {
    lambdaOutputs,
    sharedChunkCount: chunkFiles.length,
    timings: {
      installMs: installedAt - startedAt,
      setupMs: bunBuildStartedAt - installedAt,
      bunBuildMs: bunBuildFinishedAt - bunBuildStartedAt,
      postprocessMs: finishedAt - bunBuildFinishedAt,
      totalMs: finishedAt - startedAt
    },
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
  minifyIdentifiers,
  sourceMaps,
  sourceMapBannerType,
  excludeDependencies,
  dependenciesToExcludeFromBundle,
  bundleAwsSdk,
  isLambda,
  nodeTarget,
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
  minifyIdentifiers: boolean;
  sourceMaps: 'inline' | 'external' | 'disabled';
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  excludeDependencies: string[];
  dependenciesToExcludeFromBundle: string[];
  bundleAwsSdk: boolean;
  isLambda: boolean | undefined;
  nodeTarget: number | string | undefined;
  shouldIgnoreAllDeps: boolean;
  aliases: Record<string, string>;
  tracker: DependencyTracker;
  createPackagingError: BuildSplitBundleOptions['createPackagingError'];
}): Promise<{
  buildResult: Awaited<ReturnType<typeof Bun.build>>;
  metafile: BuildMetafile;
  /** `performance.now()` around the `Bun.build` call, so the caller can time it apart from setup and rewriting. */
  bunBuildStartedAt: number;
  bunBuildFinishedAt: number;
}> => {
  const analyzePlugin = createAnalyzePlugin({
    cwd,
    monorepoRoot,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    bundleAwsSdk,
    isLambda,
    nodeTarget,
    shouldIgnoreAllDeps,
    aliases,
    tracker
  });

  const nativeModulesPlugin = createNativeNodeModulesPlugin();
  const bunFfiShimPlugin = createBunFfiShimPlugin();
  const banner = await getSourceMapBanner(sourceMapBannerType);

  // A packaging manager can rebuild the same invocation paths in dev mode. Bun does not remove outputs that are no
  // longer emitted, so retaining this directory would leak stale chunks and source maps into later artifacts.
  await emptyDir(sharedOutdir);
  let result: Awaited<ReturnType<typeof Bun.build>>;
  const bunBuildStartedAt = performance.now();

  try {
    // Use monorepo root for module resolution if available, otherwise cwd
    const buildRoot = monorepoRoot || cwd;

    result = await Bun.build({
      entrypoints: entrypoints.map((ep) => ep.entryfilePath),
      outdir: sharedOutdir,
      target: 'node',
      format: 'esm',
      splitting: true,
      minify: getBunMinifyConfig({ minify, minifyIdentifiers }),
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
  const bunBuildFinishedAt = performance.now();

  if (!result.success) {
    const errors = result.logs
      .filter((log) => log.level === 'error')
      .map((log) => log.message)
      .join('\n');
    throw createPackagingError({
      message: `Split bundle build failed: ${errors}`
    });
  }

  /*
   * Point asset references at `/var/task`, and make each output's map match its file: moved with those edits, and with
   * `sources` relative to the map's own folder, which every later copy rebases from. Bun 1.4.1 writes a split map's
   * `sources` relative to the outdir instead. `synthetic-lambda-source-map-e2e` checks both.
   */
  const assetFiles = result.outputs.filter((output) => output.kind === 'asset').map(({ path }) => path);
  await Promise.all(
    result.outputs
      .filter(({ path }) => path.endsWith('.js'))
      .map(({ path }) =>
        writeEditedJavaScript({
          from: path,
          to: path,
          edits: (code) => getLambdaAssetReferenceEdits(code, assetFiles),
          sourcesDirectory: sharedOutdir,
          packaged: false
        })
      )
  );

  return {
    buildResult: result,
    metafile: result.metafile as BuildMetafile,
    bunBuildStartedAt,
    bunBuildFinishedAt
  };
};

// Module resolver is created per-build in createAnalyzePlugin

/**
 * Create plugin for analyzing and tracking dependencies.
 *
 * The decisions come from `es/import-classification`, which the per-Lambda bundler uses too. Only
 * the recording is local: one split build serves many Lambdas, so every answer is attributed to the
 * importer that asked.
 */
const createAnalyzePlugin = ({
  cwd,
  monorepoRoot,
  excludeDependencies,
  dependenciesToExcludeFromBundle,
  bundleAwsSdk,
  isLambda,
  nodeTarget,
  shouldIgnoreAllDeps,
  aliases,
  tracker
}: {
  cwd: string;
  monorepoRoot: string | null;
  excludeDependencies: string[];
  dependenciesToExcludeFromBundle: string[];
  bundleAwsSdk: boolean;
  isLambda: boolean | undefined;
  nodeTarget: number | string | undefined;
  shouldIgnoreAllDeps: boolean;
  aliases: Record<string, string>;
  tracker: DependencyTracker;
}): BunPlugin => {
  // Create module resolver with loose resolution (mimics esbuild behavior)
  const moduleResolver = createModuleResolver({ cwd, monorepoRoot });

  const markExternal = (name: string, note: string) => {
    if (!tracker.externalModules.some((module) => module.name === name)) {
      tracker.externalModules.push({ name, note });
    }
  };

  return {
    name: 'stp-analyze-deps',
    setup(build) {
      // Note: Source file tracking moved to metafile.inputs (more accurate, no plugin overhead)

      // Analyze and handle external dependencies
      build.onResolve({ filter: /^[^.]/ }, async (args): Promise<{ path: string; external?: boolean } | undefined> => {
        if (!isBareImportSpecifier(args.path)) return undefined;

        const moduleName = getModuleName(args.path);
        trackResolvedModule(tracker, args.importer, moduleName);

        const preResolution = classifyBeforeResolution({
          aliases,
          bundleAwsSdk,
          isLambda,
          moduleName,
          nodeTarget,
          specifier: args.path
        });
        if (preResolution.outcome === 'runtime-provided') {
          return { path: args.path, external: true };
        }
        if (preResolution.outcome !== 'continue') {
          return undefined;
        }

        // Find module using loose resolution (handles nested node_modules)
        const modulePath = moduleResolver.findModulePath(moduleName, args.importer);

        const verdict = await classifyResolvedModule({
          dependenciesToExcludeFromBundle,
          excludeDependencies,
          ignoredModules: IGNORED_MODULES,
          modulePath,
          moduleName,
          shouldIgnoreAllDeps
        });
        trackDependencies(tracker, args.importer, verdict.dependenciesToInstallInDocker);

        if (verdict.outcome === 'external') {
          markExternal(moduleName, verdict.note);
          /*
           * `verdict.alsoExternal` — the externalized package's own dependency tree — is
           * deliberately not applied here, and this is the one place the two bundlers decide
           * differently on purpose.
           *
           * The per-Lambda bundler externalizes those names too: its artifact has a single
           * installed tree, so whichever module reaches one finds it there. A split build serves
           * many Lambdas from one pass, and a native package is installed only into the layer of
           * the Lambdas that import it. Externalizing its dependency tree globally would leave a
           * Lambda that imports only the pure-JS dependency, and never the native package,
           * resolving it at runtime from a layer it does not have.
           *
           * The cost is a second copy of those modules inside the bundle. Removing it needs
           * per-importer externalization, which this build does not do yet.
           */
          return { path: args.path, external: true };
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
export const findAllChunksFromMetafile = (outputPath: string, metafile: BuildMetafile): Set<string> => {
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
          // A hash ending in "a" must not match the unrelated entrypoint a.js.
          return basename(normalizedPath) === basename(normalizedOutPath);
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
  const canonicalPath = existsSync(absolutePath) ? realpathSync(absolutePath) : absolutePath;
  const normalizedPath = transformToUnixPath(canonicalPath);
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

/**
 * Chooses the emitted file assets each function needs. Every reference to an asset reads `/var/task/<asset>`, even from
 * a chunk that later moves into a layer, so a function needs the assets named in its entry or in any chunk it loads.
 * An asset that no emitted JavaScript names has no known user, so it goes to every function, as it always has.
 */
const createAssetAttribution = async (assetFiles: string[], javascriptFiles: string[]) => {
  const referencedBy = new Map(assetFiles.map((asset) => [asset, new Set<string>()]));
  if (assetFiles.length > 0) {
    await Promise.all(
      javascriptFiles.map(async (javascriptFile) => {
        const contents = await readFile(javascriptFile, 'utf-8');
        for (const asset of assetFiles) {
          if (contents.includes(basename(asset))) referencedBy.get(asset)!.add(javascriptFile);
        }
      })
    );
  }
  return (closure: string[]) =>
    assetFiles.filter((asset) => {
      const users = referencedBy.get(asset)!;
      return users.size === 0 || closure.some((file) => users.has(file));
    });
};

/** Process lambda outputs using metafile for chunk dependency analysis */
const processLambdaOutputsWithMetafile = async ({
  entrypoints,
  cwd,
  metafile,
  tracker,
  assetFiles,
  javascriptFiles,
  metafileToAbsolutePath,
  createPackagingError
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  cwd: string;
  metafile: BuildMetafile;
  tracker: DependencyTracker;
  assetFiles: string[];
  /** Every emitted entry and chunk file, already rewritten to read assets from `/var/task`. */
  javascriptFiles: string[];
  metafileToAbsolutePath: Map<string, string>;
  createPackagingError: BuildSplitBundleOptions['createPackagingError'];
}): Promise<{
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  chunkUsageMap: Map<string, Set<string>>;
}> => {
  const lambdaOutputs = new Map<string, LambdaSplitOutput>();
  const chunkUsageMap = new Map<string, Set<string>>();
  const assetsFor = await createAssetAttribution(assetFiles, javascriptFiles);

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

      const lambdaAssetFiles = assetsFor([absoluteOutputPath, ...absoluteChunkPaths]);
      // Process the entry file (still need to read for rewriting imports)
      await processLambdaEntrypointWithMetafile({
        entrypoint,
        outputPath: absoluteOutputPath,
        allRequiredChunks: absoluteChunkPaths,
        assetFiles: lambdaAssetFiles
      });

      const resolvedModules = getTrackedModulesForInputs(tracker, inputPaths);

      /*
       * Prisma's query engine is a binary no import reaches: the client loads it by path at run time, so
       * the bundler never sees it and it is not in this Lambda's package. The per-Lambda buildpack copies
       * it in after bundling; a split build has to do the same, or the function deploys and then fails its
       * first invocation with "Query engine not found".
       */
      if (resolvedModules.some((module) => module.startsWith('@prisma/'))) {
        await resolvePrisma({
          distFolderPath: entrypoint.distFolderPath,
          workingDir: cwd,
          workloadName: entrypoint.name,
          // Split output is a Lambda package, and Lambda runs on Amazon Linux with glibc.
          isAlpine: false,
          isLambda: true,
          createPackagingError: (details) => createPackagingError(details)
        });
      }

      lambdaOutputs.set(entrypoint.name, {
        name: entrypoint.name,
        entryFile: join(entrypoint.distFolderPath, 'index.js'),
        files: [
          join(entrypoint.distFolderPath, 'index.js'),
          ...Array.from(absoluteChunkPaths, (path) => join(entrypoint.distFolderPath, 'chunks', basename(path))),
          ...lambdaAssetFiles.map((path) => join(entrypoint.distFolderPath, basename(path)))
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

/** The edit that renames the map a file's `sourceMappingURL` comment names. */
const getSourceMappingUrlEdit = (code: string, mapName: string): TextEdit | null => {
  const match = /\/\/# sourceMappingURL=.+\.js\.map/.exec(code);
  return match && { start: match.index, end: match.index + match[0].length, text: `//# sourceMappingURL=${mapName}` };
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
  /*
   * The entry imports its chunks from the function's own `chunks/`, exports its handler as default too, and names its
   * map after its new name. Its map, and each chunk's, moves with those edits; the packaged copies omit
   * `sourcesContent`, while the shared outdir keeps the full maps.
   */
  const entryContent = await writeEditedJavaScript({
    from: outputPath,
    to: join(entrypoint.distFolderPath, 'index.js'),
    edits: (code) => [
      ...getChunkImportEdits(code, () => './chunks/'),
      ...[getDefaultExportEdit(code), getSourceMappingUrlEdit(code, 'index.js.map')].filter((edit) => edit !== null)
    ],
    packaged: true
  });
  assertNoRootChunkImports(entryContent);

  const chunksDestDir = join(entrypoint.distFolderPath, 'chunks');

  await Promise.all(
    assetFiles.map((assetPath) => copy(assetPath, join(entrypoint.distFolderPath, basename(assetPath))))
  );

  await Promise.all(
    Array.from(allRequiredChunks).map(async (chunkPath) => {
      const chunkContent = await writeEditedJavaScript({
        from: chunkPath,
        to: join(chunksDestDir, basename(chunkPath)),
        edits: (code) => getChunkImportEdits(code, () => './'),
        packaged: true
      });
      assertNoRootChunkImports(chunkContent);
    })
  );

  // Create package.json for ESM
  await outputJSON(join(entrypoint.distFolderPath, 'package.json'), { type: 'module' });
};

/**
 * Build chunk usage analysis from metafile metadata and emitted sidecar source maps. A map's size is the size Bun
 * emitted it with (`sourceMapBytes`, by path), not its size on disk after the asset and `sources` edits, so layer
 * assignment does not depend on those edits.
 */
const buildChunkAnalysisFromMetafile = (
  metafile: BuildMetafile,
  chunkUsageMap: Map<string, Set<string>>,
  metafileToAbsolutePath: Map<string, string>,
  sourceMapBytes: Map<string, number>
): ChunkUsageAnalysis[] => {
  const analysis: ChunkUsageAnalysis[] = [];

  for (const [relativeChunkPath, lambdaNames] of chunkUsageMap) {
    const chunkMeta = metafile.outputs[relativeChunkPath];
    if (!chunkMeta) continue;

    // Convert to absolute path for file operations
    const absoluteChunkPath = resolveMetafileOutputPath(metafileToAbsolutePath, relativeChunkPath) ?? relativeChunkPath;

    const chunkName = basename(relativeChunkPath);
    const sizeBytes = chunkMeta.bytes + (sourceMapBytes.get(`${absoluteChunkPath}.map`) ?? 0);
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
