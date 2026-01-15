import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV, PRINT_LOGS_INTERVAL } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { stpErrors } from '@errors';
import { getJobName, getLocalInvokeContainerName, injectedParameterEnvVarName } from '@shared/naming/utils';
import { getError } from '@shared/utils/misc';
import { dockerRun } from '@shared/utils/docker';
import { getDirectiveParams, getIsDirective, startsLikeGetParamDirective } from '@utils/directives';
import { LambdaCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { getAwsSynchronizedTime } from '@utils/time';
import { addCallerToAssumeRolePolicy } from 'src/commands/_utils/assume-role';
import { buildAndUpdateFunctionCode } from 'src/commands/_utils/fn-deployment';
import { initializeStackServicesForDevPhase2 } from 'src/commands/_utils/initialization';
import { getLogGroupInfoForStacktapeResource } from 'src/commands/_utils/logs';
import { prepareImage } from '../container';
import { detectLambdasNeedingTunnels, updateLambdaEnvVarsWithTunnels } from '../lambda-env-manager';
import {
  categorizeConnectToResources,
  getLocalResourceEnvVars,
  startLocalResources,
  type LocalResourceInstance
} from '../local-resources';
import { startTunnel, type TunnelInfo } from '../tunnel-manager';
import {
  getBastionTunnelsForResource,
  getDeployedBastionStpName,
  getWorkloadEnvironmentVars,
  gracefullyStopContainer,
  resolveRunningContainersWithSamePort,
  SourceCodeWatcher
} from '../utils';

type WorkloadType = 'container' | 'function';

type WorkloadInfo = {
  name: string;
  type: WorkloadType;
  resourceType: string;
  sourceFiles: string[];
  rebuild: () => Promise<void>;
};

type ParallelRunnerState = {
  workloads: Map<string, WorkloadInfo>;
  sourceCodeWatcher: SourceCodeWatcher;
  localResources: LocalResourceInstance[];
  tunnels: SsmPortForwardingTunnel[];
  boreTunnels: TunnelInfo[];
  logIntervals: NodeJS.Timeout[];
};

const state: ParallelRunnerState = {
  workloads: new Map(),
  sourceCodeWatcher: new SourceCodeWatcher(),
  localResources: [],
  tunnels: [],
  boreTunnels: [],
  logIntervals: []
};

export const runParallelWorkloads = async (
  resources: { name: string; type: string; category: WorkloadType }[]
): Promise<void> => {
  const { watch, disableEmulation } = globalStateManager.args;

  // Filter out functions when disableEmulation is true (functions always need AWS)
  let filteredResources = resources;
  if (disableEmulation) {
    const functions = resources.filter((r) => r.category === 'function');
    if (functions.length > 0) {
      tuiManager.warn(
        `Skipping Lambda functions in local mode (${functions.map((f) => f.name).join(', ')}) - functions require deployed AWS resources`
      );
      filteredResources = resources.filter((r) => r.category !== 'function');
    }
    if (filteredResources.length === 0) {
      throw getError({
        type: 'CLI',
        message: 'No container workloads to run in local mode.',
        hint: 'Lambda functions cannot run locally without a deployed stack. Use containers or deploy your stack first.'
      });
    }
  }

  // Phase 2: Load AWS metadata
  const spinner = tuiManager.createSpinner({ text: 'Loading metadata from AWS' });
  await initializeStackServicesForDevPhase2();
  spinner.success();

  // Collect all referenced resources from all workloads (via connectTo and $ResourceParam directives)
  const allReferencedResources = new Set<string>();
  for (const resource of filteredResources) {
    const configResource = getConfigResource(resource.name, resource.type);
    // From connectTo
    if (configResource?.connectTo) {
      configResource.connectTo.forEach((c: string) => allReferencedResources.add(c));
    }
    // From $ResourceParam directives in environment variables
    const envVarRefs = getResourceParamReferences(configResource);
    envVarRefs.forEach((ref) => allReferencedResources.add(ref));
  }

  // Categorize and start local resources
  const forceLocal = globalStateManager.args.local;
  const forceLocalAll = forceLocal?.includes('all');
  const { local: localResourceNames, deployed: deployedResourceNames } = categorizeConnectToResources({
    connectTo: Array.from(allReferencedResources),
    forceLocal: forceLocalAll ? true : forceLocal
  });

  state.localResources = await startLocalResources(localResourceNames);
  const localResourceEnvVars = getLocalResourceEnvVars(state.localResources);

  // Setup bore tunnels for Lambda functions that need to connect to local resources
  // (only if --no-tunnel is not set)
  if (state.localResources.length > 0 && !globalStateManager.args.noTunnel) {
    const { lambdasNeedingTunnels, skippedLambdas } = await detectLambdasNeedingTunnels(localResourceNames);

    // Warn about skipped lambdas
    for (const skipped of skippedLambdas) {
      tuiManager.warn(`Skipping tunnel for Lambda "${skipped.name}": ${skipped.reason}`);
    }

    // Start bore tunnels for each local resource that a Lambda needs
    if (lambdasNeedingTunnels.length > 0) {
      const resourcesNeedingTunnels = new Set<string>();
      for (const lambda of lambdasNeedingTunnels) {
        for (const resourceName of lambda.referencedLocalResources) {
          resourcesNeedingTunnels.add(resourceName);
        }
      }

      const multiSpinner = tuiManager.createMultiSpinner();
      const tunnelPromises = Array.from(resourcesNeedingTunnels).map(async (resourceName) => {
        const localResource = state.localResources.find((r) => r.name === resourceName);
        if (!localResource) return null;

        const spinnerItem = multiSpinner.add(resourceName, `Starting tunnel: ${resourceName}`);
        try {
          const tunnel = await startTunnel(resourceName, localResource.actualPort);
          state.boreTunnels.push(tunnel);
          spinnerItem.success({ details: `→ ${tunnel.publicHost}:${tunnel.publicPort}` });
          return tunnel;
        } catch (err) {
          spinnerItem.error(err.message);
          return null;
        }
      });

      await Promise.all(tunnelPromises);

      // Update Lambda env vars with tunnel URLs
      if (state.boreTunnels.length > 0 && lambdasNeedingTunnels.length > 0) {
        await updateLambdaEnvVarsWithTunnels({
          lambdas: lambdasNeedingTunnels,
          tunnels: state.boreTunnels,
          localResources: state.localResources
        });
      }
    }
  }

  // Compute env vars and addresses for local container workloads (only for workloads explicitly referenced)
  const { envVars: localWorkloadEnvVars, addresses: localWorkloadAddresses } = getLocalWorkloadInfo(
    filteredResources.filter((r) => r.category === 'container'),
    allReferencedResources
  );

  // Run beforeDev hooks with local resource env vars available
  if (state.localResources.length > 0) {
    Object.assign(process.env, localResourceEnvVars, localWorkloadEnvVars);
    await eventManager.processHooks({ captureType: 'START' });
  }

  // Setup bastion tunnels for deployed resources
  const bastionStpName = getDeployedBastionStpName();
  if (bastionStpName && deployedResourceNames.length > 0) {
    for (const resource of filteredResources) {
      const configResource = getConfigResource(resource.name, resource.type);
      if (configResource?.connectTo) {
        const resourceDeployedConnectTo = configResource.connectTo.filter((c: string) =>
          deployedResourceNames.includes(c)
        );
        if (resourceDeployedConnectTo.length > 0) {
          const tunnels = await getBastionTunnelsForResource({
            resource: { ...configResource, connectTo: resourceDeployedConnectTo },
            bastionStpName
          });
          state.tunnels.push(...tunnels);
        }
      }
    }
    applicationManager.registerCleanUpHook(async () => Promise.all(state.tunnels.map((t) => t.kill())));
  }

  // Start all workloads in parallel
  const allLocalEnvVars = { ...localResourceEnvVars, ...localWorkloadEnvVars };
  const startPromises = filteredResources.map(async (resource) => {
    if (resource.category === 'container') {
      return startContainerWorkload(
        resource.name,
        resource.type,
        allLocalEnvVars,
        deployedResourceNames,
        localWorkloadAddresses
      );
    } else {
      return startFunctionWorkload(resource.name);
    }
  });

  await Promise.all(startPromises);

  // Setup file watching or stdin restart
  if (watch) {
    setupFileWatching();
  } else {
    setupStdinRestart();
  }

  tuiManager.success(
    `All ${filteredResources.length} workloads running. ${watch ? '(watching for changes)' : "(type 'rs' + enter to rebuild all)"}`
  );
};

const getConfigResource = (name: string, type: string): any => {
  if (type === 'function') {
    return configManager.functions.find((f) => f.name === name);
  }
  return configManager.allContainerWorkloads.find((r) => r.nameChain[0] === name);
};

/** Extract resource names referenced via $ResourceParam directives in environment variables */
const getResourceParamReferences = (configResource: any): string[] => {
  if (!configResource) return [];
  const references: string[] = [];

  const scanValue = (value: any) => {
    if (typeof value === 'string' && getIsDirective(value) && startsLikeGetParamDirective(value)) {
      try {
        const params = getDirectiveParams('ResourceParam', value);
        if (params[0]?.value && typeof params[0].value === 'string') {
          references.push(params[0].value);
        }
      } catch {
        // Ignore parsing errors
      }
    }
  };

  const scanEnvVars = (environment: any) => {
    if (!environment) return;
    // Handle array format: [{ name: 'VAR', value: '$ResourceParam(...)' }]
    if (Array.isArray(environment)) {
      for (const envVar of environment) {
        scanValue(envVar.value);
      }
    }
    // Handle object format: { VAR: '$ResourceParam(...)' }
    else if (typeof environment === 'object') {
      for (const value of Object.values(environment)) {
        scanValue(value);
      }
    }
  };

  // Scan environment at resource level (for functions and single-container workloads)
  scanEnvVars(configResource.environment);

  // Scan environment in each container (for multi-container workloads)
  if (configResource.containers) {
    for (const container of configResource.containers) {
      scanEnvVars(container.environment);
    }
  }

  return references;
};

/**
 * Get env vars and addresses for local container workloads that are referenced.
 * Only includes workloads explicitly referenced via connectTo or $ResourceParam directives.
 */
const getLocalWorkloadInfo = (
  containerResources: { name: string; type: string }[],
  allReferencedResources: Set<string>
): { envVars: Record<string, string>; addresses: Record<string, string> } => {
  const envVars: Record<string, string> = {};
  const addresses: Record<string, string> = {};
  const tunnelHost = process.platform === 'linux' ? '127.0.0.1' : 'host.docker.internal';

  for (const resource of containerResources) {
    // Only expose this workload if another workload references it
    if (!allReferencedResources.has(resource.name)) continue;

    const workload = configManager.allContainerWorkloads.find(
      (r) => r.nameChain[0] === resource.name
    ) as StpContainerWorkload;
    if (!workload) continue;

    // Get port from container events
    const containerDef = workload.containers[0];
    const jobName = getJobName({
      workloadName: resource.name,
      workloadType: workload.configParentResourceType,
      containerName: containerDef.name
    });
    const containerDefinition = configManager.allContainerWorkloadContainers.find((job) => job.jobName === jobName);
    const port = containerDefinition?.events?.[0]?.properties?.containerPort;

    if (port) {
      // For private-service, set ADDRESS (format: host:port)
      // For web-service/worker-service, set URL (format: http://host:port)
      if (workload.configParentResourceType === 'private-service') {
        const address = `${tunnelHost}:${port}`;
        envVars[injectedParameterEnvVarName(resource.name, 'address')] = address;
        addresses[resource.name] = address;
      } else {
        const url = `http://${tunnelHost}:${port}`;
        envVars[injectedParameterEnvVarName(resource.name, 'url')] = url;
        addresses[resource.name] = url;
      }
    }
  }

  return { envVars, addresses };
};

const startContainerWorkload = async (
  resourceName: string,
  resourceType: string,
  localResourceEnvVars: Record<string, string>,
  deployedConnectTo: string[],
  localWorkloadAddresses: Record<string, string>
): Promise<void> => {
  const resource = configManager.allContainerWorkloads.find(
    (r) => r.nameChain[0] === resourceName
  ) as StpContainerWorkload;
  const containerDef = resource.containers[0];
  const containerName = containerDef.name;

  const jobName = getJobName({
    workloadName: resourceName,
    workloadType: resource.configParentResourceType,
    containerName
  });

  const containerDefinition = configManager.allContainerWorkloadContainers.find((job) => job.jobName === jobName);

  // Prepare image
  const imageResult = await prepareImage(containerDefinition);

  // Validate deployed resource if stack exists
  if (stackManager.existingStackDetails) {
    const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
    if (deployedStpResource) {
      await addCallerToAssumeRolePolicy({
        roleName: deployedStackOverviewManager.getIamRoleNameOfDeployedResource(containerDefinition.workloadName)
      });
    }
  }

  // Run container
  const localContainerName = getLocalInvokeContainerName(jobName);
  await gracefullyStopContainer(localContainerName);

  const ports = (containerDefinition.events || []).map((event: any) => event.properties.containerPort);
  const primaryPort = ports[0];

  // Get environment
  const resourceDeployedConnectTo = (resource.connectTo || []).filter((c) => deployedConnectTo.includes(c));
  const environment = await getWorkloadEnvironmentVars({
    jobEnvironment: containerDefinition.environment,
    jobName,
    workloadName: containerDefinition.workloadName,
    connectTo: resourceDeployedConnectTo,
    workloadType: 'multi-container-workload',
    tunnels: state.tunnels.filter((t) => resourceDeployedConnectTo.includes(t.targetInfo.targetStpName)),
    localResourceEnvVars,
    skipAwsCredentials: !stackManager.existingStackDetails,
    port: primaryPort,
    localWorkloadAddresses
  });
  await resolveRunningContainersWithSamePort({ ports });

  const command = (containerDefinition.packaging as any)?.properties?.command;

  // Start container in background (don't await - it runs until stopped)
  dockerRun({
    name: localContainerName,
    image: imageResult.imageName,
    command,
    environment,
    portMappings: ports.map((port: number) => ({ containerPort: port, hostPort: port })),
    volumeMounts: imageResult.distFolderPath ? [{ hostPath: imageResult.distFolderPath, containerPath: '/app' }] : [],
    onStart: () => {
      tuiManager.info(`[${resourceName}] Container started on port${ports.length > 1 ? 's' : ''} ${ports.join(', ')}`);
    },
    args: globalStateManager.args
  }).catch(() => {
    // Container exited - this is normal when restarting
  });

  // Register workload for file watching
  const rebuild = async () => {
    tuiManager.info(`[${resourceName}] Rebuilding...`);
    await gracefullyStopContainer(localContainerName);
    const newImage = await prepareImage(containerDefinition);
    dockerRun({
      name: localContainerName,
      image: newImage.imageName,
      command,
      environment,
      portMappings: ports.map((port: number) => ({ containerPort: port, hostPort: port })),
      volumeMounts: newImage.distFolderPath ? [{ hostPath: newImage.distFolderPath, containerPath: '/app' }] : [],
      onStart: () => {
        tuiManager.info(`[${resourceName}] Container restarted`);
      },
      args: globalStateManager.args
    }).catch(() => {});
    return newImage.sourceFiles;
  };

  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'container',
    resourceType,
    sourceFiles: imageResult.sourceFiles,
    rebuild: async () => {
      const newSourceFiles = await rebuild();
      const workload = state.workloads.get(resourceName);
      if (workload) {
        workload.sourceFiles = newSourceFiles;
      }
    }
  });
};

