import { RESOURCES_DESCRIPTION_DIST_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { remove, writeJson } from 'fs-extra';
import { getStacktapeResourceDefinitions } from '@scripts/code-generation/schema-parsing';

export const generateResourceDescriptions = async () => {
  logInfo('Generating resource descriptions...');
  // await exec('npx', ['prettier', 'starter-projects', '--write'], { disableStdout: true });
  await remove(RESOURCES_DESCRIPTION_DIST_PATH);

  const resources = getStacktapeResourceDefinitions();

  await writeJson(RESOURCES_DESCRIPTION_DIST_PATH, resources, { spaces: 2 });

  logSuccess(`Successfully generated resource descriptions to ${RESOURCES_DESCRIPTION_DIST_PATH}`);
  // await Promise.all([remove(join(outputDirPath, '.prettierrc')), remove(join(outputDirPath, '.eslintrc'))]);
};

if (import.meta.main) {
  generateResourceDescriptions();
}
