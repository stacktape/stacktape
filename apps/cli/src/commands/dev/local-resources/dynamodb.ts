import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { execDocker } from '@utils/docker';
import { getDevContainerOwnerArgs } from '../cleanup-utils';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  isDockerPortBindError,
  isContainerRunning,
  publishOnLoopback,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';

const DYNAMODB_DATA_PATH = '/home/dynamodblocal/data';
export const DYNAMODB_IMAGE = 'amazon/dynamodb-local';

const DYNAMODB_LOCAL_HEADERS = {
  'X-Amz-Target': 'DynamoDB_20120810.ListTables',
  'Content-Type': 'application/x-amz-json-1.0',
  Authorization:
    'AWS4-HMAC-SHA256 Credential=local/20200101/local/dynamodb/aws4_request, SignedHeaders=host;x-amz-date, Signature=local',
  'X-Amz-Date': '20200101T000000Z'
};

const getDynamoDbHeaders = (target: string) => ({
  ...DYNAMODB_LOCAL_HEADERS,
  'X-Amz-Target': target
});

export const buildConnectionInfo = (host: string, port: number, tableName: string) => {
  const endpoint = `http://${host}:${port}`;
  return {
    connectionString: endpoint,
    referencableParams: {
      name: tableName,
      arn: `arn:aws:dynamodb:local:000000000000:table/${tableName}`,
      endpoint
    }
  };
};

type DynamoDbResponse<T> = T & { __type?: string; message?: string };

const makeDynamoDbRequest = async <T>(
  endpoint: string,
  target: string,
  body: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getDynamoDbHeaders(target),
      body: JSON.stringify(body)
    });

    const data = (await response.json()) as DynamoDbResponse<T>;

    if (!response.ok || data.__type) {
      // The error type, such as `ResourceInUseException`, stays in the message so a caller can tell errors apart.
      const type = data.__type?.split('#').pop();
      return {
        success: false,
        error: [data.message, type && `(${type})`].filter(Boolean).join(' ') || `HTTP ${response.status}`
      };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
};

const listTables = async (endpoint: string): Promise<{ success: boolean; tables?: string[]; error?: string }> => {
  const result = await makeDynamoDbRequest<{ TableNames?: string[] }>(endpoint, 'DynamoDB_20120810.ListTables');

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, tables: result.data?.TableNames || [] };
};

const createTableIfNotExists = async (
  port: number,
  tableName: string,
  tableConfig: {
    primaryKey?: { partitionKey: { name: string; type: string }; sortKey?: { name: string; type: string } };
  }
): Promise<void> => {
  const endpoint = `http://127.0.0.1:${port}`;

  // Check if table exists
  const listResult = await listTables(endpoint);
  if (!listResult.success) {
    tuiManager.warn(`Failed to list DynamoDB tables: ${listResult.error}. Table creation may fail.`);
  } else if (listResult.tables?.includes(tableName)) {
    return; // Table already exists
  }

  // Build attribute definitions and key schema from config
  const primaryKey = tableConfig.primaryKey;
  if (!primaryKey) {
    tuiManager.warn(`Table "${tableName}" has no primaryKey configuration. Skipping table creation.`);
    return;
  }

  const attrTypeMap: Record<string, string> = { string: 'S', number: 'N', binary: 'B' };
  const attributeDefinitions: Array<{ AttributeName: string; AttributeType: string }> = [];
  const keySchema: Array<{ AttributeName: string; KeyType: string }> = [];

  // Partition key
  attributeDefinitions.push({
    AttributeName: primaryKey.partitionKey.name,
    AttributeType: attrTypeMap[primaryKey.partitionKey.type] || 'S'
  });
  keySchema.push({ AttributeName: primaryKey.partitionKey.name, KeyType: 'HASH' });

  // Sort key (optional)
  if (primaryKey.sortKey) {
    attributeDefinitions.push({
      AttributeName: primaryKey.sortKey.name,
      AttributeType: attrTypeMap[primaryKey.sortKey.type] || 'S'
    });
    keySchema.push({ AttributeName: primaryKey.sortKey.name, KeyType: 'RANGE' });
  }

  // Create table
  const createPayload = {
    TableName: tableName,
    AttributeDefinitions: attributeDefinitions,
    KeySchema: keySchema,
    BillingMode: 'PAY_PER_REQUEST'
  };

  const createResult = await makeDynamoDbRequest(endpoint, 'DynamoDB_20120810.CreateTable', createPayload);

  if (!createResult.success) {
    // Check if it's a "table already exists" error (race condition)
    if (createResult.error?.includes('ResourceInUseException') || createResult.error?.includes('already exists')) {
      return;
    }
    // A table that does not exist must not look like a running local resource.
    throw new Error(`Creating the local DynamoDB table "${tableName}" failed: ${createResult.error}`);
  }
};

/** Starts of the shared DynamoDB Local container in progress, so the tables that start together run one container. */
const containerStarts = new Map<string, Promise<number>>();

/**
 * Starts the session's DynamoDB Local container, or reuses it when it runs, and returns its host port. Every local table
 * of the session lives in this one container; see `SHARED_DYNAMODB_LOCAL_NAME`.
 */
const ensureDynamoDbLocalContainer = (config: LocalResourceConfig & { containerName: string }): Promise<number> => {
  const { containerName } = config;
  const running = containerStarts.get(containerName);
  if (running) return running;
  const start = startDynamoDbLocalContainer(config).finally(() => containerStarts.delete(containerName));
  containerStarts.set(containerName, start);
  return start;
};

const startDynamoDbLocalContainer = async ({
  port,
  dataDir,
  containerName
}: LocalResourceConfig & { containerName: string }): Promise<number> => {
  const defaultPort = DEFAULT_PORTS.dynamodb;
  if (await isContainerRunning(containerName)) {
    return getContainerPort(containerName, defaultPort, port);
  }

  // Remove stopped container with same name if it exists
  if (await doesContainerExist(containerName)) {
    await removeContainerIfExists(containerName);
  }

  let actualPort = await findAvailablePort(port);

  const buildDockerArgs = (hostPort: number) => [
    'run',
    '-d',
    '--name',
    containerName,
    ...getDevContainerOwnerArgs(),
    ...publishOnLoopback(hostPort, defaultPort),
    '-v',
    `${dataDir}:${DYNAMODB_DATA_PATH}`,
    DYNAMODB_IMAGE,
    '-jar',
    'DynamoDBLocal.jar',
    '-sharedDb',
    '-dbPath',
    DYNAMODB_DATA_PATH
  ];

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
    resourceType: 'DynamoDB',
    timeoutMs: 30000,
    pollIntervalMs: 300,
    checkFn: async () => {
      const result = await listTables(`http://127.0.0.1:${actualPort}`);
      return result.success;
    }
  });
  return actualPort;
};

/** Starts one local table: the shared DynamoDB Local container, then the table in it unless it exists. */
export const startLocalDynamoDb = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name } = config;
  const tableConfig = configManager.dynamoDbTables?.find((t) => t.name === name);
  const actualPort = await ensureDynamoDbLocalContainer(config);

  // The table may be missing although the container runs: it was deleted, or the data directory is new.
  if (tableConfig) await createTableIfNotExists(actualPort, name, tableConfig);

  const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, name);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
