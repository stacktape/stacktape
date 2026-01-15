import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker, inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';
import { getLocalDbParameters, postgresParamsToDockerArgs } from './db-parameters';

const POSTGRES_DATA_PATH = '/var/lib/postgresql/data';

const waitForPostgresReady = async (containerName: string, timeoutMs = 30000): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const { exitCode } = await execDocker(['exec', containerName, 'pg_isready', '-U', 'postgres'], {
        skipHandleError: true
      });
      if (exitCode === 0) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Postgres container ${containerName} did not become ready within ${timeoutMs}ms`);
};

const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

const getImageTag = (version: string, type: 'postgres' | 'mysql' | 'mariadb' | 'redis'): string => {
  if (version === 'latest') return `${type}:latest`;
  return `postgres:${version}`;
};

export const startLocalPostgres = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, version, port, dataDir, credentials, dbName, containerName } = config;

  if (await isContainerRunning(containerName)) {
    const info = await inspectDockerContainer(containerName);
    const portBindings = info?.NetworkSettings?.Ports?.['5432/tcp'] || [];
    const actualPort = portBindings[0]?.HostPort ? parseInt(portBindings[0].HostPort, 10) : port;

    const host = 'localhost';
    const user = credentials?.username || 'postgres';
    const pass = credentials?.password || 'localdevpassword';
    const database = dbName || 'postgres';
    const connectionString = `postgresql://${user}:${pass}@${host}:${actualPort}/${database}`;

    return {
      ...config,
      host,
      actualPort,
      connectionString,
      referencableParams: {
        host,
        port: String(actualPort),
        dbName: database,
        connectionString,
        jdbcConnectionString: `jdbc:postgresql://${host}:${actualPort}/${database}?user=${user}&password=${pass}`
      }
    };
  }

  let actualPort = port;
  if (await isPortInUse(port)) {
    const [freePort] = await findFreePorts(1);
    actualPort = freePort;
  }

  const imageTag = getImageTag(version, 'postgres');
  const user = credentials?.username || 'postgres';
  const pass = credentials?.password || 'localdevpassword';
  const database = dbName || 'postgres';

  // Fetch and merge database parameters (AWS defaults + Stacktape config + user overrides)
  const dbParams = await getLocalDbParameters({ resourceName: name, engine: 'postgres', version });
  const postgresConfigArgs = postgresParamsToDockerArgs(dbParams);

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-e',
    `POSTGRES_USER=${user}`,
    '-e',
    `POSTGRES_PASSWORD=${pass}`,
    '-e',
    `POSTGRES_DB=${database}`,
    '-p',
    `${actualPort}:5432`,
    '-v',
    `${dataDir}:${POSTGRES_DATA_PATH}`,
    imageTag,
    ...postgresConfigArgs
  ];

  await execDocker(dockerArgs);
  await waitForPostgresReady(containerName);

  const host = 'localhost';
  const connectionString = `postgresql://${user}:${pass}@${host}:${actualPort}/${database}`;

  return {
    ...config,
    host,
    actualPort,
    connectionString,
    referencableParams: {
      host,
      port: String(actualPort),
      dbName: database,
      connectionString,
      jdbcConnectionString: `jdbc:postgresql://${host}:${actualPort}/${database}?user=${user}&password=${pass}`
    }
  };
};
