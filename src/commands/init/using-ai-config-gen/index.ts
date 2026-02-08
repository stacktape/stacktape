import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configGenManager, getPhaseDisplayName, type ConfigGenPhaseInfo } from '@utils/config-gen';
import { publicApiClient, type ProductionReadiness, type StackPriceEstimationResponse } from '@shared/trpc/public';
import { stringify } from 'yaml';
import { basename, relative, join, isAbsolute } from 'node:path';
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

const formatPrice = (price: number): string => {
  if (price < 0.01) return color.green('<$0.01');
  if (price < 1) return color.green(`$${price.toFixed(2)}`);
  return color.yellow(`$${price.toFixed(2)}`);
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

const getResourceCostLabel = (costInfo?: { priceInfo: { totalMonthlyFlat: number; costBreakdown: any[] } }): string => {
  if (!costInfo) return color.dim('-');
  const monthly = costInfo.priceInfo.totalMonthlyFlat;
  if (monthly > 0) return `~${formatPrice(monthly)}/mo`;
  const hasPayPerUse = costInfo.priceInfo.costBreakdown.some((item: any) => item.priceModel === 'pay-per-use');
  if (hasPayPerUse) return color.dim('pay-per-use');
  return color.dim('-');
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

  tuiManager.info(`Generating Stacktape configuration for ${tuiManager.makeBold(projectName)}...`);
  tuiManager.info('');

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
      console.info(`${tuiManager.colorize('cyan', '›')} ${tuiState.phase}: ${tuiState.message}${detail}`);
    } else if (!isTTY) {
      console.info(`  ${info.message}`);
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
      console.info(tuiManager.colorize('green', '✓ Configuration generated'));
    }

    // Estimate costs before showing results
    let costEstimation: StackPriceEstimationResponse | null = null;
    try {
      if (isTTY) console.info(`${tuiManager.colorize('cyan', '›')} Estimating monthly costs...`);
      const configYaml = stringify(result.config);
      const costResult = await publicApiClient.stackPriceEstimation({ stackConfig: configYaml });
      if (costResult.success && costResult.costs) {
        costEstimation = costResult;
      }
      if (isTTY) console.info(tuiManager.colorize('green', '✓ Cost estimation complete'));
    } catch {
      if (isTTY) console.info(color.dim('  Cost estimation unavailable'));
    }

    // Determine config format
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

    const outputPath = await configGenManager.writeConfig(result.config, format);
    const relativePath = relative(cwd, outputPath);

    // Show unified resources table with costs
    tuiManager.info('');
    const costBreakdown = costEstimation?.costs?.resourcesBreakdown || {};
    const hasCosts = costEstimation?.costs != null;
    const configResources = result.config.resources || {};

    type ResourceRow = { name: string; type: string; cost: string };
    const rows: ResourceRow[] = [];

    for (const [resourceName, resource] of Object.entries(configResources)) {
      const resourceType = (resource as any)?.type as string | undefined;
      if (!resourceType) continue;
      const friendlyType = formatResourceType(resourceType, resource);
      const costInfo = costBreakdown[resourceName];
      rows.push({ name: resourceName, type: friendlyType, cost: getResourceCostLabel(costInfo) });
    }

    if (rows.length > 0) {
      const header = hasCosts
        ? [tuiManager.makeBold('Resource'), tuiManager.makeBold('Type'), tuiManager.makeBold('Est. Cost')]
        : [tuiManager.makeBold('Resource'), tuiManager.makeBold('Type')];
      const tableRows = rows.map((r) =>
        hasCosts ? [tuiManager.makeBold(r.name), r.type, r.cost] : [tuiManager.makeBold(r.name), r.type]
      );

      tuiManager.printTable({ header, rows: tableRows });

      if (hasCosts && costEstimation!.costs) {
        const { flatMonthlyCost } = costEstimation!.costs;
        if (flatMonthlyCost > 0) {
          tuiManager.info(`${tuiManager.makeBold('Estimated total:')} ~${formatPrice(flatMonthlyCost)}/mo`);
        } else {
          tuiManager.info(
            `${tuiManager.makeBold('Estimated total:')} ${color.green('$0')} ${color.dim('(pay-per-use only)')}`
          );
        }
        tuiManager.info(color.dim('Actual costs depend on usage.'));
      }
    }

    tuiManager.info('');
    tuiManager.success(`Configuration written to ${tuiManager.prettyFilePath(relativePath)}`);
    tuiManager.info(`
Next steps:
  1. Review the generated configuration
  2. Run ${tuiManager.prettyCommand('deploy --stage dev --region us-east-1')} to deploy
`);
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
