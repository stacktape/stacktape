import type { SupportedPackagingType } from '@domain-services/packaging-manager/types';
import type { AnyFunction } from '@utils/type-helpers';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { execDocker, inspectDockerContainer, listDockerContainers, stopDockerContainer } from '@utils/docker';
import { getDirectiveParams, getIsDirective, startsLikeGetParamDirective } from '@utils/directives';
import { injectedParameterEnvVarName } from '@stacktape/naming/workload-names';
import { getAugmentedEnvironment } from '@utils/environment';
import { startPortForwardingSessions, substituteTunneledEndpointsInEnvironmentVars } from '@utils/ssm-session';
import { createCleanupHook } from './cleanup-utils';
import { LOCAL_WORKLOAD_HOST } from './container/network';
import {
  DEV_SESSION_DURATION_SECONDS,
  getLocalInvokeAwsCredentials,
  SESSION_DURATION_SECONDS
} from '../_utils/assume-role';
import type { EnvironmentVar } from '@stacktape/config/shared';
import { assertEnvironmentResolved } from './unresolved-environment';

// Track credential expiry timers per workload so they can be cleared on rebuild
const credentialExpiryTimers = new Map<string, NodeJS.Timeout>();

const registerCredentialExpiryTimer = (workloadName: string, timer: NodeJS.Timeout) => {
  // Clear any existing timer for this workload before adding new one
  const existingTimer = credentialExpiryTimers.get(workloadName);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  credentialExpiryTimers.set(workloadName, timer);
};

/**
 * Clear credential expiry timer for a specific workload.
 * Called when a workload is rebuilt to prevent spurious expiry warnings.
 */
export const clearCredentialExpiryTimer = (workloadName: string) => {
  const timer = credentialExpiryTimers.get(workloadName);
  if (timer) {
    clearTimeout(timer);
    credentialExpiryTimers.delete(workloadName);
  }
};

/**
 * Clear all credential expiry timers.
 * Called during cleanup.
 */
const clearCredentialExpiryTimers = () => {
  for (const timer of credentialExpiryTimers.values()) {
    clearTimeout(timer);
  }
  credentialExpiryTimers.clear();
};

export const resolveEnvironmentDirectives = async (environment: Record<string, any>): Promise<Record<string, any>> => {
  return configManager.resolveDirectives({ itemToResolve: environment, useLocalResolve: true, resolveRuntime: true });
};

/**
 * Substitute $ResourceParam directives for local workloads with their local addresses.
 * This allows env vars like $ResourceParam('privateService', 'address') to resolve locally.
 */
const substituteLocalWorkloadDirectives = (
  envVars: Record<string, any>,
  localWorkloadAddresses: Record<string, string>
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (typeof value === 'string' && getIsDirective(value) && startsLikeGetParamDirective(value)) {
      try {
        const params = getDirectiveParams('ResourceParam', value);
        const resourceName = params[0]?.value;
        const paramName = params[1]?.value;
        if (typeof resourceName === 'string' && localWorkloadAddresses[resourceName]) {
          // Substitute with local address if this is a local workload
          if (paramName === 'address' || paramName === 'url') {
            result[key] = localWorkloadAddresses[resourceName];
            continue;
          }
        }
      } catch {
        // Ignore parsing errors, let directive resolution handle it
      }
    }
    result[key] = value;
  }
  return result;
};

export const getDeployedBastionStpName = () => {
  const bastionResourceStpName =
    // ATM we do not allow specifying bastion during dev command but we might in future
    globalStateManager.args.bastionResource ||
    Object.entries(deployedStackOverviewManager.stackInfoMap?.resources || {}).find(([, { resourceType }]) => {
      return resourceType === 'bastion';
    })?.[0];
  return bastionResourceStpName;
};

export const getBastionTunnelsForResource = async ({
  resource,
  bastionStpName
}: {
  resource: StpContainerWorkload;
  bastionStpName: string;
}) => {
  const allTunnelTargets =
    (resource.connectTo || [])
      .map((target) => {
        return deployedStackOverviewManager.resolveBastionTunnelsForTarget({
          targetStpName: target,
          bastionStpName
        });
      })
      .flat() || [];
  return startPortForwardingSessions({ targets: allTunnelTargets });
};

