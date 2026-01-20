import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';
import { DEV_CONFIG } from '../dev-config';

export const DEFAULT_LOCAL_HOST = 'localhost';
export const DEFAULT_PASSWORD = DEV_CONFIG.localResources.defaultPassword;
export const DEFAULT_PORTS = DEV_CONFIG.localResources.ports;

export const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

/** Check if a container exists (running or stopped) */
export const doesContainerExist = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  // inspectDockerContainer returns {} when container doesn't exist, so check for Id
  return Boolean(info?.Id);
};

/** Remove container if it exists (running or stopped) */
export const removeContainerIfExists = async (containerName: string): Promise<void> => {
  const info = await inspectDockerContainer(containerName);
  // inspectDockerContainer returns {} when container doesn't exist, so check for Id
  if (info?.Id) {
    const { stopDockerContainer, execDocker } = await import('@shared/utils/docker');
    if (info.State?.Running) {
      await stopDockerContainer(containerName, 5);
    }
    // Remove the container
    await execDocker(['rm', containerName], { skipHandleError: true });
  }
};

export const getContainerPort = async (
  containerName: string,
  internalPort: number,
  fallbackPort: number
): Promise<number> => {
  const info = await inspectDockerContainer(containerName);
  const portBindings = info?.NetworkSettings?.Ports?.[`${internalPort}/tcp`] || [];
  return portBindings[0]?.HostPort ? Number.parseInt(portBindings[0].HostPort, 10) : fallbackPort;
};

export const findAvailablePort = async (preferredPort: number): Promise<number> => {
  if (await isPortInUse(preferredPort)) {
    const [freePort] = await findFreePorts(1);
    return freePort;
  }
  return preferredPort;
};

export const getImageTag = (version: string, imageType: string): string => {
  if (version === 'latest') return `${imageType}:latest`;
  return `${imageType}:${version}`;
};

export type WaitForReadyOptions = {
  containerName: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  checkFn: () => Promise<boolean>;
  resourceType: string;
};

export const waitForReady = async ({
  containerName,
  timeoutMs = 30000,
  pollIntervalMs = 500,
  checkFn,
  resourceType
}: WaitForReadyOptions): Promise<void> => {
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const isReady = await checkFn();
      if (isReady) return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const errorDetails = lastError ? ` Last error: ${lastError.message}` : '';
  throw new Error(
    `${resourceType} container "${containerName}" did not become ready within ${timeoutMs}ms.${errorDetails}`
  );
};

export type BuildInstanceResult = {
  config: LocalResourceConfig & { containerName: string };
  host: string;
  actualPort: number;
  connectionString: string;
  referencableParams: Record<string, string>;
};

export const buildLocalResourceInstance = (result: BuildInstanceResult): LocalResourceInstance => {
  return {
    ...result.config,
    host: result.host,
    actualPort: result.actualPort,
    connectionString: result.connectionString,
    referencableParams: result.referencableParams
  };
};

export type DbCredentials = {
  username: string;
  password: string;
};

export const getDbCredentials = (
  config: LocalResourceConfig,
  defaults: { username: string; password: string }
): DbCredentials => ({
  username: config.credentials?.username || defaults.username,
  password: config.credentials?.password || DEFAULT_PASSWORD
});

export const buildDockerRunArgs = ({
  containerName,
  envVars,
  portMapping,
  volumeMapping,
  imageTag,
  additionalArgs = []
}: {
  containerName: string;
  envVars: Record<string, string>;
  portMapping: { host: number; container: number };
  volumeMapping: { host: string; container: string };
  imageTag: string;
  additionalArgs?: string[];
}): string[] => {
  const args = ['run', '-d', '--name', containerName];

  for (const [key, value] of Object.entries(envVars)) {
    args.push('-e', `${key}=${value}`);
  }

  args.push('-p', `${portMapping.host}:${portMapping.container}`);
  args.push('-v', `${volumeMapping.host}:${volumeMapping.container}`);
  args.push(imageTag);
  args.push(...additionalArgs);

  return args;
};
