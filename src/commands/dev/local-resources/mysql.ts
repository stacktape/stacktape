import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker, inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';
import { getLocalDbParameters, mysqlParamsToDockerArgs } from './db-parameters';

const MYSQL_DATA_PATH = '/var/lib/mysql';

const waitForMysqlReady = async (containerName: string, timeoutMs = 60000): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const { exitCode } = await execDocker(
        ['exec', containerName, 'mysqladmin', 'ping', '-h', 'localhost', '--silent'],
        { skipHandleError: true }
      );
      if (exitCode === 0) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`MySQL container ${containerName} did not become ready within ${timeoutMs}ms`);
};

const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

const getImageTag = (version: string, type: 'mysql' | 'mariadb'): string => {
  if (version === 'latest') return `${type}:latest`;
  return `${type}:${version}`;
};

export const startLocalMysql = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, type, version, port, dataDir, credentials, dbName, containerName } = config;
  const isMaria = type === 'mariadb';
  const defaultPort = 3306;

  if (await isContainerRunning(containerName)) {
    const info = await inspectDockerContainer(containerName);
    const portBindings = info?.NetworkSettings?.Ports?.[`${defaultPort}/tcp`] || [];
    const actualPort = portBindings[0]?.HostPort ? parseInt(portBindings[0].HostPort, 10) : port;

    const host = 'localhost';
    const user = credentials?.username || 'root';
    const pass = credentials?.password || 'localdevpassword';
    const database = dbName || 'mysql';
    const connectionString = `mysql://${user}:${pass}@${host}:${actualPort}/${database}`;

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
        jdbcConnectionString: `jdbc:mysql://${host}:${actualPort}/${database}?user=${user}&password=${pass}`
      }
    };
  }

  let actualPort = port;
  if (await isPortInUse(port)) {
    const [freePort] = await findFreePorts(1);
    actualPort = freePort;
  }

  const imageTag = getImageTag(version, isMaria ? 'mariadb' : 'mysql');
  const user = credentials?.username || 'root';
  const pass = credentials?.password || 'localdevpassword';
  const database = dbName || 'mysql';

  // Fetch and merge database parameters (AWS defaults + Stacktape config + user overrides)
  const engine = isMaria ? 'mariadb' : 'mysql';
  const dbParams = await getLocalDbParameters({ resourceName: name, engine, version });
  const mysqlConfigArgs = mysqlParamsToDockerArgs(dbParams);

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-e',
    `MYSQL_ROOT_PASSWORD=${pass}`,
    '-e',
    `MYSQL_DATABASE=${database}`,
    ...(user !== 'root' ? ['-e', `MYSQL_USER=${user}`, '-e', `MYSQL_PASSWORD=${pass}`] : []),
    '-p',
    `${actualPort}:${defaultPort}`,
    '-v',
    `${dataDir}:${MYSQL_DATA_PATH}`,
    imageTag,
    ...mysqlConfigArgs
  ];

  await execDocker(dockerArgs);
  await waitForMysqlReady(containerName);

  const host = 'localhost';
  const connectionString = `mysql://${user}:${pass}@${host}:${actualPort}/${database}`;

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
      jdbcConnectionString: `jdbc:mysql://${host}:${actualPort}/${database}?user=${user}&password=${pass}`
    }
  };
};
