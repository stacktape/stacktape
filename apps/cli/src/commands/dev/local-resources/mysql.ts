import type { LocalResourceConfig, LocalResourceInstance } from './index';
import { readdir } from 'node:fs/promises';
import { execDocker } from '@utils/docker';
import { getDevContainerOwnerArgs } from '../cleanup-utils';
import {
  buildLocalResourceInstance,
  DEFAULT_LOCAL_HOST,
  DEFAULT_PORTS,
  doesContainerExist,
  findAvailablePort,
  getContainerPort,
  getDbCredentials,
  getImageTag,
  isDockerPortBindError,
  isContainerRunning,
  publishOnLoopback,
  removeContainerIfExists,
  waitForReady
} from './container-helpers';
import { getLocalDbParameters, mysqlParamsToDockerArgs } from './db-parameters';

const MYSQL_DATA_PATH = '/var/lib/mysql';

type MysqlEngine = 'MySQL' | 'MariaDB';

/** A server that wrote a data directory, as its files name it. */
export type MysqlDataWriter = { engine: MysqlEngine; version: string };

/**
 * Prints what the files of a data directory mounted at `/check` say about the servers that wrote it:
 * - `mysql.ibd`, the data dictionary of MySQL 8.0 and later;
 * - `mysql_upgrade_history` (MySQL 8.3 and later) and `mysql_upgrade_info` (older servers, MariaDB), with versions;
 * - the creator of each redo log file, 32 bytes at offset 16 of its header: `MySQL 8.4.8` in `#innodb_redo/#ib_redoN`
 *   (MySQL 8.0.30 and later) or in `ib_logfile0`, which older servers and MariaDB use.
 */
const MYSQL_DATA_PROBE = `cd /check || exit 0
[ -f mysql.ibd ] && echo dictionary
[ -f mysql_upgrade_history ] && echo "history $(tr -d '\\n' < mysql_upgrade_history)"
[ -f mysql_upgrade_info ] && echo "info $(head -c 64 mysql_upgrade_info | tr -d '\\000\\n')"
for file in ib_logfile0 '#innodb_redo'/'#ib_redo'*; do
  case "$file" in *_tmp) continue ;; esac
  [ -f "$file" ] && echo "redo $(head -c 48 "$file" | tail -c 32 | tr -d '\\000')"
done
true`;

/** The servers the probe's output names, the data dictionary as MySQL 8.0. */
export const parseMysqlDataWriters = (output: string): MysqlDataWriter[] => {
  const writers: MysqlDataWriter[] = [];
  const add = (text: string | undefined, engine?: MysqlEngine) => {
    const match = /(\d+\.\d+(?:\.\d+)?)/.exec(text ?? '');
    if (match) writers.push({ engine: engine ?? (/mariadb/i.test(text!) ? 'MariaDB' : 'MySQL'), version: match[1] });
  };
  for (const line of output.split('\n').map((value) => value.trim())) {
    const [kind, ...rest] = line.split(' ');
    const value = rest.join(' ');
    if (kind === 'dictionary') writers.push({ engine: 'MySQL', version: '8.0' });
    else if (kind === 'history') {
      try {
        add(JSON.parse(value).upgrade_history?.at(-1)?.version, 'MySQL');
      } catch {}
    } else if (kind === 'info' || kind === 'redo') add(value);
  }
  return writers;
};

const versionParts = (version: string) => (/^(\d+)(?:\.(\d+))?/.exec(version) ?? []).slice(1, 3).map(Number);

/** Compares major and minor versions; a missing minor version compares equal. */
const compareMinorVersions = (left: string, right: string) => {
  const [leftMajor, leftMinor] = versionParts(left);
  const [rightMajor, rightMinor] = versionParts(right);
  if (leftMajor !== rightMajor) return leftMajor - rightMajor;
  return Number.isNaN(leftMinor) || Number.isNaN(rightMinor) ? 0 : leftMinor - rightMinor;
};

/** Compares every part of two versions, so the newest writer is named with its patch version. */
const compareVersions = (left: string, right: string) => {
  const [leftParts, rightParts] = [left, right].map((version) => version.split('.').map(Number));
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
};

const newestWriter = (writers: MysqlDataWriter[]) =>
  writers.reduce<MysqlDataWriter | undefined>(
    (newest, writer) => (!newest || compareVersions(writer.version, newest.version) > 0 ? writer : newest),
    undefined
  );

/**
 * Why the configured server must not open data that these servers wrote, or `undefined` when it may. A server of
 * another engine cannot read it; an older one refuses data that a newer one wrote, and MySQL 5.7 even writes its own
 * redo log into it before it crashes, after which the newer version refuses the data too (r2ab). MySQL upgrades 5.7
 * data only with 8.0: MySQL 8.4 converts the redo log of 5.7 data before it fails, after which 5.7 cannot read it.
 */
