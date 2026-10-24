import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
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
import { applicationManager } from ${src('app/application-manager/index.ts')};
import { globalStateManager } from ${src('app/global-state-manager/index.ts')};
import { configManager } from ${src('domain/config-manager/index.ts')};
import { deployedStackOverviewManager } from ${src('domain/deployed-stack-overview-manager/index.ts')};
import { startLocalResources, registerLocalResourceCleanupHook } from ${src('commands/dev/local-resources/index.ts')};
import { startAgentServer, updateAgentState, registerAgentCleanupHook } from ${src('commands/dev/agent-server.ts')};
const project = ${JSON.stringify(project)};
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
    events: { type: 'dynamo-db-table', properties: { primaryKey: { partitionKey: { name: 'pk', type: 'string' }, sortKey: { name: 'sk', type: 'number' } } } }
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
    seedThroughBastion: { type: 'local-script-with-bastion-tunneling', properties: { bastionResource: 'bastion', connectTo: ['db'], executeCommand: 'echo never' } }
  }
};
const instances = await startLocalResources(['db', 'mydb', 'cache', 'events']);
deployedStackOverviewManager.injectLocalResourceInfo(instances.map((r) => ({ name: r.name, resourceType: r.type, referencableParams: r.referencableParams })));
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
  const handler = createDevToolHandler({
    discoverAgents: async () => [
      { port: started.port, pid: agent!.pid!, sessionId: 'agentdb-session', projectDirectory: join(root, 'project') }
    ]
  });
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
  expect(byResource.mydb.tables).toEqual(['todos']);
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
  expect(results.mydb).toMatchObject({ ok: true, resetTables: ['todos'] });
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
  const missing = await call('seed', { script: 'nope' });
  expect(missing.code).toBe('NOT_FOUND');
  expect(missing.data.available).toEqual(['seed', 'seedDeployed', 'seedThroughBastion']);
}, 300_000);
