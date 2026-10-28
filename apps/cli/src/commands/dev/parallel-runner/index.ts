import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { LocalResourceInstance } from '../local-resources';
import type { RelayEndpoint, TunnelInfo } from '../tunnel-manager';
import type { RebuildStep } from 'src/app/tui-manager/dev/types';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { commandLifecycle } from '@application-services/command-lifecycle';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { stpErrors } from '@errors';
import { getJobName, injectedParameterEnvVarName } from '@stacktape/naming/workload-names';
import { dockerRun, execDocker, getDockerHostAddress, inspectDockerContainer } from '@utils/docker';
import { LambdaCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { createLogPollScheduler } from '@utils/cloudwatch-log-poller';
import { getResourceParamReferences } from '../resource-references';
import { ExpectedError } from '@utils/errors';
import { getAwsSynchronizedTime } from '@utils/time';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { buildAndUpdateFunctionCode } from 'src/commands/_utils/fn-deployment';
import { getLogGroupInfoForStacktapeResource } from 'src/commands/_utils/logs';
import { getExecutableScriptFunction } from 'src/commands/script-run/utils';
import { prepareImage, type PrepareImageResult } from '../container';
import { summarizeDockerBuildError } from '../container/build-error';
import { describeContainerExit } from '../container/exit-reason';
import { startCommandMayChangeData, waitUntilRunServes } from '../container/run-readiness';
import {
  DOCKER_HOST_NAME,
  ensureLoopbackRelays,
  findSpareLoopbackPort,
  resolveDevContainerNetwork,
  startPortSwitch,
  stopLoopbackRelays
} from '../container/network';
import { getFrontendEnvironment } from '../frontend-env';
import { startHostingBucketDevServer } from '../hosting-bucket';
import { categorizeConnectToResources, getLocalResourceEnvVars, startLocalResources } from '../local-resources';
import { startHealthMonitoring } from '../local-resources/health-monitor';
import { startNextjsWebDevServer } from '../nextjs-web';
import { startSsrWebDevServer } from '../ssr-web';
import type { DevServerState } from '../dev-server';
import type { SsrWebResourceType } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';
import { startTunnel } from '../tunnel-manager';
import { getDevNetworkSession, type DevNetworkSession } from '../dev-network-session';
import { ensureNamedProxyRoute } from '../named-proxy/manager';
import { getDevContainerName, getDevContainerOwnerDockerArgs } from '../cleanup-utils';
import { getContainerListenPort, isPortAvailable, reservePorts } from '../port-utils';
import {
  getBastionTunnelsForResource,
  getDeployedBastionStpName,
  getWorkloadEnvironmentVars,
  gracefullyStopContainer,
  resolveRunningContainersWithSamePort
} from '../utils';
import { updateAgentWorkloadStatus, type RebuildResult } from '../agent-server';
import { agentLog, type LogLevel } from '../agent-logger';
import { createLogLineGrouper } from '../log-grouping';
import {
  CATCH_UP_OVERLAP_MS,
  getLogReadStart,
  labelCatchUpLine,
  mapLambdaTaskPaths,
  parseSessionEnd,
  type PreviousSessionEnd,
  serializeSessionEnd
} from '../function-logs';
import { createConfigChangeDetector, type ConfigChange } from '../config-change';
import { createWorkloadRebuilder } from '../workload-rebuild';
import { startSourceWatcher } from '../source-watcher';
import { getSecretSourcedEnvNames } from '../agent-env-masking';
import type { HttpApiIntegration, WebSocketApiIntegration } from '@stacktape/config/events';
import type { StacktapeCliArgs } from 'src/config/cli/types';
import type { StackContext } from '@domain-services/stack-context';
import { localStatePaths } from 'src/config/local-state-paths';
import type { PackagingOutput } from '@stacktape/packaging/runtime-contracts';

type WorkloadType = 'container' | 'function' | 'hosting-bucket' | 'nextjs-web' | 'ssr-web';

const AWS_ROLE_WAIT_MESSAGE =
  'Waiting for AWS to accept that you may use the IAM role of this container (this can take several minutes)...';

/** How long a container workload may take from its start until its port accepts connections, migrations included. */
const CONTAINER_READY_TIMEOUT_MS = 120_000;

/** A failed container build's error longer than this is cut to the failing step's output (`summarizeDockerBuildError`). */
const MAX_BUILD_ERROR_LENGTH = 800;

type WorkloadInfo = {
  name: string;
  type: WorkloadType;
  resourceType: string;
  sourceFiles: string[];
  rebuild: () => Promise<void>;
  envVars?: Record<string, string>;
};

type ContainerPortBinding = {
  primaryHostPort: number;
  hostPortOffset: number;
  hostPorts: number[];
};

type ParallelRunnerState = {
  workloads: Map<string, WorkloadInfo>;
  sourceWatcher?: Awaited<ReturnType<typeof startSourceWatcher>>;
  /** Whether the configuration file differs from the one the session started with; unset when it cannot be read. */
  detectConfigChange?: () => Promise<ConfigChange>;
  /** When the session started its first builds. */
  sessionStartedAt?: number;
  localResources: LocalResourceInstance[];
  tunnels: SsmPortForwardingTunnel[];
  relayTunnels: TunnelInfo[];
  logPolls: Array<{ unregister: () => void }>;
};

const state: ParallelRunnerState = {
  workloads: new Map(),
  localResources: [],
  tunnels: [],
  relayTunnels: [],
  logPolls: []
};

const logReadNotices = new Set<string>();
/** Reports a problem reading Lambda logs once per session, not once per request, and never among the app's errors. */
const reportLogReadProblem = (key: string, message: string) => {
  if (logReadNotices.has(key)) return;
  logReadNotices.add(key);
  if (devTuiManager.agentMode) agentLog('dev', message, 'warn');
  else if (devTuiManager.running) devTuiManager.systemLog(message, 'warn');
  else tuiManager.warn(message);
};

/** One request budget for the Lambda logs of every function in this session (see `createLogPollScheduler`). */
const logPollScheduler = createLogPollScheduler({
  onThrottled: () =>
    reportLogReadProblem(
      'throttled',
      'CloudWatch is throttling log reads in this AWS account and region, so Lambda logs arrive late. Dev mode reads them less often until the throttling stops. Other dev sessions and tools that read logs in this account share the limit.'
    ),
  onError: (name, error) => {
    const message = error instanceof Error ? error.message : String(error);
    reportLogReadProblem(`${name}\0${message}`, `Reading the CloudWatch logs of ${name} failed: ${message}`);
  }
});

export const runParallelWorkloads = async (
  resources: { name: string; type: string; category: WorkloadType }[],
  selectedLocalResources: Set<string> | undefined,
  operation: { args: Readonly<StacktapeCliArgs>; stackContext: StackContext }
): Promise<void> => {
  const { args, stackContext } = operation;
  const { watch } = args;

  // All resources run - no filtering needed in new dev mode
  const filteredResources = resources;

  const usesWebSocketGateway = filteredResources.some((resource) =>
    getConfigResource(resource.name, resource.type)?.events?.some(
      (event: { type?: string }) => event.type === 'websocket-api-gateway'
    )
  );
  if (usesWebSocketGateway) {
    tuiManager.info(
      'WebSocket gateways stay deployed during dev. Stacktape hot-swaps their Lambda handlers; connect to the displayed wss:// URL.'
    );
  }

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

  // Databases that deployed dev functions reach through the dev box run locally too, even when no selected workload
  // references them: the functions are deployed either way.
  for (const resourceName of Object.values(getDevNetworkSession()?.placement.functions ?? {}).flat()) {
    allReferencedResources.add(resourceName);
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

  // Deployed dev functions reach local databases through the dev box: open the SSM session to its relay, keep the box
  // awake for this session, and open one tunnel per relayed database at its leased port. Local workloads start
  // meanwhile; the session reports ready once both are done.
  const devNetwork = getDevNetworkSession();
  const devNetworkConnected = devNetwork
    ? connectDevNetwork({ devNetwork, useDevTui, stackName: stackContext.stackName })
    : Promise.resolve();

  // Mark env injection as running
  if (useDevTui && state.localResources.length > 0) {
    devTuiManager.setSetupStepStatus('env-inject', 'running');
  }

  // Compute env vars and addresses for local container workloads (only for workloads explicitly referenced)
  const containerPortBindings = await allocateContainerPortBindings(
    filteredResources.filter((r) => r.category === 'container')
  );

  const {
    envVars: localWorkloadEnvVars,
    envVarsByWorkload: localWorkloadEnvVarsByName,
    addresses: localWorkloadAddresses,
    stackInfoWorkloads
  } = await getLocalWorkloadInfo(
    filteredResources.filter((r) => r.category === 'container'),
    allReferencedResources,
    containerPortBindings
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
  const localEnvVarsByResource = new Map<string, Record<string, string>>([
    ...state.localResources.map((instance): [string, Record<string, string>] => [
      instance.name,
      getLocalResourceEnvVars([instance])
    ]),
    ...Object.entries(localWorkloadEnvVarsByName)
  ]);
  // A frontend gets the local variables of the resources in its own `connectTo`, as its deployed server would, and
  // its dev server does not inherit the others, which dev mode sets on its own process.
  const getFrontendEnv = (resource: { name: string; type: string }) => {
    const connectTo: string[] = getConfigResource(resource.name, resource.type)?.connectTo ?? [];
    const connectedEnvVars: Record<string, string> = Object.assign(
      {},
      ...connectTo.map((name) => localEnvVarsByResource.get(name) ?? {}),
      deployedStackOverviewManager.getLocalDynamoDbEndpointEnvVars(connectTo)
    );
    const withheldEnvNames = Object.keys(allLocalEnvVars).filter((name) => !(name in connectedEnvVars));
    return { connectedEnvVars, withheldEnvNames };
  };
  const startPromises = filteredResources.map(async (resource) => {
    if (resource.category === 'container') {
      return startContainerWorkload(
        resource.name,
        resource.type,
        allLocalEnvVars,
        deployedResourceNames,
        localWorkloadAddresses,
        containerPortBindings.get(resource.name),
        args
      );
    } else if (resource.category === 'function') {
      return startFunctionWorkload(resource.name, stackContext);
    } else if (resource.category === 'hosting-bucket') {
      return startHostingBucketWorkload(resource.name, getFrontendEnv(resource));
    } else if (resource.category === 'nextjs-web') {
      return startNextjsWebWorkload(resource.name, getFrontendEnv(resource));
    } else if (resource.category === 'ssr-web') {
      return startSsrWebWorkload(resource.name, resource.type, getFrontendEnv(resource));
    }
  });

  await Promise.all(startPromises);
  await devNetworkConnected;

  // `dev` always runs the dev TUI, so `--watch` must not depend on it; the TUI replaces only the stdin `rs` commands.
  // The watcher is ready before dev mode reports ready, so an edit made right after the start is not missed.
  if (watch) {
    await setupFileWatching();
  }

  // Transition to running phase in DevTui
  if (useDevTui) {
    // Small delay to ensure final state updates are rendered
    await new Promise((resolve) => setTimeout(resolve, 100));
    devTuiManager.transitionToRunning();
  }

  if (!useDevTui) {
    if (!watch) {
      setupStdinRestart();
    }

    tuiManager.success(
      `All ${filteredResources.length} workloads running. ${watch ? '(watching for changes)' : "(type 'rs' + enter to rebuild all)"}`
    );
  }
};

const describeDevBoxStatus = (status: NonNullable<DevNetworkSession['connection']['status']>) => {
  if (status.phase === 'starting-box') return 'Starting the dev box…';
  if (status.phase === 'connecting') return 'Connecting to the dev box…';
  if (status.phase === 'reconnecting') return `Reconnecting: ${status.reason}`;
  return `dev box ${status.relay.relayHost}`;
};

/**
 * Waits for the dev box connection, then opens one tunnel per relayed database. When an attempt fails, the session
 * continues without waiting: the connection keeps retrying in the background and the tunnels open once it is ready.
 */
const connectDevNetwork = async ({
  devNetwork,
  useDevTui,
  stackName
}: {
  devNetwork: DevNetworkSession;
  useDevTui: boolean;
  stackName: string;
}) => {
  const { connection, placement, leases, owner, takeOver } = devNetwork;
  let reportFailure!: (reason: string) => void;
  const failed = new Promise<string>((resolve) => (reportFailure = resolve));
  let warnedReason: string | undefined;
  if (useDevTui) devTuiManager.setSetupStepStatus('dev-box', 'running', 'Connecting to the dev box…');
  connection.onStatus = (status) => {
    if (status.phase === 'reconnecting') reportFailure(status.reason);
    if (useDevTui) {
      devTuiManager.setSetupStepStatus(
        'dev-box',
        status.phase === 'ready' ? 'done' : 'running',
        describeDevBoxStatus(status)
      );
      return;
    }
    if (status.phase === 'starting-box') tuiManager.info('Starting the dev box…');
    if (status.phase === 'ready' && warnedReason) {
      tuiManager.success('Connected to the dev box again.');
      warnedReason = undefined;
    }
    // A failing attempt repeats every few seconds: warn once per reason, not once per attempt.
    if (status.phase === 'reconnecting' && status.reason !== warnedReason) {
      tuiManager.warn(`Dev box: ${status.reason}. Reconnecting…`);
      warnedReason = status.reason;
    }
  };
  const tunnelsOpened = connection
    .connect()
    .then((relay) => openRelayTunnels({ relay, placement, leases, owner, takeOver, stackName, useDevTui }))
    .catch(() => {});
  const failure = await Promise.race([tunnelsOpened.then(() => undefined), failed]);
  if (failure !== undefined && useDevTui) {
    tuiManager.warn(
      `Deployed dev functions can't reach the dev box yet: ${failure}. Stacktape keeps reconnecting in the background ` +
        'and opens the tunnels once the box answers.'
    );
  }
};

const openRelayTunnels = async ({
  relay,
  placement,
  leases,
  owner,
  takeOver,
  stackName,
  useDevTui
}: Pick<DevNetworkSession, 'placement' | 'leases' | 'owner' | 'takeOver'> & {
  relay: RelayEndpoint;
  stackName: string;
  useDevTui: boolean;
}) => {
  const relayed = [...new Set(Object.values(placement.functions).flat())];
  const opened: string[] = [];
  await Promise.all(
    relayed.map(async (resourceName) => {
      const localResource = state.localResources.find(({ name }) => name === resourceName);
      if (!localResource) {
        tuiManager.warn(`Local ${resourceName} is not running, so deployed functions can't reach it.`);
        return;
      }
      try {
        const result = await startTunnel({
          resourceName,
          localPort: localResource.actualPort,
          lease: { port: leases.get(resourceName)!, key: `${stackName}/${resourceName}` },
          owner,
          relay,
          takeOver
        });
        if ('tunnel' in result) {
          state.relayTunnels.push(result.tunnel);
          opened.push(resourceName);
        }
      } catch (error) {
        tuiManager.warn(
          `Failed to open the tunnel for ${resourceName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );
  if (useDevTui && relayed.length) {
    devTuiManager.setSetupStepStatus('tunnels', 'done', `${opened.length} of ${relayed.length} tunnel(s)`);
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

type LocalWorkloadInfoResult = {
  envVars: Record<string, string>;
  envVarsByWorkload: Record<string, Record<string, string>>;
  addresses: Record<string, string>;
  stackInfoWorkloads: { name: string; resourceType: string; url?: string; address?: string }[];
};

/**
 * Get env vars, addresses, and stack info for local container workloads.
 * - envVars/addresses: Only includes workloads explicitly referenced via connectTo or $ResourceParam
 * - stackInfoWorkloads: Includes ALL container workloads so $ResourceParam directives can resolve
 */
const getLocalWorkloadInfo = async (
  containerResources: { name: string; type: string }[],
  allReferencedResources: Set<string>,
  containerPortBindings: Map<string, ContainerPortBinding>
): Promise<LocalWorkloadInfoResult> => {
  const envVars: Record<string, string> = {};
  const envVarsByWorkload: Record<string, Record<string, string>> = {};
  const addresses: Record<string, string> = {};
  const stackInfoWorkloads: { name: string; resourceType: string; url?: string; address?: string }[] = [];
  if (!containerResources.length) return { envVars, envVarsByWorkload, addresses, stackInfoWorkloads };
  const tunnelHost = await getDockerHostAddress();

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
    const binding = containerPortBindings.get(resource.name);
    const hostPort = binding?.primaryHostPort || port;

    if (hostPort) {
      // For private-service, set ADDRESS (format: host:port)
      // For web-service/worker-service, set URL (format: http://host:port)
      if (workload.configParentResourceType === 'private-service') {
        const address = `${tunnelHost}:${hostPort}`;
        // Only set env vars for referenced workloads
        if (allReferencedResources.has(resource.name)) {
          envVarsByWorkload[resource.name] = { [injectedParameterEnvVarName(resource.name, 'address')]: address };
          addresses[resource.name] = address;
        }
        // Always add to stackInfoWorkloads for $ResourceParam resolution
        stackInfoWorkloads.push({ name: resource.name, resourceType: 'private-service', address });
      } else {
        const url = `http://${tunnelHost}:${hostPort}`;
        // Only set env vars for referenced workloads
        if (allReferencedResources.has(resource.name)) {
          envVarsByWorkload[resource.name] = { [injectedParameterEnvVarName(resource.name, 'url')]: url };
          addresses[resource.name] = url;
        }
        // Always add to stackInfoWorkloads for $ResourceParam resolution
        stackInfoWorkloads.push({ name: resource.name, resourceType: workload.configParentResourceType, url });
      }
    }
  }

  Object.assign(envVars, ...Object.values(envVarsByWorkload));
  return { envVars, envVarsByWorkload, addresses, stackInfoWorkloads };
};

const allocateContainerPortBindings = async (
  containerResources: { name: string; type: string; category: WorkloadType }[]
): Promise<Map<string, ContainerPortBinding>> => {
  const bindings = new Map<string, ContainerPortBinding>();
  const reserved = new Set<number>();

  const canUsePrimaryPort = async ({
    primaryPort,
    candidatePrimary,
    containerPorts
  }: {
    primaryPort: number;
    candidatePrimary: number;
    containerPorts: number[];
  }): Promise<boolean> => {
    const offset = candidatePrimary - primaryPort;
    for (const port of containerPorts) {
      const hostPort = port + offset;
      if (reserved.has(hostPort)) return false;
      if (!(await isPortAvailable(hostPort))) return false;
    }
    return true;
  };

  for (const resource of containerResources) {
    const workload = getConfigResource(resource.name, resource.type) as StpContainerWorkload | undefined;
    if (!workload) continue;

    const containerDef = workload.containers[0];
    const jobName = getJobName({
      workloadName: resource.name,
      workloadType: workload.configParentResourceType,
      containerName: containerDef.name
    });
    const containerDefinition = configManager.allContainerWorkloadContainers.find((job) => job.jobName === jobName);
    const containerPorts = (containerDefinition?.events || [])
      .map((event: any) => event.properties.containerPort)
      .filter((port: number | undefined) => typeof port === 'number' && port > 0) as number[];

    const primaryPort = containerPorts[0];
    if (!primaryPort) continue;

    let candidatePrimary = primaryPort;
    let chosenPrimary: number | null = null;
    for (let i = 0; i < 1000; i++) {
      if (await canUsePrimaryPort({ primaryPort, candidatePrimary, containerPorts })) {
        chosenPrimary = candidatePrimary;
        break;
      }
      candidatePrimary++;
    }

    if (!chosenPrimary) {
      throw new ExpectedError('DOCKER', `Could not allocate host ports for container workload "${resource.name}"`);
    }

    const offset = chosenPrimary - primaryPort;
    const hostPorts = containerPorts.map((port) => port + offset);
    hostPorts.forEach((port) => reserved.add(port));
    reservePorts(hostPorts);

    bindings.set(resource.name, {
      primaryHostPort: chosenPrimary,
      hostPortOffset: offset,
      hostPorts
    });
  }

  return bindings;
};

const startContainerWorkload = async (
  resourceName: string,
  resourceType: string,
  localResourceEnvVars: Record<string, string>,
  deployedConnectTo: string[],
  localWorkloadAddresses: Record<string, string>,
  portBinding: ContainerPortBinding | undefined,
  args: Readonly<StacktapeCliArgs>
): Promise<void> => {
  const useDevTui = devTuiManager.running;
  const showStatus = (statusMessage: string) => {
    if (useDevTui) devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage });
  };

  showStatus('Packaging...');

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

  // Check if resource is locally injected (not deployed to AWS)
  const isInjected = deployedStackOverviewManager.isLocallyInjectedResource(resourceName);

  // Run container
  const localContainerName = getDevContainerName({
    projectName: globalStateManager.targetStack.projectName,
    stage: globalStateManager.stage,
    workingDirectory: globalStateManager.workingDir,
    name: jobName
  });
  // A rebuilt container starts next to the running one under the other of the two names (see `rebuild`).
  const nextContainerName = `${localContainerName}-next`;
  await Promise.all([gracefullyStopContainer(localContainerName), gracefullyStopContainer(nextContainerName)]);
  const network = await resolveDevContainerNetwork();
  const hostNetwork = network.mode === 'host';
  const sessionId = randomUUID();
  const containerArgs = {
    ...args,
    dockerArgs: [
      ...(args.dockerArgs || []),
      `--label stacktape.dev-session=${sessionId}`,
      ...getDevContainerOwnerDockerArgs(),
      ...network.dockerArgs
    ]
  };

  const ports = (containerDefinition.events || []).map((event: any) => event.properties.containerPort);
  const primaryPort = ports[0];
  const hostPortOffset = portBinding?.hostPortOffset || 0;
  const hostPorts = ports.map((port: number) => port + hostPortOffset);
  const primaryHostPort = portBinding?.primaryHostPort || primaryPort;
  const listenPort = getContainerListenPort({ containerPort: primaryPort, hostPort: primaryHostPort, hostNetwork });
  if (hostNetwork && primaryPort && listenPort !== primaryPort) {
    const message = `Port ${primaryPort} is in use, so the container listens on PORT=${listenPort}. This Docker (rootless) runs dev containers on the host network, which cannot remap ports; an app that ignores PORT fails to start.`;
    if (useDevTui) devTuiManager.log(resourceName, message, 'warn');
    else tuiManager.warn(`[${resourceName}] ${message}`);
  }
  // On its own network, each run of the container publishes its ports on spare loopback ports, and port switches on
  // the stable host ports pass connections to the run that serves. On the host network, the container listens on the
  // stable port itself.
  const switched = !hostNetwork && ports.length > 0;
  // Two runs can run side by side unless both would listen on one port of the host network.
  const sideBySide = !hostNetwork || !ports.length;
  // A port behind a load balancer or an HTTP API serves HTTP; a rebuilt run must answer a request before it takes over.
  const servesHttp = ['application-load-balancer', 'http-api-gateway'].includes(containerDefinition.events?.[0]?.type);
  const packagingProperties = (containerDefinition.packaging as any)?.properties ?? {};
  const startCommand = [packagingProperties.startCommand, packagingProperties.command].flat().filter(Boolean).join(' ');
  const startupChangesData = startCommandMayChangeData(startCommand);
  const portSwitches: Awaited<ReturnType<typeof startPortSwitch>>[] = [];

  applicationManager.registerCleanUpHook(async () => {
    await Promise.all(
      [localContainerName, nextContainerName].map(async (name) => {
        const container = await inspectDockerContainer(name);
        if (container.Id && container.Config?.Labels?.['stacktape.dev-session'] === sessionId) {
          await gracefullyStopContainer(container.Id);
        }
      })
    );
    await Promise.all(portSwitches.map((portSwitch) => portSwitch.close()));
  });

  const proxyRoute = primaryHostPort
    ? await ensureNamedProxyRoute({ resourceName, targetPort: primaryHostPort })
    : undefined;
  const workloadUrl = primaryHostPort ? proxyRoute?.url || `http://localhost:${primaryHostPort}` : undefined;

  const resourceDeployedConnectTo = (resource.connectTo || []).filter((c) => deployedConnectTo.includes(c));
  // Skip AWS credentials for locally-injected resources (not deployed to AWS)
  const skipAwsCredentials = !stackManager.existingStackDetails || isInjected;
  const getFreshEnvironment = async (onWaitingForAwsRole?: () => void) => {
    const environment = await getWorkloadEnvironmentVars({
      jobEnvironment: (containerDefinition.environment || []).concat(
        (containerDefinition.secrets || []).map(({ name, valueFrom }) => ({ name, value: valueFrom }))
      ),
      jobName,
      workloadName: containerDefinition.workloadName,
      connectTo: resourceDeployedConnectTo,
      workloadType: 'multi-container-workload',
      tunnels: state.tunnels.filter((t) => resourceDeployedConnectTo.includes(t.targetInfo.targetStpName)),
      localResourceEnvVars: {
        ...localResourceEnvVars,
        ...deployedStackOverviewManager.getLocalDynamoDbEndpointEnvVars(resource.connectTo || [])
      },
      skipAwsCredentials,
      port: listenPort,
      localWorkloadAddresses,
      onWaitingForAwsRole,
      dockerHost: network.mode === 'bridge' ? DOCKER_HOST_NAME : undefined
    });
    // On its own network, the container reaches this machine's local databases and SSM tunnels, which listen on
    // loopback only, through relays, and other dev containers at their stable ports.
    await ensureLoopbackRelays(network, [
      ...state.localResources.map(({ actualPort }) => actualPort),
      ...state.tunnels.map(({ localPort }) => localPort)
    ]);
    return environment;
  };

  // A failed Docker build prints several KB of BuildKit progress. The error keeps the failing step's output, and the
  // full output goes to a file next to the session's log.
  // A failed build can read other files than the last successful one; the watcher follows them, so fixing any of them
  // rebuilds the container, as for a function.
  let attemptedSourceFiles: string[] | undefined;
  const buildImage = async () => {
    try {
      const image = await prepareImage(containerDefinition);
      packagingManager.takeAttemptedSourceFiles(jobName);
      return image;
    } catch (error) {
      attemptedSourceFiles = packagingManager.takeAttemptedSourceFiles(jobName);
      const workload = state.workloads.get(resourceName);
      if (attemptedSourceFiles && workload) workload.sourceFiles = attemptedSourceFiles;
      const message = error instanceof Error ? error.message : String(error);
      const summary = message.length > MAX_BUILD_ERROR_LENGTH ? summarizeDockerBuildError(message) : undefined;
      if (!summary) throw error;
      const outputFile = join(
        localStatePaths.devAgentDirectory({ workingDirectory: globalStateManager.workingDir }),
        `${resourceName}-build-output.txt`
      );
      await mkdir(dirname(outputFile), { recursive: true });
      await writeFile(outputFile, message);
      throw new ExpectedError('DOCKER', `${summary}\nFull build output: ${outputFile}`);
    }
  };

  // `docker run` stays attached while the container runs, so its exit is the container's. Only an exit of the run that
  // serves the workload (`current`) that dev mode did not cause (a rebuild or the shutdown) is a crash. Without this, a
  // container that crashed stayed "running" in the dashboard and agent.
  type ContainerRun = {
    name: string;
    image: PrepareImageResult;
    /** The host port of each of `ports`: spare loopback ports behind the port switches, or the stable ports. */
    publishedPorts: number[];
    exited: boolean;
    served: boolean;
    /** Dev mode stops it: its exit is no crash. */
    stopping: boolean;
    stderr: () => string;
  };
  let current: ContainerRun | undefined;
  const describeExit = (stderr: string) => {
    const reason = describeContainerExit(stderr);
    return reason ? `:${reason.includes('\n') ? '\n' : ' '}${reason}` : '.';
  };
  const reportUnexpectedExit = (run: ContainerRun) => {
    if (run !== current || run.stopping || applicationManager.isInterrupted) return;
    reportWorkloadError(`Container stopped unexpectedly${describeExit(run.stderr())}`);
  };
  const reportWorkloadError = (error: string) => {
    if (useDevTui) {
      devTuiManager.setWorkloadStatus(resourceName, 'error', { error });
      devTuiManager.log(resourceName, error, 'error');
    } else {
      tuiManager.error(`[${resourceName}] ${error}`);
    }
    updateAgentWorkloadStatus(resourceName, { status: 'error', error });
  };
  const stopRun = async (run: ContainerRun) => {
    run.stopping = true;
    if (!run.exited) await gracefullyStopContainer(run.name);
  };

  // The container's output of one run. With the dev TUI, lines of one message (a stack trace, a printed object) become
  // one log entry with the level its text shows; without it, they go to the terminal as they are. Standard error is
  // also kept, to explain an exit.
  const captureContainerOutput = () => {
    let stderr = '';
    const log = (message: string, level: LogLevel) => devTuiManager.log(resourceName, message, level);
    const stdoutGrouper = createLogLineGrouper({ stream: 'stdout', onEntry: log });
    const stderrGrouper = createLogLineGrouper({ stream: 'stderr', onEntry: log });
    return {
      transformStdoutLine: useDevTui
        ? (line: string) => {
            stdoutGrouper.push(line);
            return null; // Suppress console output when DevTui is active
          }
        : undefined,
      transformStderrLine: (line: string) => {
        stderr += `${line}\n`;
        if (!useDevTui) return line;
        stderrGrouper.push(line);
        return null;
      },
      flush: () => {
        stdoutGrouper.flush();
        stderrGrouper.flush();
      },
      stderr: () => stderr
    };
  };

  /** Starts a run of `image` named `name`; `waitUntilServing` tells when it serves. */
  const launchContainer = async (
    image: PrepareImageResult,
    containerEnvironment: Record<string, any>,
    name: string
  ): Promise<ContainerRun> => {
    const command = (containerDefinition.packaging as any)?.properties?.command;
    const output = captureContainerOutput();
    const publishedPorts = switched ? await Promise.all(ports.map(() => findSpareLoopbackPort())) : hostPorts;
    const run: ContainerRun = {
      name,
      image,
      publishedPorts,
      exited: false,
      served: false,
      stopping: false,
      stderr: output.stderr
    };
    dockerRun({
      name,
      image: image.imageName,
      command,
      environment: containerEnvironment,
      hostNetwork,
      portMappings: ports.map((port: number, index: number) => ({
        containerPort: port,
        hostPort: publishedPorts[index]!,
        // Published on loopback only: nothing else on the local network reaches a dev container.
        hostAddress: '127.0.0.1'
      })),
      // /app/dist rather than /app: the dev base image installs docker-required dependencies into
      // /app/node_modules, and a mount over /app would shadow them (the image CMD runs dist/index.js).
      volumeMounts: image.distFolderPath ? [{ hostPath: image.distFolderPath, containerPath: '/app/dist' }] : [],
      transformStdoutLine: output.transformStdoutLine,
      transformStderrLine: output.transformStderrLine,
      args: containerArgs
    })
      .catch(() => {})
      .then(() => {
        run.exited = true;
        output.flush();
        reportUnexpectedExit(run);
      });
    if (primaryHostPort) showStatus(`Waiting for the app to accept connections on port ${listenPort}...`);
    return run;
  };

  /**
   * Opens the stable ports before a run starts. When another program took one after the session allocated it, the
   * workload fails with the port's name, and no container runs unreachable.
   */
  const openPortSwitches = async () => {
    if (!switched || portSwitches.length) return;
    for (const port of hostPorts) {
      try {
        portSwitches.push(await startPortSwitch({ port }));
      } catch (error) {
        await Promise.all(portSwitches.splice(0).map((portSwitch) => portSwitch.close()));
        if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
        throw new ExpectedError(
          'DOCKER',
          `Port ${port} on this machine is in use by another program, so dev mode cannot serve ${resourceName} there. Stop the program that listens on it (\`lsof -iTCP:${port} -sTCP:LISTEN\` shows it), then rebuild ${resourceName}.`
        );
      }
    }
    // Other dev containers reach the stable ports through `host.docker.internal`.
    await ensureLoopbackRelays(network, hostPorts);
  };
  /** Makes `run` the one the stable ports lead to; on the host network it listens on them itself. */
  const routeTo = async (run: ContainerRun) => {
    await openPortSwitches();
    current = run;
    portSwitches.forEach((portSwitch, index) => portSwitch.setTarget(run.publishedPorts[index]!));
  };

  /** Waits until `run` serves (see `waitUntilRunServes`); a rebuilt run must also confirm it (`confirm`). */
  const waitUntilServing = async (
    run: ContainerRun,
    { timeoutMs = CONTAINER_READY_TIMEOUT_MS, confirm = false } = {}
  ): Promise<'ready' | 'timeout' | 'stopped'> => {
    const result = await waitUntilRunServes({
      port: primaryHostPort ? run.publishedPorts[0]! : undefined,
      servesHttp,
      confirm,
      timeoutMs,
      shouldStop: () => run.exited || run.stopping || applicationManager.isInterrupted
    });
    if (result === 'ready') run.served = true;
    return result;
  };

  const notServingError = `The container runs, but nothing accepted connections on port ${primaryHostPort} within ${
    CONTAINER_READY_TIMEOUT_MS / 1000
  } s. Make the app listen on the port in the PORT variable (${listenPort}). Dev mode keeps checking and marks it running once it serves.`;
  const showRunning = (message: string, extras: { size?: string } = {}) => {
    if (useDevTui) {
      devTuiManager.setWorkloadStatus(resourceName, 'running', {
        port: primaryHostPort,
        url: workloadUrl,
        error: undefined,
        ...extras
      });
      devTuiManager.log(resourceName, message);
    } else {
      tuiManager.info(`[${resourceName}] ${message}`);
    }
    updateAgentWorkloadStatus(resourceName, {
      status: 'running',
      url: workloadUrl,
      port: primaryHostPort,
      error: undefined
    });
  };
  // An app that needs longer than the timeout to listen is reported as an error, then becomes running once it serves.
  const watchForLateServing = (run: ContainerRun) =>
    void waitUntilServing(run, { timeoutMs: Number.POSITIVE_INFINITY }).then((result) => {
      if (result === 'ready' && run === current) {
        showRunning(`Container now accepts connections on port ${primaryHostPort}`);
      }
    });

  // Packaging and the environment (with credentials of the workload's role) are independent. On a new stage, AWS can
  // take minutes to let the developer assume the role; the status says so instead of "Packaging...".
  let packaged = false;
  let waitingForRole = false;
  const showWaitingForRole = () => showStatus(AWS_ROLE_WAIT_MESSAGE);
  // A container that fails to build, exits or never serves reports the workload's error, and the session keeps running
  // so that a rebuild can fix it.
  let imageResult: PrepareImageResult | undefined;
  let environment: Record<string, any> | undefined;
  try {
    [imageResult, environment] = await Promise.all([
      buildImage().then((image) => {
        packaged = true;
        if (waitingForRole) showWaitingForRole();
        return image;
      }),
      getFreshEnvironment(() => {
        waitingForRole = true;
        if (useDevTui) devTuiManager.log(resourceName, AWS_ROLE_WAIT_MESSAGE);
        else tuiManager.info(`[${resourceName}] ${AWS_ROLE_WAIT_MESSAGE}`);
        if (packaged) showWaitingForRole();
      }).finally(() => {
        waitingForRole = false;
      })
    ]);
    if (imageResult && environment) {
      // Auto-stop conflicting containers when DevTUI is active (can't prompt user)
      await resolveRunningContainersWithSamePort({ ports: hostPorts, autoStopConflicting: useDevTui });
      await openPortSwitches();
      const run = await launchContainer(imageResult, environment, localContainerName);
      await routeTo(run);
      const result = await waitUntilServing(run);
      if (result === 'ready') {
        if (useDevTui) {
          showRunning(`Container started on port ${primaryHostPort}`, { size: imageResult.details });
        } else {
          tuiManager.info(
            `[${resourceName}] Container started on port${hostPorts.length > 1 ? 's' : ''} ${hostPorts.join(', ')}`
          );
        }
      } else if (result === 'timeout') {
        reportWorkloadError(notServingError);
        watchForLateServing(run);
      }
      // 'stopped': the container exited, which `reportUnexpectedExit` reported.
    }
  } catch (error) {
    if (applicationManager.isInterrupted) throw error;
    reportWorkloadError(error instanceof Error ? error.message : String(error));
  }

  /** What a failed rebuild adds when the new run started its command: a migration in it may have run already. */
  const startupNote = startupChangesData ? ' Its startup command may already have changed the database.' : '';

  /**
   * Starts the previous build again after the new run failed once the previous one was stopped, and fails the rebuild
   * with `failure` and the outcome.
   */
  const restartPrevious = async (
    previous: ContainerRun,
    previousImageId: string | undefined,
    containerEnvironment: Record<string, any>,
    failure: string
  ): Promise<never> => {
    if (!previousImageId || applicationManager.isInterrupted) throw new ExpectedError('DOCKER', failure);
    await gracefullyStopContainer(previous.name);
    const restored = await launchContainer(
      { ...previous.image, imageName: previousImageId },
      containerEnvironment,
      previous.name
    );
    await routeTo(restored);
    const restoredResult = await waitUntilServing(restored);
    if (restoredResult === 'timeout') watchForLateServing(restored);
    throw new ExpectedError(
      'DOCKER',
      `${failure}\n${
        restoredResult === 'stopped'
          ? 'The previous build was started again, and it exited too.'
          : 'The previous build was started again and serves requests.'
      }${startupNote}`
    );
  };

  /**
   * The run that serves takes the container's own name once the previous one is gone, so `docker ps` shows the same
   * name after every rebuild; the `-next` name is only for the run that starts beside it.
   */
  const takeStableName = async (run: ContainerRun) => {
    if (run.name === localContainerName || run.exited) return;
    await gracefullyStopContainer(localContainerName);
    const { exitCode } = await execDocker(['rename', run.name, localContainerName], { skipHandleError: true }).catch(
      () => ({ exitCode: 1 })
    );
    if (exitCode === 0) run.name = localContainerName;
  };

  /**
   * On its own network, the new container starts next to the running one and takes the stable ports over once it
   * serves and keeps running (see `waitUntilServing`); the previous one stops then. When the new one exits first, or
   * does not serve in time, the previous one keeps serving. When it exits while the previous one stops, the previous
   * build starts again. The two runs alternate between two container names.
   */
  const replaceBesideCurrent = async (image: PrepareImageResult, containerEnvironment: Record<string, any>) => {
    await openPortSwitches();
    const previous = current && !current.exited ? current : undefined;
    const previousImageId = previous && (await inspectDockerContainer(previous.name)).Image;
    const name = previous?.name === localContainerName ? nextContainerName : localContainerName;
    await gracefullyStopContainer(name);
    const run = await launchContainer(image, containerEnvironment, name);
    const result = await waitUntilServing(run, { confirm: true });
    if (result === 'ready' || (result === 'timeout' && !previous?.served)) {
      await routeTo(run);
      if (previous) await stopRun(previous);
      if (run.exited && !applicationManager.isInterrupted) {
        const failure = `Container "${resourceName}" exited right after it started serving${describeExit(run.stderr())}`;
        if (previous) await restartPrevious(previous, previousImageId, containerEnvironment, failure);
        throw new ExpectedError('DOCKER', failure);
      }
      await takeStableName(run);
      if (result === 'timeout') {
        watchForLateServing(run);
        throw new ExpectedError('DOCKER', notServingError);
      }
      return;
    }
    if (applicationManager.isInterrupted) return;
    const stillServes =
      previous?.served && !previous.exited ? `\nThe previous build still serves requests.${startupNote}` : '';
    if (result === 'timeout') {
      await stopRun(run);
      throw new ExpectedError(
        'DOCKER',
        `The new container ran, but it did not ${servesHttp ? 'answer an HTTP request' : 'accept connections'} on port ${listenPort} within ${
          CONTAINER_READY_TIMEOUT_MS / 1000
        } s, so dev mode stopped it. Make the app listen on the port in the PORT variable.${stillServes}`
      );
    }
    throw new ExpectedError(
      'DOCKER',
      `Container "${resourceName}" exited before it served${describeExit(run.stderr())}${stillServes}`
    );
  };

  /**
   * On the host network, two runs cannot listen on one port: the previous container stops first. When the new one exits
   * before it serves, or right after, the previous image starts again.
   */
  const replaceInPlace = async (image: PrepareImageResult, containerEnvironment: Record<string, any>) => {
    const previous = current && !current.exited ? current : undefined;
    const previousImageId = previous && (await inspectDockerContainer(previous.name)).Image;
    if (previous) await stopRun(previous);
    const run = await launchContainer(image, containerEnvironment, localContainerName);
    const result = await waitUntilServing(run, { confirm: true });
    if (result === 'ready' || result === 'timeout') {
      await routeTo(run);
      if (result === 'timeout') {
        watchForLateServing(run);
        throw new ExpectedError('DOCKER', notServingError);
      }
      return;
    }
    if (applicationManager.isInterrupted) return;
    const exitError = `Container "${resourceName}" exited before it served${describeExit(run.stderr())}`;
    if (!previous) throw new ExpectedError('DOCKER', exitError);
    await restartPrevious(previous, previousImageId, containerEnvironment, exitError);
  };

  // Register workload for file watching
  const rebuild = async () => {
    const inRebuildPhase = devTuiManager.inRebuildPhase;
    const showRebuildStep = (step: RebuildStep, statusMessage: string) => {
      if (inRebuildPhase) devTuiManager.setRebuildStep(resourceName, step);
      if (useDevTui) showStatus(statusMessage);
      else tuiManager.info(`[${resourceName}] ${statusMessage}`);
    };

    // The running container serves until the new image is built: a build error leaves it running, as a function that
    // fails to build keeps its previous code.
    showRebuildStep('packaging', 'Building the image...');
    const newImage = await buildImage();
    if (inRebuildPhase && newImage.details) {
      devTuiManager.setRebuildSize(resourceName, newImage.details);
    }

    // Always re-fetch env (and IAM credentials) on explicit restart/rebuild.
    const rebuiltEnvironment = await getFreshEnvironment();

    showRebuildStep(
      'starting',
      sideBySide ? 'Starting the new container next to the running one...' : 'Replacing the container...'
    );
    // The rebuild succeeds once the new container serves; one that exits or never serves fails it.
    if (sideBySide) await replaceBesideCurrent(newImage, rebuiltEnvironment);
    else await replaceInPlace(newImage, rebuiltEnvironment);
    // A run that exited during the rebuild fails it, even when it had served: the status set after a successful
    // rebuild would otherwise hide the crash. Nothing runs between this check and that status.
    if (current?.exited && !applicationManager.isInterrupted) {
      throw new ExpectedError(
        'DOCKER',
        `Container "${resourceName}" stopped during the rebuild${describeExit(current.stderr())}`
      );
    }

    // Also after a failed start: the status gets the address the workload serves at.
    if (useDevTui && primaryHostPort) {
      devTuiManager.setWorkloadStatus(resourceName, inRebuildPhase ? 'starting' : 'running', {
        port: primaryHostPort,
        url: workloadUrl
      });
    }
    if (primaryHostPort) updateAgentWorkloadStatus(resourceName, { url: workloadUrl, port: primaryHostPort });
    if (!inRebuildPhase) {
      if (useDevTui) devTuiManager.log(resourceName, 'Container restarted');
      else tuiManager.info(`[${resourceName}] Container restarted`);
    }

    return { sourceFiles: newImage.sourceFiles, size: newImage.details, environment: rebuiltEnvironment };
  };
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'container',
    resourceType,
    sourceFiles: imageResult?.sourceFiles ?? attemptedSourceFiles ?? [],
    envVars: environment,
    rebuild: async () => {
      const result = await rebuild();
      const workload = state.workloads.get(resourceName);
      if (workload) {
        workload.sourceFiles = result.sourceFiles;
        workload.envVars = result.environment;
      }
    }
  });
};

type FrontendEnv = { connectedEnvVars: Record<string, string>; withheldEnvNames: string[] };

const startHostingBucketWorkload = async (resourceName: string, { withheldEnvNames }: FrontendEnv): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  // startHostingBucketDevServer handles its own onStateChange callback
  // which updates the workload status with URL and compile time
  await startHostingBucketDevServer({ name: resourceName, withheldEnvNames });

  // Dev server handles its own hot reload, no need to track source files
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'hosting-bucket',
    resourceType: 'hosting-bucket',
    sourceFiles: [],
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

      const restartResult = await startHostingBucketDevServer({ name: resourceName, withheldEnvNames });

      assertDevServerRestarted(resourceName, restartResult);
    }
  });
};

