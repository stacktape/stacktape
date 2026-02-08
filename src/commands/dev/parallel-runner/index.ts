import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { LocalResourceInstance } from '../local-resources';
import type { TunnelInfo } from '../tunnel-manager';
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
import { dockerRun } from '@shared/utils/docker';
import { LambdaCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { getDirectiveParams, getIsDirective, startsLikeGetParamDirective } from '@utils/directives';
import { ExpectedError } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { buildAndUpdateFunctionCode } from 'src/commands/_utils/fn-deployment';
import { getLogGroupInfoForStacktapeResource } from 'src/commands/_utils/logs';
import { getExecutableScriptFunction } from 'src/commands/script-run/utils';
import { prepareImage } from '../container';
import { startHostingBucketDevServer } from '../hosting-bucket';
import { detectLambdasNeedingTunnels, updateLambdaEnvVarsWithTunnels } from '../lambda-env-manager';
import { categorizeConnectToResources, getLocalResourceEnvVars, startLocalResources } from '../local-resources';
import { startHealthMonitoring } from '../local-resources/health-monitor';
import { startNextjsWebDevServer } from '../nextjs-web';
import { startSsrWebDevServer } from '../ssr-web';
import type { SsrWebResourceType } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';
import { startTunnel } from '../tunnel-manager';
import {
  clearCredentialExpiryTimer,
  getBastionTunnelsForResource,
  getDeployedBastionStpName,
  getWorkloadEnvironmentVars,
  gracefullyStopContainer,
  resolveRunningContainersWithSamePort,
  SourceCodeWatcher
} from '../utils';
import { updateAgentWorkloadStatus } from '../agent-server';

type WorkloadType = 'container' | 'function' | 'hosting-bucket' | 'nextjs-web' | 'ssr-web';

type WorkloadInfo = {
  name: string;
  type: WorkloadType;
  resourceType: string;
  sourceFiles: string[];
  rebuild: () => Promise<void>;
  envVars?: Record<string, string>;
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
  resources: { name: string; type: string; category: WorkloadType }[],
  selectedLocalResources?: Set<string>
): Promise<void> => {
  const { watch } = globalStateManager.args;

  // All resources run - no filtering needed in new dev mode
  const filteredResources = resources;

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

  // Also include directly selected local resources (databases selected without workloads referencing them)
  if (selectedLocalResources) {
    for (const resourceName of selectedLocalResources) {
      allReferencedResources.add(resourceName);
    }
  }

  // Categorize and start local resources
  // If selectedLocalResources provided, only run those locally (others use deployed AWS)
  const { local: localResourceNames, deployed: deployedResourceNames } = categorizeConnectToResources({
    connectTo: Array.from(allReferencedResources),
    selectedLocalResources
  });

  state.localResources = await startLocalResources(localResourceNames);
  const localResourceEnvVars = getLocalResourceEnvVars(state.localResources);

  // Start health monitoring for local resources (detects crashes, auto-restarts)
  if (state.localResources.length > 0) {
    startHealthMonitoring(state.localResources);
  }

  const useDevTui = devTuiManager.running;

  // Setup bore tunnels for Lambda functions that need to connect to local resources
  // Skip when: --no-tunnel is set or no local resources
  const shouldSetupLambdaTunnels = state.localResources.length > 0 && !globalStateManager.args.noTunnel;

  if (shouldSetupLambdaTunnels) {
    if (useDevTui) devTuiManager.setSetupStepStatus('tunnels', 'running');

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

      const failedTunnels: string[] = [];
      const tunnelPromises = Array.from(resourcesNeedingTunnels).map(async (resourceName) => {
        const localResource = state.localResources.find((r) => r.name === resourceName);
        if (!localResource) return null;

        try {
          const tunnel = await startTunnel(resourceName, localResource.actualPort);
          state.boreTunnels.push(tunnel);
          return tunnel;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          tuiManager.warn(`Failed to create tunnel for ${resourceName}: ${errorMessage}`);
          failedTunnels.push(resourceName);
          return null;
        }
      });

      await Promise.all(tunnelPromises);

      // Filter lambdas to only those whose resources have successful tunnels
      const successfulTunnelResources = new Set(state.boreTunnels.map((t) => t.resourceName));
      const lambdasWithSuccessfulTunnels = lambdasNeedingTunnels.filter((lambda) =>
        lambda.referencedLocalResources.every((r) => successfulTunnelResources.has(r))
      );

      // Warn about lambdas that won't get tunnel updates due to failed tunnels
      const lambdasWithFailedTunnels = lambdasNeedingTunnels.filter(
        (lambda) => !lambda.referencedLocalResources.every((r) => successfulTunnelResources.has(r))
      );
      for (const lambda of lambdasWithFailedTunnels) {
        const missingResources = lambda.referencedLocalResources.filter((r) => !successfulTunnelResources.has(r));
        tuiManager.warn(
          `Lambda "${lambda.name}" won't connect to local resources: ${missingResources.join(', ')} (tunnel failed)`
        );
      }

      // Start Lambda env var updates in background (don't block workload startup)
      // This runs in parallel with workload startup for faster dev mode initialization
      let lambdaEnvUpdatePromise: Promise<void> | null = null;
      if (state.boreTunnels.length > 0 && lambdasWithSuccessfulTunnels.length > 0) {
        lambdaEnvUpdatePromise = updateLambdaEnvVarsWithTunnels({
          lambdas: lambdasWithSuccessfulTunnels,
          tunnels: state.boreTunnels,
          localResources: state.localResources
        })
          .then(({ updated: _updated, failed }) => {
            if (failed.length > 0) {
              tuiManager.warn(`Failed to update env vars for ${failed.length} Lambda(s): ${failed.join(', ')}`);
            }
          })
          .catch((err) => {
            tuiManager.warn(`Lambda env var update failed: ${err instanceof Error ? err.message : String(err)}`);
          });
        // Store promise to await later before transitioning to 'ready'
        (state as any).lambdaEnvUpdatePromise = lambdaEnvUpdatePromise;
      }

      if (useDevTui) {
        const tunnelCount = state.boreTunnels.length;
        const failedCount = failedTunnels.length;
        const statusMessage =
          failedCount > 0
            ? `${tunnelCount} tunnel(s), ${failedCount} failed`
            : tunnelCount > 0
              ? `${tunnelCount} tunnel(s)`
              : undefined;
        devTuiManager.setSetupStepStatus('tunnels', failedCount > 0 ? 'done' : 'done', statusMessage);
      }
    } else {
      if (useDevTui) devTuiManager.setSetupStepStatus('tunnels', 'skipped');
    }
  }

  // Mark env injection as running
  if (useDevTui && state.localResources.length > 0) {
    devTuiManager.setSetupStepStatus('env-inject', 'running');
  }

  // Compute env vars and addresses for local container workloads (only for workloads explicitly referenced)
  const {
    envVars: localWorkloadEnvVars,
    addresses: localWorkloadAddresses,
    stackInfoWorkloads
  } = getLocalWorkloadInfo(
    filteredResources.filter((r) => r.category === 'container'),
    allReferencedResources
  );

  // Inject local workload info into deployedStackOverviewManager so $ResourceParam directives can resolve them
  // markAsLocallyInjected: false because container workloads now have IAM roles in the dev stack
  // and should be able to assume them for AWS credentials
  if (stackInfoWorkloads.length > 0) {
    deployedStackOverviewManager.injectLocalWorkloadInfo(stackInfoWorkloads, { markAsLocallyInjected: false });
  }

  // Inject local resource (database) info into deployedStackOverviewManager so hooks can resolve connectTo
  if (state.localResources.length > 0) {
    const localResourceInfo = state.localResources.map((r) => ({
      name: r.name,
      resourceType: r.type,
      referencableParams: r.referencableParams
    }));
    deployedStackOverviewManager.injectLocalResourceInfo(localResourceInfo);
  }

  // Set local resource env vars if we have any
  if (state.localResources.length > 0 || Object.keys(localWorkloadEnvVars).length > 0) {
    Object.assign(process.env, localResourceEnvVars, localWorkloadEnvVars);
  }

  // Mark env injection as done
  if (useDevTui && state.localResources.length > 0) {
    devTuiManager.setSetupStepStatus('env-inject', 'done');
  }

  // Run beforeDev hooks
  await runBeforeDevHooks();

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
    } else if (resource.category === 'function') {
      return startFunctionWorkload(resource.name);
    } else if (resource.category === 'hosting-bucket') {
      return startHostingBucketWorkload(resource.name, allLocalEnvVars);
    } else if (resource.category === 'nextjs-web') {
      return startNextjsWebWorkload(resource.name, allLocalEnvVars);
    } else if (resource.category === 'ssr-web') {
      return startSsrWebWorkload(resource.name, resource.type, allLocalEnvVars);
    }
  });

  await Promise.all(startPromises);

  // Wait for Lambda env var update to complete (started earlier in parallel with workload startup)
  const lambdaEnvUpdatePromise = (state as any).lambdaEnvUpdatePromise as Promise<void> | undefined;
  if (lambdaEnvUpdatePromise) {
    await lambdaEnvUpdatePromise;
    delete (state as any).lambdaEnvUpdatePromise;
  }

  // Transition to running phase in DevTui
  if (useDevTui) {
    // Small delay to ensure final state updates are rendered
    await new Promise((resolve) => setTimeout(resolve, 100));
    devTuiManager.transitionToRunning();
  }

  // Setup file watching or stdin restart (only when not using DevTui)
  if (!useDevTui) {
    if (watch) {
      setupFileWatching();
    } else {
      setupStdinRestart();
    }

    tuiManager.success(
      `All ${filteredResources.length} workloads running. ${watch ? '(watching for changes)' : "(type 'rs' + enter to rebuild all)"}`
    );
  }
};

