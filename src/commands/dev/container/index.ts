import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { ExecaReturnBase } from 'execa';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { stpErrors } from '@errors';
import { getJobName, getLocalInvokeContainerName } from '@shared/naming/utils';
import { dockerRun } from '@shared/utils/docker';
import { getRelativePath } from '@shared/utils/fs-utils';
import { isJson } from '@shared/utils/misc';
import { getErrorFromString } from '@utils/errors';
import { printer } from '@utils/printer';
import { addCallerToAssumeRolePolicy } from 'src/commands/_utils/assume-role';
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
  if (!stackManager.existingStackDetails && !disableEmulation) {
    throw stpErrors.e3({ region, stage });
  }

  const jobName = getJobName({
    workloadName: resourceName,
    workloadType: resource.configParentResourceType,
    containerName
  });

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

  const containerDefinition = configManager.allContainerWorkloadContainers.find((job) => job.jobName === jobName);
  const [{ imageName, sourceFiles }] = await Promise.all([
    prepareImage(containerDefinition),
    addCallerToAssumeRolePolicy({
      roleName: deployedStackOverviewManager.getIamRoleNameOfDeployedResource(containerDefinition.workloadName)
    })
  ]);
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
  const run = async () => {
    await runDockerContainer(
      {
        ...containerDefinition,
        imageName,
        environment,
        userDefinedContainerName: containerName
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
        printer.info(`File at ${getRelativePath(changedFile)} has changed. Rebuilding and restarting container...`);
        // @todo we need to remove more, because timings are inaccurate
        const newImage = await prepareImage(containerDefinition);
        sourceCodeWatcher.addFilesToWatch(newImage.sourceFiles);
        await run();
      }
    });
    await run();
  } else {
    hookToRestartContainer(containerDefinition, run);
    await run();
  }
};

const hookToRestartContainer = (
  containerDefinition: Omit<EnrichedCwContainerProps, 'environment'>,
  run: AnyFunction
) => {
  hookToRestartStdinInput(async () => {
    printer.info('Received restart signal. Rebuilding and restarting container...');
    await prepareImage(containerDefinition);
    await run();
  });
};

let isNewContainerRunStarted = false;
const runDockerContainer = async (
  containerDefinition: Omit<EnrichedCwContainerProps, 'environment'> & {
    imageName: string;
    environment: Record<string, any>;
    userDefinedContainerName: string;
  },
  run: AnyFunction
) => {
  const { jobName, environment, imageName, events, packaging, userDefinedContainerName } = containerDefinition;
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
  const restartMessage = printer.colorize(
    'gray',
    watch ? '(watching for files changes)' : "(type 'rs' + enter to rebuild and restart)"
  );
  const command = (packaging as PrebuiltCwImagePackaging | ExternalBuildpackCwImagePackaging).properties.command;
  const { exitCode } = await dockerRun({
    name: containerName,
    image: imageName,
    command,
    environment,
    // portMappings: ports.map((port) => ({ containerPort: port, hostPort: port })),
    transformStderrPut: transformContainerWorkloadStdout,
    transformStdoutPut: transformContainerWorkloadStdout,
    onStart: () => {
      printer.success(`Container started successfully ${restartMessage}.`);
      printer.info(`Exposed ports: ${ports.map((port) => `http://localhost:${port}`)}`);
    },
    args: globalStateManager.args
  }).catch((res) => {
    return res as ExecaReturnBase<string>;
  });
  if (exitCode !== 0 && !(isNewContainerRunStarted && exitCode === 143)) {
    console.error(
      `\n[${printer.colorize('red', 'CONTAINER_ERROR')}] Container ${printer.makeBold(
        userDefinedContainerName
      )} has exited with error. Exit code: ${exitCode}.` //  Error:\n${err}
    );
  }
};

const prepareImage = async ({
  jobName,
  workloadName,
  packaging,
  resources
}: EnrichedCwContainerProps): Promise<{ imageName: string; sourceFiles: string[] }> => {
  eventManager.reset();

  if (packaging.type === 'prebuilt-image') {
    return { imageName: packaging.properties.image, sourceFiles: [] };
  }

  await eventManager.startEvent({
    eventType: 'PACKAGE_ARTIFACTS',
    description: 'Packaging container'
  });
  const { imageName, sourceFiles } = (await packagingManager.packageWorkload({
    packaging,
    jobName,
    workloadName,
    commandCanUseCache: false,
    dockerBuildOutputArchitecture: packagingManager.getTargetCpuArchitectureForContainer(resources)
  })) as PackagingOutput;

  await eventManager.finishEvent({
    eventType: 'PACKAGE_ARTIFACTS'
  });

  return { imageName, sourceFiles: sourceFiles.map(({ path }) => path) };
};

const transformContainerWorkloadStdout = (stdput: string) => {
  const colonOccurrences = stdput.split(':').length - 1;
  const hasErrorLine = stdput.includes('    at ') || stdput.includes('\tat ');
  const isJsonError = isJson(stdput);
  const shouldTransform = !isJsonError && colonOccurrences >= 2 && hasErrorLine;
  if (shouldTransform) {
    return getErrorFromString(stdput);
  }
  return stdput;
};
