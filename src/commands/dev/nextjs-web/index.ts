import { join, isAbsolute } from 'node:path';
import { writeFile } from 'fs-extra';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { startDevServer, stopDevServer, formatDevServerStatus, type DevServerState } from '../dev-server';

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

  return startDevServer({
    name,
    config: devConfig,
    callbacks: {
      onStateChange: (newState) => {
        const status = formatDevServerStatus(newState);
        if (newState.status === 'ready' || newState.status === 'error') {
          tuiManager.info(`[${name}] ${status}`);
        }
      },
      onOutput: (line) => {
        tuiManager.info(`[${name}] ${line}`);
      }
    }
  });
};

export { stopDevServer };