const getConfigResource = (name: string, type: string): any => {
  if (type === 'function') {
    return configManager.functions.find((f) => f.name === name);
  }
  if (type === 'hosting-bucket') {
    return configManager.hostingBuckets.find((b) => b.name === name);
  }
  if (type === 'nextjs-web') {
    return configManager.nextjsWebs.find((n) => n.name === name);
  }
  if (type === 'astro-web') {
    return configManager.astroWebs.find((r) => r.name === name);
  }
  if (type === 'nuxt-web') {
    return configManager.nuxtWebs.find((r) => r.name === name);
  }
  if (type === 'sveltekit-web') {
    return configManager.sveltekitWebs.find((r) => r.name === name);
  }
  if (type === 'solidstart-web') {
    return configManager.solidstartWebs.find((r) => r.name === name);
  }
  if (type === 'tanstack-web') {
    return configManager.tanstackWebs.find((r) => r.name === name);
  }
  if (type === 'remix-web') {
    return configManager.remixWebs.find((r) => r.name === name);
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

  // Scan injectEnvironment (for hosting-bucket and nextjs-web)
  scanEnvVars(configResource.injectEnvironment);

  return references;
};

type LocalWorkloadInfoResult = {
  envVars: Record<string, string>;
  addresses: Record<string, string>;
  stackInfoWorkloads: { name: string; resourceType: string; url?: string; address?: string }[];
};

/**
 * Get env vars, addresses, and stack info for local container workloads.
 * - envVars/addresses: Only includes workloads explicitly referenced via connectTo or $ResourceParam
 * - stackInfoWorkloads: Includes ALL container workloads so $ResourceParam directives can resolve
 */
const getLocalWorkloadInfo = (
  containerResources: { name: string; type: string }[],
  allReferencedResources: Set<string>
): LocalWorkloadInfoResult => {
  const envVars: Record<string, string> = {};
  const addresses: Record<string, string> = {};
  const stackInfoWorkloads: { name: string; resourceType: string; url?: string; address?: string }[] = [];
  const tunnelHost = process.platform === 'linux' ? '127.0.0.1' : 'host.docker.internal';

  for (const resource of containerResources) {
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
        // Only set env vars for referenced workloads
        if (allReferencedResources.has(resource.name)) {
          envVars[injectedParameterEnvVarName(resource.name, 'address')] = address;
          addresses[resource.name] = address;
        }
        // Always add to stackInfoWorkloads for $ResourceParam resolution
        stackInfoWorkloads.push({ name: resource.name, resourceType: 'private-service', address });
      } else {
        const url = `http://${tunnelHost}:${port}`;
        // Only set env vars for referenced workloads
        if (allReferencedResources.has(resource.name)) {
          envVars[injectedParameterEnvVarName(resource.name, 'url')] = url;
          addresses[resource.name] = url;
        }
        // Always add to stackInfoWorkloads for $ResourceParam resolution
        stackInfoWorkloads.push({ name: resource.name, resourceType: workload.configParentResourceType, url });
      }
    }
  }

  return { envVars, addresses, stackInfoWorkloads };
};

