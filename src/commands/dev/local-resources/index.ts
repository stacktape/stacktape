import { join } from 'node:path';
import { ensureDir } from 'fs-extra';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { injectedParameterEnvVarName } from '@shared/naming/utils';
import { startLocalDynamoDb } from './dynamodb';
import { startLocalMysql } from './mysql';
import { startLocalPostgres } from './postgres';
import { startLocalRedis } from './redis';

export type LocalResourceType = 'postgres' | 'mysql' | 'mariadb' | 'redis' | 'dynamodb';

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
  return join(globalStateManager.workingDir, '.stacktape', 'dev-data', resourceName, 'data');
};

const getLocalContainerName = (resourceName: string) => {
  return `stp-local-${resourceName}`;
};

export const getSupportedLocalResourceTypes = (): LocalResourceType[] => [
  'postgres',
  'mysql',
  'mariadb',
  'redis',
  'dynamodb'
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
  type: 'relational-database' | 'redis-cluster' | 'dynamo-db-table';
  engineType: string;
}[] => {
  const resources: {
    name: string;
    type: 'relational-database' | 'redis-cluster' | 'dynamo-db-table';
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

  return resources;
};

export const categorizeConnectToResources = ({
  connectTo,
  forceLocal
}: {
  connectTo: string[];
  forceLocal?: string[] | boolean;
}): { local: string[]; deployed: string[] } => {
  const local: string[] = [];
  const deployed: string[] = [];
  const emulateableResources = getLocalEmulateableResources();
  const emulateableNames = new Set(emulateableResources.map((r) => r.name));

  const forceLocalAll = forceLocal === true;
  const forceLocalSet = new Set(Array.isArray(forceLocal) ? forceLocal : []);

  for (const resourceName of connectTo || []) {
    const isEmulatable = emulateableNames.has(resourceName);
    const isForced = forceLocalAll || forceLocalSet.has(resourceName);
    const isDeployed = !!deployedStackOverviewManager.getStpResource({ nameChain: resourceName });

    if (isEmulatable && (isForced || !isDeployed)) {
      local.push(resourceName);
    } else {
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

  return null;
};

export const startLocalResources = async (resourceNames: string[]): Promise<LocalResourceInstance[]> => {
  if (!resourceNames.length) return [];

  // Build configs first and pre-resolve port conflicts
  const configs: Array<{ resourceName: string; config: LocalResourceConfig; containerName: string }> = [];
  const usedPorts = new Set<number>();

  for (const resourceName of resourceNames) {
    const config = buildLocalResourceConfig(resourceName);
    if (!config) {
      tuiManager.warn(`Cannot create local config for resource "${resourceName}"`);
      continue;
    }
    // If port already claimed by another resource in this batch, find a free one
    while (usedPorts.has(config.port)) {
      config.port++;
    }
    usedPorts.add(config.port);
    configs.push({ resourceName, config, containerName: getLocalContainerName(resourceName) });
  }

  const multiSpinner = tuiManager.createMultiSpinner();

  const startPromises = configs.map(async ({ resourceName, config, containerName }) => {
    await ensureDir(config.dataDir);
    const spinner = multiSpinner.add(resourceName, `Starting local ${config.type}: ${resourceName}`);

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
      } else {
        throw new Error(`Unsupported local resource type: ${config.type}`);
      }

      localResourceInstances.push(instance);
      spinner.success({ details: `port ${instance.actualPort}` });
      return instance;
    } catch (err) {
      spinner.error(err.message);
      throw err;
    }
  });

  const results = await Promise.all(startPromises);
  return results.filter((r): r is LocalResourceInstance => r !== null);
};

export const stopLocalResources = async (): Promise<void> => {
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

applicationManager.registerCleanUpHook(async () => {
  await stopLocalResources();
});
