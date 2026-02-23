import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker } from '@shared/utils/docker';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  getImageTag,
  isDockerPortBindError,
  isContainerRunning,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';

const REDIS_DATA_PATH = '/data';

const buildConnectionInfo = (host: string, port: number, password?: string) => {
  // Use redis:// (not rediss://) for local - no TLS
  const connectionString = password ? `redis://default:${password}@${host}:${port}` : `redis://${host}:${port}`;

  const referencableParams: Record<string, string> = {
    host,
    port: String(port),
    connectionString,
    sharding: 'disabled'
  };

  // Include username when credentials are configured (matches deployed Redis behavior)
  if (password) {
    referencableParams.username = 'default';
  }

  return { connectionString, referencableParams };
};

export const startLocalRedis = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { version, port, dataDir, credentials, containerName } = config;
  const defaultPort = DEFAULT_PORTS.redis;
  const password = credentials?.password;

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, defaultPort, port);
    const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, password);

    return buildLocalResourceInstance({
      config,
      host: DEFAULT_LOCAL_HOST,
      actualPort,
      ...connInfo
    });
  }

  // Remove stopped container with same name if it exists
  if (await doesContainerExist(containerName)) {
    await removeContainerIfExists(containerName);
  }

  let actualPort = await findAvailablePort(port);
  const imageTag = getImageTag(version, 'redis');

  const buildDockerArgs = (hostPort: number) => [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${hostPort}:${defaultPort}`,
    '-v',
    `${dataDir}:${REDIS_DATA_PATH}`,
    imageTag,
    ...(password ? ['--requirepass', password] : [])
  ];

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await execDocker(buildDockerArgs(actualPort));
      break;
    } catch (err) {
      if (!isDockerPortBindError(err) || attempt === 4) {
        throw err;
      }
      actualPort = await findAvailablePort(actualPort + 1);
    }
  }

  await waitForReady({
    containerName,
    resourceType: 'Redis',
    timeoutMs: 30000,
    pollIntervalMs: 500,
    checkFn: async () => {
      const pingArgs = password
        ? ['exec', containerName, 'redis-cli', '-a', password, 'ping']
        : ['exec', containerName, 'redis-cli', 'ping'];
      const { stdout, exitCode } = await execDocker(pingArgs, { skipHandleError: true });
      return exitCode === 0 && stdout.includes('PONG');
    }
  });

  const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, password);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
