import { basename, dirname, extname, join, resolve } from 'node:path';
import { getFolder, getPathRelativeTo, isFileAccessible } from '../../fs/files';
import { findProjectRoot } from '../../es/project-root';
import { chmod, copy, readFile, readJson, remove, stat } from 'fs-extra';
import kleur from 'kleur';
import type {
  CreatePackagingError,
  ResolvedPackageDependency,
  SupportedEsPackageManager
} from '../../runtime-contracts';
import { isBareImportSpecifier } from '../../es/bun-plugins';
import { getModuleName, isNodeBuiltinImport } from '../../es/import-classification';
import { findInstalledPackage, readPackageManifest } from '../../es/installed-packages';
import { getMatchingFilesByGlob } from '../../fs/files';

const PACKAGE_LOCKS = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'deno.lock': 'deno'
} as const;

/**
 * The package manager a project without a lockfile declares: `packageManager` in its manifest (Corepack's field), or
 * pnpm when it has a pnpm workspace file. A pnpm workspace installed with npm gets no `workspace:` links and its
 * bundles cannot resolve sibling packages, so the declaration must win over the npm default.
 */
const getDeclaredPackageManager = async (dirPath: string): Promise<SupportedEsPackageManager | null> => {
  try {
    const manifest = JSON.parse(await readFile(join(dirPath, 'package.json'), 'utf8')) as {
      packageManager?: unknown;
    };
    const declared = typeof manifest.packageManager === 'string' ? manifest.packageManager.split('@')[0] : undefined;
    if (declared === 'npm' || declared === 'yarn' || declared === 'pnpm' || declared === 'bun' || declared === 'deno') {
      return declared;
    }
  } catch {
    // No readable manifest: nothing is declared.
  }
  return isFileAccessible(join(dirPath, 'pnpm-workspace.yaml')) ? 'pnpm' : null;
};

export const getLockFileData = async (
  dirPath: string
): Promise<{ lockfilePath: string | null; packageManager: SupportedEsPackageManager | null }> => {
  for (const [lockFile, packageManager] of Object.entries(PACKAGE_LOCKS)) {
    const lockfilePath = join(dirPath, lockFile);
    if (isFileAccessible(lockfilePath)) {
      return { lockfilePath, packageManager };
    }
  }
  return { packageManager: await getDeclaredPackageManager(dirPath), lockfilePath: null };
};
const findPrismaSchemaFiles = async ({ workingDir }: { workingDir: string }): Promise<string[]> => {
  const relativeSchemaPaths = await getMatchingFilesByGlob({
    // Prune before traversal: pnpm dependency links can form cycles even though their matches are discarded below.
    globPattern: ['**/schema.prisma', '!**/node_modules/**', '!**/.stacktape/**'],
    cwd: workingDir
  });
  return relativeSchemaPaths
    .filter((path) => {
      const pathSegments = path.replace(/\\/g, '/').split('/');
      return !pathSegments.includes('node_modules') && !pathSegments.includes('.stacktape');
    })
    .toSorted()
    .map((path) => join(workingDir, path));
};

const findNearestPackageRoot = async ({
  workingDir,
  projectRoot
}: {
  workingDir: string;
  projectRoot: string;
}): Promise<string> => {
  const boundary = resolve(projectRoot);
  let currentDirectory = resolve(workingDir);
  const candidateDirectories: string[] = [];

  while (true) {
    candidateDirectories.push(currentDirectory);
    if (currentDirectory === boundary || currentDirectory === dirname(currentDirectory)) {
      break;
    }
    currentDirectory = dirname(currentDirectory);
  }

  const packageRootChecks = await Promise.all(
    candidateDirectories.map((directory) => isFileAccessible(join(directory, 'package.json')))
  );
  return candidateDirectories[packageRootChecks.indexOf(true)] || boundary;
};

