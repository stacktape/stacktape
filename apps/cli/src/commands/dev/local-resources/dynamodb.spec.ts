import { afterAll, beforeAll, expect, mock, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';

// r2rr bug hunt: a local table whose CreateTable failed was still reported as a running local resource, and the app
// then got ResourceNotFoundException. A loopback server stands in for DynamoDB Local; Docker reports the shared
// container running on its port.

let failCreate = true;
const created: string[] = [];
const removed: string[] = [];
let server: Server;
let port = 0;

mock.module('@utils/docker', () => ({
  inspectDockerContainer: async () => ({
    Id: 'dynamodb-local',
    State: { Running: true },
    NetworkSettings: { Ports: { '8000/tcp': [{ HostPort: String(port) }] } }
  }),
  execDocker: async (args: string[]) => {
    if (args[0] === 'rm') removed.push(args.at(-1)!);
    return { exitCode: 0, stdout: '', stderr: '' };
  },
  stopDockerContainer: async () => {}
}));

let startLocalDynamoDb: typeof import('./dynamodb').startLocalDynamoDb;
beforeAll(async () => {
  server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    response.setHeader('content-type', 'application/x-amz-json-1.0');
    if (request.headers['x-amz-target'] === 'DynamoDB_20120810.ListTables') {
      response.end(JSON.stringify({ TableNames: [] }));
      return;
    }
    if (failCreate) {
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          __type: 'com.amazonaws.dynamodb.v20120810#InternalFailure',
          message: 'No space left on device'
        })
      );
      return;
    }
    created.push(JSON.parse(body).TableName);
    response.end(JSON.stringify({ TableDescription: { TableName: JSON.parse(body).TableName } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
  for (const [key, value] of Object.entries({
    databases: [],
    redisClusters: [],
    dynamoDbTables: [{ name: 'orders', primaryKey: { partitionKey: { name: 'id', type: 'string' } } }]
  }))
    Object.defineProperty(configManager, key, { configurable: true, value });
  ({ startLocalDynamoDb } = await import('./dynamodb'));
});
const workingDirectory = mkdtempSync(join(tmpdir(), 'stacktape-dynamodb-local-'));
afterAll(async () => {
  rmSync(workingDirectory, { recursive: true, force: true });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const start = () =>
  startLocalDynamoDb({
    name: 'orders',
    type: 'dynamodb',
    port: 8000,
    dataDir: '/tmp/stacktape-dynamodb-test',
    containerName: 'stp-test-dynamodb'
  } as Parameters<typeof startLocalDynamoDb>[0]);

test('a local table that cannot be created fails its start with the reason', async () => {
  await expect(start()).rejects.toThrow(
    'Creating the local DynamoDB table "orders" failed: No space left on device (InternalFailure)'
  );
  failCreate = false;
  expect((await start()).actualPort).toBe(port);
  expect(created).toEqual(['orders']);
});

// r2rr bug hunt: a database whose start failed after its container was created was left out of the session cleanup.
test('the container of a local database whose start failed is removed when the session ends', async () => {
  failCreate = true;
  globalStateManager.rawArgs = { stage: 'dev', currentWorkingDirectory: workingDirectory } as never;
  globalStateManager.targetStack = { stackName: 'shop-dev', projectName: 'shop', stage: 'dev' } as never;
  const { registerLocalResourceCleanupHook, startLocalResources } = await import('./index');
  registerLocalResourceCleanupHook();
  await expect(startLocalResources(['orders'])).rejects.toThrow('Failed to start local resource(s)');
  removed.length = 0;
  await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: false, interrupted: false })));
  expect(removed).toHaveLength(1);
  expect(removed[0]).toContain('shop');
});
