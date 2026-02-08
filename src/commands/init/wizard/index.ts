import { basename, isAbsolute, join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { stringify } from 'yaml';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { getLockFileData } from '@shared/packaging/bundlers/es/utils';
import { publicApiClient, type ProductionReadiness, type StackPriceEstimationResponse } from '@shared/trpc/public';
import { intro, outro, log, spinner as clackSpinner, note as clackNote, S_BAR } from '@clack/prompts';
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
  deployableUnits: any[];
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

  intro(`Initializing project - ${tuiManager.makeBold(projectName)}`);

  log.message('Stacktape will analyze your project and generate a deployment configuration.', {
    withGuide: true,
    symbol: color.cyan('i')
  });

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
      outro('Init cancelled.');
      return;
    }
  }

  // Ask for config format
  const formatChoice = await tuiManager.promptSelect({
    message: 'Config format:',
    options: [
      {
        label: state.configFormat === 'typescript' ? 'TypeScript (Recommended)' : 'TypeScript',
        value: 'typescript',
        description: 'Type-safe with IDE autocompletion'
      },
      {
        label: state.configFormat === 'yaml' ? 'YAML (Recommended)' : 'YAML',
        value: 'yaml',
        description: 'Simple declarative format'
      }
    ],
    defaultValue: state.configFormat
  });
  state.configFormat = formatChoice as ConfigFormat;

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
  } catch (error) {
    log.error(`Config generation failed: ${error instanceof Error ? error.message : error}`);
    return;
  }

  // Estimate costs, write config, then display everything in one box
  const costEstimation = await fetchCostEstimate(state.config!);

  state.configPath = await configGenManager.writeConfig(state.config!, state.configFormat);
  const relativeConfigPath = relative(process.cwd(), state.configPath) || state.configPath;

  console.info(color.gray(S_BAR));
  displayResult(state, costEstimation, relativeConfigPath);
};

