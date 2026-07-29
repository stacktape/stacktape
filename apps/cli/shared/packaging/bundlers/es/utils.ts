import type { BunPlugin } from 'bun';
import { basename, extname, join } from 'node:path';
import {
  dirExists,
  getBaseName,
  getFolder,
  getMatchingFilesByGlob,
  getPathRelativeTo,
  isFileAccessible
} from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { findProjectRoot } from '@stacktape/packaging/es/project-root';
import { generateUuid } from '@utils/uuid';
import { chmod, copy, readFile, readJson, remove, stat } from 'fs-extra';
import kleur from 'kleur';
import {
  IGNORED_EXTENSIONS,
  IGNORED_FILES,
  IGNORED_FOLDERS,
  NODE_BUILTIN_MODULES
} from '@stacktape/packaging/es/config';
import type { ResolvedPackageDependency, SupportedEsPackageManager } from '@stacktape/packaging/runtime-contracts';
import type { PackageJsonDepsInfo } from '@stacktape/packaging/es/bundler-helpers';
import { getInfoFromPackageJson } from '@stacktape/packaging/es/bundler-helpers';

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

const getModuleNameFromPath = (importPath: string): string => {
  const moduleName = importPath.endsWith('/') ? importPath.slice(0, importPath.length - 1) : importPath;
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
  const allInstalledDeps = Object.keys(rootPackageJson.dependencies || {});
  const deps: ResolvedPackageDependency[] = [];

  await Promise.all(
    allJsFiles.map(async (filePath) => {
      const analyzeFolderDepsPlugin: BunPlugin = {
        name: 'analyze-folder-deps',
        setup(build) {
          build.onResolve({ filter: /^[^.]/ }, async (args): Promise<{ path: string } | undefined> => {
            // Skip relative imports
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
              return undefined;
            }

            const moduleName = getModuleNameFromPath(args.path);
            if (NODE_BUILTIN_MODULES.includes(moduleName) || args.path === filePath) {
              return undefined;
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
      };

      await Bun.build({
        entrypoints: [filePath],
        outdir: join(distFolderPath, '_temp-chunks', generateUuid()),
        target: 'node',
        plugins: [analyzeFolderDepsPlugin]
      });

      return Array.from(deps);
    })
  );

  await remove(join(distFolderPath, '_temp-chunks'));
  return deps;
};

export const getLambdaRuntimeFromNodeTarget = (version: string) => Number(version.split('.')[0]);

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
