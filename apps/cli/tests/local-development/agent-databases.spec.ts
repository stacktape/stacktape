import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { readDevAgentToken } from '../../src/commands/dev/agent-daemon';
import { createDevToolHandler } from '../../src/commands/mcp/dev-tool';

// An assistant's database loop through the MCP `stacktape_dev` tool: list tables, write rows, reset to a known state and
// seed. The tool calls a real dev agent, which runs the production local-resource code against real PostgreSQL, MySQL,
// Redis and DynamoDB Local containers. A configured database that the session does not run locally stands for a
// deployed one; no action may reach it.
const CLI_DIRECTORY = resolve(import.meta.dir, '../..');
const IMAGES = ['postgres:15.14', 'mysql:8.0', 'redis:7.2', 'amazon/dynamodb-local:latest'];
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 600_000 });

const PROJECT_NAME = `agentdb${randomBytes(3).toString('hex')}`;
let root: string;
let agent: ChildProcess | undefined;
let agentPort: number;
let discover: NonNullable<Parameters<typeof createDevToolHandler>[0]>['discoverAgents'];
let call: (
  action: Parameters<ReturnType<typeof createDevToolHandler>>[0]['action'],
  args?: Record<string, unknown>
) => Promise<any>;

const startAgent = async () => {
  const project = join(root, 'project');
  const driver = join(root, 'agent.ts');
  await writeFile(
    join(root, 'seed.cjs'),
    `const { Client } = require('pg');
const client = new Client({ connectionString: process.env.STP_DB_CONNECTION_STRING });
client
  .connect()
  .then(() => client.query("insert into users (name) values ('ada'), ('grace')"))
  .then((result) => console.log('seeded ' + result.rowCount + ' users'))
  .finally(() => client.end());
`
  );
  const src = (path: string) => JSON.stringify(join(CLI_DIRECTORY, 'src', path));
  await writeFile(
    driver,
    `
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { applicationManager } from ${src('app/application-manager/index.ts')};
import { awsSdkManager } from ${src('utils/aws-sdk-manager/index.ts')};
import { initDevAgentCredentials } from ${src('commands/dev/dev-agent-credentials.ts')};
import { globalStateManager } from ${src('app/global-state-manager/index.ts')};
import { configManager } from ${src('domain/config-manager/index.ts')};
import { deployedStackOverviewManager } from ${src('domain/deployed-stack-overview-manager/index.ts')};
import { startLocalResources, registerLocalResourceCleanupHook } from ${src('commands/dev/local-resources/index.ts')};
import { startAgentServer, updateAgentState, registerAgentCleanupHook } from ${src('commands/dev/agent-server.ts')};
import { buildSource } from ${JSON.stringify(join(CLI_DIRECTORY, 'scripts/dev.ts'))};
// The source dev runner (\`bun dev\`) builds the CLI in the process that then runs it. The agent here runs after the
// same build, whose Babel once left a stack-trace hook behind that failed every mysql2 call.
await buildSource({ outdir: ${JSON.stringify(join(root, 'dev-bundle'))} });
const project = ${JSON.stringify(project)};
const DEPLOYED_HOST = 'agentdb-deployed.cxyz.ca-central-1.rds.amazonaws.com';
await applicationManager.init();
registerAgentCleanupHook();
registerLocalResourceCleanupHook();
globalStateManager.rawCommands = ['dev'];
globalStateManager.rawArgs = { stage: 'test', region: 'eu-west-1', currentWorkingDirectory: project };
globalStateManager.targetStack = { stackName: '${PROJECT_NAME}-test', stage: 'test', projectName: '${PROJECT_NAME}', globallyUniqueStackHash: 'test' };
const postgres = (version) => ({ type: 'relational-database', properties: { engine: { type: 'postgres', properties: { version, primaryInstance: { instanceSize: 'db.t4g.micro' } } }, credentials: { masterUserName: 'postgres' } } });
configManager.config = {
  resources: {
    db: postgres('15.14'),
    deployedDb: postgres('15.14'),
    mydb: { type: 'relational-database', properties: { engine: { type: 'mysql', properties: { version: '8.0', dbName: 'app', primaryInstance: { instanceSize: 'db.t4g.micro' } } }, credentials: { masterUserName: 'root' } } },
    cache: { type: 'redis-cluster', properties: { instanceSize: 'cache.t4g.micro', engineVersion: '7.2' } },
    events: { type: 'dynamo-db-table', properties: { primaryKey: { partitionKey: { name: 'pk', type: 'string' }, sortKey: { name: 'sk', type: 'number' } } } },
    orders: { type: 'dynamo-db-table', properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } } } }
  },
  scripts: {
    seed: {
      type: 'local-script',
      properties: {
        connectTo: ['db'],
        environment: [{ name: 'NODE_PATH', value: ${JSON.stringify(join(CLI_DIRECTORY, 'node_modules'))} }],
        executeCommand: 'node ' + ${JSON.stringify(join(root, 'seed.cjs'))}
      }
    },
    seedDeployed: { type: 'local-script', properties: { connectTo: ['deployedDb'], executeCommand: 'echo never' } },
    seedThroughBastion: { type: 'local-script-with-bastion-tunneling', properties: { bastionResource: 'bastion', connectTo: ['db'], executeCommand: 'echo never' } },
    seedPrisma: { type: 'local-script', properties: { connectTo: ['db'], environment: [{ name: 'DATABASE_URL', value: "$Format('{}?schema=public', $ResourceParam('deployedDb', 'connectionString'))" }], executeCommand: 'echo never' } },
    seedLiteral: { type: 'local-script', properties: { environment: [{ name: 'DATABASE_URL', value: 'postgresql://' + DEPLOYED_HOST + ':5432/app' }], executeCommand: 'touch ' + ${JSON.stringify(join(root, 'literal-seed-ran'))} } },
    seedHangs: { type: 'local-script', properties: { connectTo: ['db'], executeCommand: 'sleep 31.7' } }
  }
};
const instances = await startLocalResources(['db', 'mydb', 'cache', 'events']);
deployedStackOverviewManager.injectLocalResourceInfo(instances.map((r) => ({ name: r.name, resourceType: r.type, referencableParams: r.referencableParams })));
// The stage's deployed database, as dev mode knows it when the session connects to it with remoteResources.
deployedStackOverviewManager.stackInfoMap.resources.deployedDb = { resourceType: 'relational-database', referencableParams: { host: { value: DEPLOYED_HOST } } };
// The dev stack's deployed orders table (a remote resource). Its "AWS" is a second table in the events DynamoDB Local,
// which this endpoint opts into for this process only. The agent reads it with the dev agent role, which a loopback
// STS assumes for the selected credentials and answers with the dummy credentials DynamoDB Local accepts.
const sts = createHttpServer((request, response) => {
  response.setHeader('content-type', 'text/xml');
  response.end('<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><AssumeRoleResult><Credentials><AccessKeyId>local</AccessKeyId><SecretAccessKey>local</SecretAccessKey><SessionToken>local</SessionToken><Expiration>2099-01-01T00:00:00Z</Expiration></Credentials></AssumeRoleResult><ResponseMetadata><RequestId>1</RequestId></ResponseMetadata></AssumeRoleResponse>');
});
await new Promise((resolve) => sts.listen(0, '127.0.0.1', resolve));
sts.unref();
process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'false';
process.env.AWS_ENDPOINT_URL_DYNAMODB = 'http://127.0.0.1:' + instances.find((r) => r.name === 'events').actualPort;
process.env.AWS_ENDPOINT_URL_STS = 'http://127.0.0.1:' + sts.address().port;
awsSdkManager.init({ credentials: { accessKeyId: 'developer', secretAccessKey: 'developer' }, region: 'eu-west-1' });
deployedStackOverviewManager.stackInfoMap.customOutputs = { ...deployedStackOverviewManager.stackInfoMap.customOutputs, DevAgentRoleArn: 'arn:aws:iam::000000000000:role/${PROJECT_NAME}-test-dev-agent' };
deployedStackOverviewManager.stackInfoMap.metadata = { ...deployedStackOverviewManager.stackInfoMap.metadata, devAgentRoleExternalId: { value: 'test' } };
initDevAgentCredentials();
deployedStackOverviewManager.stackInfoMap.resources.orders = { resourceType: 'dynamo-db-table', referencableParams: { name: { value: '${PROJECT_NAME}-test-orders' } } };
const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
await startAgentServer(port, ${JSON.stringify(root)}, undefined, { sessionId: 'agentdb-session', projectDirectory: project, projectName: '${PROJECT_NAME}', stage: 'test', region: 'eu-west-1' });
updateAgentState({ phase: 'ready', workloads: [], localResources: instances.map((r) => ({ name: r.name, type: r.type, status: 'running', port: r.actualPort })) });
console.log(JSON.stringify({ port }));
`
  );
  agent = spawn(
    process.execPath,
    ['--no-env-file', '--preload', join(CLI_DIRECTORY, 'scripts/test-preload.ts'), driver],
    {
      cwd: CLI_DIRECTORY,
      env: {
        PATH: process.env.PATH,
        HOME: root,
        STACKTAPE_DEV_AGENT_TOKEN_DIR: process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR,
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1'
      }
    }
  );
  let output = '';
  return new Promise<{ port: number }>((resolveStart, rejectStart) => {
    agent!.stdout!.on('data', (data) => {
      output += data;
      const line = output.split('\n').find((candidate) => candidate.startsWith('{"port"'));
      if (line) resolveStart(JSON.parse(line));
    });
    agent!.stderr!.on('data', (data) => (output += data));
    agent!.once('exit', (code) => rejectStart(new Error(`agent exited early (${code}): ${output}`)));
  });
};

