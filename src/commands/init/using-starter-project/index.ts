import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { downloadFile } from '@shared/utils/download-file';
import { deleteDirectoryContent } from '@shared/utils/fs-utils';
import { unzip } from '@shared/utils/unzip';
import { existsSync, move, readdir, readdirSync, remove, statSync } from 'fs-extra';
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
          `Directory ${tuiManager.prettyFilePath(absoluteProjectPath)} already exists and is not empty. Initiating starter project into this directory will overwrite contents of this directory.`
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
        `The path you have entered: ${tuiManager.prettyFilePath(absoluteProjectPath)} is a path to a file on your system. Please choose empty directory for your starter project`
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

  tuiManager.success(`Project successfully initialized to ${tuiManager.prettyFilePath(absoluteProjectPath)}.`);
  console.info(`\n   ○ ${tuiManager.colorize('yellow', 'cd')} ${targetDirectory}
   ○ ${tuiManager.makeBold('To deploy your stack from local machine')}, run ${getDeployStackLine('deploy')}
   ○ ${tuiManager.makeBold('To deploy your stack from AWS codebuild pipeline')}, run ${getDeployStackLine(
     'codebuild:deploy'
   )}
   ○ ${tuiManager.makeBold('For next steps and detailed description of the stack')}, refer to:
   https://github.com/stacktape/stacktape/tree/master/starter-projects/${projectToUse.starterProjectId}
      or the project's README ${tuiManager.prettyFilePath(readmePath)}\n`);
};

const getDeployStackLine = (deploymentType: 'deploy' | 'codebuild:deploy') => {
  return `${tuiManager.prettyCommand(deploymentType)} ${tuiManager.makeBold('--region')} <<region>> ${tuiManager.makeBold(
    '--stage'
  )} <<stage>>`;

  // if (deploymentType === 'local-machine') {
  //   return localMachineMessage;
  // }
  // const adjustedLocalMachineMsg = localMachineMessage.replace(
  //   'To deploy your stack',
  //   'To deploy your stack from local machine'
  // );
  // if (deploymentType === 'github') {
  //   return `${adjustedLocalMachineMsg}   ○ ${printer.makeBold('To deploy your stack using Github Action')}:
  //     1. Create a new repository at https://github.com/new
  //     2. Create Github repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-github-repository-secrets
  //     3. replace <<stage>> and <<region>> in the .github/workflows/deploy.yml file.
  //     4. ${printer.colorize('yellow', 'git')} init --initial-branch=main
  //     5. ${printer.colorize('yellow', 'git')} add .
  //     6. ${printer.colorize('yellow', 'git')} commit -m "setup stacktape project"
  //     7. ${printer.colorize('yellow', 'git')} remote add origin git@github.com:<<namespace-name>>/<<repo-name>>.git
  //     8. ${printer.colorize('yellow', 'git')} push -u origin main
  //     9. To monitor the deployment progress, navigate to your github project and select the Actions tab`;
  // }
  // if (deploymentType === 'gitlab') {
  //   return `${adjustedLocalMachineMsg}   ○ ${printer.makeBold('To deploy your stack using Gitlab CI')}:
  //     1. Create a new repository at https://gitlab.com/projects/new
  //     2. Create Gitlab repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-gitlab-repository-secrets
  //     3. replace <<stage>> and <<region>> in the .gitlab-ci.yml file.
  //     4. ${printer.colorize('yellow', 'git')} init --initial-branch=main
  //     5. ${printer.colorize('yellow', 'git')} add .
  //     6. ${printer.colorize('yellow', 'git')} commit -m "setup stacktape project"
  //     7. ${printer.colorize('yellow', 'git')} remote add origin git@gitlab.com:<<namespace-name>>/<<repo-name>>.git
  //     8. ${printer.colorize('yellow', 'git')} push -u origin main
  //     9. To monitor the deployment progress, navigate to your gitlab project and select CI/CD->jobs`;
  // }
};

export const downloadStarterFromGithub = async ({
  githubLink,
  targetDirectory
}: {
  githubLink: string;
  targetDirectory: string;
}) => {
  // await remove(targetDirectory);
  const { filePath: zipFilePath } = await downloadFile({
    downloadTo: targetDirectory,
    url: `${githubLink}/zipball/master/`,
    fileName: 'downloaded-project.zip'
  });

  await unzip({ zipFilePath, outputDir: targetDirectory });

  const itemsInTargetDir = await readdir(targetDirectory);
  const capsuleDirName = itemsInTargetDir.find((name) => !name.endsWith('.zip'));
  const itemsInStarterDir = await readdir(join(targetDirectory, capsuleDirName));
  await Promise.all(
    itemsInStarterDir.map((item) => {
      return move(join(targetDirectory, capsuleDirName, item), join(targetDirectory, item), { overwrite: true });
    })
  );
  await Promise.all([remove(zipFilePath), remove(join(targetDirectory, capsuleDirName))]);
};
