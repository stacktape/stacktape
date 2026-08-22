import type { CreatePackagingError, EsBuildActions, StpBuildpackInput } from '../../runtime-contracts';
import type { BunPlugin } from 'bun';
import type { PackageJsonDepsInfo } from '../../es/bundler-helpers';
import { existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { getRelativePath, isFileAccessible, transformToUnixPath } from '../../fs/files';
import {
  NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING,
  STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION
} from '../constants';
import { findProjectRoot } from '../../es/project-root';
import { outputJSON, readFile, readFileSync, realpathSync, writeJson } from 'fs-extra';
import objectHash from 'object-hash';
import {
  DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE,
  FILES_TO_INCLUDE_IN_DIGEST,
  IGNORED_MODULES,
  IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER
} from '../../es/config';
import { copyDockerInstalledModulesForLambda } from '../../es/native-dependencies';
import { isNodeBuiltinImport } from './module-specifier';
import {
  getAllJsDependenciesFromMultipleFiles,
  getExternalDeps,
  getLambdaRuntimeFromNodeTarget,
  getLockFileData,
  resolveDifferentSourceMapLocation,
  resolvePrisma
} from './utils';
import {
  createModuleResolver,
  determineIfAlias,
  ensureDefaultExport,
  ESM_SOURCE_MAP_BANNER,
  filterDuplicates,
  getInfoFromPackageJson,
  getTsconfigAliases
} from '../../es/bundler-helpers';
import type { EsLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import type { ResolvedPackageDependency } from '../../runtime-contracts';
import { getFirstExistingPath, getHashFromMultipleFiles, getMatchingFilesByGlob } from '../../fs/files';
import { createDockerDependencyPlan } from './docker-dependency-plan';
import {
  copyExplicitlyIncludedFiles,
  removeExplicitlyExcludedFiles as removeArtifactFiles
} from '../../artifact/file-selection';
import { getDirectoryChecksum } from '../../artifact/hashing';
import { rewriteLambdaAssetReferences } from '../../artifact/lambda-assets';

/** Kept on the established ES bundler surface while file-selection ownership lives in the artifact layer. */
export const removeExplicitlyExcludedFiles: typeof removeArtifactFiles = (options) => removeArtifactFiles(options);

// Extract module name from import path (handles scoped packages)
const getModuleNameFromPath = (importPath: string): string => {
  const moduleName = importPath.endsWith('/') ? importPath.slice(0, importPath.length - 1) : importPath;
  const [firstPart, secondPart] = moduleName.split('/');
  if (!firstPart) {
    return moduleName;
  }
  return firstPart.startsWith('@') && secondPart ? `${firstPart}/${secondPart}` : firstPart;
};

const dedupeDependenciesByName = <T extends { name: string }>(dependencies: T[]): T[] => {
  const seen = new Set<string>();
  return dependencies.filter(({ name }) => {
    if (seen.has(name)) {
      return false;
    }
    seen.add(name);
    return true;
  });
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
  emitTsDecoratorMetadata,
  plugins,
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  sourceMapBannerType,
  define,
  metafile,
  isLambda,
  createPackagingError,
  sourceMapInstallPath
}: {
  sourcePath?: string | undefined;
  sourcePaths?: string[] | undefined;
  rawCode?: string | undefined;
  distPath?: string | undefined;
  distDir?: string | undefined;
  minify?: boolean | undefined;
  externals: string[];
  metafile?: string | undefined;
  sourceMaps: 'inline' | 'external' | 'disabled';
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  tsConfigPath?: string | undefined;
  cwd: string;
  allowFailedImports?: boolean | undefined;
  keepNames?: boolean | undefined;
  nodeTarget?: string | undefined;
  splitting?: boolean | undefined;
  plugins?: BunPlugin[] | undefined;
  excludeDependencies?: string[] | undefined;
  dependenciesToExcludeFromBundle?: string[] | undefined;
  outputModuleFormat?: 'esm' | 'cjs' | undefined;
  emitTsDecoratorMetadata?: boolean | undefined;
  define?: Record<string, string> | undefined;
  legalComments?: 'external' | 'inline' | 'linked' | 'none' | 'eof' | undefined;
  isLambda?: boolean | undefined;
  createPackagingError: CreatePackagingError;
  sourceMapInstallPath?: string | undefined;
}): Promise<{
  dependenciesToInstallInDocker: ResolvedPackageDependency[];
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
    // Use user project's cwd, not process.cwd() which may be Stacktape's own directory
    const cwdTsConfigPath = join(cwd, 'tsconfig.json');
    tsConfigPathForBuild = existsSync(cwdTsConfigPath) ? cwdTsConfigPath : undefined;
  }

  // Bun.build takes decorator options from the tsconfig it discovers next to each source file and ignores the one
  // passed here, so the option is honored by transpiling decorated sources before they reach the bundler.
  const decoratorMetadataPlugin = emitTsDecoratorMetadata
    ? (await import('./decorator-metadata')).createDecoratorMetadataPlugin({
        createPackagingError,
        tsConfigPath: tsConfigPathForBuild
      })
    : undefined;

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

  // Helper to check if a module path is a workspace package (a package living inside the monorepo).
  // findModulePath returns real paths, so the symlink that node_modules uses to reach a workspace
  // package is already resolved here and only the location of the real directory is meaningful.
  const isWorkspacePackage = (modulePath: string): boolean => {
    if (!unixMonorepoRoot) return false;
    try {
      const realPath = transformToUnixPath(realpathSync(modulePath));
      return realPath.startsWith(unixMonorepoRoot) && !realPath.includes('node_modules');
    } catch {
      return false;
    }
  };

  const runBuild = async ({ dynamicallyImportedModules = [] }: { dynamicallyImportedModules?: string[] }) => {
    const allDependenciesToInstallInDocker: ResolvedPackageDependency[] = [];
    const externalModules: { name: string; note: string }[] = [];
    const allModules: string[] = [];
    // Note: Source file tracking moved to metafile.inputs (more accurate, no plugin overhead)

    // Bun plugin to analyze dependencies (port of stp-analyze-deps-plugin)
    const stpAnalyzeDepsPlugin: BunPlugin = {
      name: 'stp-analyze-deps-plugin',
      setup(build) {
        // Analyze dependencies via onResolve
        build.onResolve(
          { filter: /^[^.]/ },
          async (args): Promise<{ path: string; external?: boolean } | undefined> => {
            // Skip relative imports (starting with . or /)
            if (args.path.startsWith('.') || args.path.startsWith('/') || isAbsolute(args.path)) {
              return undefined;
            }

            const moduleName = getModuleNameFromPath(args.path);
            allModules.push(moduleName);

            // Skip built-in modules
            if (isNodeBuiltinImport(args.path) || args.path === sourcePath) {
              return undefined;
            }

            // Already marked as external
            if (externalModules.find((m) => m.name === moduleName)) {
              return { path: args.path, external: true };
            }

            // Skip runtime-included AWS SDK v3 clients for Lambda
            if (skipAwsSdkV3Deps && moduleName.startsWith('@aws-sdk/client-')) {
              return { path: args.path, external: true };
            }

            // Check if it's a tsconfig alias
            const isAlias = await determineIfAlias({ moduleName, aliases });
            if (isAlias) {
              if (process.platform === 'win32') {
                try {
                  const importerDirectory =
                    args.resolveDir || (args.importer && isAbsolute(args.importer) ? dirname(args.importer) : cwd);
                  const resolvedAliasPath = Bun.resolveSync(args.path, importerDirectory);
                  if (isAbsolute(resolvedAliasPath)) {
                    return { path: transformToUnixPath(realpathSync(resolvedAliasPath)) };
                  }
                } catch {
                  // Preserve Bun's normal alias resolution and error reporting.
                }
              }
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
              // Resolve the complete import first so package exports and subpaths such as
              // `@stacktape/analytics/events` do not fall back to Bun's symlinked node_modules path.
              try {
                const importerDirectory =
                  args.resolveDir || (args.importer && isAbsolute(args.importer) ? dirname(args.importer) : cwd);
                const resolvedImportPath = Bun.resolveSync(args.path, importerDirectory);
                if (isAbsolute(resolvedImportPath)) {
                  return { path: transformToUnixPath(realpathSync(resolvedImportPath)) };
                }
              } catch {
                // Fall back to the package entrypoint probes below.
              }
              // Find the entry file in the workspace package
              const packageJsonPath = join(realPath, 'package.json');
              try {
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
                const packageInfo = await getInfoFromPackageJson({
                  directoryPath: modulePath,
                  parentModule: null,
                  dependencyType: 'root'
                });
                if (packageInfo) {
                  allDependenciesToInstallInDocker.push({
                    ...packageInfo,
                    note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
                  });
                }
              }
              externalModules.push({
                name: moduleName,
                note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
              });
              return { path: args.path, external: true };
            }

            if (IGNORED_MODULES.concat(excludeDependencies || []).includes(moduleName)) {
              if (modulePath) {
                const pkgInfo = await getInfoFromPackageJson({
                  directoryPath: modulePath,
                  parentModule: null,
                  dependencyType: 'root'
                }).catch(() => null);
                if (pkgInfo) {
                  allDependenciesToInstallInDocker.push({ ...pkgInfo, note: 'IGNORED' });
                }
              }
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

            if (external) {
              return { path: args.path, external: true };
            }

            if (process.platform === 'win32') {
              try {
                const importerDirectory =
                  args.resolveDir || (args.importer && isAbsolute(args.importer) ? dirname(args.importer) : cwd);
                const resolvedModulePath = Bun.resolveSync(args.path, importerDirectory);
                if (isAbsolute(resolvedModulePath)) {
                  return { path: transformToUnixPath(realpathSync(resolvedModulePath)) };
                }
              } catch {
                // Let Bun surface the unresolved import through its normal build diagnostics.
              }
            }

            return undefined;
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

    // Bun plugin to resolve modules that Bun can't find on its own (mimics esbuild's loose resolution).
    // It handles transitive dependencies that aren't hoisted to root node_modules. On Windows it also resolves
    // ordinary dependencies explicitly because Bun's native pnpm resolution can return backslash paths that its
    // bundler rejects.
    const looseResolvePlugin: BunPlugin = {
      name: 'loose-resolve-plugin',
      setup(build) {
        // A bare workspace import is resolved to a forward-slash real path above, but relative imports inside that
        // package otherwise fall back to Bun's Windows resolver. Bun 1.3.14 then panics while formatting the
        // backslash path for source maps. Keep the complete workspace module graph normalized.
        if (process.platform === 'win32') {
          build.onResolve({ filter: /^(?!\.\/__virtual-entry\.ts$)\.\.?[\\/]/ }, (args) => {
            if (!args.importer) return undefined;
            try {
              const importerDirectory = args.resolveDir || dirname(args.importer);
              const resolvedModulePath = Bun.resolveSync(args.path, importerDirectory);
              if (isAbsolute(resolvedModulePath)) {
                return { path: transformToUnixPath(realpathSync(resolvedModulePath)) };
              }
            } catch {
              // Let Bun report a normal resolution error when the relative import genuinely does not exist.
            }
            return undefined;
          });
        }

        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith('.') || args.path.startsWith('/') || isAbsolute(args.path)) return undefined;

          const moduleName = getModuleNameFromPath(args.path);
          if (isNodeBuiltinImport(args.path)) return undefined;

          // On Windows this normalization must run before any early return: an import this handler
          // declines is resolved by Bun natively, which can hand its bundler a backslash path that
          // panics Bun 1.3.14 while formatting source maps. Every resolvable bare import therefore
          // goes through the forward-slash real path, whether or not the loose resolver knows it.
          if (process.platform === 'win32') {
            try {
              const importerDirectory =
                args.resolveDir || (args.importer && isAbsolute(args.importer) ? dirname(args.importer) : cwd);
              const resolvedModulePath = Bun.resolveSync(args.path, importerDirectory);
              if (isAbsolute(resolvedModulePath)) {
                return {
                  path: transformToUnixPath(realpathSync(resolvedModulePath))
                };
              }
            } catch {
              // Fall back to the package-directory resolver below.
            }
          }

          // Use combined resolution: fast path first, then walk-up from importer
          // Skip deep search for performance - it's rarely needed and expensive
          const modulePath = findModulePath(moduleName, args.importer);
          if (!modulePath) return undefined;

          const isNestedModule = moduleResolver.isNestedLocation(modulePath, moduleName);
          // On Windows the manual resolution below also covers top-level modules. Declining them
          // hands the import to Bun's native resolver, which redirects specifiers it shims at
          // runtime (node-fetch and friends) to the real package via a backslash path — and Bun
          // 1.3.14 panics while pretty-printing that path. `Bun.resolveSync` above returns the bare
          // specifier for those shims, so this branch is their only forward-slash resolution.
          if (!isNestedModule && process.platform !== 'win32') {
            return undefined;
          }

          // Module is in nested node_modules (or any module on Windows) - resolve entry point manually
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
                if (isFileAccessible(fullPath)) return { path: transformToUnixPath(resolve(fullPath)) };
                const indexPath = join(subpathFile, `index${ext || '.js'}`);
                if (isFileAccessible(indexPath)) return { path: transformToUnixPath(resolve(indexPath)) };
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

            const resolvedPath = join(modulePath, entryPoint ?? 'index.js');
            if (isFileAccessible(resolvedPath)) return { path: transformToUnixPath(resolve(resolvedPath)) };

            const extensions = ['.js', '.mjs', '.cjs', '.ts', '.json'];
            for (const ext of extensions) {
              const pathWithExt = resolvedPath.replace(/\.(js|mjs|cjs)$/, '') + ext;
              if (isFileAccessible(pathWithExt)) return { path: transformToUnixPath(resolve(pathWithExt)) };
            }
          } catch {
            // If we can't read package.json, let Bun try its resolution
          }

          return undefined;
        });
      }
    };

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

    const allBunPlugins: BunPlugin[] = [
      bunFfiShimPlugin,
      stpAnalyzeDepsPlugin,
      looseResolvePlugin,
      nativeNodeModulesPlugin,
      ...(decoratorMetadataPlugin ? [decoratorMetadataPlugin] : []),
      ...(plugins || [])
    ];

    // Determine entry points - convert to Unix paths for Bun on Windows
    const entryPoints = (sourcePath ? [sourcePath] : sourcePaths || []).map(transformToUnixPath);

    // Determine output directory - convert to Unix path
    const outdir = distDir || (distPath ? dirname(distPath) : undefined);
    const unixOutdir = outdir ? transformToUnixPath(outdir) : undefined;

    // Handle raw code using Bun's in-memory virtual files (no temp file needed)
    // Path must start with "./" so Bun's onResolve plugins (filter: /^[^.]/) skip it
    let virtualFiles: Record<string, string> | undefined;
    if (rawCode) {
      const virtualEntryPath = './__virtual-entry.ts';
      entryPoints.push(virtualEntryPath);
      virtualFiles = { [virtualEntryPath]: rawCode };
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
    const banner = await getSourceMapBanner({ sourceMapBannerType, outputModuleFormat, sourceMapInstallPath });
    const shouldInjectBanner =
      (outputModuleFormat === 'cjs' && sourceMapBannerType !== 'disabled') ||
      (outputModuleFormat === 'esm' && sourceMapBannerType === 'pre-compiled');

    // Use monorepo root for module resolution if available
    // Convert to Unix paths for Bun compatibility on Windows
    const buildRoot = transformToUnixPath(monorepoRoot || cwd);
    const shouldMinify = minify !== undefined ? minify : true;
    const minifyConfig =
      isLambda && outputModuleFormat === 'cjs' && shouldMinify
        ? { syntax: true, whitespace: true, identifiers: false }
        : shouldMinify;

    let buildResult: Awaited<ReturnType<typeof Bun.build>>;
    try {
      buildResult = await Bun.build({
        entrypoints: entryPoints,
        ...(unixOutdir ? { outdir: unixOutdir } : {}),
        target: 'node',
        format: splitting ? 'esm' : outputModuleFormat,
        splitting: splitting && outputModuleFormat === 'esm',
        minify: minifyConfig,
        sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
        external: ['fsevents', ...externals, ...externalModules.map((m) => m.name)],
        // Bun otherwise replaces NODE_ENV with the Bun process's value at build time (normally "development").
        // Keep it runtime-configurable; production images provide their own production default.
        define: {
          'process.env.NODE_ENV': 'process.env.NODE_ENV',
          ...esmDefines,
          ...define
        },
        plugins: allBunPlugins,
        root: buildRoot,
        ...(shouldInjectBanner && banner.js ? { banner: banner.js } : {}),
        ...(tsConfigPathForBuild ? { tsconfig: tsConfigPathForBuild } : {}),
        metafile: true,
        ...(virtualFiles && { files: virtualFiles })
      });
    } catch (err: unknown) {
      // Bun can throw AggregateError with message "Bundle failed" for severe errors
      const errorRecord = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      const nestedErrors = Array.isArray(errorRecord.errors) ? errorRecord.errors : [];
      const errorDetails = nestedErrors.length
        ? nestedErrors.map((error) => (error instanceof Error ? error.message : String(error))).join('\n')
        : err instanceof Error
          ? err.message
          : String(err);
      throw createPackagingError({
        type: 'BUILD_CODE',
        message: `Build failed: ${errorDetails}`,
        hint: 'Check that the entrypoint file exists and is valid TypeScript/JavaScript.'
      });
    }

    if (!buildResult.success) {
      const errors = buildResult.logs
        .filter((log) => log.level === 'error')
        .map((log) => log.message)
        .join('\n');
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Build failed: ${errors}`
      });
    }

    if (isLambda) {
      const assetFiles = buildResult.outputs.filter((output) => output.kind === 'asset').map(({ path }) => path);
      if (assetFiles.length > 0) {
        await Promise.all(
          buildResult.outputs
            .filter(({ path }) => path.endsWith('.js'))
            .map(async ({ path }) => {
              const contents = await readFile(path, 'utf8');
              await Bun.write(path, rewriteLambdaAssetReferences(contents, assetFiles));
            })
        );
      }
    }

    // If single output file expected, rename it
    if (distPath && !distDir && buildResult.outputs.length > 0) {
      const output = buildResult.outputs[0];
      if (!output) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: 'Bundler did not produce the expected output file.'
        });
      }
      const outputPath = output.path;
      if (outputPath !== distPath) {
        const fs = await import('fs-extra');
        await fs.move(outputPath, distPath, { overwrite: true });

        // Move source map file alongside the renamed JS file
        const sourceMapPath = `${outputPath}.map`;
        if (existsSync(sourceMapPath)) {
          await fs.move(sourceMapPath, `${distPath}.map`, { overwrite: true });
        }

        // Fix sourceMappingURL comment inside the JS to point to the renamed map file
        const oldMapName = `${basename(outputPath)}.map`;
        const newMapName = `${basename(distPath)}.map`;
        if (oldMapName !== newMapName) {
          const jsContent = await readFile(distPath, 'utf-8');
          const fixedContent = jsContent.replace(
            `//# sourceMappingURL=${oldMapName}`,
            `//# sourceMappingURL=${newMapName}`
          );
          if (fixedContent !== jsContent) {
            await Bun.write(distPath, fixedContent);
          }
        }
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

    // Extract source files from metafile (more accurate than onLoad tracking)
    const buildMetafile = buildResult.metafile as { inputs: Record<string, unknown>; outputs: Record<string, unknown> };
    const sourceFiles = Object.keys(buildMetafile?.inputs || {})
      .filter((inputPath) => !inputPath.includes('node_modules'))
      .filter(filterDuplicates)
      .map((inputPath) => ({ path: inputPath }));

    // Write metafile if requested (for compatibility with external tools)
    if (metafile && distPath) {
      await writeJson(join(dirname(distPath), metafile), buildMetafile);
    }

    return {
      dependenciesToInstallInDocker: dedupeDependenciesByName(allDependenciesToInstallInDocker),
      externalModules,
      dynamicallyImportedModules,
      sourceFiles,
      allModules
    };
  };

  return runBuild({}).catch(async (error) => {
    const printableSrcPath = sourcePath
      ? transformToUnixPath(getRelativePath(sourcePath))
      : rawCode
        ? '<raw code>'
        : '<unknown>';

    // Handle dynamic import errors by retrying with those modules externalized
    if (error.message?.includes('Could not resolve')) {
      const dynamicImportMatch = error.message.match(/Could not resolve "([^"]+)"/g);
      if (dynamicImportMatch) {
        const failedModules = dynamicImportMatch.map((m: string) => m.replace(/Could not resolve "|"/g, ''));
        return runBuild({ dynamicallyImportedModules: failedModules });
      }
    }

    throw createPackagingError({
      type: 'BUILD_CODE',
      message: `Failed to build code at ./${printableSrcPath}\n${error.message || error}`,
      hint: error?.hint,
      stack: error?.stack
    });
  });
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
  skipDigestCalculation,
  createPackagingError,
  installDependencies,
  nativeDependencyInstallationRootPath,
  runDocker,
  sourceMapInstallPath
}: StpBuildpackInput &
  EsBuildActions &
  EsLanguageSpecificConfig & {
    minify: boolean;
    nodeTarget: string;
    installNonStaticallyBuiltDepsInDocker: boolean;
    sourceMaps?: 'inline' | 'external' | 'disabled' | undefined;
    sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled' | undefined;
    isLambda?: boolean | undefined;
    skipDigestCalculation?: boolean | undefined;
  }) => {
  await installDependencies({ rootProjectDirPath: cwd, progressLogger });

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
      // TypeScript expands decorators before Bun sees the module. Bun does not compose the transform's source map,
      // so emitting its map would produce incorrect stack-trace line numbers. Prefer no map over a misleading one.
      sourceMaps: emitTsDecoratorMetadata ? 'disabled' : sourceMaps || 'external',
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
      outputModuleFormat,
      createPackagingError,
      sourceMapInstallPath
    });

  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  const [includedSourceFiles, excludedSourceFiles] = await Promise.all([
    includeFiles.length > 0 ? getMatchingFilesByGlob({ globPattern: includeFiles, cwd }) : [],
    excludeFiles.length > 0 ? getMatchingFilesByGlob({ globPattern: excludeFiles, cwd }) : []
  ]);
  const excludedSourceFileSet = new Set(excludedSourceFiles.map((path) => path.replace(/\\/g, '/')));
  const explicitlyIncludedFiles = includedSourceFiles
    .filter((path) => !excludedSourceFileSet.has(path.replace(/\\/g, '/')))
    .toSorted();

  const absoluteWorkloadSourceFiles = explicitlyIncludedFiles
    .map((path) => ({ path }))
    .concat(sourceFiles.map(({ path }) => ({ path: join(process.cwd(), path) })))
    .map(({ path }) => ({ path: isAbsolute(path) ? path : join(cwd, path) }));

  const absoluteExplicitlyIncludedFiles = explicitlyIncludedFiles.map((f) => join(cwd, f));
  const [explicitlyIncludedFilesDigest, dependenciesFromExplicitlyIncludedFiles] = await Promise.all([
    getHashFromMultipleFiles({
      files: absoluteExplicitlyIncludedFiles.map((path, index) => ({
        path,
        identity: explicitlyIncludedFiles[index]!
      }))
    }),
    getAllJsDependenciesFromMultipleFiles({
      absoluteFilePaths: absoluteExplicitlyIncludedFiles,
      workingDir: cwd,
      distFolderPath
    })
  ]);

  const dockerDependencyPlan = createDockerDependencyPlan({
    bundledDependencies: dependenciesToInstallInDocker,
    explicitlyIncludedDependencies: dependenciesFromExplicitlyIncludedFiles,
    dependenciesToExcludeFromDeploymentPackage,
    packageManager,
    createPackagingError
  });
  const allDependenciesToInstallInDocker = dockerDependencyPlan?.dependencies ?? [];

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
      distFolderPath,
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
        isLambda,
        createPackagingError
      }),
    installNonStaticallyBuiltDepsInDocker &&
      dockerDependencyPlan &&
      copyDockerInstalledModulesForLambda({
        ...copyProps,
        dependencies: allDependenciesToInstallInDocker,
        installationRootPath: nativeDependencyInstallationRootPath,
        packageManager: dockerDependencyPlan.packageManager,
        lambdaRuntimeVersion: getLambdaRuntimeFromNodeTarget(nodeTarget),
        dockerBuildOutputArchitecture,
        runDocker
      }),
    copyExplicitlyIncludedFiles({ cwd, explicitlyIncludedFiles, outputDirectory: distFolderPath }),
    outputSourceMapsTo &&
      resolveDifferentSourceMapLocation({ outputSourceMapsTo, distFolderPath, workingDir: cwd, name })
  ]);
  await removeExplicitlyExcludedFiles({ createPackagingError, excludeFiles, outputDirectory: distFolderPath });
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
  distFolderPath,
  cwd,
  externalDependencies,
  additionalDigestInput
}: {
  distFolderPath: string;
  cwd: string;
  externalDependencies: { name: string; version: string }[];
  additionalDigestInput: string;
}) => {
  const filesToIncludeInDigest = FILES_TO_INCLUDE_IN_DIGEST.map((filePath) => ({
    path: join(cwd, filePath),
    identity: filePath
  }));
  const hash = await getHashFromMultipleFiles({ files: filesToIncludeInDigest });
  hash.update(await getDirectoryChecksum({ absoluteDirectoryPath: distFolderPath }));
  hash.update(`stacktape-buildpack:${STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION}`);
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
  if (!packageInfo) {
    return { dependenciesToInstallInDocker: [], allExternalDeps: [] };
  }

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

const cjsSourceMapBannersByPath = new Map<string, string>();

const getSourceMapBanner = async ({
  sourceMapBannerType,
  outputModuleFormat,
  sourceMapInstallPath
}: {
  sourceMapBannerType: 'node_modules' | 'pre-compiled' | 'disabled';
  outputModuleFormat: 'esm' | 'cjs';
  sourceMapInstallPath?: string | undefined;
}): Promise<{ js: string }> => {
  try {
    if (sourceMapBannerType === 'disabled') {
      return { js: '' };
    }
    if (sourceMapBannerType === 'pre-compiled') {
      if (outputModuleFormat === 'esm') {
        return { js: ESM_SOURCE_MAP_BANNER };
      }
      if (outputModuleFormat === 'cjs') {
        const sourceMapBannerFilePath = getFirstExistingPath([
          resolve(__dirname, './source-map-install.js'),
          ...(sourceMapInstallPath ? [sourceMapInstallPath] : [])
        ]);
        if (!sourceMapBannerFilePath) {
          return { js: '' };
        }
        if (!cjsSourceMapBannersByPath.has(sourceMapBannerFilePath)) {
          cjsSourceMapBannersByPath.set(
            sourceMapBannerFilePath,
            await readFile(sourceMapBannerFilePath, 'utf-8').catch(() => '')
          );
        }
        return { js: cjsSourceMapBannersByPath.get(sourceMapBannerFilePath)! };
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
  } catch {
    return { js: '' };
  }
  return { js: '' };
};
