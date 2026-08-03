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
import { existsSync } from 'node:fs';
import { basename, isAbsolute, join, posix, resolve } from 'node:path';
import { rewriteChunkImports } from './chunk-rewriter';
import { copy, ensureDir, outputJSON, readFile, writeFile } from 'fs-extra';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE, IGNORED_MODULES, NODE_BUILTIN_MODULES } from '../es/config';
import { findProjectRoot } from '../es/project-root';
import { formatBuildError } from './error-format';
import {
  createModuleResolver,
  determineIfAlias,
  ensureDefaultExport,
  ESM_SOURCE_MAP_BANNER,
  getInfoFromPackageJson,
  getTsconfigAliases
} from '../es/bundler-helpers';

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
    metafileToAbsolutePath,
    createPackagingError
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

  await ensureDir(sharedOutdir);
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
        __dirname: '__stp_dirname',
        __filename: '__stp_filename'
      },
      plugins: [bunFfiShimPlugin, analyzePlugin, nativeModulesPlugin],
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
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          return undefined;
        }

        const moduleName = getModuleName(args.path);
        tracker.resolvedModules.add(moduleName);

        // Skip built-in modules
        if (NODE_BUILTIN_MODULES.includes(moduleName) || args.path.startsWith('node:')) {
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
  return Array.from(
    new Set(Object.keys(metafile.inputs).filter((inputPath) => !inputPath.includes('node_modules')))
  ).map((inputPath) => ({ path: inputPath }));
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

/** Process lambda outputs using metafile for chunk dependency analysis */
const processLambdaOutputsWithMetafile = async ({
  entrypoints,
  metafile,
  tracker,
  sourceFiles,
  metafileToAbsolutePath,
  createPackagingError
}: {
  entrypoints: BuildSplitBundleOptions['entrypoints'];
  metafile: BuildMetafile;
  tracker: DependencyTracker;
  sourceFiles: Array<{ path: string }>;
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
      await ensureDir(ep.distFolderPath);
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
    const absoluteChunkPath = resolveMetafileOutputPath(metafileToAbsolutePath, relativeChunkPath) ?? relativeChunkPath;

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
