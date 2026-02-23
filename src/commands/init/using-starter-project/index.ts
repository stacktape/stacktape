import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { publicApiClient, type StackPriceEstimationResponse } from '@shared/trpc/public';
import { deleteDirectoryContent } from '@shared/utils/fs-utils';
import { unzip } from '@shared/utils/unzip';
import color from 'picocolors';
import { appendResourceRows, formatPrice, formatResourceType, getResourceCostLabel } from '../utils/output-formatting';
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
import { addTsConfig, adjustPackageJson, getAvailableStartersMetadata, promptTargetDirectory } from './utils';

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

  printInitPreflight({ projectName: projectToUse.starterProjectId, mode: 'starter-template' });

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

  // Estimate costs from the YAML config (before potentially deleting it)
  const costEstimation = await fetchCostEstimate(join(absoluteProjectPath, 'stacktape.yml'));

  const configFormat = await promptConfigFormat();
  await removeUnusedConfigFile({ absoluteProjectPath, chosenFormat: configFormat });

  if (projectToUse.projectType === 'es') {
    await adjustPackageJson({ absoluteProjectPath, metadata: projectToUse });
    if (!projectToUse.hasOwnTsConfig) {
      await addTsConfig({ absoluteProjectPath, metadata: projectToUse });
    }
  }

  displayResult({ targetDirectory, absoluteProjectPath, projectToUse, costEstimation, configFormat });
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

const fetchCostEstimate = async (yamlConfigPath: string): Promise<StackPriceEstimationResponse | null> => {
  try {
    if (!(await pathExists(yamlConfigPath))) return null;
    const yamlContent = await readFile(yamlConfigPath, 'utf8');
    const result = await publicApiClient.stackPriceEstimation({ stackConfig: yamlContent });
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
  configFormat
}: {
  targetDirectory: string;
  absoluteProjectPath: string;
  projectToUse: StarterProjectMetadata;
  costEstimation: StackPriceEstimationResponse | null;
  configFormat: 'typescript' | 'yaml';
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
    const { flatMonthlyCost } = costEstimation.costs;
    lines.push(`\n${color.dim('Estimated total costs:')} ~${formatPrice(flatMonthlyCost || 0)}/mo + pay-per-use costs`);
  }

  const projectName = projectToUse.starterProjectId;
  const options = `--projectName ${projectName} --stage {stage} --region {region}`;

  lines.push('');
  lines.push(tuiManager.makeBold('Navigate to the project:'));
  lines.push(`  ${tuiManager.colorize('yellow', 'cd')} ${targetDirectory}`);
  lines.push(
    tuiManager.makeBold(`Run hybrid-local dev mode ${color.dim('(deploys minimal, free dev stack to AWS)')}:`)
  );
  lines.push(`  ${tuiManager.prettyCommand(`dev ${options}`)}`);
  lines.push(tuiManager.makeBold('Deploy to AWS:'));
  lines.push(`  ${tuiManager.prettyCommand(`deploy ${options}`)}`);

  tuiManager.printBox({ title: projectToUse.name, lines });
};