beforeAll(async () => {
  for (const image of IMAGES) {
    expect(docker(['image', 'inspect', image]).status === 0 || docker(['pull', image]).status === 0).toBeTrue();
  }
  root = await mkdtemp(join(tmpdir(), `stacktape-agent-databases-${randomBytes(3).toString('hex')}-`));
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(root, 'tokens');
  const started = await startAgent();
  // The MCP server runs in the project, as a client starts it there: calls without a devSessionId may then reset and
  // seed the session it finds running.
  agentPort = started.port;
  discover = async () => [
    { port: started.port, pid: agent!.pid!, sessionId: 'agentdb-session', projectDirectory: join(root, 'project') }
  ];
  const handler = createDevToolHandler({ serverDirectory: () => join(root, 'project'), discoverAgents: discover });
  call = async (action, args) => (await handler({ action, args })).structuredContent;
}, 600_000);

afterAll(async () => {
  agent?.kill('SIGINT');
  await new Promise((done) => setTimeout(done, 2000));
  agent?.kill('SIGKILL');
  const owned = docker(['ps', '-a', '--filter', `name=^stp-${PROJECT_NAME}-`, '--format', '{{.Names}}']);
  for (const name of owned.stdout.split('\n').filter(Boolean)) docker(['rm', '-f', name]);
  // Database files belong to the containers' users.
  if (root) {
    docker(['run', '--rm', '-v', `${root}:/work`, '--entrypoint', 'sh', IMAGES[0], '-c', 'rm -rf /work/*']);
    await rm(root, { recursive: true, force: true });
  }
  delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
});