const startContainerWorkload = async (
  resourceName: string,
  resourceType: string,
  localResourceEnvVars: Record<string, string>,
  deployedConnectTo: string[],
  localWorkloadAddresses: Record<string, string>
): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Packaging...' });
  }

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

  // Check if resource is locally injected (not deployed to AWS)
  const isInjected = deployedStackOverviewManager.isLocallyInjectedResource(resourceName);

  // Run container
  const localContainerName = getLocalInvokeContainerName(jobName);
  await gracefullyStopContainer(localContainerName);

  const ports = (containerDefinition.events || []).map((event: any) => event.properties.containerPort);
  const primaryPort = ports[0];

  // Get environment
  const resourceDeployedConnectTo = (resource.connectTo || []).filter((c) => deployedConnectTo.includes(c));
  // Skip AWS credentials for locally-injected resources (not deployed to AWS)
  const skipAwsCredentials = !stackManager.existingStackDetails || isInjected;
  const environment = await getWorkloadEnvironmentVars({
    jobEnvironment: containerDefinition.environment,
    jobName,
    workloadName: containerDefinition.workloadName,
    connectTo: resourceDeployedConnectTo,
    workloadType: 'multi-container-workload',
    tunnels: state.tunnels.filter((t) => resourceDeployedConnectTo.includes(t.targetInfo.targetStpName)),
    localResourceEnvVars,
    skipAwsCredentials,
    port: primaryPort,
    localWorkloadAddresses
  });
  // Auto-stop conflicting containers when DevTUI is active (can't prompt user)
  await resolveRunningContainersWithSamePort({ ports, autoStopConflicting: useDevTui });

  const command = (containerDefinition.packaging as any)?.properties?.command;

  // Start container and wait for it to be running (or fail early)
  await new Promise<void>((resolve, reject) => {
    let started = false;
    let stderrBuffer = '';

    const containerPromise = dockerRun({
      name: localContainerName,
      image: imageResult.imageName,
      command,
      environment,
      portMappings: ports.map((port: number) => ({ containerPort: port, hostPort: port })),
      volumeMounts: imageResult.distFolderPath ? [{ hostPath: imageResult.distFolderPath, containerPath: '/app' }] : [],
      onStart: () => {
        started = true;
        if (useDevTui) {
          devTuiManager.setWorkloadStatus(resourceName, 'running', {
            port: primaryPort,
            url: `http://localhost:${primaryPort}`,
            size: imageResult.details // Image size info
          });
          devTuiManager.log(resourceName, `Container started on port ${primaryPort}`);
        } else {
          tuiManager.info(
            `[${resourceName}] Container started on port${ports.length > 1 ? 's' : ''} ${ports.join(', ')}`
          );
        }
        resolve();
      },
      transformStdoutLine: useDevTui
        ? (line: string) => {
            devTuiManager.log(resourceName, line);
            return null; // Suppress console output when DevTui is active
          }
        : undefined,
      transformStderrLine: useDevTui
        ? (line: string) => {
            stderrBuffer += `${line}\n`;
            devTuiManager.log(resourceName, line, 'warn');
            return null; // Suppress console output when DevTui is active
          }
        : (line: string) => {
            stderrBuffer += `${line}\n`;
            return line;
          },
      args: globalStateManager.args
    });

    // If container exits before onStart is called, it's an error
    containerPromise
      .then(() => {
        if (!started) {
          reject(
            new ExpectedError(
              'DOCKER',
              `Container "${resourceName}" exited before starting.`,
              'Check container logs above for errors.'
            )
          );
        }
      })
      .catch((err) => {
        if (!started) {
          const errMsg = stderrBuffer.trim() || err.message || 'Unknown error';
          reject(new ExpectedError('DOCKER', `Failed to start container "${resourceName}": ${errMsg}`));
        }
        // If already started, container exit is normal (e.g., during restart)
      });
  });

  // Register workload for file watching
  const rebuild = async () => {
    const inRebuildPhase = devTuiManager.inRebuildPhase;

    if (inRebuildPhase) {
      // Step 1: Stop container
      devTuiManager.setRebuildStep(resourceName, 'stopping');
    } else if (useDevTui) {
      devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Rebuilding...' });
    } else {
      tuiManager.info(`[${resourceName}] Rebuilding...`);
    }

    await gracefullyStopContainer(localContainerName);

    // Step 2: Package
    if (inRebuildPhase) {
      devTuiManager.setRebuildStep(resourceName, 'packaging');
    }
    const newImage = await prepareImage(containerDefinition);

    // Update size info
    if (inRebuildPhase && newImage.details) {
      devTuiManager.setRebuildSize(resourceName, newImage.details);
    }

    // Step 3: Start container
    if (inRebuildPhase) {
      devTuiManager.setRebuildStep(resourceName, 'starting');
    }

    await new Promise<void>((resolve) => {
      dockerRun({
        name: localContainerName,
        image: newImage.imageName,
        command,
        environment,
        portMappings: ports.map((port: number) => ({ containerPort: port, hostPort: port })),
        volumeMounts: newImage.distFolderPath ? [{ hostPath: newImage.distFolderPath, containerPath: '/app' }] : [],
        onStart: () => {
          if (!inRebuildPhase) {
            if (useDevTui) {
              devTuiManager.setWorkloadStatus(resourceName, 'running', {
                port: primaryPort,
                url: `http://localhost:${primaryPort}`
              });
              devTuiManager.log(resourceName, 'Container restarted');
            } else {
              tuiManager.info(`[${resourceName}] Container restarted`);
            }
          }
          resolve();
        },
        transformStdoutLine: useDevTui
          ? (line: string) => {
              devTuiManager.log(resourceName, line);
              return null;
            }
          : undefined,
        transformStderrLine: useDevTui
          ? (line: string) => {
              devTuiManager.log(resourceName, line, 'warn');
              return null;
            }
          : undefined,
        args: globalStateManager.args
      }).catch(() => {
        resolve();
      });
    });

    return { sourceFiles: newImage.sourceFiles, size: newImage.details };
  };

  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'container',
    resourceType,
    sourceFiles: imageResult.sourceFiles,
    envVars: environment,
    rebuild: async () => {
      const result = await rebuild();
      const workload = state.workloads.get(resourceName);
      if (workload) {
        workload.sourceFiles = result.sourceFiles;
      }
    }
  });
};

