import { JSON_SCHEMAS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { mkdir, remove } from 'fs-extra';
import { generateAjvValidationCode, generateConfigSchema, getJsonSchemaGenerator } from './code-generation/utils';

export const generateSchemas = async () => {
  logInfo('Generating config schema and Ajv validation code...');

  await remove(JSON_SCHEMAS_FOLDER_PATH);
  await mkdir(JSON_SCHEMAS_FOLDER_PATH, { recursive: true });

  const jsonSchemaGenerator = await getJsonSchemaGenerator();

  const jsonSchema = await generateConfigSchema({ jsonSchemaGenerator });
  await generateAjvValidationCode(jsonSchema);

  logSuccess('Config schema and Ajv validation code generated successfully.');
};

if (import.meta.main) {
  generateSchemas();
}
