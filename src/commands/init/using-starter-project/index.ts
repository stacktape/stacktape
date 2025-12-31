import { join } from 'node:path';
import { downloadTemplate } from 'giget';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { deleteDirectoryContent } from '@shared/utils/fs-utils';
import { ensureDir, existsSync, readdirSync, statSync } from 'fs-extra';
import {
  addEslintPrettier,
  addTsConfig,
  adjustPackageJson,
  getAvailableStartersMetadata,
  promptTargetDirectory
} from './utils';

export const initUsingStarterProject = async () => {
  const availableStarters = await getAvailableStartersMetadata({
    startersMetadataFilePath: fsPaths.startersMetadataFilePath()
  });

  let projectToUse: (typeof availableStarters)[number];
  if (globalStateManager.args.starterId) {
    projectToUse = availableStarters.find(
      (s) =>
        s.starterProjectId === globalStateManager.args.starterId ||
        `starter-${s.starterProjectId}` === globalStateManager.args.starterId
    );
    if (!projectToUse) {
      throw stpErrors.e506({ projectId: globalStateManager.args.starterId });
    }
  } else {
    const res = await tuiManager.prompt({
      type: 'select',
      choices: availableStarters.map((s) => ({ title: s.name, value: s.name })),
      name: 'name',
      message: 'Choose a starter project.'
    });
    projectToUse = availableStarters.find((s) => s.name === res.name);
  }

  let targetDirectory = globalStateManager.args.projectDirectory;
  if (!targetDirectory) {
    targetDirectory = await promptTargetDirectory();
  }

  const absoluteProjectPath = join(process.cwd(), targetDirectory);

  const dirOrFileExists = existsSync(absoluteProjectPath);
  if (dirOrFileExists) {
    if (statSync(absoluteProjectPath).isDirectory()) {
      const contents = readdirSync(absoluteProjectPath);
      if (contents.length) {
        tuiManager.warn(
          `Directory ${tuiManager.prettyFilePath(absoluteProjectPath)} is not empty. Starter project will overwrite its contents.`
        );
        const { confirmed } = await tuiManager.prompt({
          type: 'confirm',
          name: 'confirmed',
          message: 'Continue?'
        });
        if (!confirmed) {
          return;
        }
        await deleteDirectoryContent(absoluteProjectPath);
      }
    } else {
      tuiManager.warn(
        `Path ${tuiManager.prettyFilePath(
          absoluteProjectPath
        )} is a file. Choose an empty directory for your starter project.`
      );
      return;
    }
  }

  await downloadStarterFromGithub({ githubLink: projectToUse.githubLink, targetDirectory: absoluteProjectPath });

  if (projectToUse.projectType === 'es') {
    let shouldAddEslintPrettier = false;
    if (!projectToUse.disableLintingOption) {
      shouldAddEslintPrettier = true; // await promptAddEslintPrettier();
    }
    await adjustPackageJson({ absoluteProjectPath, metadata: projectToUse, shouldAddEslintPrettier });
    if (shouldAddEslintPrettier) {
      await addEslintPrettier({ absoluteProjectPath, metadata: projectToUse });
    }
    if (!projectToUse.hasOwnTsConfig) {
      await addTsConfig({ absoluteProjectPath, metadata: projectToUse });
    }
  }

  const readmePath = join(absoluteProjectPath, 'README.md');

  tuiManager.success(`Project initialized at ${tuiManager.prettyFilePath(absoluteProjectPath)}.`);

  tuiManager.showNextSteps([
    {
      text: 'Navigate to the project directory:',
      command: `${tuiManager.colorize('yellow', 'cd')} ${targetDirectory}`
    },
    {
      text: 'To deploy your stack from local machine, run:',
      command: `${tuiManager.prettyCommand('deploy')} ${tuiManager.prettyOption('region')} <<region>> ${tuiManager.prettyOption('stage')} <<stage>>`
    },
    {
      text: 'To deploy your stack from AWS CodeBuild pipeline, run:',
      command: `${tuiManager.prettyCommand('codebuild:deploy')} ${tuiManager.prettyOption('region')} <<region>> ${tuiManager.prettyOption('stage')} <<stage>>`
    },
    {
      text: 'For next steps and detailed description of the stack, refer to:',
      links: [
        `https://github.com/stacktape/stacktape/tree/master/starter-projects/${projectToUse.starterProjectId}`,
        tuiManager.prettyFilePath(readmePath)
      ]
    }
  ]);
};

export const downloadStarterFromGithub = async ({
  githubLink,
  targetDirectory
}: {
  githubLink: string;
  targetDirectory: string;
}) => {
  const gigetSource = getGigetSource(githubLink);
  await ensureDir(targetDirectory);
  await downloadTemplate(gigetSource, { dir: targetDirectory, force: true });
};

const getGigetSource = (githubLink: string) => {
  if (githubLink.startsWith('github:')) {
    return githubLink;
  }
  if (githubLink.startsWith('https://github.com/')) {
    const { pathname } = new URL(githubLink);
    const repoPath = pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.git$/, '');
    return `github:${repoPath}`;
  }
  return githubLink;
};
