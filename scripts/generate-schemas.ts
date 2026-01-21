import { JSON_SCHEMAS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { mkdir, remove } from 'fs-extra';
import { generateAjvValidationCode, generateConfigSchema, getJsonSchemaGenerator } from './code-generation/utils';
import { generateZodSchema } from './code-generation/generate-zod-schema';

export const generateSchemas = async () => {
  logInfo('Generating config schema, AJV validation code, and Zod schema...');

  await remove(JSON_SCHEMAS_FOLDER_PATH);
  await mkdir(JSON_SCHEMAS_FOLDER_PATH, { recursive: true });

  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  const jsonSchema = await generateConfigSchema({ jsonSchemaGenerator });

  // Generate both AJV (for backwards compatibility) and Zod (for better errors)
  await Promise.all([generateAjvValidationCode(jsonSchema), generateZodSchema(jsonSchema)]);

  logSuccess('Config schema, AJV validation code, and Zod schema generated successfully.');
};

if (import.meta.main) {
  generateSchemas();
}
