import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from 'pg';
import { runProcess } from '../../scripts/qualification/process';

// Two checkouts (Git worktrees) of one project run dev mode on the same stage. Each must get its own database
// container, port and data, published on loopback only. Both get the stage's generated password: deployed dev functions
// carry it, so moving the stage between the worktrees needs no dev stack update. A data directory an older CLI
// initialized with the old fixed password must keep working. The production local-resource code starts real PostgreSQL
// containers.
const IMAGE = 'postgres:15.14';
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000 });

type Instance = {
  name: string;
  containerName: string;
  actualPort: number;
  dataDir: string;
  credentials?: { username: string; password: string };
  referencableParams: Record<string, string>;
};

const POSTGRES_DB = {
  type: 'relational-database',
  properties: {
    engine: { type: 'postgres', properties: { version: '15.14', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
    credentials: { masterUserName: 'postgres' }
  }
};

type DriverResult = {
  instances: Instance[];
  warnings: string[];
  /** What deployed dev functions get for each database through a relay at 10.20.0.5:40001. */
  relayed: Record<string, { params: Record<string, string> } | null>;
  /** The variables local workloads get. */
  envVars: Record<string, string>;
};

/**
 * Starts local databases with the production local-resource code in a separate CLI process, as `stacktape dev` does
 * for the working directory and stage `test`, and reports what every consumer of them gets.
 */
const startDatabases = async ({
  directory,
  home = directory,
  workingDirectory,
  projectName,
  freshDb = false,
  resources = { db: POSTGRES_DB }
}: {
  directory: string;
  /** The user's home directory, which holds the stage's generated passwords. */
  home?: string;
  workingDirectory: string;
  projectName: string;
  freshDb?: boolean;
  resources?: Record<string, unknown>;
}): Promise<DriverResult> => {
  const driver = join(directory, 'driver.ts');
  const inputFile = join(directory, 'input.json');
  const resultFile = join(directory, 'result.json');
  await writeFile(inputFile, JSON.stringify({ workingDirectory, projectName, freshDb, resources }));
  await writeFile(
    driver,
    `
import { readFileSync, writeFileSync } from 'node:fs';
import { globalStateManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/global-state-manager/index.ts'))};
import { applicationManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/application-manager/index.ts'))};
import { tuiManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/tui-manager/index.ts'))};
import { configManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/domain/config-manager/index.ts'))};
import { getLocalResourceEnvVars, getRelayedLocalResource, startLocalResources } from ${JSON.stringify(resolve(import.meta.dir, '../../src/commands/dev/local-resources/index.ts'))};
const [inputFile, resultFile] = process.argv.slice(2);
const { workingDirectory, projectName, freshDb, resources } = JSON.parse(readFileSync(inputFile, 'utf8'));
await applicationManager.init();
const warnings = [];
const warn = tuiManager.warn.bind(tuiManager);
tuiManager.warn = (message, ...rest) => {
  warnings.push(String(message));
  return warn(message, ...rest);
};
globalStateManager.rawArgs = { stage: 'test', region: 'eu-west-1', currentWorkingDirectory: workingDirectory, freshDb };
globalStateManager.targetStack = { stackName: projectName + '-test', stage: 'test', projectName, globallyUniqueStackHash: 'test' };
configManager.config = { resources };
// The CLI's own handlers turn an unhandled failure into a clean exit, so the result file reports the outcome.
try {
  const names = Object.keys(resources);
  const instances = await startLocalResources(names);
  const relayed = {};
  for (const name of names) relayed[name] = await getRelayedLocalResource(name, { host: '10.20.0.5', port: 40001 });
  writeFileSync(resultFile, JSON.stringify({ instances, warnings, relayed, envVars: getLocalResourceEnvVars(instances) }));
} catch (error) {
  writeFileSync(resultFile, JSON.stringify({ error: String(error?.message ?? error) }));
}
process.exit(0);
`
  );
  const result = await runProcess({
    command: process.execPath,
    args: [
      '--no-env-file',
      '--preload',
      resolve(import.meta.dir, '../../scripts/test-preload.ts'),
      driver,
      inputFile,
      resultFile
    ],
    cwd: resolve(import.meta.dir, '../..'),
    env: { PATH: process.env.PATH!, HOME: home, SKIP_LOADING_ENV: '1', STP_DISABLE_TELEMETRY: '1' },
    timeoutMs: 180_000
  });
  const output = await readFile(resultFile, 'utf8').catch(() => undefined);
  const parsed = output ? (JSON.parse(output) as Partial<DriverResult> & { error?: string }) : {};
  if (!parsed.instances) {
    throw new Error(`The database driver failed: ${parsed.error ?? `exit ${result.exitCode}\n${result.stderr}`}`);
  }
  await rm(resultFile);
  return parsed as DriverResult;
};

const startDatabase = async (
  directory: string,
  workingDirectory: string,
  projectName: string,
  { freshDb = false, home }: { freshDb?: boolean; home?: string } = {}
) => {
  const { instances, warnings } = await startDatabases({ directory, home, workingDirectory, projectName, freshDb });
  return { instance: instances[0] as Instance & { credentials: { username: string; password: string } }, warnings };
};

const query = async (port: number, password: string) => {
  const client = new Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres' });
  await client.connect();
  try {
    return (await client.query('select current_setting($1) as dir', ['data_directory'])).rows[0].dir as string;
  } finally {
    await client.end();
  }
};

const reachable = (host: string, port: number) =>
  new Promise<boolean>((done) => {
    const socket = createConnection({ host, port, timeout: 2000 });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      done(false);
    });
    socket.once('error', () => done(false));
  });

