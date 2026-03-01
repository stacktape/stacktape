/**
 * Bundles multiple Lambda entrypoints together with code splitting enabled,
 * automatically creating shared chunks for code used by multiple functions.
 *
 * Uses Bun's metafile feature for efficient chunk dependency analysis
 * instead of reading and parsing chunk files manually.
 */
import type { BunPlugin } from 'bun';
import type { PackageJsonDepsInfo } from '../utils';
import type {
  BuildMetafile,
  BuildSplitBundleOptions,
  ChunkUsageAnalysis,
  LambdaSplitOutput,
  ProgressLogger,
  SplitBundleResult
} from './types';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import { transformToUnixPath } from '@shared/utils/fs-utils';
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
import { rewriteChunkImports } from './chunk-rewriter';

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
    minify,
    sourceMaps,
    sourceMapBannerType,
    excludeDependencies,
    dependenciesToExcludeFromBundle,
    shouldIgnoreAllDeps,
    aliases,
    tracker
  });

  // Extract source files from metafile (replaces onLoad plugin tracking)
  const sourceFiles = getSourceFilesFromMetafile(metafile);

  // Separate entry files from chunk files
  const { chunkFiles } = categorizeOutputFiles(buildResult.outputs);

  // Build mapping from metafile relative paths to absolute paths on disk
  const metafileToAbsolutePath = buildMetafilePathMapping(buildResult.outputs, sharedOutdir);

  // Process lambdas using metafile for chunk dependency analysis
  const { lambdaOutputs, chunkUsageMap } = await processLambdaOutputsWithMetafile({
    entrypoints,
    metafile,
    tracker,
    sourceFiles,
    metafileToAbsolutePath
  });

  // Build chunk usage analysis from metafile (no file reading needed)
  const chunkAnalysis = buildChunkAnalysisFromMetafile(metafile, chunkUsageMap, metafileToAbsolutePath);

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

/** Dependency tracking state during bundling (source files now from metafile) */
type DependencyTracker = {
  resolvedModules: Set<string>;
  dependenciesToInstallInDocker: PackageJsonDepsInfo[];
  externalModules: Array<{ name: string; note: string }>;
};

const createDependencyTracker = (): DependencyTracker => ({
  resolvedModules: new Set(),
  dependenciesToInstallInDocker: [],
  externalModules: []
});

/** Execute Bun.build with all plugins and configuration, returns build result and metafile */
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
      },
      // Enable metafile for efficient chunk dependency analysis
      metafile: true
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

    return {
      buildResult: result,
      metafile: result.metafile as BuildMetafile
    };
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
      // Note: Source file tracking moved to metafile.inputs (more accurate, no plugin overhead)

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
          if (modulePath) {
            const pkgInfo = await getInfoFromPackageJson({
              directoryPath: modulePath,
              parentModule: null,
              dependencyType: 'root'
            }).catch(() => null);
            if (pkgInfo) {
              tracker.dependenciesToInstallInDocker.push({ ...pkgInfo, note: 'IGNORED' });
            }
          }
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

