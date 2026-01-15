import Fastify from 'fastify';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';
import {
  DynamoDBClient,
  ListTablesCommand,
  PutItemCommand,
  GetItemCommand,
  QueryCommand
} from '@aws-sdk/client-dynamodb';

const fastify = Fastify({ logger: true });

const getEnvConnections = () => ({
  postgres: process.env.STP_POSTGRES_DB_CONNECTION_STRING,
  mysql: process.env.STP_MYSQL_DB_CONNECTION_STRING,
  mariadb: process.env.STP_MARIA_DB_CONNECTION_STRING,
  redis: process.env.STP_REDIS_CONNECTION_STRING,
  privateServiceAddress: process.env.STP_PRIVATE_SERVICE_ADDRESS,
  dynamoDbEndpoint: process.env.STP_USERS_TABLE_ENDPOINT,
  dynamoDbTableName: process.env.STP_USERS_TABLE_NAME
});

fastify.get('/', async () => {
  return { status: 'ok', service: 'web-service', connections: getEnvConnections() };
});

fastify.get('/health', async () => {
  const results: Record<string, string> = {};
  const connections = getEnvConnections();

  // Test Postgres
  if (connections.postgres) {
    try {
      const client = new PgClient({ connectionString: connections.postgres });
      await client.connect();
      const res = await client.query('SELECT NOW()');
      results.postgres = `connected: ${res.rows[0].now}`;
      await client.end();
    } catch (err) {
      results.postgres = `error: ${err.message}`;
    }
  }

  // Test MySQL
  if (connections.mysql) {
    try {
      const conn = await mysql.createConnection(connections.mysql);
      const [rows] = await conn.execute('SELECT NOW() as now');
      results.mysql = `connected: ${(rows as any)[0].now}`;
      await conn.end();
    } catch (err) {
      results.mysql = `error: ${err.message}`;
    }
  }

  // Test MariaDB
  if (connections.mariadb) {
    try {
      const conn = await mysql.createConnection(connections.mariadb);
      const [rows] = await conn.execute('SELECT NOW() as now');
      results.mariadb = `connected: ${(rows as any)[0].now}`;
      await conn.end();
    } catch (err) {
      results.mariadb = `error: ${err.message}`;
    }
  }

  // Test Redis
  if (connections.redis) {
    try {
      const redis = new Redis(connections.redis);
      await redis.set('test', 'hello');
      const value = await redis.get('test');
      results.redis = `connected: ${value}`;
      redis.disconnect();
    } catch (err) {
      results.redis = `error: ${err.message}`;
    }
  }

  // Test DynamoDB
  if (connections.dynamoDbEndpoint) {
    try {
      const client = new DynamoDBClient({
        endpoint: connections.dynamoDbEndpoint,
        region: 'local',
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
      });
      const listResult = await client.send(new ListTablesCommand({}));
      results.dynamodb = `connected: ${listResult.TableNames?.length || 0} tables`;
    } catch (err) {
      results.dynamodb = `error: ${err.message}`;
    }
  }

  return { status: 'ok', results };
});

fastify.get('/call-private', async () => {
  const connections = getEnvConnections();
  if (!connections.privateServiceAddress) {
    return { error: 'Private service address not configured (STP_PRIVATE_SERVICE_ADDRESS)' };
  }

  try {
    const response = await fetch(`http://${connections.privateServiceAddress}/db-check`);
    const data = await response.json();
    return { status: 'ok', privateServiceResponse: data };
  } catch (err) {
    return { error: err.message };
  }
});

// DynamoDB CRUD test endpoint
fastify.get('/dynamodb-test', async () => {
  const connections = getEnvConnections();
  if (!connections.dynamoDbEndpoint || !connections.dynamoDbTableName) {
    return { error: 'DynamoDB not configured (STP_USERS_TABLE_ENDPOINT or STP_USERS_TABLE_NAME missing)' };
  }

  const client = new DynamoDBClient({
    endpoint: connections.dynamoDbEndpoint,
    region: 'local',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
  });

  const tableName = connections.dynamoDbTableName;
  const testUserId = 'test-user-123';
  const testCreatedAt = Date.now();

  try {
    // 1. Put an item
    await client.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          userId: { S: testUserId },
          createdAt: { N: String(testCreatedAt) },
          name: { S: 'Test User' },
          email: { S: 'test@example.com' }
        }
      })
    );

    // 2. Get the item back
    const getResult = await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          userId: { S: testUserId },
          createdAt: { N: String(testCreatedAt) }
        }
      })
    );

    // 3. Query by partition key
    const queryResult = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: {
          ':uid': { S: testUserId }
        }
      })
    );

    return {
      status: 'ok',
      operations: {
        put: 'success',
        get: getResult.Item ? { name: getResult.Item.name?.S, email: getResult.Item.email?.S } : null,
        query: `found ${queryResult.Items?.length || 0} items`
      }
    };
  } catch (err) {
    return { error: err.message };
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`\n=== WEB SERVICE STARTED ===`);
    console.log(`Port: ${port}`);
    console.log('\nEnvironment connections:');
    const connections = getEnvConnections();
    for (const [key, value] of Object.entries(connections)) {
      console.log(`  ${key}: ${value || '(not set)'}`);
    }
    console.log('\nAll STP_ environment variables:');
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('STP_')) {
        console.log(`  ${key}: ${value?.substring(0, 60)}${(value?.length || 0) > 60 ? '...' : ''}`);
      }
    }
    console.log('=== READY FOR REQUESTS ===\n');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