const startHostingBucketWorkload = async (
  resourceName: string,
  localEnvVars: Record<string, string>
): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  // startHostingBucketDevServer handles its own onStateChange callback
  // which updates the workload status with URL and compile time
  await startHostingBucketDevServer({
    name: resourceName,
    localWorkloadEnvVars: localEnvVars
  });

  // Dev server handles its own hot reload, no need to track source files
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'hosting-bucket',
    resourceType: 'hosting-bucket',
    sourceFiles: [],
    envVars: localEnvVars,
    rebuild: async () => {
      const inRebuildPhase = devTuiManager.inRebuildPhase;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'stopping');
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Restarting...' });
      } else {
        tuiManager.info(`[${resourceName}] Restarting dev server...`);
      }

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'starting');
      }

      const restartResult = await startHostingBucketDevServer({
        name: resourceName,
        localWorkloadEnvVars: localEnvVars
      });

      if (!inRebuildPhase && useDevTui && restartResult.status === 'ready') {
        devTuiManager.setWorkloadStatus(resourceName, 'running', { url: restartResult.url });
      }
    }
  });
};

const startNextjsWebWorkload = async (resourceName: string, localEnvVars: Record<string, string>): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  // startNextjsWebDevServer handles its own onStateChange callback
  // which updates the workload status with URL and compile time
  await startNextjsWebDevServer({
    name: resourceName,
    localWorkloadEnvVars: localEnvVars
  });

  // Dev server handles its own hot reload, no need to track source files
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'nextjs-web',
    resourceType: 'nextjs-web',
    sourceFiles: [],
    envVars: localEnvVars,
    rebuild: async () => {
      const inRebuildPhase = devTuiManager.inRebuildPhase;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'stopping');
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Restarting...' });
      } else {
        tuiManager.info(`[${resourceName}] Restarting dev server...`);
      }

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'starting');
      }

      const restartResult = await startNextjsWebDevServer({
        name: resourceName,
        localWorkloadEnvVars: localEnvVars
      });

      if (!inRebuildPhase && useDevTui && restartResult.status === 'ready') {
        devTuiManager.setWorkloadStatus(resourceName, 'running', { url: restartResult.url });
      }
    }
  });
};

