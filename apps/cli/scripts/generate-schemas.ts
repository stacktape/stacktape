import { CONFIG_SCHEMA_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { mkdir, writeJSON } from 'fs-extra';
import { dirname } from 'node:path';
import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { generateConfigSchema, getJsonSchemaGenerator } from './code-generation/utils';
import { generateZodSchema, ZOD_SCHEMA_OUTPUT_PATH } from './code-generation/generate-zod-schema';
import { type ConfigJsonSchema, restoreImportedConfigTypes } from './code-generation/config-schema-overrides';
import { stripExampleMarkersInSchema } from './code-generation/strip-example-markers';

export const generateSchemas = async ({
  configSchemaPath = CONFIG_SCHEMA_PATH,
  jsonSchemaGenerator,
  zodSchemaPath = ZOD_SCHEMA_OUTPUT_PATH
}: {
  configSchemaPath?: string;
  jsonSchemaGenerator?: JsonSchemaGenerator;
  zodSchemaPath?: string;
} = {}) => {
  logInfo('Generating config schema and Zod schema...');

  await Promise.all([
    mkdir(dirname(configSchemaPath), { recursive: true }),
    mkdir(dirname(zodSchemaPath), { recursive: true })
  ]);

  const generator = jsonSchemaGenerator ?? (await getJsonSchemaGenerator());

  const jsonSchema = (await generateConfigSchema({ jsonSchemaGenerator: generator })) as ConfigJsonSchema;
  restoreImportedConfigTypes({ schema: jsonSchema });

  // Embedded examples are authored with focus markers (# stp-focus) and escaped `*\/`. Strip both from
  // the published descriptions (clean editor hover) and record focus ranges as `x-stp-focus` (web docs).
  stripExampleMarkersInSchema(jsonSchema);
  await writeJSON(configSchemaPath, jsonSchema);

  await generateZodSchema(jsonSchema, zodSchemaPath);

  logSuccess('Config schema and Zod schema generated successfully.');
  return jsonSchema;
};

if (import.meta.main) {
  generateSchemas().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
