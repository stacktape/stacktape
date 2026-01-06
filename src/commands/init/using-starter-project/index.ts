import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { convertYamlToTypescript } from '@shared/utils/config-converter';
import { deleteDirectoryContent } from '@shared/utils/fs-utils';
import { unzip } from '@shared/utils/unzip';
import {
  createWriteStream,
  ensureDir,
  existsSync,
  move,
  outputFile,
  pathExists,
  readdir,
  readdirSync,
  readFile,
  remove,
  stat,
  statSync
} from 'fs-extra';
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
    const selectedName = await tuiManager.promptSelect({
      message: 'Choose a starter project.',
      options: availableStarters.map((s) => ({ label: s.name, value: s.name }))
    });
    projectToUse = availableStarters.find((s) => s.name === selectedName);
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
        const confirmed = await tuiManager.promptConfirm({
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
  const configFormat = await promptConfigFormat();
  if (configFormat === 'typescript') {
    await convertStarterConfigToTypescript({ absoluteProjectPath });
  }

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
  const { owner, repo } = parseGithubRepo(githubLink);
  if (!owner || !repo) {
    throw new Error(`Unsupported starter repository link: ${githubLink}`);
  }
  const archiveUrl = `https://codeload.github.com/${owner}/${repo}/zip/HEAD`;
  const archivePath = join(targetDirectory, `.stacktape-starter-${Date.now()}.zip`);
  await ensureDir(targetDirectory);
  await downloadArchive({ archiveUrl, archivePath });
  const { outputDirPath } = await unzip({ zipFilePath: archivePath, outputDir: targetDirectory });
  const capsuleDirPath = await resolveStarterRoot({ targetDirectory, outputDirPath });
  const itemsInStarterDir = await readdir(capsuleDirPath);
  await Promise.all(
    itemsInStarterDir.map((item) => {
      return move(join(capsuleDirPath, item), join(targetDirectory, item), { overwrite: true });
    })
  );
  await Promise.all([remove(archivePath), remove(capsuleDirPath)]);
};

const downloadArchive = async ({ archiveUrl, archivePath }: { archiveUrl: string; archivePath: string }) => {
  const response = await fetch(archiveUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download starter project archive: ${archiveUrl}`);
  }
  await pipeline((Readable as any).fromWeb(response.body), createWriteStream(archivePath));
};

const parseGithubRepo = (githubLink: string) => {
  if (githubLink.startsWith('https://github.com/')) {
    const { pathname } = new URL(githubLink);
    const [owner, repo] = pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\.git$/, '')
      .split('/');
    return { owner, repo };
  }
  if (githubLink.startsWith('github:')) {
    const [owner, repo] = githubLink.replace('github:', '').split('/');
    return { owner, repo };
  }
  return { owner: '', repo: '' };
};

const resolveStarterRoot = async ({
  targetDirectory,
  outputDirPath
}: {
  targetDirectory: string;
  outputDirPath: string;
}) => {
  if (outputDirPath && (await pathExists(outputDirPath))) {
    const stats = await stat(outputDirPath);
    if (stats.isDirectory()) {
      return outputDirPath;
    }
  }
  const itemsInTargetDir = await readdir(targetDirectory);
  const capsuleDirName = itemsInTargetDir.find((name) => !name.endsWith('.zip'));
  if (!capsuleDirName) {
    throw new Error('Downloaded starter archive did not contain a project directory.');
  }
  return join(targetDirectory, capsuleDirName);
};

const promptConfigFormat = async (): Promise<'typescript' | 'yaml'> => {
  const format = await tuiManager.promptSelect({
    message: 'What is your preferred config format?',
    options: [
      { label: 'TypeScript (stacktape.ts)', value: 'typescript' },
      { label: 'YAML (stacktape.yml)', value: 'yaml' }
    ]
  });
  return format as 'typescript' | 'yaml';
};

const convertStarterConfigToTypescript = async ({ absoluteProjectPath }: { absoluteProjectPath: string }) => {
  const yamlPath = join(absoluteProjectPath, 'stacktape.yml');
  if (!(await pathExists(yamlPath))) {
    return;
  }
  const yamlContent = await readFile(yamlPath, 'utf8');
  const tsConfig = convertYamlToTypescript(yamlContent);
  await outputFile(join(absoluteProjectPath, 'stacktape.ts'), tsConfig);
  await remove(yamlPath);
};
