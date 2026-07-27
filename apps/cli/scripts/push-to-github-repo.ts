import { join } from 'node:path';
import {
  GITHUB_REPO_README_PATH,
  INSTALL_SCRIPTS_PATH,
  PUBLISH_GITHUB_REPO_DIR_PATH
} from '@shared/naming/project-fs-paths';
import { executeGit } from '@shared/utils/exec';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { copy, ensureFile, mkdir, remove, writeFile } from 'fs-extra';
import walk from 'walk-filtered';
import { getAllStarterProjectIds } from './generate-starter-project';

const COMMIT_MESSAGE = 'update install scripts & README';

const execGit = (command: string) => executeGit(command, { cwd: PUBLISH_GITHUB_REPO_DIR_PATH });

const copyInstallScripts = async () => {
  logInfo('Copying install scripts...');
  await walk(INSTALL_SCRIPTS_PATH, async (file) => {
    if (!file.path.includes('_data.json')) {
      await copy(file.fullPath, join(PUBLISH_GITHUB_REPO_DIR_PATH, 'install-scripts', file.path));
    }
  });
  logSuccess('Successfully copied install scripts.');
};

export const pushToGithubRepo = async () => {
  await remove(PUBLISH_GITHUB_REPO_DIR_PATH);
  await copyInstallScripts();
  await copy(GITHUB_REPO_README_PATH, join(PUBLISH_GITHUB_REPO_DIR_PATH, 'README.md'));
  await mkdir(join(PUBLISH_GITHUB_REPO_DIR_PATH, 'starter-projects'));
  const starterProjects = await getAllStarterProjectIds();
  await Promise.all(
    starterProjects.map(async (starterProjectName) => {
      const readmePath = join(PUBLISH_GITHUB_REPO_DIR_PATH, 'starter-projects', starterProjectName, 'README.md');
      await ensureFile(readmePath);
      return writeFile(
        readmePath,
        `The project is available at\nhttps://github.com/stacktape/starter-${starterProjectName}`,
        { encoding: 'utf-8' }
      );
    })
  );
  logInfo('Pushing to github...');
  await execGit('init');
  await execGit('remote add origin git@github.com:stacktape/stacktape.git').catch(async () => {
    await execGit('remote remove origin');
    await execGit('remote add origin git@github.com:stacktape/stacktape.git');
  });
  // await execa('git remote show', { stdout: 'inherit', stderr: 'inherit' }).then(console.info);
  await execGit('add .');
  await execGit(`commit -m "${COMMIT_MESSAGE}"`);
  await execGit('push -u origin master --force');
  await execGit('remote remove origin');
  await remove(PUBLISH_GITHUB_REPO_DIR_PATH);
  logSuccess('Successfully pushed to Github.');
};

if (import.meta.main) {
  pushToGithubRepo();
}
