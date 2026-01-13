import type { Plugin } from 'esbuild';
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
import { build as buildUsingEsbuild } from 'esbuild';
import { copy, outputJSON, readFile, writeJson } from 'fs-extra';
import uniqWith from 'lodash/uniqWith';
import objectHash from 'object-hash';
import {
  DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE,
  DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION,
  FILES_TO_INCLUDE_IN_DIGEST,
  IGNORED_MODULES,
  IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER,
  SPECIAL_TREATMENT_PACKAGES
} from './config';
import { copyDockerInstalledModulesForLambda } from './copy-docker-installed-modules';
import { esbuildDecorators } from './esbuild-decorators';
import {
  determineIfAlias,
  getAllJsDependenciesFromMultipleFiles,
  getExternalDeps,
  getFailedImportsFromEsbuildError,
  getInfoFromPackageJson,
  getLambdaRuntimeFromNodeTarget,
  getLockFileData,
  getModuleNameFromArgs,
  resolveDifferentSourceMapLocation,
  resolvePrisma
} from './utils';

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
  keepNames,
  distDir,
  sourcePaths,
  splitting = false,
  outputModuleFormat = 'cjs',
  plugins,
  excludeDependencies = [],
  dependenciesToExcludeFromBundle = [],
  emitTsDecoratorMetadata,
  sourceMapBannerType,
  define,
  metafile,
  legalComments = 'none',
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
  plugins?: Plugin[];
  excludeDependencies?: string[];
  dependenciesToExcludeFromBundle?: string[];
  outputModuleFormat?: 'esm' | 'cjs';
  emitTsDecoratorMetadata?: boolean;
  define?: Record<string, string>;
  legalComments?: 'external' | 'inline' | 'linked' | 'none' | 'eof';
  isLambda?: boolean;
}): Promise<{
  dependenciesToInstallInDocker: ModuleInfo[];
  specialTreatmentPackages: SpecialTreatmentPackage[];
  externalModules: { name: string; note: string }[];
  dynamicallyImportedModules: string[];
  sourceFiles: { path: string }[];
  allModules: string[];
}> => {
  const sourceMapBanner = await getSourceMapBanner({ sourceMapBannerType, outputModuleFormat });
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

  // @todo add option to use exact version (as-is in user's package json)
  const skipAwsSdkV3Deps =
    isLambda &&
    NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING.some(
      (v) => nodeTarget.includes(String(v)) || String(nodeTarget) === String(v)
    );

  const runBuild = async ({ dynamicallyImportedModules = [] }: { dynamicallyImportedModules?: string[] }) => {
    const allDependenciesToInstallInDocker: ModuleInfo[] = [];
    const externalModules: { name: string; note: string }[] = [];
    const specialTreatmentPackages: SpecialTreatmentPackage[] = [];
    const allModules: string[] = [];
    const stpEsBuildPlugin: Plugin = {
      name: 'stp-analyze-deps-plugin',
      setup(build) {
        build.onResolve({ filter: /^[^.].*[^-_.]$/ }, async (args) => {
          const moduleName = getModuleNameFromArgs(args);
          allModules.push(moduleName);
          if (builtinModules.includes(moduleName) || args.path === sourcePath) {
            return;
          }
          if (externalModules.find((m) => m.name === moduleName)) {
            return { external: true };
          }
          if (skipAwsSdkV3Deps && moduleName.startsWith('@aws-sdk/')) {
            return { external: true };
          }
          const isAlias = await determineIfAlias({ moduleName, aliases });
          if (isAlias) {
            return;
          }
          const modulePath = join(cwd, 'node_modules', moduleName);
          const isWildcardExternalized = shouldIgnoreAllDeps && modulePath.includes('node_modules');
          const isDynamicallyImported = dynamicallyImportedModules.includes(moduleName);
          if (isDynamicallyImported || isWildcardExternalized) {
            allDependenciesToInstallInDocker.push({
              ...(await getInfoFromPackageJson({
                directoryPath: modulePath,
                parentModule: null,
                dependencyType: 'root'
              })),
              note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
            });
            externalModules.push({
              name: moduleName,
              note: isDynamicallyImported ? 'DYNAMIC_IMPORT' : 'WILDCARD_EXTERNALIZED'
            });
            return { external: true };
          }
          if (IGNORED_MODULES.concat(excludeDependencies || []).includes(moduleName)) {
            externalModules.push({ name: moduleName, note: 'IGNORED' });
            return { external: true };
          }
          if (!isFileAccessible(join(modulePath, 'package.json'))) {
            return;
          }
          let external = false;
          // this required closure rebind before, self = this;
          const { dependenciesToInstallInDocker, specialTreatmentPackage, allExternalDeps } = await analyzeDependency({
            dependenciesToExcludeFromBundle,
            dependency: { name: moduleName, path: modulePath }
          });
          if (specialTreatmentPackage) {
            specialTreatmentPackages.push(specialTreatmentPackage);
          }
          allDependenciesToInstallInDocker.push(...dependenciesToInstallInDocker);
          if (dependenciesToInstallInDocker.find((dep) => dep.name === moduleName)) {
            externalModules.push({ name: moduleName, note: 'INSTALLED_IN_DOCKER' });
            for (const dep of allExternalDeps) {
              externalModules.push({ name: dep, note: `ADDED_BY_${moduleName}` });
            }
            external = true;
          }
          return { external };
        });
      }
    };
    const nativeNodeModulesPlugin: Plugin = {
      name: 'native-node-modules',
      setup(build) {
        // If a ".node" file is imported within a module in the "file" namespace, resolve
        // it to an absolute path and put it into the "node-file" virtual namespace.
        build.onResolve({ filter: /\.node$/, namespace: 'file' }, (args) => ({
          path: require.resolve(args.path, { paths: [args.resolveDir] }),
          namespace: 'node-file'
        }));

        // Files in the "node-file" virtual namespace call "require()" on the
        // path from esbuild of the ".node" file in the output directory.
        build.onLoad({ filter: /.*/, namespace: 'node-file' }, (args) => ({
          contents: `
            import path from ${JSON.stringify(args.path)}
            try { module.exports = require(path) }
            catch {}
          `
        }));

        // If a ".node" file is imported within a module in the "node-file" namespace, put
        // it in the "file" namespace where esbuild's default loading behavior will handle
        // it. It is already an absolute path since we resolved it to one above.
        build.onResolve({ filter: /\.node$/, namespace: 'node-file' }, (args) => ({
          path: args.path,
          namespace: 'file'
        }));

        // Tell esbuild's default loading behavior to use the "file" loader for
        // these ".node" files.
        const opts = build.initialOptions;
        opts.loader = opts.loader || {};
        opts.loader['.node'] = 'file';
      }
    };
    const allEsbuildPlugins: Plugin[] = [stpEsBuildPlugin, nativeNodeModulesPlugin, ...(plugins || [])];
    if (emitTsDecoratorMetadata) {
      allEsbuildPlugins.push(esbuildDecorators());
    }

    const buildResult = await buildUsingEsbuild({
      banner: sourceMapBanner,
      bundle: true,
      external: ['fsevents', ...externals],
      sourcemap: sourceMaps === 'disabled' ? false : sourceMaps === 'external' ? true : sourceMaps,
      keepNames: keepNames || false,
      minify: minify !== undefined ? minify : true,
      platform: 'node',
      target: `node${nodeTarget}`,
      legalComments,
      stdin: rawCode ? { contents: rawCode, resolveDir: cwd } : undefined,
      entryPoints: sourcePath ? [sourcePath] : sourcePaths,
      ...(distPath && { outfile: distPath }),
      ...(distDir && { outdir: distDir }),
      logLevel: 'silent',
      tsconfig: tsConfigPathForBuild,
      metafile: true,
      define,
      splitting,
      format: outputModuleFormat,
      plugins: allEsbuildPlugins
    });

    if (outputModuleFormat === 'esm') {
      await outputJSON(join(dirname(distPath), 'package.json'), { type: 'module' });
    }

    const sourceFiles = Object.keys(buildResult.metafile.inputs || {})
      .filter(filterDuplicates)
      .map((p) => ({ path: p }));

    if (metafile) {
      await writeJson(join(dirname(distPath), metafile), buildResult.metafile);
    }

    return {
      dependenciesToInstallInDocker: uniqWith(
        allDependenciesToInstallInDocker.filter(Boolean),
        (a, b) => a.name === b.name
      ),
      specialTreatmentPackages,
      externalModules,
      dynamicallyImportedModules,
      sourceFiles,
      allModules
    };
  };

  return runBuild({}).catch(async (error) => {
    const printableSrcPath = transformToUnixPath(getRelativePath(sourcePath));
    if (error.errors) {
      const failedActualImports = getFailedImportsFromEsbuildError({ error, errType: 'actual-error' });
      const failedDynamicImports = getFailedImportsFromEsbuildError({ error, errType: 'dynamic-import-error' });
      if (failedActualImports.length) {
        throw getError({
          message: `Failed to build code at ./${printableSrcPath}\n  ${failedActualImports
            .map((item) => item.message)
            .join('\n  ')}.
There might be 2 reasons this has happened:
  1. These dependencies are not installed.
  2. These dependencies are imported (required) conditionally and your application does not need them, but Stacktape still tries to statically bundle them.
     In this case, exclude them explicitly using 'languageSpecificConfig.dependenciesToExcludeFromBundle'.`,
          type: 'PACKAGING',
          hint: [
            'To learn more about how Stacktape packages your code, refer to https://docs.stacktape.com/configuration/packaging/'
          ]
        });
      }
      if (failedDynamicImports.length) {
        return runBuild({ dynamicallyImportedModules: failedDynamicImports.map((item) => item.packageName) });
      }
      throw getError({
        message: `Failed to build code at ./${printableSrcPath} . Errors:\n${error.errors
          .map(
            (e) =>
              `  ${e?.text} (at ${e?.location?.file || 'unknown file'}:${e?.location?.line}:${e?.location?.column})`
          )
          .join('\n')}`,
        type: 'PACKAGING'
      });
    }
    throw getError({
      type: 'BUILD_CODE',
      message: `Failed to build code at ./${printableSrcPath}\n${error}.`,
      hint: error?.hint,
      stack: error.errors?.length ? error.errors?.[0].location?.lineText : error?.stack
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
  skipDigestCalculation,
  dependencyDiscoveryOnly
}: StpBuildpackInput &
  EsLanguageSpecificConfig & {
    minify: boolean;
    nodeTarget: string;
    installNonStaticallyBuiltDepsInDocker: boolean;
    sourceMaps?: 'inline' | 'external' | 'disabled';
    sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled';
    isLambda?: boolean;
    skipDigestCalculation?: boolean;
    /** When true, only run esbuild to discover dependencies - skip digest, zipping, and dependency resolution */
    dependencyDiscoveryOnly?: boolean;
  }) => {
  await dependencyInstaller.install({ rootProjectDirPath: cwd, progressLogger });

  const distIndexFilePath = join(distFolderPath, 'index.js');

  // For dependency discovery (first-pass), we skip progress events to avoid showing lambdas as "done"
  // before the shared layer is built and they're re-bundled
  if (!dependencyDiscoveryOnly) {
    const hasSharedLayerExternals = externals.length > 0;
    const buildDescription = hasSharedLayerExternals
      ? 'Re-building code without dependencies in shared layer'
      : 'Building code';
    await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: buildDescription });
  }

  const { packageManager } = await getLockFileData(cwd);
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

  // For dependency discovery (first-pass bundling), return early after esbuild
  // We only need the resolved modules list, not the full bundle - no progress events shown
  if (dependencyDiscoveryOnly) {
    return {
      digest: 'discovery-only',
      outcome: 'bundled' as const,
      distFolderPath,
      distIndexFilePath,
      dynamicallyImportedModules,
      sourceFiles: sourceFiles.map(({ path }) => ({ path: isAbsolute(path) ? path : join(cwd, path) })),
      languageSpecificBundleOutput: { es: {} },
      resolvedModules: allModules
    };
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
  const makeAbsolute = (filePath) => join(cwd, filePath);
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
  specialTreatmentPackage?: SpecialTreatmentPackage;
  allExternalDeps: string[];
}> => {
  const specialTreatmentPackage = SPECIAL_TREATMENT_PACKAGES.includes(dependency.name as SpecialTreatmentPackage)
    ? (dependency.name as SpecialTreatmentPackage)
    : null;

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
  // Pure JS peer deps (like zod, ajv) can be safely bundled by esbuild
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

  return { dependenciesToInstallInDocker, specialTreatmentPackage, allExternalDeps };
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
          return {
            js: `const require = (await import("node:module")).createRequire(import.meta.url);
const __filename = (await import("node:url")).fileURLToPath(import.meta.url);
const __dirname = (await import("node:path")).dirname(__filename);`
          };
        }
        // const sourceMapBannerFilePath = getFirstExistingPath([
        //   resolve(__dirname, './source-map-install.js'),
        //   SOURCE_MAP_INSTALL_ESM_DIST_PATH
        // ]);
        // sourceMapBannerFromFile = await readFile(sourceMapBannerFilePath, 'utf-8');
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
