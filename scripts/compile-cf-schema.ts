import { join } from 'node:path';
import { GENERATED_FILES_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { downloadFile } from '@shared/utils/download-file';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { unzip } from '@shared/utils/unzip';
import { mkdirp, outputJSON, readdirSync, readJson, remove } from 'fs-extra';

export const compileCfSchema = async () => {
  logInfo('Generating CloudFormation schema...');
  const schemasDirPath = join(GENERATED_FILES_FOLDER_PATH, 'cloudformation-resource-schemas');
  await remove(schemasDirPath);
  await mkdirp(schemasDirPath);
  const zipPath = join(schemasDirPath, 'schemas.zip');
  await downloadFile({
    downloadTo: schemasDirPath,
    url: 'https://schema.cloudformation.us-east-1.amazonaws.com/CloudformationSchema.zip',
    fileName: 'schemas.zip'
  });

  await unzip({ zipFilePath: zipPath, outputDir: schemasDirPath });

  await remove(zipPath);
  const allData = [];
  const referenceableParams: { [resourceType: string]: { Ref: string[]; GetAtt: string[] } } = {};
  for (const resourcePath of readdirSync(join(GENERATED_FILES_FOLDER_PATH, 'cloudformation-resource-schemas'))) {
    const fileContents = await readJson(
      join(GENERATED_FILES_FOLDER_PATH, 'cloudformation-resource-schemas', resourcePath)
    );
    referenceableParams[fileContents.typeName] = {
      Ref: [
        fileContents.primaryIdentifier.map((prop) => prop.replace('/properties/', '').replaceAll('/', '.')).join('|')
      ],
      GetAtt: (fileContents.readOnlyProperties || []).map((prop) =>
        prop.replace('/properties/', '').replaceAll('/', '.')
      )
    };
    allData.push(fileContents);
  }

  const resourceTypes = allData.map((resource) => resource.typeName);

  await outputJSON(join(GENERATED_FILES_FOLDER_PATH, 'full-cloudformation-schema.json'), allData);
  await outputJSON(join(GENERATED_FILES_FOLDER_PATH, 'cloudformation-resource-types.json'), resourceTypes);
  await outputJSON(
    join(GENERATED_FILES_FOLDER_PATH, 'cloudformation-resource-referenceable-params.json'),
    referenceableParams
  );

  logSuccess('CloudFormation schema generated successfully.');
};

if (import.meta.main) {
  compileCfSchema();
}
