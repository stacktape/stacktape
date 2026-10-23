/* oxlint-disable no-underscore-dangle -- `_nestedResources` is part of the normalized Stacktape resource contract. */
import type {
  ArchiveItem,
  CreatePackagingError,
  ExecuteProcess,
  LoadModuleExport,
  RunDocker,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { dirExists, isFileAccessible } from '../fs/files';
import { hostBuildEnvironment } from '../runtime-helpers';
import { EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER } from './constants';
import { copy, emptyDir, move, outputFile, readJson, readdir, remove, writeFile } from 'fs-extra';
import kleur from 'kleur';
import { buildUsingCustomArtifact } from '../artifact/custom-artifact';
import type { EnvironmentVar } from '@stacktape/config/shared';
import type { OpenNextConfig as UpstreamOpenNextConfig } from 'open-next/types/open-next.js';
import { createTemporaryBuildFile } from '../fs/temporary-file';
import { runWebBuildExclusive } from './build-coordinator';
import { resolveInstalledNodePackage } from './node-runtime-files';
import { copyDockerInstalledModulesForLambda, planLambdaDependencies } from '../es/native-dependencies';
import { resolveNodeVersion } from '../bundlers/node-version';

type NextjsWebBundlingProps = {
  resource: PackagedNextjsWeb;
  distFolderPath: string;
  progressLogger: ProgressLogger;
  createProgressLogger: (instanceId: string) => ProgressLogger;
  existingDigests: { [key in keyof PackagedNextjsWeb['_nestedResources']]?: string[] };
  cwd: string;
  environmentVars: EnvironmentVar[];
  archiveItem: ArchiveItem;
  createPackagingError: CreatePackagingError;
  executeProcess: ExecuteProcess;
  loadModuleExport: LoadModuleExport;
  runDocker: RunDocker;
  nativeDependencyInstallationRootPath: string;
  warn: (message: string) => void;
};

type PackagedFunction = { name: string; handler: string; runtime?: string | undefined };
type PackagedNextjsWeb = NextjsWeb['properties'] & {
  name: string;
  _nestedResources: {
    imageFunction: PackagedFunction;
    revalidationFunction: PackagedFunction;
    revalidationInsertFunction: PackagedFunction;
    serverEdgeFunction?: PackagedFunction | undefined;
    serverFunction?: PackagedFunction | undefined;
    warmerFunction?: PackagedFunction | undefined;
  };
};

type OpenNextConfig = Pick<UpstreamOpenNextConfig, 'buildCommand' | 'default' | 'functions'> & {
  // The pinned AWS builder supports install options absent from the older OpenNext type package.
  imageOptimization?: UpstreamOpenNextConfig['imageOptimization'] & {
    install?: { packages: string[]; additionalArgs?: string };
  };
};
const OPEN_NEXT_BUILD_PACKAGE = '@opennextjs/aws@3.10.4';
/** Any URL string: `prisma generate` reads it from the config file but does not use it. */
const PRISMA_GENERATE_PLACEHOLDER_URL = 'postgresql://stacktape:generate@127.0.0.1:5432/generate';

export const getWindowsNextBuildCommand = (nextVersion: string | undefined) => {
  const majorVersion = Number(nextVersion?.split('.')[0]);
  const webpackFlag = Number.isFinite(majorVersion) && majorVersion >= 16 ? ' --webpack' : '';
  return `npx next build${webpackFlag} && node -e "const fs=require('fs');const path=require('path');const file=path.join('.next','required-server-files.json');if(fs.existsSync(file)){const data=JSON.parse(fs.readFileSync(file,'utf8'));data.config=data.config||{};if(data.config.skipTrailingSlashRedirect===undefined)data.config.skipTrailingSlashRedirect=false;if(data.config.serverExternalPackages===undefined)data.config.serverExternalPackages=[];fs.writeFileSync(file,JSON.stringify(data,null,2));}"`;
};

export const describeNextPackagingError = (resourceName: string, error: unknown) => {
  const cause = error instanceof Error ? error.message : String(error);
  return `Error when packaging nextjs-web "${resourceName}".${cause ? `\n${cause}` : ''}`;
};

/**
 * Release date of each Next.js major. The Next.js team supports a major for two years from this date. Mirrors
 * `NEXT_RELEASE_DATES` in @opennextjs/aws 3.10.4 (`dist/build/helper.js`), the table its build checks before the
 * `--dangerously-use-unsupported-next-version` flag below lets it continue.
 */
const NEXT_MAJOR_RELEASE_DATES: Record<number, string> = {
  12: '2021-10-26',
  13: '2022-10-26',
  14: '2023-10-26',
  15: '2024-10-21',
  16: '2025-10-21'
};
const NEWEST_KNOWN_NEXT_MAJOR = Math.max(...Object.keys(NEXT_MAJOR_RELEASE_DATES).map(Number));

/** A major newer than the table is newer than every supported major; one older than the table is long unsupported. */
const isNextMajorSupported = (major: number, now: Date) => {
  const releaseDate = NEXT_MAJOR_RELEASE_DATES[major];
  if (releaseDate === undefined) {
    return major > NEWEST_KNOWN_NEXT_MAJOR;
  }
  const supportEndDate = new Date(releaseDate);
  supportEndDate.setUTCFullYear(supportEndDate.getUTCFullYear() + 2);
  return now <= supportEndDate;
};

/**
 * OpenNext's own warning about an unsupported Next.js major goes to the stdout Stacktape hides, so Stacktape prints its
 * own. The version is resolved from the application directory, as OpenNext resolves it.
 */
export const warnIfNextVersionUnsupported = async ({
  resourceName,
  absoluteAppDirectory,
  warn,
  now = new Date()
}: {
  resourceName: string;
  absoluteAppDirectory: string;
  warn: (message: string) => void;
  now?: Date;
}) => {
  let nextVersion: unknown;
  try {
    // `createRequire` resolves relative to a file; the file does not have to exist.
    const nextPackageJsonPath = createRequire(join(absoluteAppDirectory, 'package.json')).resolve('next/package.json');
    nextVersion = (await readJson(nextPackageJsonPath)).version;
  } catch {
    // Without an installed Next.js the OpenNext build fails with its own error.
    return;
  }
  const major = typeof nextVersion === 'string' ? Number(nextVersion.match(/^\d+/)?.[0]) : Number.NaN;
  if (!Number.isInteger(major) || isNextMajorSupported(major, now)) {
    return;
  }
  const upgradeTarget = isNextMajorSupported(NEWEST_KNOWN_NEXT_MAJOR, now)
    ? `Next.js ${NEWEST_KNOWN_NEXT_MAJOR}`
    : 'a supported Next.js major';
  warn(
    `\`${resourceName}\` uses Next.js ${major}, which is no longer supported by the Next.js team and gets no security ` +
      `fixes. Upgrade to ${upgradeTarget}. See https://nextjs.org/support-policy.`
  );
};

export const hasDefaultPrismaSchema = (absoluteAppDirectory: string) =>
  isFileAccessible(join(absoluteAppDirectory, 'prisma', 'schema.prisma'));

export const createNextjsWebArtifacts = async ({
  resource,
  progressLogger,
  createProgressLogger,
  existingDigests,
  distFolderPath,
  cwd,
  environmentVars,
  archiveItem,
  createPackagingError,
  executeProcess,
  loadModuleExport,
  runDocker,
  nativeDependencyInstallationRootPath,
  warn
}: NextjsWebBundlingProps) => {
  const copyEnv = hostBuildEnvironment(process.env);
  const absoluteAppDirectory = join(cwd, resource.appDirectory || '.');
  await warnIfNextVersionUnsupported({ resourceName: resource.name, absoluteAppDirectory, warn });
  environmentVars.forEach((env) => {
    copyEnv[env.name] = String(env.value);
  });
  await runWebBuildExclusive({
    workingDirectory: absoluteAppDirectory,
    build: async () => {
      await progressLogger.startEvent({ eventType: 'BUILD_NEXTJS_PROJECT', description: 'Building Nextjs project' });
      const configFileName = await createTemporaryOpenNextConfigFile({
        resource,
        cwd,
        sharpVersion: copyEnv.SHARP_VERSION,
        createPackagingError,
        loadModuleExport
      });
      const configFilePath = join(absoluteAppDirectory, configFileName);
      let temporaryNextConfigPath: string | undefined;
      const openNextDir = join(absoluteAppDirectory, '.open-next');
      await remove(openNextDir);
      try {
        if (hasDefaultPrismaSchema(absoluteAppDirectory)) {
          await executeProcess('npx', ['--no-install', 'prisma', 'generate'], {
            cwd: absoluteAppDirectory,
            // Prisma 7 evaluates `env('DATABASE_URL')` in prisma.config.ts before it generates, and fails when the
            // variable is missing; generation never connects, so a placeholder is enough. The real value is set on the
            // deployed Lambda. A value already in the environment wins.
            env: { DATABASE_URL: PRISMA_GENERATE_PLACEHOLDER_URL, ...copyEnv },
            disableStderr: true,
            disableStdout: true,
            inheritEnvVarsExcept: []
          });
        }
        temporaryNextConfigPath = await ensureNextConfig(absoluteAppDirectory);
        // OpenNext refuses a Next.js major two years after its release date (Next 15 since 2026-10-22), whatever the
        // app or the pinned builder can do. The qualified pin decides support, not the calendar; the user is warned
        // above. Its argument parser ignores a flag without a value, hence `true`.
        await executeProcess(
          'npx',
          [
            '--yes',
            OPEN_NEXT_BUILD_PACKAGE,
            'build',
            '--config-path',
            configFileName,
            '--dangerously-use-unsupported-next-version',
            'true'
          ],
          {
            cwd: absoluteAppDirectory,
            env: { ...copyEnv },
            disableStderr: true,
            disableStdout: true,
            inheritEnvVarsExcept: []
          }
        );
      } catch (error) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: describeNextPackagingError(resource.name, error),
          cause: error
        });
      } finally {
        await Promise.all([
          remove(configFilePath),
          ...(temporaryNextConfigPath ? [remove(temporaryNextConfigPath)] : [])
        ]);
      }

      await emptyDir(distFolderPath);
      try {
        await move(openNextDir, distFolderPath);
      } catch {
        await copy(openNextDir, distFolderPath);
        await remove(openNextDir);
      }
      await progressLogger.finishEvent({ eventType: 'BUILD_NEXTJS_PROJECT' });
    }
  });

  await progressLogger.startEvent({ eventType: 'BUNDLING_NEXTJS_FUNCTIONS', description: 'Bundling Nextjs functions' });
  // moving /assets and /cache for better bucket upload
  await moveAssetsForUpload({ distFolderPath });
  // create wrapper for index.mjs of server (edge) lambda to allow injecting env variables to edge lambda
  // also this helps some nextjs middleware bullshit which needs to be further studied
  // also preparation for streaming which is now not enabled due to being experimental
  await createServerWrapper({ distFolderPath, resource });
  // create custom resource wrapper to use open-next built dynamo inserter resource
  await createDynamoInsertWrapper({ distFolderPath });

  // OpenNext installs sharp without running its install scripts. When that left no binary Lambda can load, the exact
  // emitted version is installed again in the Lambda build image before the ZIP is hashed.
  const imageFunctionPath = join(distFolderPath, 'image-optimization-function');
  const sharp = await resolveInstalledNodePackage({
    applicationRoot: imageFunctionPath,
    packageName: 'sharp',
    traceBasePath: imageFunctionPath
  });
  if (!sharp) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Could not resolve the sharp runtime package for nextjs-web "${resource.name}" image optimization.`
    });
  }
  // The plan only decides whether sharp is installed again; sharp has no optional peers for the project to provide.
  const sharpPlan = await planLambdaDependencies({
    dependencies: [sharp],
    productionDependencies: new Set(),
    architecture: 'x64'
  });
  if (sharpPlan.packagesToInstallForLambda.length > 0) {
    // Replace host binaries and command links instead of overlaying them with the Docker installation's symlinks.
    await Promise.all([
      remove(join(imageFunctionPath, 'node_modules', 'sharp')),
      remove(join(imageFunctionPath, 'node_modules', '.bin'))
    ]);
    await copyDockerInstalledModulesForLambda({
      dependencies: [sharp],
      installationRootPath: nativeDependencyInstallationRootPath,
      distFolderPath: imageFunctionPath,
      lambdaRuntimeVersion: resolveNodeVersion({
        runtime: resource._nestedResources.imageFunction.runtime,
        target: 'lambda'
      }),
      dockerBuildOutputArchitecture: 'linux/amd64',
      runDocker
    });
  }

  const [
    imageFunction,
    revalidationFunction,
    revalidationInsertFunction,
    serverEdgeFunction,
    serverFunction,
    warmerFunction
  ] = await Promise.all([
    buildUsingCustomArtifact({
      distFolderPath: join(distFolderPath, 'imageFunction'),
      cwd,
      existingDigests: existingDigests.imageFunction ?? [],
      name: resource._nestedResources.imageFunction.name,
      packagePath: join(distFolderPath, 'image-optimization-function'),
      progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.imageFunction`),
      handler: resource._nestedResources.imageFunction.handler,
      archiveItem,
      createPackagingError
    }),
    buildUsingCustomArtifact({
      distFolderPath: join(distFolderPath, 'revalidationFunction'),
      cwd,
      existingDigests: existingDigests.revalidationFunction ?? [],
      name: resource._nestedResources.revalidationFunction.name,
      packagePath: join(distFolderPath, 'revalidation-function'),
      progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.revalidationFunction`),
      handler: resource._nestedResources.revalidationFunction.handler,
      archiveItem,
      createPackagingError
    }),
    buildUsingCustomArtifact({
      distFolderPath: join(distFolderPath, 'revalidationInsertFunction'),
      cwd,
      existingDigests: existingDigests.revalidationInsertFunction ?? [],
      name: resource._nestedResources.revalidationInsertFunction.name,
      packagePath: join(distFolderPath, 'dynamodb-provider'),
      progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.revalidationInsertFunction`),
      handler: resource._nestedResources.revalidationInsertFunction.handler,
      archiveItem,
      createPackagingError
    }),
    resource._nestedResources.serverEdgeFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'serverEdgeFunction'),
        cwd,
        existingDigests: existingDigests.serverEdgeFunction ?? [],
        name: resource._nestedResources.serverEdgeFunction.name,
        packagePath: join(distFolderPath, 'server-functions/default'),
        additionalDigestInput: JSON.stringify(resource.environment),
        progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.serverEdgeFunction`),
        handler: resource._nestedResources.serverEdgeFunction.handler,
        archiveItem,
        createPackagingError
      }),
    resource._nestedResources.serverFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'serverFunction'),
        cwd,
        existingDigests: existingDigests.serverFunction ?? [],
        name: resource._nestedResources.serverFunction.name,
        packagePath: join(distFolderPath, 'server-functions/default'),
        progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.serverFunction`),
        handler: resource._nestedResources.serverFunction.handler,
        archiveItem,
        createPackagingError
      }),
    resource._nestedResources.warmerFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'warmerFunction'),
        cwd,
        existingDigests: existingDigests.warmerFunction ?? [],
        name: resource._nestedResources.warmerFunction.name,
        packagePath: join(distFolderPath, 'warmer-function'),
        progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.warmerFunction`),
        handler: resource._nestedResources.warmerFunction.handler,
        archiveItem,
        createPackagingError
      })
  ]);
  await progressLogger.finishEvent({ eventType: 'BUNDLING_NEXTJS_FUNCTIONS' });
  return [
    imageFunction,
    revalidationFunction,
    revalidationInsertFunction,
    serverEdgeFunction,
    serverFunction,
    warmerFunction
  ].filter(Boolean);
};

const ensureNextConfig = async (absoluteAppDirectory: string): Promise<string | undefined> => {
  const nextConfigNames = ['next.config.ts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'];
  const appDirectoryContents = new Set(await readdir(absoluteAppDirectory));
  if (nextConfigNames.some((fileName) => appDirectoryContents.has(fileName))) return undefined;

  // Next.js itself permits no config, but OpenNext currently requires a conventional config filename before it will
  // invoke Next. The file is exclusively created for the build and removed on both success and failure.
  const temporaryNextConfigPath = join(absoluteAppDirectory, 'next.config.mjs');
  await writeFile(temporaryNextConfigPath, 'export default {};\n', { flag: 'wx' });
  return temporaryNextConfigPath;
};

const moveAssetsForUpload = async ({ distFolderPath }: { distFolderPath: string }) => {
  return Promise.all([
    move(join(distFolderPath, 'assets'), join(distFolderPath, 'bucket-content', '_assets')),
    move(join(distFolderPath, 'cache'), join(distFolderPath, 'bucket-content', '_cache'))
  ]);
};

const createServerWrapper = async ({
  distFolderPath,
  resource
}: {
  distFolderPath: string;
  resource: PackagedNextjsWeb;
}) => {
  const newIndexFilePath = join(distFolderPath, 'server-functions', 'default', 'index-wrap.mjs');
  const newIndexFileContent = `${
    resource._nestedResources.serverEdgeFunction
      ? `process.env = { ...process.env, ...${EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER} };`
      : ''
  }