/** Extract source files from metafile inputs (replaces onLoad plugin tracking) */
const getSourceFilesFromMetafile = (metafile: BuildMetafile): Array<{ path: string }> => {
  return Object.keys(metafile.inputs)
    .filter((inputPath) => !inputPath.includes('node_modules'))
    .filter(filterDuplicates)
    .map((inputPath) => ({ path: inputPath }));
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

/** Check if two paths refer to the same file (handles absolute vs relative, different separators) */
const pathsMatch = (path1: string, path2: string): boolean => {
  const norm1 = transformToUnixPath(path1);
  const norm2 = transformToUnixPath(path2);

  // Exact match
  if (norm1 === norm2) return true;

  // Check if one ends with the other (handles absolute vs relative)
  // e.g., "C:/Projects/console-app/server/lambda.ts" vs "../console-app/server/lambda.ts"
  if (norm1.endsWith(norm2) || norm2.endsWith(norm1)) return true;

  // Extract the significant path portion (after any ../ or drive letter)
  // and compare the last N segments
  const getSignificantPath = (p: string): string => {
    // Remove leading ../ segments and drive letters
    return p.replace(/^(\.\.\/)+/, '').replace(/^[A-Za-z]:\//, '');
  };

  const sig1 = getSignificantPath(norm1);
  const sig2 = getSignificantPath(norm2);

  if (sig1 === sig2) return true;
  if (sig1.endsWith(sig2) || sig2.endsWith(sig1)) return true;

  return false;
};

/** Process lambda outputs using metafile for chunk dependency analysis */
const processLambdaOutputsWithMetafile = async ({
  entrypoints,
  metafile,
  tracker,
  sourceFiles,
  metafileToAbsolutePath
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  metafile: BuildMetafile;
  tracker: DependencyTracker;
  sourceFiles: Array<{ path: string }>;
  metafileToAbsolutePath: Map<string, string>;
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
      // Normalize paths for matching
      entryPointToOutput.set(transformToUnixPath(outputMeta.entryPoint), outputPath);
    }
  }

  // Pre-create all lambda directories
  await Promise.all(
    entrypoints.map(async (ep) => {
      await ensureDir(ep.distFolderPath);
      await ensureDir(join(ep.distFolderPath, 'chunks'));
    })
  );

  // Process all lambdas in parallel
  await Promise.all(
    entrypoints.map(async (entrypoint) => {
      // Find output file for this entrypoint using metafile's entryPoint field
      const normalizedEntryPath = transformToUnixPath(entrypoint.entryfilePath);
      let outputPath: string | undefined;

      // Try to find matching entry in metafile
      for (const [entryPath, outPath] of entryPointToOutput) {
        if (pathsMatch(normalizedEntryPath, entryPath)) {
          outputPath = outPath;
          break;
        }
      }

      if (!outputPath) {
        throw getError({
          type: 'PACKAGING',
          message: `Could not find output for lambda: ${entrypoint.name}.\nEntry: ${normalizedEntryPath}\nAvailable entries: ${Array.from(entryPointToOutput.keys()).join(', ')}`
        });
      }

      // Find all required chunks using metafile (no file reading needed!)
      const allRequiredChunks = findAllChunksFromMetafile(outputPath, metafile);

      // Track chunk usage for layer analysis
      for (const chunk of allRequiredChunks) {
        if (!chunkUsageMap.has(chunk)) {
          chunkUsageMap.set(chunk, new Set());
        }
        chunkUsageMap.get(chunk)!.add(entrypoint.name);
      }

      // Convert metafile relative paths to absolute paths for file operations
      const absoluteOutputPath = metafileToAbsolutePath.get(outputPath);
      if (!absoluteOutputPath) {
        throw getError({
          type: 'PACKAGING',
          message: `Could not resolve absolute path for: ${outputPath}`
        });
      }

      const absoluteChunkPaths = new Set<string>();
      for (const chunkPath of allRequiredChunks) {
        const absPath = metafileToAbsolutePath.get(chunkPath);
        if (absPath) {
          absoluteChunkPaths.add(absPath);
        }
      }

      // Process the entry file (still need to read for rewriting imports)
      await processLambdaEntrypointWithMetafile({
        entrypoint,
        outputPath: absoluteOutputPath,
        allRequiredChunks: absoluteChunkPaths
      });

      lambdaOutputs.set(entrypoint.name, {
        name: entrypoint.name,
        entryFile: join(entrypoint.distFolderPath, 'index.js'),
        files: [join(entrypoint.distFolderPath, 'index.js')],
        sourceFiles,
        dependenciesToInstallInDocker: tracker.dependenciesToInstallInDocker,
        resolvedModules: Array.from(tracker.resolvedModules)
      });
    })
  );

  return { lambdaOutputs, chunkUsageMap };
};

/** Process a single lambda entrypoint (simplified - chunk deps already known from metafile) */
const processLambdaEntrypointWithMetafile = async ({
  entrypoint,
  outputPath,
  allRequiredChunks
}: {
  entrypoint: BuildSplitBundleOptions['entrypoints'][0];
  outputPath: string;
  allRequiredChunks: Set<string>;
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

/** Build chunk usage analysis from metafile (no file reading needed) */
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
    const absoluteChunkPath = metafileToAbsolutePath.get(relativeChunkPath) || relativeChunkPath;

    const chunkName = basename(relativeChunkPath);
    const sizeBytes = chunkMeta.bytes; // Direct from metafile - no filesystem call!
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
