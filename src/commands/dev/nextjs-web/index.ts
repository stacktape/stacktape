import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { writeFile } from 'fs-extra';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { formatDevServerStatus, startDevServer, stopDevServer } from '../dev-server';

const DEFAULT_NEXTJS_DEV_COMMAND = 'next dev';

const writeDevEnvFile = async ({
  name,
  workingDirectory,
  environment,
  localWorkloadEnvVars
}: {
  name: string;
  workingDirectory: string;
  environment?: EnvironmentVar[];
  localWorkloadEnvVars?: Record<string, string>;
}): Promise<void> => {
  const envVars: Record<string, string> = {};

  // Resolve environment directives
  if (environment && environment.length > 0) {
    const resolved = await configManager.resolveDirectives<EnvironmentVar[]>({
      itemToResolve: environment,
      resolveRuntime: true,
      useLocalResolve: true
    });
    resolved.forEach(({ name: varName, value }) => {
      envVars[varName] = String(value);
    });
  }

  // Add local workload env vars (URLs of other local services)
  if (localWorkloadEnvVars) {
    Object.assign(envVars, localWorkloadEnvVars);
  }

  if (Object.keys(envVars).length === 0) {
    return;
  }

  // Write .env.local file
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envFilePath = join(workingDirectory, '.env.local');
  await writeFile(envFilePath, envContent);
  tuiManager.info(`[${name}] Wrote ${Object.keys(envVars).length} env vars to .env.local`);
};

const getWorkingDirectory = (appDirectory: string): string => {
  return isAbsolute(appDirectory) ? appDirectory : join(globalStateManager.workingDir, appDirectory);
};

export const runDevNextjsWeb = async (): Promise<void> => {
  const { resourceName } = globalStateManager.args;

  const nextjsWeb = configManager.nextjsWebs.find((n) => n.name === resourceName);
  if (!nextjsWeb) {
    throw new Error(`Next.js web "${resourceName}" not found in config`);
  }

  const workingDirectory = getWorkingDirectory(nextjsWeb.appDirectory);

  // Write .env.local with environment values
  await writeDevEnvFile({
    name: resourceName,
    workingDirectory,
    environment: nextjsWeb.environment
  });

  const devConfig = {
    command: nextjsWeb.dev?.command || DEFAULT_NEXTJS_DEV_COMMAND,
    workingDirectory: nextjsWeb.appDirectory
  };

  tuiManager.info(`Starting dev server for ${resourceName}...`);

  const state = await startDevServer({
    name: resourceName,
    config: devConfig,
    callbacks: {
      onStateChange: (newState) => {
        const status = formatDevServerStatus(newState);
        if (status) {
          tuiManager.info(`[${resourceName}] ${status}`);
        }
      },
      onOutput: (line) => {
        tuiManager.info(`[${resourceName}] ${line}`);
      }
    }
  });

  if (state.status === 'error') {
    tuiManager.warn(`[${resourceName}] Dev server failed to start: ${state.error}`);
  } else {
    tuiManager.success(`[${resourceName}] Dev server running${state.url ? ` at ${state.url}` : ''}`);
  }

  // Keep process alive - the dev server is running in background
  await new Promise(() => {});
};

export const startNextjsWebDevServer = async ({
  name,
  localWorkloadEnvVars
}: {
  name: string;
  localWorkloadEnvVars?: Record<string, string>;
}): Promise<DevServerState> => {
  const nextjsWeb = configManager.nextjsWebs.find((n) => n.name === name);
  if (!nextjsWeb) {
    throw new Error(`Next.js web "${name}" not found in config`);
  }

  const workingDirectory = getWorkingDirectory(nextjsWeb.appDirectory);

  // Write .env.local with environment values and local workload addresses
  await writeDevEnvFile({
    name,
    workingDirectory,
    environment: nextjsWeb.environment,
    localWorkloadEnvVars
  });

  const devConfig = {
    command: nextjsWeb.dev?.command || DEFAULT_NEXTJS_DEV_COMMAND,
    workingDirectory: nextjsWeb.appDirectory
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

export { stopDevServer };
