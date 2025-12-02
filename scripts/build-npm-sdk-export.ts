import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { join } from 'node:path';
import { sdkCommands } from '@cli-config';
import { NPM_RELEASE_FOLDER_PATH, SDK_SCHEMA_PATH, SDK_SOURCE_PATH } from '@shared/naming/project-fs-paths';
import { buildEsCode } from '@shared/packaging/bundlers/es';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { prettifyFile } from '@shared/utils/prettier';
import { camelCase, pascalCase } from 'change-case';
import { outputFile, readJSONSync } from 'fs-extra';
import { getJsonSchemaGenerator, getTsTypeDef } from './code-generation/utils';

const compileSdkSource = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Compiling SDK source...');

  await buildEsCode({
    keepNames: true,
    sourceMapBannerType: 'pre-compiled',
    sourceMaps: 'inline',
    minify: false,
    nodeTarget: '22',
    cwd: process.cwd(),
    externals: ['esbuild'],
    tsConfigPath: localBuildTsConfigPath,
    sourcePath: SDK_SOURCE_PATH,
    distPath: join(distFolderPath, 'sdk.js')
  });

  logSuccess('SDK source compiled successfully');
};

let commandsSchema;
const getCommandsSchema = () => {
  if (commandsSchema) {
    return commandsSchema;
  }
  commandsSchema = readJSONSync(SDK_SCHEMA_PATH);
  return commandsSchema;
};

const getMethodsReturnValueTypes = async ({ jsonSchemaGenerator }: { jsonSchemaGenerator?: JsonSchemaGenerator }) => {
  const methods = await Promise.all(
    sdkCommands.map((method) => {
      return getTsTypeDef({
        typeName: `${pascalCase(method)}ReturnValue`,
        newTypeName: `${pascalCase(method)}ReturnValue`,
        jsonSchemaGenerator
      });
    })
  );
  return methods.join('\n');
};

const getDescription = (description: string, indentSpaces: number) => {
  const indentString = ' '.repeat(indentSpaces);
  return `
${indentString}/**
${indentString}* ${description?.split('\n').join(`\n${indentString}* `)}
${indentString}*/`;
};

const generateArgsType = (
  argName: string,
  argData: {
    description: string;
    allowedTypes: string[];
    allowedValues: string[];
    alias: string;
    required: boolean;
  }
) => {
  if (argName === 'stage') {
    return `${getDescription(argData.description, 4)}
    stage?: string`;
  }
  if (argName === 'region') {
    return `${getDescription(argData.description, 4)}
    region?: AwsRegion`;
  }
  if (argName === 'config') {
    return `${getDescription(argData.description, 4)}
    config?: StacktapeConfig`;
  }
  const type = argData.allowedValues
    ? argData.allowedValues.map((val) => `'${val}'`).join(' | ')
    : argData.allowedTypes[0];
  return `${getDescription(argData.description, 4)}
    ${argName}${argData.required ? '' : '?'}: ${type}`;
};

const onEventType = '(eventData: any) => void';

const generateMethod = (command: StacktapeCommand) => {
  const schema = getCommandsSchema()[command];
  const camelCaseCommand = camelCase(command);
  const argsProperties = Object.entries(schema.args)
    .map(([argName, argData]) => {
      return generateArgsType(argName, argData as any);
    })
    .join(',');
  const argsType = `args?: { ${argsProperties}${
    Object.keys(argsProperties).length ? ',' : ''
  } onEvent?: ${onEventType}, printProgress?: boolean }`;
  const resultType = `${pascalCase(command)}ReturnValue`;
  const res = `${getDescription(schema.description, 2)}
  ${camelCaseCommand}(${argsType}): Promise<{ eventLog: EventLogEntry[], result: ${resultType} }>;\n`;

  return res;
};

export const generateNpmSdkExportDeclarations = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating Typescript declaration file for SDK..');
  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  // Additional Props types that need to be explicitly exported
  const additionalPropsTypes = [
    'HttpApiIntegrationProps',
    'S3IntegrationProps',
    'ScheduleIntegrationProps',
    'SnsIntegrationProps',
    'SqsIntegrationProps',
    'KinesisIntegrationProps',
    'DynamoDbIntegrationProps',
    'CloudwatchLogIntegrationProps',
    'ApplicationLoadBalancerIntegrationProps',
    'EventBusIntegrationProps',
    'KafkaTopicIntegrationProps',
    'AlarmIntegrationProps',
    'SqsQueueEventBusIntegrationProps',
    'ContainerWorkloadHttpApiIntegrationProps',
    'ContainerWorkloadLoadBalancerIntegrationProps',
    'ContainerWorkloadNetworkLoadBalancerIntegrationProps',
    'ContainerWorkloadInternalIntegrationProps',
    'ContainerWorkloadServiceConnectIntegrationProps',
    'ContainerEfsMountProps',
    'LambdaEfsMountProps'
  ];

  logInfo('Generating typings from Stacktape types...');
  const [eventLogTypings, awsRegionTypings, stacktapeConfigTypings, sdkMethodsTypings, ...additionalPropsTypings] =
    await Promise.all([
      getTsTypeDef({ typeName: 'EventLogEntry', newTypeName: 'EventLogEntry', jsonSchemaGenerator }),
      getTsTypeDef({ typeName: 'AWSRegion', newTypeName: 'AwsRegion', jsonSchemaGenerator }),
      getTsTypeDef({ typeName: 'StacktapeConfig', newTypeName: 'StacktapeConfig', jsonSchemaGenerator }),
      getMethodsReturnValueTypes({ jsonSchemaGenerator }),
      ...additionalPropsTypes.map((typeName) => getTsTypeDef({ typeName, newTypeName: typeName, jsonSchemaGenerator }))
    ]);
  logSuccess('Typings from Stacktape types generated successfully.');

  const typings = `// @ts-nocheck
/* eslint-disable */
${eventLogTypings}
${awsRegionTypings}
${stacktapeConfigTypings}
${additionalPropsTypings.join('\n')}
${sdkMethodsTypings}

declare class Stacktape {
  constructor(args?: { region?: AwsRegion, concurrency?: number; executablePath?: string; stage?: string, profile?: string, printProgress?: boolean, env?: { [envVarName: string]: string }; onEvent?: ${onEventType} })
${Object.keys(getCommandsSchema())
  .map(generateMethod as any)
  .join('\n')}
}

export { Stacktape };
`;

  const distFilePath = join(distFolderPath, 'sdk.d.ts');

  await outputFile(distFilePath, typings, { encoding: 'utf8' });
  // @note we do this twice because of a prettier bug
  await prettifyFile({ filePath: distFilePath });
  await prettifyFile({ filePath: distFilePath });

  logSuccess(`Typescript declaration file for SDK generated successfully to ${distFilePath}.`);
};

export const buildNpmSdkExport = async ({ distFolderPath }: { distFolderPath: string }) => {
  await Promise.all([compileSdkSource({ distFolderPath }), generateNpmSdkExportDeclarations({ distFolderPath })]);
};

if (import.meta.main) {
  buildNpmSdkExport({ distFolderPath: NPM_RELEASE_FOLDER_PATH });
}
