import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { FSWatcher } from 'chokidar';
import type { Stats } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { inspectDockerContainer, listDockerContainers, stopDockerContainer } from '@shared/utils/docker';
import { getDirectiveParams, getIsDirective, startsLikeGetParamDirective } from '@utils/directives';
import { getAugmentedEnvironment } from '@utils/environment';
import { startPortForwardingSessions, substituteTunneledEndpointsInEnvironmentVars } from '@utils/ssm-session';
import chokidar from 'chokidar';
import { createCleanupHook } from './cleanup-utils';
import {
  DEV_SESSION_DURATION_SECONDS,
  getLocalInvokeAwsCredentials,
  SESSION_DURATION_SECONDS
} from '../_utils/assume-role';

type OnChangeFn = (props: { stats: Stats; changedFile: string }) => any;

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
export const clearCredentialExpiryTimers = () => {
  for (const timer of credentialExpiryTimers.values()) {
    clearTimeout(timer);
  }
  credentialExpiryTimers.clear();
};

export class SourceCodeWatcher {
  watcher: FSWatcher;
  currentlyWatchedFiles: string[];
  onChangeFn: OnChangeFn;

  constructor() {
    if (!this.watcher) {
      this.watcher = chokidar.watch([], { persistent: true, disableGlobbing: true });
    }
    this.watcher.on('change', async (changedFile, stats) => {
      try {
        await this.onChangeFn({ stats, changedFile });
      } catch (err) {
        applicationManager.gracefullyHandleError(err);
        this.addFilesToWatch(this.currentlyWatchedFiles);
      }
    });
  }

  get watchedFiles() {
    return Object.entries(this.watcher.getWatched())
      .map(([folder, files]) => files.map((file) => join(folder, file)))
      .flat();
  }

  unwatchAllFiles = () => {
    this.watcher.unwatch(Array.from(this.currentlyWatchedFiles));
  };

  addFilesToWatch = (filesToWatch: string[]) => {
    const adjustedFilesToWatch = filesToWatch.map((filePath) =>
      isAbsolute(filePath) ? filePath : join(process.cwd(), filePath)
    );
    this.watcher.add(adjustedFilesToWatch);
    this.currentlyWatchedFiles = adjustedFilesToWatch;
  };

  watch = ({ filesToWatch, onChangeFn }: { filesToWatch: string[]; onChangeFn: OnChangeFn }) => {
    this.onChangeFn = onChangeFn;
    this.addFilesToWatch(filesToWatch);
  };
}

export const hookToRestartStdinInput = (onRestart: AnyFunction) => {
  if (devTuiManager.running) {
    return;
  }
  applicationManager.setUsesStdinWatch();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }
  // process.stdin.pause();
  // process.stdin.resume();
  process.stdin.removeAllListeners();
  process.stdin.on('data', async (data) => {
    if (applicationManager.isInterrupted) {
      return;
    }
    const str = data.toString().trim().toLowerCase();
    const char = data.toString().charCodeAt(0);
    if (char === 3) {
      await applicationManager.handleExitSignal('SIGINT');
      return;
    }
    if (str === 'rs') {
      await onRestart();
    } else if (char === 12) {
      console.clear();
    }
  });
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
  localResourceEnvVars?: Record<string, string>;
  skipAwsCredentials?: boolean;
  /** Port for the container - will be set as PORT env var */
  port?: number;
  /** Local workload addresses for substituting $ResourceParam directives */
  localWorkloadAddresses?: Record<string, string>;
}): Promise<Record<string, any>> => {
  // Augment environment with source maps and experimental flags for JS/TS workloads
  const augmentedEnv = getAugmentedEnvironment({
    environment: jobDetails.jobEnvironment || [],
    workloadType: jobDetails.workloadType,
    packagingType: jobDetails.packagingType,
    entryfilePath: jobDetails.entryfilePath,
    nodeVersion: jobDetails.nodeVersion
  });

  const envVars = augmentedEnv.reduce((acc, item) => {
    return { ...acc, [item.name]: item.value };
  }, {} as any);

  // Pre-substitute $ResourceParam directives for local workloads before directive resolution
  const preSubstitutedEnvVars = substituteLocalWorkloadDirectives(envVars, jobDetails.localWorkloadAddresses || {});

  const resolvedEnvVars = await resolveEnvironmentDirectives(preSubstitutedEnvVars);

  // Get AWS credentials unless skipped (for local-only mode)
  let awsCredentialsEnvVars: Record<string, string> = {};
  if (!jobDetails.skipAwsCredentials) {
    const isDevStack = globalStateManager.command === 'dev';
    awsCredentialsEnvVars = await getLocalInvokeAwsCredentials({
      assumeRoleOfWorkload: jobDetails.workloadName,
      isDevStack
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

  // On Linux with --network host, container can access host's 127.0.0.1 directly.
  // On Windows/macOS, Docker runs in a VM, so we need to use host.docker.internal.
  const tunnelHost = process.platform === 'linux' ? '127.0.0.1' : 'host.docker.internal';
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

  // Adjust local resource env vars for Docker networking
  const adjustedLocalEnvVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(jobDetails.localResourceEnvVars || {})) {
    adjustedLocalEnvVars[key] = value.replace(/localhost/g, tunnelHost);
  }

  const environment: Record<string, any> = {
    AWS_REGION: globalStateManager.region,
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

// @todo take from config
export const getContainerStopWaitTime = () => 2;

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
      await eventManager.startEvent({
        eventType: 'STOP_CONTAINER',
        description: `Stopping ${containersWithConflictingPorts.length} conflicting container${containersWithConflictingPorts.length > 1 ? 's' : ''}`
      });
      await Promise.all(
        containersWithConflictingPorts.map((container) => stopDockerContainer(container.Id, getContainerStopWaitTime()))
      );
      await eventManager.finishEvent({ eventType: 'STOP_CONTAINER' });
    }
    if (onContainerStopped) {
      onContainerStopped();
    }
  }
};

export const gracefullyStopContainer = async (containerName: string) => {
  const containerInfo = await inspectDockerContainer(containerName);
  if (containerInfo?.State?.Running) {
    const spinner = tuiManager.createSpinner({ text: 'Stopping container' });
    await stopDockerContainer(containerName, getContainerStopWaitTime());
    spinner.success();
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
