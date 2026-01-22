import type { BunPlugin } from 'bun';
import type { PackageJsonDepsInfo } from './utils';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING } from '@config';
import { SOURCE_MAP_INSTALL_DIST_PATH } from '@shared/naming/project-fs-paths';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import {
  getFirstExistingPath,
  getHashFromMultipleFiles,
  getMatchingFilesByGlob,
  getRelativePath,
  isFileAccessible,
  transformToUnixPath
} from '@shared/utils/fs-utils';
import { builtinModules, filterDuplicates, getError, getTsconfigAliases, raiseError } from '@shared/utils/misc';
import { findProjectRoot } from '@shared/utils/monorepo';
import { copy, lstatSync, outputJSON, readFile, readFileSync, realpathSync, writeJson } from 'fs-extra';
import uniqWith from 'lodash/uniqWith';
import objectHash from 'object-hash';
import {
  DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE,
  DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION,
  FILES_TO_INCLUDE_IN_DIGEST,
  IGNORED_MODULES,
  IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER
} from './config';
import { copyDockerInstalledModulesForLambda } from './copy-docker-installed-modules';
import {
  createModuleResolver,
  determineIfAlias,
  ensureDefaultExport,
  ESM_SOURCE_MAP_BANNER,
  getAllJsDependenciesFromMultipleFiles,
  getExternalDeps,
  getInfoFromPackageJson,
  getLambdaRuntimeFromNodeTarget,
  getLockFileData,
  resolveDifferentSourceMapLocation,
  resolvePrisma
} from './utils';

// Extract module name from import path (handles scoped packages)
const getModuleNameFromPath = (importPath: string): string => {
  const moduleName = importPath.endsWith('/') ? importPath.slice(0, importPath.length - 1) : importPath;
  const [firstPart, secondPart] = moduleName.split('/');
  return firstPart.startsWith('@') ? [firstPart, secondPart].join('/') : firstPart;
};