export const findMysqlDataMismatch = ({
  engine,
  version,
  writers
}: {
  engine: MysqlEngine;
  version: string;
  writers: MysqlDataWriter[];
}): { writer: MysqlDataWriter; reason: 'engine' | 'newer' | 'upgrade-path' } | undefined => {
  const otherEngine = newestWriter(writers.filter((writer) => writer.engine !== engine));
  if (otherEngine) return { writer: otherEngine, reason: 'engine' };
  const newest = newestWriter(writers);
  if (!newest || Number.isNaN(versionParts(version)[0])) return undefined;
  if (compareMinorVersions(newest.version, version) > 0) return { writer: newest, reason: 'newer' };
  if (
    engine === 'MySQL' &&
    compareMinorVersions(newest.version, '8.0') < 0 &&
    compareMinorVersions(version, '8.0') > 0
  ) {
    return { writer: newest, reason: 'upgrade-path' };
  }
  return undefined;
};

/**
 * Reads which servers wrote a data directory, from a read-only container of the configured image: on Linux the
 * database container owns the files, and the developer cannot read them. An empty or missing directory needs no check.
 */
const readMysqlDataWriters = async ({ dataDir, imageTag }: { dataDir: string; imageTag: string }) => {
  try {
    if (!(await readdir(dataDir)).length) return [];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    if (code !== 'EACCES' && code !== 'EPERM') throw error;
  }
  const { stdout } = await execDocker(
    [
      'run',
      '--rm',
      '--network',
      'none',
      '--user',
      '0',
      '--entrypoint',
      'sh',
      '-v',
      `${dataDir}:/check:ro`,
      imageTag,
      '-c',
      MYSQL_DATA_PROBE
    ],
    { skipHandleError: true }
  );
  return parseMysqlDataWriters(stdout ?? '');
};

/** Crash messages of a server started on data of another version (r2ab, and versions this CLI did not check). */
const INCOMPATIBLE_DATA_MESSAGES = [
  /Unsupported redo log format.*/,
  /Unknown\/unsupported storage engine: InnoDB.*/,
  /Table flags are \S+ in the data dictionary but the flags in file \S+ are \S+/,
  /Upgrade is not supported after a crash[^.]*\.(?: This redo log was created with [^,]+)?/,
  /Invalid MySQL server (?:downgrade|upgrade): [^.]+\./,
  /Cannot open datafile for read-only: 'mysql\.ibd'/
];

const findIncompatibleMysqlDataMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  for (const pattern of INCOMPATIBLE_DATA_MESSAGES) {
    const match = pattern.exec(message);
    if (match) return match[0].trim();
  }
  return undefined;
};

const mysqlDataChoices = ({
  engine,
  version,
  writtenBy
}: {
  engine: MysqlEngine;
  version: string;
  writtenBy: string;
}) =>
  `To keep using the data, set the version it was written with (${writtenBy}) in the config. To start over with an empty database, restart with --fresh-db (this deletes the data). ` +
  `To move the data to ${engine} ${version}, run ${writtenBy}, dump the database with mysqldump, then switch the version, restart with --fresh-db and load the dump.`;

/** Refuses data the configured server must not open, before any server opens it; the data is unchanged. */
export const mismatchedMysqlDataError = ({
  name,
  engine,
  version,
  dataDir,
  mismatch: { writer, reason }
}: {
  name: string;
  engine: MysqlEngine;
  version: string;
  dataDir: string;
  mismatch: NonNullable<ReturnType<typeof findMysqlDataMismatch>>;
}) => {
  const writtenBy = `${writer.engine} ${writer.version}`;
  const why =
    reason === 'upgrade-path'
      ? `${engine} ${version} cannot upgrade it: only MySQL 8.0 upgrades data of MySQL 5.7`
      : `${engine} ${version} cannot read it`;
  return new Error(
    `The local data of "${name}" in ${dataDir} was written by ${writtenBy}, and ${why}. Stacktape did not start ${engine} ${version} on it, so the data is unchanged. ` +
      (reason === 'upgrade-path'
        ? `To upgrade the data, set version 8.0 in the config and start dev mode once, then set ${version}. `
        : '') +
      mysqlDataChoices({ engine, version, writtenBy })
  );
};

/**
 * The server crashed on data that its version check let through, for example data that an older CLI let a mismatched
 * server write to. The server may have changed the data before it stopped.
 */
export const incompatibleMysqlDataError = ({
  name,
  engine,
  version,
  dataDir,
  detail
}: {
  name: string;
  engine: MysqlEngine;
  version: string;
  dataDir: string;
  /** The server's own message. */
  detail: string;
}) => {
  const writtenBy = /created with (MySQL [\d.]+)/.exec(detail)?.[1];
  return new Error(
    `${engine} ${version} could not start on the local data of "${name}" in ${dataDir}: ${detail} ` +
      (writtenBy
        ? `${writtenBy} wrote its redo log into this data when it was started on it before; ${engine} ${version} cannot continue from it. `
        : `The data was written by another ${engine} version, or by another database engine. `) +
      'To start over with an empty database, restart with --fresh-db (this deletes the data). If the data matters, keep a copy of the directory before you try anything else, then start the version that wrote it and dump the database with mysqldump.'
  );
};