const startFunctionWorkload = async (resourceName: string): Promise<void> => {
  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!deployedStpResource) {
    throw stpErrors.e6({
      resourceName,
      resourceType: 'function',
      stackName: globalStateManager.targetStack.stackName
    });
  }

  // Build and deploy
  globalStateManager.args.resourceName = resourceName;
  const { packagingOutput } = await buildAndUpdateFunctionCode(resourceName, { devMode: true });
  packagingManager.clearPackagedJobs();

  tuiManager.info(`[${resourceName}] Function deployed`);

  // Setup log streaming
  const cloudwatchLogPrinter = new LambdaCloudwatchLogPrinter({
    fetchSince: (await getAwsSynchronizedTime()).getTime(),
    logGroupAwsResourceName: getLogGroupInfoForStacktapeResource({ resourceName }).PhysicalResourceId
  });

  const logInterval = setInterval(async () => {
    try {
      await cloudwatchLogPrinter.printLogs();
    } catch (err) {
      if (IS_DEV) console.error(`[${resourceName}] Log fetch error:`, err);
    }
  }, PRINT_LOGS_INTERVAL);

  state.logIntervals.push(logInterval);

  // Register workload
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'function',
    resourceType: 'function',
    sourceFiles: packagingOutput.sourceFiles.map((f: any) => f.path),
    rebuild: async () => {
      tuiManager.info(`[${resourceName}] Redeploying...`);
      globalStateManager.args.resourceName = resourceName;
      const result = await buildAndUpdateFunctionCode(resourceName, { devMode: true });
      packagingManager.clearPackagedJobs();
      tuiManager.info(`[${resourceName}] Function redeployed`);
      await cloudwatchLogPrinter.startUsingNewLogStream();
      const workload = state.workloads.get(resourceName);
      if (workload) {
        workload.sourceFiles = result.packagingOutput.sourceFiles.map((f: any) => f.path);
      }
    }
  });
};

