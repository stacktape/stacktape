import { join } from 'node:path';
import { PUBLISH_GITHUB_REPO_DIR_PATH, PUBLISH_STARTER_PROJECTS_DIR_PATH } from '@shared/naming/project-fs-paths';
import { executeGit } from '@shared/utils/exec';
import { createRepository, getRepository } from '@shared/utils/github-api';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { config as loadDotenv } from 'dotenv';
import { readdir, remove } from 'fs-extra';
import { generateAllStarterProjects } from './generate-starter-project';

// Load environment variables from .env file
loadDotenv();

const COMMIT_MESSAGE = 'Update README.md';

export const pushStarterProjects = async () => {
  await remove(PUBLISH_STARTER_PROJECTS_DIR_PATH);
  await generateAllStarterProjects({
    outputDirPath: join(PUBLISH_STARTER_PROJECTS_DIR_PATH),
    mode: 'github',
    addLinting: true
  });
  const starterProjects = await readdir(PUBLISH_STARTER_PROJECTS_DIR_PATH);
  logInfo('Pushing to github...');
  await Promise.all(
    starterProjects.map(async (projectPath) => {
      const repoName = `starter-${projectPath}`;
      const existingRepo = await getRepository({ name: repoName }).catch(() => null);
      if (!existingRepo) {
        await createRepository({ name: repoName });
      }
      const execGit = (command: string) =>
        executeGit(command, { cwd: join(PUBLISH_STARTER_PROJECTS_DIR_PATH, projectPath) });
      await execGit('init');
      await execGit(`remote add origin git@github.com:stacktape/${repoName}.git`).catch(async () => {
        await execGit('remote remove origin');
        await execGit(`remote add origin git@github.com:stacktape/${repoName}.git`);
      });
      await execGit('add .');
      await execGit(`commit -m "${COMMIT_MESSAGE}"`);
      await execGit('push -u origin master --force');
      await execGit('remote remove origin');
      await remove(PUBLISH_GITHUB_REPO_DIR_PATH);
    })
  );
  logSuccess('Successfully pushed to Github.');
};

if (import.meta.main) {
  pushStarterProjects();
}