const startNextjsWebWorkload = async (resourceName: string, frontendEnv: FrontendEnv): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  // startNextjsWebDevServer handles its own onStateChange callback
  // which updates the workload status with URL and compile time
  await startNextjsWebDevServer({ name: resourceName, ...frontendEnv });

  // Dev server handles its own hot reload, no need to track source files
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'nextjs-web',
    resourceType: 'nextjs-web',
    sourceFiles: [],
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

      const restartResult = await startNextjsWebDevServer({ name: resourceName, ...frontendEnv });

      assertDevServerRestarted(resourceName, restartResult);
    }
  });
};

const startSsrWebWorkload = async (
  resourceName: string,
  resourceType: string,
  frontendEnv: FrontendEnv
): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Starting dev server...' });
  }

  await startSsrWebDevServer({
    name: resourceName,
    resourceType: resourceType as SsrWebResourceType,
    ...frontendEnv
  });

  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'ssr-web',
    resourceType,
    sourceFiles: [],
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
        ...frontendEnv
      });

      assertDevServerRestarted(resourceName, restartResult);
    }
  });
};

/** A frontend's rebuild restarts its dev server, so a server that fails to start fails the rebuild. */
const assertDevServerRestarted = (resourceName: string, result: DevServerState) => {
  if (result.status === 'error') throw new Error(result.error || 'The dev server failed to start.');
  if (result.url) devTuiManager.setWorkloadStatus(resourceName, 'running', { url: result.url });
};