const sql = async (resource: string, statement: string, extra: Record<string, unknown> = {}) => {
  const result = await call('query', { resource, sql: statement, ...extra });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return result.data as { rows: Record<string, unknown>[]; affectedRows?: number };
};

test('an assistant lists, writes, resets and seeds local databases through stacktape_dev', async () => {
  await sql('db', 'create table _prisma_migrations (id text primary key)');
  await sql('db', "insert into _prisma_migrations values ('20261024_init')");
  await sql('db', 'create table users (id serial primary key, name text not null)');
  await sql('db', 'create table orders (id serial primary key, user_id int not null references users(id))');
  await sql('db', 'create table settings (name text primary key, color text)');
  expect((await sql('db', "insert into users (name) values ('a'), ('b'), ('c')")).affectedRows).toBe(3);
  await sql('db', 'insert into orders (user_id) values (1), (2)');
  await sql('db', "insert into settings values ('theme', 'dark')");
  await sql('mydb', 'create table todos (id int auto_increment primary key, title text)');
  await sql('mydb', 'create table authors (id int primary key)');
  await sql(
    'mydb',
    'create table books (id int primary key, author_id int not null, foreign key (author_id) references authors(id))'
  );
  await sql('mydb', 'insert into authors values (1)');
  await sql('mydb', 'insert into books values (1, 1)');
  await sql('mydb', "insert into todos (title) values ('one'), ('two')");
  expect((await call('query', { resource: 'cache', command: 'SET session:1 alive' })).ok).toBe(true);
  // The assistant reads DynamoDB through the tool; the application writes the items, here more than one batch delete takes.
  const status = await call('status');
  const eventsPort = (status.data.status.localResources as Array<{ name: string; port: number }>).find(
    ({ name }) => name === 'events'
  )!.port;
  const dynamo = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      endpoint: `http://127.0.0.1:${eventsPort}`,
      region: 'local',
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
    })
  );
  for (let index = 0; index < 30; index++) {
    await dynamo.send(new PutCommand({ TableName: 'events', Item: { pk: 'user#1', sk: index, kind: 'login' } }));
  }
  expect((await call('query', { resource: 'events', pk: { pk: 'user#1' }, limit: 5 })).data).toMatchObject({
    count: 5,
    truncated: true
  });

  // Without a resource, tables shows what every local database holds.
  const tables = await call('tables');
  expect(tables.ok, JSON.stringify(tables)).toBe(true);
  const byResource = Object.fromEntries(
    (tables.data.databases as Array<Record<string, unknown>>).map((entry) => [entry.resource, entry])
  );
  expect(byResource.db.tables).toEqual(['_prisma_migrations', 'orders', 'settings', 'users']);
  expect(byResource.mydb.tables).toEqual(['authors', 'books', 'todos']);
  expect(byResource.cache.keys).toEqual(['session:1']);
  expect((byResource.events.keySchema as { partitionKey: { name: string } }).partitionKey.name).toBe('pk');
  expect(byResource.deployedDb).toBeUndefined();

  // Bulk deletes and resets need confirmation; nothing changes without it.
  expect((await call('query', { resource: 'db', sql: 'delete from settings' })).code).toBe('DESTRUCTIVE_OPERATION');
  expect((await call('query', { resource: 'cache', command: 'FLUSHALL' })).code).toBe('DESTRUCTIVE_OPERATION');
  const unconfirmed = await call('reset_db');
  expect(unconfirmed.code).toBe('DESTRUCTIVE_OPERATION');
  expect(unconfirmed.nextActions.join(' ')).toContain('args.confirm=true');
  expect((await sql('db', 'select count(*)::int as n from users')).rows).toEqual([{ n: 3 }]);

  // A database the session does not run locally is never reached.
  expect((await call('query', { resource: 'deployedDb', sql: 'select 1' })).code).toBe('NOT_LOCAL_RESOURCE');
  expect((await call('tables', { resource: 'deployedDb' })).code).toBe('NOT_LOCAL_RESOURCE');
  const remoteReset = await call('reset_db', { resource: 'deployedDb', confirm: true });
  expect(remoteReset).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  expect(remoteReset.message).toContain('runs locally');

  // keepTables keeps a table; a kept table that references a reset table stops the reset instead of being emptied.
  const blockedMysql = await call('reset_db', { resource: 'mydb', confirm: true, keepTables: ['books'] });
  expect(blockedMysql.code).toBe('RESET_FAILED');
  expect(JSON.stringify(blockedMysql.data.results)).toContain('Kept table \\"books\\" references \\"authors\\"');
  expect((await call('query', { resource: 'mydb', sql: 'select count(*) as n from authors' })).data.rows).toEqual([
    { n: 1 }
  ]);
  const blocked = await call('reset_db', { resource: 'db', confirm: true, keepTables: ['orders'] });
  expect(blocked.code).toBe('RESET_FAILED');
  expect((await sql('db', 'select count(*)::int as n from orders')).rows).toEqual([{ n: 2 }]);

  const reset = await call('reset_db', { confirm: true, keepTables: ['settings'] });
  expect(reset.ok, JSON.stringify(reset)).toBe(true);
  const results = Object.fromEntries(
    (reset.data.results as Array<Record<string, unknown>>).map((entry) => [entry.resource, entry])
  );
  expect(results.db).toMatchObject({
    ok: true,
    resetTables: ['orders', 'users'],
    keptTables: ['_prisma_migrations', 'settings']
  });
  expect(results.mydb).toMatchObject({ ok: true, resetTables: ['authors', 'books', 'todos'] });
  expect(results.cache).toMatchObject({ ok: true, flushedAllKeys: true });
  expect(results.events).toMatchObject({ ok: true, deletedItems: 30 });
  expect((await sql('db', 'select count(*)::int as n from users')).rows).toEqual([{ n: 0 }]);
  expect((await sql('db', 'select id from _prisma_migrations')).rows).toEqual([{ id: '20261024_init' }]);
  expect((await sql('db', 'select color from settings')).rows).toEqual([{ color: 'dark' }]);
  expect((await call('query', { resource: 'mydb', sql: 'select count(*) as n from todos' })).data.rows).toEqual([
    { n: 0 }
  ]);
  expect((await call('query', { resource: 'cache', command: 'DBSIZE' })).data.result).toBe(0);
  expect((await call('query', { resource: 'events' })).data.count).toBe(0);

  // The seed script writes through the connection dev mode gives it, and identities start again at 1.
  const seeded = await call('seed');
  expect(seeded.ok, JSON.stringify(seeded)).toBe(true);
  expect(seeded.data.output).toContain('seeded 2 users');
  expect((await sql('db', 'select id, name from users order by id')).rows).toEqual([
    { id: 1, name: 'ada' },
    { id: 2, name: 'grace' }
  ]);
  await sql('mydb', "insert into todos (title) values ('three')");
  expect((await sql('mydb', 'select id from todos')).rows).toEqual([{ id: 1 }]);

  // Scripts that could reach deployed resources do not run as seeds.
  const deployed = await call('seed', { script: 'seedDeployed' });
  expect(deployed).toMatchObject({ ok: false, code: 'NOT_LOCAL' });
  expect(deployed.message).toContain('deployedDb');
  expect((await call('seed', { script: 'seedThroughBastion' })).code).toBe('NOT_LOCAL');
  // A deployed database named inside $Format is refused before anything resolves.
  const prisma = await call('seed', { script: 'seedPrisma' });
  expect(prisma).toMatchObject({ ok: false, code: 'NOT_LOCAL' });
  expect(prisma.message).toContain("$ResourceParam('deployedDb')");
  // A deployed database's address that only appears once the script resolved is refused before the script runs.
  const literal = await call('seed', { script: 'seedLiteral' });
  expect(literal).toMatchObject({ ok: false, code: 'NOT_LOCAL' });
  expect(literal.message).toContain('agentdb-deployed.cxyz.ca-central-1.rds.amazonaws.com');
  expect(existsSync(join(root, 'literal-seed-ran'))).toBeFalse();

  // A hung seed is stopped at its time limit, and its process with it.
  const started = Date.now();
  const hung = await call('seed', { script: 'seedHangs', timeoutSeconds: 1 });
  expect(hung).toMatchObject({ ok: false, code: 'SCRIPT_TIMEOUT' });
  expect(Date.now() - started).toBeLessThan(15_000);
  expect(spawnSync('pgrep', ['-f', 'sleep 31.7']).status).toBe(1);
  expect((await call('seed', { script: 'seedHangs', timeoutSeconds: 900 })).code).toBe('VALIDATION_ERROR');
  const missing = await call('seed', { script: 'nope' });
  expect(missing.code).toBe('NOT_FOUND');
  expect(missing.data.available).toEqual([
    'seed',
    'seedDeployed',
    'seedThroughBastion',
    'seedPrisma',
    'seedLiteral',
    'seedHangs'
  ]);
}, 300_000);

