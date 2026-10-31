import type { DevServerState } from '../dev-server';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { startDevServer } from '../dev-server';
import { createFrontendStatusReporter } from '../frontend-status';
import { prepareFrontendEnvironment } from '../frontend-env';
import { getSecretSourcedEnvNames } from '../agent-env-masking';

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

  return startDevServer({
    name,
    config: {
      ...bucket.dev,
      environment: injectedEnvironment,
      secretEnvNames: getSecretSourcedEnvNames(bucket),
      withheldEnvNames
    },
    callbacks: createFrontendStatusReporter(name)
  });
};