export const getWorkloadEnvironmentVars = async (jobDetails: {
  workloadType: 'function' | 'batch-job' | 'multi-container-workload';
  jobName: string;
  workloadName: string;
  jobEnvironment: EnvironmentVar[];
  connectTo: string[];
  tunnels?: SsmPortForwardingTunnel[];
  packagingType?: SupportedPackagingType;
  entryfilePath?: string;
  nodeVersion?: number;
  /** Whether the local build leaves source maps next to the code. Dev builds do unless the config says otherwise. */
  sourceMapsInPackage?: boolean;
  localResourceEnvVars?: Record<string, string>;
  skipAwsCredentials?: boolean;
  /** Port for the container - will be set as PORT env var */
  port?: number;
  /** Local workload addresses for substituting $ResourceParam directives */
  localWorkloadAddresses?: Record<string, string>;
  /** Called when AWS does not let the developer assume the workload's role yet and the call waits for it. */
  onWaitingForAwsRole?: () => void;
  /**
   * The name a container on its own Docker network uses for this machine (`host.docker.internal`). Values Stacktape
   * sets for local databases, SSM tunnels and other local workloads then name it instead of loopback, as a bare host
   * too. Values the configuration states literally, and the workload's own address, stay as they are.
   */
  dockerHost?: string;
}): Promise<Record<string, any>> => {
  const { dockerHost, workloadName } = jobDetails;
  const toContainerHost = (value: string) => (dockerHost ? pointLoopbackAtHost(value, dockerHost) : value);
  // Augment environment with source maps and experimental flags for JS/TS workloads
  const augmentedEnv = getAugmentedEnvironment({
    environment: jobDetails.jobEnvironment || [],
    workloadType: jobDetails.workloadType,
    packagingType: jobDetails.packagingType,
    entryfilePath: jobDetails.entryfilePath,
    nodeVersion: jobDetails.nodeVersion,
    sourceMapsInPackage: jobDetails.sourceMapsInPackage ?? true
  });

  const envVars = augmentedEnv.reduce((acc, item) => {
    return { ...acc, [item.name]: item.value };
  }, {} as any);

  // Pre-substitute $ResourceParam directives for local workloads before directive resolution
  const localWorkloadAddresses = Object.fromEntries(
    Object.entries(jobDetails.localWorkloadAddresses || {}).map(([name, address]) => [
      name,
      name === workloadName ? address : toContainerHost(address)
    ])
  );
  const preSubstitutedEnvVars = substituteLocalWorkloadDirectives(envVars, localWorkloadAddresses);

  const resolvedEnvVars = await resolveEnvironmentDirectives(preSubstitutedEnvVars);
  assertEnvironmentResolved({ owner: workloadName, environment: resolvedEnvVars, configured: preSubstitutedEnvVars });
  // A `$ResourceParam` of a local database resolves to its loopback host or URL. Other directives (`$Secret`) and
  // literal values are the developer's and stay.
  for (const [name, configured] of Object.entries(preSubstitutedEnvVars)) {
    if (
      typeof configured === 'string' &&
      /\$(?:Cf)?ResourceParam\(/.test(configured) &&
      typeof resolvedEnvVars[name] === 'string'
    ) {
      resolvedEnvVars[name] = toContainerHost(resolvedEnvVars[name]);
    }
  }

  // Get AWS credentials unless skipped (for local-only mode)
  let awsCredentialsEnvVars: Record<string, string> = {};
  if (!jobDetails.skipAwsCredentials) {
    const isDevStack = globalStateManager.command === 'dev';
    awsCredentialsEnvVars = await getLocalInvokeAwsCredentials({
      assumeRoleOfWorkload: jobDetails.workloadName,
      isDevStack,
      onWaitingForTrust: jobDetails.onWaitingForAwsRole
    });
    const sessionDuration = isDevStack ? DEV_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
    const workloadName = jobDetails.workloadName;
    const expiryTimer = setTimeout(
      () => {
        tuiManager.warn(
          `AWS credentials for workload "${workloadName}" have expired. ` +
            `Rebuild this workload (press 'r' or use /rebuild/${workloadName}) to refresh credentials.`
        );
      },
      (sessionDuration - 120) * 1000
    );
    registerCredentialExpiryTimer(workloadName, expiryTimer);
  }

  // Resolve env vars from deployed connectTo resources
  const resolvedInjectedVars = await deployedStackOverviewManager.locallyResolveEnvVariablesFromConnectTo(
    jobDetails.connectTo || []
  );

  // Without a Docker host alias the container is on this machine's network (rootless Docker), where loopback works.
  const tunnelHost = dockerHost ?? LOCAL_WORKLOAD_HOST;
  const substitutedInjectedEnvVars = substituteTunneledEndpointsInEnvironmentVars({
    tunnels: jobDetails.tunnels || [],
    env: Object.entries(resolvedInjectedVars).map(([key, value]) => ({ name: key, value })),
    host: tunnelHost
  }).reduce(
    (acc, item) => {
      return { ...acc, [item.name]: item.value };
    },
    {} as Record<string, any>
  );

  // Adjust local resource env vars for Docker networking; the workload's own address stays as it is.
  const ownEnvNames = new Set(['url', 'address'].map((param) => injectedParameterEnvVarName(workloadName, param)));
  const adjustedLocalEnvVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(jobDetails.localResourceEnvVars || {})) {
    adjustedLocalEnvVars[key] = ownEnvNames.has(key)
      ? value
      : dockerHost
        ? toContainerHost(value)
        : value.replace(/localhost/g, tunnelHost);
  }

  // ECS sets both region variables; boto3 and the AWS CLI v1 read only AWS_DEFAULT_REGION.
  const environment: Record<string, any> = {
    AWS_REGION: globalStateManager.region,
    AWS_DEFAULT_REGION: globalStateManager.region,
    ...awsCredentialsEnvVars,
    ...resolvedEnvVars,
    ...substitutedInjectedEnvVars,
    ...adjustedLocalEnvVars
  };

  // Add PORT env var if specified
  if (jobDetails.port) {
    environment.PORT = String(jobDetails.port);
  }

  return environment;
};

