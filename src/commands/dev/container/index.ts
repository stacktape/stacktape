import type { Spinner } from '@application-services/tui-manager';
import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { ExecaReturnBase } from 'execa';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { renderErrorToString } from '@application-services/tui-manager/components/Error';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { stpErrors } from '@errors';
import { getJobName, getLocalInvokeContainerName } from '@shared/naming/utils';
import { dockerRun } from '@shared/utils/docker';
import { isJson } from '@shared/utils/misc';
import { parseContainerError } from '@utils/errors';
import { addCallerToAssumeRolePolicy } from 'src/commands/_utils/assume-role';
import { initializeStackServicesForDevPhase2 } from 'src/commands/_utils/initialization';
import {
  getBastionTunnelsForResource,
  getDeployedBastionStpName,
  getWorkloadEnvironmentVars,
  gracefullyStopContainer,
  hookToRestartStdinInput,
  resolveRunningContainersWithSamePort,
  SourceCodeWatcher
} from '../utils';

export const runDevContainer = async (): Promise<DevReturnValue> => {
  const { resourceName, container, stage, region, disableEmulation, watch } = globalStateManager.args;
  const resource = configManager.allContainerWorkloads.find(
    (r) => r.nameChain[0] === resourceName
  ) as StpContainerWorkload;

  if (!container && resource.containers.length > 1) {
    throw stpErrors.e53({ availableContainers: resource.containers.map((c) => c.name) });
  }
  const containerDef = container ? resource.containers.find((c) => c.name === container) : resource.containers[0];
  const containerName = container || resource.containers[0].name;
  if (!containerDef) {
    throw stpErrors.e2({ container, resourceName });
  }

  const jobName = getJobName({
    workloadName: resourceName,
    workloadType: resource.configParentResourceType,
    containerName
  });

  const containerDefinition = configManager.allContainerWorkloadContainers.find((job) => job.jobName === jobName);

  // Run packaging and AWS metadata loading in parallel with multi-spinner
  const multiSpinner = tuiManager.createMultiSpinner();
  const awsSpinner = multiSpinner.add('aws', 'Loading metadata from AWS');
  const packagingSpinner = multiSpinner.add('packaging', 'Packaging container');

  const [imageResult] = await Promise.all([
    prepareImage(containerDefinition, { spinner: packagingSpinner }),
    initializeStackServicesForDevPhase2().then(() => awsSpinner.success())
  ]);
  packagingSpinner.success({ details: imageResult.details });
  const { imageName, sourceFiles, distFolderPath } = imageResult;

  // After phase 2 completes, validate stack exists (unless emulation disabled)
  if (!stackManager.existingStackDetails && !disableEmulation) {
    throw stpErrors.e3({ region, stage });
  }

  // Validate deployed resource matches config
  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!deployedStpResource || deployedStpResource.resourceType !== resource.type) {
    throw stpErrors.e6({
      resourceName,
      resourceType: resource.type,
      stackName: globalStateManager.targetStack.stackName
    });
  }

  const bastionStpName = getDeployedBastionStpName();
  let tunnels: SsmPortForwardingTunnel[] = [];

  // if we have a bastion, we will attempt to create tunnels to the resource which are part of the connectTo
  if (bastionStpName) {
    tunnels = await getBastionTunnelsForResource({
      resource,
      bastionStpName
    });
    applicationManager.registerCleanUpHook(async () => Promise.all(tunnels.map((tunnel) => tunnel.kill())));
  }

  // Now we can get the IAM role (requires deployedStackOverviewManager from phase 2)
  await addCallerToAssumeRolePolicy({
    roleName: deployedStackOverviewManager.getIamRoleNameOfDeployedResource(containerDefinition.workloadName)
  });

  const packagingType = containerDefinition.packaging?.type;
  const entryfilePath = (containerDefinition.packaging?.properties as { entryfilePath?: string })?.entryfilePath;
  const languageSpecificConfig = (
    containerDefinition.packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig }
  )?.languageSpecificConfig;
  const nodeVersion = languageSpecificConfig?.nodeVersion || DEFAULT_CONTAINER_NODE_VERSION;

  const environment = await getWorkloadEnvironmentVars({
    jobEnvironment: containerDefinition.environment,
    jobName,
    workloadName: containerDefinition.workloadName,
    connectTo: resource.connectTo,
    workloadType: 'multi-container-workload',
    tunnels,
    packagingType,
    entryfilePath,
    nodeVersion
  });

  // Store distFolderPath for volume mounting - will be updated on rebuilds
  let currentDistFolderPath = distFolderPath;

  const run = async () => {
    await runDockerContainer(
      {
        ...containerDefinition,
        imageName,
        environment,
        userDefinedContainerName: containerName,
        distFolderPath: currentDistFolderPath
      },
      run
    );
  };

  if (watch) {
    const sourceCodeWatcher = new SourceCodeWatcher();
    sourceCodeWatcher.watch({
      filesToWatch: sourceFiles,
      onChangeFn: async ({ changedFile }) => {
        sourceCodeWatcher.unwatchAllFiles();
        tuiManager.info(
          `File changed: ${tuiManager.prettyFilePath(changedFile)}. Rebuilding and restarting container...`
        );
        const newImage = await prepareImage(containerDefinition);
        currentDistFolderPath = newImage.distFolderPath;
        sourceCodeWatcher.addFilesToWatch(newImage.sourceFiles);
        await run();
      }
    });
    await run();
  } else {
    hookToRestartContainer(containerDefinition, run, (newDistFolderPath) => {
      currentDistFolderPath = newDistFolderPath;
    });
    await run();
  }
};