test('worktrees of one project on one stage get separate loopback databases with the stage password', async () => {
  expect(docker(['image', 'inspect', IMAGE]).status === 0 || docker(['pull', IMAGE]).status === 0).toBeTrue();
  const root = await mkdtemp(join(tmpdir(), 'stacktape-worktree-databases-'));
  const projectName = `wt${randomBytes(4).toString('hex')}`;
  const [main, feature, upgraded] = ['main', 'feature', 'upgraded'].map((name) => join(root, name));
  const legacyContainer = `stp-${projectName}-test-db`;
  const owned = new Set([legacyContainer]);
  try {
    // An older CLI started this checkout's database as `stp-<project>-<stage>-<resource>` with the fixed password,
    // and the container is still running on its data directory.
    const legacyData = join(upgraded, '.stacktape', 'dev-data', 'test', 'db', 'data');
    await mkdir(legacyData, { recursive: true });
    const legacy = docker([
      'run',
      '-d',
      '--name',
      legacyContainer,
      '-e',
      'POSTGRES_PASSWORD=localdevpassword',
      '-v',
      `${legacyData}:/var/lib/postgresql/data`,
      IMAGE
    ]);
    expect(legacy.status, legacy.stderr).toBe(0);
    const deadline = Date.now() + 60_000;
    while (docker(['exec', legacyContainer, 'pg_isready', '-U', 'postgres']).status !== 0) {
      expect(Date.now() < deadline, 'legacy database did not become ready').toBeTrue();
      await new Promise((done) => setTimeout(done, 500));
    }

    const [first, second] = await Promise.all([
      startDatabase(root, main, projectName),
      startDatabase(await mkdtemp(join(root, 'driver-')), feature, projectName, { home: root })
    ]);
    const a = first.instance;
    const b = second.instance;
    owned.add(a.containerName).add(b.containerName);

    expect(a.containerName).not.toBe(b.containerName);
    expect(a.actualPort).not.toBe(b.actualPort);
    for (const instance of [a, b]) {
      expect(docker(['inspect', '--format', '{{.State.Status}}', instance.containerName]).stdout.trim()).toBe(
        'running'
      );
      // Published on loopback only, never on the machine's network interfaces.
      expect(docker(['port', instance.containerName, '5432/tcp']).stdout.trim()).toBe(
        `127.0.0.1:${instance.actualPort}`
      );
      expect(instance.credentials.password).toMatch(/^[0-9a-f]{36}$/);
      expect(await readFile(join(instance.dataDir, '..', 'password'), 'utf8')).toBe(instance.credentials.password);
    }
    // Both started at once; the first to create the stage's password decided it for both.
    expect(a.credentials.password).toBe(b.credentials.password);
    expect(a.dataDir).not.toBe(b.dataDir);
    expect(await query(a.actualPort, a.credentials.password)).toBe('/var/lib/postgresql/data');
    expect(await query(b.actualPort, b.credentials.password)).toBe('/var/lib/postgresql/data');
    await expect(query(a.actualPort, 'localdevpassword')).rejects.toThrow(/password authentication failed/);

    const lanAddress = Object.values(networkInterfaces())
      .flat()
      .find((address) => address?.family === 'IPv4' && !address.internal)?.address;
    if (lanAddress) expect(await reachable(lanAddress, a.actualPort)).toBeFalse();

    // A workload container reaches the database the way dev mode runs it on Linux Docker Engine: on the host network.
    const engine = docker(['info', '--format', '{{.OperatingSystem}}']).stdout.trim();
    if (process.platform === 'linux' && engine !== 'Docker Desktop') {
      const fromContainer = docker([
        'run',
        '--rm',
        '--network',
        'host',
        IMAGE,
        'psql',
        `postgresql://postgres:${a.credentials.password}@127.0.0.1:${a.actualPort}/postgres`,
        '-tAc',
        'select 1'
      ]);
      expect(fromContainer.stdout.trim(), fromContainer.stderr).toBe('1');
    }

    // The upgraded checkout: the old container is replaced, and its data keeps the password it was created with.
    const upgradedRun = await startDatabase(root, upgraded, projectName);
    owned.add(upgradedRun.instance.containerName);
    expect(docker(['inspect', legacyContainer]).status).not.toBe(0);
    expect(upgradedRun.instance.credentials.password).toBe('localdevpassword');
    expect(upgradedRun.warnings.join('\n')).toContain('--fresh-db');
    expect(await query(upgradedRun.instance.actualPort, 'localdevpassword')).toBe('/var/lib/postgresql/data');

    // As the warning says, one run with --freshDb recreates the data with the stage's generated password.
    expect(docker(['stop', upgradedRun.instance.containerName]).status).toBe(0);
    const recreated = await startDatabase(root, upgraded, projectName, { freshDb: true });
    expect(recreated.instance.credentials.password).toBe(a.credentials.password);
    expect(await query(recreated.instance.actualPort, recreated.instance.credentials.password)).toBe(
      '/var/lib/postgresql/data'
    );
  } finally {
    // The project name is this run's own, so every container named after it is too, including those of a driver
    // that failed before reporting its instance.
    const named = docker(['ps', '-a', '--filter', `name=^stp-${projectName}-`, '--format', '{{.Names}}']);
    for (const name of named.stdout.split('\n').filter(Boolean)) owned.add(name);
    for (const name of owned) docker(['rm', '-f', name]);
    for (const name of owned) expect(docker(['inspect', name]).status, `${name} must be removed`).not.toBe(0);
    // The database containers own their data files; remove them as the same user.
    docker(['run', '--rm', '-v', `${root}:/work`, '--entrypoint', 'sh', IMAGE, '-c', 'rm -rf /work/*']);
    await rm(root, { recursive: true, force: true });
  }
}, 300_000);

