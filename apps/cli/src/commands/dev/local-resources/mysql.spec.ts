import { afterAll, expect, mock, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// r2rr bug hunt, finding 1: a MySQL image that could not read the existing local data made dev mode delete the data
// directory and start an empty database, without --fresh-db. Docker is substituted at its module boundary; the data
// directory is real.

const docker = { runs: 0, removed: 0, exists: false };
mock.module('@utils/docker', () => ({
  execDocker: async (args: string[]) => {
    if (args[0] === 'run') {
      docker.runs++;
      docker.exists = true;
    }
    if (args[0] === 'rm') {
      docker.removed++;
      docker.exists = false;
    }
    if (args[0] === 'logs')
      return { stdout: '[ERROR] [MY-013090] [InnoDB] Unsupported redo log format (1).', stderr: '' };
    return { stdout: '', stderr: '', exitCode: 0 };
  },
  // The container exits during startup, as an image that cannot read the redo log does.
  inspectDockerContainer: async () =>
    docker.exists ? { Id: 'mysql', State: { Running: false, Status: 'exited', ExitCode: 1 } } : {},
  stopDockerContainer: async () => {}
}));
mock.module('./db-parameters', () => ({
  getLocalDbParameters: async () => ({}),
  mysqlParamsToDockerArgs: () => []
}));

const { startLocalMysql } = await import('./mysql');

const root = mkdtempSync(join(tmpdir(), 'stacktape-mysql-data-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

test('data the configured MySQL version cannot read is kept, and the error says how to keep or replace it', async () => {
  const dataDir = join(root, 'data');
  mkdirSync(dataDir);
  writeFileSync(join(dataDir, 'ibdata1'), 'the developer data');

  const failure = await startLocalMysql({
    name: 'db',
    type: 'mysql',
    version: '8.4',
    port: 33061,
    dataDir,
    credentials: { username: 'root', password: 'local-password' },
    dbName: 'app',
    containerName: 'stp-test-mysql'
  } as Parameters<typeof startLocalMysql>[0]).then(
    () => undefined,
    (error: Error) => error.message
  );

  expect(existsSync(join(dataDir, 'ibdata1'))).toBe(true);
  expect(docker.runs).toBe(1);
  expect(docker.exists).toBe(false);
  expect(failure).toContain('MySQL 8.4 cannot read');
  expect(failure).toContain(dataDir);
  expect(failure).toContain('set the version it was created with');
  expect(failure).toContain('--fresh-db');
});
