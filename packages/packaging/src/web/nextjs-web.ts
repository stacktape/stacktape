/* oxlint-disable no-underscore-dangle -- `_nestedResources` is part of the normalized Stacktape resource contract. */
import type {
  ArchiveItem,
  CreatePackagingError,
  ExecuteProcess,
  LoadModuleExport,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';
import { join } from 'node:path';
import { dirExists } from '../fs/files';
import { serializeEnvironment } from '../runtime-helpers';
import { EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER } from './constants';
import { copy, move, outputFile, readdir, remove, writeFile } from 'fs-extra';
import kleur from 'kleur';
import { buildUsingCustomArtifact } from '../artifact/custom-artifact';
import type { EnvironmentVar } from '@stacktape/config/shared';
import type { OpenNextConfig as UpstreamOpenNextConfig } from 'open-next/types/open-next.js';
import { createTemporaryBuildFile } from '../fs/temporary-file';
import { runWebBuildExclusive } from './build-coordinator';

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
};

type PackagedFunction = { name: string; handler: string };
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

type OpenNextConfig = Pick<UpstreamOpenNextConfig, 'buildCommand' | 'default' | 'functions'>;

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
  loadModuleExport
}: NextjsWebBundlingProps) => {
  const copyEnv = serializeEnvironment(process.env);
  const absoluteAppDirectory = join(cwd, resource.appDirectory || '.');
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
        createPackagingError,
        loadModuleExport
      });
      const configFilePath = join(absoluteAppDirectory, configFileName);
      const openNextDir = join(absoluteAppDirectory, '.open-next');
      await remove(openNextDir);
      try {
        await executeProcess('npx', ['--yes', '@opennextjs/aws@^3.6.2', 'build', '--config-path', configFileName], {
          cwd: absoluteAppDirectory,
          env: { ...copyEnv },
          disableStderr: true,
          disableStdout: true,
          inheritEnvVarsExcept: []
        });
      } catch (error) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: `Error when packaging nextjs-web "${resource.name}".`,
          cause: error
        });
      } finally {
        await remove(configFilePath);
      }

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
  createPackagingError,
  loadModuleExport
}: {
  resource: PackagedNextjsWeb;
  cwd: string;
  createPackagingError: CreatePackagingError;
  loadModuleExport: LoadModuleExport;
}) => {
  const openNextConfig = await getOpenNextConfig({ resource, cwd, createPackagingError, loadModuleExport });
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
  createPackagingError,
  loadModuleExport
}: {
  resource: PackagedNextjsWeb;
  cwd: string;
  createPackagingError: CreatePackagingError;
  loadModuleExport: LoadModuleExport;
}): Promise<OpenNextConfig> => {
  const openNextConfigFileNames = new Set(['open-next.config.ts', 'open-next.config.js']);
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
  const windowsDefaultBuildCommand =
    "npx next build --webpack && node -e \"const fs=require('fs');const path=require('path');const file=path.join('.next','required-server-files.json');if(fs.existsSync(file)){const data=JSON.parse(fs.readFileSync(file,'utf8'));data.config=data.config||{};if(data.config.skipTrailingSlashRedirect===undefined)data.config.skipTrailingSlashRedirect=false;if(data.config.serverExternalPackages===undefined)data.config.serverExternalPackages=[];fs.writeFileSync(file,JSON.stringify(data,null,2));}\"";
  const buildCommand = resource.buildCommand || (process.platform === 'win32' ? windowsDefaultBuildCommand : undefined);

  const finalConfig: OpenNextConfig = {
    ...userOpenNextConfig,
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
