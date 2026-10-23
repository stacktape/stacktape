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
// container, port and generated password, published on loopback only, and a data directory an older CLI initialized
// with the old fixed password must keep working. The production local-resource code starts real PostgreSQL containers.
const IMAGE = 'postgres:15.14';
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000 });

type Instance = {
  containerName: string;
  actualPort: number;
  dataDir: string;
  credentials: { username: string; password: string };
};

const startDatabase = async (directory: string, workingDirectory: string, projectName: string, freshDb = false) => {
  const driver = join(directory, 'driver.ts');
  const resultFile = join(directory, 'result.json');
  await writeFile(
    driver,
    `
import { writeFileSync } from 'node:fs';
import { globalStateManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/global-state-manager/index.ts'))};
import { applicationManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/application-manager/index.ts'))};
import { tuiManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/app/tui-manager/index.ts'))};
import { configManager } from ${JSON.stringify(resolve(import.meta.dir, '../../src/domain/config-manager/index.ts'))};
import { startLocalResources } from ${JSON.stringify(resolve(import.meta.dir, '../../src/commands/dev/local-resources/index.ts'))};
const [workingDirectory, projectName, freshDb, resultFile] = process.argv.slice(2);
await applicationManager.init();
const warnings = [];
const warn = tuiManager.warn.bind(tuiManager);
tuiManager.warn = (message, ...rest) => {
  warnings.push(String(message));
  return warn(message, ...rest);
};
globalStateManager.rawArgs = { stage: 'test', region: 'eu-west-1', currentWorkingDirectory: workingDirectory, freshDb: freshDb === 'fresh' };
globalStateManager.targetStack = { stackName: projectName + '-test', stage: 'test', projectName, globallyUniqueStackHash: 'test' };
configManager.config = {
  resources: {
    db: {
      type: 'relational-database',
      properties: {
        engine: { type: 'postgres', properties: { version: '15.14', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
        credentials: { masterUserName: 'postgres' }
      }
    }
  }
};
// The CLI's own handlers turn an unhandled failure into a clean exit, so the result file reports the outcome.
try {
  const [db] = await startLocalResources(['db']);
  writeFileSync(resultFile, JSON.stringify({ instance: db, warnings }));
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
      workingDirectory,
      projectName,
      freshDb ? 'fresh' : '',
      resultFile
    ],
    cwd: resolve(import.meta.dir, '../..'),
    env: { PATH: process.env.PATH!, HOME: directory, SKIP_LOADING_ENV: '1', STP_DISABLE_TELEMETRY: '1' },
    timeoutMs: 120_000
  });
  const output = await readFile(resultFile, 'utf8').catch(() => undefined);
  const parsed = output ? (JSON.parse(output) as { instance?: Instance; warnings?: string[]; error?: string }) : {};
  if (!parsed.instance) {
    throw new Error(`The database driver failed: ${parsed.error ?? `exit ${result.exitCode}\n${result.stderr}`}`);
  }
  await rm(resultFile);
  return { instance: parsed.instance, warnings: parsed.warnings ?? [] };
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

test('worktrees of one project on one stage get separate loopback databases with their own passwords', async () => {
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
      startDatabase(await mkdtemp(join(root, 'driver-')), feature, projectName)
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
    expect(a.credentials.password).not.toBe(b.credentials.password);
    expect(await query(a.actualPort, a.credentials.password)).toBe('/var/lib/postgresql/data');
    expect(await query(b.actualPort, b.credentials.password)).toBe('/var/lib/postgresql/data');
    await expect(query(a.actualPort, b.credentials.password)).rejects.toThrow(/password authentication failed/);
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

    // As the warning says, one run with --freshDb recreates the data with a generated password.
    expect(docker(['stop', upgradedRun.instance.containerName]).status).toBe(0);
    const recreated = await startDatabase(root, upgraded, projectName, true);
    expect(recreated.instance.credentials.password).toMatch(/^[0-9a-f]{36}$/);
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