// Review of #336: an MCP server of another project may read this session through cwd but never write to it. A statement
// that looks like a read can still write through a function, so the databases themselves refuse the write.
test("another project's MCP server reads through cwd, and the databases refuse its writes", async () => {
  await sql(
    'db',
    "create function r2m_bump() returns int language sql as $$ insert into settings values ('r2m', 'x') returning 1 $$"
  );
  await sql(
    'mydb',
    "create function r2m_bump() returns int deterministic modifies sql data begin insert into todos (title) values ('r2m'); return 1; end"
  );
  const elsewhere = createDevToolHandler({ serverDirectory: () => join(root, 'elsewhere'), discoverAgents: discover });
  const read = async (args: Record<string, unknown>) =>
    (await elsewhere({ action: 'query', args: { cwd: join(root, 'project'), ...args } })).structuredContent;

  expect((await read({ resource: 'db', sql: 'select count(*) as n from settings' })).ok).toBe(true);
  const postgresWrite = await read({ resource: 'db', sql: 'select r2m_bump()' });
  expect(postgresWrite.ok).toBe(false);
  expect(JSON.stringify(postgresWrite)).toContain('read-only transaction');
  const mysqlWrite = await read({ resource: 'mydb', sql: 'select r2m_bump()' });
  expect(mysqlWrite.ok).toBe(false);
  expect(JSON.stringify(mysqlWrite)).toMatch(/READ ONLY transaction/i);
  expect((await read({ resource: 'db', sql: "insert into settings values ('r2m', 'x')" })).code).toBe(
    'DEV_SESSION_ID_REQUIRED'
  );
  expect((await read({ resource: 'cache', command: 'SET r2m x' })).code).toBe('DEV_SESSION_ID_REQUIRED');
  expect((await sql('db', "select count(*)::int as n from settings where name = 'r2m'")).rows).toEqual([{ n: 0 }]);
  expect((await sql('mydb', "select count(*) as n from todos where title = 'r2m'")).rows).toEqual([{ n: 0 }]);

  // The agent's Redis route enforces the same read-only mode.
  const response = await fetch(`http://127.0.0.1:${agentPort}/redis/cache/command`, {
    method: 'POST',
    headers: { authorization: `Bearer ${readDevAgentToken(agentPort)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ cmd: 'SET r2m x', readOnly: true })
  });
  expect(await response.json()).toMatchObject({ ok: false, code: 'READ_ONLY' });
  expect((await call('query', { resource: 'cache', command: 'EXISTS r2m' })).data.result).toBe(0);
}, 120_000);

// r2w dogfood: with its table passed as a remote resource, an agent could not read it through stacktape_dev
// (NOT_LOCAL_RESOURCE) and had to find the table name for the aws action itself.
test('an assistant reads a deployed DynamoDB table through stacktape_dev, and reset_db refuses it', async () => {
  const status = await call('status');
  expect(status.data.status.deployedDatabases).toEqual([
    { name: 'orders', type: 'dynamodb', tableName: `${PROJECT_NAME}-test-orders` }
  ]);
  const eventsPort = (status.data.status.localResources as Array<{ name: string; port: number }>).find(
    ({ name }) => name === 'events'
  )!.port;
  // The client the agent uses for deployed tables, with its region and credentials, so both see the same table.
  const client = new DynamoDBClient({
    endpoint: `http://127.0.0.1:${eventsPort}`,
    region: 'eu-west-1',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
  });
  const aws = DynamoDBDocumentClient.from(client);
  await client.send(
    new CreateTableCommand({
      TableName: `${PROJECT_NAME}-test-orders`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
  );
  for (const id of ['o1', 'o2', 'o3']) {
    await aws.send(new PutCommand({ TableName: `${PROJECT_NAME}-test-orders`, Item: { id, status: 'notified' } }));
  }

  const scan = await call('query', { resource: 'orders', limit: 2 });
  expect(scan, JSON.stringify(scan)).toMatchObject({
    ok: true,
    message: `Read orders, the deployed table ${PROJECT_NAME}-test-orders in AWS (read-only).`,
    data: { deployed: true, table: `${PROJECT_NAME}-test-orders`, region: 'eu-west-1', count: 2, truncated: true }
  });
  expect((await call('query', { resource: 'orders', pk: { id: 'o2' } })).data.items).toEqual([
    { id: 'o2', status: 'notified' }
  ]);
  const schema = await call('tables', { resource: 'orders' });
  expect(schema.data).toMatchObject({ deployed: true, keySchema: { partitionKey: { name: 'id', type: 'S' } } });
  // Listing every database stays local: a deployed table is read only by name.
  expect(
    ((await call('tables')).data.databases as Array<{ resource: string }>).map(({ resource }) => resource)
  ).not.toContain('orders');

  const reset = await call('reset_db', { resource: 'orders', confirm: true });
  expect(reset).toMatchObject({ ok: false, code: 'NOT_LOCAL_RESOURCE' });
  expect(reset.message).toContain(`deployed DynamoDB table ${PROJECT_NAME}-test-orders in eu-west-1`);
  expect(JSON.stringify(reset)).toContain(`aws dynamodb delete-item --table-name ${PROJECT_NAME}-test-orders`);
  // The agent's write routes refuse the deployed table too.
  const put = await fetch(`http://127.0.0.1:${agentPort}/dynamodb/orders/put`, {
    method: 'POST',
    headers: { authorization: `Bearer ${readDevAgentToken(agentPort)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ item: { id: 'o4' } })
  });
  expect(JSON.stringify(await put.json())).toContain('writes only to local databases');
  expect((await aws.send(new ScanCommand({ TableName: `${PROJECT_NAME}-test-orders` }))).Count).toBe(3);
  client.destroy();
}, 120_000);
