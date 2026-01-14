/**
 * Split Bundler - Uses Bun's code splitting to bundle multiple Lambda entrypoints together.
 *
 * This approach bundles all Lambda functions in a single Bun.build() call with splitting enabled.
 * Bun automatically creates shared chunks for code that's used by multiple entrypoints.
 *
 * Output structure:
 * - outdir/
 *   - lambda1.js (entry point, imports chunks)
 *   - lambda2.js (entry point, imports chunks)
 *   - chunk-abc123.js (shared code)
 *   - chunk-def456.js (shared code)
 *
 * Each Lambda package includes its entry file + all chunks it imports.
 *
 * Note: We create wrapper entrypoint files with unique names (using Lambda names) because
 * multiple lambdas may have the same original filename (e.g., index.ts in different folders).
 * Bun's naming uses [name] which is just the basename, causing conflicts.
 */

import type { BunPlugin } from 'bun';
import type { PackageJsonDepsInfo } from './utils';
import { existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { SOURCE_MAP_INSTALL_DIST_PATH } from '@shared/naming/project-fs-paths';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import { getFirstExistingPath, isFileAccessible } from '@shared/utils/fs-utils';
import { builtinModules, filterDuplicates, getError, getTsconfigAliases } from '@shared/utils/misc';
import { copy, ensureDir, outputJSON, readdir, readFile, remove, writeFile } from 'fs-extra';
import { DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE, IGNORED_MODULES } from './config';
import { determineIfAlias, getInfoFromPackageJson, getLockFileData } from './utils';

export type LambdaEntrypoint = {
  /** Lambda function name */
  name: string;
  /** Absolute path to the entry file */
  entryfilePath: string;
  /** Job name for packaging output */
  jobName: string;
  /** Target folder for this lambda's output */
  distFolderPath: string;
};

export type SplitBundleResult = {
  /** Map of lambda name -> output info */
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  /** Total number of shared chunks created */
  sharedChunkCount: number;
  /** Time taken to bundle (ms) */
  bundleTimeMs: number;
  /** Chunk usage analysis for layer optimization */
  chunkAnalysis: ChunkUsageAnalysis[];
};

export type ChunkUsageAnalysis = {
  /** Chunk filename (e.g., "chunk-abc123.js") */
  chunkName: string;
  /** Full path to the chunk file in shared outdir */
  chunkPath: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Lambda names that use this chunk */
  usedByLambdas: string[];
  /** Number of lambdas using this chunk */
  usageCount: number;
  /** Deduplication value: sizeBytes * (usageCount - 1) - bytes saved if put in layer */
  deduplicationValue: number;
};

/** Layer assignment for a chunk */
export type ChunkLayerAssignment = {
  chunkName: string;
  chunkPath: string;
  /** Layer number (1-5) or 0 if chunk stays in lambda package */
  layerNumber: number;
};

/** Configuration for layer assignment heuristics */
export type LayerConfig = {
  /** Minimum number of lambdas that must use a chunk for it to go in a layer */
  minUsageCount: number;
  /** Minimum chunk size (bytes) to consider for layer */
  minChunkSize: number;
  /** Maximum number of layers to create (1-5) */
  maxLayers: number;
  /** Maximum size per layer in bytes (AWS limit is 250MB unzipped) */
  maxLayerSize: number;
};

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  minUsageCount: 3, // Chunk must be used by at least 3 lambdas
  minChunkSize: 1024, // At least 1KB
  maxLayers: 3, // Use up to 3 layers (leave 2 for user's custom layers)
  maxLayerSize: 50 * 1024 * 1024 // 50MB per layer (conservative)
};

/** Result of layer assignment computation */
export type LayerAssignmentResult = {
  /** Chunks assigned to layers (layer 1-5) */
  layeredChunks: ChunkLayerAssignment[];
  /** Chunks that stay in lambda packages (layer 0) */
  unLayeredChunks: ChunkLayerAssignment[];
  /** Layer summaries */
  layers: Array<{
    layerNumber: number;
    chunks: string[];
    totalSizeBytes: number;
  }>;
  /** Total bytes saved by using layers */
  totalBytesSaved: number;
};

