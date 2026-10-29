import type { LocalResourceConfig, LocalResourceInstance } from './index';
import type { StpRedis } from '@domain-services/config-manager/resolved-types/redis';
import {
  LATEST_VALKEY_SERVERLESS_VERSION,
  LATEST_VALKEY_VERSION
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/redis/versions';
import { execDocker } from '@utils/docker';
import { getDevContainerOwnerArgs } from '../cleanup-utils';
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
  publishOnLoopback,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';

const REDIS_DATA_PATH = '/data';

export const buildConnectionInfo = (host: string, port: number, password?: string) => {
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

/**
 * ElastiCache versions without an open-source release of their own map to the closest compatible image: Redis OSS 7.1
 * has no `redis:7.1` image (7.2 is compatible) and ElastiCache Valkey 8.2 is compatible with Valkey 8.1.
 */
const ELASTICACHE_ONLY_VERSIONS: Record<'redis' | 'valkey', Record<string, string>> = {
  redis: { '7.1': '7.2' },
  valkey: { '8.2': '8.1' }
};

export const getLocalRedisImageTag = (engine: StpRedis['engine']['type'], engineVersion: string): string => {
  const family = engine === 'redis' ? 'redis' : 'valkey';
  const version = ELASTICACHE_ONLY_VERSIONS[family][engineVersion] ?? engineVersion;
  return getImageTag(version, family === 'redis' ? 'redis' : 'valkey/valkey');
};

/** The version the local container runs: the configured one, or the latest a new cache would get. */
export const getLocalRedisVersion = (engine: StpRedis['engine']): string => {
  if (engine.type === 'valkey-serverless') {
    return engine.properties?.version || LATEST_VALKEY_SERVERLESS_VERSION;
  }
  return engine.properties.version || LATEST_VALKEY_VERSION;
};

/**
 * ElastiCache Serverless always runs in cluster mode with every hash slot on one node. The local container does the
 * same, so commands that touch keys in different slots fail locally with `CROSSSLOT` as they do in AWS. The node
 * announces 127.0.0.1 and the published port, which cluster-mode clients on this machine (and in containers on the host
 * network) follow. Standalone clients connect to it unchanged.
 */
const getClusterModeArgs = (hostPort: number) => [
  '--cluster-enabled',
  'yes',
  '--cluster-announce-ip',
  '127.0.0.1',
  '--cluster-announce-port',
  String(hostPort)
];

const assignAllSlots = async (containerName: string, password: string | undefined) => {
  // Valkey images ship `redis-cli` as an alias of `valkey-cli`.
  const cli = ['exec', containerName, 'redis-cli', ...(password ? ['-a', password, '--no-auth-warning'] : [])];
  const isClusterReady = async () =>
    (await execDocker([...cli, 'cluster', 'info'], { skipHandleError: true })).stdout.includes('cluster_state:ok');
  // A data directory from an earlier run keeps its slot assignment in nodes.conf.
  if (await isClusterReady()) return;
  await execDocker([...cli, 'cluster', 'addslotsrange', '0', '16383'], { skipHandleError: true });
  // The node reports the cluster as down for a moment after its slots are assigned and rejects commands until then.
  await waitForReady({
    containerName,
    resourceType: 'Redis cluster',
    timeoutMs: 15000,
    pollIntervalMs: 200,
    checkFn: isClusterReady
  });
};

export const startLocalRedis = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { version, port, dataDir, credentials, containerName, redisEngine = 'redis' } = config;
  const clusterMode = redisEngine === 'valkey-serverless';
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
  const imageTag = getLocalRedisImageTag(redisEngine, version);

  const buildDockerArgs = (hostPort: number) => [
    'run',
    '-d',
    '--name',
    containerName,
    ...getDevContainerOwnerArgs(),
    ...publishOnLoopback(hostPort, defaultPort),
    '-v',
    `${dataDir}:${REDIS_DATA_PATH}`,
    imageTag,
    ...(password ? ['--requirepass', password] : []),
    ...(clusterMode ? getClusterModeArgs(hostPort) : [])
  ];

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await execDocker(buildDockerArgs(actualPort));
      break;
    } catch (err) {
      if (!isDockerPortBindError(err) || attempt === 4) {
        throw err;
      }
      // Docker creates the container before it fails to bind the port; remove it so the retry can reuse the name.
      await removeContainerIfExists(containerName);
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

  if (clusterMode) {
    await assignAllSlots(containerName, password);
  }

  const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, password);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
