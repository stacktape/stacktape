import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { globalStateManager } from '@application-services/global-state-manager';
import { inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';
import { DEV_CONFIG } from '../dev-config';

export const DEFAULT_LOCAL_HOST = 'localhost';
export const DEFAULT_PASSWORD = DEV_CONFIG.localResources.defaultPassword;
export const DEFAULT_PORTS = DEV_CONFIG.localResources.ports;

/**
 * Track reserved ports during parallel startup to prevent race conditions.
 * When multiple resources with the same default port start in parallel,
 * they would otherwise all check if port X is free, all find it free,
 * then all try to bind to it - causing failures.
 */
const reservedPorts = new Set<number>();

/** Clear reserved ports. Call after startup cycle completes. */
export const clearReservedPorts = (): void => {
  reservedPorts.clear();
};

/**
 * Calculate a port offset based on stage name to avoid conflicts between parallel dev modes.
 * Uses a djb2-style hash to spread stages across a port range.
 */
const getStagePortOffset = (): number => {
  const stage = globalStateManager.stage || '';
  if (!stage) return 0;

  // djb2 hash - better distribution than simple sum
  let hash = 5381;
  for (let i = 0; i < stage.length; i++) {
    hash = (hash * 33) ^ stage.charCodeAt(i);
  }
  // Ensure positive and limit to ~50 different port ranges (0-4900 offset, stepping by 100)
  return (Math.abs(hash) % 50) * 100;
};

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
  // Apply stage-based offset to avoid conflicts between parallel dev modes
  const stageOffset = getStagePortOffset();
  const startPort = preferredPort + stageOffset;

  // Try ports sequentially starting from offset port
  const maxAttempts = 100;
  let port = startPort;

  for (let i = 0; i < maxAttempts; i++) {
    // Check both system port usage AND our internal reservations to prevent race conditions
    // when multiple resources with the same default port start in parallel
    if (!reservedPorts.has(port) && !(await isPortInUse(port))) {
      reservedPorts.add(port);
      return port;
    }
    port++;
  }

  // Fallback to system-assigned free port
  const [freePort] = await findFreePorts(1);
  reservedPorts.add(freePort);
  return freePort;
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