// `stacktape init` sets database passwords to `$Secret(...)`. Dev mode never fetches the deployed secret for a local
// database: each one gets a generated local password, and the container, the deployed dev functions (through the relay)
// and local workloads all get that same password, never the directive text. Data an older CLI initialized with the
// directive text as its password keeps it, with a warning.
test('a database password read from $Secret is replaced by one local password that every consumer gets', async () => {
  const images = ['postgres:15.14', 'mysql:8.0', 'redis:7.2'];
  for (const image of images) {
    expect(docker(['image', 'inspect', image]).status === 0 || docker(['pull', image]).status === 0).toBeTrue();
  }
  const root = await mkdtemp(join(tmpdir(), 'stacktape-secret-databases-'));
  const projectName = `sp${randomBytes(4).toString('hex')}`;
  const owned = new Set<string>();
  const directive = (name: string) => `$Secret('${projectName}-${name}.password')`;
  try {
    const { instances, relayed, envVars } = await startDatabases({
      directory: root,
      workingDirectory: join(root, 'app'),
      projectName,
      resources: {
        db: {
          ...POSTGRES_DB,
          properties: {
            ...POSTGRES_DB.properties,
            credentials: { masterUserName: 'postgres', masterUserPassword: directive('db') }
          }
        },
        mysqldb: {
          type: 'relational-database',
          properties: {
            engine: {
              type: 'mysql',
              properties: { version: '8.0', primaryInstance: { instanceSize: 'db.t4g.micro' } }
            },
            credentials: {
              masterUserName: `$Secret('${projectName}-mysqldb.username')`,
              masterUserPassword: directive('mysqldb')
            }
          }
        },
        cache: {
          type: 'redis-cluster',
          properties: { instanceSize: 'cache.t4g.micro', engineVersion: '7.2', defaultUserPassword: directive('cache') }
        }
      }
    });
    for (const instance of instances) owned.add(instance.containerName);
    expect(instances.map(({ name }) => name).sort()).toEqual(['cache', 'db', 'mysqldb']);
    const byName = Object.fromEntries(instances.map((instance) => [instance.name, instance]));
    const everything = JSON.stringify({ instances, relayed, envVars });
    expect(everything).not.toContain('$Secret');

    for (const instance of instances) {
      const password = instance.credentials!.password;
      expect(password).toMatch(/^[0-9a-f]{36}$/);
      expect(await readFile(join(instance.dataDir, '..', 'password'), 'utf8')).toBe(password);
      // Deployed dev functions reach the database through the relay with the same password.
      expect(relayed[instance.name]!.params.connectionString).toContain(`:${password}@10.20.0.5:40001`);
      // Local workloads get it in their STP_* connection strings.
      expect(envVars[`STP_${instance.name.toUpperCase()}_CONNECTION_STRING`]).toContain(`:${password}@localhost:`);
    }
    expect(new Set(instances.map((instance) => instance.credentials!.password)).size).toBe(3);

    expect(await query(byName.db.actualPort, byName.db.credentials!.password)).toBe('/var/lib/postgresql/data');
    // A username read from a secret falls back to the engine's default user.
    expect(byName.mysqldb.credentials!.username).toBe('root');
    const mysql = docker([
      'exec',
      byName.mysqldb.containerName,
      'mysql',
      '-h127.0.0.1',
      '-uroot',
      `-p${byName.mysqldb.credentials!.password}`,
      '-N',
      '-e',
      'select 1'
    ]);
    expect(mysql.stdout.trim(), mysql.stderr).toBe('1');
    const redis = (...auth: string[]) =>
      docker(['exec', byName.cache.containerName, 'redis-cli', ...auth, '--no-auth-warning', 'ping']).stdout.trim();
    expect(redis('-a', byName.cache.credentials!.password)).toBe('PONG');
    expect(redis()).toContain('NOAUTH');

    // A checkout whose data an older CLI initialized with the directive text as the password keeps working with it.
    const upgraded = join(root, 'upgraded');
    const legacyData = join(upgraded, '.stacktape', 'dev-data', 'test', 'db', 'data');
    await mkdir(legacyData, { recursive: true });
    const legacyContainer = `stp-${projectName}-init`;
    owned.add(legacyContainer);
    const legacy = docker([
      'run',
      '-d',
      '--name',
      legacyContainer,
      '-e',
      `POSTGRES_PASSWORD=${directive('db')}`,
      '-v',
      `${legacyData}:/var/lib/postgresql/data`,
      IMAGE
    ]);
    expect(legacy.status, legacy.stderr).toBe(0);
    const deadline = Date.now() + 60_000;
    while (docker(['exec', legacyContainer, 'pg_isready', '-U', 'postgres', '-h', '127.0.0.1']).status !== 0) {
      expect(Date.now() < deadline, 'legacy database did not become ready').toBeTrue();
      await new Promise((done) => setTimeout(done, 500));
    }
    expect(docker(['rm', '-f', legacyContainer]).status).toBe(0);
    const upgradedRun = await startDatabases({
      directory: await mkdtemp(join(root, 'driver-')),
      workingDirectory: upgraded,
      projectName,
      resources: {
        db: {
          ...POSTGRES_DB,
          properties: {
            ...POSTGRES_DB.properties,
            credentials: { masterUserName: 'postgres', masterUserPassword: directive('db') }
          }
        }
      }
    });
    const [upgradedDb] = upgradedRun.instances;
    owned.add(upgradedDb.containerName);
    expect(upgradedDb.credentials!.password).toBe(directive('db'));
    expect(upgradedRun.warnings.join('\n')).toContain('--fresh-db');
    expect(await query(upgradedDb.actualPort, directive('db'))).toBe('/var/lib/postgresql/data');
  } finally {
    const named = docker(['ps', '-a', '--filter', `name=^stp-${projectName}-`, '--format', '{{.Names}}']);
    for (const name of named.stdout.split('\n').filter(Boolean)) owned.add(name);
    for (const name of owned) docker(['rm', '-f', name]);
    for (const name of owned) expect(docker(['inspect', name]).status, `${name} must be removed`).not.toBe(0);
    docker(['run', '--rm', '-v', `${root}:/work`, '--entrypoint', 'sh', IMAGE, '-c', 'rm -rf /work/*']);
    await rm(root, { recursive: true, force: true });
  }
}, 300_000);