const setupFileWatching = () => {
  const allSourceFiles: string[] = [];
  const fileToWorkload = new Map<string, string>();

  for (const [name, workload] of state.workloads) {
    for (const file of workload.sourceFiles) {
      allSourceFiles.push(file);
      fileToWorkload.set(file, name);
    }
  }

  state.sourceCodeWatcher.watch({
    filesToWatch: allSourceFiles,
    onChangeFn: async ({ changedFile }) => {
      const workloadName = fileToWorkload.get(changedFile);
      if (!workloadName) {
        tuiManager.info(`File changed: ${tuiManager.prettyFilePath(changedFile)} (no matching workload)`);
        return;
      }

      const workload = state.workloads.get(workloadName);
      if (!workload) return;

      tuiManager.info(`File changed: ${tuiManager.prettyFilePath(changedFile)} -> rebuilding ${workloadName}`);

      state.sourceCodeWatcher.unwatchAllFiles();
      await workload.rebuild();

      // Re-setup watching with updated source files
      const newAllSourceFiles: string[] = [];
      const newFileToWorkload = new Map<string, string>();
      for (const [name, w] of state.workloads) {
        for (const file of w.sourceFiles) {
          newAllSourceFiles.push(file);
          newFileToWorkload.set(file, name);
        }
      }
      fileToWorkload.clear();
      for (const [k, v] of newFileToWorkload) {
        fileToWorkload.set(k, v);
      }
      state.sourceCodeWatcher.addFilesToWatch(newAllSourceFiles);
    }
  });
};

const setupStdinRestart = () => {
  applicationManager.setUsesStdinWatch();
  process.stdin.removeAllListeners();
  process.stdin.on('data', async (data) => {
    if (applicationManager.isInterrupted) return;

    const str = data.toString().trim().toLowerCase();
    const char = data.toString().charCodeAt(0);

    if (char === 12) {
      console.clear();
      return;
    }

    if (str === 'rs') {
      tuiManager.info('Rebuilding all workloads...');
      for (const workload of state.workloads.values()) {
        await workload.rebuild();
      }
      return;
    }

    // Check if input matches a workload name (for targeted restart)
    const workloadName = str.replace('rs ', '');
    const workload = state.workloads.get(workloadName);
    if (workload) {
      await workload.rebuild();
    }
  });

  tuiManager.info("Type 'rs' to rebuild all, or 'rs <workload-name>' to rebuild specific workload");
};

// Cleanup on exit
applicationManager.registerCleanUpHook(async () => {
  for (const interval of state.logIntervals) {
    clearInterval(interval);
  }
  state.logIntervals = [];
  state.workloads.clear();
});