const startSsrWebWorkload = async (
  resourceName: string,
  resourceType: string,
  localEnvVars: Record<string, string>
): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  await startSsrWebDevServer({
    name: resourceName,
    resourceType: resourceType as SsrWebResourceType,
    localWorkloadEnvVars: localEnvVars
  });

  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'ssr-web',
    resourceType,
    sourceFiles: [],
    envVars: localEnvVars,
    rebuild: async () => {
      const inRebuildPhase = devTuiManager.inRebuildPhase;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'stopping');
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Restarting...' });
      } else {
        tuiManager.info(`[${resourceName}] Restarting dev server...`);
      }

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'starting');
      }

      const restartResult = await startSsrWebDevServer({
        name: resourceName,
        resourceType: resourceType as SsrWebResourceType,
        localWorkloadEnvVars: localEnvVars
      });

      if (!inRebuildPhase && useDevTui && restartResult.status === 'ready') {
        devTuiManager.setWorkloadStatus(resourceName, 'running', { url: restartResult.url });
      }
    }
  });
};

/**
 * Get the primary integration info for a Lambda function.
 * Returns URL for HTTP API Gateway integrations, or a description for other event types.
 */
const getFunctionIntegrationInfo = (resourceName: string): { url?: string; statusMessage?: string } => {
  const functionConfig = configManager.functions.find((f) => f.name === resourceName);
  if (!functionConfig?.events?.length) {
    return { statusMessage: 'No triggers' };
  }

  // Find HTTP API Gateway integration first (most common, has URL)
  const httpApiEvent = functionConfig.events.find((e: any) => e.type === 'http-api-gateway') as
    | HttpApiIntegration
    | undefined;
  if (httpApiEvent) {
    const gatewayName = httpApiEvent.properties?.httpApiGatewayName;
    if (gatewayName) {
      // Get the gateway URL from deployed stack
      const gatewayResource = deployedStackOverviewManager.getStpResource({ nameChain: gatewayName });
      const gatewayUrl = gatewayResource?.referencableParams?.url?.value;
      if (gatewayUrl) {
        // Append the path if specified
        const path = httpApiEvent.properties?.path || '';
        const displayPath = path === '/{proxy+}' ? '/*' : path;
        return { url: `${gatewayUrl}${displayPath !== '/*' ? displayPath : ''}` };
      }
    }
    return { statusMessage: 'HTTP API' };
  }

  // Check other integration types and return descriptive status
  const eventType = functionConfig.events[0]?.type;
  const eventTypeLabels: Record<string, string> = {
    sqs: 'SQS trigger',
    sns: 'SNS trigger',
    schedule: 'Scheduled',
    kinesis: 'Kinesis trigger',
    'kafka-topic': 'Kafka trigger',
    'event-bus': 'EventBridge trigger',
    dynamodb: 'DynamoDB trigger',
    'cloudwatch-log': 'CloudWatch Logs',
    'cloudwatch-alarm': 'Alarm trigger',
    'application-load-balancer': 'ALB trigger'
  };

  return { statusMessage: eventTypeLabels[eventType] || `${eventType} trigger` };
};