const hookToRestartContainer = (
  containerDefinition: Omit<EnrichedCwContainerProps, 'environment'>,
  run: AnyFunction,
  onDistFolderPathUpdated?: (distFolderPath: string) => void
) => {
  hookToRestartStdinInput(async () => {
    const { distFolderPath } = await prepareImage(containerDefinition, { isRepackage: true });
    if (onDistFolderPathUpdated && distFolderPath) {
      onDistFolderPathUpdated(distFolderPath);
    }
    await run();
  });
};

let isNewContainerRunStarted = false;
const runDockerContainer = async (
  containerDefinition: Omit<EnrichedCwContainerProps, 'environment'> & {
    imageName: string;
    environment: Record<string, any>;
    userDefinedContainerName: string;
    distFolderPath?: string;
  },
  run: AnyFunction
) => {
  const { jobName, environment, imageName, events, packaging, userDefinedContainerName, distFolderPath } =
    containerDefinition;
  const containerName = getLocalInvokeContainerName(jobName);
  const ports = (events || []).map((event) => event.properties.containerPort);
  isNewContainerRunStarted = true;
  await gracefullyStopContainer(containerName);
  await resolveRunningContainersWithSamePort({
    ports,
    onContainerStopped: () => {
      hookToRestartContainer(containerDefinition, run);
    }
  });

  const { watch } = globalStateManager.args;
  const command = (packaging as PrebuiltCwImagePackaging | ExternalBuildpackCwImagePackaging).properties.command;
  const { exitCode } = await dockerRun({
    name: containerName,
    image: imageName,
    command,
    environment,
    portMappings: ports.map((port) => ({ containerPort: port, hostPort: port })),
    volumeMounts: distFolderPath ? [{ hostPath: distFolderPath, containerPath: '/app' }] : [],
    transformStderrPut: transformContainerWorkloadStdout,
    transformStdoutPut: transformContainerWorkloadStdout,
    onStart: () => {
      tuiManager.printDevContainerReady({ ports, isWatchMode: !!watch });
    },
    args: globalStateManager.args
  }).catch((res) => {
    return res as ExecaReturnBase<string>;
  });
  if (exitCode !== 0 && !(isNewContainerRunStarted && exitCode === 143)) {
    const errorOutput = renderErrorToString(
      {
        errorType: 'CONTAINER',
        message: `Container "${userDefinedContainerName}" exited with code ${exitCode}.`,
        hints: ['Check container logs above for error details', "Type 'rs' + enter to rebuild and restart"]
      },
      tuiManager.colorize.bind(tuiManager),
      tuiManager.makeBold.bind(tuiManager)
    );
    console.error(errorOutput);
  }
};

type PrepareImageOptions = {
  isRepackage?: boolean;
  /** External spinner to use (for parallel operations). If not provided, creates its own spinner. */
  spinner?: Spinner;
};

type PrepareImageResult = {
  imageName: string;
  sourceFiles: string[];
  distFolderPath?: string;
  /** Final message from packaging (e.g., "Image size: 343 MB") */
  details?: string;
};

const prepareImage = async (
  { jobName, workloadName, packaging, resources }: EnrichedCwContainerProps,
  options: PrepareImageOptions = {}
): Promise<PrepareImageResult> => {
  if (packaging.type === 'prebuilt-image') {
    return { imageName: packaging.properties.image, sourceFiles: [] };
  }

  const { isRepackage, spinner: externalSpinner } = options;

  // Use external spinner if provided (for parallel operations), otherwise create our own
  const spinnerText = isRepackage ? 'Re-packaging container' : 'Packaging container';
  const spinner = externalSpinner || tuiManager.createSpinner({ text: spinnerText });
  const progressLogger = tuiManager.createSpinnerProgressLogger(spinner, jobName);

  const { imageName, sourceFiles, distFolderPath } = (await packagingManager.packageWorkload({
    packaging,
    jobName,
    workloadName,
    commandCanUseCache: false,
    dockerBuildOutputArchitecture: packagingManager.getTargetCpuArchitectureForContainer(resources),
    customProgressLogger: progressLogger,
    devMode: true
  })) as PackagingOutput;

  const details = progressLogger.getLastFinalMessage();

  // Only complete the spinner if we created it ourselves
  if (!externalSpinner) {
    spinner.success({ details });
  }

  return { imageName, sourceFiles: sourceFiles.map(({ path }) => path), distFolderPath, details };
};

const transformContainerWorkloadStdout = (stdput: string) => {
  const colonOccurrences = stdput.split(':').length - 1;
  const hasErrorLine = stdput.includes('    at ') || stdput.includes('\tat ');
  const isJsonError = isJson(stdput);
  const shouldTransform = !isJsonError && colonOccurrences >= 2 && hasErrorLine;
  if (shouldTransform) {
    const { message, stackTrace } = parseContainerError(stdput);
    // Format error message and stack trace without a box (box is shown on container exit)
    const lines: string[] = ['', tuiManager.makeBold(tuiManager.colorize('red', message))];
    if (stackTrace) {
      lines.push('', tuiManager.colorize('gray', 'Stack trace:'));
      for (const line of stackTrace.split('\n')) {
        if (line.trim()) {
          lines.push(`  ${tuiManager.colorize('gray', line)}`);
        }
      }
    }
    lines.push(''); // Add trailing newline
    return lines.join('\n');
  }
  return stdput;
};
