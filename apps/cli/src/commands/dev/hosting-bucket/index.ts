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
            devTuiManager.setWorkloadStatus(name, 'running', { url: newState.url, size: sizeInfo });
            devTuiManager.log(name, status);
          } else {
            tuiManager.info(`[${name}] ${status}`);
          }
        } else if (newState.status === 'error') {
          if (inRebuildPhase) {
            devTuiManager.setRebuildError(name, newState.error || 'Build failed');
          } else if (useDevTui) {
            devTuiManager.setWorkloadStatus(name, 'error', { error: newState.error });
            devTuiManager.log(name, status);
          } else {
            tuiManager.info(`[${name}] ${status}`);
          }
        }
      },
      onOutput: (line) => {
        const inRebuildPhase = devTuiManager.inRebuildPhase;
        if (inRebuildPhase) {
          // Buffer logs during rebuild
          devTuiManager.bufferRebuildLog(name, line);
        } else if (useDevTui) {
          devTuiManager.log(name, line);
        } else {
          tuiManager.info(`[${name}] ${line}`);
        }
      }
    }
  });
};
