import { join } from 'node:path';
import { GENERATED_STARTER_PROJECTS_DIR_PATH, STARTER_PROJECTS_SOURCE_PATH } from '@shared/naming/project-fs-paths';
import { exec } from '@shared/utils/exec';
import { logErrorMessage, logInfo, logSuccess } from '@shared/utils/logging';
import { processConcurrently } from '@shared/utils/misc';
import { existsSync, readdir, remove, statSync } from 'fs-extra';
import yargsParser from 'yargs-parser';
import { prepareStarterProject } from './starter-projects/utils';

const args = yargsParser(process.argv);

export const generateStarterProject = async ({
  starterProjectId,
  outputDirPath = GENERATED_STARTER_PROJECTS_DIR_PATH,
  install = args.install || false,
  reuseDeps = args.reuseDeps || false,
  addLinting = args.addLinting || false,
  mode = args.mode || 'app',
  log = false
}: {
  starterProjectId: string;
  outputDirPath?: string;
  install?: boolean;
  reuseDeps?: boolean;
  mode?: 'github' | 'app';
  addLinting?: boolean;
  log?: boolean;
}) => {
  try {
    const projectOutputPath = join(outputDirPath, starterProjectId);
    if (reuseDeps && existsSync(projectOutputPath)) {
      const allItemsInDir = await readdir(projectOutputPath);
      await Promise.all(
        allItemsInDir
          .filter((item) => !['node_modules', 'yarn.lock'].includes(item))
          .map((item) => remove(join(projectOutputPath, item)))
      );
    } else if (existsSync(projectOutputPath)) {
      await remove(projectOutputPath);
    }

    if (log) {
      logInfo(`Generating starter project ${starterProjectId} to ${projectOutputPath}...`);
    }
    const metadata = await prepareStarterProject({ starterProjectId, outputDirPath, mode, addLinting });
    if (log) {
      logSuccess(`Successfully generated starter projects ${starterProjectId} to ${projectOutputPath}`);
    }

    if (metadata.projectType === 'es' && install) {
      if (log) {
        logSuccess(`Installing project dependencies for project ${starterProjectId}... `);
      }
      await exec('bun', ['install'], { cwd: projectOutputPath, disableStdout: true, disableStderr: true });
      if (log) {
        logSuccess(`Successfully installed starter projects dependencies for project ${starterProjectId}.`);
      }
    }
    return { ...metadata, projectDistPath: join(outputDirPath, starterProjectId) };
  } catch (err) {
    throw new Error(`Failed to prepare starter project ${starterProjectId}. Error:\n${err}`);
  }
};

export const getAllStarterProjectIds = async () => {
  const allItemsInDir = await readdir(STARTER_PROJECTS_SOURCE_PATH);
  return allItemsInDir.filter((item) => {
    const starterProjectPath = join(STARTER_PROJECTS_SOURCE_PATH, item);
    return statSync(starterProjectPath).isDirectory() && !item.startsWith('_');
  });
};

export const generateAllStarterProjects = async ({
  concurrencyLimit = args.cl || Infinity,
  outputDirPath,
  addLinting = args.addLinting || false,
  mode = args.mode || 'app'
}: {
  concurrencyLimit?: number;
  outputDirPath?: string;
  mode?: 'github' | 'app';
  addLinting?: boolean;
}) => {
  const allStarterProjectsFolderNames = await getAllStarterProjectIds();
  const jobs = allStarterProjectsFolderNames.map(
    (starterProjectId) => () =>
      generateStarterProject({ starterProjectId, outputDirPath, addLinting, mode, log: false })
  );

  logInfo(
    `Generating starter projects ${allStarterProjectsFolderNames.join(
      ', '
    )} to ${outputDirPath} with concurrency limit ${concurrencyLimit} in mode ${mode}...`
  );
  await processConcurrently(jobs, concurrencyLimit);
  logSuccess('Successfully generated starter projects.');
};

if (import.meta.main) {
  if (!args.spn) {
    logErrorMessage([
      'Must specify starter project name (using --spn <<starter-project-folder-name>>)',
      'Use --spn "all" to generate all.',
      'Use --install to also install project dependencies (works only for Javascript/Typescript projects).',
      "Use --reuseDeps to preserve last installed dependencies (they won't) be deleted, will stay in the generated folder.",
      'Use --cl (concurrency limit) to limit max amount of concurrently process starter projects (works only when using --spn all). By default, the limit is Infinity.'
    ]);
  } else if (args.spn === 'all') {
    generateAllStarterProjects({});
  } else {
    generateStarterProject({ starterProjectId: args.spn, log: true });
  }
}
