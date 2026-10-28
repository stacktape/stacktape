import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { formatDevServerStatus, startDevServer } from '../dev-server';
import { prepareFrontendEnvironment } from '../frontend-env';

const getWorkingDirectory = (dev: { workingDirectory?: string }): string => {
  return dev.workingDirectory
    ? isAbsolute(dev.workingDirectory)
      ? dev.workingDirectory
      : join(globalStateManager.workingDir, dev.workingDirectory)
    : globalStateManager.workingDir;
};

export const startHostingBucketDevServer = async ({
  name,
  withheldEnvNames
}: {
  name: string;
  /** Local variables of resources this frontend does not connect to, which its dev server must not inherit. */
  withheldEnvNames: string[];
}): Promise<DevServerState> => {
  const bucket = configManager.hostingBuckets.find((b) => b.name === name);
  if (!bucket) {
    throw new Error(`Hosting bucket "${name}" not found in config`);
  }

  if (!bucket.dev) {
    tuiManager.warn(`[${name}] No dev configuration. Skipping.`);
    return { status: 'error', error: 'No dev configuration' };
  }

  const workingDirectory = getWorkingDirectory(bucket.dev);

  // A static site has no server and no `connectTo`: it gets only its own `injectEnvironment`.
  const injectedEnvironment = await prepareFrontendEnvironment({
    name,
    workingDirectory,
    environment: bucket.injectEnvironment,
    connectedEnvVars: {}
  });

  const useDevTui = devTuiManager.running;

  return startDevServer({
    name,
    config: { ...bucket.dev, environment: injectedEnvironment, withheldEnvNames },
    callbacks: {
      onStateChange: (newState) => {
        const status = formatDevServerStatus(newState);
        const inRebuildPhase = devTuiManager.inRebuildPhase;

        if (newState.status === 'ready') {
          const sizeInfo = newState.lastCompileTime ? `ready in ${newState.lastCompileTime}` : undefined;

          if (inRebuildPhase) {
            // During rebuild, update the rebuild UI with size info
            if (sizeInfo) {
              devTuiManager.setRebuildSize(name, sizeInfo);
            }
          } else if (useDevTui) {
            // Normal operation - update workload status
            devTuiManager.setWorkloadStatus(name, 'running', { url: newState.url, size: sizeInfo, error: undefined });
            devTuiManager.log(name, status);
          } else {
            tuiManager.info(`[${name}] ${status}`);
          }
        } else if (newState.status === 'error') {
          // A server can fail at any time, also while another workload rebuilds: its status says so either way.
          if (inRebuildPhase) devTuiManager.setRebuildError(name, newState.error || 'Build failed');
          if (useDevTui) {
            devTuiManager.setWorkloadStatus(name, 'error', { error: newState.error });
            // An error the server printed is in the log already, as its own entry.
            if (!newState.errorFromOutput) devTuiManager.log(name, status, 'error');
          } else if (!newState.errorFromOutput) {
            tuiManager.error(`[${name}] ${status}`);
          }
        }
      },
      onOutput: (message, level) => {
        if (devTuiManager.inRebuildPhase) devTuiManager.bufferRebuildLog(name, message, level);
        else if (useDevTui) devTuiManager.log(name, message, level);
        else tuiManager.info(`[${name}] ${message}`);
      }
    }
  });
};
