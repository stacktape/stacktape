import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { join } from 'node:path';
import { argAliases as cliArgsAliases } from '../../src/config/cli/options';
import { AJV_VALIDATION_CODE_PATH, CONFIG_SCHEMA_PATH } from '@shared/naming/project-fs-paths';
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
  const res = await compileJsonSchemaToTypescript(jsonSchema as any, newTypeName, {
    unknownAny: false // Use 'any' instead of '{ [k: string]: unknown }' for untyped fields
  });
  return res.split('\n').slice(7).join('\n');
};
