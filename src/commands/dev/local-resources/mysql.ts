import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker } from '@shared/utils/docker';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  getDbCredentials,
  getImageTag,
  isContainerRunning,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';
import { getLocalDbParameters, mysqlParamsToDockerArgs } from './db-parameters';

const MYSQL_DATA_PATH = '/var/lib/mysql';

const buildConnectionInfo = (user: string, pass: string, host: string, port: number, database: string) => {
  const connectionString = `mysql://${user}:${pass}@${host}:${port}/${database}`;
  return {
    connectionString,
    referencableParams: {
      host,
      port: String(port),
      dbName: database,
      connectionString,
      jdbcConnectionString: `jdbc:mysql://${host}:${port}/${database}?user=${user}&password=${pass}`
    }
  };
};

export const startLocalMysql = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, type, version, port, dataDir, dbName, containerName } = config;
  const isMaria = type === 'mariadb';
  const defaultPort = DEFAULT_PORTS.mysql;
  const { username: user, password: pass } = getDbCredentials(config, {
    username: 'root',
    password: 'localdevpassword'
  });
  const database = dbName || 'mysql';

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, defaultPort, port);
    const connInfo = buildConnectionInfo(user, pass, DEFAULT_LOCAL_HOST, actualPort, database);

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

  const actualPort = await findAvailablePort(port);
  const imageTag = getImageTag(version, isMaria ? 'mariadb' : 'mysql');

  // Fetch and merge database parameters (skip AWS defaults for faster dev startup)
  const engine = isMaria ? 'mariadb' : 'mysql';
  const dbParams = await getLocalDbParameters({ resourceName: name, engine, version, skipAwsDefaults: true });
  const mysqlConfigArgs = mysqlParamsToDockerArgs(dbParams);

  const envVars: Record<string, string> = {
    MYSQL_ROOT_PASSWORD: pass,
    MYSQL_DATABASE: database
  };

  // Add non-root user if specified
  if (user !== 'root') {
    envVars.MYSQL_USER = user;
    envVars.MYSQL_PASSWORD = pass;
  }

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    ...Object.entries(envVars).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
    '-p',
    `${actualPort}:${defaultPort}`,
    '-v',
    `${dataDir}:${MYSQL_DATA_PATH}`,
    imageTag,
    ...mysqlConfigArgs
  ];

  await execDocker(dockerArgs);

  await waitForReady({
    containerName,
    resourceType: isMaria ? 'MariaDB' : 'MySQL',
    timeoutMs: 60000,
    pollIntervalMs: 1000,
    checkFn: async () => {
      const { exitCode } = await execDocker(
        ['exec', containerName, 'mysqladmin', 'ping', '-h', 'localhost', '--silent'],
        { skipHandleError: true }
      );
      return exitCode === 0;
    }
  });

  const connInfo = buildConnectionInfo(user, pass, DEFAULT_LOCAL_HOST, actualPort, database);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
