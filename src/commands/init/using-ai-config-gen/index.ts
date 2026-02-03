import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { basename, relative, join, isAbsolute } from 'node:path';

// ============ Types ============

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
  /** Pre-selected config format (skips format prompt) */
  configFormat?: 'yaml' | 'typescript';
};

// ============ Main Function ============

export const initUsingAiConfigGen = async (options: InitUsingAiConfigGenOptions = {}): Promise<void> => {
  // Determine working directory from --projectDirectory arg or use current directory
  const projectDirectory = globalStateManager.args.projectDirectory;
  const cwd = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();

  // Set the working directory for the config generator
  configGenManager.setWorkingDirectory(cwd);

  const projectName = basename(cwd);

  tuiManager.info(`Generating Stacktape configuration for ${tuiManager.makeBold(projectName)}...`);
  tuiManager.info('');

  // Check if config already exists (only prompt if in interactive mode)
  const existingConfig = await configGenManager.configFileExists();
  if (existingConfig.exists) {
    const relativePath = relative(cwd, existingConfig.path!);

    // If configFormat is pre-specified via CLI, we're in non-interactive mode - auto-overwrite
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

  // Initialize TUI state
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

  // Progress callback
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
      console.info(`${tuiManager.colorize('cyan', '›')} ${tuiState.phase}: ${tuiState.message}${detail}`);
    } else if (!isTTY) {
      console.info(`  ${info.message}`);
    }

    if (phaseChanged) lastPhase = tuiState.phase;
    if (filesChanged) lastFilesRead = tuiState.filesRead;
  };

  try {
    // Run config generation
    const result = await configGenManager.generate(onProgress);

    // Update TUI to show completion
    tuiState = { ...tuiState, completed: true, success: true };
    if (isTTY) {
      console.info(tuiManager.colorize('green', '✓ Configuration generated'));
    }

    // Show what was detected
    tuiManager.info('');
    tuiManager.success('Analysis complete!');
    tuiManager.info('');

    if (result.deployableUnits.length > 0) {
      tuiManager.info('Detected deployable units:');
      for (const unit of result.deployableUnits) {
        tuiManager.info(`  ${tuiManager.colorize('cyan', '\u2022')} ${tuiManager.makeBold(unit.name)} (${unit.type})`);
        if (unit.reason) {
          tuiManager.info(`    ${tuiManager.colorize('gray', unit.reason)}`);
        }
      }
      tuiManager.info('');
    }

    if (result.requiredResources.length > 0) {
      tuiManager.info('Detected infrastructure:');
      for (const resource of result.requiredResources) {
        tuiManager.info(`  ${tuiManager.colorize('cyan', '\u2022')} ${tuiManager.makeBold(resource.type)}`);
      }
      tuiManager.info('');
    }

    // Determine config format (use pre-specified or prompt)
    let format: 'yaml' | 'typescript';
    if (options.configFormat) {
      format = options.configFormat;
      tuiManager.info(`Using ${format === 'typescript' ? 'TypeScript' : 'YAML'} format (from --configFormat)`);
    } else {
      format = (await tuiManager.promptSelect({
        message: 'Choose config format:',
        options: [
          {
            label: 'TypeScript (stacktape.ts)',
            description: 'Type-safe configuration with IDE autocompletion',
            value: 'typescript'
          },
          {
            label: 'YAML (stacktape.yml)',
            description: 'Simple, declarative configuration',
            value: 'yaml'
          }
        ]
      })) as 'yaml' | 'typescript';
    }

    // Write the config file
    const outputPath = await configGenManager.writeConfig(result.config, format);

    const relativePath = relative(cwd, outputPath);
    tuiManager.info('');
    tuiManager.success(`Configuration written to ${tuiManager.prettyFilePath(relativePath)}`);
    tuiManager.info('');
    tuiManager.hint(`Next steps:`);
    tuiManager.info(`  1. Review the generated configuration`);
    tuiManager.info(`  2. Run ${tuiManager.prettyCommand('deploy --stage dev --region us-east-1')} to deploy`);
    tuiManager.info('');
  } catch (error) {
    // Update TUI to show error
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
