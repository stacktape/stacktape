import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { configManager } from '@domain-services/config-manager';
import { execDocker, inspectDockerContainer } from '@shared/utils/docker';
import { isPortInUse } from '@shared/utils/ports';
import findFreePorts from 'find-free-ports';

const DYNAMODB_DEFAULT_PORT = 8000;
const DYNAMODB_DATA_PATH = '/home/dynamodblocal/data';

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

const waitForDynamoDbReady = async (port: number, timeoutMs = 30000): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'POST',
        headers: getDynamoDbHeaders('DynamoDB_20120810.ListTables'),
        body: '{}'
      });
      if (response.ok) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`DynamoDB local did not become ready within ${timeoutMs}ms`);
};

const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const info = await inspectDockerContainer(containerName);
  return info?.State?.Running === true;
};

const createTableIfNotExists = async (port: number, tableName: string, tableConfig: any): Promise<void> => {
  const endpoint = `http://localhost:${port}`;

  // Check if table exists
  const listResponse = await fetch(endpoint, {
    method: 'POST',
    headers: getDynamoDbHeaders('DynamoDB_20120810.ListTables'),
    body: '{}'
  });
  const listResult = (await listResponse.json()) as { TableNames?: string[] };
  if (listResult.TableNames?.includes(tableName)) return;

  // Build attribute definitions and key schema from config
  // In StpDynamoTable, primaryKey is at the top level (not under properties)
  const primaryKey = tableConfig.primaryKey;
  if (!primaryKey) throw new Error(`Table ${tableName} has no primaryKey configuration`);

  const attrTypeMap: Record<string, string> = { string: 'S', number: 'N', binary: 'B' };
  const attributeDefinitions: any[] = [];
  const keySchema: any[] = [];

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

  await fetch(endpoint, {
    method: 'POST',
    headers: getDynamoDbHeaders('DynamoDB_20120810.CreateTable'),
    body: JSON.stringify(createPayload)
  });
};

export const startLocalDynamoDb = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, port, dataDir, containerName } = config;

  // Get table config for creating the table
  const tableConfig = configManager.dynamoDbTables?.find((t) => t.name === name);

  if (await isContainerRunning(containerName)) {
    const info = await inspectDockerContainer(containerName);
    const portBindings = info?.NetworkSettings?.Ports?.[`${DYNAMODB_DEFAULT_PORT}/tcp`] || [];
    const actualPort = portBindings[0]?.HostPort ? parseInt(portBindings[0].HostPort, 10) : port;
    const host = 'localhost';
    const endpoint = `http://${host}:${actualPort}`;

    // Ensure table exists
    if (tableConfig) {
      await createTableIfNotExists(actualPort, name, tableConfig);
    }

    return {
      ...config,
      host,
      actualPort,
      connectionString: endpoint,
      referencableParams: {
        name,
        arn: `arn:aws:dynamodb:local:000000000000:table/${name}`,
        endpoint
      }
    };
  }

  let actualPort = port;
  if (await isPortInUse(port)) {
    const [freePort] = await findFreePorts(1);
    actualPort = freePort;
  }

  const dockerArgs = [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `${actualPort}:${DYNAMODB_DEFAULT_PORT}`,
    '-v',
    `${dataDir}:${DYNAMODB_DATA_PATH}`,
    'amazon/dynamodb-local',
    '-jar',
    'DynamoDBLocal.jar',
    '-sharedDb',
    '-dbPath',
    DYNAMODB_DATA_PATH
  ];

  await execDocker(dockerArgs);
  await waitForDynamoDbReady(actualPort);

  // Create the table
  if (tableConfig) {
    await createTableIfNotExists(actualPort, name, tableConfig);
  }

  const host = 'localhost';
  const endpoint = `http://${host}:${actualPort}`;

  return {
    ...config,
    host,
    actualPort,
    connectionString: endpoint,
    referencableParams: {
      name,
      arn: `arn:aws:dynamodb:local:000000000000:table/${name}`,
      endpoint
    }
  };
};
