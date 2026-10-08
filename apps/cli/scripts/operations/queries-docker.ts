// oxlint-disable-next-line import/no-unassigned-import -- installs the offline network guard in the acceptance runner.
import './offline-preload';
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';
import Redis from 'ioredis';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { StackInfoMapResource } from '@stacktape/stack-info/contracts';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { docker, startDatabase, waitUntilReady } from './docker-databases';

const resource = (
  resourceType: string,
  values: Record<string, string | number>,
  parameter?: string
): StackInfoMapResource => ({
  resourceType,
  links: {},
  outputs: {},
  cloudformationChildResources: {},
  referencableParams: {
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, showDuringPrint: true }])),
    ...(parameter ? { connectionString: { value: 'masked', ssmParameterName: parameter, showDuringPrint: false } } : {})
  }
});

const commandPayload = async (
  fixture: Awaited<ReturnType<typeof createOperationsFixture>>,
  args: string[],
  expectedCode = 'OK'
) => {
  const run = await fixture.run([...args, ...targetArgs, '--agent']);
  const { events, result } = parseCliJsonl(run.stdout, args[0]);
  assert.equal(run.exitCode, expectedCode === 'OK' ? 0 : 1, result.message);
  assert.equal(run.stderr, '');
  assert.equal(result.code, expectedCode, result.message);
  assert.deepEqual(fixture.aws.unexpected, []);
  assert.deepEqual(fixture.api.unexpected, []);
  if (expectedCode !== 'OK') return { run, result, payload: undefined };
  const event = events.find(
    (event) => event.type === 'log' && typeof event.message === 'string' && event.message.startsWith('{')
  );
  assert.ok(event && typeof event.message === 'string', 'Query emitted no result payload');
  return { run, result, payload: JSON.parse(event.message) as Record<string, unknown> };
};

