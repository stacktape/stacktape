/**
 * Bundles multiple Lambda entrypoints together with code splitting enabled,
 * automatically creating shared chunks for code used by multiple functions.
 */
import type { BunPlugin } from 'bun';
import type { PackageJsonDepsInfo } from '../utils';
import type {
  BuildSplitBundleOptions,
  ChunkUsageAnalysis,
  LambdaSplitOutput,
  ProgressLogger,
  SplitBundleResult
} from './types';
import { existsSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import { builtinModules, filterDuplicates, getError, getTsconfigAliases } from '@shared/utils/misc';
import { findProjectRoot } from '@shared/utils/monorepo';
import { copy, ensureDir, outputJSON, readFile, writeFile } from 'fs-extra';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE, IGNORED_MODULES } from '../config';
import {
  createModuleResolver,
  determineIfAlias,
  ensureDefaultExport,
  ESM_SOURCE_MAP_BANNER,
  getInfoFromPackageJson
} from '../utils';
import { findChunkImports, rewriteChunkImports } from './chunk-rewriter';

/**
 * Bundle multiple Lambda entrypoints together using Bun's code splitting.
 *
 * Output structure:
 * - sharedOutdir/
 *   - [relative-path]/index.js (entry points)
 *   - chunks/chunk-[hash].js (shared code)
 *
 * Each Lambda package includes its entry file + all chunks it imports.
 */
export const buildSplitBundle = async ({
  entrypoints,
  sharedOutdir,
  cwd,
  tsConfigPath,
  nodeTarget: _nodeTarget,
  minify = true,
  sourceMaps = 'external',
  sourceMapBannerType = 'pre-compiled',
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  progressLogger
}: BuildSplitBundleOptions): Promise<SplitBundleResult> => {
  const startTime = Date.now();

  // Install dependencies first
  await dependencyInstaller.install({
    rootProjectDirPath: cwd,
    progressLogger: progressLogger ?? createNoopLogger()
  });

  // Setup tsconfig aliases and path resolution
  const aliases = tsConfigPath ? await getTsconfigAliases(tsConfigPath) : {};

  // Find monorepo root for resolving workspace packages
  const monorepoRoot = await findProjectRoot(cwd);

  // Track dependencies and source files during bundling
  const tracker = createDependencyTracker();
  const shouldIgnoreAllDeps = dependenciesToExcludeFromBundle.includes('*');

  // Build all entrypoints together with code splitting
  const buildResult = await executeBunBuild({
    entrypoints,
    sharedOutdir,
    cwd,
    monorepoRoot,
    minify,
    sourceMaps,
    sourceMapBannerType,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    shouldIgnoreAllDeps,
    aliases,
    tracker
  });

  // Separate entry files from chunk files
  const { entryFiles, chunkFiles } = categorizeOutputFiles(buildResult.outputs);

  // Process each lambda and track chunk usage
  // Use monorepo root for path matching since Bun outputs files relative to buildRoot
  const buildRoot = monorepoRoot || cwd;
  const { lambdaOutputs, chunkUsageMap, chunkContentCache } = await processLambdaOutputs({
    entrypoints,
    entryFiles,
    chunkFiles,
    sharedOutdir,
    buildRoot,
    tracker
  });

  // Build chunk usage analysis for layer optimization (includes dependency tracking)
  const chunkAnalysis = buildChunkAnalysis(chunkUsageMap, chunkContentCache, chunkFiles);

  return {
    lambdaOutputs,
    sharedChunkCount: chunkFiles.length,
    bundleTimeMs: Date.now() - startTime,
    chunkAnalysis
  };
};

/** Creates a no-op progress logger */
const createNoopLogger = (): ProgressLogger => ({
  eventContext: {},
  startEvent: async () => {},
  updateEvent: async () => {},
  finishEvent: async () => {}
});

/** Dependency tracking state during bundling */
type DependencyTracker = {
  resolvedModules: Set<string>;
  dependenciesToInstallInDocker: PackageJsonDepsInfo[];
  externalModules: Array<{ name: string; note: string }>;
  sourceFiles: Set<string>;
};

const createDependencyTracker = (): DependencyTracker => ({
  resolvedModules: new Set(),
  dependenciesToInstallInDocker: [],
  externalModules: [],
  sourceFiles: new Set()
});

