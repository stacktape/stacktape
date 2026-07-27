import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { injectedParameterEnvVarName } from '@shared/naming/utils';
import { stopDockerContainer } from '@shared/utils/docker';
import { ExpectedError } from '@utils/errors';
import { ensureDir } from 'fs-extra';
import { devTuiManager } from 'src/app/tui-manager/dev-tui';
import { createCleanupHook } from '../cleanup-utils';
import { clearReservedPorts } from './container-helpers';
import { startLocalDynamoDb } from './dynamodb';
import { startLocalMysql } from './mysql';
import { startLocalOpenSearch } from './opensearch';
import { startLocalPostgres } from './postgres';
import { startLocalRedis } from './redis';

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

const getDataDir = (resourceName: string) => {
  const { stage } = globalStateManager;
  return join(globalStateManager.workingDir, '.stacktape', 'dev-data', stage, resourceName, 'data');
};

const getLocalContainerName = (resourceName: string) => {
  const { stage } = globalStateManager;
  return `stp-${stage}-${resourceName}`;
};

export const getSupportedLocalResourceTypes = (): LocalResourceType[] => [
  'postgres',
  'mysql',
  'mariadb',
  'redis',
  'dynamodb',
  'opensearch'
];

const mapEngineToLocalType = (engineType: string): LocalResourceType | null => {
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
 * Get resource names that should use remote (deployed) AWS resources instead of local emulation.
 * This is determined by:
 * 1. The --remoteResources CLI flag
 * 2. The dev.remote: true config property on the resource
 */
export const getRemoteResourceNames = (): Set<string> => {
  const remoteNames = new Set<string>();

  // From CLI flag --remoteResources
  const cliRemoteResources = globalStateManager.args.remoteResources || [];
  cliRemoteResources.forEach((name) => remoteNames.add(name));

  // From config dev.remote: true
  for (const db of configManager.databases || []) {
    if ((db as any).dev?.remote) {
      remoteNames.add(db.name);
    }
  }
  for (const redis of configManager.redisClusters || []) {
    if ((redis as any).dev?.remote) {
      remoteNames.add(redis.name);
    }
  }
  for (const dynamoTable of configManager.dynamoDbTables || []) {
    if ((dynamoTable as any).dev?.remote) {
      remoteNames.add(dynamoTable.name);
    }
  }
  for (const openSearchDomain of configManager.openSearchDomains || []) {
    if ((openSearchDomain as any).dev?.remote) {
      remoteNames.add(openSearchDomain.name);
    }
  }

  return remoteNames;
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
  const remoteResourceNames = getRemoteResourceNames();

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

const buildLocalResourceConfig = (resourceName: string): LocalResourceConfig | null => {
  const db = configManager.databases?.find((r) => r.name === resourceName);
  if (db) {
    const localType = mapEngineToLocalType(db.engine.type);
    if (!localType) return null;

    const engineProps = db.engine.properties as any;
    const version = engineProps?.version || 'latest';
    const port = engineProps?.port || (localType === 'mysql' || localType === 'mariadb' ? 3306 : 5432);
    const isMysqlType = localType === 'mysql' || localType === 'mariadb';
    const defaultDbName = isMysqlType ? 'mysql' : 'postgres';
    const defaultUsername = isMysqlType ? 'root' : 'postgres';
    const dbName = engineProps?.dbName || engineProps?.primaryDbName || defaultDbName;

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
      credentials: {
        username: db.credentials?.masterUserName || defaultUsername,
        password: db.credentials?.masterUserPassword || 'localdevpassword'
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
      credentials: redis.defaultUserPassword ? { username: 'default', password: redis.defaultUserPassword } : undefined
    };
  }

  const dynamoTable = configManager.dynamoDbTables?.find((r) => r.name === resourceName);
  if (dynamoTable) {
    return {
      name: resourceName,
      type: 'dynamodb',
      version: 'latest',
      port: 8000,
      dataDir: getDataDir(resourceName)
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

export const startLocalResources = async (resourceNames: string[]): Promise<LocalResourceInstance[]> => {
  if (!resourceNames.length) return [];

  const freshDb = Boolean(globalStateManager.args.freshDb);

  // Build configs - port conflicts are handled per-resource in findAvailablePort (with stage offset)
  const configs: Array<{ resourceName: string; config: LocalResourceConfig; containerName: string }> = [];

  for (const resourceName of resourceNames) {
    const config = buildLocalResourceConfig(resourceName);
    if (!config) {
      tuiManager.warn(`Cannot create local config for resource "${resourceName}"`);
      continue;
    }
    configs.push({ resourceName, config, containerName: getLocalContainerName(resourceName) });
  }

  const useDevTui = devTuiManager.running;

  const errors: Array<{ resourceName: string; error: Error }> = [];

  const startPromises = configs.map(async ({ resourceName, config, containerName }) => {
    // If --freshDb flag is set, remove existing data directory
    if (freshDb) {
      const { remove, pathExists } = await import('fs-extra');
      if (await pathExists(config.dataDir)) {
        await remove(config.dataDir);
      }
    }
    await ensureDir(config.dataDir);

    // Update DevTui status
    if (useDevTui) {
      devTuiManager.setLocalResourceStatus(resourceName, 'starting');
    }

    let instance: LocalResourceInstance;
    try {
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

      localResourceInstances.push(instance);

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

export const stopLocalResources = async (): Promise<void> => {
  if (localResourceInstances.length === 0) return;

  const stopPromises = localResourceInstances.map(async (instance) => {
    try {
      await stopDockerContainer(instance.containerName, 5);
    } catch {
      // Container may have already stopped or been removed
    }
  });

  await Promise.all(stopPromises);
  localResourceInstances.length = 0;
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