/** Replaces a loopback host (`localhost`, `127.0.0.1`) in a URL, an address or a bare host value. */
export const pointLoopbackAtHost = (value: string, host: string) =>
  value.replace(/(?<![\w.-])(?:localhost|127\.0\.0\.1)(?![\w-]|\.\w)/g, host);

// @todo take from config
const getContainerStopWaitTime = () => 2;

export const resolveRunningContainersWithSamePort = async ({
  ports,
  onContainerStopped,
  autoStopConflicting
}: {
  ports: number[];
  onContainerStopped?: AnyFunction;
  /** When true, auto-stop conflicting containers without prompting (used when DevTUI is active) */
  autoStopConflicting?: boolean;
}) => {
  if (!ports || ports.length === 0) {
    return;
  }
  const runningContainers = await listDockerContainers();
  const portsSet = new Set(ports);

  // Find containers that have any of the requested ports mapped as public (host) ports
  // Only check TCP ports since we're mapping HTTP/TCP services
  const containersWithConflictingPorts = runningContainers.filter((container) =>
    container.Ports.some(
      (portInfo) =>
        portInfo.PublicPort !== undefined &&
        portsSet.has(portInfo.PublicPort) &&
        (portInfo.Type === 'tcp' || portInfo.Type === undefined) // Default to TCP if type not specified
    )
  );

  if (containersWithConflictingPorts.length) {
    // When autoStopConflicting is set (e.g., DevTUI mode), skip the prompt and auto-stop
    const shouldStopConflictingContainers = autoStopConflicting
      ? true
      : await tuiManager.promptConfirm({
          message: `The following containers have conflicting ports open. Would you like to remove them?:\n${containersWithConflictingPorts.map(
            (c) => `${c.Names.join(', ')} (${c.Id}).`
          )}`
        });
    if (shouldStopConflictingContainers) {
      await operationReporter.startEvent({
        eventType: 'STOP_CONTAINER',
        description: `Stopping ${containersWithConflictingPorts.length} conflicting container${containersWithConflictingPorts.length > 1 ? 's' : ''}`
      });
      await Promise.all(
        containersWithConflictingPorts.map((container) => stopDockerContainer(container.Id, getContainerStopWaitTime()))
      );
      await operationReporter.finishEvent({ eventType: 'STOP_CONTAINER' });
    }
    if (onContainerStopped) {
      onContainerStopped();
    }
  }
};

/** How long a stopped dev container may take to be removed before dev mode removes it itself. */
const CONTAINER_REMOVAL_WAIT_MS = 10_000;

/**
 * Stops a dev container and waits until it is gone. `docker run --rm` removes it a moment after it stops, and until then
 * a new container of the same name fails to start ("The container name ... is already in use").
 */
export const gracefullyStopContainer = async (containerName: string) => {
  const containerInfo = await inspectDockerContainer(containerName);
  if (!containerInfo?.Id) return;
  if (containerInfo.State?.Running) {
    const spinner = tuiManager.createSpinner({ text: 'Stopping container' });
    await stopDockerContainer(containerName, getContainerStopWaitTime());
    spinner.success();
  }
  const deadline = Date.now() + CONTAINER_REMOVAL_WAIT_MS;
  while ((await inspectDockerContainer(containerName)).Id) {
    if (Date.now() > deadline) {
      await execDocker(['container', 'rm', '--force', containerName], { skipHandleError: true }).catch(() => {});
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

/**
 * Register cleanup hook for credential timers.
 * Must be called explicitly when dev command starts, not at module import time,
 * to avoid side effects when this module is bundled into user code.
 */
export const registerCredentialCleanupHook = createCleanupHook('credential-timers', async () => {
  clearCredentialExpiryTimers();
});