export const buildEsCode = async ({
  sourcePath,
  distPath,
  minify,
  rawCode,
  externals = [],
  sourceMaps,
  tsConfigPath,
  cwd,
  nodeTarget = process.versions.node,
  distDir,
  sourcePaths,
  splitting = false,
  outputModuleFormat = 'cjs',
  plugins,
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  sourceMapBannerType,
  define,
  metafile,
  isLambda
}: {
  sourcePath?: string;
  sourcePaths?: string[];
  rawCode?: string;
  distPath?: string;
  distDir?: string;
  minify?: boolean;
  externals: string[];
  metafile?: string;
  sourceMaps: 'inline' | 'external' | 'disabled';
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  tsConfigPath: string;
  cwd: string;
  allowFailedImports?: boolean;
  keepNames?: boolean;
  nodeTarget?: string;
  splitting?: boolean;
  plugins?: BunPlugin[];
  excludeDependencies?: string[];
  dependenciesToExcludeFromBundle?: string[];
  outputModuleFormat?: 'esm' | 'cjs';
  emitTsDecoratorMetadata?: boolean;
  define?: Record<string, string>;
  legalComments?: 'external' | 'inline' | 'linked' | 'none' | 'eof';
  isLambda?: boolean;
}): Promise<{
  dependenciesToInstallInDocker: ModuleInfo[];
  externalModules: { name: string; note: string }[];
  dynamicallyImportedModules: string[];
  sourceFiles: { path: string }[];
  allModules: string[];
}> => {
  let aliases: { [alias: string]: string } = {};
  if (tsConfigPath) {
    aliases = await getTsconfigAliases(tsConfigPath);
  }
  const shouldIgnoreAllDeps = dependenciesToExcludeFromBundle.includes('*');

  let tsConfigPathForBuild = tsConfigPath;
  if (!tsConfigPathForBuild) {
    const cwdTsConfigPath = join(process.cwd(), 'tsconfig.json');
    tsConfigPathForBuild = existsSync(cwdTsConfigPath) ? cwdTsConfigPath : undefined;
  }

  const skipAwsSdkV3Deps =
    isLambda &&
    NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING.some(
      (v) => nodeTarget.includes(String(v)) || String(nodeTarget) === String(v)
    );

  // Find monorepo root for resolving workspace packages
  const monorepoRoot = await findProjectRoot(cwd);
  const unixMonorepoRoot = monorepoRoot ? transformToUnixPath(monorepoRoot) : null;

  // Create module resolver with loose resolution (mimics esbuild behavior)
  const moduleResolver = createModuleResolver({ cwd, monorepoRoot });
  const { findModulePath } = moduleResolver;

  // Helper to check if a module path is a workspace package (symlink pointing within monorepo)
  const isWorkspacePackage = (modulePath: string): boolean => {
    if (!unixMonorepoRoot) return false;
    try {
      const isSymlink = lstatSync(modulePath).isSymbolicLink();
      if (!isSymlink) return false;
      const realPath = transformToUnixPath(realpathSync(modulePath));
      // Workspace packages are symlinks pointing to paths within the monorepo but not in node_modules
      return realPath.startsWith(unixMonorepoRoot) && !realPath.includes('node_modules');
    } catch {
      return false;
    }
  };

  const runBuild = async ({ dynamicallyImportedModules = [] }: { dynamicallyImportedModules?: string[] }) => {
    const allDependenciesToInstallInDocker: ModuleInfo[] = [];
    const externalModules: { name: string; note: string }[] = [];
    const allModules: string[] = [];
    const sourceFilesSet = new Set<string>();

    // Bun plugin to analyze dependencies (port of stp-analyze-deps-plugin)
    const stpAnalyzeDepsPlugin: BunPlugin = {
      name: 'stp-analyze-deps-plugin',
      setup(build) {
        // Track source files via onLoad
        build.onLoad({ filter: /\.(ts|tsx|js|jsx|mjs|cjs)$/ }, async (args) => {
          // Convert to Unix paths for consistency
          sourceFilesSet.add(transformToUnixPath(args.path));
          return undefined; // Let Bun handle the actual loading
        });

        // Analyze dependencies via onResolve
        build.onResolve(
          { filter: /^[^.]/ },
          async (args): Promise<{ path: string; external?: boolean } | undefined> => {
            // Skip relative imports (starting with . or /)
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
              return undefined;
            }

            const moduleName = getModuleNameFromPath(args.path);
            allModules.push(moduleName);

            // Skip built-in modules
            if (builtinModules.includes(moduleName) || args.path === sourcePath) {
              return undefined;
            }

            // Already marked as external
            if (externalModules.find((m) => m.name === moduleName)) {
              return { path: args.path, external: true };
            }

            // Skip AWS SDK v3 for Lambda (pre-installed in runtime)
            if (skipAwsSdkV3Deps && moduleName.startsWith('@aws-sdk/')) {
              return { path: args.path, external: true };
            }

            // Check if it's a tsconfig alias
            const isAlias = await determineIfAlias({ moduleName, aliases });
            if (isAlias) {
              return undefined;
            }

            // Find module in cwd, monorepo root, or nested node_modules (mimics esbuild's loose resolution)
            const modulePath = findModulePath(moduleName, args.importer);

            // Check if this is a workspace package (symlinked monorepo package)
            // For workspace packages, we need to explicitly resolve to avoid Bun crash on Windows
            // when it tries to resolve symlinked paths internally
            if (modulePath && isWorkspacePackage(modulePath)) {
              // Let Bun bundle workspace packages - resolve to the real path to avoid Windows symlink issues
              const realPath = transformToUnixPath(realpathSync(modulePath));
              // Find the entry file in the workspace package
              const packageJsonPath = join(realPath, 'package.json');
              try {
                // eslint-disable-next-line ts/no-require-imports
                const pkgJson = require(packageJsonPath);
                const entryFile = pkgJson.main || pkgJson.module || 'index.js';
                const resolvedEntry = join(realPath, entryFile.replace(/\.js$/, '.ts'));
                if (isFileAccessible(resolvedEntry)) {
                  return { path: transformToUnixPath(resolvedEntry) };
                }
                // Try src/index.ts as fallback
                const srcEntry = join(realPath, 'src', 'index.ts');
                if (isFileAccessible(srcEntry)) {
                  return { path: transformToUnixPath(srcEntry) };
                }
              } catch {
                // Fallback - let Bun resolve but this might crash on Windows
              }
              return undefined;
            }

            const isDynamicallyImported = dynamicallyImportedModules.includes(moduleName);

            if (isDynamicallyImported || (shouldIgnoreAllDeps && modulePath)) {
              if (modulePath) {
                allDependenciesToInstallInDocker.push({
                  ...(await getInfoFromPackageJson({
                    directoryPath: modulePath,
                    parentModule: null,
                    dependencyType: 'root'
                  })),
                  note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
                });
              }
              externalModules.push({
                name: moduleName,
                note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
              });
              return { path: args.path, external: true };
            }

            if (IGNORED_MODULES.concat(excludeDependencies || []).includes(moduleName)) {
              externalModules.push({ name: moduleName, note: 'IGNORED' });
              return { path: args.path, external: true };
            }

            if (!modulePath) {
              return undefined;
            }

            let external = false;
            const { dependenciesToInstallInDocker, allExternalDeps } = await analyzeDependency({
              dependenciesToExcludeFromBundle,
              dependency: { name: moduleName, path: modulePath }
            });

            allDependenciesToInstallInDocker.push(...dependenciesToInstallInDocker);

            if (dependenciesToInstallInDocker.find((dep) => dep.name === moduleName)) {
              externalModules.push({ name: moduleName, note: 'INSTALLED_IN_DOCKER' });
              for (const dep of allExternalDeps) {
                externalModules.push({ name: dep, note: `ADDED_BY_${moduleName}` });
              }
              external = true;
            }

            return external ? { path: args.path, external: true } : undefined;
          }
        );
      }
    };

    // Bun plugin for native .node modules
    const nativeNodeModulesPlugin: BunPlugin = {
      name: 'native-node-modules',
      setup(build) {
        // Handle .node files by marking them as external
        // Bun handles .node files natively with the 'file' loader
        build.onResolve({ filter: /\.node$/ }, (args): { path: string; external: boolean } => {
          return { path: args.path, external: true };
        });
      }
    };

    // Bun plugin to resolve modules that Bun can't find on its own (mimics esbuild's loose resolution)
    // This handles transitive dependencies that aren't hoisted to root node_modules
    // Only intervenes for modules in non-standard (nested) locations
    const looseResolvePlugin: BunPlugin = {
      name: 'loose-resolve-plugin',
      setup(build) {
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith('.') || args.path.startsWith('/')) return undefined;

          const moduleName = getModuleNameFromPath(args.path);
          if (builtinModules.includes(moduleName) || args.path.startsWith('node:')) return undefined;

          // Use combined resolution: fast path first, then walk-up from importer
          // Skip deep search for performance - it's rarely needed and expensive
          const modulePath = findModulePath(moduleName, args.importer);
          if (!modulePath) return undefined;

          // Only intervene if module is in a non-standard location (nested node_modules)
          // Standard locations are handled by Bun natively
          if (!moduleResolver.isNestedLocation(modulePath, moduleName)) return undefined;

          // Module is in nested node_modules - resolve entry point manually
          try {
            const pkgJsonPath = join(modulePath, 'package.json');
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

            // Handle subpath imports (e.g., 'lodash/merge')
            const subpath = args.path.slice(moduleName.length);
            if (subpath && subpath !== '/') {
              const subpathFile = join(modulePath, subpath);
              const extensions = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', ''];
              for (const ext of extensions) {
                const fullPath = subpathFile + ext;
                if (isFileAccessible(fullPath)) return { path: resolve(fullPath) };
                const indexPath = join(subpathFile, `index${ext || '.js'}`);
                if (isFileAccessible(indexPath)) return { path: resolve(indexPath) };
              }
            }

            // Resolve main entry point
            let entryPoint: string | undefined;
            if (pkgJson.exports) {
              const exports = pkgJson.exports;
              if (typeof exports === 'string') {
                entryPoint = exports;
              } else if (exports['.']) {
                const dotExport = exports['.'];
                if (typeof dotExport === 'string') {
                  entryPoint = dotExport;
                } else if (dotExport.import) {
                  entryPoint = typeof dotExport.import === 'string' ? dotExport.import : dotExport.import.default;
                } else if (dotExport.require) {
                  entryPoint = typeof dotExport.require === 'string' ? dotExport.require : dotExport.require.default;
                } else if (dotExport.default) {
                  entryPoint = dotExport.default;
                }
              }
            }
            if (!entryPoint) entryPoint = pkgJson.module || pkgJson.main || 'index.js';

            const resolvedPath = join(modulePath, entryPoint);
            if (isFileAccessible(resolvedPath)) return { path: resolve(resolvedPath) };

            const extensions = ['.js', '.mjs', '.cjs', '.ts', '.json'];
            for (const ext of extensions) {
              const pathWithExt = resolvedPath.replace(/\.(js|mjs|cjs)$/, '') + ext;
              if (isFileAccessible(pathWithExt)) return { path: resolve(pathWithExt) };
            }
          } catch {
            // If we can't read package.json, let Bun try its resolution
          }

          return undefined;
        });
      }
    };

    const allBunPlugins: BunPlugin[] = [
      looseResolvePlugin,
      stpAnalyzeDepsPlugin,
      nativeNodeModulesPlugin,
      ...(plugins || [])
    ];

    // Determine entry points - convert to Unix paths for Bun on Windows
    const entryPoints = (sourcePath ? [sourcePath] : sourcePaths || []).map(transformToUnixPath);

    // Determine output directory - convert to Unix path
    const outdir = distDir || (distPath ? dirname(distPath) : undefined);
    const unixOutdir = outdir ? transformToUnixPath(outdir) : undefined;

    // Handle raw code by writing to a temp file
    let tempEntryFile: string | undefined;
    if (rawCode) {
      tempEntryFile = join(cwd, '.stacktape-temp-entry.ts');
      await Bun.write(tempEntryFile, rawCode);
      entryPoints.push(tempEntryFile);
    }

    // Build with Bun
    // For ESM: We use define to replace __dirname/__filename with our custom variables
    // because Bun injects hardcoded build-time paths which won't work in production.
    // Our banner then defines these variables properly using import.meta.url.
    const esmDefines =
      outputModuleFormat === 'esm'
        ? {
            __dirname: '__stp_dirname',
            __filename: '__stp_filename'
          }
        : {};

    // Get banner content to prepend
    const banner = await getSourceMapBanner({ sourceMapBannerType, outputModuleFormat });
    const shouldInjectBanner =
      (outputModuleFormat === 'cjs' && sourceMapBannerType !== 'disabled') ||
      (outputModuleFormat === 'esm' && sourceMapBannerType === 'pre-compiled');

    // Use monorepo root for module resolution if available
    // Convert to Unix paths for Bun compatibility on Windows
    const buildRoot = transformToUnixPath(monorepoRoot || cwd);

    let buildResult: Awaited<ReturnType<typeof Bun.build>>;
    try {
      buildResult = await Bun.build({
        entrypoints: entryPoints,
        outdir: unixOutdir,
        target: 'node',
        format: splitting ? 'esm' : outputModuleFormat,
        splitting: splitting && outputModuleFormat === 'esm',
        minify: minify !== undefined ? minify : true,
        sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
        external: ['fsevents', ...externals, ...externalModules.map((m) => m.name)],
        define: { ...esmDefines, ...define },
        plugins: allBunPlugins,
        root: buildRoot,
        banner: shouldInjectBanner && banner.js ? banner.js : undefined
      });
    } catch (err: any) {
      // Bun can throw AggregateError with message "Bundle failed" for severe errors
      const errorDetails = err.errors
        ? err.errors.map((e: any) => e?.message || e?.toString()).join('\n')
        : err.message || err.toString();
      throw getError({
        type: 'BUILD_CODE',
        message: `Build failed: ${errorDetails}`,
        hint: 'Check that the entrypoint file exists and is valid TypeScript/JavaScript.'
      });
    }

    // Clean up temp file
    if (tempEntryFile) {
      try {
        await Bun.write(tempEntryFile, ''); // Clear it
        const fs = await import('fs-extra');
        await fs.remove(tempEntryFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (!buildResult.success) {
      const errors = buildResult.logs
        .filter((log) => log.level === 'error')
        .map((log) => log.message)
        .join('\n');
      throw getError({
        type: 'PACKAGING',
        message: `Build failed: ${errors}`
      });
    }

    // If single output file expected, rename it
    if (distPath && !distDir && buildResult.outputs.length > 0) {
      const outputPath = buildResult.outputs[0].path;
      if (outputPath !== distPath) {
        const fs = await import('fs-extra');
        await fs.move(outputPath, distPath, { overwrite: true });
      }
    }

    // Create package.json for ESM output
    if (outputModuleFormat === 'esm' || splitting) {
      const outputDir = distDir || (distPath ? dirname(distPath) : cwd);
      await outputJSON(join(outputDir, 'package.json'), { type: 'module' });
    }

    // Ensure default export exists for Lambda runtime compatibility
    // If user exports `handler` but not `default`, append a re-export
    if (outputModuleFormat === 'esm' && distPath) {
      const content = await readFile(distPath, 'utf-8');
      const updatedContent = ensureDefaultExport(content);
      if (updatedContent !== content) {
        await Bun.write(distPath, updatedContent);
      }
    }

    // Convert source files set to array
    const sourceFiles = Array.from(sourceFilesSet)
      .filter(filterDuplicates)
      .map((p) => ({ path: p }));

    // Write metafile if requested (for compatibility)
    if (metafile && distPath) {
      const metafileData = {
        inputs: Object.fromEntries(sourceFiles.map((f) => [f.path, { bytes: 0 }])),
        outputs: Object.fromEntries(buildResult.outputs.map((o) => [o.path, { bytes: o.size }]))
      };
      await writeJson(join(dirname(distPath), metafile), metafileData);
    }

    return {
      dependenciesToInstallInDocker: uniqWith(
        allDependenciesToInstallInDocker.filter(Boolean),
        (a, b) => a.name === b.name
      ),
      externalModules,
      dynamicallyImportedModules,
      sourceFiles,
      allModules
    };
  };

  return runBuild({}).catch(async (error) => {
    const printableSrcPath = transformToUnixPath(getRelativePath(sourcePath));

    // Handle dynamic import errors by retrying with those modules externalized
    if (error.message?.includes('Could not resolve')) {
      const dynamicImportMatch = error.message.match(/Could not resolve "([^"]+)"/g);
      if (dynamicImportMatch) {
        const failedModules = dynamicImportMatch.map((m: string) => m.replace(/Could not resolve "|"/g, ''));
        return runBuild({ dynamicallyImportedModules: failedModules });
      }
    }

    throw getError({
      type: 'BUILD_CODE',
      message: `Failed to build code at ./${printableSrcPath}\n${error.message || error}`,
      hint: error?.hint,
      stack: error?.stack
    });
  });
};