export const handler = async (event, context) => {
  const { handler: rawHandler} = await import("./index.mjs");
  return rawHandler(event, context);
};
`;
  return writeFile(newIndexFilePath, newIndexFileContent);
};

const createDynamoInsertWrapper = async ({ distFolderPath }: { distFolderPath: string }) => {
  const needsDynamoInserterFunction = dirExists(join(distFolderPath, 'dynamodb-provider'));
  const newIndexFilePath = join(distFolderPath, 'dynamodb-provider', 'index-wrap.mjs');
  const newIndexFileContent = `
export const handler = async (event, context) => {
  ${needsDynamoInserterFunction ? 'const { handler: rawHandler} = await import("./index.mjs");' : ''}
  let error;
  let physicalResourceId;
  let data;
  ${
    needsDynamoInserterFunction
      ? `try {
   const { PhysicalResourceId, Data } = await rawHandler(event, context);
   physicalResourceId = PhysicalResourceId;
   data = Data;
  } catch (err) {
    console.error(err);
    error = err;
  }`
      : ''
  }
  await respondToCf(
    {
      event,
      logGroupName: context.logGroupName,
      error,
      physicalResourceId,
      data
    }
  )
};

const respondToCf = async ({
  event,
  error,
  physicalResourceId,
  data,
  logGroupName
}) => {
  const body = {
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalResourceId || 'stpservicecustomresource',
    RequestId: event.RequestId,
    StackId: event.StackId,
    Status: error ? 'FAILED' : 'SUCCESS',
    // maximum size for reason is 4k therefore we truncate error response
    Reason: error
      ? \`\n\${\`\${error}\`.slice(0, 800)}\n\nSee custom resource logs at:\n\${consoleLinks.logGroup(
          process.env.AWS_REGION,
          logGroupName
        )}\`
      : 'Custom resource success',
    Data: data || {}
  };

  const stringifiedBody = JSON.stringify(body);

  return global.fetch(event.ResponseURL, {
    headers: { 'content-length': \`\${stringifiedBody.length}\` },
    method: 'PUT',
    body: stringifiedBody
  });
};
`;
  return outputFile(newIndexFilePath, newIndexFileContent);
};

const createTemporaryOpenNextConfigFile = async ({
  resource,
  cwd,
  sharpVersion,
  createPackagingError,
  loadModuleExport
}: {
  resource: PackagedNextjsWeb;
  cwd: string;
  sharpVersion: string | undefined;
  createPackagingError: CreatePackagingError;
  loadModuleExport: LoadModuleExport;
}) => {
  const openNextConfig = await getOpenNextConfig({
    resource,
    cwd,
    sharpVersion,
    createPackagingError,
    loadModuleExport
  });
  const fileContent = `const config = ${JSON.stringify(openNextConfig, null, 4)};

export default config;
`;
  const { fileName } = await createTemporaryBuildFile({
    contents: fileContent,
    directoryPath: join(cwd, resource.appDirectory || '.'),
    prefix: 'stp-open-next-',
    suffix: '.config.ts'
  });
  return fileName;
};

const getOpenNextConfig = async ({
  resource,
  cwd,
  sharpVersion,
  createPackagingError,
  loadModuleExport
}: {
  resource: PackagedNextjsWeb;
  cwd: string;
  sharpVersion: string | undefined;
  createPackagingError: CreatePackagingError;
  loadModuleExport: LoadModuleExport;
}): Promise<OpenNextConfig> => {
  const openNextConfigFileNames = new Set([
    'open-next.config.ts',
    'open-next.config.js',
    'open-next.config.mjs',
    'open-next.config.cjs'
  ]);
  const appDirectoryContents = await readdir(join(cwd, resource.appDirectory || '.'));
  const existingOpenNextConfigFile = appDirectoryContents.find((fileName) => openNextConfigFileNames.has(fileName));
  let userOpenNextConfig: OpenNextConfig = { default: { runtime: 'node' } };
  if (existingOpenNextConfigFile) {
    const existingOpenNextConfigFilePath = join(cwd, resource.appDirectory || '.', existingOpenNextConfigFile);
    userOpenNextConfig = await loadModuleExport<OpenNextConfig>({
      filePath: existingOpenNextConfigFilePath,
      exportName: 'default'
    });

    if (userOpenNextConfig.functions) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Error when packaging nextjs-web "${resource.name}".\n\n Your config file ${kleur.underline(existingOpenNextConfigFile)} specifies "functions" property, which is currently not supported.`
      });
    }
  }
  const absoluteAppDirectory = join(cwd, resource.appDirectory || '.');
  const installedNextVersion = await readJson(join(absoluteAppDirectory, 'node_modules', 'next', 'package.json'))
    .then((packageJson) => (typeof packageJson.version === 'string' ? packageJson.version : undefined))
    .catch(() => undefined);
  const windowsDefaultBuildCommand = getWindowsNextBuildCommand(installedNextVersion);
  const buildCommand = resource.buildCommand || (process.platform === 'win32' ? windowsDefaultBuildCommand : undefined);
  // OpenNext swallows native install failures and then emits no sharp package. Its host install only needs package
  // metadata: Stacktape installs the native dependencies in the Lambda build image below. Keep user-selected
  // packages/options and OpenNext 3.10.4's default sharp version (including its SHARP_VERSION override).
  const imageInstall = userOpenNextConfig.imageOptimization?.install ?? {
    packages: [`sharp@${sharpVersion ?? '0.32.6'}`]
  };

  const finalConfig: OpenNextConfig = {
    ...userOpenNextConfig,
    imageOptimization: {
      ...userOpenNextConfig.imageOptimization,
      install: {
        ...imageInstall,
        additionalArgs: `${imageInstall.additionalArgs ?? ''} --ignore-scripts`.trim()
      }
    },
    ...(buildCommand ? { buildCommand } : {})
  };
  if (resource.useEdgeLambda) {
    finalConfig.default.placement = 'global';
    finalConfig.default.override = { ...finalConfig.default.override, converter: 'aws-cloudfront' };
  }
  if (resource.streamingEnabled) {
    finalConfig.default.override = { ...finalConfig.default.override, wrapper: 'aws-lambda-streaming' };
  }
  return finalConfig;
};
