import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { startDevServer } from '../dev-server';
import { createFrontendStatusReporter } from '../frontend-status';
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

  return startDevServer({
    name,
    config: devConfig,
    callbacks: createFrontendStatusReporter(name)
  });
};