const postgresScenario = async (cliPath: string) => {
  const database = await startDatabase({
    image: 'postgres:15.14',
    port: 5432,
    args: ['--env', 'POSTGRES_USER=j9', '--env', 'POSTGRES_PASSWORD=j9-local-db-password', '--env', 'POSTGRES_DB=j9']
  });
  let fixture: Awaited<ReturnType<typeof createOperationsFixture>>;
  let client: Client;
  try {
    if (process.env.J9_QUERY_FAIL_AFTER_START === '1') throw new Error('Deliberate J9 failure after container startup');
    await waitUntilReady(() => docker(['exec', database.name, 'pg_isready', '-U', 'j9', '-d', 'j9']));
    // Query:sql uses TLS for deployed RDS. Enable it on the disposable PostgreSQL rather than replacing that client.
    await docker([
      'exec',
      '--user',
      'root',
      database.name,
      'openssl',
      'req',
      '-new',
      '-x509',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-out',
      '/var/lib/postgresql/data/server.crt',
      '-keyout',
      '/var/lib/postgresql/data/server.key'
    ]);
    await docker([
      'exec',
      '--user',
      'root',
      database.name,
      'chown',
      'postgres:postgres',
      '/var/lib/postgresql/data/server.key'
    ]);
    await docker(['exec', '--user', 'root', database.name, 'chmod', '600', '/var/lib/postgresql/data/server.key']);
    await docker(['exec', database.name, 'psql', '-U', 'j9', '-d', 'j9', '-c', "ALTER SYSTEM SET ssl = 'on'"]);
    await docker(['exec', database.name, 'psql', '-U', 'j9', '-d', 'j9', '-c', 'SELECT pg_reload_conf()']);
    client = new Client({
      host: '127.0.0.1',
      port: database.port,
      user: 'j9',
      password: 'j9-local-db-password',
      database: 'j9',
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query(`CREATE TABLE records(id integer PRIMARY KEY, label text);
INSERT INTO records VALUES (1, 'first'), (2, 'second'), (3, 'third');
CREATE FUNCTION j9_write() RETURNS integer LANGUAGE plpgsql AS $$ BEGIN INSERT INTO records VALUES(4,'forbidden'); RETURN 4; END $$;`);
    fixture = await createOperationsFixture(cliPath);
    seedDeployedStack(fixture, { db: resource('relational-database', {}, '/j9/db/connection') });
    const connection = new URL('postgresql://127.0.0.1/j9');
    connection.username = 'j9';
    connection.password = 'j9-local-db-password';
    connection.port = String(database.port);
    fixture.aws.on('ssm.GetParameter', () => ({
      kind: 'json',
      body: {
        Parameter: {
          Name: '/j9/db/connection',
          Type: 'SecureString',
          Value: connection.toString()
        }
      }
    }));
    const query = (sql: string, code?: string) =>
      commandPayload(fixture, ['query:sql', '--resourceName', 'db', '--sql', sql, '--limit', '2'], code);
    const limited = await query('SELECT id, label FROM records ORDER BY id');
    assert.deepEqual(limited.payload.rows, [
      { id: 1, label: 'first' },
      { id: 2, label: 'second' }
    ]);
    assert.equal(limited.payload.truncated, true);
    assert.deepEqual((await query('SELECT id FROM records WHERE id = 999')).payload.rows, []);
    assert.deepEqual((await query('SELECT 1 AS value;')).payload.rows, [{ value: 1 }]);
    await query("UPDATE records SET label = 'changed'", 'CLI_SQL_QUERY_NOT_READ_ONLY');
    const sideEffect = await query('SELECT j9_write()', 'CLI_SQL_QUERY_FAILED');
    assert.match(sideEffect.result.message, /read.only transaction/i);
    const invalid = await query('SELECT missing_column FROM records', 'CLI_SQL_QUERY_FAILED');
    assert.match(invalid.result.message, /missing_column/);
    assert.ok(!invalid.run.stdout.includes('j9-local-db-password'));
    assert.deepEqual((await client.query('SELECT id, label FROM records ORDER BY id')).rows, [
      { id: 1, label: 'first' },
      { id: 2, label: 'second' },
      { id: 3, label: 'third' }
    ]);
    console.info('Verified query:sql results, empty rows, limit, errors and durable read-only enforcement.');
  } finally {
    await client?.end();
    await fixture?.close();
    await database.close();
  }
};

const redisScenario = async (cliPath: string) => {
  const database = await startDatabase({ image: 'redis:7.4.5', port: 6379 });
  const redis = new Redis({ host: '127.0.0.1', port: database.port, lazyConnect: true, retryStrategy: null });
  let fixture: Awaited<ReturnType<typeof createOperationsFixture>>;
  try {
    await waitUntilReady(async () => {
      if (redis.status === 'wait' || redis.status === 'end') await redis.connect();
      await redis.ping();
    });
    await redis.set('j9:key', 'saved');
    await redis.lpush('j9:list', 'one');
    fixture = await createOperationsFixture(cliPath);
    seedDeployedStack(fixture, { cache: resource('redis-cluster', { host: '127.0.0.1', port: database.port }) });
    const query = (args: string[], code?: string) =>
      commandPayload(fixture, ['query:redis', '--resourceName', 'cache', ...args], code);
    assert.equal((await query(['--operation', 'get', '--key', 'j9:key'])).payload.result, 'saved');
    assert.equal((await query(['--operation', 'get', '--key', 'missing'])).payload.result, null);
    assert.deepEqual((await query(['--operation', 'keys', '--pattern', 'none:*'])).payload.keys, []);
    await query(['--operation', 'set', '--key', 'j9:key'], 'CLI_REDIS_OPERATION_INVALID');
    const wrongType = await query(['--operation', 'get', '--key', 'j9:list'], 'CLI_REDIS_QUERY_FAILED');
    assert.match(wrongType.result.message, /WRONGTYPE/);
    assert.equal(await redis.get('j9:key'), 'saved');
    console.info('Verified query:redis values, missing keys, empty results, write rejection and service errors.');
  } finally {
    redis.disconnect();
    await fixture?.close();
    await database.close();
  }
};

const dynamodbScenario = async (cliPath: string) => {
  const database = await startDatabase({
    image: 'amazon/dynamodb-local@sha256:ff89bd48ff32cd8d9be5fee8873b65b8854dc408f1afe881be6eb00247bc0dab',
    port: 8000
  });
  const endpoint = `http://127.0.0.1:${database.port}`;
  const sdk = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint,
    credentials: { accessKeyId: 'j9local', secretAccessKey: 'j9local' }
  });
  const document = DynamoDBDocumentClient.from(sdk);
  let fixture: Awaited<ReturnType<typeof createOperationsFixture>>;
  try {
    await waitUntilReady(() => sdk.send(new ListTablesCommand({})));
    await sdk.send(
      new CreateTableCommand({
        TableName: 'j9-records',
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST'
      })
    );
    await document.send(new PutCommand({ TableName: 'j9-records', Item: { id: 'first', label: 'saved' } }));
    fixture = await createOperationsFixture(cliPath);
    seedDeployedStack(fixture, { records: resource('dynamo-db-table', { name: 'j9-records' }) });
    fixture.aws.on('dynamodb.*', async ({ operation, rawBody }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-amz-json-1.0',
          'x-amz-target': `DynamoDB_20120810.${operation}`,
          authorization:
            'AWS4-HMAC-SHA256 Credential=j9local/20260101/eu-west-1/dynamodb/aws4_request, SignedHeaders=host;x-amz-date, Signature=fixture',
          'x-amz-date': '20260101T000000Z'
        },
        body: rawBody
      });
      return {
        kind: 'raw',
        status: response.status,
        contentType: 'application/x-amz-json-1.0',
        body: await response.text()
      };
    });
    const query = (args: string[], code?: string) =>
      commandPayload(fixture, ['query:dynamodb', '--resourceName', 'records', ...args], code);
    assert.deepEqual((await query(['--operation', 'scan'])).payload.items, [{ id: 'first', label: 'saved' }]);
    assert.deepEqual((await query(['--operation', 'get', '--pk', '{"id":"first"}'])).payload.item, {
      id: 'first',
      label: 'saved'
    });
    assert.equal((await query(['--operation', 'get', '--pk', '{"id":"absent"}'])).payload.item, null);
    await query(['--operation', 'put'], 'CLI_DYNAMODB_OPERATION_INVALID');
    await query(['--operation', 'get', '--pk', '{broken'], 'CLI_DYNAMODB_KEY_INVALID');
    assert.deepEqual((await document.send(new ScanCommand({ TableName: 'j9-records' }))).Items, [
      { id: 'first', label: 'saved' }
    ]);
    await sdk.send(new DeleteTableCommand({ TableName: 'j9-records' }));
    assert.deepEqual((await query(['--operation', 'scan'], 'CLI_DYNAMODB_QUERY_FAILED')).result.ok, false);
    console.info('Verified query:dynamodb scans, key decoding, absent items, write rejection and service errors.');
  } finally {
    sdk.destroy();
    await fixture?.close();
    await database.close();
  }
};