const startFunctionWorkload = async (resourceName: string): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Deploying...' });
  }

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

  // Get integration info (URL or status message)
  const integrationInfo = getFunctionIntegrationInfo(resourceName);

  // Get package size (use zipped size for Lambda - already in MB)
  const packageSize = packagingOutput?.zippedSize ? `${packagingOutput.zippedSize} MB zipped` : undefined;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'running', { ...integrationInfo, size: packageSize });
    devTuiManager.log(resourceName, 'Function deployed');
  } else {
    tuiManager.info(`[${resourceName}] Function deployed`);
  }

  // Setup log streaming
  const cloudwatchLogPrinter = new LambdaCloudwatchLogPrinter({
    fetchSince: (await getAwsSynchronizedTime()).getTime(),
    logGroupAwsResourceName: getLogGroupInfoForStacktapeResource({ resourceName }).PhysicalResourceId,
    onLog: useDevTui
      ? (message, level) => {
          devTuiManager.log(resourceName, message, level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info');
        }
      : undefined
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
      const inRebuildPhase = devTuiManager.inRebuildPhase;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'packaging');
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Redeploying...' });
      } else {
        tuiManager.info(`[${resourceName}] Redeploying...`);
      }

      globalStateManager.args.resourceName = resourceName;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'updating-code');
      }

      const result = await buildAndUpdateFunctionCode(resourceName, { devMode: true });
      packagingManager.clearPackagedJobs();

      // Extract package size from result (use zipped size for Lambda - already in MB)
      const packageSize = result.packagingOutput?.zippedSize
        ? `${result.packagingOutput.zippedSize} MB zipped`
        : undefined;

      if (inRebuildPhase && packageSize) {
        devTuiManager.setRebuildSize(resourceName, packageSize);
      }

      if (!inRebuildPhase) {
        if (useDevTui) {
          devTuiManager.setWorkloadStatus(resourceName, 'running', { ...integrationInfo, size: packageSize });
          devTuiManager.log(resourceName, 'Function redeployed');
        } else {
          tuiManager.info(`[${resourceName}] Function redeployed`);
        }
      }

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

    if (char === 3) {
      await applicationManager.handleExitSignal('SIGINT');
      return;
    }

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