/**
 * Assign chunks to Lambda Layers based on usage analysis and configuration.
 *
 * Uses a greedy bin-packing algorithm:
 * 1. Filter chunks by minimum usage count and size
 * 2. Sort by deduplication value (already done in analysis)
 * 3. Assign to layers using first-fit decreasing (FFD)
 * 4. Respect layer count and size limits
 *
 * @param chunkAnalysis - Chunk usage analysis from buildSplitBundle
 * @param config - Layer configuration (defaults provided)
 */
export const assignChunksToLayers = (
  chunkAnalysis: ChunkUsageAnalysis[],
  config: LayerConfig = DEFAULT_LAYER_CONFIG,
  _totalLambdaCount?: number
): LayerAssignmentResult => {
  const layeredChunks: ChunkLayerAssignment[] = [];
  const unLayeredChunks: ChunkLayerAssignment[] = [];

  // Track layer contents: layerNumber -> { chunks, totalSize }
  const layerContents = new Map<number, { chunks: string[]; totalSize: number }>();

  // Initialize layers
  for (let i = 1; i <= config.maxLayers; i++) {
    layerContents.set(i, { chunks: [], totalSize: 0 });
  }

  // Filter and process chunks (already sorted by deduplication value)
  for (const chunk of chunkAnalysis) {
    // Skip chunks that don't meet minimum criteria
    if (chunk.usageCount < config.minUsageCount) {
      unLayeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: 0
      });
      continue;
    }

    if (chunk.sizeBytes < config.minChunkSize) {
      unLayeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: 0
      });
      continue;
    }

    // Find first layer with enough space (First Fit Decreasing)
    let assignedLayer = 0;
    for (let layerNum = 1; layerNum <= config.maxLayers; layerNum++) {
      const layer = layerContents.get(layerNum)!;
      if (layer.totalSize + chunk.sizeBytes <= config.maxLayerSize) {
        layer.chunks.push(chunk.chunkName);
        layer.totalSize += chunk.sizeBytes;
        assignedLayer = layerNum;
        break;
      }
    }

    if (assignedLayer > 0) {
      layeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: assignedLayer
      });
    } else {
      // No layer has space, chunk stays in lambda packages
      unLayeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: 0
      });
    }
  }

  // Build layer summaries
  const layers: LayerAssignmentResult['layers'] = [];
  for (let i = 1; i <= config.maxLayers; i++) {
    const content = layerContents.get(i)!;
    if (content.chunks.length > 0) {
      layers.push({
        layerNumber: i,
        chunks: content.chunks,
        totalSizeBytes: content.totalSize
      });
    }
  }

  // Calculate total bytes saved
  const totalBytesSaved = layeredChunks.reduce((sum, assignment) => {
    const analysis = chunkAnalysis.find((c) => c.chunkName === assignment.chunkName);
    return sum + (analysis?.deduplicationValue || 0);
  }, 0);

  return {
    layeredChunks,
    unLayeredChunks,
    layers,
    totalBytesSaved
  };
};

export type LambdaSplitOutput = {
  /** Lambda function name */
  name: string;
  /** Path to the entry index.js file in distFolderPath */
  entryFile: string;
  /** All files in the lambda's dist folder (entry + chunks) */
  files: string[];
  /** Source files that were bundled for this lambda */
  sourceFiles: { path: string }[];
  /** Dependencies that need Docker installation */
  dependenciesToInstallInDocker: ModuleInfo[];
  /** All resolved npm modules */
  resolvedModules: string[];
};

// Extract module name from import path (handles scoped packages)
const getModuleNameFromPath = (importPath: string): string => {
  const moduleName = importPath.endsWith('/') ? importPath.slice(0, importPath.length - 1) : importPath;
  const [firstPart, secondPart] = moduleName.split('/');
  return firstPart.startsWith('@') ? [firstPart, secondPart].join('/') : firstPart;
};