const main = async () => {
  const cli = await buildOperationsCli();
  try {
    const selected = new Set((process.env.J9_QUERY_SERVICES ?? 'sql,redis,dynamodb,opensearch').split(','));
    assert.ok(
      selected.size > 0 &&
        [...selected].every((service) => ['sql', 'redis', 'dynamodb', 'opensearch'].includes(service)),
      'Select sql,redis,dynamodb,opensearch with J9_QUERY_SERVICES'
    );
    if (selected.has('sql')) await postgresScenario(cli.path);
    if (selected.has('redis')) await redisScenario(cli.path);
    if (selected.has('dynamodb')) await dynamodbScenario(cli.path);
    if (selected.has('opensearch')) await opensearchScenario(cli.path);
  } finally {
    await cli.close();
  }
};

const opensearchScenario = async (cliPath: string) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-j9-opensearch-tls-'));
  let database: Awaited<ReturnType<typeof startDatabase>>;
  let fixture: Awaited<ReturnType<typeof createOperationsFixture>>;
  let proxy: ReturnType<typeof createServer>;
  try {
    database = await startDatabase({
      image: 'opensearchproject/opensearch:2.19.3',
      port: 9200,
      args: [
        '--memory',
        '1g',
        '--env',
        'discovery.type=single-node',
        '--env',
        'DISABLE_INSTALL_DEMO_CONFIG=true',
        '--env',
        'DISABLE_SECURITY_PLUGIN=true',
        '--env',
        'OPENSEARCH_JAVA_OPTS=-Xms256m -Xmx256m'
      ]
    });
    const endpoint = `http://127.0.0.1:${database.port}`;
    await waitUntilReady(async () => {
      const response = await fetch(`${endpoint}/_cluster/health`);
      assert.equal(response.status, 200);
    });
    // AWS OpenSearch uses HTTPS. A trusted, owned TLS proxy adapts the local unsecured database to that transport.
    const certificate = join(directory, 'certificate.pem');
    const key = join(directory, 'key.pem');
    const generator = Bun.spawn(
      [
        'openssl',
        'req',
        '-new',
        '-x509',
        '-nodes',
        '-days',
        '1',
        '-subj',
        '/CN=127.0.0.1',
        '-addext',
        'subjectAltName=IP:127.0.0.1',
        '-out',
        certificate,
        '-keyout',
        key
      ],
      { stdout: 'ignore', stderr: 'ignore' }
    );
    assert.equal(await generator.exited, 0);
    proxy = createServer({ cert: await readFile(certificate), key: await readFile(key) }, async (request, response) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const upstream = await fetch(`${endpoint}${request.url}`, {
          method: request.method,
          headers: { 'content-type': 'application/json' },
          ...(chunks.length ? { body: Buffer.concat(chunks) } : {})
        });
        response.writeHead(upstream.status, { 'content-type': 'application/json' });
        response.end(await upstream.text());
      } catch {
        response.writeHead(502);
        response.end('Local OpenSearch unavailable');
      }
    });
    await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
    const sslEndpoint = `https://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
    assert.equal(
      (
        await fetch(`${endpoint}/records/_doc/first?refresh=true`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: '{"label":"saved"}'
        })
      ).status,
      201
    );
    fixture = await createOperationsFixture(cliPath, { NODE_EXTRA_CA_CERTS: certificate });
    seedDeployedStack(fixture, { search: resource('open-search-domain', { domainEndpoint: sslEndpoint }) });
    const query = (args: string[], code?: string) =>
      commandPayload(fixture, ['query:opensearch', '--resourceName', 'search', ...args], code);
    assert.deepEqual(
      (await query(['--operation', 'get', '--index', 'records', '--id', 'first'])).payload.data['_source'],
      { label: 'saved' }
    );
    const empty = await query([
      '--operation',
      'search',
      '--index',
      'records',
      '--query',
      '{"match":{"label":"absent"}}'
    ]);
    assert.deepEqual(empty.payload.data['hits']['hits'], []);
    await query(['--operation', 'put', '--index', 'records'], 'CLI_OPENSEARCH_OPERATION_INVALID');
    await query(['--operation', 'search', '--query', '{broken'], 'CLI_OPENSEARCH_QUERY_INVALID');
    await query(['--operation', 'get', '--index', 'missing', '--id', 'first'], 'CLI_OPENSEARCH_QUERY_FAILED');
    assert.equal(((await (await fetch(`${endpoint}/records/_count`)).json()) as { count: number }).count, 1);
    console.info('Verified query:opensearch results, empty search, write rejection, invalid input and service errors.');
  } finally {
    await fixture?.close();
    if (proxy) {
      proxy.closeAllConnections();
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
    await database?.close();
    await rm(directory, { recursive: true, force: true });
  }
};

if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
