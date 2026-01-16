import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { execDocker } from '@shared/utils/docker';
import {
  buildDockerRunArgs,
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  findAvailablePort,
  getContainerPort,
  getDbCredentials,
  getImageTag,
  isContainerRunning,
  waitForReady
} from './container-helpers';
import { getLocalDbParameters, postgresParamsToDockerArgs } from './db-parameters';

const POSTGRES_DATA_PATH = '/var/lib/postgresql/data';

const buildConnectionInfo = (user: string, pass: string, host: string, port: number, database: string) => {
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
  const { username: user, password: pass } = getDbCredentials(config, {
    username: 'postgres',
    password: 'localdevpassword'
  });
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

  const actualPort = await findAvailablePort(port);
  const imageTag = getImageTag(version, 'postgres');

  // Fetch and merge database parameters (AWS defaults + Stacktape config + user overrides)
  const dbParams = await getLocalDbParameters({ resourceName: name, engine: 'postgres', version });
  const postgresConfigArgs = postgresParamsToDockerArgs(dbParams);

  const dockerArgs = buildDockerRunArgs({
    containerName,
    envVars: {
      POSTGRES_USER: user,
      POSTGRES_PASSWORD: pass,
      POSTGRES_DB: database
    },
    portMapping: { host: actualPort, container: DEFAULT_PORTS.postgres },
    volumeMapping: { host: dataDir, container: POSTGRES_DATA_PATH },
    imageTag,
    additionalArgs: postgresConfigArgs
  });

  await execDocker(dockerArgs);

  await waitForReady({
    containerName,
    resourceType: 'Postgres',
    timeoutMs: 30000,
    pollIntervalMs: 500,
    checkFn: async () => {
      const { exitCode } = await execDocker(['exec', containerName, 'pg_isready', '-U', 'postgres'], {
        skipHandleError: true
      });
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
