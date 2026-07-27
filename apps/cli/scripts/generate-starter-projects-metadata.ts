import { join } from 'node:path';
import { STARTER_PROJECTS_METADATA_FOLDER_NAME, STARTER_PROJECTS_SOURCE_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess, logWarn } from '@shared/utils/logging';
import { getUniqueDuplicates, hasDuplicates } from '@shared/utils/misc';
import { pathExists, remove, writeJson } from 'fs-extra';
import { getAllStarterProjectIds } from './generate-starter-project';
import { getStarterProjectMetadata, prettierFix } from './starter-projects/utils';

export const generateStarterProjectsMetadata = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Generating starter projects metadata...');
  // await exec('npx', ['prettier', 'starter-projects', '--write'], { disableStdout: true });
  const distPath = join(distFolderPath, STARTER_PROJECTS_METADATA_FOLDER_NAME);
  await remove(distPath);

  // Only folders exposing `.project/_metadata.yml` are publishable starters. In-progress projects
  // (no metadata yet) are skipped so generation never crashes on a half-finished starter.
  const allStarterProjects = await getAllStarterProjectIds();
  const withMetadataFlag = await Promise.all(
    allStarterProjects.map(async (name) => ({
      name,
      hasMetadata: await pathExists(join(STARTER_PROJECTS_SOURCE_PATH, name, '.project', '_metadata.yml'))
    }))
  );
  const starterProjects = withMetadataFlag.filter((p) => p.hasMetadata).map((p) => p.name);
  const skipped = withMetadataFlag.filter((p) => !p.hasMetadata).map((p) => p.name);
  if (skipped.length) {
    logWarn(`Skipping starter projects without .project/_metadata.yml: ${skipped.join(', ')}`);
  }

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
