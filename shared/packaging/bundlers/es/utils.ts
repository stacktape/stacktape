import { basename, extname, join, resolve } from 'node:path';
import {
  dirExists,
  getBaseName,
  getFolder,
  getMatchingFilesByGlob,
  getPathRelativeTo,
  isDirAccessible,
  isFileAccessible
} from '@shared/utils/fs-utils';
import { builtinModules, getError } from '@shared/utils/misc';
import { findProjectRoot } from '@shared/utils/monorepo';
import { generateUuid } from '@utils/uuid';
import esbuild from 'esbuild';
import { access, chmod, copy, readFile, readJSON, readJson, remove, stat } from 'fs-extra';
import kleur from 'kleur';
import { DEPENDENCIES_WITH_BINARIES, IGNORED_EXTENSIONS, IGNORED_FILES, IGNORED_FOLDERS } from './config';

export type PackageJsonDepsInfo = {
  version: string;
  hasBinary: boolean;
  name: string;
  path: string;
  dependencyType: ModuleInfo['dependencyType'];
  parentModulePath?: string;
  parentModule: string;
  dependencies: PackageJsonDepsInfo[];
  peerDependencies: PackageJsonDepsInfo[];
  optionalPeerDependencies: PackageJsonDepsInfo[];
  note?: string;
};

const cachedPackageInfo = {};

export const getInfoFromPackageJson = async ({
  directoryPath,
  parentModule,
  dependencyType,
  parentModulePath = null,
  checkDeps = true
}: {
  directoryPath: string;
  parentModule: string;
  parentModulePath?: string;
  dependencyType: ModuleInfo['dependencyType'];
  checkDeps?: boolean;
}): Promise<PackageJsonDepsInfo> => {
  if (cachedPackageInfo[directoryPath]) {
    return cachedPackageInfo[directoryPath];
  }
  // this dependency causes a never-ending recursive cycle, idk why...
  // but it an its dependencies can be statically analyzed so it's not an issue
  if (directoryPath.endsWith('es-abstract')) {
    return {
      dependencies: [],
      optionalPeerDependencies: [],
      name: 'es-abstract',
      dependencyType: 'standard',
      hasBinary: false,
      peerDependencies: []
    } as any;
  }
  const packageJsonPath = resolve(directoryPath, 'package.json');
  return readJSON(packageJsonPath)
    .then(async (packageInfo: PackageJson) => {
      const res: PackageJsonDepsInfo = {
        name: packageInfo.name,
        version: packageInfo.version,
        path: directoryPath,
        hasBinary: hasBinary(packageInfo),
        dependencyType,
        parentModule,
        parentModulePath,
        dependencies: checkDeps
          ? (
              await Promise.all(
                Object.keys(packageInfo.dependencies || {}).map((name) => {
                  const path = join(resolve(directoryPath, '..'), name);
                  return isDirAccessible(path)
                    ? getInfoFromPackageJson({
                        directoryPath: path,
                        parentModule: packageInfo.name,
                        dependencyType: 'standard',
                        parentModulePath: directoryPath
                      })
                    : null;
                })
              )
            ).filter(Boolean)
          : [],
        peerDependencies: (
          await Promise.all(
            Object.keys(packageInfo.peerDependencies || {}).map((name) => {
              const path = join(resolve(directoryPath, '..'), name);
              return isDirAccessible(path)
                ? getInfoFromPackageJson({
                    directoryPath: path,
                    parentModule: packageInfo.name,
                    dependencyType: 'peer',
                    parentModulePath: directoryPath,
                    checkDeps: false
                  })
                : null;
            })
          )
        ).filter(Boolean),
        optionalPeerDependencies: (
          await Promise.all(
            Object.keys(packageInfo?.peerDependenciesMeta || {}).map((name) => {
              const path = join(resolve(directoryPath, '..'), name);
              return isDirAccessible(path)
                ? getInfoFromPackageJson({
                    directoryPath: path,
                    parentModule: packageInfo.name,
                    dependencyType: 'optional-peer',
                    parentModulePath: directoryPath
                  })
                : null;
            })
          )
        ).filter(Boolean)
      };
      cachedPackageInfo[directoryPath] = res;
      return res;
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        cachedPackageInfo[directoryPath] = null;
        return null;
      }
      throw err;
    });
};

// @note we try our best to identify if a package has a binary
const hasBinary = (packageJsonContent: PackageJson): boolean => {
  return !!(
    !!(packageJsonContent.gypfile || (packageJsonContent.binary && packageJsonContent.binary.module_path)) ||
    packageJsonContent?.dependencies?.['node-gyp'] ||
    packageJsonContent?.devDependencies?.['node-gyp'] ||
    packageJsonContent?.dependencies?.['node-pre-gyp'] ||
    packageJsonContent?.devDependencies?.['node-pre-gyp'] ||
    DEPENDENCIES_WITH_BINARIES.includes(packageJsonContent.name)
  );
};