/**
 * Run beforeDev hooks with DevTui status updates and individual timing
 */
const runBeforeDevHooks = async () => {
  const useDevTui = devTuiManager.running;
  const hooks = configManager.hooks?.beforeDev || [];

  if (hooks.length === 0) {
    return;
  }

  // Get hooks with scriptName (references to scripts in the scripts section)
  const scriptHookRefs = hooks.filter((h): h is { scriptName: string } => 'scriptName' in h);

  if (!useDevTui) {
    // Without DevTui, just use eventManager
    await eventManager.processHooks({ captureType: 'START' });
    return;
  }

  // With DevTui, run hooks individually to track timing
  for (const hookRef of scriptHookRefs) {
    const hookName = hookRef.scriptName;
    devTuiManager.setHookStatus(hookName, 'running');

    // Get the actual script definition from configManager.scripts
    const scriptDefinition = configManager.scripts?.[hookName];
    if (!scriptDefinition) {
      devTuiManager.setHookStatus(hookName, 'error', { error: `Script "${hookName}" not found` });
      continue;
    }

    const startTime = Date.now();
    try {
      const executableFn = getExecutableScriptFunction({
        scriptDefinition: { ...scriptDefinition, scriptName: hookName } as any,
        hookTrigger: 'beforeDev'
      });
      await executableFn({ hookType: 'before' });

      const duration = Date.now() - startTime;
      devTuiManager.setHookStatus(hookName, 'success', { duration });
    } catch (err) {
      const duration = Date.now() - startTime;
      devTuiManager.setHookStatus(hookName, 'error', {
        error: err.message,
        duration
      });
      throw err;
    }
  }
};

