import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// r2rr bug hunt, finding 1: a MySQL image that could not read the existing local data made dev mode delete the data
// directory and start an empty database, without --fresh-db. r2ab dogfood, finding 2: MySQL 5.7 started on 8.4 data
// wrote its own redo log into it before it crashed, and 8.4 refused the data afterwards. Docker is substituted at its
// module boundary; the data directory is real. `tests/local-development/worktree-databases.spec.ts` runs real images.

const docker = {
  runs: [] as string[][],
  removed: 0,
  exists: false,
  /** What the data probe prints, as it printed it for real data directories. */
  probe: '',
  crash: ''
};
const isProbe = (args: string[]) => args.includes('--entrypoint');
mock.module('@utils/docker', () => ({
  execDocker: async (args: string[]) => {
    if (args[0] === 'run') {
      docker.runs.push(args);
      if (isProbe(args)) return { stdout: docker.probe, stderr: '', exitCode: 0 };
      docker.exists = true;
    }
    if (args[0] === 'rm') {
      docker.removed++;
      docker.exists = false;
    }
    if (args[0] === 'logs') return { stdout: docker.crash, stderr: '' };
    return { stdout: '', stderr: '', exitCode: 0 };
  },
  // The container exits during startup, as a server that cannot read the data does.
  inspectDockerContainer: async () =>
    docker.exists ? { Id: 'mysql', State: { Running: false, Status: 'exited', ExitCode: 1 } } : {},
  stopDockerContainer: async () => {}
}));
mock.module('./db-parameters', () => ({
  getLocalDbParameters: async () => ({}),
  mysqlParamsToDockerArgs: () => []
}));

let mysql: typeof import('./mysql');
beforeAll(async () => {
  mysql = await import('./mysql');
});