const copyExplicitlyIncludedFiles = ({
  explicitlyIncludedFiles,
  outputDirectory,
  cwd
}: {
  explicitlyIncludedFiles: string[];
  outputDirectory: string;
  cwd: string;
}) => {
  const filesToHandle = explicitlyIncludedFiles.map((filePath) => {
    return { src: join(cwd, filePath), dest: join(outputDirectory, filePath) };
  });
  return Promise.all(
    filesToHandle.map(({ src, dest }) => {
      return copy(src, dest).catch((err) => {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      });
    })
  );
};

export const createEsBundle = async ({
  name,
  cwd,
  distFolderPath,
  entryfilePath,
  externals = [],
  additionalDigestInput,
  existingDigests,
  keepNames = true,
  progressLogger,
  invocationId,
  excludeDependencies = [],
  includeFiles = [],
  excludeFiles = [],
  dependenciesToExcludeFromBundle,
  outputSourceMapsTo,
  emitTsDecoratorMetadata,
  tsConfigPath,
  minify,
  nodeTarget,
  debug,
  sourceMaps,
  sourceMapBannerType,
  installNonStaticallyBuiltDepsInDocker,
  dependenciesToExcludeFromDeploymentPackage,
  isLambda,
  requiresGlibcBinaries,
  dockerBuildOutputArchitecture,
  outputModuleFormat,
  skipDigestCalculation
}: StpBuildpackInput &
  EsLanguageSpecificConfig & {
    minify: boolean;
    nodeTarget: string;
    installNonStaticallyBuiltDepsInDocker: boolean;
    sourceMaps?: 'inline' | 'external' | 'disabled';
    sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled';
    isLambda?: boolean;
    skipDigestCalculation?: boolean;
  }) => {
  await dependencyInstaller.install({ rootProjectDirPath: cwd, progressLogger });

  const distIndexFilePath = join(distFolderPath, 'index.js');

  const hasSharedLayerExternals = externals.length > 0;
  const buildDescription = hasSharedLayerExternals
    ? 'Re-building code without dependencies in shared layer'
    : 'Building code';
  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: buildDescription });

  // Look for lockfile in monorepo root first, then cwd
  const monorepoRoot = await findProjectRoot(cwd);
  const lockFileDir = monorepoRoot || cwd;
  const { packageManager } = await getLockFileData(lockFileDir);
  const { dependenciesToInstallInDocker, dynamicallyImportedModules, sourceFiles, allModules, externalModules } =
    await buildEsCode({
      minify,
      sourcePath: entryfilePath,
      distPath: distIndexFilePath,
      sourceMaps: sourceMaps || 'external',
      sourceMapBannerType: sourceMapBannerType || 'pre-compiled',
      externals,
      dependenciesToExcludeFromBundle,
      emitTsDecoratorMetadata,
      excludeDependencies,
      tsConfigPath,
      cwd,
      keepNames,
      nodeTarget,
      isLambda,
      outputModuleFormat
    });

  if (dependenciesToInstallInDocker.length && !packageManager) {
    raiseError({
      type: 'PACKAGING',
      message:
        'Failed to load dependency lockfile. You need to install your dependencies first. Supported package managers are npm and yarn.'
    });
  }

  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  const explicitlyIncludedFiles = includeFiles ? await getMatchingFilesByGlob({ globPattern: includeFiles, cwd }) : [];

  const absoluteWorkloadSourceFiles = explicitlyIncludedFiles
    .map((path) => ({ path }))
    .concat(sourceFiles.map(({ path }) => ({ path: join(process.cwd(), path) })))
    .map(({ path }) => ({ path: isAbsolute(path) ? path : join(cwd, path) }));

  const absoluteExplicitlyIncludedFiles = explicitlyIncludedFiles.map((f) => join(cwd, f));
  const [explicitlyIncludedFilesDigest, dependenciesFromExplicitlyIncludedFiles] = await Promise.all([
    getHashFromMultipleFiles(absoluteExplicitlyIncludedFiles),
    getAllJsDependenciesFromMultipleFiles({
      absoluteFilePaths: absoluteExplicitlyIncludedFiles,
      workingDir: cwd,
      distFolderPath
    })
  ]);

  const allDependenciesToInstallInDocker = uniqWith(
    dependenciesToInstallInDocker
      .concat(
        dependenciesFromExplicitlyIncludedFiles.map((dep) => ({ ...dep, note: 'FROM_EXPLICITLY_INCLUDED_FILES' }))
      )
      .filter(Boolean),
    (a, b) => a.name === b.name
  )
    .filter((dep) => !dependenciesToExcludeFromDeploymentPackage?.includes(dep.name))
    .filter((dep) => !DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION.includes(dep.name));

  if (debug) {
    console.info(
      `[DEBUG] [Resource ${name}].
-> Dependencies installed in docker: ${
        allDependenciesToInstallInDocker.length
          ? allDependenciesToInstallInDocker.map((dep) => `${dep.name}@${dep.version} (note: ${dep.note})`).join('\n')
          : 'none'
      }
-> External modules: ${externalModules.length ? externalModules.map((dep) => `${dep.name} (note: ${dep.note})`).join('\n') : 'none'}`
    );
  }

  let digest = 'dev-mode-no-digest';

  if (!skipDigestCalculation) {
    await progressLogger.startEvent({
      eventType: 'CALCULATE_CHECKSUM',
      description: 'Calculating checksum for caching'
    });
    const explicitlyIncludedFilesDigestHex = explicitlyIncludedFilesDigest.digest('hex');
    digest = await getBundleDigest({
      externalDependencies: dependenciesToInstallInDocker.map((dep) => ({ name: dep.name, version: dep.version })),
      cwd,
      workloadPath: distIndexFilePath,
      additionalDigestInput: [
        additionalDigestInput,
        explicitlyIncludedFilesDigestHex,
        dockerBuildOutputArchitecture
      ].join('')
    });
    if (existingDigests.includes(digest)) {
      await progressLogger.finishEvent({
        eventType: 'CALCULATE_CHECKSUM',
        finalMessage: 'Same artifact is already deployed, skipping.'
      });
      return {
        digest,
        outcome: 'skipped' as const,
        distFolderPath,
        distIndexFilePath,
        dynamicallyImportedModules,
        sourceFiles: absoluteWorkloadSourceFiles,
        languageSpecificBundleOutput: { es: {} },
        resolvedModules: allModules
      };
    }
    await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });
  }

  await progressLogger.startEvent({
    eventType: 'RESOLVE_DEPENDENCIES',
    description: 'Resolving dependencies'
  });

  const copyProps = {
    forceExclude: includeFiles,
    forceInclude: excludeFiles,
    distFolderPath,
    workingDir: cwd,
    bundledItemName: name,
    invocationId
  };

  const hasPrisma = allModules.find((m) => m.startsWith('@prisma/'));
  await Promise.all([
    hasPrisma &&
      resolvePrisma({
        distFolderPath,
        workingDir: cwd,
        debug,
        workloadName: name,
        isAlpine: !requiresGlibcBinaries,
        isLambda
      }),
    installNonStaticallyBuiltDepsInDocker &&
      copyDockerInstalledModulesForLambda({
        ...copyProps,
        dependencies: allDependenciesToInstallInDocker,
        workloadName: name,
        packageManager,
        lambdaRuntimeVersion: getLambdaRuntimeFromNodeTarget(nodeTarget),
        dockerBuildOutputArchitecture
      }),
    copyExplicitlyIncludedFiles({ cwd, explicitlyIncludedFiles, outputDirectory: distFolderPath }),
    outputSourceMapsTo &&
      resolveDifferentSourceMapLocation({ outputSourceMapsTo, distFolderPath, workingDir: cwd, name })
  ]);
  await progressLogger.finishEvent({ eventType: 'RESOLVE_DEPENDENCIES' });

  return {
    distIndexFilePath,
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles: absoluteWorkloadSourceFiles,
    languageSpecificBundleOutput: {
      es: {
        dependenciesToInstallInDocker: allDependenciesToInstallInDocker,
        packageManager,
        dynamicallyImportedModules
      }
    },
    resolvedModules: allModules
  };
};

