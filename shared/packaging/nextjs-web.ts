import type { OpenNextConfig } from 'open-next/types/open-next.js';
import { join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { getJobName } from '@shared/naming/utils';
import { EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER } from '@shared/utils/constants';
import { exec } from '@shared/utils/exec';
import { dirExists } from '@shared/utils/fs-utils';
import { raiseError, serialize } from '@shared/utils/misc';
import { loadFromJavascript, loadFromTypescript } from '@utils/file-loaders';
import { move, outputFile, readdir, remove, writeFile } from 'fs-extra';
import kleur from 'kleur';
import { buildUsingCustomArtifact } from './custom-artifact';

type NextjsWebBundlingProps = {
  resource: StpNextjsWeb;
  distFolderPath: string;
  progressLogger: ProgressLogger;
  existingDigests: { [key in keyof StpNextjsWeb['_nestedResources']]?: string[] };
  cwd: string;
  environmentVars: EnvironmentVar[];
};

export const createNextjsWebArtifacts = async ({
  resource,
  progressLogger,
  existingDigests,
  distFolderPath,
  cwd,
  environmentVars
}: NextjsWebBundlingProps) => {
  await progressLogger.startEvent({ eventType: 'BUILD_NEXTJS_PROJECT', description: 'Building Nextjs project' });
  const copyEnv = serialize(process.env);
  copyEnv.ESBUILD_BINARY_PATH = '';

  const configFileName = await createTemporaryOpenNextConfigFile({ resource, cwd });
  const absoluteAppDirectory = join(cwd, resource.appDirectory || '.');
  const configFilePath = join(absoluteAppDirectory, configFileName);
  environmentVars.forEach((env) => {
    copyEnv[env.name] = env.value;
  });
  try {
    await exec(
      'npx',
      [
        '--yes',
        '@opennextjs/aws@^3.6.2',
        'build',
        '--config-path',
        configFileName
        // ...(resource.buildCommand ? ['--build-command', resource.buildCommand] : []),
        // '--app-path',
        // resource.appDirectory || '.',
        // ...(resource.streamingEnabled ? ['--streaming'] : [])
      ],
      {
        cwd: absoluteAppDirectory,
        env: { ...copyEnv }, // OPEN_NEXT_DEBUG: true
        disableStderr: true,
        disableStdout: true,
        inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH']
      }
    );
  } catch (err) {
    raiseError({
      type: 'PACKAGING',
      message: `Error when packaging nextjs-web "${resource.name}".\n\nBuild process logs:\n\n${err}`
    });
  } finally {
    await remove(configFilePath);
  }

  await move(join(absoluteAppDirectory, '.open-next'), distFolderPath);
  await progressLogger.finishEvent({ eventType: 'BUILD_NEXTJS_PROJECT' });

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
      existingDigests: existingDigests.imageFunction,
      name: getJobName({ workloadName: resource._nestedResources.imageFunction.name, workloadType: 'function' }),
      packagePath: join(distFolderPath, 'image-optimization-function'),
      progressLogger: eventManager.getNamespacedInstance({
        identifier: `${progressLogger.namespace.identifier}.imageFunction`,
        eventType: progressLogger.namespace.eventType
      }),
      handler: resource._nestedResources.imageFunction.handler
    }),
    buildUsingCustomArtifact({
      distFolderPath: join(distFolderPath, 'revalidationFunction'),
      cwd,
      existingDigests: existingDigests.revalidationFunction,
      name: getJobName({ workloadName: resource._nestedResources.revalidationFunction.name, workloadType: 'function' }),
      packagePath: join(distFolderPath, 'revalidation-function'),
      progressLogger: eventManager.getNamespacedInstance({
        identifier: `${progressLogger.namespace.identifier}.revalidationFunction`,
        eventType: progressLogger.namespace.eventType
      }),
      handler: resource._nestedResources.revalidationFunction.handler
    }),
    buildUsingCustomArtifact({
      distFolderPath: join(distFolderPath, 'revalidationInsertFunction'),
      cwd,
      existingDigests: existingDigests.revalidationInsertFunction,
      name: getJobName({
        workloadName: resource._nestedResources.revalidationInsertFunction.name,
        workloadType: 'function'
      }),
      packagePath: join(distFolderPath, 'dynamodb-provider'),
      progressLogger: eventManager.getNamespacedInstance({
        identifier: `${progressLogger.namespace.identifier}.revalidationInsertFunction`,
        eventType: progressLogger.namespace.eventType
      }),
      handler: resource._nestedResources.revalidationInsertFunction.handler
    }),
    resource._nestedResources.serverEdgeFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'serverEdgeFunction'),
        cwd,
        existingDigests: existingDigests.serverEdgeFunction,
        name: getJobName({ workloadName: resource._nestedResources.serverEdgeFunction.name, workloadType: 'function' }),
        packagePath: join(distFolderPath, 'server-functions/default'),
        additionalDigestInput: JSON.stringify(resource.environment),
        progressLogger: eventManager.getNamespacedInstance({
          identifier: `${progressLogger.namespace.identifier}.serverEdgeFunction`,
          eventType: progressLogger.namespace.eventType
        }),
        handler: resource._nestedResources.serverEdgeFunction.handler
      }),
    resource._nestedResources.serverFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'serverFunction'),
        cwd,
        existingDigests: existingDigests.serverFunction,
        name: getJobName({ workloadName: resource._nestedResources.serverFunction.name, workloadType: 'function' }),
        packagePath: join(distFolderPath, 'server-functions/default'),
        progressLogger: eventManager.getNamespacedInstance({
          identifier: `${progressLogger.namespace.identifier}.serverFunction`,
          eventType: progressLogger.namespace.eventType
        }),
        handler: resource._nestedResources.serverFunction.handler
      }),
    resource._nestedResources.warmerFunction &&
      buildUsingCustomArtifact({
        distFolderPath: join(distFolderPath, 'warmerFunction'),
        cwd,
        existingDigests: existingDigests.warmerFunction,
        name: getJobName({ workloadName: resource._nestedResources.warmerFunction.name, workloadType: 'function' }),
        packagePath: join(distFolderPath, 'warmer-function'),
        progressLogger: eventManager.getNamespacedInstance({
          identifier: `${progressLogger.namespace.identifier}.warmerFunction`,
          eventType: progressLogger.namespace.eventType
        }),
        handler: resource._nestedResources.warmerFunction.handler
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
  resource: StpNextjsWeb;
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

const createTemporaryOpenNextConfigFile = async ({ resource, cwd }: { resource: StpNextjsWeb; cwd: string }) => {
  const openNextConfig = await getOpenNextConfig({ resource, cwd });
  const fileContent = `const config = ${JSON.stringify(openNextConfig, null, 4)};

export default config;
`;
  const fileName = 'stp-temp-open-next.config.ts';
  await writeFile(join(cwd, resource.appDirectory || '.', fileName), fileContent);
  return fileName;
};

const getOpenNextConfig = async ({
  resource,
  cwd
}: {
  resource: StpNextjsWeb;
  cwd: string;
}): Promise<OpenNextConfig> => {
  const openNextConfigFileNames = ['open-next.config.ts', 'open-next.config.js'];
  const appDirectoryContents = await readdir(join(cwd, resource.appDirectory || '.'));
  const existingOpenNextConfigFile = appDirectoryContents.find((fileName) =>
    openNextConfigFileNames.includes(fileName)
  );
  let userOpenNextConfig: OpenNextConfig = { default: { runtime: 'node' } };
  if (existingOpenNextConfigFile) {
    const existingOpenNextConfigFilePath = join(cwd, resource.appDirectory || '.', existingOpenNextConfigFile);
    userOpenNextConfig = existingOpenNextConfigFile.endsWith('.js')
      ? await loadFromJavascript({ filePath: existingOpenNextConfigFilePath, exportName: 'default' })
      : await loadFromTypescript({ filePath: existingOpenNextConfigFilePath, exportName: 'default' });

    if (userOpenNextConfig.functions) {
      raiseError({
        type: 'PACKAGING',
        message: `Error when packaging nextjs-web "${resource.name}".\n\n Your config file ${kleur.underline(existingOpenNextConfigFile)} specifies "functions" property, which is currently not supported.`
      });
    }
  }
  const finalConfig: OpenNextConfig = {
    ...userOpenNextConfig,
    ...(resource.buildCommand ? { buildCommand: resource.buildCommand } : {})
  };
  if (resource.useEdgeLambda) {
    finalConfig.default.placement = 'global';
    finalConfig.default.override = { ...(finalConfig.default.override || {}), converter: 'aws-cloudfront' };
  }
  if (resource.streamingEnabled) {
    finalConfig.default.override = { ...(finalConfig.default.override || {}), wrapper: 'aws-lambda-streaming' };
  }
  return finalConfig;
};