const root = mkdtempSync(join(tmpdir(), 'stacktape-mysql-data-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
beforeEach(() => Object.assign(docker, { runs: [], removed: 0, exists: false, probe: '', crash: '' }));

/** The probe's output for data directories that real images initialized (MySQL 8.4.8, 8.0.46 and 5.7.44). */
const PROBED = {
  mysql84:
    'dictionary\nhistory {"file_format":"1","upgrade_history":[{"date":"2026-10-28 17:59:31","version":"8.4.8","maturity":"LTS","initialize":true}]}\nredo MySQL 8.4.8\n',
  mysql80: 'dictionary\nredo MySQL 8.0.46\n',
  mysql57: 'redo MySQL 5.7.44\n',
  // 8.4 data into which MySQL 5.7 wrote ib_logfile0 before it crashed (r2ab).
  mysql84WithRedoOf57:
    'dictionary\nhistory {"file_format":"1","upgrade_history":[{"version":"8.4.8"}]}\nredo MySQL 5.7.44\nredo MySQL 8.4.8\n',
  mariadb: 'info 10.11.6-MariaDB\nredo MariaDB 10.11.6\n'
};

describe('the version check before a MySQL or MariaDB server opens existing data', () => {
  const cases: Array<[string, 'MySQL' | 'MariaDB', string, string | undefined]> = [
    ['mysql84', 'MySQL', '8.4', undefined],
    ['mysql84', 'MySQL', '8.4.3', undefined],
    ['mysql84', 'MySQL', '8.0', 'newer MySQL 8.4.8'],
    ['mysql84', 'MySQL', '5.7.44', 'newer MySQL 8.4.8'],
    ['mysql84WithRedoOf57', 'MySQL', '8.4.8', undefined],
    ['mysql84WithRedoOf57', 'MySQL', '5.7', 'newer MySQL 8.4.8'],
    ['mysql80', 'MySQL', '8.4', undefined],
    ['mysql80', 'MySQL', '5.7', 'newer MySQL 8.0.46'],
    ['mysql57', 'MySQL', '5.7', undefined],
    ['mysql57', 'MySQL', '8.0', undefined],
    ['mysql57', 'MySQL', '8.4', 'upgrade-path MySQL 5.7.44'],
    ['mysql57', 'MySQL', 'latest', undefined],
    ['mariadb', 'MySQL', '8.4', 'engine MariaDB 10.11.6'],
    ['mysql84', 'MariaDB', '11.4', 'engine MySQL 8.4.8'],
    ['mariadb', 'MariaDB', '10.11', undefined],
    ['mariadb', 'MariaDB', '10.6', 'newer MariaDB 10.11.6']
  ];
  test.each(cases)('%s data, %s %s: %s', (data, engine, version, expected) => {
    const writers = mysql.parseMysqlDataWriters(PROBED[data as keyof typeof PROBED]);
    const mismatch = mysql.findMysqlDataMismatch({ engine, version, writers });
    expect(mismatch && `${mismatch.reason} ${mismatch.writer.engine} ${mismatch.writer.version}`).toBe(expected);
  });
});

const start = (dataDir: string, version: string) =>
  mysql
    .startLocalMysql({
      name: 'db',
      type: 'mysql',
      version,
      port: 33061,
      dataDir,
      credentials: { username: 'root', password: 'local-password' },
      dbName: 'app',
      containerName: 'stp-test-mysql'
    } as Parameters<typeof mysql.startLocalMysql>[0])
    .then(
      () => undefined,
      (error: Error) => error.message
    );

const dataDirectory = (name: string) => {
  const dataDir = join(root, name);
  mkdirSync(dataDir);
  writeFileSync(join(dataDir, 'ibdata1'), 'the developer data');
  return dataDir;
};

test('data a newer MySQL wrote is refused before any server opens it, and the error says how to keep or replace it', async () => {
  const dataDir = dataDirectory('newer');
  docker.probe = PROBED.mysql84;
  const failure = await start(dataDir, '5.7.44');
  // Only the probe ran, with the data mounted read-only.
  expect(docker.runs).toHaveLength(1);
  expect(docker.runs[0]).toContain(`${dataDir}:/check:ro`);
  expect(docker.runs[0]).toContain('mysql:5.7.44');
  expect(existsSync(join(dataDir, 'ibdata1'))).toBe(true);
  expect(failure).toContain(
    `The local data of "db" in ${dataDir} was written by MySQL 8.4.8, and MySQL 5.7.44 cannot read it`
  );
  expect(failure).toContain('the data is unchanged');
  expect(failure).toContain('set the version it was written with (MySQL 8.4.8)');
  expect(failure).toContain('--fresh-db');
  expect(failure).toContain('mysqldump');
});

test('data MySQL 8.4 cannot upgrade says to upgrade it with 8.0 first', async () => {
  docker.probe = PROBED.mysql57;
  const failure = await start(dataDirectory('jump'), '8.4');
  expect(docker.runs).toHaveLength(1);
  expect(failure).toContain('MySQL 8.4 cannot upgrade it: only MySQL 8.0 upgrades data of MySQL 5.7');
  expect(failure).toContain('set version 8.0 in the config and start dev mode once, then set 8.4');
});

test('an empty or missing data directory starts without a probe', async () => {
  const dataDir = join(root, 'empty');
  mkdirSync(dataDir);
  docker.crash = 'mysqld is not starting in this test';
  await start(dataDir, '8.4');
  await start(join(root, 'missing'), '8.4');
  expect(docker.runs.filter(isProbe)).toEqual([]);
});

// Both crashes r2ab observed, on data the version check lets through (written before this check existed).
test.each([
  [
    '[ERROR] [FATAL] InnoDB: Table flags are 0 in the data dictionary but the flags in file ./ibdata1 are 0x4800!',
    'Table flags are 0 in the data dictionary but the flags in file ./ibdata1 are 0x4800',
    'The data was written by another MySQL version'
  ],
  [
    '[ERROR] [MY-012526] [InnoDB] Upgrade is not supported after a crash or shutdown with innodb_fast_shutdown = 2. This redo log was created with MySQL 5.7.44, and it appears logically non empty. Please follow the instructions at http://dev.mysql.com/doc/refman/8.4/en/upgrading.html',
    'This redo log was created with MySQL 5.7.44',
    'MySQL 5.7.44 wrote its redo log into this data when it was started on it before'
  ],
  [
    '[ERROR] [MY-013090] [InnoDB] Unsupported redo log format (1).',
    'Unsupported redo log format (1).',
    'another MySQL version'
  ]
])('a server that crashes on the data: %s', async (crash, detail, explanation) => {
  const dataDir = dataDirectory(`crash-${docker.runs.length}-${Math.random().toString(36).slice(2)}`);
  docker.probe = PROBED.mysql84WithRedoOf57;
  docker.crash = crash;
  const failure = await start(dataDir, '8.4.8');
  expect(existsSync(join(dataDir, 'ibdata1'))).toBe(true);
  expect(docker.exists).toBe(false);
  expect(failure).toContain(`MySQL 8.4.8 could not start on the local data of "db" in ${dataDir}`);
  expect(failure).toContain(detail);
  expect(failure).toContain(explanation);
  expect(failure).toContain('--fresh-db');
  expect(failure).not.toContain('unchanged');
});
