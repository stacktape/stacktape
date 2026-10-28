import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker } from '@utils/docker';
import { getDevContainerOwnerArgs } from '../cleanup-utils';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  getDbCredentials,
  getImageTag,
  isDockerPortBindError,
  isContainerRunning,
  publishOnLoopback,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';
import { getLocalDbParameters, mysqlParamsToDockerArgs } from './db-parameters';

const MYSQL_DATA_PATH = '/var/lib/mysql';

const isIncompatibleMysqlDataError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('Unsupported redo log format') || message.includes('Unknown/unsupported storage engine: InnoDB')
  );
};

export const incompatibleMysqlDataError = ({
  name,
  engine,
  version,
  dataDir
}: {
  name: string;
  engine: 'MySQL' | 'MariaDB';
  version: string;
  dataDir: string;
}) =>
  new Error(
    `The local data of "${name}" in ${dataDir} was written by a ${engine} version that ${engine} ${version} cannot read, so the database did not start. Your data is unchanged. ` +
      `To keep using it, set the version it was created with in the config. To start over with an empty database, restart with --fresh-db (this deletes the data). ` +
      `To move the data to ${engine} ${version}, run the old version, dump the database with mysqldump, then switch the version, restart with --fresh-db and load the dump.`
  );

export const buildConnectionInfo = (user: string, pass: string, host: string, port: number, database: string) => {
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
  const { username: user, password: pass } = getDbCredentials(config, { username: 'root' });
  // Resolved with `getLocalDatabaseName`, which every other consumer of the database name uses too.
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

  let actualPort = await findAvailablePort(port);
  const imageTag = getImageTag(version, isMaria ? 'mariadb' : 'mysql');

  // Fetch and merge database parameters (skip AWS defaults for faster dev startup)
  const engine = isMaria ? 'mariadb' : 'mysql';
  const dbParams = await getLocalDbParameters({ resourceName: name, engine, version, skipAwsDefaults: true });
  const mysqlConfigArgs = mysqlParamsToDockerArgs(dbParams);

  const envVars: Record<string, string> = {
    MYSQL_ROOT_PASSWORD: pass
  };

  // MariaDB/MySQL system database "mysql" already exists.
  // Passing MYSQL_DATABASE=mysql may cause initialization failures in some images.
  const shouldCreateDatabase = database.toLowerCase() !== 'mysql';

  if (shouldCreateDatabase) {
    envVars.MYSQL_DATABASE = database;
  }

  // A non-root user gets rights on MYSQL_DATABASE, which `getLocalDatabaseName` never leaves at `mysql` for one.
  if (user !== 'root') {
    envVars.MYSQL_USER = user;
    envVars.MYSQL_PASSWORD = pass;
  }

  const buildDockerArgs = (hostPort: number) => [
    'run',
    '-d',
    '--name',
    containerName,
    ...getDevContainerOwnerArgs(),
    ...Object.entries(envVars).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
    ...publishOnLoopback(hostPort, defaultPort),
    '-v',
    `${dataDir}:${MYSQL_DATA_PATH}`,
    imageTag,
    ...mysqlConfigArgs
  ];

  const runAndWaitUntilReady = async () => {
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
      resourceType: isMaria ? 'MariaDB' : 'MySQL',
      timeoutMs: 60000,
      pollIntervalMs: 1000,
      // Over TCP: during first initialization the image runs a temporary server on the socket only, which answers a
      // socket ping before clients can connect.
      checkFn: async () => {
        const { exitCode } = await execDocker(
          ['exec', containerName, 'mysqladmin', 'ping', '-h', '127.0.0.1', '--silent'],
          { skipHandleError: true }
        );
        return exitCode === 0;
      }
    });
  };

  try {
    await runAndWaitUntilReady();
  } catch (err) {
    if (!isIncompatibleMysqlDataError(err)) {
      throw err;
    }
    // The data stays: only --fresh-db deletes it, before the container starts (see `prepareLocalResource`).
    await removeContainerIfExists(containerName);
    throw incompatibleMysqlDataError({ name, engine: isMaria ? 'MariaDB' : 'MySQL', version, dataDir });
  }

  const connInfo = buildConnectionInfo(user, pass, DEFAULT_LOCAL_HOST, actualPort, database);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
