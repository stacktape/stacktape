import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { writeFile } from 'fs-extra';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { formatDevServerStatus, startDevServer, stopDevServer } from '../dev-server';
import {
  SSR_WEB_FRAMEWORK_CONFIGS,
  type SsrWebResourceType
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

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

const getWorkingDirectory = (appDirectory?: string): string => {
  const dir = appDirectory || '.';
  return isAbsolute(dir) ? dir : join(globalStateManager.workingDir, dir);
};

const getSsrWebResource = (name: string, resourceType: SsrWebResourceType): SsrWebResource | undefined => {
  switch (resourceType) {
    case 'astro-web':
      return configManager.astroWebs.find((r) => r.name === name);
    case 'nuxt-web':
      return configManager.nuxtWebs.find((r) => r.name === name);
    case 'sveltekit-web':
      return configManager.sveltekitWebs.find((r) => r.name === name);
    case 'solidstart-web':
      return configManager.solidstartWebs.find((r) => r.name === name);
    case 'tanstack-web':
      return configManager.tanstackWebs.find((r) => r.name === name);
    case 'remix-web':
      return configManager.remixWebs.find((r) => r.name === name);
    default:
      return undefined;
  }
};

export const startSsrWebDevServer = async ({
  name,
  resourceType,
  localWorkloadEnvVars
}: {
  name: string;
  resourceType: SsrWebResourceType;
  localWorkloadEnvVars?: Record<string, string>;
}): Promise<DevServerState> => {
  const ssrWeb = getSsrWebResource(name, resourceType);
  const frameworkConfig = SSR_WEB_FRAMEWORK_CONFIGS[resourceType];

  if (!ssrWeb) {
    throw new Error(`${frameworkConfig.displayName} web "${name}" not found in config`);
  }

  const workingDirectory = getWorkingDirectory(ssrWeb.appDirectory);

  // Write .env.local with environment values and local workload addresses
  await writeDevEnvFile({
    name,
    workingDirectory,
    environment: ssrWeb.environment,
    localWorkloadEnvVars
  });

  const devConfig = {
    command: ssrWeb.dev?.command || frameworkConfig.defaultDevCommand,
    workingDirectory: ssrWeb.appDirectory || '.'
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
            if (sizeInfo) {
              devTuiManager.setRebuildSize(name, sizeInfo);
            }
          } else if (useDevTui) {
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
