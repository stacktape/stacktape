import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { injectedParameterEnvVarName } from '@stacktape/naming/workload-names';
import { execDocker, inspectDockerContainer } from '@utils/docker';
import { ExpectedError } from '@utils/errors';
import { ensureDir, remove } from 'fs-extra';
import { basename, dirname } from 'node:path';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { localStatePaths } from 'src/config/local-state-paths';
import { createCleanupHook, getDevContainerName } from '../cleanup-utils';
import { DEV_CONFIG } from '../dev-config';
import {
  clearReservedPorts,
  getImageTag,
  hasExistingData,
  removeContainerIfExists,
  resolveLocalDatabasePassword
} from './container-helpers';
import { reconcileLocalDataIdentity } from './data-identity';
import { buildConnectionInfo as dynamoDbConnectionInfo, DYNAMODB_IMAGE, startLocalDynamoDb } from './dynamodb';
import { buildConnectionInfo as mysqlConnectionInfo, startLocalMysql } from './mysql';
import {
  buildConnectionInfo as openSearchConnectionInfo,
  getLocalOpenSearchImageTag,
  startLocalOpenSearch
} from './opensearch';
import { buildConnectionInfo as postgresConnectionInfo, startLocalPostgres } from './postgres';
import { buildConnectionInfo as redisConnectionInfo, getLocalRedisImageTag, startLocalRedis } from './redis';

/**
 * Parse Docker errors and return user-friendly message
 */
const parseDockerError = (err: Error): string => {
  const msg = err.message || '';
  // Docker daemon not running
  if (msg.includes('failed to connect to the docker API') || msg.includes('Cannot connect to the Docker daemon')) {
    return 'Docker is not running. Please start Docker Desktop and try again.';
  }
  // Docker not installed
  if (
    msg.includes('docker: command not found') ||
    msg.includes('is not recognized as an internal or external command')
  ) {
    return 'Docker is not installed. Please install Docker Desktop to use dev mode.';
  }
  // Permission denied
  if (msg.includes('permission denied') && msg.includes('docker.sock')) {
    return 'Docker permission denied. Try running with sudo or add your user to the docker group.';
  }
  return msg;
};

export type LocalResourceType = 'postgres' | 'mysql' | 'mariadb' | 'redis' | 'dynamodb' | 'opensearch';

export type LocalResourceConfig = {
  name: string;
  type: LocalResourceType;
  version: string;
  port: number;
  dataDir: string;
  credentials?: { username: string; password: string };
  dbName?: string;
};

export type LocalResourceInstance = LocalResourceConfig & {
  containerName: string;
  host: string;
  actualPort: number;
  connectionString: string;
  referencableParams: Record<string, string>;
};

const localResourceInstances: LocalResourceInstance[] = [];
/** Configs whose data directory and password are settled for this session; see `prepareLocalResource`. */
const preparedConfigs = new Map<string, LocalResourceConfig>();

const getDataDir = (resourceName: string) => {
  const { stage } = globalStateManager;
  return localStatePaths.devResourceDataDirectory({
    workingDirectory: globalStateManager.workingDir,
    stage,
    resourceName
  });
};

const getPasswordFile = (resourceName: string) =>
  localStatePaths.devResourcePasswordFile({
    workingDirectory: globalStateManager.workingDir,
    stage: globalStateManager.stage,
    resourceName
  });

const getIdentityFile = (resourceName: string) =>
  localStatePaths.devResourceIdentityFile({
    workingDirectory: globalStateManager.workingDir,
    stage: globalStateManager.stage,
    resourceName
  });

const getStagePasswordFile = (resourceName: string) =>
  localStatePaths.devStagePasswordFile({
    projectName: globalStateManager.targetStack.projectName,
    stage: globalStateManager.stage,
    resourceName
  });

