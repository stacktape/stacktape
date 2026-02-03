import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker } from '@shared/utils/docker';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  isContainerRunning,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';

const OPENSEARCH_IMAGE = 'opensearchproject/opensearch';
const OPENSEARCH_DATA_PATH = '/usr/share/opensearch/data';

const buildConnectionInfo = (host: string, port: number) => {
  const endpoint = `http://${host}:${port}`;
  return {
    connectionString: endpoint,
    referencableParams: {
      domainEndpoint: endpoint,
      arn: `arn:aws:es:local:000000000000:domain/local-opensearch`
    }
  };
};

export const startLocalOpenSearch = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name: _name, version, dataDir, containerName } = config;
  const defaultPort = DEFAULT_PORTS.opensearch;
  const preferredPort = config.port || defaultPort;

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, defaultPort, preferredPort);
    const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort);

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

  const actualPort = await findAvailablePort(preferredPort);

  // Map version to OpenSearch image version
  const imageVersion = version === 'latest' ? '2.17.0' : version;
  const imageTag = `${OPENSEARCH_IMAGE}:${imageVersion}`;

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${actualPort}:9200`,
    '-v',
    `${dataDir}:${OPENSEARCH_DATA_PATH}`,
    // Disable security for local development (simpler setup)
    '-e',
    'discovery.type=single-node',
    '-e',
    'DISABLE_SECURITY_PLUGIN=true',
    '-e',
    'OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin',
    // Reduce memory for local dev
    '-e',
    'OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m',
    imageTag
  ];

  await execDocker(dockerArgs);

  await waitForReady({
    containerName,
    resourceType: 'OpenSearch',
    timeoutMs: 60000, // OpenSearch can take a while to start
    pollIntervalMs: 1000,
    checkFn: async () => {
      // For local dev without security, just check if the endpoint responds
      try {
        const response = await fetch(`http://localhost:${actualPort}`);
        return response.ok;
      } catch {
        return false;
      }
    }
  });

  const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
