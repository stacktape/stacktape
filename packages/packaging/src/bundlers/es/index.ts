import { packagingMessages } from '../../runtime-contracts';
import type { CreatePackagingError, EsBuildActions, StpBuildpackInput } from '../../runtime-contracts';
import type { BunPlugin } from 'bun';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { getRelativePath, isFileAccessible, transformToUnixPath } from '../../fs/files';
import { STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION } from '../constants';
import { findProjectRoot } from '../../es/project-root';
import { outputJSON, readFile, readFileSync, realpathSync, writeJson } from 'fs-extra';
import objectHash from 'object-hash';
import { FILES_TO_INCLUDE_IN_DIGEST, IGNORED_MODULES } from '../../es/config';
import {
  getLambdaArchitecture,
  getLambdaDependencyIdentity,
  planLambdaDependencies,
  writeLambdaDependencies
} from '../../es/native-dependencies';
import { createBunFfiShimPlugin, createNativeNodeModulesPlugin, isBareImportSpecifier } from '../../es/bun-plugins';
import { getBunMinifyConfig } from '../../es/minify';
import { takeSourceMapsOutOfPackage, writePackagedSourceMap } from '../../es/packaged-source-map';
import { writeEditedJavaScript } from '../../es/source-map-edits';
import { normalizeBundleIdentity } from '../../es/artifact-identity';
import {
  classifyBeforeResolution,
  classifyResolvedModule,
  getModuleName as getModuleNameFromPath,
  isNodeBuiltinImport
} from '../../es/import-classification';
import {
  getDependenciesOfIncludedFiles,
  getLambdaRuntimeFromNodeTarget,
  getLockFileData,
  saveSourceMapCopy,
  resolvePrisma
} from './utils';
import {
  createModuleResolver,
  getDefaultExportEdit,
  CJS_PATH_BANNER,
  ESM_SOURCE_MAP_BANNER,
  filterDuplicates,
  getTsconfigAliases,
  isRequireImportKind,
  packageEntryConditions,
  resolveWithRequireCondition
} from '../../es/bundler-helpers';
import type { JsBundleOptions, ResolvedPackageDependency } from '../../runtime-contracts';
import { getFirstExistingPath, getHashFromMultipleFiles, getMatchingFilesByGlob } from '../../fs/files';
import { copyExplicitlyIncludedFiles, removeExplicitlyExcludedFiles } from '../../artifact/file-selection';
import {
  LAMBDA_ARCHIVE_FORMAT,
  listArchiveEntries,
  UnsupportedArchiveEntryError
} from '../../artifact/archive-entries';
import { getArchiveInventoryChecksum, getDirectoryChecksum } from '../../artifact/hashing';
import { rewriteLambdaAssetReferences } from '../../artifact/lambda-assets';

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
  minifyIdentifiers,
  bundleAwsSdk,
  rawCode,
  externals = [],
  sourceMaps,
  tsConfigPath,
  cwd,
  nodeTarget = process.versions.node,
  bundleTarget = 'node',
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
  /** Shorten local identifiers too; `es/minify` explains why this is off unless asked. */
  minifyIdentifiers?: boolean | undefined;
  /** Bundle `@aws-sdk/*` from `node_modules` instead of leaving it to the Lambda runtime. */
  bundleAwsSdk?: boolean | undefined;
  nodeTarget?: string | undefined;
  /** Bun.build's target: `bun` when the image runs on Bun, otherwise `node` (Deno consumes the Node output). */
  bundleTarget?: 'node' | 'bun' | undefined;
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
  /** Packages the bundle leaves out that the artifact has to carry. */
  externalDependencies: ResolvedPackageDependency[];
  externalModules: { name: string; note: string }[];
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

  /**
   * Resolve a package import to a forward-slash real path, keeping the export condition Bun's own
   * resolver would have used for this import kind. `Bun.resolveSync` always applies the ESM `import`
   * condition, so a plugin that answers a bundled `require()` with it hands the CommonJS consumer a
   * module namespace object instead of `module.exports`; see resolveWithRequireCondition.
   */
  const resolvePackageImport = (args: {
    path: string;
    importer: string;
    resolveDir?: string | undefined;
    kind: Bun.ImportKind;
  }): { path: string } | undefined => {
    try {
      const requireResolved = isRequireImportKind(args.kind)
        ? resolveWithRequireCondition({ specifier: args.path, importer: args.importer, resolveDir: args.resolveDir })
        : undefined;
      if (requireResolved) return { path: transformToUnixPath(realpathSync(requireResolved)) };
      const importerDirectory =
        args.resolveDir || (args.importer && isAbsolute(args.importer) ? dirname(args.importer) : cwd);
      const resolvedPath = Bun.resolveSync(args.path, importerDirectory);
      if (isAbsolute(resolvedPath)) return { path: transformToUnixPath(realpathSync(resolvedPath)) };
    } catch {
      // Let the caller fall back to its own probes, or to Bun's normal resolution diagnostics.
    }
    return undefined;
  };

  const runBuild = async () => {
    const externalDependencies: ResolvedPackageDependency[] = [];
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
            if (!isBareImportSpecifier(args.path)) return undefined;

            const moduleName = getModuleNameFromPath(args.path);
            allModules.push(moduleName);

            if (args.path === sourcePath) {
              return undefined;
            }

            // Already marked as external
            if (externalModules.find((m) => m.name === moduleName)) {
              return { path: args.path, external: true };
            }

            const preResolution = classifyBeforeResolution({
              aliases,
              bundleAwsSdk,
              isLambda,
              moduleName,
              nodeTarget,
              specifier: args.path
            });
            if (preResolution.outcome === 'builtin') {
              return undefined;
            }
            if (preResolution.outcome === 'runtime-provided') {
              return { path: args.path, external: true };
            }

            if (preResolution.outcome === 'alias') {
              // A tsconfig alias points at project sources, not at a package with export conditions, so
              // this deliberately stays on Bun's resolution rather than resolvePackageImport: a CommonJS
              // resolver would reach a real installed package that shadows the alias name.
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
              const resolvedImport = resolvePackageImport(args);
              if (resolvedImport) return resolvedImport;
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

            const verdict = await classifyResolvedModule({
              dependenciesToExcludeFromBundle,
              excludeDependencies: excludeDependencies || [],
              ignoredModules: IGNORED_MODULES,
              modulePath,
              moduleName,
              shouldIgnoreAllDeps,
              importer: args.importer,
              importKind: args.kind
            });
            externalDependencies.push(...verdict.externalDependencies);

            if (verdict.outcome === 'external') {
              externalModules.push({ name: moduleName, note: verdict.note });
              return { path: args.path, external: true };
            }

            if (!modulePath) {
              return undefined;
            }

            if (process.platform === 'win32') {
              const resolvedModule = resolvePackageImport(args);
              if (resolvedModule) return resolvedModule;
            }

            return undefined;
          }
        );
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
            return resolvePackageImport(args);
          });
        }

        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (!isBareImportSpecifier(args.path)) return undefined;

          const moduleName = getModuleNameFromPath(args.path);
          if (isNodeBuiltinImport(args.path)) return undefined;

          // On Windows this normalization must run before any early return: an import this handler
          // declines is resolved by Bun natively, which can hand its bundler a backslash path that
          // panics Bun 1.3.14 while formatting source maps. Every resolvable bare import therefore
          // goes through the forward-slash real path, whether or not the loose resolver knows it.
          if (process.platform === 'win32') {
            // Falls through to the package-directory resolver below when this returns nothing.
            const resolvedModule = resolvePackageImport(args);
            if (resolvedModule) return resolvedModule;
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

            // Resolve main entry point, preferring the export condition Bun's own resolver would use
            // for this import kind. A `require()` call answered with an ESM entry receives a namespace
            // object instead of `module.exports`; see resolveWithRequireCondition.
            let entryPoint: string | undefined;
            if (pkgJson.exports) {
              const exports = pkgJson.exports;
              if (typeof exports === 'string') {
                entryPoint = exports;
              } else if (exports['.']) {
                const dotExport = exports['.'];
                if (typeof dotExport === 'string') {
                  entryPoint = dotExport;
                } else {
                  for (const condition of packageEntryConditions(args.kind)) {
                    const value = dotExport[condition];
                    if (typeof value === 'string') {
                      entryPoint = value;
                      break;
                    }
                    if (value && typeof value === 'object' && typeof value.default === 'string') {
                      entryPoint = value.default;
                      break;
                    }
                  }
                }
              }
            }
            // `module` names an ESM entry, so a `require()` call has to reach `main` first.
            if (!entryPoint) {
              entryPoint = isRequireImportKind(args.kind)
                ? pkgJson.main || pkgJson.module || 'index.js'
                : pkgJson.module || pkgJson.main || 'index.js';
            }

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

    const allBunPlugins: BunPlugin[] = [
      createBunFfiShimPlugin(),
      stpAnalyzeDepsPlugin,
      looseResolvePlugin,
      createNativeNodeModulesPlugin(),
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
    // Bun replaces `__dirname` and `__filename` with the build host's paths in both output formats, so a bundle
    // deployed elsewhere would read directories that only existed where it was built. Both identifiers are
    // redirected to variables that a banner defines at runtime: from `import.meta.url` in an ES module, and from the
    // `__dirname` and `__filename` Node.js itself provides to a CommonJS module.
    const pathDefines = {
      __dirname: '__stp_dirname',
      __filename: '__stp_filename'
    };

    // Get banner content to prepend
    const banner = await getSourceMapBanner({ sourceMapBannerType, outputModuleFormat, sourceMapInstallPath });
    const shouldInjectBanner =
      (outputModuleFormat === 'cjs' && sourceMapBannerType !== 'disabled') ||
      (outputModuleFormat === 'esm' && sourceMapBannerType === 'pre-compiled');
    const bannerJs = [outputModuleFormat === 'cjs' ? CJS_PATH_BANNER : '', shouldInjectBanner ? banner.js : '']
      .filter(Boolean)
      .join('\n');

    // Use monorepo root for module resolution if available
    // Convert to Unix paths for Bun compatibility on Windows
    const buildRoot = transformToUnixPath(monorepoRoot || cwd);
    const minifyConfig = getBunMinifyConfig({ minify, minifyIdentifiers });

    let buildResult: Awaited<ReturnType<typeof Bun.build>>;
    try {
      buildResult = await Bun.build({
        entrypoints: entryPoints,
        ...(unixOutdir ? { outdir: unixOutdir } : {}),
        target: bundleTarget,
        format: splitting ? 'esm' : outputModuleFormat,
        splitting: splitting && outputModuleFormat === 'esm',
        minify: minifyConfig,
        sourcemap: sourceMaps === 'disabled' ? 'none' : sourceMaps === 'external' ? 'linked' : 'inline',
        external: ['fsevents', ...externals, ...externalModules.map((m) => m.name)],
        // Bun otherwise replaces NODE_ENV with the Bun process's value at build time (normally "development").
        // Keep it runtime-configurable; production images provide their own production default.
        define: {
          'process.env.NODE_ENV': 'process.env.NODE_ENV',
          ...pathDefines,
          ...define
        },
        plugins: allBunPlugins,
        root: buildRoot,
        ...(bannerJs ? { banner: bannerJs } : {}),
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
        await rewriteLambdaAssetReferences(
          buildResult.outputs.filter(({ path }) => path.endsWith('.js')).map(({ path }) => path),
          assetFiles
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

    // Plain `.js` ESM output and split chunks need a package boundary. An explicit `.mjs` entrypoint already
    // carries its module format in the filename; writing package.json beside it can accidentally change unrelated
    // CommonJS files in the same artifact directory into ESM.
    if (splitting || (outputModuleFormat === 'esm' && !distPath?.endsWith('.mjs'))) {
      const outputDir = distDir || (distPath ? dirname(distPath) : cwd);
      await outputJSON(join(outputDir, 'package.json'), { type: 'module' });
    }

    // Ensure default export exists for Lambda runtime compatibility
    // If user exports `handler` but not `default`, append a re-export
    if (outputModuleFormat === 'esm' && distPath) {
      await writeEditedJavaScript({
        from: distPath,
        to: distPath,
        edits: (code) => [getDefaultExportEdit(code)].filter((edit) => edit !== null),
        packaged: false
      });
    }

    // CJS Lambda bundles are loaded with import() by modern Lambda runtimes and by the ADOT tracing
    // wrapper, where a CJS module's namespace `default` is ALWAYS `module.exports` itself — the
    // getter-defined `default` Bun emits is invisible there and `index.default` resolves to the
    // exports object, killing the function with Runtime.HandlerNotFound (verified on nodejs24).
    // Re-pointing module.exports at the handler function, with the named exports and a
    // self-referencing `default` copied onto it, resolves under require() and import() alike.
    if (outputModuleFormat === 'cjs' && isLambda && distPath) {
      const interopTail = [
        '',
        '/* stacktape: make `index.default` resolve under both require() and import() loaders */',
        '(() => {',
        '  const exportsObject = module.exports;',
        '  if (!exportsObject) return;',
        '  const handlerFn =',
        "    typeof exportsObject.default === 'function'",
        '      ? exportsObject.default',
        "      : typeof exportsObject.handler === 'function'",
        '        ? exportsObject.handler',
        '        : undefined;',
        '  if (!handlerFn) return;',
        '  for (const key of Object.keys(exportsObject)) {',
        "    if (key !== 'default') {",
        '      try { handlerFn[key] = exportsObject[key]; } catch {}',
        '    }',
        '  }',
        '  handlerFn.default = handlerFn;',
        '  module.exports = handlerFn;',
        '})();',
        ''
      ].join('\n');
      const content = await readFile(distPath, 'utf-8');
      await Bun.write(distPath, content + interopTail);
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

    // The bundle's debug ID and its map's sources must not depend on the build directory (`es/artifact-identity`).
    await Promise.all(
      (distPath
        ? [distPath]
        : buildResult.outputs.filter(({ path }) => path.endsWith('.js')).map(({ path }) => path)
      ).map((javascriptPath) =>
        normalizeBundleIdentity({
          javascriptPath,
          projectRoot: monorepoRoot || cwd,
          sourcesResolveFrom: outdir ?? dirname(javascriptPath)
        })
      )
    );

    return {
      externalDependencies: dedupeDependenciesByName(externalDependencies),
      externalModules,
      sourceFiles,
      allModules
    };
  };

  return runBuild().catch(async (error) => {
    const printableSrcPath = sourcePath
      ? transformToUnixPath(getRelativePath(sourcePath))
      : rawCode
        ? '<raw code>'
        : '<unknown>';
    throw createPackagingError({
      type: 'BUILD_CODE',
      message: `Failed to build code at ./${printableSrcPath}\n${error.message || error}`,
      hint: error?.hint,
      stack: error?.stack
    });
  });
};

const describeDependencies = (dependencies: { name: string; version: string; note?: string | undefined }[]) =>
  dependencies.length
    ? dependencies.map(({ name, version, note }) => `${name}@${version}${note ? ` (${note})` : ''}`).join('\n')
    : 'none';

export const createEsBundle = async ({
  name,
  cwd,
  distFolderPath,
  entryfilePath,
  externals = [],
  additionalDigestInput,
  existingDigests,
  progressLogger,
  excludeDependencies = [],
  includeFiles = [],
  excludeFiles = [],
  dependenciesToExcludeFromBundle,
  outputSourceMapsTo,
  keepSourceMapsInPackage,
  emitTsDecoratorMetadata,
  tsConfigPath,
  minify,
  minifyIdentifiers,
  bundleAwsSdk,
  nodeTarget,
  bundleTarget,
  debug,
  sourceMaps,
  sourceMapBannerType,
  packageExternalDependencies,
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
  sourceMapInstallPath,
  lambdaZip
}: StpBuildpackInput &
  EsBuildActions &
  JsBundleOptions & {
    minify: boolean;
    nodeTarget: string;
    bundleTarget?: 'node' | 'bun' | undefined;
    /**
     * Whether the artifact carries the packages the bundle leaves out in its own `node_modules`, as a Lambda ZIP does.
     * An image installs them in its Dockerfile instead.
     */
    packageExternalDependencies: boolean;
    sourceMaps?: 'inline' | 'external' | 'disabled' | undefined;
    sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled' | undefined;
    isLambda?: boolean | undefined;
    skipDigestCalculation?: boolean | undefined;
  }) => {
  // The entry file's own package (`backend/package.json` beside `backend/src/index.js`) is what the bundle resolves
  // against; the installer walks up from there to a workspace root when there is one.
  const entrypointDirectory = dirname(resolve(cwd, entryfilePath));
  await installDependencies({ rootProjectDirPath: entrypointDirectory, progressLogger });

  const distIndexFilePath = join(distFolderPath, 'index.js');
  // A Lambda ZIP keeps its maps outside the package unless the configuration keeps them in (see
  // `takeSourceMapsOutOfPackage`). Nothing then reads a map at runtime.
  const mapsLeavePackage = Boolean(lambdaZip && !keepSourceMapsInPackage);

  const hasSharedLayerExternals = externals.length > 0;
  const buildDescription = hasSharedLayerExternals
    ? 'Re-building code without dependencies in shared layer'
    : 'Building code';
  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: buildDescription });

  // The lockfile of the project the entry file belongs to, which need not be the configuration's directory.
  const projectRoot = (await findProjectRoot(entrypointDirectory)) || cwd;
  const { packageManager, lockfilePath } = await getLockFileData(projectRoot);
  const {
    externalDependencies: bundleExternalDependencies,
    sourceFiles,
    allModules,
    externalModules
  } = await buildEsCode({
    minify,
    sourcePath: entryfilePath,
    distPath: distIndexFilePath,
    // TypeScript expands decorators before Bun sees the module. Bun does not compose the transform's source map,
    // so emitting its map would produce incorrect stack-trace line numbers. Prefer no map over a misleading one.
    sourceMaps: emitTsDecoratorMetadata ? 'disabled' : sourceMaps || 'external',
    // The CommonJS banner installs `source-map-support`, which only reads maps beside the code. The ESM banner is the
    // `require`/`__dirname` shim, which every ESM bundle needs.
    sourceMapBannerType:
      sourceMapBannerType || (mapsLeavePackage && outputModuleFormat !== 'esm' ? 'disabled' : 'pre-compiled'),
    externals,
    dependenciesToExcludeFromBundle,
    emitTsDecoratorMetadata,
    excludeDependencies,
    tsConfigPath,
    cwd,
    minifyIdentifiers,
    bundleAwsSdk,
    nodeTarget,
    bundleTarget,
    isLambda,
    outputModuleFormat,
    createPackagingError,
    sourceMapInstallPath
  });
  // `outputSourceMapsTo` receives the complete map. A Lambda ZIP's map then loses `sourcesContent` before the digest,
  // so the identity describes what is deployed, and leaves the package unless the configuration keeps it there.
  const packagedSourceMapPath = join(distFolderPath, 'index.js.map');
  if (outputSourceMapsTo && existsSync(packagedSourceMapPath)) {
    await saveSourceMapCopy({ outputSourceMapsTo, distFolderPath, workingDir: cwd, name });
  }
  if (lambdaZip && existsSync(packagedSourceMapPath)) {
    await writePackagedSourceMap({ from: packagedSourceMapPath, to: packagedSourceMapPath });
  }
  const sourceMapsOutsidePackage = mapsLeavePackage
    ? await takeSourceMapsOutOfPackage({ packagePath: distFolderPath, runtimeRoot: '/var/task', directories: [''] })
    : undefined;

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
  const [explicitlyIncludedFilesDigest, dependenciesOfIncludedFiles] = await Promise.all([
    getHashFromMultipleFiles({
      files: absoluteExplicitlyIncludedFiles.map((path, index) => ({
        path,
        identity: explicitlyIncludedFiles[index]!
      })),
      // A Lambda archive keeps an included file's execute bit, and an image build context copies its mode, so either
      // way `chmod +x` changes what runs. An image without included files records nothing and keeps its digest.
      recordExecutableBits: lambdaZip || absoluteExplicitlyIncludedFiles.length > 0
    }),
    getDependenciesOfIncludedFiles({ absoluteFilePaths: absoluteExplicitlyIncludedFiles })
  ]);

  const externalDependencies = dedupeDependenciesByName([
    ...bundleExternalDependencies,
    ...dependenciesOfIncludedFiles
  ]).filter(
    (dependency) =>
      !dependenciesToExcludeFromDeploymentPackage?.includes('*') &&
      !dependenciesToExcludeFromDeploymentPackage?.includes(dependency.name)
  );
  const dependencyPlan =
    packageExternalDependencies && externalDependencies.length > 0
      ? await planLambdaDependencies({
          dependencies: externalDependencies,
          architecture: getLambdaArchitecture(dockerBuildOutputArchitecture),
          excludedNames: [...excludeDependencies, ...(dependenciesToExcludeFromDeploymentPackage ?? [])],
          withoutSourceMaps: mapsLeavePackage
        })
      : null;

  if (debug) {
    console.info(
      `[DEBUG] [Resource ${name}].
-> External dependencies: ${describeDependencies(externalDependencies)}
-> Installed again in the Lambda build image: ${describeDependencies(dependencyPlan?.packagesToInstallForLambda ?? [])}
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
      externalDependencies: dependencyPlan
        ? await getLambdaDependencyIdentity(dependencyPlan)
        : externalDependencies.map((dependency) => `${dependency.name}@${dependency.version}`),
      projectRoot,
      lockfilePath,
      cwd,
      distFolderPath,
      additionalDigestInput: [
        additionalDigestInput,
        explicitlyIncludedFilesDigestHex,
        dockerBuildOutputArchitecture,
        // Maps kept outside the package are still part of the artifact: a map-only change is a new deployment.
        sourceMapsOutsidePackage ? `source-maps:${sourceMapsOutsidePackage.sha256}` : ''
      ].join(''),
      lambdaZip,
      createPackagingError
    });
    if (existingDigests.includes(digest)) {
      await progressLogger.finishEvent({
        eventType: 'CALCULATE_CHECKSUM',
        finalMessage: packagingMessages.unchanged
      });
      return {
        digest,
        outcome: 'skipped' as const,
        distFolderPath,
        distIndexFilePath,
        sourceFiles: absoluteWorkloadSourceFiles,
        languageSpecificBundleOutput: { es: {} },
        resolvedModules: allModules
      };
    }
    await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });
  }

  await progressLogger.startEvent({
    eventType: 'RESOLVE_DEPENDENCIES',
    description: dependencyPlan?.packagesToInstallForLambda.length
      ? `Installing ${dependencyPlan.packagesToInstallForLambda.map((dependency) => dependency.name).join(', ')} for Lambda`
      : 'Resolving dependencies'
  });

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
    dependencyPlan &&
      writeLambdaDependencies({
        plan: dependencyPlan,
        nodeModulesPath: join(distFolderPath, 'node_modules'),
        installationRootPath: nativeDependencyInstallationRootPath,
        lambdaRuntimeVersion: getLambdaRuntimeFromNodeTarget(nodeTarget),
        runDocker
      }),
    copyExplicitlyIncludedFiles({ cwd, explicitlyIncludedFiles, outputDirectory: distFolderPath }),
    // An image with `outputSourceMapsTo` ships no map; the saved copy is the only one.
    outputSourceMapsTo && !lambdaZip && rm(packagedSourceMapPath, { force: true })
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
      es: { externalDependencies, packageManager }
    },
    resolvedModules: allModules,
    sourceMapsPath: sourceMapsOutsidePackage?.path
  };
};

const getLambdaBundleChecksum = async ({
  distFolderPath,
  createPackagingError
}: {
  distFolderPath: string;
  createPackagingError: CreatePackagingError;
}) => {
  try {
    return await getArchiveInventoryChecksum((await listArchiveEntries({ sourcePath: distFolderPath })).entries);
  } catch (cause) {
    if (cause instanceof UnsupportedArchiveEntryError) {
      throw createPackagingError({ type: 'PACKAGING', message: cause.message, cause });
    }
    throw cause;
  }
};

const getBundleDigest = async ({
  distFolderPath,
  cwd,
  projectRoot,
  lockfilePath,
  externalDependencies,
  additionalDigestInput,
  lambdaZip,
  createPackagingError
}: {
  distFolderPath: string;
  cwd: string;
  /** The entry file's project, whose lockfile and `patches/` describe the installed packages the artifact copies. */
  projectRoot: string;
  lockfilePath: string | null;
  /** `name@version` of every package copied beside the bundle. */
  externalDependencies: string[];
  additionalDigestInput: string;
  createPackagingError: CreatePackagingError;
  /**
   * See `StpBuildpackInput.lambdaZip`. Included files bring their executable bits, and the host rule that decided them
   * (`getHostExecutableRule`), in through `additionalDigestInput`, for archives and images alike; everything else in the
   * directory is Stacktape's own bundle output, whose archived modes that rule also decides.
   */
  lambdaZip?: boolean | undefined;
}) => {
  // A patched package keeps its version, so only the patch files (patch-package, or the patches pnpm, Yarn and Bun
  // record in the lockfile) tell the cache that a copied package changed.
  const patchFiles =
    externalDependencies.length > 0
      ? await getMatchingFilesByGlob({ globPattern: 'patches/**', cwd: projectRoot })
      : [];
  const hash = await getHashFromMultipleFiles({
    files: [
      ...FILES_TO_INCLUDE_IN_DIGEST.map((filePath) => ({ path: join(cwd, filePath), identity: filePath })),
      ...(lockfilePath ? [{ path: lockfilePath, identity: 'entrypoint-project-lockfile' }] : []),
      ...patchFiles.toSorted().map((filePath) => ({ path: join(projectRoot, filePath), identity: filePath }))
    ]
  });
  // A Lambda ZIP holds what the archive policy lists; an image build context keeps Docker's semantics (host modes, any
  // link), which that inventory does not describe, so it keeps the earlier checksum.
  hash.update(
    lambdaZip
      ? await getLambdaBundleChecksum({ distFolderPath, createPackagingError })
      : await getDirectoryChecksum({ absoluteDirectoryPath: distFolderPath })
  );
  hash.update(`stacktape-buildpack:${STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION}`);
  hash.update(objectHash(externalDependencies));
  hash.update(additionalDigestInput || '');
  if (lambdaZip) {
    hash.update(`lambda-archive:${LAMBDA_ARCHIVE_FORMAT}`);
  }
  return hash.digest('hex');
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