const PACKAGE_LOCKS = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'deno.lockb': 'deno'
} as const;

export const getLockFileData = async (
  dirPath: string
): Promise<{ lockfilePath: string; packageManager: SupportedEsPackageManager }> => {
  for (const [lockFile, packageManager] of Object.entries(PACKAGE_LOCKS)) {
    const lockfilePath = join(dirPath, lockFile);
    if (isFileAccessible(lockfilePath)) {
      return { lockfilePath, packageManager };
    }
  }
  return { packageManager: null, lockfilePath: null };

  // @todo validate existence of lock file
  // let isLockFileRequired = false;
  // try {
  //   const lockFileData = await readJson(join(dirPath, 'package.json'));
  //   if (Object.keys(lockFileData.dependencies).length) {
  //     isLockFileRequired = true;
  //   }
  // } catch {
  //   return { packageManager: null, lockfilePath: null };
  // }
  // if (isLockFileRequired) {
  //   raiseError({
  //     type: 'PACKAGING',
  //     message:
  //       'Failed to load dependency lockfile. You need to install your dependencies first. Supported package managers are 'npm', 'yarn' and 'pnpm'.'
  //   });
  // }
};

// export const getVersionOfAllTransitiveDeps = async ({
//   depName,
//   dir
// }: {
//   depName: string;
//   dir: string;
// }): Promise<{ [depName: string]: string }> => {
//   // @todo this should parse lockfile, not package.json
//   // we should use this package probably to parse: snyk-nodejs-lockfile-parser
//   const packageJsonContents = await readJson(join(dir, 'package.json'));
//   return { [depName]: packageJsonContents.dependencies[depName] || 'latest' };
// };

const findPrismaSchemaFiles = async ({ workingDir }: { workingDir: string }): Promise<string[]> => {
  try {
    return (
      await getMatchingFilesByGlob({
        globPattern: '**/schema.prisma',
        cwd: workingDir
      })
    )
      .map((f) => join(workingDir, f))
      .filter((f) => !f.includes('node_modules') && !f.startsWith('.stacktape'));
  } catch {
    return [];
  }
};

const parsePrismaSchemaFile = async ({
  workingDir
}: {
  workingDir: string;
}): Promise<{
  previewFeatures: string[];
  output: string | null;
  prismaSchemaFilePath: string | null;
  moduleFormat: string | null;
  runtime: string | null;
  engineType: string | null;
  provider: string | null;
} | null> => {
  const projectRoot = await findProjectRoot(workingDir);
  const schemaFiles = await findPrismaSchemaFiles({ workingDir: projectRoot });

  const prismaSchemaFilePath = schemaFiles[0] || null;

  if (!prismaSchemaFilePath) {
    return null;
  }

  // Find the generator client block
  const schemaFileContent = await readFile(prismaSchemaFilePath, 'utf-8');
  const blockMatch = schemaFileContent.match(/generator\s+client\s*\{([\s\S]*?)\}/);
  if (!blockMatch) {
    return null;
  }

  const body = blockMatch[1];

  // Extract previewFeatures array
  const pfMatch = body.match(/previewFeatures\s*=\s*\[([^\]]*)\]/);
  const previewFeatures: string[] = pfMatch
    ? pfMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    : [];

  // Extract output string
  const outMatch = body.match(/output\s*=\s*["']([^"']+)["']/);
  const output = outMatch ? outMatch[1] : null;

  // Extract moduleFormat string
  const moduleFormatMatch = body.match(/moduleFormat\s*=\s*["']([^"']+)["']/);
  const moduleFormat = moduleFormatMatch ? moduleFormatMatch[1] : null;

  // Extract runtime string
  const runtimeMatch = body.match(/runtime\s*=\s*["']([^"']+)["']/);
  const runtime = runtimeMatch ? runtimeMatch[1] : null;

  // Extract engineType string
  const engineTypeMatch = body.match(/engineType\s*=\s*["']([^"']+)["']/);
  const engineType = engineTypeMatch ? engineTypeMatch[1] : null;

  // Extract provider string
  const providerMatch = body.match(/provider\s*=\s*["']([^"']+)["']/);
  const provider = providerMatch ? providerMatch[1] : null;

  return { previewFeatures, output, prismaSchemaFilePath, moduleFormat, runtime, engineType, provider };
};