/**
 * Bundle multiple Lambda entrypoints together using Bun's code splitting.
 * Returns information about each lambda's output files.
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
}: {
  entrypoints: LambdaEntrypoint[];
  /** Shared output directory for the initial bundle */
  sharedOutdir: string;
  cwd: string;
  tsConfigPath?: string;
  nodeTarget: string;
  minify?: boolean;
  sourceMaps?: 'inline' | 'external' | 'disabled';
  sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled';
  excludeDependencies?: string[];
  dependenciesToExcludeFromBundle?: string[];
  progressLogger?: ProgressLogger;
}): Promise<SplitBundleResult> => {
  const startTime = Date.now();

  // Install dependencies first
  await dependencyInstaller.install({
    rootProjectDirPath: cwd,
    progressLogger: progressLogger || {
      eventContext: {},
      startEvent: async () => {},
      updateEvent: async () => {},
      finishEvent: async () => {}
    }
  });

  // Get tsconfig aliases
  let aliases: { [alias: string]: string } = {};
  if (tsConfigPath) {
    aliases = await getTsconfigAliases(tsConfigPath);
  }

  let tsConfigPathForBuild = tsConfigPath;
  if (!tsConfigPathForBuild) {
    const cwdTsConfigPath = join(cwd, 'tsconfig.json');
    if (existsSync(cwdTsConfigPath)) {
      tsConfigPathForBuild = cwdTsConfigPath;
    }
  }

  const shouldIgnoreAllDeps = dependenciesToExcludeFromBundle.includes('*');

  // Track all resolved modules and dependencies
  const allResolvedModules = new Set<string>();
  const allDependenciesToInstallInDocker: PackageJsonDepsInfo[] = [];
  const externalModules: { name: string; note: string }[] = [];
  const sourceFilesSet = new Set<string>();

  // Plugin to analyze dependencies
  const stpAnalyzeDepsPlugin: BunPlugin = {
    name: 'stp-analyze-deps-plugin',
    setup(build) {
      // Track source files
      build.onLoad({ filter: /\.(ts|tsx|js|jsx|mjs|cjs)$/ }, async (args) => {
        sourceFilesSet.add(args.path);
        return undefined;
      });

      // Analyze dependencies
      build.onResolve({ filter: /^[^.]/ }, async (args): Promise<{ path: string; external?: boolean } | undefined> => {
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          return undefined;
        }

        const moduleName = getModuleNameFromPath(args.path);
        allResolvedModules.add(moduleName);

        // Skip built-in modules
        if (builtinModules.includes(moduleName) || args.path.startsWith('node:')) {
          return undefined;
        }

        // Already marked as external
        if (externalModules.find((m) => m.name === moduleName)) {
          return { path: args.path, external: true };
        }

        // Check if it's a tsconfig alias
        const isAlias = await determineIfAlias({ moduleName, aliases });
        if (isAlias) {
          return undefined;
        }

        const modulePath = join(cwd, 'node_modules', moduleName);
        const isWildcardExternalized = shouldIgnoreAllDeps && modulePath.includes('node_modules');

        if (isWildcardExternalized) {
          const pkgInfo = await getInfoFromPackageJson({
            directoryPath: modulePath,
            parentModule: null,
            dependencyType: 'root'
          }).catch(() => null);
          if (pkgInfo) {
            allDependenciesToInstallInDocker.push({ ...pkgInfo, note: 'WILDCARD_EXTERNALIZED' });
          }
          externalModules.push({ name: moduleName, note: 'WILDCARD_EXTERNALIZED' });
          return { path: args.path, external: true };
        }

        if (IGNORED_MODULES.concat(excludeDependencies || []).includes(moduleName)) {
          externalModules.push({ name: moduleName, note: 'IGNORED' });
          return { path: args.path, external: true };
        }

        const packageJsonPath = join(modulePath, 'package.json');
        if (!existsSync(packageJsonPath)) {
          return undefined;
        }

        // Analyze if this dependency needs to be installed in Docker
        const { dependenciesToInstallInDocker, allExternalDeps } = await analyzeDependency({
          dependenciesToExcludeFromBundle,
          dependency: { name: moduleName, path: modulePath }
        });

        allDependenciesToInstallInDocker.push(...dependenciesToInstallInDocker);

        if (dependenciesToInstallInDocker.find((dep) => dep.name === moduleName)) {
          externalModules.push({ name: moduleName, note: 'INSTALLED_IN_DOCKER' });
          for (const dep of allExternalDeps) {
            if (!externalModules.find((m) => m.name === dep)) {
              externalModules.push({ name: dep, note: `ADDED_BY_${moduleName}` });
            }
          }
          return { path: args.path, external: true };
        }

        return undefined;
      });
    }
  };

  // Native .node modules plugin
  const nativeNodeModulesPlugin: BunPlugin = {
    name: 'native-node-modules',
    setup(build) {
      build.onResolve({ filter: /\.node$/ }, (args) => {
        return { path: args.path, external: true };
      });
    }
  };

  // Get banner for ESM compatibility
  const banner = await getSourceMapBanner({ sourceMapBannerType, outputModuleFormat: 'esm' });
  const shouldInjectBanner = sourceMapBannerType === 'pre-compiled';

  // ESM defines to replace __dirname/__filename with runtime-resolved values
  const esmDefines = {
    __dirname: '__stp_dirname',
    __filename: '__stp_filename'
  };

  // Ensure shared output directory exists
  await ensureDir(sharedOutdir);

  // Build all entrypoints together with splitting
  // Note: Since multiple lambdas may have the same filename (e.g., index.ts),
  // we use [dir]/[name].js naming to avoid conflicts
  let buildResult: Awaited<ReturnType<typeof Bun.build>>;
  try {
    buildResult = await Bun.build({
      entrypoints: entrypoints.map((ep) => ep.entryfilePath),
      outdir: sharedOutdir,
      target: 'node',
      format: 'esm',
      splitting: true,
      minify,
      sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
      external: ['fsevents', ...externalModules.map((m) => m.name)],
      define: esmDefines,
      plugins: [stpAnalyzeDepsPlugin, nativeNodeModulesPlugin],
      root: cwd,
      banner: shouldInjectBanner && banner.js ? banner.js : undefined,
      naming: {
        entry: '[dir]/[name].js',
        chunk: 'chunks/chunk-[hash].js'
      }
    });
  } catch (err: any) {
    // Bun can throw AggregateError with message "Bundle failed" for severe errors
    const errorDetails = err.errors
      ? err.errors.map((e: any) => e?.message || e?.toString()).join('\n')
      : err.message || err.toString();
    throw getError({
      type: 'PACKAGING',
      message: `Split bundle failed: ${errorDetails}`,
      hint: 'Check that all entrypoint files exist and are valid TypeScript/JavaScript.'
    });
  }

  if (!buildResult.success) {
    const errors = buildResult.logs
      .filter((log) => log.level === 'error')
      .map((log) => log.message)
      .join('\n');
    throw getError({
      type: 'PACKAGING',
      message: `Split bundle build failed: ${errors}`
    });
  }

  // Separate entry files from chunk files
  // Entry files are in [dir]/[name].js relative to root (cwd), chunks are in chunks/chunk-[hash].js
  const entryFiles: string[] = [];
  const chunkFiles: string[] = [];

  for (const output of buildResult.outputs) {
    const outputPath = output.path;
    if (outputPath.includes('chunks/') || outputPath.includes('chunks\\')) {
      chunkFiles.push(outputPath);
    } else if (outputPath.endsWith('.js')) {
      entryFiles.push(outputPath);
    }
  }

  // Process each lambda: copy its entry file and required chunks to its dist folder
  const lambdaOutputs = new Map<string, LambdaSplitOutput>();

  // Track chunk usage across lambdas for layer optimization
  const chunkUsageMap = new Map<string, Set<string>>(); // chunkPath -> Set<lambdaName>

  for (const entrypoint of entrypoints) {
    // Find the output file by matching the original entrypoint path
    // The output structure mirrors the input: [outdir]/[relative-path-from-cwd].js
    // e.g., input: C:\console-app\server\lambdas\foo\index.ts
    //       output: [outdir]\server\lambdas\foo\index.js (relative to cwd which is console-app)
    const inputRelative = relative(cwd, entrypoint.entryfilePath)
      .replace(/\.(ts|tsx|jsx|mjs)$/, '.js')
      .replace(/\\/g, '/');

    const entryFile = entryFiles.find((ef) => {
      // Get relative path from sharedOutdir
      const efRelative = relative(sharedOutdir, ef).replace(/\\/g, '/');
      return efRelative === inputRelative;
    });

    if (!entryFile) {
      // Debug: log available entry files
      const availableFiles = entryFiles.map((ef) => relative(sharedOutdir, ef).replace(/\\/g, '/'));
      throw getError({
        type: 'PACKAGING',
        message: `Could not find output file for lambda: ${entrypoint.name}.\nExpected: ${inputRelative}\nAvailable: ${availableFiles.join(', ')}`
      });
    }

    // Read the entry file to find chunk imports
    let entryContent = await readFile(entryFile, 'utf-8');
    const requiredChunks = findChunkImports(entryContent, chunkFiles);

    // Recursively find chunks imported by chunks (deep traversal)
    const allRequiredChunks = new Set(requiredChunks);
    const chunksToProcess = [...requiredChunks];
    const processedChunks = new Set<string>();

    while (chunksToProcess.length > 0) {
      const chunk = chunksToProcess.pop()!;
      if (processedChunks.has(chunk)) continue;
      processedChunks.add(chunk);

      const chunkContent = await readFile(chunk, 'utf-8');
      const nestedChunks = findChunkImports(chunkContent, chunkFiles);
      for (const nestedChunk of nestedChunks) {
        if (!allRequiredChunks.has(nestedChunk)) {
          allRequiredChunks.add(nestedChunk);
          chunksToProcess.push(nestedChunk);
        }
      }
    }

    // Track which lambdas use each chunk for layer optimization
    for (const chunk of allRequiredChunks) {
      if (!chunkUsageMap.has(chunk)) {
        chunkUsageMap.set(chunk, new Set());
      }
      chunkUsageMap.get(chunk)!.add(entrypoint.name);
    }

    // Ensure dist folder exists
    await ensureDir(entrypoint.distFolderPath);

    // Copy entry file as index.js, rewriting chunk imports to use ./chunks/
    const destIndexPath = join(entrypoint.distFolderPath, 'index.js');
    // Fix chunk imports: Bun generates paths like "/chunks/...", "../../../chunks/...", or "./chunks/..."
    // After copying, chunks are at "./chunks/" relative to index.js
    entryContent = rewriteChunkImports(entryContent, './chunks/');
    await writeFile(destIndexPath, entryContent);

    // Copy required chunks to chunks/ subdirectory, rewriting inter-chunk imports
    const chunksDestDir = join(entrypoint.distFolderPath, 'chunks');
    await ensureDir(chunksDestDir);
    const copiedFiles = [destIndexPath];
    for (const chunk of allRequiredChunks) {
      const chunkDest = join(chunksDestDir, basename(chunk));
      // Chunks import other chunks - fix paths to be relative within chunks/ directory
      let chunkContent = await readFile(chunk, 'utf-8');
      chunkContent = rewriteChunkImports(chunkContent, './');
      await writeFile(chunkDest, chunkContent);
      copiedFiles.push(chunkDest);

      // Copy chunk source map if exists
      const chunkMapPath = `${chunk}.map`;
      if (existsSync(chunkMapPath)) {
        await copy(chunkMapPath, `${chunkDest}.map`);
      }
    }

    // Copy source map if exists
    const sourceMapPath = `${entryFile}.map`;
    if (existsSync(sourceMapPath)) {
      await copy(sourceMapPath, join(entrypoint.distFolderPath, 'index.js.map'));
    }

    // Create package.json for ESM
    await outputJSON(join(entrypoint.distFolderPath, 'package.json'), { type: 'module' });

    lambdaOutputs.set(entrypoint.name, {
      name: entrypoint.name,
      entryFile: destIndexPath,
      files: copiedFiles,
      sourceFiles: Array.from(sourceFilesSet)
        .filter(filterDuplicates)
        .map((p) => ({ path: p })),
      dependenciesToInstallInDocker: allDependenciesToInstallInDocker,
      resolvedModules: Array.from(allResolvedModules)
    });
  }

  const bundleTimeMs = Date.now() - startTime;

  // Build chunk usage analysis for layer optimization
  const chunkAnalysis: ChunkUsageAnalysis[] = [];
  for (const [chunkPath, lambdaNames] of chunkUsageMap) {
    const chunkName = basename(chunkPath);
    const sizeBytes = Bun.file(chunkPath).size;
    const usedByLambdas = Array.from(lambdaNames);
    const usageCount = usedByLambdas.length;
    // Deduplication value: bytes saved if chunk is put in a shared layer
    // Each lambda except one would no longer need the chunk in its package
    const deduplicationValue = sizeBytes * (usageCount - 1);

    chunkAnalysis.push({
      chunkName,
      chunkPath,
      sizeBytes,
      usedByLambdas,
      usageCount,
      deduplicationValue
    });
  }

  // Sort by deduplication value (highest first) - best candidates for layers
  chunkAnalysis.sort((a, b) => b.deduplicationValue - a.deduplicationValue);

  return {
    lambdaOutputs,
    sharedChunkCount: chunkFiles.length,
    bundleTimeMs,
    chunkAnalysis
  };
};