const parsePrismaSchemaFile = async ({
  prismaSchemaFilePath
}: {
  prismaSchemaFilePath: string;
}): Promise<{
  previewFeatures: string[];
  output: string | null;
  prismaSchemaFilePath: string;
  moduleFormat: string | null;
  runtime: string | null;
  engineType: string | null;
  provider: string | null;
} | null> => {
  // Find the generator client block
  const schemaFileContent = await readFile(prismaSchemaFilePath, 'utf-8');
  const blockMatch = schemaFileContent.match(/generator\s+client\s*\{([\s\S]*?)\}/);
  if (!blockMatch) {
    return null;
  }

  const body = blockMatch[1];
  if (!body) {
    return null;
  }

  // Extract previewFeatures array
  const pfMatch = body.match(/previewFeatures\s*=\s*\[([^\]]*)\]/);
  const previewFeatures: string[] = pfMatch
    ? (pfMatch[1] || '')
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    : [];

  // Extract output string
  const outMatch = body.match(/output\s*=\s*["']([^"']+)["']/);
  const output = outMatch?.[1] ?? null;

  // Extract moduleFormat string
  const moduleFormatMatch = body.match(/moduleFormat\s*=\s*["']([^"']+)["']/);
  const moduleFormat = moduleFormatMatch?.[1] ?? null;

  // Extract runtime string
  const runtimeMatch = body.match(/runtime\s*=\s*["']([^"']+)["']/);
  const runtime = runtimeMatch?.[1] ?? null;

  // Extract engineType string
  const engineTypeMatch = body.match(/engineType\s*=\s*["']([^"']+)["']/);
  const engineType = engineTypeMatch?.[1] ?? null;

  // Extract provider string
  const providerMatch = body.match(/provider\s*=\s*["']([^"']+)["']/);
  const provider = providerMatch?.[1] ?? null;

  return { previewFeatures, output, prismaSchemaFilePath, moduleFormat, runtime, engineType, provider };
};

const canonicalizeFilePath = (path: string): string => {
  const normalizedPath = resolve(path).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
};

