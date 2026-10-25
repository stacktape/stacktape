import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { readdir } from 'node:fs/promises';
import { execDocker } from '@utils/docker';
import {
  buildDockerRunArgs,
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
  removeContainerIfExists,
  waitForReady
} from './container-helpers';
import { getLocalDbParameters, postgresParamsToDockerArgs } from './db-parameters';

/**
 * Where the data volume mounts. The official images from Postgres 18 keep data in a version-named directory under
 * `/var/lib/postgresql` and refuse to start with a volume at the older `/var/lib/postgresql/data`.
 */
const POSTGRES_LEGACY_DATA_PATH = '/var/lib/postgresql/data';

export const postgresDataPath = (version: string): string => {
  const major = Number.parseInt(version, 10);
  return version === 'latest' || major >= 18 ? '/var/lib/postgresql' : POSTGRES_LEGACY_DATA_PATH;
};

/**
 * Whether a data directory holds a cluster written at the pre-18 path: `PG_VERSION` directly in it. Mounted at
 * `/var/lib/postgresql`, a Postgres 18+ image would ignore those files and initialize an empty database next to them.
 * On Linux the old container owns the directory, so the check runs from a container of the image when the developer
 * cannot read it.
 */
export const hasPreVersion18Data = async ({
  dataDir,
  imageTag,
  readDirectory = readdir,
  runCheck = async (directory: string) => {
    try {
      await execDocker(
        [
          'run',
          '--rm',
          '--user',
          '0',
          '--entrypoint',
          'test',
          '-v',
          `${directory}:/check`,
          imageTag,
          '-f',
          '/check/PG_VERSION'
        ],
        { skipHandleError: true }
      );
      return true;
    } catch {
      return false;
    }
  }
}: {
  dataDir: string;
  imageTag: string;
  readDirectory?: (directory: string) => Promise<string[]>;
  runCheck?: (directory: string) => Promise<boolean>;
}): Promise<boolean> => {
  try {
    return (await readDirectory(dataDir)).includes('PG_VERSION');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return false;
    if (code !== 'EACCES' && code !== 'EPERM') throw error;
    return runCheck(dataDir);
  }
};

export const preVersion18DataError = (name: string, version: string) =>
  new Error(
    `The local data of "${name}" was written by Postgres 17 or older, and the Postgres ${version} image keeps its data in a different directory, so it would start with an empty database next to your data. ` +
      'Restart with --fresh-db to start over with an empty database. To keep the data, set the old version in the config, run stacktape dev and pg_dump it, then switch to the new version with --fresh-db and restore the dump.'
  );

export const buildConnectionInfo = (user: string, pass: string, host: string, port: number, database: string) => {
  const connectionString = `postgresql://${user}:${pass}@${host}:${port}/${database}`;
  return {
    connectionString,
    referencableParams: {
      host,
      port: String(port),
      dbName: database,
      connectionString,
      jdbcConnectionString: `jdbc:postgresql://${host}:${port}/${database}?user=${user}&password=${pass}`
    }
  };
};

export const startLocalPostgres = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, version, port, dataDir, dbName, containerName } = config;
  const { username: user, password: pass } = getDbCredentials(config, { username: 'postgres' });
  const database = dbName || 'postgres';

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, DEFAULT_PORTS.postgres, port);
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
  const imageTag = getImageTag(version, 'postgres');
  if (postgresDataPath(version) !== POSTGRES_LEGACY_DATA_PATH && (await hasPreVersion18Data({ dataDir, imageTag }))) {
    throw preVersion18DataError(name, version);
  }

  // Fetch and merge database parameters (skip AWS defaults for faster dev startup)
  const dbParams = await getLocalDbParameters({
    resourceName: name,
    engine: 'postgres',
    version,
    skipAwsDefaults: true
  });
  const postgresConfigArgs = postgresParamsToDockerArgs(dbParams);

  for (let attempt = 0; attempt < 5; attempt++) {
    const dockerArgs = buildDockerRunArgs({
      containerName,
      envVars: {
        POSTGRES_USER: user,
        POSTGRES_PASSWORD: pass,
        POSTGRES_DB: database
      },
      portMapping: { host: actualPort, container: DEFAULT_PORTS.postgres },
      volumeMapping: { host: dataDir, container: postgresDataPath(version) },
      imageTag,
      additionalArgs: postgresConfigArgs
    });

    try {
      await execDocker(dockerArgs);
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
    resourceType: 'Postgres',
    timeoutMs: 30000,
    pollIntervalMs: 500,
    // Over TCP: while the image initializes a new data directory it runs a temporary server on the Unix socket only,
    // then restarts, so a socket check reports ready before the server clients connect to is up.
    checkFn: async () => {
      const { exitCode } = await execDocker(
        ['exec', containerName, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
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
