import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { formatDevServerStatus, startDevServer } from '../dev-server';
import { prepareFrontendEnvironment } from '../frontend-env';

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
