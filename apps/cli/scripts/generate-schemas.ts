import { CONFIG_SCHEMA_PATH, JSON_SCHEMAS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { mkdir, remove, writeJSON } from 'fs-extra';
import { generateConfigSchema, getJsonSchemaGenerator } from './code-generation/utils';
import { generateZodSchema } from './code-generation/generate-zod-schema';
import { stripExampleMarkersInSchema } from './code-generation/strip-example-markers';

export const generateSchemas = async () => {
  logInfo('Generating config schema and Zod schema...');

  await remove(JSON_SCHEMAS_FOLDER_PATH);
  await mkdir(JSON_SCHEMAS_FOLDER_PATH, { recursive: true });

  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  const jsonSchema = await generateConfigSchema({ jsonSchemaGenerator });

  // Embedded examples are authored with focus markers (# stp-focus) and escaped `*\/`. Strip both from
  // the published descriptions (clean editor hover) and record focus ranges as `x-stp-focus` (web docs).
  stripExampleMarkersInSchema(jsonSchema);
  await writeJSON(CONFIG_SCHEMA_PATH, jsonSchema);

  await generateZodSchema(jsonSchema);

  logSuccess('Config schema and Zod schema generated successfully.');
};

if (import.meta.main) {
  generateSchemas();
}
