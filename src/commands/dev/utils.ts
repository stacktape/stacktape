import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import type { FSWatcher } from 'chokidar';
import type { Stats } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { inspectDockerContainer, listDockerContainers, stopDockerContainer } from '@shared/utils/docker';
import { getAugmentedEnvironment } from '@utils/environment';
import { startPortForwardingSessions, substituteTunneledEndpointsInEnvironmentVars } from '@utils/ssm-session';
import chokidar from 'chokidar';
import { getLocalInvokeAwsCredentials, SESSION_DURATION_SECONDS } from '../_utils/assume-role';

type OnChangeFn = (props: { stats: Stats; changedFile: string }) => any;

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
  applicationManager.setUsesStdinWatch();
  // process.stdin.pause();
  // process.stdin.resume();
  process.stdin.removeAllListeners();
  process.stdin.on('data', async (data) => {
    if (applicationManager.isInterrupted) {
      return;
    }
    const str = data.toString().trim().toLowerCase();
    const char = data.toString().charCodeAt(0);
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

let cachedEnvironment: Record<string, any>;
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

  const [awsCredentialsEnvVars, resolvedEnvVars, resolvedInjectedVars] = await Promise.all([
    getLocalInvokeAwsCredentials({ assumeRoleOfWorkload: jobDetails.workloadName }),
    resolveEnvironmentDirectives(envVars),
    deployedStackOverviewManager.locallyResolveEnvVariablesFromConnectTo(jobDetails.connectTo)
  ]);

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

  setTimeout(
    () => {
      tuiManager.warn('Temporary AWS credentials expired. Restart dev to refresh permissions.');
    },
    (SESSION_DURATION_SECONDS - 120) * 1000
  );

  if (!cachedEnvironment) {
    cachedEnvironment = {
      AWS_REGION: globalStateManager.region,
      ...awsCredentialsEnvVars,
      ...resolvedEnvVars,
      ...substitutedInjectedEnvVars
    };
  }

  return cachedEnvironment;
  // return {
  //   ...cachedEnvironment,
  //   ...(jobDetails.workloadType === 'batch-job' && event ? { STP_TRIGGER_EVENT_DATA: JSON.stringify(event) } : {})
  // };
};

// @todo take from config
export const getContainerStopWaitTime = () => 2;

export const resolveRunningContainersWithSamePort = async ({
  ports,
  onContainerStopped
}: {
  ports: number[];
  onContainerStopped?: AnyFunction;
}) => {
  if (!ports) {
    return;
  }
  const runningContainers = await listDockerContainers();
  const containersWithConflictingPorts = runningContainers.filter((container) =>
    container.Ports.find(
      (containerPortInfo) => ports.find((port) => port === containerPortInfo.PublicPort) // @wtf? && port.protocol) || containerPortInfo.Type === 'tcp'
    )
  );

  if (containersWithConflictingPorts.length) {
    const { shouldStopConflictingContainers } = await tuiManager.prompt({
      type: 'confirm',
      name: 'shouldStopConflictingContainers',
      message: `The following containers have conflicting ports open. Would you like to remove them?:\n${containersWithConflictingPorts.map(
        (c) => `${c.Names.join(', ')} (${c.Id}).`
      )}`
    });
    if (shouldStopConflictingContainers) {
      tuiManager.info('Stopping containers using those ports...');
      await Promise.all(containersWithConflictingPorts.map((container) => gracefullyStopContainer(container.Id)));
    }
    if (onContainerStopped) {
      onContainerStopped();
    }
  }
};

export const gracefullyStopContainer = async (containerName: string) => {
  const containerInfo = await inspectDockerContainer(containerName);
  if (containerInfo?.State?.Running) {
    tuiManager.info('Stopping previous container...');
    await stopDockerContainer(containerName, getContainerStopWaitTime());
  }
};
