import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker, inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';

const REDIS_DATA_PATH = '/data';

const waitForRedisReady = async (containerName: string, password?: string, timeoutMs = 30000): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const pingArgs = password
        ? ['exec', containerName, 'redis-cli', '-a', password, 'ping']
        : ['exec', containerName, 'redis-cli', 'ping'];
      const { stdout, exitCode } = await execDocker(pingArgs, { skipHandleError: true });
      if (exitCode === 0 && stdout.includes('PONG')) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Redis container ${containerName} did not become ready within ${timeoutMs}ms`);
};

const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

const getImageTag = (version: string): string => {
  if (version === 'latest') return 'redis:latest';
  return `redis:${version}`;
};

export const startLocalRedis = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, version, port, dataDir, credentials, containerName } = config;
  const defaultPort = 6379;
  const password = credentials?.password;

  if (await isContainerRunning(containerName)) {
    const info = await inspectDockerContainer(containerName);
    const portBindings = info?.NetworkSettings?.Ports?.[`${defaultPort}/tcp`] || [];
    const actualPort = portBindings[0]?.HostPort ? parseInt(portBindings[0].HostPort, 10) : port;

    const host = 'localhost';
    // Use redis:// (not rediss://) for local - no TLS
    const connectionString = password
      ? `redis://default:${password}@${host}:${actualPort}`
      : `redis://${host}:${actualPort}`;

    return {
      ...config,
      host,
      actualPort,
      connectionString,
      referencableParams: {
        host,
        port: String(actualPort),
        connectionString,
        sharding: 'disabled'
      }
    };
  }

  let actualPort = port;
  if (await isPortInUse(port)) {
    const [freePort] = await findFreePorts(1);
    actualPort = freePort;
  }

  const imageTag = getImageTag(version);

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${actualPort}:${defaultPort}`,
    '-v',
    `${dataDir}:${REDIS_DATA_PATH}`,
    imageTag,
    ...(password ? ['--requirepass', password] : [])
  ];

  await execDocker(dockerArgs);
  await waitForRedisReady(containerName, password);

  const host = 'localhost';
  // Use redis:// (not rediss://) for local - no TLS
  const connectionString = password
    ? `redis://default:${password}@${host}:${actualPort}`
    : `redis://${host}:${actualPort}`;

  return {
    ...config,
    host,
    actualPort,
    connectionString,
    referencableParams: {
      host,
      port: String(actualPort),
      connectionString,
      sharding: 'disabled'
    }
  };
};
