import { shellQuote } from '../../../config/cli/public-names';
import type { StarterProjectMetadata } from '@scripts/types';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { localStatePaths } from 'src/config/local-state-paths';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { fsPaths } from 'src/config/runtime-paths';
import { publicApiClient, type StackPriceEstimationResponse } from '@stacktape-api/public';
import { deleteDirectoryContent } from '@utils/fs-utils';
import { unzip } from '@utils/unzip';
import color from 'picocolors';
import { parse as parseYaml } from 'yaml';
import {
  appendResourceRows,
  formatResourceType,
  getResourceCostLabel,
  getStackCostLabel
} from '../utils/output-formatting';
import { printInitPreflight, promptConfigFormat } from '../utils/ui';
import {
  createWriteStream,
  ensureDir,
  existsSync,
  move,
  pathExists,
  readdir,
  readdirSync,
  readFile,
  remove,
  stat,
  statSync
} from 'fs-extra';
import {
  addDefaultTsConfigIfNeeded,
  adjustPackageJson,
  getAvailableStartersMetadata,
  promptTargetDirectory,
  starterCommands
} from './utils';

/**
 * Creates a project from a starter and prints the commands that put it on AWS.
 *
 * `region` is the one `stacktape init` writes into a new config; `regionChoice` says why, as the end of a sentence.
 */
export const initUsingStarterProject = async ({ region, regionChoice }: { region: string; regionChoice: string }) => {
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

  printInitPreflight({ projectName: projectToUse.starterProjectId, mode: 'starter-template' });

  const { initializeProjectTo, projectDirectory, configFormat: configFormatArg } = globalStateManager.args;
  const targetDirectory = initializeProjectTo || projectDirectory || (await promptTargetDirectory());

  // `resolve`, not `join`: an absolute target (`C:\projects\app` or `/home/me/app`) must not be nested in the cwd.
  const absoluteProjectPath = resolve(process.cwd(), targetDirectory);

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

  // Read the YAML config before the chosen format may delete it. The TypeScript config describes the same resources.
  const yamlConfigPath = join(absoluteProjectPath, 'stacktape.yml');
  const yamlConfig = (await pathExists(yamlConfigPath)) ? await readFile(yamlConfigPath, 'utf8') : undefined;
  const costEstimation = yamlConfig === undefined ? null : await fetchCostEstimate({ yamlConfig, region });
  const commands = starterCommands({
    projectName: projectToUse.starterProjectId,
    region,
    awsAccount: globalStateManager.args.awsAccount,
    resources: yamlConfig === undefined ? {} : (parseYaml(yamlConfig)?.resources ?? {})
  });

  const configFormat = configFormatArg ?? (await promptConfigFormat());
  await removeUnusedConfigFile({ absoluteProjectPath, chosenFormat: configFormat });

  if (projectToUse.projectType === 'es') {
    await adjustPackageJson({ absoluteProjectPath, metadata: projectToUse });
    await addDefaultTsConfigIfNeeded({ absoluteProjectPath, metadata: projectToUse });
  }

  displayResult({
    targetDirectory,
    absoluteProjectPath,
    projectToUse,
    costEstimation,
    configFormat,
    commands,
    regionChoice
  });
};

const downloadStarterFromGithub = async ({
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
  const archivePath = localStatePaths.starterArchiveFile({ targetDirectory, id: Date.now() });
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

const removeUnusedConfigFile = async ({
  absoluteProjectPath,
  chosenFormat
}: {
  absoluteProjectPath: string;
  chosenFormat: 'typescript' | 'yaml';
}) => {
  const fileToRemove =
    chosenFormat === 'typescript'
      ? join(absoluteProjectPath, 'stacktape.yml')
      : join(absoluteProjectPath, 'stacktape.ts');
  if (await pathExists(fileToRemove)) {
    await remove(fileToRemove);
  }
};

const fetchCostEstimate = async ({
  yamlConfig,
  region
}: {
  yamlConfig: string;
  region: string;
}): Promise<StackPriceEstimationResponse | null> => {
  try {
    const result = await publicApiClient.stackPriceEstimation({ stackConfig: yamlConfig, region });
    if (!result.success || !result.costs) return null;
    return result;
  } catch {
    return null;
  }
};

const displayResult = ({
  targetDirectory,
  absoluteProjectPath,
  projectToUse,
  costEstimation,
  configFormat,
  commands,
  regionChoice
}: {
  targetDirectory: string;
  absoluteProjectPath: string;
  projectToUse: StarterProjectMetadata;
  costEstimation: StackPriceEstimationResponse | null;
  configFormat: 'typescript' | 'yaml';
  commands: ReturnType<typeof starterCommands>;
  regionChoice: string;
}) => {
  const configFile = configFormat === 'typescript' ? 'stacktape.ts' : 'stacktape.yml';
  const costBreakdown = costEstimation?.costs?.resourcesBreakdown || {};
  const hasCosts = costEstimation?.costs != null;

  type ResourceRow = { name: string; type: string; cost: string };
  const rows: ResourceRow[] = [];
  for (const resource of projectToUse.usedResources) {
    const friendlyType = formatResourceType(resource.type);
    const costInfo = costBreakdown[resource.name];
    rows.push({ name: resource.name, type: friendlyType, cost: getResourceCostLabel(costInfo) });
  }

  const lines: string[] = [];
  lines.push(
    `${color.green('✓')} Project initialized to ${tuiManager.prettyFilePath(absoluteProjectPath)} (${configFile})\n`
  );
  lines.push(color.dim('Setup mode: Starter template (no AI project analysis).'));
  lines.push('');

  appendResourceRows({
    lines,
    heading: 'Resources:',
    rows,
    hasCosts,
    makeBold: tuiManager.makeBold.bind(tuiManager)
  });

  if (hasCosts && costEstimation.costs) {
    lines.push(`\n${color.dim('Estimated total costs:')} ${getStackCostLabel(costEstimation.costs)}`);
  }

  lines.push(`${color.dim('Region:')} ${regionChoice}`);

  lines.push('');
  lines.push(tuiManager.makeBold('Navigate to the project:'));
  lines.push(`  ${tuiManager.colorize('yellow', 'cd')} ${shellQuote(targetDirectory)}`);
  if (commands.secrets.length) {
    const [what, how] =
      commands.secrets.length === 1
        ? ['the secret', 'the command asks for its value']
        : ['the secrets', 'each command asks for its value'];
    lines.push(tuiManager.makeBold(`Create ${what} the starter needs ${color.dim(`(${how})`)}:`));
    lines.push(...commands.secrets.map((command) => `  ${tuiManager.prettyCommand(command)}`));
  }
  lines.push(
    tuiManager.makeBold(`Run hybrid-local dev mode ${color.dim('(deploys minimal, free dev stack to AWS)')}:`)
  );
  lines.push(`  ${tuiManager.prettyCommand(commands.dev)}`);
  lines.push(tuiManager.makeBold('Deploy to AWS:'));
  lines.push(`  ${tuiManager.prettyCommand(commands.deploy)}`);

  tuiManager.printBox({ title: projectToUse.name, lines });
};