/**
 * Get the primary integration info for a Lambda function.
 * Returns URL for HTTP API Gateway integrations, or a description for other event types.
 */
const getFunctionIntegrationInfo = (resourceName: string): { url?: string; statusMessage?: string } => {
  const functionConfig = configManager.functions.find((f) => f.name === resourceName);
  // A function URL is the function's own address, also when events invoke it too.
  if (functionConfig?.url?.enabled) {
    const functionUrl = deployedStackOverviewManager.getStpResource({ nameChain: resourceName })?.referencableParams
      ?.url?.value;
    if (functionUrl) return { url: String(functionUrl) };
  }
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

  const websocketEvent = functionConfig.events.find(
    (event): event is WebSocketApiIntegration => event.type === 'websocket-api-gateway'
  );
  if (websocketEvent) {
    const gatewayResource = deployedStackOverviewManager.getStpResource({
      nameChain: websocketEvent.properties.websocketApiGatewayName
    });
    const gatewayUrl = gatewayResource?.referencableParams?.url?.value;
    if (gatewayUrl) {
      return { url: gatewayUrl.toString() };
    }
    return { statusMessage: `WebSocket ${websocketEvent.properties.routeKey}` };
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

/** The function's entry file, which a file watcher follows when its failed build did not report its files. */
const getFunctionEntryFiles = (resourceName: string): string[] => {
  const entryfilePath = (
    configManager.functions.find(({ name }) => name === resourceName)?.packaging?.properties as
      | { entryfilePath?: string }
      | undefined
  )?.entryfilePath;
  return entryfilePath ? [join(globalStateManager.workingDir, entryfilePath)] : [];
};

let previousSessionEnd: Promise<PreviousSessionEnd | undefined> | undefined;
/** The log readers of this session's functions, whose shown events the next session skips. */
const functionLogPrinters = new Set<LambdaCloudwatchLogPrinter>();
/** The earliest time this session's log readers read from: before it, nothing they skipped was shown by this session. */
let sessionLogReadStart: number | undefined;
/**
 * When the previous dev session of this stage in this directory ended and what it showed last (see `getLogReadStart`).
 * The first call also records this session's end for the next one, in AWS time: `now` is AWS time, and the offset
 * corrects this machine's clock at the end.
 */
const readPreviousSessionEnd = (now: number) => {
  if (previousSessionEnd) return previousSessionEnd;
  const file = localStatePaths.devSessionEndFile({
    workingDirectory: globalStateManager.workingDir,
    stage: globalStateManager.stage
  });
  const clockOffset = now - Date.now();
  applicationManager.registerCleanUpHook(async () => {
    const end = Date.now() + clockOffset;
    const shownEvents: Record<string, Array<[string, number]>> = {};
    for (const printer of functionLogPrinters) {
      shownEvents[printer.logGroupName] = printer.shownEventsSince(end - CATCH_UP_OVERLAP_MS);
    }
    await mkdir(dirname(file), { recursive: true });
    const overlapStart = Math.max(end - CATCH_UP_OVERLAP_MS, sessionLogReadStart ?? end);
    await writeFile(file, serializeSessionEnd({ end, overlapStart, shownEvents }));
  });
  previousSessionEnd = readFile(file, 'utf8').then(parseSessionEnd, () => undefined);
  return previousSessionEnd;
};

const startFunctionWorkload = async (resourceName: string, stackContext: StackContext): Promise<void> => {
  const useDevTui = devTuiManager.running;

  if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Deploying...' });
  }

  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!deployedStpResource) {
    throw stpErrors.e6({
      resourceName,
      resourceType: 'function',
      stackName: stackContext.stackName
    });
  }

  // Build and deploy. A function whose code the dev stack already runs (the stack update just deployed it, or the
  // previous session's last rebuild did) is left alone. A function that fails to build keeps its previous code and is
  // reported as `error`; the session goes on, and a rebuild after the fix deploys it.
  let packagingOutput: PackagingOutput | undefined;
  let codeUnchanged = false;
  let startError: string | undefined;
  // The files a failed build reads: the watcher rebuilds the function when one of them changes, as after a success.
  let attemptedSourceFiles: string[] | undefined;
  try {
    ({ packagingOutput, codeUnchanged } = await buildAndUpdateFunctionCode(resourceName, {
      devMode: true,
      skipUnchangedCode: true
    }));
  } catch (error) {
    if (applicationManager.isInterrupted) throw error;
    startError = error instanceof Error ? error.message : String(error);
  } finally {
    attemptedSourceFiles = packagingManager.takeAttemptedSourceFiles(resourceName);
    packagingManager.clearPackagedJobs();
  }

  // Get integration info (URL or status message)
  const integrationInfo = getFunctionIntegrationInfo(resourceName);

  // Get package size (use zipped size for Lambda - already in MB)
  const packageSize = packagingOutput?.zippedSize ? `${packagingOutput.zippedSize} MB zipped` : undefined;

  if (startError !== undefined) {
    const message = `Not deployed, the function runs its previous code: ${startError}`;
    if (useDevTui) {
      devTuiManager.setWorkloadStatus(resourceName, 'error', { ...integrationInfo, error: startError });
      devTuiManager.log(resourceName, message, 'error');
    } else {
      tuiManager.error(`[${resourceName}] ${message}`);
    }
    updateAgentWorkloadStatus(resourceName, { status: 'error', error: startError });
  } else if (useDevTui) {
    devTuiManager.setWorkloadStatus(resourceName, 'running', { ...integrationInfo, size: packageSize });
    devTuiManager.log(resourceName, codeUnchanged ? 'Function code unchanged, already deployed' : 'Function deployed');
  } else {
    tuiManager.info(
      `[${resourceName}] ${codeUnchanged ? 'Function code unchanged, already deployed' : 'Function deployed'}`
    );
  }

  // Setup log streaming. Entries from before this point come from the gap between the previous session and this one.
  const now = (await getAwsSynchronizedTime()).getTime();
  const sessionEnd = await readPreviousSessionEnd(now);
  const fetchSince = getLogReadStart({ previousSessionEnd: sessionEnd, now });
  sessionLogReadStart = Math.min(sessionLogReadStart ?? fetchSince, fetchSince);
  const logGroupName = getLogGroupInfoForStacktapeResource({
    resourceName,
    stackName: stackContext.stackName,
    stackResources: stackManager.existingStackResources
  }).PhysicalResourceId;
  const cloudwatchLogPrinter = new LambdaCloudwatchLogPrinter({
    fetchSince,
    logGroupAwsResourceName: logGroupName,
    alreadyShown: sessionEnd?.shownEvents?.[logGroupName],
    onLog: (message, level, timestamp) => {
      const mapped = mapLambdaTaskPaths({
        message,
        sourceFiles: state.workloads.get(resourceName)?.sourceFiles ?? [],
        workingDirectory: globalStateManager.workingDir
      });
      const beforeReady = fetchSince < now && timestamp !== undefined && timestamp <= now;
      const text = beforeReady
        ? labelCatchUpLine({ message: mapped, timestamp, previousSessionEnd: sessionEnd?.end })
        : mapped;
      if (useDevTui) devTuiManager.log(resourceName, text, level, timestamp);
      else if (level === 'error') console.error(text);
      else console.info(text);
    }
  });

  const logPoll = logPollScheduler.register(resourceName, () => cloudwatchLogPrinter.printLogs());
  state.logPolls.push(logPoll);
  functionLogPrinters.add(cloudwatchLogPrinter);

  // Register workload
  state.workloads.set(resourceName, {
    name: resourceName,
    type: 'function',
    resourceType: 'function',
    // A build that failed before it knew its files (a JavaScript bundle) leaves the entry file to watch.
    sourceFiles:
      packagingOutput?.sourceFiles.map((f: any) => f.path) ??
      attemptedSourceFiles ??
      getFunctionEntryFiles(resourceName),
    rebuild: async () => {
      const inRebuildPhase = devTuiManager.inRebuildPhase;

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'packaging');
      } else if (useDevTui) {
        devTuiManager.setWorkloadStatus(resourceName, 'starting', { statusMessage: 'Redeploying...' });
      } else {
        tuiManager.info(`[${resourceName}] Redeploying...`);
      }

      if (inRebuildPhase) {
        devTuiManager.setRebuildStep(resourceName, 'updating-code');
      }

      let result: Awaited<ReturnType<typeof buildAndUpdateFunctionCode>>;
      try {
        result = await buildAndUpdateFunctionCode(resourceName, { devMode: true });
      } catch (error) {
        // A failed build can read other files than the last successful one, such as a module the edit started to
        // import: the watcher follows them, so fixing any of them rebuilds the function. A retry records them again.
        const attempted = packagingManager.takeAttemptedSourceFiles(resourceName);
        const workload = state.workloads.get(resourceName);
        if (attempted && workload) workload.sourceFiles = attempted;
        throw error;
      } finally {
        packagingManager.clearPackagedJobs();
      }
      packagingManager.takeAttemptedSourceFiles(resourceName);

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

      await cloudwatchLogPrinter.skipEarlierEvents();
      logPoll.boost();
      const workload = state.workloads.get(resourceName);
      if (workload) {
        workload.sourceFiles = result.packagingOutput.sourceFiles.map((f: any) => f.path);
      }
    }
  });
};

