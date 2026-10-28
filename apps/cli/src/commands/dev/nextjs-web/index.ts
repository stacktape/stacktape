import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { formatDevServerStatus, startDevServer } from '../dev-server';
import { prepareFrontendEnvironment } from '../frontend-env';
import { getSecretSourcedEnvNames } from '../agent-env-masking';

const DEFAULT_NEXTJS_DEV_COMMAND = 'next dev';

const getWorkingDirectory = (appDirectory: string): string => {
  return isAbsolute(appDirectory) ? appDirectory : join(globalStateManager.workingDir, appDirectory);
};

export const startNextjsWebDevServer = async ({
  name,
  connectedEnvVars,
  withheldEnvNames
}: {
  name: string;
  /** Local variables of the resources this app lists in `connectTo`, as its deployed server gets them. */
  connectedEnvVars: Record<string, string>;
  /** Local variables of resources this app does not connect to, which its dev server must not inherit. */
  withheldEnvNames: string[];
}): Promise<DevServerState> => {
  const nextjsWeb = configManager.nextjsWebs.find((n) => n.name === name);
  if (!nextjsWeb) {
    throw new Error(`Next.js web "${name}" not found in config`);
  }

  const workingDirectory = getWorkingDirectory(nextjsWeb.appDirectory);

  const injectedEnvironment = await prepareFrontendEnvironment({
    name,
    workingDirectory,
    environment: nextjsWeb.environment,
    connectedEnvVars
  });

  const devConfig = {
    command: nextjsWeb.dev?.command || DEFAULT_NEXTJS_DEV_COMMAND,
    workingDirectory: nextjsWeb.appDirectory,
    environment: injectedEnvironment,
    secretEnvNames: getSecretSourcedEnvNames(nextjsWeb),
    withheldEnvNames
  };

  const useDevTui = devTuiManager.running;

  return startDevServer({
    name,
    config: devConfig,
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