const getBundleDigest = async ({
  workloadPath,
  cwd,
  externalDependencies,
  additionalDigestInput
}: {
  workloadPath: string; // absolute
  cwd: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput: string;
}) => {
  const makeAbsolute = (filePath: string) => join(cwd, filePath);
  const filesToIncludeInDigest = [FILES_TO_INCLUDE_IN_DIGEST.map(makeAbsolute), workloadPath].flat();
  const hash = await getHashFromMultipleFiles(filesToIncludeInDigest);
  hash.update(objectHash(externalDependencies));
  hash.update(additionalDigestInput || '');
  return hash.digest('hex');
};

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

  const allExternalDeps = Array.from(getExternalDeps(packageInfo, new Set()));
  const dependenciesToInstallInDocker: PackageJsonDepsInfo[] = [];

  // @todo recursively check binaries
  if (packageInfo.hasBinary) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'HAS_BINARY' });
  } else if (dependenciesToExcludeFromBundle.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_USER' });
  } else if (DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE.includes(dependency.name)) {
    dependenciesToInstallInDocker.push({ ...packageInfo, note: 'EXCLUDED_FROM_BUNDLE_BY_STACKTAPE' });
  }
  // Only externalize peer dependencies that have native binaries
  // Pure JS peer deps (like zod, ajv) can be safely bundled
  packageInfo.optionalPeerDependencies
    .filter((dep) => !IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER.includes(dep.name))
    .filter((dep) => dep.hasBinary)
    .forEach((dep) => {
      dependenciesToInstallInDocker.push({ ...dep, note: 'OPTIONAL_PEER_DEPENDENCY' });
    });
  packageInfo.peerDependencies
    .filter((dep) => dep.hasBinary)
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
      if (!sourceMapBannerFromFile) {
        if (outputModuleFormat === 'cjs') {
          const sourceMapBannerFilePath = getFirstExistingPath([
            resolve(__dirname, './source-map-install.js'),
            SOURCE_MAP_INSTALL_DIST_PATH
          ]);
          sourceMapBannerFromFile = await readFile(sourceMapBannerFilePath, 'utf-8').catch(() => {
            return '';
          });
          return { js: sourceMapBannerFromFile };
        }
        if (outputModuleFormat === 'esm') {
          return { js: ESM_SOURCE_MAP_BANNER };
        }
        return { js: '' };
      }
      return { js: sourceMapBannerFromFile };
    }

    if (sourceMapBannerType === 'node_modules') {
      return {
        js:
          outputModuleFormat === 'cjs'
            ? "require('source-map-support').install({ environment: 'node', handleUncaughtExceptions: false });"
            : ''
      };
    }
  } catch {
    return { js: '' };
  }
};
