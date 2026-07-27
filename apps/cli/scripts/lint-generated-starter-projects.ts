import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED_STARTER_PROJECTS_DIR_PATH } from '@shared/naming/project-fs-paths';
import { exec } from '@shared/utils/exec';
import { logInfo } from '@shared/utils/logging';
import { getAllStarterProjectIds } from './generate-starter-project';

export const lintGeneratedStarterProjects = async () => {
  logInfo('Linting starter projects...');
  const starterProjects = await getAllStarterProjectIds();
  await Promise.all(
    starterProjects.map(async (starterProjectName) => {
      if (existsSync(join(GENERATED_STARTER_PROJECTS_DIR_PATH, starterProjectName, '.eslintrc'))) {
        return exec('npx', ['eslint', '.'], {
          cwd: join(GENERATED_STARTER_PROJECTS_DIR_PATH, starterProjectName),
          disableStderr: false,
          disableStdout: false
        });
      }
    })
  );
};

if (import.meta.main) {
  lintGeneratedStarterProjects();
}
