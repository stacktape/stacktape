import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { writeFile } from 'fs-extra';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { formatDevServerStatus, startDevServer, stopDevServer } from '../dev-server';

const writeDevEnvFile = async ({
  name,
  workingDirectory,
  injectEnvironment,
  localWorkloadEnvVars
}: {
  name: string;
  workingDirectory: string;
  injectEnvironment?: EnvironmentVar[];
  localWorkloadEnvVars?: Record<string, string>;
}): Promise<void> => {
  const envVars: Record<string, string> = {};

  // Resolve injectEnvironment directives
  if (injectEnvironment && injectEnvironment.length > 0) {
    const resolved = await configManager.resolveDirectives<EnvironmentVar[]>({
      itemToResolve: injectEnvironment,
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

  // Write .env.local file (commonly used by Vite, Next.js, CRA, etc.)
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envFilePath = join(workingDirectory, '.env.local');
  await writeFile(envFilePath, envContent);
  tuiManager.info(`[${name}] Wrote ${Object.keys(envVars).length} env vars to .env.local`);
};

const getWorkingDirectory = (dev: { workingDirectory?: string }): string => {
  return dev.workingDirectory
    ? isAbsolute(dev.workingDirectory)
      ? dev.workingDirectory
      : join(globalStateManager.workingDir, dev.workingDirectory)
    : globalStateManager.workingDir;
};

export const runDevHostingBucket = async (): Promise<void> => {
  const { resourceName } = globalStateManager.args;

  const bucket = configManager.hostingBuckets.find((b) => b.name === resourceName);
  if (!bucket) {
    throw new Error(`Hosting bucket "${resourceName}" not found in config`);
  }

  if (!bucket.dev) {
    throw new Error(
      `Hosting bucket "${resourceName}" does not have a dev configuration. ` +
        `Dev mode requires a dev property (e.g. { command: "npm run dev" }).`
    );
  }

  const workingDirectory = getWorkingDirectory(bucket.dev);

  // Write .env.local with injectEnvironment values
  await writeDevEnvFile({
    name: resourceName,
    workingDirectory,
    injectEnvironment: bucket.injectEnvironment
  });

  tuiManager.info(`Starting dev server for ${resourceName}...`);

  const state = await startDevServer({
    name: resourceName,
    config: bucket.dev,
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

export const startHostingBucketDevServer = async ({
  name,
  localWorkloadEnvVars
}: {
  name: string;
  localWorkloadEnvVars?: Record<string, string>;
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

  // Write .env.local with injectEnvironment values and local workload addresses
  await writeDevEnvFile({
    name,
    workingDirectory,
    injectEnvironment: bucket.injectEnvironment,
    localWorkloadEnvVars
  });

  const useDevTui = devTuiManager.running;

  return startDevServer({
    name,
    config: bucket.dev,
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
