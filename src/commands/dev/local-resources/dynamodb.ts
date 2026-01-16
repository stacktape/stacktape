import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { execDocker } from '@shared/utils/docker';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  findAvailablePort,
  getContainerPort,
  isContainerRunning,
  waitForReady
} from './container-helpers';

const DYNAMODB_DATA_PATH = '/home/dynamodblocal/data';
const DYNAMODB_IMAGE = 'amazon/dynamodb-local';

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

const buildConnectionInfo = (host: string, port: number, tableName: string) => {
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
      return {
        success: false,
        error: data.message || data.__type || `HTTP ${response.status}`
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
  const endpoint = `http://localhost:${port}`;

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
    tuiManager.warn(`Failed to create DynamoDB table "${tableName}": ${createResult.error}`);
  }
};

export const startLocalDynamoDb = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, port, dataDir, containerName } = config;
  const defaultPort = DEFAULT_PORTS.dynamodb;

  // Get table config for creating the table
  const tableConfig = configManager.dynamoDbTables?.find((t) => t.name === name);

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, defaultPort, port);
    const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, name);

    // Ensure table exists (may have been deleted or container restarted with empty data)
    if (tableConfig) {
      try {
        await createTableIfNotExists(actualPort, name, tableConfig);
      } catch (err) {
        tuiManager.warn(`Failed to ensure DynamoDB table exists: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return buildLocalResourceInstance({
      config,
      host: DEFAULT_LOCAL_HOST,
      actualPort,
      ...connInfo
    });
  }

  const actualPort = await findAvailablePort(port);

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${actualPort}:${defaultPort}`,
    '-v',
    `${dataDir}:${DYNAMODB_DATA_PATH}`,
    DYNAMODB_IMAGE,
    '-jar',
    'DynamoDBLocal.jar',
    '-sharedDb',
    '-dbPath',
    DYNAMODB_DATA_PATH
  ];

  await execDocker(dockerArgs);

  await waitForReady({
    containerName,
    resourceType: 'DynamoDB',
    timeoutMs: 30000,
    pollIntervalMs: 300,
    checkFn: async () => {
      const result = await listTables(`http://localhost:${actualPort}`);
      return result.success;
    }
  });

  // Create the table
  if (tableConfig) {
    try {
      await createTableIfNotExists(actualPort, name, tableConfig);
    } catch (err) {
      tuiManager.warn(`Failed to create DynamoDB table "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const connInfo = buildConnectionInfo(DEFAULT_LOCAL_HOST, actualPort, name);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