const getInstalledPrismaClientMajorVersion = async (workingDir: string): Promise<number | null> => {
  try {
    const packageJsonPath = Bun.resolveSync('@prisma/client/package.json', workingDir);
    const packageJson: unknown = await readJson(packageJsonPath);
    if (!isRecord(packageJson) || typeof packageJson.version !== 'string') {
      return null;
    }
    const majorVersion = Number.parseInt(packageJson.version.split('.')[0] ?? '', 10);
    return Number.isInteger(majorVersion) ? majorVersion : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const resolvePrisma = async ({
  distFolderPath,
  workingDir,
  debug,
  isAlpine,
  isLambda,
  workloadName,
  createPackagingError
}: {
  distFolderPath: string;
  workingDir: string;
  debug?: boolean | undefined;
  isAlpine?: boolean | undefined;
  isLambda?: boolean | undefined;
  workloadName: string;
  createPackagingError: CreatePackagingError;
}) => {
  const logDebug = (message: string) => {
    if (debug) {
      console.info(`[${kleur.gray('DEBUG')}] [Resource ${kleur.yellow(workloadName)}]. ${message}`);
    }
  };
  const projectRoot = (await findProjectRoot(workingDir, logDebug)) || workingDir;
  const packageRoot = await findNearestPackageRoot({ workingDir, projectRoot });

  logDebug(`Resolving Prisma with package root: ${packageRoot} (project root: ${projectRoot})`);

  let prismaSchemaFiles: string[];
  try {
    prismaSchemaFiles = await findPrismaSchemaFiles({ workingDir: packageRoot });
    // A workload package may consume a Prisma client generated by the repository root. Preserve that setup while
    // keeping sibling workspace schemas out of package-local workloads.
    if (prismaSchemaFiles.length === 0 && packageRoot !== projectRoot) {
      prismaSchemaFiles = await findPrismaSchemaFiles({ workingDir: projectRoot });
    }
  } catch (cause) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Failed to discover the Prisma schema for resource ${workloadName}.`,
      cause
    });
  }

  let parsedSchemaFiles: Array<Awaited<ReturnType<typeof parsePrismaSchemaFile>>>;
  try {
    parsedSchemaFiles = await Promise.all(
      prismaSchemaFiles.map((prismaSchemaFilePath) => parsePrismaSchemaFile({ prismaSchemaFilePath }))
    );
  } catch (cause) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Failed to parse the Prisma schema for resource ${workloadName}.`,
      cause
    });
  }

  // prisma-client-js copies schema.prisma into its generated output. Do not treat that generated copy as a second
  // authored schema when the source generator's output points directly to it.
  const generatedSchemaPaths = new Map<string, Set<string>>();
  for (const parsedSchemaFile of parsedSchemaFiles) {
    if (!parsedSchemaFile?.output) {
      continue;
    }
    const generatedSchemaPath = canonicalizeFilePath(
      join(getFolder(parsedSchemaFile.prismaSchemaFilePath), parsedSchemaFile.output, 'schema.prisma')
    );
    const declaringSchemaPaths = generatedSchemaPaths.get(generatedSchemaPath) ?? new Set<string>();
    declaringSchemaPaths.add(canonicalizeFilePath(parsedSchemaFile.prismaSchemaFilePath));
    generatedSchemaPaths.set(generatedSchemaPath, declaringSchemaPaths);
  }
  const sourceSchemaFiles = prismaSchemaFiles.filter((prismaSchemaFilePath) => {
    const candidatePath = canonicalizeFilePath(prismaSchemaFilePath);
    const declaringSchemaPaths = generatedSchemaPaths.get(candidatePath);
    return !declaringSchemaPaths || [...declaringSchemaPaths].every((declaringPath) => declaringPath === candidatePath);
  });

  if (sourceSchemaFiles.length > 1) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Multiple Prisma schema files were found while packaging resource ${workloadName}: ${sourceSchemaFiles
        .map((path) => getPathRelativeTo(path, projectRoot).replace(/\\/g, '/'))
        .join(', ')}.`,
      hint: 'Package each Prisma workload from a project root containing exactly one schema so Stacktape cannot select the wrong generated client.'
    });
  }

  let parsedPrismaSchemaFile: Awaited<ReturnType<typeof parsePrismaSchemaFile>> = null;
  if (sourceSchemaFiles[0]) {
    const sourceSchemaIndex = prismaSchemaFiles.indexOf(sourceSchemaFiles[0]);
    parsedPrismaSchemaFile = parsedSchemaFiles[sourceSchemaIndex] ?? null;
  } else {
    console.warn('Could not find prisma schema file.');
  }

  logDebug(`Parsed Prisma schema file: ${JSON.stringify(parsedPrismaSchemaFile)}`);

  if (parsedPrismaSchemaFile) {
    const { output, prismaSchemaFilePath, engineType, provider } = parsedPrismaSchemaFile;
    if (provider === 'prisma-client') {
      if (engineType === 'client') {
        logDebug('Prisma schema explicitly uses the TypeScript client engine; no runtime binary copy is required.');
        return;
      }
      if (engineType === null) {
        const prismaClientMajorVersion = await getInstalledPrismaClientMajorVersion(
          getFolder(parsedPrismaSchemaFile.prismaSchemaFilePath)
        );
        if (prismaClientMajorVersion !== null && prismaClientMajorVersion >= 7) {
          logDebug('Prisma 7+ schema uses the default TypeScript client engine; no runtime binary copy is required.');
          return;
        }
        throw createPackagingError({
          type: 'PACKAGING',
          message:
            prismaClientMajorVersion === null
              ? `Could not determine the installed @prisma/client version for resource ${workloadName}.`
              : `Prisma ${prismaClientMajorVersion} requires an explicit engineType when using the prisma-client generator for resource ${workloadName}.`,
          hint: 'Set engineType = "client" and use a driver adapter, or upgrade @prisma/client to Prisma 7 or newer.'
        });
      }
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Prisma engineType "${engineType}" is not supported with the prisma-client generator for resource ${workloadName}.`,
        hint: 'Remove engineType and use Prisma’s default TypeScript query compiler with a driver adapter.'
      });
    }
    if (engineType === 'client' && provider === 'prisma-client-js') {
      try {
        if (!output) {
          throw new Error('Prisma client output is missing.');
        }
        const from = join(getFolder(prismaSchemaFilePath), output, 'query_compiler_bg.wasm');
        const relative = getPathRelativeTo(from, projectRoot);
        return await copyToDeploymentPackage({
          from,
          to: join(distFolderPath, relative)
        });
      } catch (cause) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: `Failed to copy Prisma query compiler files for resource ${workloadName}.`,
          hint: 'Run Prisma generate and verify that the configured client output contains query_compiler_bg.wasm.',
          cause
        });
      }
    }
  }

  // @todo validate if exists and tell user to install it if not
  const queryEngineFileGlobs = ['rhel*', 'linux-musl*', 'linux-arm*', 'debian*'];

  // available engines: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options

  let availableEngines = await getMatchingFilesByGlob({
    globPattern: queryEngineFileGlobs.flatMap((glob) => [
      `node_modules/.prisma/client/libquery_engine-${glob}`,
      `node_modules/.prisma/client/query-engine-${glob}`
    ]),
    cwd: projectRoot
  });
  if (isLambda) {
    availableEngines = availableEngines.filter((e) => e.includes('rhel-openssl'));
    if (!availableEngines.length) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Lambda function ${workloadName} uses Prisma, but the prisma query engine compatible with Lambda is not available.`,
        hint: 'Please add engine "rhel-openssl-3.0.x" to "schema.prisma" -> "generator client" -> "binaryTargets" and run prisma generate.'
      });
    }
  } else if (isAlpine) {
    availableEngines = availableEngines.filter((e) => e.includes('linux-musl'));
    if (!availableEngines.length) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Container ${workloadName} uses Prisma and Alpine linux (with musl), but the prisma query engine compatible with this linux version is not available.`,
        hint: 'Please add engine "linux-musl" to "schema.prisma" -> "generator client" -> "binaryTargets" and run prisma generate.'
      });
    }
  }
  if (!availableEngines.length) {
    throw createPackagingError({
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

const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

/**
 * The installed packages that explicitly included JavaScript files load, directly or through the files they import
 * relatively. Those files are copied as they are, so they load these packages from the artifact's `node_modules` at
 * run time.
 */
export const getDependenciesOfIncludedFiles = async ({
  absoluteFilePaths
}: {
  absoluteFilePaths: string[];
}): Promise<ResolvedPackageDependency[]> => {
  const transpiler = new Bun.Transpiler({ loader: 'js' });
  const dependencies = new Map<string, ResolvedPackageDependency>();
  const pending = absoluteFilePaths.filter((path) => JAVASCRIPT_EXTENSIONS.has(extname(path)));
  const scanned = new Set<string>();
  while (pending.length > 0) {
    const filePath = pending.pop()!;
    if (scanned.has(filePath)) continue;
    scanned.add(filePath);
    // oxlint-disable-next-line no-await-in-loop -- included files are few and small.
    for (const { path: specifier } of transpiler.scanImports(await readFile(filePath, 'utf8'))) {
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const importedPath = Bun.resolveSync(specifier, dirname(filePath));
        if (JAVASCRIPT_EXTENSIONS.has(extname(importedPath))) pending.push(importedPath);
        continue;
      }
      if (!isBareImportSpecifier(specifier) || isNodeBuiltinImport(specifier)) continue;
      const name = getModuleName(specifier);
      if (dependencies.has(name)) continue;
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const path = await findInstalledPackage({ name, fromDirectory: dirname(filePath) });
      if (!path) continue;
      // oxlint-disable-next-line no-await-in-loop -- see above.
      const { version = '' } = await readPackageManifest(path);
      dependencies.set(name, { name, version, path, note: 'FROM_EXPLICITLY_INCLUDED_FILES' });
    }
  }
  return [...dependencies.values()];
};

export const getLambdaRuntimeFromNodeTarget = (version: string) => Number(version.split('.')[0]);

const copyToDeploymentPackage = async ({ from, to }: { from: string; to: string }) => {
  // The copy keeps the source's executable intent: any execute bit, as the Lambda archive reads it
  // (`hasHostExecutableBit`). On Windows, where files carry no execute bit, the archive recognizes an ELF engine by its
  // header instead (see `listArchiveEntries`).
  const { mode } = await stat(from);
  await copy(from, to);
  await chmod(to, mode & 0o111 ? 0o755 : 0o644);
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