// r2gg findings 2 and 9: a MySQL database with a non-root user and no `dbName` served `app`, while deployed functions
// got `mysql` and failed with "Access denied … to database 'mysql'". A later `dbName` or user change on kept data then
// failed with an access error, because the images create the database and the user only for empty data.
test('local databases serve one database name to every consumer and follow a changed dbName or user', async () => {
  for (const image of [IMAGE, 'mysql:8.0']) {
    expect(docker(['image', 'inspect', image]).status === 0 || docker(['pull', image]).status === 0).toBeTrue();
  }
  const root = await mkdtemp(join(tmpdir(), 'stacktape-database-identity-'));
  const projectName = `di${randomBytes(4).toString('hex')}`;
  const workingDirectory = join(root, 'app');
  const owned = new Set<string>();
  const mysqlDb = (properties: Record<string, unknown>, credentials: Record<string, string>) => ({
    type: 'relational-database',
    properties: {
      engine: {
        type: 'mysql',
        properties: { version: '8.0', primaryInstance: { instanceSize: 'db.t4g.micro' }, ...properties }
      },
      credentials
    }
  });
  const postgresDb = (properties: Record<string, unknown>, credentials: Record<string, string>) => ({
    ...POSTGRES_DB,
    properties: {
      engine: {
        ...POSTGRES_DB.properties.engine,
        properties: { ...POSTGRES_DB.properties.engine.properties, ...properties }
      },
      credentials
    }
  });
  const start = async (resources: Record<string, unknown>) => {
    const result = await startDatabases({
      directory: await mkdtemp(join(root, 'driver-')),
      workingDirectory,
      projectName,
      resources
    });
    for (const instance of result.instances) owned.add(instance.containerName);
    return { ...result, byName: Object.fromEntries(result.instances.map((instance) => [instance.name, instance])) };
  };
  /** Stops the session's containers, as `stacktape dev` does on exit; the data stays. */
  const stop = (instances: Instance[]) => {
    for (const { containerName } of instances) expect(docker(['rm', '-f', containerName]).status).toBe(0);
  };
  const mysqlDatabase = async (instance: Instance, user: string, database: string) => {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: instance.actualPort,
      user,
      password: instance.credentials!.password,
      database
    });
    try {
      const [rows] = await connection.query('select database() as db');
      return (rows as Array<{ db: string }>)[0]!.db;
    } finally {
      await connection.end();
    }
  };
  const postgresDatabase = async (instance: Instance, user: string, database: string) => {
    const client = new Client({
      host: '127.0.0.1',
      port: instance.actualPort,
      user,
      password: instance.credentials!.password,
      database
    });
    await client.connect();
    try {
      return (await client.query('select current_database() as db')).rows[0].db as string;
    } finally {
      await client.end();
    }
  };
  try {
    // `init` writes `masterUserName: stacktape` and no `dbName`.
    const first = await start({
      mydb: mysqlDb({}, { masterUserName: 'stacktape' }),
      pgdb: postgresDb({}, { masterUserName: 'postgres' })
    });
    const mydb = first.byName.mydb!;
    expect(mydb.referencableParams.dbName).toBe('app');
    expect(first.relayed.mydb!.params.dbName).toBe('app');
    expect(first.relayed.mydb!.params.connectionString).toEndWith('@10.20.0.5:40001/app');
    expect(first.envVars.STP_MYDB_DB_NAME).toBe('app');
    expect(await mysqlDatabase(mydb, 'stacktape', 'app')).toBe('app');
    expect(first.byName.pgdb!.referencableParams.dbName).toBe('postgres');
    expect(JSON.parse(await readFile(join(mydb.dataDir, '..', 'identity.json'), 'utf8'))).toEqual({
      dbName: 'app',
      username: 'stacktape'
    });
    stop(first.instances);

    // The configuration names another database, and for PostgreSQL another user; the data stays.
    const changed = await start({
      mydb: mysqlDb({ dbName: 'shelf' }, { masterUserName: 'stacktape' }),
      pgdb: postgresDb({ dbName: 'orders' }, { masterUserName: 'shelf_app' })
    });
    expect(changed.relayed.mydb!.params.dbName).toBe('shelf');
    expect(await mysqlDatabase(changed.byName.mydb!, 'stacktape', 'shelf')).toBe('shelf');
    expect(changed.relayed.pgdb!.params.connectionString).toContain('shelf_app:');
    expect(await postgresDatabase(changed.byName.pgdb!, 'shelf_app', 'orders')).toBe('orders');
    stop(changed.instances);

    // A configured password differs from the one the data was created with, so dev mode cannot log in to create them.
    const failure = await start({
      mydb: mysqlDb({ dbName: 'other' }, { masterUserName: 'stacktape', masterUserPassword: 'not-the-data-password' })
    }).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain(
      'The local data of "mydb" was created for database "shelf" and user "stacktape", and creating database "other" and user "stacktape" in it failed'
    );
    expect((failure as Error).message).toContain('Start with freshDb (--fresh-db) to recreate it');
    // The cause is the client's own error, not the `docker exec` command line; the password is not in it.
    expect((failure as Error).message).toContain(
      "(ERROR 1045 (28000): Access denied for user 'root'@'127.0.0.1' (using password: YES))"
    );
    expect((failure as Error).message).not.toContain('not-the-data-password');
  } finally {
    const named = docker(['ps', '-a', '--filter', `name=^stp-${projectName}-`, '--format', '{{.Names}}']);
    for (const name of named.stdout.split('\n').filter(Boolean)) owned.add(name);
    for (const name of owned) docker(['rm', '-f', name]);
    for (const name of owned) expect(docker(['inspect', name]).status, `${name} must be removed`).not.toBe(0);
    docker(['run', '--rm', '-v', `${root}:/work`, '--entrypoint', 'sh', IMAGE, '-c', 'rm -rf /work/*']);
    await rm(root, { recursive: true, force: true });
  }
}, 300_000);