export const buildConnectionInfo = (user: string, pass: string, host: string, port: number, database: string) => {
  const connectionString = `mysql://${user}:${pass}@${host}:${port}/${database}`;
  return {
    connectionString,
    referencableParams: {
      host,
      port: String(port),
      dbName: database,
      connectionString,
      jdbcConnectionString: `jdbc:mysql://${host}:${port}/${database}?user=${user}&password=${pass}`
    }
  };
};

export const startLocalMysql = async (
  config: LocalResourceConfig & { containerName: string }
): Promise<LocalResourceInstance> => {
  const { name, type, version, port, dataDir, dbName, containerName } = config;
  const isMaria = type === 'mariadb';
  const defaultPort = DEFAULT_PORTS.mysql;
  const { username: user, password: pass } = getDbCredentials(config, { username: 'root' });
  // Resolved with `getLocalDatabaseName`, which every other consumer of the database name uses too.
  const database = dbName || 'mysql';

  // Return existing instance if container is already running
  if (await isContainerRunning(containerName)) {
    const actualPort = await getContainerPort(containerName, defaultPort, port);
    const connInfo = buildConnectionInfo(user, pass, DEFAULT_LOCAL_HOST, actualPort, database);

    return buildLocalResourceInstance({
      config,
      host: DEFAULT_LOCAL_HOST,
      actualPort,
      ...connInfo
    });
  }

  // Remove stopped container with same name if it exists
  if (await doesContainerExist(containerName)) {
    await removeContainerIfExists(containerName);
  }

  let actualPort = await findAvailablePort(port);
  const imageTag = getImageTag(version, isMaria ? 'mariadb' : 'mysql');
  const engineName = isMaria ? 'MariaDB' : 'MySQL';
  // Before any server opens the data: a mismatched server that starts on it can change it before it crashes.
  const mismatch = findMysqlDataMismatch({
    engine: engineName,
    version,
    writers: await readMysqlDataWriters({ dataDir, imageTag })
  });
  if (mismatch) throw mismatchedMysqlDataError({ name, engine: engineName, version, dataDir, mismatch });

  // Fetch and merge database parameters (skip AWS defaults for faster dev startup)
  const engine = isMaria ? 'mariadb' : 'mysql';
  const dbParams = await getLocalDbParameters({ resourceName: name, engine, version, skipAwsDefaults: true });
  const mysqlConfigArgs = mysqlParamsToDockerArgs(dbParams);

  const envVars: Record<string, string> = {
    MYSQL_ROOT_PASSWORD: pass
  };

  // MariaDB/MySQL system database "mysql" already exists.
  // Passing MYSQL_DATABASE=mysql may cause initialization failures in some images.
  const shouldCreateDatabase = database.toLowerCase() !== 'mysql';

  if (shouldCreateDatabase) {
    envVars.MYSQL_DATABASE = database;
  }

  // A non-root user gets rights on MYSQL_DATABASE, which `getLocalDatabaseName` never leaves at `mysql` for one.
  if (user !== 'root') {
    envVars.MYSQL_USER = user;
    envVars.MYSQL_PASSWORD = pass;
  }

  const buildDockerArgs = (hostPort: number) => [
    'run',
    '-d',
    '--name',
    containerName,
    ...getDevContainerOwnerArgs(),
    ...Object.entries(envVars).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
    ...publishOnLoopback(hostPort, defaultPort),
    '-v',
    `${dataDir}:${MYSQL_DATA_PATH}`,
    imageTag,
    ...mysqlConfigArgs
  ];

  const runAndWaitUntilReady = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await execDocker(buildDockerArgs(actualPort));
        break;
      } catch (err) {
        if (!isDockerPortBindError(err) || attempt === 4) {
          throw err;
        }
        // Docker creates the container before it fails to bind the port; remove it so the retry can reuse the name.
        await removeContainerIfExists(containerName);
        actualPort = await findAvailablePort(actualPort + 1);
      }
    }

    await waitForReady({
      containerName,
      resourceType: isMaria ? 'MariaDB' : 'MySQL',
      timeoutMs: 60000,
      pollIntervalMs: 1000,
      // Over TCP: during first initialization the image runs a temporary server on the socket only, which answers a
      // socket ping before clients can connect.
      checkFn: async () => {
        const { exitCode } = await execDocker(
          ['exec', containerName, 'mysqladmin', 'ping', '-h', '127.0.0.1', '--silent'],
          { skipHandleError: true }
        );
        return exitCode === 0;
      }
    });
  };

  try {
    await runAndWaitUntilReady();
  } catch (err) {
    const detail = findIncompatibleMysqlDataMessage(err);
    if (!detail) throw err;
    // The data stays: only --fresh-db deletes it, before the container starts (see `prepareLocalResource`).
    await removeContainerIfExists(containerName);
    throw incompatibleMysqlDataError({ name, engine: engineName, version, dataDir, detail });
  }

  const connInfo = buildConnectionInfo(user, pass, DEFAULT_LOCAL_HOST, actualPort, database);

  return buildLocalResourceInstance({
    config,
    host: DEFAULT_LOCAL_HOST,
    actualPort,
    ...connInfo
  });
};