export const resolvePrisma = async ({
  distFolderPath,
  workingDir,
  debug,
  isAlpine,
  isLambda,
  workloadName
}: {
  distFolderPath: string;
  workingDir: string;
  debug?: boolean;
  isAlpine?: boolean;
  isLambda?: boolean;
  workloadName: string;
}) => {
  const logDebug = (message: string) => {
    if (debug) {
      console.info(`[${kleur.gray('DEBUG')}] [Resource ${kleur.yellow(workloadName)}]. ${message}`);
    }
  };
  const projectRoot = (await findProjectRoot(workingDir, logDebug)) || workingDir;

  logDebug(`Resolving Prisma with project root: ${projectRoot}`);

  try {
    const parsedPrismaSchemaFile = await parsePrismaSchemaFile({ workingDir: projectRoot });

    logDebug(`Parsed Prisma schema file: ${JSON.stringify(parsedPrismaSchemaFile)}`);

    if (parsedPrismaSchemaFile) {
      const { output, prismaSchemaFilePath, engineType, provider } = parsedPrismaSchemaFile;
      if (engineType === 'client' && provider === 'prisma-client') {
        // prisma-client is pure typescript code and doesn't need anything to copy
        logDebug('Prisma schema file indicates queryCompiler, skipping copy of binaries.');
        return;
      }
      if (engineType === 'client' && provider === 'prisma-client-js') {
        try {
          const from = join(getFolder(prismaSchemaFilePath), output, 'query_compiler_bg.wasm');
          const relative = getPathRelativeTo(from, projectRoot);
          return copyToDeploymentPackage({
            from,
            to: join(distFolderPath, relative)
          });
        } catch {
          throw getError({
            type: 'PACKAGING',
            message: `Failed to copy prisma files for resource ${workloadName} (detected usage of queryCompiler).`
          });
        }
      }
    } else {
      console.warn('Could not find prisma schema file.');
    }
  } catch {
    console.warn('Could not parse prisma schema file.');
  }

  // @todo validate if exists and tell user to install it if not
  const queryEngineFileGlobs = ['rhel*', 'linux-musl*', 'linux-arm*', 'debian*'];

  // available engines: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options

  let availableEngines = await getMatchingFilesByGlob({
    globPattern: queryEngineFileGlobs
      .map((glob) => [
        `node_modules/.prisma/client/libquery_engine-${glob}`,
        `node_modules/.prisma/client/query-engine-${glob}`
      ])
      .flat(),
    cwd: projectRoot
  });
  if (isLambda) {
    availableEngines = availableEngines.filter((e) => e.includes('rhel-openssl'));
    if (!availableEngines.length) {
      throw getError({
        type: 'PACKAGING',
        message: `Lambda function ${workloadName} uses Prisma, but the prisma query engine compatible with Lambda is not available.`,
        hint: 'Please add engine "rhel-openssl-3.0.x" to "schema.prisma" -> "generator client" -> "binaryTargets" and run prisma generate.'
      });
    }
  } else if (isAlpine) {
    availableEngines = availableEngines.filter((e) => e.includes('linux-musl'));
    if (!availableEngines.length) {
      throw getError({
        type: 'PACKAGING',
        message: `Container ${workloadName} uses Prisma and Alpine linux (with musl), but the prisma query engine compatible with this linux version is not available.`,
        hint: 'Please add engine "linux-musl" to "schema.prisma" -> "generator client" -> "binaryTargets" and run prisma generate.'
      });
    }
  }
  if (!availableEngines.length) {
    throw getError({
      type: 'PACKAGING',
      message: `Workload ${workloadName} uses Prisma, but no query engine is available. Did you forget to run "prisma generate"?`
    });
  }
  await Promise.all(
    availableEngines
      .map((enginePath) => {
        const queryEngineFileName = basename(enginePath);
        return copyToDeploymentPackage({
          from: join(projectRoot, 'node_modules', '.prisma', 'client', queryEngineFileName),
          to: join(distFolderPath, queryEngineFileName)
        });
      })
      .concat(
        copyToDeploymentPackage({
          from: join(projectRoot, 'node_modules', '.prisma', 'client', 'schema.prisma'),
          to: join(distFolderPath, 'schema.prisma')
        })
      )
  );
};

export const getModuleNameFromArgs = (args: esbuild.OnResolveArgs) => {
  const moduleName = args.path.endsWith('/') ? args.path.slice(0, args.path.length - 1) : args.path;
  const [firstPart, secondPart] = moduleName.split('/');
  return firstPart.startsWith('@') ? [firstPart, secondPart].join('/') : firstPart;
};

