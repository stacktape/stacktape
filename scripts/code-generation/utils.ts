import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { join } from 'node:path';
import { cliArgsAliases } from '@cli-config';
import { AJV_VALIDATION_CODE_PATH, CONFIG_SCHEMA_PATH } from '@shared/naming/project-fs-paths';
import { getTypeDetailsFromNode, resolveRef } from '@shared/utils/json-schema';
import { logInfo, logSuccess } from '@shared/utils/logging';
import Ajv from 'ajv';
import generateStandaloneAjvCode from 'ajv/dist/standalone';
import fastGlob from 'fast-glob';
import { readJson, writeFile, writeJSON } from 'fs-extra';
import { compile as compileJsonSchemaToTypescript } from 'json-schema-to-typescript';
import { buildGenerator, getProgramFromFiles } from 'typescript-json-schema';

export const getJsonSchemaGenerator = async () => {
  const [srcFiles, typeFiles] = await Promise.all([
    fastGlob('src/**/*', { dot: true }),
    fastGlob('types/**/*', { dot: true })
  ]);
  let jsonSchemaGenerator: JsonSchemaGenerator;
  logInfo('Building JSON schema generator');
  try {
    const tsProgram = getProgramFromFiles(
      [...srcFiles, ...typeFiles].filter((f) => f.endsWith('.ts')).map((f) => join(process.cwd(), f)),
      { ...(await readJson(join(process.cwd(), 'tsconfig.json'))).compilerOptions }
    );

    jsonSchemaGenerator = buildGenerator(tsProgram, {
      required: true,
      ignoreErrors: true,
      noExtraProps: true
    });
  } finally {
    //
  }
  return jsonSchemaGenerator;
};

export const generateAjvValidationCode = async (schema: any) => {
  logInfo('Generating Ajv validation code');
  const ajv = new Ajv({
    code: { source: true /* esm: true */ },
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
    verbose: true
  });
  const validate = ajv.compile(schema);
  const validationCode = generateStandaloneAjvCode(ajv, validate);
  await writeFile(AJV_VALIDATION_CODE_PATH, validationCode);
  logSuccess('Ajv validation code generated successfully.');
};

export const generateConfigSchema = async ({ jsonSchemaGenerator }: { jsonSchemaGenerator?: JsonSchemaGenerator }) => {
  const typescriptGenerator = jsonSchemaGenerator || (await getJsonSchemaGenerator());
  const jsonSchema = typescriptGenerator.getSchemaForSymbol('StacktapeConfig');
  await writeJSON(CONFIG_SCHEMA_PATH, jsonSchema);

  return jsonSchema;
};

let commandsSchema;

export const generateCommandsSchema = async ({
  commands,
  outputPath,
  argsTsTypeName,
  includeAliases,
  allowedArgs,
  requiredArgsForCommands,
  jsonSchemaGenerator
}: {
  argsTsTypeName: string;
  commands: StacktapeCommand[];
  outputPath: string;
  includeAliases: boolean;
  allowedArgs: { [_command in StacktapeCommand]: StacktapeArg[] };
  requiredArgsForCommands: { [_command in StacktapeCommand]: StacktapeArg[] };
  jsonSchemaGenerator?: JsonSchemaGenerator;
}) => {
  const generator = jsonSchemaGenerator || (await getJsonSchemaGenerator());
  const argsSchema = generator.getSchemaForSymbol(argsTsTypeName);
  if (!commandsSchema) {
    commandsSchema = generator.getSchemaForSymbol('AllStacktapeCommands');
  }

  const argsDetails = {};
  for (const prop in argsSchema.properties) {
    const definition = argsSchema.properties[prop];
    // @ts-expect-error - just ignore
    const node = resolveRef(definition, argsSchema);
    argsDetails[prop] = {
      description: node.description,
      ...getTypeDetailsFromNode(node),
      ...(includeAliases && { alias: cliArgsAliases[prop] })
    };
  }

  const res: {
    [command: string]: {
      description: string;
      args: {
        [arg: string]: {
          description: string;
          required: boolean;
          allowedTypes: string[];
          allowedValues: string[];
        };
      };
    };
  } = {};
  for (const command of commands) {
    const args = {};
    if (!allowedArgs[command]) {
      throw new Error(
        `Can not find allowed args for command ${command}. Allowed args are only defined for the following commands: ${Object.keys(
          allowedArgs
        ).join(', ')}.`
      );
    }
    for (const arg of allowedArgs[command]) {
      args[arg] = { ...argsDetails[arg], required: requiredArgsForCommands[command].includes(arg) };
    }
    const commandDescription = commandsSchema.properties[command]?.description;
    if (!commandDescription) {
      throw new Error(
        `Can not find description for command ${command}. Commands with available descriptions: ${Object.keys(
          commandsSchema.properties
        ).join(', ')}.`
      );
    }
    res[command] = { description: commandsSchema.properties[command].description, args: args as any };
  }

  await writeFile(outputPath, JSON.stringify(res, null, 2));
};

export const getTsTypeDef = async ({
  newTypeName,
  typeName,
  jsonSchemaGenerator
}: {
  typeName: string;
  newTypeName: string;
  jsonSchemaGenerator?: JsonSchemaGenerator;
}) => {
  const generator = jsonSchemaGenerator || (await getJsonSchemaGenerator());
  const jsonSchema = generator.getSchemaForSymbol(typeName);
  const res = await compileJsonSchemaToTypescript(jsonSchema as any, newTypeName);
  return res.split('\n').slice(7).join('\n');
};