// Cleanup on exit
applicationManager.registerCleanUpHook(async () => {
  for (const interval of state.logIntervals) {
    clearInterval(interval);
  }
  state.logIntervals = [];
  state.workloads.clear();
});

/**
 * Rebuild a specific workload by name (with new UI)
 */
export const rebuildWorkload = async (name: string): Promise<boolean> => {
  const workload = state.workloads.get(name);
  if (!workload) {
    return false;
  }

  // Clear old credential expiry timer before rebuild (will be re-registered with fresh credentials)
  clearCredentialExpiryTimer(name);

  // Update agent state to show rebuilding
  updateAgentWorkloadStatus(name, { status: 'starting' });

  // Start rebuild UI for single workload
  devTuiManager.startRebuild([name]);

  try {
    await workload.rebuild();
    devTuiManager.setRebuildDone(name);
    updateAgentWorkloadStatus(name, { status: 'running', error: undefined });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    devTuiManager.setRebuildError(name, errorMsg);
    updateAgentWorkloadStatus(name, { status: 'error', error: errorMsg });
  }

  await devTuiManager.finishRebuild();
  return true;
};

/**
 * Rebuild all workloads (with new UI, parallel execution)
 */
export const rebuildAllWorkloads = async (): Promise<void> => {
  const workloadNames = Array.from(state.workloads.keys());
  if (workloadNames.length === 0) return;

  // Clear old credential expiry timers before rebuild
  for (const name of workloadNames) {
    clearCredentialExpiryTimer(name);
    updateAgentWorkloadStatus(name, { status: 'starting' });
  }

  // Start rebuild UI for all workloads
  devTuiManager.startRebuild(workloadNames);

  // Run all rebuilds in parallel
  const rebuildPromises = Array.from(state.workloads.values()).map(async (workload) => {
    try {
      await workload.rebuild();
      devTuiManager.setRebuildDone(workload.name);
      updateAgentWorkloadStatus(workload.name, { status: 'running', error: undefined });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      devTuiManager.setRebuildError(workload.name, errorMsg);
      updateAgentWorkloadStatus(workload.name, { status: 'error', error: errorMsg });
    }
  });

  await Promise.all(rebuildPromises);
  await devTuiManager.finishRebuild();
};

/**
 * Get list of registered workload names
 */
export const getWorkloadNames = (): string[] => {
  return Array.from(state.workloads.keys());
};

/**
 * Get environment variables for a specific workload
 */
export const getWorkloadEnvVars = (name: string): Record<string, string> | null => {
  const workload = state.workloads.get(name);
  return workload?.envVars || null;
};
