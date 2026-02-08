import { join } from 'node:path';
import { STARTER_PROJECTS_METADATA_FOLDER_NAME, STARTER_PROJECTS_SOURCE_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { getUniqueDuplicates, hasDuplicates } from '@shared/utils/misc';
import { remove, writeJson } from 'fs-extra';
import { getAllStarterProjectIds } from './generate-starter-project';
import { getStarterProjectMetadata, prettierFix } from './starter-projects/utils';

export const generateStarterProjectsMetadata = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Generating starter projects metadata...');
  // await exec('npx', ['prettier', 'starter-projects', '--write'], { disableStdout: true });
  const distPath = join(distFolderPath, STARTER_PROJECTS_METADATA_FOLDER_NAME);
  await remove(distPath);

  const starterProjects = await getAllStarterProjectIds();
  const metadata = await Promise.all(
    starterProjects.map(async (starterProjectName) => {
      return getStarterProjectMetadata({ absoluteProjectPath: join(STARTER_PROJECTS_SOURCE_PATH, starterProjectName) });
    })
  );

  const allProjectIds = metadata.map((proj) => proj.starterProjectId);
  if (hasDuplicates(allProjectIds)) {
    throw new Error(`There are duplicate starter names in starter projects: ${getUniqueDuplicates(allProjectIds)}`);
  }
  const sorted = metadata.sort((a, b) => a.priority - b.priority);

  await writeJson(distPath, sorted, { spaces: 2 });

  await prettierFix({ paths: [distPath] });

  logSuccess(`Successfully generated starter projects metadata to ${distPath}`);
  return distPath;
  // await Promise.all([remove(join(outputDirPath, '.prettierrc')), remove(join(outputDirPath, '.eslintrc'))]);
};

if (import.meta.main) {
  generateStarterProjectsMetadata({ distFolderPath: process.cwd() });
}