/**
 * All local DynamoDB tables of a session live in one DynamoDB Local container with one data directory, so the one
 * `AWS_ENDPOINT_URL_DYNAMODB` that the AWS SDK reads reaches every table. Resource names are alphanumeric, so this
 * name cannot collide with one.
 */
const SHARED_DYNAMODB_LOCAL_NAME = 'dynamodb-local';

const getLocalContainerName = ({ name, type }: LocalResourceConfig) =>
  getDevContainerName({
    projectName: globalStateManager.targetStack.projectName,
    stage: globalStateManager.stage,
    workingDirectory: globalStateManager.workingDir,
    name: type === 'dynamodb' ? SHARED_DYNAMODB_LOCAL_NAME : name
  });

/**
 * Before containers were named per working directory, a database container was `stp-<project>-<stage>-<resource>`.
 * One left running by an older CLI in this directory still writes to the same data directory, and a second database
 * server on that directory would corrupt it, so it is removed. Containers of other directories are left alone.
 */
const removeLegacyContainerUsingDataDir = async (resourceName: string, dataDir: string) => {
  const legacyName = `stp-${globalStateManager.targetStack.projectName}-${globalStateManager.stage}-${resourceName}`;
  const info = await inspectDockerContainer(legacyName);
  if (info.Mounts?.some((mount) => mount.Source === dataDir)) {
    await removeContainerIfExists(legacyName);
  }
};

const RELATIONAL_TYPES: ReadonlySet<LocalResourceType> = new Set(['postgres', 'mysql', 'mariadb']);