/**
 * Records the configuration this session loaded, before anything starts, so a rebuild can tell when the file no longer
 * matches it. An edit made while the session starts counts as a change too.
 */
export const captureSessionConfig = () => {
  state.sessionStartedAt = Date.now();
  const configPath = globalStateManager.configPath;
  if (!configPath || !configManager.rawConfig) return;
  state.detectConfigChange = createConfigChangeDetector({
    configPath,
    sessionConfig: configManager.rawConfig,
    loadConfig: () => configManager.configResolver.reloadRawConfig()
  });
};

const getWorkloadSourceFiles = () =>
  new Map([...state.workloads].map(([name, workload]) => [name, workload.sourceFiles]));

const rebuilder = createWorkloadRebuilder({
  rebuild: (name) => state.workloads.get(name)!.rebuild(),
  detectConfigChange: () => state.detectConfigChange?.() ?? Promise.resolve({ changed: false }),
  getSourceFiles: getWorkloadSourceFiles,
  getSessionStartedAt: () => state.sessionStartedAt ?? 0
});

const setupFileWatching = async () => {
  state.sourceWatcher = await startSourceWatcher({
    getSourceFiles: getWorkloadSourceFiles,
    configPath: globalStateManager.configPath || undefined,
    onWorkloadChange: async ({ workloads, changedFile }) => {
      tuiManager.info(`File changed: ${tuiManager.prettyFilePath(changedFile)} -> rebuilding ${workloads.join(', ')}`);
      // The same path as a rebuild key or agent request, so the TUI and agent status follow the rebuild.
      await rebuilder.rebuildWorkloads(workloads.filter((name) => state.workloads.has(name)));
    },
    onConfigChange: rebuilder.onConfigFileChange,
    onUnmatchedChange: (changedFile) =>
      tuiManager.info(`File changed: ${tuiManager.prettyFilePath(changedFile)} (no matching workload)`)
  });
  applicationManager.registerCleanUpHook(async () => {
    await state.sourceWatcher?.close();
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
      await rebuildAllWorkloads();
      return;
    }

    // Check if input matches a workload name (for targeted restart)
    await rebuildWorkload(str.replace('rs ', ''));
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
    // Without DevTui, run hooks through the command lifecycle directly.
    await commandLifecycle.processHooks({ captureType: 'START' });
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
  for (const logPoll of state.logPolls) logPoll.unregister();
  state.logPolls = [];
  logPollScheduler.stop();
  state.workloads.clear();
  await stopLoopbackRelays();
});

/** Rebuilds one workload; `undefined` when dev mode runs no workload of that name (see `rebuildWorkload` of the rebuilder). */
export const rebuildWorkload = (name: string): Promise<RebuildResult | undefined> =>
  rebuilder.rebuildWorkload(name, state.workloads.has(name));

export const rebuildAllWorkloads = (): Promise<RebuildResult> =>
  rebuilder.rebuildWorkloads([...state.workloads.keys()]);

/**
 * Get environment variables for a specific workload
 */
export const getWorkloadEnvVars = (name: string): Record<string, string> | null => {
  const workload = state.workloads.get(name);
  return workload?.envVars || getFrontendEnvironment(name) || null;
};

export const getWorkloadSecretEnvNames = (name: string): Set<string> => {
  const workload = state.workloads.get(name);
  return getSecretSourcedEnvNames(workload ? getConfigResource(name, workload.resourceType) : undefined);
};