export const getAllJsDependenciesFromMultipleFiles = async ({
  distFolderPath,
  absoluteFilePaths,
  workingDir
}: {
  distFolderPath: string;
  absoluteFilePaths: string[];
  workingDir: string;
}) => {
  const allJsFiles = absoluteFilePaths.filter((f) => extname(f) === '.js');
  if (!allJsFiles.length) {
    return [];
  }
  const rootPackageJson = await readJson(join(workingDir, 'package.json'));
  const allInstalledDeps = Object.keys(rootPackageJson.dependencies);
  const deps: ModuleInfo[] = [];
  await Promise.all(
    allJsFiles.map(async (filePath) => {
      const distFilePath = join(distFolderPath, '_temp-chunks', generateUuid(), '.js');
      await esbuild.build({
        bundle: true,
        metafile: true,
        platform: 'node',
        target: 'es6',
        entryPoints: [filePath],
        outfile: distFilePath,
        plugins: [
          {
            name: 'analyze-folder-deps',
            setup(build) {
              build.onResolve({ filter: /^[^.].*[^-_.]$/ }, async (args) => {
                const moduleName = getModuleNameFromArgs(args);
                if (builtinModules.includes(moduleName) || args.path === filePath) {
                  return;
                }
                const modulePath = join(workingDir, 'node_modules', moduleName);
                if (
                  !deps.find((d) => d.name === moduleName) &&
                  isFileAccessible(join(modulePath, 'package.json')) &&
                  allInstalledDeps.includes(moduleName)
                ) {
                  deps.push(
                    await getInfoFromPackageJson({
                      directoryPath: modulePath,
                      parentModule: null,
                      dependencyType: 'root',
                      checkDeps: false
                    })
                  );
                }
                return undefined;
              });
            }
          }
        ]
      });
      return Array.from(deps);
    })
  );
  await remove(join(distFolderPath, '_temp-chunks'));
  return deps;
};

export const getLambdaRuntimeFromNodeTarget = (version: string) => Number(version.split('.')[0]);

export const determineIfAlias = async ({
  moduleName,
  aliases
}: {
  moduleName: string;
  aliases: {
    [alias: string]: string;
  };
}): Promise<boolean> => {
  const checkAliasPromises: Promise<any>[] = [];
  for (const aliasName in aliases) {
    if (moduleName.startsWith(aliasName)) {
      const subPath = moduleName.slice(aliasName.length);
      const aliasPath = aliases[aliasName];
      // @todo cache
      checkAliasPromises.push(
        access(join(aliasPath, subPath))
          .catch(() => {})
          .then(() => {
            return true;
          })
      );
    }
  }
  const promiseResults = await Promise.all(checkAliasPromises);
  return promiseResults.some(Boolean);
};

const filterJunkFiles = (filePath: string) => {
  const baseName = getBaseName(filePath);
  if (dirExists(filePath)) {
    if (IGNORED_FOLDERS.includes(baseName)) {
      return false;
    }
  } else if (IGNORED_FILES.includes(baseName) || IGNORED_EXTENSIONS.find((ext) => filePath.endsWith(ext))) {
    return false;
  }
  return true;
};

export const copyToDeploymentPackage = async ({ from, to }: { from: string; to: string }) => {
  // Ensure file is executable if it is locally executable or
  // it's forced (via normalizedFilesToChmodPlusX) to be executable
  const { mode } = await stat(from);

  const newMode = mode & 0o100 || process.platform === 'win32' ? 0o755 : 0o644;
  return copy(from, to, {
    filter: filterJunkFiles
  })
    .then(() => {
      return chmod(to, newMode);
    })
    .catch((err) => {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    });
};

export const getExternalDeps = (depsInfo: PackageJsonDepsInfo, depsList: Set<string>) => {
  for (const dep of depsInfo.dependencies) {
    depsList.add(dep.name);
    getExternalDeps(dep, depsList);
  }
  return depsList;
};

export const getFailedImportsFromEsbuildError = ({
  errType,
  error
}: {
  error: any;
  errType: 'actual-error' | 'dynamic-import-error';
}): { packageName: string; message: string }[] => {
  const isFailedImportError = (err) => err.text.startsWith('Could not resolve');
  const result: { packageName: string; message: string }[] = [];
  error.errors.forEach((err) => {
    const text: string = err.text;
    const isDynamicImportErr = text.includes('or surround it with try/catch');
    const packageName = text.slice(19, text.lastIndexOf('"'));
    const message = err.location
      ? `Can't resolve '${packageName}' (imported from ./${err.location.file}:${err.location.line}:${err.location.column})`
      : err.text;

    if (isFailedImportError(err) && !result.find((item) => item.packageName === packageName)) {
      if (isDynamicImportErr && errType === 'dynamic-import-error') {
        result.push({ packageName, message });
      } else if (!isDynamicImportErr && errType === 'actual-error') {
        result.push({ packageName, message });
      }
    }
  });
  return result;
};

export const resolveDifferentSourceMapLocation = async ({
  distFolderPath,
  outputSourceMapsTo,
  workingDir,
  name
}: {
  outputSourceMapsTo: string;
  distFolderPath: string;
  workingDir: string;
  name: string;
}) => {
  const originalLocation = join(distFolderPath, 'index.js.map');
  const distLocation = join(workingDir, outputSourceMapsTo, name, 'index.js.map');

  await copy(originalLocation, distLocation);

  return remove(originalLocation);
};