/**
 * Rewrite chunk import paths in file content.
 * Handles both static imports (from "...") and dynamic imports (import("...")).
 *
 * @param content - The file content to rewrite
 * @param newPrefix - The new prefix for chunk paths (e.g., "./chunks/" or "./")
 */
const rewriteChunkImports = (content: string, newPrefix: string): string => {
  // Match any import that references a chunk file, regardless of path format:
  // - /chunks/chunk-xxx.js (absolute from root)
  // - ../chunks/chunk-xxx.js, ../../chunks/chunk-xxx.js, etc. (relative up)
  // - ./chunks/chunk-xxx.js (relative current)
  // - chunks/chunk-xxx.js (no prefix)
  // - chunk-xxx.js (direct)
  // Works for both: from "..." and import("...")

  // Captures: (1) import prefix, (2) any path before chunk, (3) chunk filename, (4) closing quote
  const chunkPathPattern = /(from\s*["']|import\s*\(\s*["'])([^"']*?)(chunk-[^"']+)(["'])/g;

  return content.replace(chunkPathPattern, (_match, importPrefix, _oldPath, chunkFile, closingQuote) => {
    return `${importPrefix}${newPrefix}${chunkFile}${closingQuote}`;
  });
};

/**
 * Find chunk file imports in a file's content.
 * Handles various import patterns Bun may generate:
 * - Absolute: "/chunks/chunk-name.js"
 * - Relative: "./chunks/chunk-name.js", "../chunks/chunk-name.js", "../../chunks/chunk-name.js"
 * - Direct: "chunk-name.js", "./chunk-name.js"
 */
const findChunkImports = (content: string, allChunks: string[]): string[] => {
  const importedChunks: string[] = [];

  for (const chunkPath of allChunks) {
    const chunkName = basename(chunkPath);
    // Check for various import patterns (both static and dynamic imports)
    if (
      // Absolute path from root
      content.includes(`"/chunks/${chunkName}"`) ||
      // Relative paths with chunks/ prefix
      content.includes(`"./chunks/${chunkName}"`) ||
      content.includes(`"../chunks/${chunkName}"`) ||
      content.includes(`"../../chunks/${chunkName}"`) ||
      content.includes(`"../../../chunks/${chunkName}"`) ||
      // Without leading ./ or with just chunks/
      content.includes(`"chunks/${chunkName}"`) ||
      // Direct chunk reference (for chunks importing other chunks)
      content.includes(`"${chunkName}"`) ||
      content.includes(`"./${chunkName}"`)
    ) {
      importedChunks.push(chunkPath);
    }
  }

  return importedChunks;
};

/**
 * Analyze a dependency to determine if it needs Docker installation.
 */
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

  const allExternalDeps: string[] = [];
  const dependenciesToInstallInDocker: PackageJsonDepsInfo[] = [];

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

let sourceMapBannerFromFile: string;

const getSourceMapBanner = async ({
  sourceMapBannerType,
  outputModuleFormat
}: {
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  outputModuleFormat: 'esm' | 'cjs';
}) => {
  try {
    if (sourceMapBannerType === 'disabled') {
      return { js: '' };
    }
    if (sourceMapBannerType === 'pre-compiled') {
      if (outputModuleFormat === 'esm') {
        return {
          js: `import { createRequire as __stp_createRequire } from "node:module";
import { fileURLToPath as __stp_fileURLToPath } from "node:url";
import { dirname as __stp_pathDirname } from "node:path";
const require = __stp_createRequire(import.meta.url);
const __stp_filename = __stp_fileURLToPath(import.meta.url);
const __stp_dirname = __stp_pathDirname(__stp_filename);`
        };
      }
      if (outputModuleFormat === 'cjs') {
        if (!sourceMapBannerFromFile) {
          const sourceMapBannerFilePath = getFirstExistingPath([
            resolve(__dirname, './source-map-install.js'),
            SOURCE_MAP_INSTALL_DIST_PATH
          ]);
          sourceMapBannerFromFile = await readFile(sourceMapBannerFilePath, 'utf-8').catch(() => '');
        }
        return { js: sourceMapBannerFromFile };
      }
      return { js: '' };
    }

    if (sourceMapBannerType === 'node_modules') {
      return {
        js:
          outputModuleFormat === 'cjs'
            ? "require('source-map-support').install({ environment: 'node', handleUncaughtExceptions: false });"
            : ''
      };
    }
    return { js: '' };
  } catch {
    return { js: '' };
  }
};

/** Layer path in AWS Lambda runtime */
const LAYER_CHUNKS_PATH = '/opt/nodejs/chunks/';

/**
 * Create layer artifacts and update lambda packages to use layers.
 *
 * This function:
 * 1. Creates layer directories with the assigned chunks
 * 2. Updates lambda packages to remove layered chunks
 * 3. Rewrites imports to use layer paths for layered chunks
 *
 * @param lambdaOutputs - Lambda outputs from buildSplitBundle
 * @param layerAssignment - Layer assignment from assignChunksToLayers
 * @param layerBasePath - Base path for layer directories (e.g., /build/shared-layers/)
 */
export const createLayerArtifacts = async ({
  lambdaOutputs,
  layerAssignment,
  layerBasePath
}: {
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  layerAssignment: LayerAssignmentResult;
  layerBasePath: string;
}): Promise<{
  layerArtifacts: Array<{
    layerNumber: number;
    layerPath: string;
    chunks: string[];
    sizeBytes: number;
  }>;
}> => {
  const layerArtifacts: Array<{
    layerNumber: number;
    layerPath: string;
    chunks: string[];
    sizeBytes: number;
  }> = [];

  // Build set of layered chunk names for quick lookup
  const layeredChunkNames = new Set(layerAssignment.layeredChunks.map((c) => c.chunkName));

  // Create layer directories and copy chunks
  for (const layer of layerAssignment.layers) {
    const layerDir = join(layerBasePath, `layer-${layer.layerNumber}`);
    // Lambda layer structure: nodejs/chunks/
    const layerChunksDir = join(layerDir, 'nodejs', 'chunks');
    await ensureDir(layerChunksDir);

    // Copy chunks to layer, rewriting inter-chunk imports
    for (const chunkName of layer.chunks) {
      const chunkAssignment = layerAssignment.layeredChunks.find((c) => c.chunkName === chunkName);
      if (!chunkAssignment) continue;

      const sourcePath = chunkAssignment.chunkPath;
      const destPath = join(layerChunksDir, chunkName);

      // Read chunk content and rewrite imports
      let content = await readFile(sourcePath, 'utf-8');
      // For chunks in the same layer, use relative paths
      // For chunks in different layers or lambda, this gets complex
      // Simplification: all layered chunks use absolute layer path
      content = rewriteChunkImportsSelective(content, layeredChunkNames, LAYER_CHUNKS_PATH, './');
      await writeFile(destPath, content);

      // Copy source map if exists
      const sourceMapPath = `${sourcePath}.map`;
      if (existsSync(sourceMapPath)) {
        await copy(sourceMapPath, `${destPath}.map`);
      }
    }

    // Create package.json for ESM in the layer
    await outputJSON(join(layerDir, 'nodejs', 'package.json'), { type: 'module' });

    layerArtifacts.push({
      layerNumber: layer.layerNumber,
      layerPath: layerDir,
      chunks: layer.chunks,
      sizeBytes: layer.totalSizeBytes
    });
  }

  // Update lambda packages: remove layered chunks and rewrite imports
  for (const [_lambdaName, output] of lambdaOutputs) {
    const lambdaChunksDir = join(dirname(output.entryFile), 'chunks');

    // Remove layered chunks from lambda's chunks directory
    for (const chunkName of layeredChunkNames) {
      const chunkPath = join(lambdaChunksDir, chunkName);
      if (existsSync(chunkPath)) {
        await remove(chunkPath);
        // Also remove source map
        const mapPath = `${chunkPath}.map`;
        if (existsSync(mapPath)) {
          await remove(mapPath);
        }
      }
    }

    // Rewrite imports in entry file
    let entryContent = await readFile(output.entryFile, 'utf-8');
    entryContent = rewriteChunkImportsSelective(entryContent, layeredChunkNames, LAYER_CHUNKS_PATH, './chunks/');
    await writeFile(output.entryFile, entryContent);

    // Rewrite imports in remaining (non-layered) chunks
    if (existsSync(lambdaChunksDir)) {
      const allFiles = await readdir(lambdaChunksDir).catch(() => [] as string[]);
      const remainingChunks = allFiles.filter((f) => f.endsWith('.js'));

      for (const chunkFile of remainingChunks) {
        const chunkPath = join(lambdaChunksDir, chunkFile);
        if (existsSync(chunkPath)) {
          let content = await readFile(chunkPath, 'utf-8');
          content = rewriteChunkImportsSelective(content, layeredChunkNames, LAYER_CHUNKS_PATH, './');
          await writeFile(chunkPath, content);
        }
      }
    }

    // Update the files list to remove layered chunks
    output.files = output.files.filter((f) => {
      const fileName = basename(f);
      return !layeredChunkNames.has(fileName);
    });
  }

  return { layerArtifacts };
};

/**
 * Rewrite chunk imports selectively based on whether chunks are layered.
 *
 * @param content - File content to process
 * @param layeredChunkNames - Set of chunk names that are in layers
 * @param layerPrefix - Prefix for layered chunk imports (e.g., "/opt/nodejs/chunks/")
 * @param localPrefix - Prefix for non-layered chunk imports (e.g., "./chunks/" or "./")
 */
const rewriteChunkImportsSelective = (
  content: string,
  layeredChunkNames: Set<string>,
  layerPrefix: string,
  localPrefix: string
): string => {
  const chunkPathPattern = /(from\s*["']|import\s*\(\s*["'])([^"']*?)(chunk-[^"']+)(["'])/g;

  return content.replace(chunkPathPattern, (_match, importPrefix, _oldPath, chunkFile, closingQuote) => {
    const isLayered = layeredChunkNames.has(chunkFile);
    const newPrefix = isLayered ? layerPrefix : localPrefix;
    return `${importPrefix}${newPrefix}${chunkFile}${closingQuote}`;
  });
};
