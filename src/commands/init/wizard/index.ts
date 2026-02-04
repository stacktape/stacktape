import { basename, isAbsolute, join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { stringify } from 'yaml';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { getLockFileData } from '@shared/packaging/bundlers/es/utils';
import { publicApiClient, type StackPriceEstimationResponse } from '@shared/trpc/public';
import { intro, outro, log, spinner as clackSpinner } from '@clack/prompts';
import color from 'picocolors';
import { detectGitInfo, type GitInfo } from '../utils/git-detection';
import { detectConfigFormat, type ConfigFormat } from '../utils/config-format-detection';

export type WizardState = {
  // Project info
  cwd: string;
  projectName: string;
  configFormat: ConfigFormat;
  gitInfo: GitInfo;

  // Generated config
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

  // Initialize wizard state
  const state: WizardState = {
    cwd,
    projectName,
    configFormat: 'typescript',
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

  // Install stacktape package for TypeScript config
  if (state.configFormat === 'typescript') {
    await installStacktapePackage(cwd);
  }

  // Run AI config generation with per-phase spinners
  try {
    const result = await runConfigGenerationWithSteps();
    state.config = result.config;
    state.deployableUnits = result.deployableUnits;
    state.requiredResources = result.requiredResources;
  } catch (error) {
    log.error(`Config generation failed: ${error instanceof Error ? error.message : error}`);
    return;
  }

  // Write the config file
  state.configPath = await configGenManager.writeConfig(state.config!, state.configFormat);
  // Path should be relative to where the CLI is running from (process.cwd()), not the project directory
  const relativeConfigPath = relative(process.cwd(), state.configPath) || state.configPath;

  // Show success message and detected resources
  displayConfigGenerationResult(state, relativeConfigPath);

  // Show next steps
  displayNextSteps(state);

  // Show cost estimate
  await displayCostEstimate(state.config!);

  outro('Configuration generated successfully!');
};

/**
 * Display next steps after config generation
 */
const displayNextSteps = (_state: WizardState) => {
  const lines: string[] = [];
  lines.push(tuiManager.makeBold('Next steps:'));
  lines.push(`  1. Review the generated configuration`);
  lines.push(
    `  2. To deploy, run ${tuiManager.prettyCommand('deploy')} --projectName ${_state.projectName} --stage {stage} --region {region}`
  );
  lines.push('');
  lines.push(color.dim('Stacktape will guide you through AWS setup on first deploy.'));

  log.message(lines.join('\n'), { withGuide: true });
};

/**
 * Display cost estimate for the generated configuration
 */
const displayCostEstimate = async (config: StacktapeConfig): Promise<void> => {
  const spinner = clackSpinner(SPINNER_OPTIONS);
  spinner.start('Estimating monthly costs');

  try {
    const configYaml = stringify(config);
    const result = await publicApiClient.stackPriceEstimation({ stackConfig: configYaml });

    if (!result.success || !result.costs) {
      spinner.stop(color.dim('Cost estimation unavailable'));
      return;
    }

    spinner.stop('Cost estimate');
    displayCostBreakdown(result);
  } catch {
    spinner.stop(color.dim('Cost estimation unavailable'));
  }
};

/**
 * Display formatted cost breakdown
 */
const displayCostBreakdown = (result: StackPriceEstimationResponse): void => {
  if (!result.costs) return;

  const { flatMonthlyCost, resourcesBreakdown } = result.costs;
  const lines: string[] = [];

  // Display per-resource breakdown
  const resourceEntries = Object.entries(resourcesBreakdown);
  if (resourceEntries.length > 0) {
    for (const [resourceName, info] of resourceEntries) {
      const monthlyPrice = info.priceInfo.totalMonthlyFlat;
      if (monthlyPrice > 0) {
        lines.push(
          `  ${tuiManager.colorize('cyan', '•')} ${tuiManager.makeBold(resourceName)}: ${formatPrice(monthlyPrice)}/mo`
        );
      } else {
        // Pay-per-use resources
        const payPerUseItems = info.priceInfo.costBreakdown.filter((item) => item.priceModel === 'pay-per-use');
        if (payPerUseItems.length > 0) {
          lines.push(
            `  ${tuiManager.colorize('cyan', '•')} ${tuiManager.makeBold(resourceName)}: ${color.dim('pay-per-use')}`
          );
        }
      }
    }
  }

  // Display total
  if (lines.length > 0) {
    lines.push('');
  }

  if (flatMonthlyCost > 0) {
    lines.push(`  ${tuiManager.makeBold('Total fixed costs:')} ~${formatPrice(flatMonthlyCost)}/mo`);
  } else {
    lines.push(
      `  ${tuiManager.makeBold('Total fixed costs:')} ${color.green('$0')} ${color.dim('(pay-per-use only)')}`
    );
  }

  lines.push(color.dim('  Actual costs depend on usage. See AWS pricing docs for details.'));

  log.message(lines.join('\n'), { withGuide: true });
};

/**
 * Format price for display
 */
const formatPrice = (price: number): string => {
  if (price < 0.01) {
    return color.green('<$0.01');
  }
  if (price < 1) {
    return color.green(`$${price.toFixed(2)}`);
  }
  return color.yellow(`$${price.toFixed(2)}`);
};

// Braille spinner frames (same as tuiManager MultiSpinner)
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Spinner options with cyan color
const SPINNER_OPTIONS = { frames: SPINNER_FRAMES, delay: 80, styleFrame: (frame: string) => color.cyan(frame) };

/**
 * Runs the AI config generation with separate spinner for each phase
 */
const runConfigGenerationWithSteps = async () => {
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
    const result = await configGenManager.generate(onProgress);

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

/**
 * Displays the success message and detected resources (deployable units and infrastructure)
 */
const displayConfigGenerationResult = (state: WizardState, configPath: string) => {
  // Success message (using process.stdout.write to ensure proper output after spinner)
  process.stdout.write(
    `${color.gray('│')}\n${color.green('◆')}  Generated configuration to ${tuiManager.prettyFilePath(configPath)}\n`
  );

  const lines: string[] = [];

  // Show identified deployable units
  if (state.deployableUnits.length > 0) {
    lines.push(tuiManager.makeBold('Identified:'));
    for (const unit of state.deployableUnits) {
      const typeLabel = formatDeployableType(unit.type);
      lines.push(`  ${tuiManager.colorize('cyan', '•')} ${tuiManager.makeBold(unit.name)} - ${typeLabel}`);
    }
  }

  // Show infrastructure resources with names from config
  if (state.requiredResources.length > 0 && state.config?.resources) {
    if (lines.length > 0) lines.push('');
    lines.push(tuiManager.makeBold('Infrastructure:'));

    const resources = state.config.resources;
    for (const requiredResource of state.requiredResources) {
      // Find the resource in config that matches this type
      const resourceEntry = Object.entries(resources).find(([, resource]) => {
        const resourceType = (resource as any)?.type;
        return matchesResourceType(resourceType, requiredResource.type);
      });

      if (resourceEntry) {
        const [resourceName, resource] = resourceEntry;
        const friendlyType = formatInfrastructureType((resource as any)?.type, resource, requiredResource.type);
        lines.push(`  ${tuiManager.colorize('cyan', '•')} ${tuiManager.makeBold(resourceName)} - ${friendlyType}`);
      } else {
        // Fallback if not found in config
        lines.push(`  ${tuiManager.colorize('cyan', '•')} ${requiredResource.type}`);
      }
    }
  }

  if (lines.length > 0) {
    log.message(lines.join('\n'), { withGuide: true });
  }
};

const formatDeployableType = (type: string): string => {
  const labels: Record<string, string> = {
    'static-frontend': 'Static frontend',
    'frontend-requiring-build': 'Frontend (requires build)',
    'web-service': 'Web service',
    'worker-service': 'Worker service',
    'lambda-function': 'Lambda function',
    'next-js-app': 'Next.js application'
  };
  return labels[type] || type;
};

/**
 * Checks if a Stacktape resource type matches a required resource type
 */
const matchesResourceType = (stacktapeType: string, requiredType: string): boolean => {
  const typeMapping: Record<string, string[]> = {
    Postgres: ['relational-database'],
    MySQL: ['relational-database'],
    Redis: ['redis-cluster'],
    DynamoDB: ['dynamo-db-table'],
    MongoDB: ['mongo-db-atlas-cluster'],
    Elasticsearch: ['search-cluster'],
    OpenSearch: ['search-cluster'],
    S3: ['bucket']
  };
  const matchingStacktapeTypes = typeMapping[requiredType] || [];
  return matchingStacktapeTypes.includes(stacktapeType);
};

/**
 * Formats infrastructure resource type with engine info if available
 */
const formatInfrastructureType = (type: string, resource: any, requiredResourceType: string): string => {
  if (type === 'relational-database') {
    const engine = resource?.engine;
    // Try to get engine type from the engine object
    const engineType = engine?.type;
    if (engineType) {
      if (engineType === 'postgres') {
        return `Relational database (Postgres)`;
      }
      if (engineType === 'mysql') {
        return `Relational database (MySQL)`;
      }
      if (engineType === 'aurora-postgresql' || engineType === 'aurora-postgresql-serverless') {
        return `Relational database (Aurora PostgreSQL)`;
      }
      if (engineType === 'aurora-mysql' || engineType === 'aurora-mysql-serverless') {
        return `Relational database (Aurora MySQL)`;
      }
    }
    // Fallback to requiredResourceType if engine type not available
    if (requiredResourceType === 'Postgres') {
      return `Relational database (Postgres)`;
    }
    if (requiredResourceType === 'MySQL') {
      return `Relational database (MySQL)`;
    }
    return 'Relational database';
  }

  const typeLabels: Record<string, string> = {
    'redis-cluster': 'Redis cluster',
    'dynamo-db-table': 'DynamoDB table',
    'mongo-db-atlas-cluster': 'MongoDB Atlas cluster',
    'search-cluster': 'Search cluster (OpenSearch)',
    bucket: 'S3 bucket'
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
