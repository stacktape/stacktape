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
import { copy, ensureDir, outputJSON, readFile, remove, writeFile } from 'fs-extra';
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
  nodeTarget,
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

  return {
    lambdaOutputs,
    sharedChunkCount: chunkFiles.length,
    bundleTimeMs
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