const DIRECTIVE = /\$[A-Z][A-Za-z]*\(/;

/**
 * A configured credential that a local database uses as it is. A directive such as `$Secret('db.password')` reads the
 * deployed database's secret, which dev mode never fetches for a local database, so the local one gets its own value.
 */
const getLocalCredential = (value: string | undefined): string | undefined =>
  value && !DIRECTIVE.test(value) ? value : undefined;

const getLocalImage = ({ type, version }: LocalResourceConfig): string => {
  if (type === 'redis') return getLocalRedisImageTag(version);
  if (type === 'dynamodb') return DYNAMODB_IMAGE;
  if (type === 'opensearch') return getLocalOpenSearchImageTag(version);
  return getImageTag(version, type);
};

/**
 * Deletes a local database's data for `--freshDb`. On Linux the database container owns the files it wrote and the
 * developer cannot delete them, so they are deleted as root from a container of the same image, which is already
 * present because it wrote them.
 */
const removeLocalData = async (config: LocalResourceConfig) => {
  try {
    await remove(config.dataDir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EACCES' && code !== 'EPERM') throw error;
    await execDocker([
      'run',
      '--rm',
      '--user',
      '0',
      '--entrypoint',
      'rm',
      '-v',
      `${dirname(config.dataDir)}:/stacktape-data`,
      getLocalImage(config),
      '-rf',
      `/stacktape-data/${basename(config.dataDir)}`
    ]);
  }
};

const mapEngineToLocalType = (engineType: string): 'postgres' | 'mysql' | 'mariadb' | null => {
  if (
    ['postgres', 'aurora-postgresql', 'aurora-postgresql-serverless', 'aurora-postgresql-serverless-v2'].includes(
      engineType
    )
  ) {
    return 'postgres';
  }
  if (['mysql', 'aurora-mysql', 'aurora-mysql-serverless', 'aurora-mysql-serverless-v2'].includes(engineType)) {
    return 'mysql';
  }
  if (engineType === 'mariadb') {
    return 'mariadb';
  }
  return null;
};

const isAuroraEngine = (engineType: string): boolean => {
  return engineType.startsWith('aurora-');
};

export const getLocalEmulateableResources = (): {
  name: string;
  type: 'relational-database' | 'redis-cluster' | 'dynamo-db-table' | 'open-search-domain';
  engineType: string;
}[] => {
  const resources: {
    name: string;
    type: 'relational-database' | 'redis-cluster' | 'dynamo-db-table' | 'open-search-domain';
    engineType: string;
  }[] = [];

  for (const db of configManager.databases || []) {
    const localType = mapEngineToLocalType(db.engine.type);
    if (localType) {
      resources.push({ name: db.name, type: 'relational-database', engineType: db.engine.type });
    }
  }

  for (const redis of configManager.redisClusters || []) {
    resources.push({ name: redis.name, type: 'redis-cluster', engineType: 'redis' });
  }

  for (const dynamoTable of configManager.dynamoDbTables || []) {
    resources.push({ name: dynamoTable.name, type: 'dynamo-db-table', engineType: 'dynamodb' });
  }

  for (const openSearchDomain of configManager.openSearchDomains || []) {
    resources.push({ name: openSearchDomain.name, type: 'open-search-domain', engineType: 'opensearch' });
  }
  return resources;
};

/**
 * Categorize connectTo resources into local (emulated) and deployed (remote).
 *
 * In the new dev mode:
 * - By default, emulatable resources run locally
 * - Resources marked as remote (via --remoteResources or dev.remote: true) connect to deployed AWS
 * - If selectedLocalResources is provided, only those databases run locally
 */
export const categorizeConnectToResources = ({
  connectTo,
  selectedLocalResources
}: {
  connectTo: string[];
  selectedLocalResources?: Set<string>;
}): { local: string[]; deployed: string[] } => {
  const local: string[] = [];
  const deployed: string[] = [];
  const emulateableResources = getLocalEmulateableResources();
  const emulateableNames = new Set(emulateableResources.map((r) => r.name));
  const remoteResourceNames = configManager.deploymentContext.remoteResourceNames;

  for (const resourceName of connectTo || []) {
    const isEmulatable = emulateableNames.has(resourceName);
    const isRemote = remoteResourceNames.has(resourceName);
    // If user explicitly selected which resources to run locally, respect that
    const isUserSelected = selectedLocalResources ? selectedLocalResources.has(resourceName) : true;

    if (isEmulatable && !isRemote && isUserSelected) {
      // Run locally (default for emulatable resources)
      local.push(resourceName);
    } else {
      // Use deployed AWS resource
      deployed.push(resourceName);
    }
  }

  return { local, deployed };
};

/**
 * The database a local relational database serves, used by its container, local workloads, deployed dev functions
 * through the relay and the agent's queries. MySQL's system database `mysql` is the default for `root`; a non-root
 * user gets no rights on it, so the container creates `app` for that user instead.
 */
export const getLocalDatabaseName = ({
  type,
  configuredDbName,
  username
}: {
  type: 'postgres' | 'mysql' | 'mariadb';
  configuredDbName?: string;
  username: string;
}): string => {
  if (type === 'postgres') return configuredDbName || 'postgres';
  const dbName = configuredDbName || 'mysql';
  return username !== 'root' && dbName.toLowerCase() === 'mysql' ? 'app' : dbName;
};

const buildLocalResourceConfig = (resourceName: string): LocalResourceConfig | null => {
  const db = configManager.databases?.find((r) => r.name === resourceName);
  if (db) {
    const localType = mapEngineToLocalType(db.engine.type);
    if (!localType) return null;

    const engineProps = db.engine.properties as any;
    const version = engineProps?.version || 'latest';
    const port = engineProps?.port || (localType === 'mysql' || localType === 'mariadb' ? 3306 : 5432);
    const isMysqlType = localType === 'mysql' || localType === 'mariadb';
    const username = getLocalCredential(db.credentials?.masterUserName) || (isMysqlType ? 'root' : 'postgres');
    const dbName = getLocalDatabaseName({
      type: localType,
      configuredDbName: engineProps?.dbName || engineProps?.primaryDbName,
      username
    });

    if (isAuroraEngine(db.engine.type)) {
      tuiManager.warn(
        `Resource "${resourceName}" uses Aurora engine. Running as standard ${localType} locally (some Aurora features unavailable).`
      );
    }

    return {
      name: resourceName,
      type: localType,
      version,
      port,
      dataDir: getDataDir(resourceName),
      // Without a literal password, one is generated once the data directory is known to be fresh or not.
      credentials: {
        username,
        password: getLocalCredential(db.credentials?.masterUserPassword) || ''
      },
      dbName
    };
  }

  const redis = configManager.redisClusters?.find((r) => r.name === resourceName);
  if (redis) {
    return {
      name: resourceName,
      type: 'redis',
      version: redis.engineVersion || '7.2',
      port: redis.port || 6379,
      dataDir: getDataDir(resourceName),
      // Redis without a configured password runs without authentication, like the deployed cluster.
      credentials: redis.defaultUserPassword
        ? { username: 'default', password: getLocalCredential(redis.defaultUserPassword) || '' }
        : undefined
    };
  }

  const dynamoTable = configManager.dynamoDbTables?.find((r) => r.name === resourceName);
  if (dynamoTable) {
    return {
      name: resourceName,
      type: 'dynamodb',
      version: 'latest',
      port: 8000,
      dataDir: getDataDir(SHARED_DYNAMODB_LOCAL_NAME)
    };
  }

  const openSearchDomain = configManager.openSearchDomains?.find((r) => r.name === resourceName);
  if (openSearchDomain) {
    return {
      name: resourceName,
      type: 'opensearch',
      version: (openSearchDomain as any).engineVersion || '2.17.0',
      port: 9200,
      dataDir: getDataDir(resourceName)
    };
  }

  return null;
};

/**
 * The password that data created before generated passwords was initialized with: the fixed default, or the directive
 * text itself when the configured password was a directive. Redis reads its password at every start and has none.
 */
const getLegacyLocalPassword = (config: LocalResourceConfig): string | undefined => {
  if (!RELATIONAL_TYPES.has(config.type)) return undefined;
  const configured = configManager.databases?.find((db) => db.name === config.name)?.credentials?.masterUserPassword;
  return configured || DEV_CONFIG.localResources.legacyPassword;
};

/**
 * Builds a local database's config and settles its data directory and password: `--fresh-db` deletes the data once,
 * and a database without a literal password gets its generated one. Every consumer reads the password from this
 * config: the container, the deployed dev functions through the relay, local workloads, frontends and the agent's
 * `/env`. Runs once per resource and session, before the dev stack is deployed when deployed functions reach the
 * database, because their environment carries the password.
 */
export const prepareLocalResource = async (resourceName: string): Promise<LocalResourceConfig | null> => {
  const prepared = preparedConfigs.get(resourceName);
  if (prepared) return prepared;
  const config = buildLocalResourceConfig(resourceName);
  if (!config) return null;
  await removeLegacyContainerUsingDataDir(resourceName, config.dataDir);
  // With --fresh-db, remove the existing data directory and its password; the new data gets the stage's password.
  if (globalStateManager.args.freshDb) {
    await removeLocalData(config);
    await remove(getPasswordFile(resourceName));
    await remove(getIdentityFile(resourceName));
  }
  await ensureDir(config.dataDir);
  if (config.credentials && !config.credentials.password) {
    const { password, legacy } = resolveLocalDatabasePassword({
      passwordFile: getPasswordFile(resourceName),
      stagePasswordFile: getStagePasswordFile(resourceName),
      dataDir: config.dataDir,
      legacyPassword: getLegacyLocalPassword(config)
    });
    config.credentials.password = password;
    if (legacy) {
      tuiManager.warn(
        `Local database "${resourceName}" keeps the password "${password}" its data was created with. ` +
          'To switch it to a generated password, start dev mode once with --fresh-db (this deletes its local data).'
      );
    }
  }
  preparedConfigs.set(resourceName, config);
  return config;
};

/**
 * The parameters `getRelayedLocalResource` gives deployed dev functions for a local resource, known before its
 * container or credentials exist; `undefined` when it cannot run locally.
 */
export const getRelayedLocalResourceParamNames = (resourceName: string): string[] | undefined => {
  const params = (() => {
    const db = configManager.databases?.find(({ name }) => name === resourceName);
    if (db) {
      const localType = mapEngineToLocalType(db.engine.type);
      if (!localType) return undefined;
      return (localType === 'postgres' ? postgresConnectionInfo : mysqlConnectionInfo)('', '', '', 0, '')
        .referencableParams;
    }
    if (configManager.redisClusters?.some(({ name }) => name === resourceName)) {
      // With a password, the parameters include `username`.
      return redisConnectionInfo('', 0, 'password').referencableParams;
    }
    if (configManager.dynamoDbTables?.some(({ name }) => name === resourceName)) {
      return dynamoDbConnectionInfo('', 0, '').referencableParams;
    }
    if (configManager.openSearchDomains?.some(({ name }) => name === resourceName)) {
      return openSearchConnectionInfo('', 0).referencableParams;
    }
    return undefined;
  })();
  return params && Object.keys(params);
};

/**
 * A local database as deployed dev functions see it through the dev box: its referenceable parameters at the relay
 * address, and the environment its clients need besides them.
 */
export const getRelayedLocalResource = async (
  resourceName: string,
  relay: { host: string; port: number }
): Promise<{ params: Record<string, string>; environment: Record<string, string> } | null> => {
  const config = await prepareLocalResource(resourceName);
  if (!config) return null;
  const { host, port } = relay;
  const user = config.credentials?.username ?? '';
  const password = config.credentials?.password ?? '';
  switch (config.type) {
    case 'postgres':
      return {
        params: postgresConnectionInfo(user, password, host, port, config.dbName!).referencableParams,
        environment: {}
      };
    case 'mysql':
    case 'mariadb':
      return {
        params: mysqlConnectionInfo(user, password, host, port, config.dbName!).referencableParams,
        environment: {}
      };
    case 'redis':
      return {
        params: redisConnectionInfo(host, port, config.credentials?.password).referencableParams,
        environment: {}
      };
    case 'dynamodb': {
      const { referencableParams } = dynamoDbConnectionInfo(host, port, config.name);
      return { params: referencableParams, environment: { AWS_ENDPOINT_URL_DYNAMODB: referencableParams.endpoint } };
    }
    case 'opensearch':
      return { params: openSearchConnectionInfo(host, port).referencableParams, environment: {} };
  }
};

export const startLocalResources = async (resourceNames: string[]): Promise<LocalResourceInstance[]> => {
  if (!resourceNames.length) return [];

  // Port conflicts are handled per resource in findAvailablePort (with stage offset)
  const configs: Array<{ resourceName: string; config: LocalResourceConfig; containerName: string }> = [];

  for (const resourceName of resourceNames) {
    const config = await prepareLocalResource(resourceName);
    if (!config) {
      tuiManager.warn(`Cannot create local config for resource "${resourceName}"`);
      continue;
    }
    configs.push({ resourceName, config, containerName: getLocalContainerName(config) });
  }

  const useDevTui = devTuiManager.running;

  const errors: Array<{ resourceName: string; error: Error }> = [];

  const startPromises = configs.map(async ({ resourceName, config, containerName }) => {
    // Update DevTui status
    if (useDevTui) {
      devTuiManager.setLocalResourceStatus(resourceName, 'starting');
    }

    let instance: LocalResourceInstance;
    try {
      const isRelational = RELATIONAL_TYPES.has(config.type);
      const hadData = isRelational && hasExistingData(config.dataDir);
      if (config.type === 'postgres') {
        instance = await startLocalPostgres({ ...config, containerName });
      } else if (config.type === 'mysql' || config.type === 'mariadb') {
        instance = await startLocalMysql({ ...config, containerName });
      } else if (config.type === 'redis') {
        instance = await startLocalRedis({ ...config, containerName });
      } else if (config.type === 'dynamodb') {
        instance = await startLocalDynamoDb({ ...config, containerName });
      } else if (config.type === 'opensearch') {
        instance = await startLocalOpenSearch({ ...config, containerName });
      } else {
        throw new Error(`Unsupported local resource type: ${config.type}`);
      }

      // Registered before the identity check, so the cleanup removes the container when the check fails.
      localResourceInstances.push(instance);
      if (isRelational) {
        const identity = await reconcileLocalDataIdentity({
          config,
          containerName,
          identityFile: getIdentityFile(resourceName),
          hadData
        });
        if (identity === 'created') {
          tuiManager.info(
            `[${resourceName}] Created database "${config.dbName}" and user "${config.credentials?.username}" in the existing local data.`
          );
        }
      }

      // Update DevTui with success
      if (useDevTui) {
        devTuiManager.setLocalResourceStatus(resourceName, 'running', {
          port: instance.actualPort,
          host: instance.host,
          connectionString: instance.connectionString
        });
      }

      return instance;
    } catch (err) {
      const friendlyError = parseDockerError(err);
      if (useDevTui) {
        devTuiManager.setLocalResourceStatus(resourceName, 'error', { error: friendlyError });
      }
      // Always collect errors - we'll throw after all resources are attempted
      errors.push({ resourceName, error: new Error(friendlyError) });
      return null;
    }
  });

  const results = await Promise.all(startPromises);

  // Clear reserved ports after startup cycle completes (success or failure)
  clearReservedPorts();

  // Throw if any resources failed to start
  if (errors.length > 0) {
    const failedNames = errors.map((e) => `${e.resourceName}: ${e.error.message}`).join('\n  ');
    // Check if it's a Docker-related error to provide better hints
    const isDockerError = errors.some(
      (e) => e.error.message.includes('Docker is not running') || e.error.message.includes('Docker is not installed')
    );
    const hint = isDockerError ? 'Start Docker Desktop and try again.' : undefined;
    throw new ExpectedError('DOCKER', `Failed to start local resource(s):\n  ${failedNames}`, hint);
  }

  const successfulResults = results.filter((r): r is LocalResourceInstance => r !== null);

  // Log summary (useful for debugging and non-DevTui mode)
  if (successfulResults.length > 0 && !useDevTui) {
    const summary = successfulResults.map((r) => `${r.name} (${r.type}:${r.actualPort})`).join(', ');
    tuiManager.success(`Started ${successfulResults.length} local resource(s): ${summary}`);
  }

  return successfulResults;
};

/**
 * Stops the local databases and removes their containers. Their data stays in the data directories, and the next start
 * creates a new container in any case, so a stopped container only piled up: one per database, stage and checkout.
 */
const stopLocalResources = async (): Promise<void> => {
  if (localResourceInstances.length === 0) return;

  // Local tables share one DynamoDB Local container.
  const containerNames = [...new Set(localResourceInstances.map(({ containerName }) => containerName))];
  await Promise.all(
    containerNames.map((containerName) =>
      // Stops the database gracefully first. The container may have already stopped or been removed.
      removeContainerIfExists(containerName).catch(() => {})
    )
  );
  localResourceInstances.length = 0;
  preparedConfigs.clear();
};

export const getLocalResourceEnvVars = (instances: LocalResourceInstance[]): Record<string, string> => {
  const envVars: Record<string, string> = {};

  for (const instance of instances) {
    for (const [paramName, value] of Object.entries(instance.referencableParams)) {
      const envVarName = injectedParameterEnvVarName(instance.name, paramName);
      envVars[envVarName] = value;
    }
  }

  return envVars;
};

export const getRunningLocalInstances = (): LocalResourceInstance[] => {
  return [...localResourceInstances];
};

/**
 * Register cleanup hook for local resources.
 * Must be called explicitly when dev command starts.
 */
export const registerLocalResourceCleanupHook = createCleanupHook('local-resources', async () => {
  await stopLocalResources();
});
