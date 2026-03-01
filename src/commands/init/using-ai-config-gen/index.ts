import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { publicApiClient, type ProductionReadiness, type StackPriceEstimationResponse } from '@shared/trpc/public';
import { stringify } from 'yaml';
import { basename, relative, join, isAbsolute } from 'node:path';
import {
  appendResourceRows,
  countUnsetEnvVarsInConfig,
  formatPrice,
  formatResourceType,
  getResourceCostLabel,
  summarizeDeployableUnits
} from '../utils/output-formatting';
import { printInitPreflight, promptConfigFormat } from '../utils/ui';
import color from 'picocolors';

type TuiState = {
  phase: string;
  message: string;
  totalFiles: number;
  selectedFiles: string[];
  filesRead: number;
  filesToRead: number;
  error: string | null;
  completed: boolean;
  success: boolean;
};

type InitUsingAiConfigGenOptions = {
  configFormat?: 'yaml' | 'typescript';
  infrastructureType?: ProductionReadiness;
};

export const initUsingAiConfigGen = async (options: InitUsingAiConfigGenOptions = {}): Promise<void> => {
  const projectDirectory = globalStateManager.args.projectDirectory;
  const cwd = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();

  configGenManager.setWorkingDirectory(cwd);

  const projectName = basename(cwd);

  printInitPreflight({ projectName, mode: 'ai-analysis' });

  // Check if config already exists
  const existingConfig = await configGenManager.configFileExists();
  if (existingConfig.exists) {
    const relativePath = relative(cwd, existingConfig.path!);

    if (!options.configFormat) {
      const shouldOverwrite = await tuiManager.promptConfirm({
        message: `A config file already exists at ${tuiManager.prettyFilePath(relativePath)}. Overwrite?`,
        defaultValue: false
      });

      if (!shouldOverwrite) {
        tuiManager.info('Config generation cancelled.');
        return;
      }
    } else {
      tuiManager.info(`Overwriting existing config at ${tuiManager.prettyFilePath(relativePath)}...`);
    }
  }

  let tuiState: TuiState = {
    phase: 'Starting...',
    message: 'Initializing...',
    totalFiles: 0,
    selectedFiles: [],
    filesRead: 0,
    filesToRead: 0,
    error: null,
    completed: false,
    success: false
  };

  const isTTY = process.stdout.isTTY;
  let lastPhase = tuiState.phase;
  let lastFilesRead = tuiState.filesRead;

  const onProgress = (info: ConfigGenPhaseInfo) => {
    tuiState = {
      ...tuiState,
      phase: getPhaseDisplayName(info.phase),
      message: info.message,
      totalFiles: info.details?.totalFiles ?? tuiState.totalFiles,
      selectedFiles: info.details?.selectedFiles ?? tuiState.selectedFiles,
      filesRead: info.details?.filesRead ?? tuiState.filesRead,
      filesToRead: info.details?.filesToRead ?? tuiState.filesToRead
    };

    const phaseChanged = tuiState.phase !== lastPhase;
    const filesChanged = tuiState.filesRead !== lastFilesRead && tuiState.filesToRead > 0;

    if (isTTY && (phaseChanged || filesChanged)) {
      const detail = filesChanged && tuiState.filesToRead > 0 ? ` (${tuiState.filesRead}/${tuiState.filesToRead})` : '';
      tuiManager.info(`${tuiManager.colorize('cyan', '›')} ${tuiState.phase}: ${tuiState.message}${detail}`);
    } else if (!isTTY) {
      tuiManager.info(`  ${info.message}`);
    }

    if (phaseChanged) lastPhase = tuiState.phase;
    if (filesChanged) lastFilesRead = tuiState.filesRead;
  };

  try {
    const result = await configGenManager.generate(onProgress, {
      productionReadiness: options.infrastructureType
    });

    tuiState = { ...tuiState, completed: true, success: true };
    if (isTTY) {
      tuiManager.info(tuiManager.colorize('green', '✓ Configuration generated'));
    }

    // Estimate costs before showing results
    let costEstimation: StackPriceEstimationResponse | null = null;
    try {
      if (isTTY) tuiManager.info(`${tuiManager.colorize('cyan', '›')} Estimating monthly costs...`);
      const configYaml = stringify(result.config);
      const costResult = await publicApiClient.stackPriceEstimation({ stackConfig: configYaml });
      if (costResult.success && costResult.costs) {
        costEstimation = costResult;
      }
      if (isTTY) tuiManager.info(tuiManager.colorize('green', '✓ Cost estimation complete'));
    } catch {
      if (isTTY) tuiManager.info(color.dim('  Cost estimation unavailable'));
    }

    // Determine config format
    let format: 'yaml' | 'typescript';
    if (options.configFormat) {
      format = options.configFormat;
      tuiManager.info(`Using ${format === 'typescript' ? 'TypeScript' : 'YAML'} format (from --configFormat)`);
    } else {
      format = await promptConfigFormat({ message: 'Config format:' });
    }

    const outputPath = await configGenManager.writeConfig(result.config, format);
    const relativePath = relative(cwd, outputPath);

    const analyzedFilesSummary =
      tuiState.filesToRead > 0
        ? `${tuiState.filesToRead} selected files${
            tuiState.totalFiles > 0 ? ` (from ${tuiState.totalFiles} scanned)` : ''
          }`
        : 'selected files';
    tuiManager.info(`${color.dim('Analyzed')} ${tuiManager.makeBold(analyzedFilesSummary)}`);

    const costBreakdown = costEstimation?.costs?.resourcesBreakdown || {};
    const hasCosts = costEstimation?.costs != null;
    const configResources = result.config.resources || {};
    const architectureSummary = summarizeDeployableUnits(result.deployableUnits || []);
    const unresolvedEnvVars = countUnsetEnvVarsInConfig(result.config);

    type ResourceRow = { name: string; type: string; cost: string };
    const rows: ResourceRow[] = [];

    for (const [resourceName, resource] of Object.entries(configResources)) {
      const resourceType = (resource as any)?.type as string | undefined;
      if (!resourceType) continue;
      const friendlyType = formatResourceType(resourceType, resource);
      const costInfo = costBreakdown[resourceName];
      rows.push({ name: resourceName, type: friendlyType, cost: getResourceCostLabel(costInfo) });
    }

    const lines: string[] = [];
    lines.push(`${color.green('✓')} Configuration generated at ${tuiManager.prettyFilePath(relativePath)}\n`);

    if (architectureSummary.length > 0) {
      lines.push(tuiManager.makeBold('Detected architecture:'));
      lines.push(`  ${architectureSummary.join(color.dim(' + '))}`);
      lines.push('');
    }

    appendResourceRows({
      lines,
      heading: 'Identified resources:',
      rows,
      hasCosts,
      makeBold: tuiManager.makeBold.bind(tuiManager)
    });

    if (hasCosts && costEstimation?.costs) {
      lines.push(
        `\n${color.dim('Estimated total costs:')} ~${formatPrice(costEstimation.costs.flatMonthlyCost || 0)}/mo + pay-per-use costs`
      );
    }

    if (unresolvedEnvVars > 0) {
      lines.push('');
      lines.push(
        `${color.yellow('▲')} Review the generated configuration and configure environment variables with TODO placeholder.`
      );
    }

    lines.push('');
    lines.push(tuiManager.makeBold('Next steps:'));
    lines.push(`  ${tuiManager.prettyCommand(`dev --projectName ${projectName} --stage {stage} --region {region}`)}`);
    lines.push(
      `  ${tuiManager.prettyCommand(`deploy --projectName ${projectName} --stage {stage} --region {region}`)}`
    );

    tuiManager.printBox({ title: 'Configuration', lines });
  } catch (error) {
    tuiState = {
      ...tuiState,
      completed: true,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    tuiManager.info('');
    throw error;
  }
};