/** Execute Bun.build with all plugins and configuration */
const executeBunBuild = async ({
  entrypoints,
  sharedOutdir,
  cwd,
  monorepoRoot,
  minify,
  sourceMaps,
  sourceMapBannerType,
  excludeDependencies,
  dependenciesToExcludeFromBundle,
  shouldIgnoreAllDeps,
  aliases,
  tracker
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  sharedOutdir: string;
  cwd: string;
  monorepoRoot: string | null;
  minify: boolean;
  sourceMaps: 'inline' | 'external' | 'disabled';
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  excludeDependencies: string[];
  dependenciesToExcludeFromBundle: string[];
  shouldIgnoreAllDeps: boolean;
  aliases: Record<string, string>;
  tracker: DependencyTracker;
}): Promise<Awaited<ReturnType<typeof Bun.build>>> => {
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
  const banner = await getSourceMapBanner(sourceMapBannerType);

  await ensureDir(sharedOutdir);

  try {
    // Use monorepo root for module resolution if available, otherwise cwd
    const buildRoot = monorepoRoot || cwd;

    const result = await Bun.build({
      entrypoints: entrypoints.map((ep) => ep.entryfilePath),
      outdir: sharedOutdir,
      target: 'node',
      format: 'esm',
      splitting: true,
      minify,
      sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
      external: ['fsevents', ...tracker.externalModules.map((m) => m.name)],
      define: {
        __dirname: '__stp_dirname',
        __filename: '__stp_filename'
      },
      plugins: [analyzePlugin, nativeModulesPlugin],
      root: buildRoot,
      banner: sourceMapBannerType === 'pre-compiled' && banner ? banner : undefined,
      naming: {
        entry: '[dir]/[name].js',
        chunk: 'chunks/chunk-[hash].js'
      }
    });

    if (!result.success) {
      const errors = result.logs
        .filter((log) => log.level === 'error')
        .map((log) => log.message)
        .join('\n');
      throw getError({
        type: 'PACKAGING',
        message: `Split bundle build failed: ${errors}`
      });
    }

    return result;
  } catch (err: any) {
    const errorDetails = err.errors
      ? err.errors.map((e: any) => e?.message || e?.toString()).join('\n')
      : err.message || err.toString();
    throw getError({
      type: 'PACKAGING',
      message: `Split bundle failed: ${errorDetails}`,
      hint: 'Check that all entrypoint files exist and are valid TypeScript/JavaScript.'
    });
  }
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
      // Track source files
      build.onLoad({ filter: /\.(ts|tsx|js|jsx|mjs|cjs)$/ }, async (args) => {
        tracker.sourceFiles.add(args.path);
        return undefined;
      });

      // Analyze and handle external dependencies
      build.onResolve({ filter: /^[^.]/ }, async (args): Promise<{ path: string; external?: boolean } | undefined> => {
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          return undefined;
        }

        const moduleName = getModuleName(args.path);
        tracker.resolvedModules.add(moduleName);

        // Skip built-in modules
        if (builtinModules.includes(moduleName) || args.path.startsWith('node:')) {
          return undefined;
        }

        // Already marked as external
        if (tracker.externalModules.find((m) => m.name === moduleName)) {
          return { path: args.path, external: true };
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
            tracker.dependenciesToInstallInDocker.push({ ...pkgInfo, note: 'WILDCARD_EXTERNALIZED' });
          }
          tracker.externalModules.push({ name: moduleName, note: 'WILDCARD_EXTERNALIZED' });
          return { path: args.path, external: true };
        }

        // Handle ignored modules
        if (IGNORED_MODULES.concat(excludeDependencies).includes(moduleName)) {
          tracker.externalModules.push({ name: moduleName, note: 'IGNORED' });
          return { path: args.path, external: true };
        }

        // Analyze dependency for native binaries
        if (modulePath) {
          const { dependenciesToInstallInDocker, allExternalDeps } = await analyzeDependency({
            dependency: { name: moduleName, path: modulePath },
            dependenciesToExcludeFromBundle
          });

          tracker.dependenciesToInstallInDocker.push(...dependenciesToInstallInDocker);

          if (dependenciesToInstallInDocker.find((dep) => dep.name === moduleName)) {
            tracker.externalModules.push({ name: moduleName, note: 'INSTALLED_IN_DOCKER' });
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
  return firstPart.startsWith('@') ? `${firstPart}/${secondPart}` : firstPart;
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

/** Categorize build outputs into entry files and chunk files */
const categorizeOutputFiles = (outputs: Array<{ path: string }>): { entryFiles: string[]; chunkFiles: string[] } => {
  const entryFiles: string[] = [];
  const chunkFiles: string[] = [];

  for (const output of outputs) {
    const outputPath = output.path;
    if (outputPath.includes('chunks/') || outputPath.includes('chunks\\')) {
      chunkFiles.push(outputPath);
    } else if (outputPath.endsWith('.js')) {
      entryFiles.push(outputPath);
    }
  }

  return { entryFiles, chunkFiles };
};

/** Process lambda outputs and track chunk usage */
const processLambdaOutputs = async ({
  entrypoints,
  entryFiles,
  chunkFiles,
  sharedOutdir,
  buildRoot,
  tracker
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  entryFiles: string[];
  chunkFiles: string[];
  sharedOutdir: string;
  buildRoot: string;
  tracker: DependencyTracker;
}): Promise<{
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  chunkUsageMap: Map<string, Set<string>>;
  chunkContentCache: Map<string, string>;
}> => {
  const lambdaOutputs = new Map<string, LambdaSplitOutput>();
  const chunkUsageMap = new Map<string, Set<string>>();

  // Pre-read all chunk files once (they're shared across lambdas)
  const chunkContentCache = new Map<string, string>();
  await Promise.all(
    chunkFiles.map(async (chunkPath) => {
      const content = await readFile(chunkPath, 'utf-8');
      chunkContentCache.set(chunkPath, content);
    })
  );

  // Pre-create all lambda directories BEFORE parallel processing to avoid ensureDir contention
  await Promise.all(
    entrypoints.map(async (ep) => {
      await ensureDir(ep.distFolderPath);
      await ensureDir(join(ep.distFolderPath, 'chunks'));
    })
  );

  // Process all lambdas in parallel
  const results = await Promise.all(
    entrypoints.map((entrypoint) =>
      processLambdaEntrypoint({
        entrypoint,
        entryFiles,
        chunkFiles,
        sharedOutdir,
        buildRoot,
        chunkContentCache
      })
    )
  );

  // Collect results
  for (let i = 0; i < entrypoints.length; i++) {
    const entrypoint = entrypoints[i];
    const { allRequiredChunks } = results[i];

    // Track chunk usage
    for (const chunk of allRequiredChunks) {
      if (!chunkUsageMap.has(chunk)) {
        chunkUsageMap.set(chunk, new Set());
      }
      chunkUsageMap.get(chunk)!.add(entrypoint.name);
    }

    lambdaOutputs.set(entrypoint.name, {
      name: entrypoint.name,
      entryFile: join(entrypoint.distFolderPath, 'index.js'),
      files: [join(entrypoint.distFolderPath, 'index.js')],
      sourceFiles: Array.from(tracker.sourceFiles)
        .filter(filterDuplicates)
        .map((p) => ({ path: p })),
      dependenciesToInstallInDocker: tracker.dependenciesToInstallInDocker,
      resolvedModules: Array.from(tracker.resolvedModules)
    });
  }

  return { lambdaOutputs, chunkUsageMap, chunkContentCache };
};

/** Process a single lambda entrypoint */
const processLambdaEntrypoint = async ({
  entrypoint,
  entryFiles,
  chunkFiles,
  sharedOutdir,
  buildRoot,
  chunkContentCache
}: {
  entrypoint: BuildSplitBundleOptions['entrypoints'][0];
  entryFiles: string[];
  chunkFiles: string[];
  sharedOutdir: string;
  buildRoot: string;
  chunkContentCache: Map<string, string>;
}): Promise<{
  entryFile: string;
  allRequiredChunks: Set<string>;
}> => {
  // Find output file matching input entrypoint
  // Use buildRoot (monorepoRoot or cwd) since Bun outputs files relative to it
  const inputRelative = relative(buildRoot, entrypoint.entryfilePath)
    .replace(/\.(ts|tsx|jsx|mjs)$/, '.js')
    .replace(/\\/g, '/');

  const entryFile = entryFiles.find((ef) => {
    const efRelative = relative(sharedOutdir, ef).replace(/\\/g, '/');
    return efRelative === inputRelative;
  });

  if (!entryFile) {
    const availableFiles = entryFiles.map((ef) => relative(sharedOutdir, ef).replace(/\\/g, '/'));
    throw getError({
      type: 'PACKAGING',
      message: `Could not find output file for lambda: ${entrypoint.name}.\nExpected: ${inputRelative}\nAvailable: ${availableFiles.join(', ')}`
    });
  }

  // Find all required chunks (direct and transitive) using cached content
  let entryContent = await readFile(entryFile, 'utf-8');
  const allRequiredChunks = findAllRequiredChunksSync(entryContent, chunkFiles, chunkContentCache);

  // Rewrite chunk imports
  entryContent = rewriteChunkImports(entryContent, './chunks/');

  // Ensure default export exists - if user exports `handler` but not `default`, re-export it
  entryContent = ensureDefaultExport(entryContent);

  // Fix sourceMappingURL to point to index.js.map (Bun uses original entry name)
  entryContent = entryContent.replace(/\/\/# sourceMappingURL=.+\.js\.map/, '//# sourceMappingURL=index.js.map');

  // Write entry file
  const destIndexPath = join(entrypoint.distFolderPath, 'index.js');
  await writeFile(destIndexPath, entryContent);

  const chunksDestDir = join(entrypoint.distFolderPath, 'chunks');

  // Copy chunks to lambda package in parallel
  await Promise.all(
    Array.from(allRequiredChunks).map(async (chunk) => {
      const chunkDest = join(chunksDestDir, basename(chunk));
      const chunkContent = rewriteChunkImports(chunkContentCache.get(chunk)!, './');
      await writeFile(chunkDest, chunkContent);
    })
  );

  // Copy source maps
  await Promise.all(
    Array.from(allRequiredChunks).map(async (chunk) => {
      const chunkDest = join(chunksDestDir, basename(chunk));
      const chunkMapPath = `${chunk}.map`;
      if (existsSync(chunkMapPath)) {
        await copy(chunkMapPath, `${chunkDest}.map`);
      }
    })
  );
  const sourceMapPath = `${entryFile}.map`;
  if (existsSync(sourceMapPath)) {
    await copy(sourceMapPath, join(entrypoint.distFolderPath, 'index.js.map'));
  }

  // Create package.json for ESM
  await outputJSON(join(entrypoint.distFolderPath, 'package.json'), { type: 'module' });

  return { entryFile, allRequiredChunks };
};

/** Find all chunks required by entry content (including transitive dependencies) - sync version using cache */
const findAllRequiredChunksSync = (
  entryContent: string,
  chunkFiles: string[],
  chunkContentCache: Map<string, string>
): Set<string> => {
  const directChunks = findChunkImports(entryContent, chunkFiles);
  const allChunks = new Set(directChunks);
  const toProcess = [...directChunks];
  const processed = new Set<string>();

  while (toProcess.length > 0) {
    const chunk = toProcess.pop()!;
    if (processed.has(chunk)) continue;
    processed.add(chunk);

    const chunkContent = chunkContentCache.get(chunk);
    if (!chunkContent) continue;

    const nestedChunks = findChunkImports(chunkContent, chunkFiles);
    for (const nested of nestedChunks) {
      if (!allChunks.has(nested)) {
        allChunks.add(nested);
        toProcess.push(nested);
      }
    }
  }

  return allChunks;
};

/** Build chunk usage analysis for layer optimization */
const buildChunkAnalysis = (
  chunkUsageMap: Map<string, Set<string>>,
  chunkContentCache: Map<string, string>,
  allChunkPaths: string[]
): ChunkUsageAnalysis[] => {
  const analysis: ChunkUsageAnalysis[] = [];

  for (const [chunkPath, lambdaNames] of chunkUsageMap) {
    const chunkName = basename(chunkPath);
    const sizeBytes = Bun.file(chunkPath).size;
    const usedByLambdas = Array.from(lambdaNames);
    const usageCount = usedByLambdas.length;
    const deduplicationValue = sizeBytes * (usageCount - 1);

    // Find which other chunks this chunk depends on
    const chunkContent = chunkContentCache.get(chunkPath) || '';
    const dependsOnPaths = findChunkImports(chunkContent, allChunkPaths);
    const dependsOn = dependsOnPaths.map((p) => basename(p));

    analysis.push({
      chunkName,
      chunkPath,
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
