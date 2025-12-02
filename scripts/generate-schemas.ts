import {
  allowedCliArgs,
  allowedSdkArgs,
  cliCommands,
  requiredCliArgs,
  requiredSdkArgs,
  sdkCommands
} from '@cli-config';
import { CLI_SCHEMA_PATH, JSON_SCHEMAS_FOLDER_PATH, SDK_SCHEMA_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { mkdir, remove } from 'fs-extra';
import {
  generateAjvValidationCode,
  generateCommandsSchema,
  generateConfigSchema,
  getJsonSchemaGenerator
} from './code-generation/utils';

export const generateSchemas = async () => {
  logInfo('Generating command/config schemas and Ajv validation code...');

  await remove(JSON_SCHEMAS_FOLDER_PATH);
  await mkdir(JSON_SCHEMAS_FOLDER_PATH, { recursive: true });

  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  const [jsonSchema] = await Promise.all([
    generateConfigSchema({ jsonSchemaGenerator }),
    generateCommandsSchema({
      // @ts-expect-error - just ignore
      commands: cliCommands,
      includeAliases: true,
      argsTsTypeName: 'StacktapeCliArgs',
      outputPath: CLI_SCHEMA_PATH,
      // @ts-expect-error - just ignore
      allowedArgs: allowedCliArgs,
      // @ts-expect-error - just ignore
      requiredArgsForCommands: requiredCliArgs,
      jsonSchemaGenerator
    }),
    generateCommandsSchema({
      // @ts-expect-error - just ignore
      commands: sdkCommands,
      includeAliases: false,
      argsTsTypeName: 'StacktapeSdkArgs',
      outputPath: SDK_SCHEMA_PATH,
      // @ts-expect-error - just ignore
      allowedArgs: allowedSdkArgs,
      // @ts-expect-error - just ignore
      requiredArgsForCommands: requiredSdkArgs,
      jsonSchemaGenerator
    })
  ]);
  await generateAjvValidationCode(jsonSchema);
  logSuccess('Command/config schemas and Ajv validation code generated successfully.');
};

if (import.meta.main) {
  generateSchemas();
}
