import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { execDocker, inspectDockerContainer } from '@utils/docker';
import { isPortInUse } from '@utils/ports';
import findFreePorts from 'find-free-ports';
import { getDevContainerOwnerArgs } from '../cleanup-utils';
import { DEV_CONFIG } from '../dev-config';

export const DEFAULT_LOCAL_HOST = 'localhost';
export const DEFAULT_PORTS = DEV_CONFIG.localResources.ports;

/**
 * `docker run` arguments that publish a database port on loopback only. Docker publishes on every interface by default,
 * which put local databases on the developer's network. Processes on this machine still reach them: dev servers and
 * the agent through localhost, local containers through the host network on Linux and through host.docker.internal on
 * Docker Desktop, which forwards to the host's loopback.
 */
export const publishOnLoopback = (hostPort: number, containerPort: number): string[] => [
  '-p',
  `127.0.0.1:${hostPort}:${containerPort}`
];

/**
 * On Linux a database container owns the data directory it initialized and makes it unreadable to anyone else, so a
 * directory this user cannot list holds data as well.
 */
const hasExistingData = (dataDir: string): boolean => {
  try {
    return readdirSync(dataDir).length > 0;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return false;
    if (code === 'EACCES' || code === 'EPERM') return true;
    throw error;
  }
};

/**
 * The password of a local database whose configuration sets none or reads it with a directive such as `$Secret`. A data
 * directory keeps the password it was initialized with, recorded in `passwordFile` next to it and reused while the data
 * exists (`--freshDb` deletes both).
 * New data gets the password of the project's stage on this machine (`stagePasswordFile`, outside the project
 * directory), so two worktrees of one project use the same password. Deployed dev functions carry it in their
 * environment, so moving the stage between worktrees then needs no dev stack update. The first database of a stage
 * creates it at random, or adopts the password of data that existed before.
 * A data directory created before passwords were generated was initialized with `legacyPassword`, which the database
 * keeps in its data; that password is kept and reported as legacy so existing data keeps working. Redis reads its
 * password at every start, so it passes none.
 */
export const resolveLocalDatabasePassword = ({
  passwordFile,
  stagePasswordFile,
  dataDir,
  legacyPassword
}: {
  passwordFile: string;
  stagePasswordFile: string;
  dataDir: string;
  legacyPassword?: string;
}): { password: string; legacy: boolean } => {
  const stored = readPasswordFile(passwordFile);
  if (stored) {
    // The fixed password of old data is not one that new data should get.
    if (stored !== legacyPassword && !readPasswordFile(stagePasswordFile)) writePasswordFile(stagePasswordFile, stored);
    return { password: stored, legacy: false };
  }
  if (legacyPassword !== undefined && hasExistingData(dataDir)) {
    writePasswordFile(passwordFile, legacyPassword);
    return { password: legacyPassword, legacy: true };
  }
  const password = readPasswordFile(stagePasswordFile) ?? createStagePassword(stagePasswordFile);
  writePasswordFile(passwordFile, password);
  return { password, legacy: false };
};

/** How long to wait for another process that created the stage's password file to write the password into it. */
const STAGE_PASSWORD_WRITE_WAIT_MS = 2000;

/**
 * Two worktrees may start the stage at once; the first to create the file decides the password for both. The other
 * waits briefly for the password if the file is still empty, and takes the file over only from a process that
 * created it and never wrote it.
 */
const createStagePassword = (file: string): string => {
  const password = randomBytes(18).toString('hex');
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(file, password, { mode: 0o600, flag: 'wx' });
    return password;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const deadline = Date.now() + STAGE_PASSWORD_WRITE_WAIT_MS;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < deadline) {
    const written = readPasswordFile(file);
    if (written) return written;
    Atomics.wait(pause, 0, 0, 25);
  }
  writePasswordFile(file, password);
  return password;
};

const readPasswordFile = (file: string): string | undefined =>
  existsSync(file) ? readFileSync(file, 'utf-8').trim() || undefined : undefined;

const writePasswordFile = (file: string, password: string) => {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, password, { mode: 0o600 });
  chmodSync(file, 0o600);
};

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
    const { stopDockerContainer, execDocker } = await import('@utils/docker');
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

export const isDockerPortBindError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('port is already allocated') ||
    (message.includes('Bind for') && message.includes('failed')) ||
    message.includes('driver failed programming external connectivity')
  );
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

  const getContainerExitDetails = async (): Promise<string | null> => {
    const info = await inspectDockerContainer(containerName);
    if (!info?.State || info.State.Running) {
      return null;
    }

    const status = info.State.Status || 'unknown';
    const exitCode = info.State.ExitCode;
    const reason = info.State.Error || 'no exit reason';
    let logs = '';
    try {
      const { stdout, stderr } = await execDocker(['logs', '--tail', '80', containerName], { skipHandleError: true });
      logs = [stdout, stderr].filter(Boolean).join('\n').trim();
    } catch {
      // Ignore log collection errors
    }

    const details = [`status=${status}`, `exitCode=${exitCode}`, `reason=${reason}`];
    if (logs) {
      details.push(`logs:\n${logs}`);
    }
    return details.join(', ');
  };

  while (Date.now() - startTime < timeoutMs) {
    const exitDetails = await getContainerExitDetails();
    if (exitDetails) {
      throw new Error(`${resourceType} container "${containerName}" exited before becoming ready (${exitDetails}).`);
    }

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

export const getDbCredentials = (config: LocalResourceConfig, defaults: { username: string }): DbCredentials => {
  if (!config.credentials?.password) {
    throw new Error(`Local database "${config.name}" started without a password.`);
  }
  return { username: config.credentials.username || defaults.username, password: config.credentials.password };
};

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
  const args = ['run', '-d', '--name', containerName, ...getDevContainerOwnerArgs()];

  for (const [key, value] of Object.entries(envVars)) {
    args.push('-e', `${key}=${value}`);
  }

  args.push(...publishOnLoopback(portMapping.host, portMapping.container));
  args.push('-v', `${volumeMapping.host}:${volumeMapping.container}`);
  args.push(imageTag);
  args.push(...additionalArgs);

  return args;
};
