import { basename, isAbsolute, join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { stringify } from 'yaml';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { getLockFileData } from '@shared/packaging/bundlers/es/utils';
import {
  publicApiClient,
  type CliConfigGenDeployableUnit,
  type ProductionReadiness,
  type StackPriceEstimationResponse
} from '@shared/trpc/public';
import {
  appendResourceRows,
  countUnsetEnvVarsInConfig,
  formatPrice,
  formatResourceType,
  getResourceCostLabel
} from '../utils/output-formatting';
import { printInitPreflight, promptConfigFormat } from '../utils/ui';
import color from 'picocolors';
import { detectGitInfo, type GitInfo } from '../utils/git-detection';
import { detectConfigFormat, type ConfigFormat } from '../utils/config-format-detection';

export type WizardState = {
  cwd: string;
  projectName: string;
  configFormat: ConfigFormat;
  infrastructureType: ProductionReadiness;
  gitInfo: GitInfo;
  config: StacktapeConfig | null;
  deployableUnits: CliConfigGenDeployableUnit[];
  requiredResources: any[];
  configPath: string | null;
};

/**
 * Main init wizard flow - analyzes project and generates deployment configuration
 */
export const runInitWizard = async (): Promise<void> => {
  // Initialize working directory
  const projectDirectory = globalStateManager.args.projectDirectory;
  const cwd = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();

  const projectName = basename(cwd);

  const state: WizardState = {
    cwd,
    projectName,
    configFormat: 'typescript',
    infrastructureType: 'standard',
    gitInfo: { provider: null, remoteUrl: null, branch: null, owner: null, repository: null },
    config: null,
    deployableUnits: [],
    requiredResources: [],
    configPath: null
  };

  printInitPreflight({ projectName, mode: 'ai-analysis' });

  // Detect git info and config format in background
  state.gitInfo = detectGitInfo(cwd);
  state.configFormat = await detectConfigFormat(cwd);

  // Set working directory for config generator
  configGenManager.setWorkingDirectory(cwd);

  // Check if config already exists
  const existingConfig = await configGenManager.configFileExists();
  if (existingConfig.exists) {
    const relativePath = relative(cwd, existingConfig.path!);
    const shouldOverwrite = await tuiManager.promptConfirm({
      message: `Config already exists at ${tuiManager.prettyFilePath(relativePath)}. Overwrite?`,
      defaultValue: false
    });
    if (!shouldOverwrite) {
      tuiManager.outro('Init cancelled.');
      return;
    }
  }

  // Ask for config format
  state.configFormat = (await promptConfigFormat({ defaultValue: state.configFormat })) as ConfigFormat;

  // Ask for infrastructure type (or use CLI arg)
  const cliInfraType = globalStateManager.args.infrastructureType as ProductionReadiness | undefined;
  if (cliInfraType) {
    state.infrastructureType = cliInfraType;
  } else {
    const infraChoice = await tuiManager.promptSelect({
      message: 'Infrastructure type:',
      options: [
        {
          label: 'Low-cost',
          value: 'low-cost',
          description: 'Minimal resources, serverless where possible'
        },
        {
          label: 'Standard',
          value: 'standard',
          description: 'Balanced defaults'
        },
        {
          label: 'Production',
          value: 'production',
          description: 'High availability, private networking, WAF, etc.'
        }
      ],
      defaultValue: 'low-cost'
    });
    state.infrastructureType = infraChoice as ProductionReadiness;
  }

  // Install stacktape package for TypeScript config
  if (state.configFormat === 'typescript') {
    await installStacktapePackage(cwd);
  }

  // Run AI config generation with per-phase spinners
  try {
    const result = await runConfigGenerationWithSteps(state.infrastructureType);
    state.config = result.config;
    state.deployableUnits = result.deployableUnits;
    state.requiredResources = result.requiredResources;

    tuiManager.info(
      `${color.dim('Analyzed')} ${tuiManager.makeBold(String(result.summary.selectedFiles))} ${color.dim(
        'selected files'
      )}${
        result.summary.totalFilesScanned > 0
          ? ` ${color.dim(`(from ${result.summary.totalFilesScanned} scanned)`)}`
          : ''
      }`
    );
  } catch (error) {
    tuiManager.warn(`Config generation failed: ${error instanceof Error ? error.message : error}`);
    return;
  }

  // Estimate costs, write config, then display everything in one box
  const costEstimation = await fetchCostEstimate(state.config!);

  state.configPath = await configGenManager.writeConfig(state.config!, state.configFormat);
  const relativeConfigPath = relative(process.cwd(), state.configPath) || state.configPath;

  displayResult(state, costEstimation, relativeConfigPath);
};

const displayResult = (state: WizardState, costEstimation: StackPriceEstimationResponse | null, configPath: string) => {
  const costBreakdown = costEstimation?.costs?.resourcesBreakdown || {};
  const hasCosts = costEstimation?.costs != null;
  const configResources = state.config?.resources || {};
  const unresolvedEnvVars = state.config ? countUnsetEnvVarsInConfig(state.config) : 0;

  type ResourceRow = { name: string; type: string; cost: string };
  const rows: ResourceRow[] = [];

  // Build rows from the actual generated config resources (preserves definition order)
  for (const [resourceName, resource] of Object.entries(configResources)) {
    const resourceType = (resource as any)?.type as string | undefined;
    if (!resourceType) continue;
    const friendlyType = formatResourceType(resourceType, resource);
    const costInfo = costBreakdown[resourceName];
    rows.push({ name: resourceName, type: friendlyType, cost: getResourceCostLabel(costInfo) });
  }

  const lines: string[] = [];

  lines.push(`${color.green('✓')} Configuration generated to ${tuiManager.prettyFilePath(configPath)}\n`);

  appendResourceRows({
    lines,
    heading: 'Identified resources:',
    rows,
    hasCosts,
    makeBold: tuiManager.makeBold.bind(tuiManager)
  });

  if (hasCosts && costEstimation.costs) {
    const { flatMonthlyCost } = costEstimation.costs;
    lines.push(`\n${color.dim('Estimated total costs:')} ~${formatPrice(flatMonthlyCost || 0)}/mo + pay-per-use costs`);
  }

  if (unresolvedEnvVars > 0) {
    lines.push('');
    lines.push(
      `${color.yellow('▲')} Review the generated configuration and configure environment variables with TODO placeholder.`
    );
  }

  const options = `--projectName ${state.projectName} --stage {stage} --region {region}`;
  lines.push('');
  lines.push(
    tuiManager.makeBold(`Run hybrid-local dev mode ${color.dim('(deploys minimal, free dev stack to AWS)')}:`)
  );
  lines.push(`  ${tuiManager.prettyCommand(`dev ${options}`)}`);
  lines.push(tuiManager.makeBold('Deploy to AWS:'));
  lines.push(`  ${tuiManager.prettyCommand(`deploy ${options}`)}`);

  tuiManager.printBox({ title: 'Configuration', lines });
};

const fetchCostEstimate = async (config: StacktapeConfig): Promise<StackPriceEstimationResponse | null> => {
  try {
    const configYaml = stringify(config);
    const result = await publicApiClient.stackPriceEstimation({ stackConfig: configYaml });
    if (!result.success || !result.costs) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

/**
 * Runs the AI config generation with separate spinner for each phase
 */
const runConfigGenerationWithSteps = async (productionReadiness?: ProductionReadiness) => {
  let currentSpinner: ReturnType<typeof tuiManager.createSpinner> | null = null;
  let currentPhase: string | null = null;
  let totalFilesScanned = 0;
  let selectedFiles = 0;

  // Track details for each phase to show on completion
  const phaseDetails: Record<string, string> = {};

  const onProgress = (info: ConfigGenPhaseInfo) => {
    const phase = info.phase;

    // Track details for contextual info BEFORE stopping spinners
    if (info.details) {
      if (info.details.totalFiles) {
        totalFilesScanned = Math.max(totalFilesScanned, info.details.totalFiles);
        phaseDetails.FILE_SELECTION = `${info.details.totalFiles} files found`;
      }
      if (info.details.filesToRead) {
        selectedFiles = Math.max(selectedFiles, info.details.filesToRead);
        phaseDetails.WAITING_FOR_FILE_CONTENTS = `${info.details.filesToRead} files`;
      }
      // Track deployable units when available (becomes available when transitioning to ADJUSTING_ENV_VARS)
      if (info.details.deployableUnits && info.details.deployableUnits.length > 0) {
        const count = info.details.deployableUnits.length;
        phaseDetails.ANALYZING_DEPLOYMENTS = `${count} ${count === 1 ? 'service' : 'services'} detected`;
      }
    }

    // If phase changed, complete the current spinner and start a new one
    if (phase !== currentPhase) {
      // Complete previous spinner with contextual info if available
      if (currentSpinner && currentPhase) {
        const detail = phaseDetails[currentPhase];
        const stopMessage = detail
          ? `${getPhaseDisplayName(currentPhase)} ${color.dim(`- ${detail}`)}`
          : getPhaseDisplayName(currentPhase);
        currentSpinner.success({ text: stopMessage });
      }

      // Start new spinner for this phase
      currentPhase = phase;
      currentSpinner = tuiManager.createSpinner({ text: getPhaseDisplayName(phase) });
    }

    // Update spinner with progress if available
    if (currentSpinner && info.details?.filesRead && info.details?.filesToRead) {
      currentSpinner.update(`(${info.details.filesRead}/${info.details.filesToRead})`);
    }
  };

  try {
    const result = await configGenManager.generate(onProgress, { productionReadiness });

    // Add contextual info from result for the last phases
    if (result.deployableUnits.length > 0) {
      const count = result.deployableUnits.length;
      phaseDetails.ANALYZING_DEPLOYMENTS = `${count} ${count === 1 ? 'service' : 'services'} detected`;
    }

    // Count env vars from config
    const envVarCount = countEnvVarsInConfig(result.config);
    if (envVarCount > 0) {
      phaseDetails.ADJUSTING_ENV_VARS = `${envVarCount} ${envVarCount === 1 ? 'variable' : 'variables'}`;
    }

    // Complete the last spinner with contextual info
    if (currentSpinner && currentPhase) {
      const detail = phaseDetails[currentPhase];
      const stopMessage = detail
        ? `${getPhaseDisplayName(currentPhase)} ${color.dim(`- ${detail}`)}`
        : getPhaseDisplayName(currentPhase);
      currentSpinner.success({ text: stopMessage });
    }

    return {
      ...result,
      summary: {
        totalFilesScanned,
        selectedFiles,
        envVarCount
      }
    };
  } catch (error) {
    // Error the current spinner if it exists
    if (currentSpinner) {
      currentSpinner.error(`${getPhaseDisplayName(currentPhase!)} failed`);
    }
    throw error;
  }
};

/**
 * Count environment variables in the generated config
 */
const countEnvVarsInConfig = (config: StacktapeConfig): number => {
  let count = 0;
  const resources = config.resources || {};

  for (const resource of Object.values(resources)) {
    const env = (resource as any)?.environment;
    if (env && typeof env === 'object') {
      count += Object.keys(env).length;
    }
  }

  return count;
};

/**
 * Installs the stacktape package as a dev dependency using the detected package manager
 */
const installStacktapePackage = async (cwd: string): Promise<void> => {
  const { packageManager } = await getLockFileData(cwd);

  // Determine install command based on package manager
  let installCommand: string;
  switch (packageManager) {
    case 'bun':
      installCommand = 'bun add -d stacktape';
      break;
    case 'pnpm':
      installCommand = 'pnpm add -D stacktape';
      break;
    case 'yarn':
      installCommand = 'yarn add -D stacktape';
      break;
    case 'npm':
    default:
      installCommand = 'npm install -D stacktape';
      break;
  }

  const spinner = tuiManager.createSpinner({ text: 'Installing stacktape package' });

  try {
    execSync(installCommand, {
      cwd,
      stdio: 'pipe',
      timeout: 120000
    });
    spinner.success({ text: 'Installed stacktape package' });
  } catch {
    spinner.error('Failed to install stacktape package');
    tuiManager.warn(`Run "${installCommand}" manually to enable TypeScript autocompletion.`);
  }
};
