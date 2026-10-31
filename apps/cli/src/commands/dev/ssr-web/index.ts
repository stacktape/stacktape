import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { startDevServer } from '../dev-server';
import { createFrontendStatusReporter } from '../frontend-status';
import { prepareFrontendEnvironment } from '../frontend-env';
import { getSecretSourcedEnvNames } from '../agent-env-masking';
import {
  SSR_WEB_FRAMEWORK_CONFIGS,
  type SsrWebResourceType
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

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
  connectedEnvVars,
  withheldEnvNames
}: {
  name: string;
  resourceType: SsrWebResourceType;
  /** Local variables of the resources this app lists in `connectTo`, as its deployed server gets them. */
  connectedEnvVars: Record<string, string>;
  /** Local variables of resources this app does not connect to, which its dev server must not inherit. */
  withheldEnvNames: string[];
}): Promise<DevServerState> => {
  const ssrWeb = getSsrWebResource(name, resourceType);
  const frameworkConfig = SSR_WEB_FRAMEWORK_CONFIGS[resourceType];

  if (!ssrWeb) {
    throw new Error(`${frameworkConfig.displayName} web "${name}" not found in config`);
  }

  const workingDirectory = getWorkingDirectory(ssrWeb.appDirectory);

  const injectedEnvironment = await prepareFrontendEnvironment({
    name,
    workingDirectory,
    environment: ssrWeb.environment,
    connectedEnvVars
  });

  const devConfig = {
    command: ssrWeb.dev?.command || frameworkConfig.defaultDevCommand,
    workingDirectory: ssrWeb.appDirectory || '.',
    environment: injectedEnvironment,
    secretEnvNames: getSecretSourcedEnvNames(ssrWeb),
    withheldEnvNames
  };

  return startDevServer({
    name,
    config: devConfig,
    callbacks: createFrontendStatusReporter(name)
  });
};