const displayResult = (state: WizardState, costEstimation: StackPriceEstimationResponse | null, configPath: string) => {
  const costBreakdown = costEstimation?.costs?.resourcesBreakdown || {};
  const hasCosts = costEstimation?.costs != null;
  const configResources = state.config?.resources || {};

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

  lines.push(`${color.green('✓')} Configuration successfully generated to ${tuiManager.prettyFilePath(configPath)}\n`);

  // Resource table
  if (rows.length) {
    lines.push(tuiManager.makeBold('Identified resources:'));
    const nameWidth = Math.max(...rows.map((r) => stripAnsi(r.name).length));
    const typeWidth = Math.max(...rows.map((r) => stripAnsi(r.type).length));
    for (const row of rows) {
      const namePad = ' '.repeat(Math.max(0, nameWidth - stripAnsi(row.name).length));
      const typePad = ' '.repeat(Math.max(0, typeWidth - stripAnsi(row.type).length));
      const line = hasCosts
        ? `  ${tuiManager.makeBold(row.name)}${namePad}  ${row.type}${typePad}  ${row.cost}`
        : `  ${tuiManager.makeBold(row.name)}${namePad}  ${row.type}`;
      lines.push(line);
    }
  }

  // Total cost
  if (hasCosts && costEstimation.costs) {
    const { flatMonthlyCost } = costEstimation.costs;
    lines.push(`\n${color.dim('Estimated total costs:')} ~${formatPrice(flatMonthlyCost || 0)}/mo + pay-per-use costs`);
  }

  const options = `--projectName ${tuiManager.prettyOption(state.projectName)} --stage ${tuiManager.prettyOption('{stage}')} --region ${tuiManager.prettyOption('{region}')}`;
  // Next steps
  lines.push('');
  lines.push(tuiManager.makeBold(`Run local dev mode ${color.dim('(optional)')}:`));
  lines.push(`  ${tuiManager.prettyCommand('dev')} ${options}`);
  lines.push(tuiManager.makeBold('Deploy to AWS:'));
  lines.push(`  ${tuiManager.prettyCommand('deploy')} ${options}`);

  clackNote(lines.join('\n'), 'Configuration', { format: (line: string) => line });
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

const formatPrice = (price: number): string => {
  if (price < 0.01) return color.green('<$0.01');
  if (price < 1) return color.green(`$${price.toFixed(2)}`);
  return color.yellow(`$${price.toFixed(2)}`);
};

// Braille spinner frames (same as tuiManager MultiSpinner)
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Spinner options with cyan color
const SPINNER_OPTIONS = { frames: SPINNER_FRAMES, delay: 80, styleFrame: (frame: string) => color.cyan(frame) };

/**
 * Runs the AI config generation with separate spinner for each phase
 */
const runConfigGenerationWithSteps = async (productionReadiness?: ProductionReadiness) => {
  let currentSpinner: ReturnType<typeof clackSpinner> | null = null;
  let currentPhase: string | null = null;

  // Track details for each phase to show on completion
  const phaseDetails: Record<string, string> = {};

  const onProgress = (info: ConfigGenPhaseInfo) => {
    const phase = info.phase;

    // Track details for contextual info BEFORE stopping spinners
    if (info.details) {
      if (info.details.totalFiles) {
        phaseDetails.FILE_SELECTION = `${info.details.totalFiles} files found`;
      }
      if (info.details.filesToRead) {
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
        currentSpinner.stop(stopMessage);
      }

      // Start new spinner for this phase
      currentPhase = phase;
      currentSpinner = clackSpinner(SPINNER_OPTIONS);
      currentSpinner.start(getPhaseDisplayName(phase));
    }

    // Update spinner with progress if available
    if (currentSpinner && info.details?.filesRead && info.details?.filesToRead) {
      currentSpinner.message(`${getPhaseDisplayName(phase)} (${info.details.filesRead}/${info.details.filesToRead})`);
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
      currentSpinner.stop(stopMessage);
    }

    return result;
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

const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
};

const getResourceCostLabel = (costInfo?: { priceInfo: { totalMonthlyFlat: number; costBreakdown: any[] } }): string => {
  if (!costInfo) return color.dim('-');
  const monthly = costInfo.priceInfo.totalMonthlyFlat;
  if (monthly > 0) return `~${formatPrice(monthly)}/mo`;
  const hasPayPerUse = costInfo.priceInfo.costBreakdown.some((item: any) => item.priceModel === 'pay-per-use');
  if (hasPayPerUse) return color.dim('pay-per-use');
  return color.dim('-');
};

const formatResourceType = (type: string, resource: any): string => {
  if (type === 'relational-database') {
    const engineType = resource?.properties?.engine?.type;
    if (engineType?.includes('postgres')) return 'Relational database (Postgres)';
    if (engineType?.includes('mysql')) return 'Relational database (MySQL)';
    return 'Relational database';
  }

  if (type === 'hosting-bucket') {
    const contentType = resource?.properties?.hostingContentType;
    if (contentType === 'single-page-app') return 'Hosting bucket (SPA)';
    if (contentType === 'gatsby-static-website') return 'Hosting bucket (Gatsby)';
    if (contentType === 'static-website') return 'Hosting bucket (Static)';
    return 'Hosting bucket';
  }

  const typeLabels: Record<string, string> = {
    'web-service': 'Web service',
    'worker-service': 'Worker service',
    function: 'Function',
    'nextjs-web': 'Next.js web',
    'astro-web': 'Astro web',
    'nuxt-web': 'Nuxt web',
    'sveltekit-web': 'SvelteKit web',
    'solidstart-web': 'SolidStart web',
    'tanstack-web': 'TanStack web',
    'remix-web': 'Remix web',
    'redis-cluster': 'Redis cluster',
    'dynamo-db-table': 'DynamoDB table',
    'mongo-db-atlas-cluster': 'MongoDB Atlas cluster',
    'open-search-domain': 'OpenSearch domain',
    bucket: 'S3 bucket',
    'sqs-queue': 'SQS queue',
    'sns-topic': 'SNS topic',
    bastion: 'Bastion',
    'web-app-firewall': 'Web application firewall'
  };

  return typeLabels[type] || type;
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

  const spinner = clackSpinner(SPINNER_OPTIONS);
  spinner.start('Installing stacktape package');

  try {
    execSync(installCommand, {
      cwd,
      stdio: 'pipe',
      timeout: 120000
    });
    spinner.stop('Installed stacktape package');
  } catch {
    spinner.error('Failed to install stacktape package');
    log.warn(`Run "${installCommand}" manually to enable TypeScript autocompletion.`);
  }
};
