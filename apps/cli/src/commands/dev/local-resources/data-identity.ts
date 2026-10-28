import type { LocalResourceConfig } from './index';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execDocker } from '@utils/docker';

/**
 * The database and user a local database's data serves. The images create both only when they initialize an empty
 * data directory, so a later change of `dbName` or the user left the data without them and every client failed with
 * an access error.
 */
export type LocalDataIdentity = { dbName: string; username: string };

export const readLocalDataIdentity = (file: string): LocalDataIdentity | undefined => {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return typeof parsed?.dbName === 'string' && typeof parsed?.username === 'string'
      ? { dbName: parsed.dbName, username: parsed.username }
      : undefined;
  } catch {
    return undefined;
  }
};

const writeLocalDataIdentity = (file: string, identity: LocalDataIdentity) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(identity)}\n`);
};

const sqlString = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;
const mysqlIdentifier = (value: string) => `\`${value.replaceAll('`', '``')}\``;
// Postgres keeps backslashes in standard strings.
const postgresString = (value: string) => `'${value.replaceAll("'", "''")}'`;

/**
 * Creates the database and, for a user other than root, the user with the rights the image gives `MYSQL_USER`.
 * Statements that find them present change nothing.
 */
export const mysqlIdentitySql = ({ dbName, username, password }: LocalDataIdentity & { password: string }): string => {
  const statements = [`CREATE DATABASE IF NOT EXISTS ${mysqlIdentifier(dbName)};`];
  if (username !== 'root') {
    const account = `${sqlString(username)}@'%'`;
    statements.push(
      `CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${sqlString(password)};`,
      `GRANT ALL PRIVILEGES ON ${mysqlIdentifier(dbName)}.* TO ${account};`
    );
  }
  return `${statements.join('\n')}\n`;
};

/**
 * A psql script that creates the user as the image creates `POSTGRES_USER` (a superuser) and the database it owns,
 * each only when missing. `CREATE DATABASE` cannot run inside a function, so `\gexec` runs the generated statements.
 */
export const postgresIdentitySql = ({ dbName, username, password }: LocalDataIdentity & { password: string }): string =>
  [
    `SELECT format('CREATE ROLE %I LOGIN SUPERUSER PASSWORD %L', ${postgresString(username)}, ${postgresString(password)}) ` +
      `WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${postgresString(username)})\\gexec`,
    `SELECT format('CREATE DATABASE %I OWNER %I', ${postgresString(dbName)}, ${postgresString(username)}) ` +
      `WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = ${postgresString(dbName)})\\gexec`,
    ''
  ].join('\n');

type RunInContainer = (args: string[], stdinInput: string) => Promise<void>;

const runInContainer: RunInContainer = async (args, stdinInput) => {
  await execDocker(args, { stdinInput, skipHandleError: true });
};

/**
 * Inside the container: MySQL as root with the root password the container started with, and Postgres over the
 * socket, which the image trusts, as a superuser the data has. Passwords travel on stdin, not in arguments.
 */
const createIdentity = async ({
  config,
  containerName,
  recorded,
  run
}: {
  config: LocalResourceConfig;
  containerName: string;
  recorded?: LocalDataIdentity;
  run: RunInContainer;
}) => {
  const identity = {
    dbName: config.dbName!,
    username: config.credentials!.username,
    password: config.credentials!.password
  };
  if (config.type === 'postgres') {
    // The user the data was created with is a superuser; data from before the record most likely has `postgres`.
    const superusers = [...new Set([recorded?.username, identity.username, 'postgres'].filter(Boolean))] as string[];
    let lastError: unknown;
    for (const superuser of superusers) {
      try {
        const psql = ['psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', superuser, '-d', 'postgres'];
        await run(['exec', '-i', containerName, ...psql], postgresIdentitySql(identity));
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
  // MariaDB 11 images ship the client as `mariadb` only.
  const client = 'client=$(command -v mariadb || command -v mysql); MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec "$client"';
  await run(['exec', '-i', containerName, 'sh', '-c', `${client} -h127.0.0.1 -uroot`], mysqlIdentitySql(identity));
};

const describeIdentity = ({ dbName, username }: LocalDataIdentity) => `database "${dbName}" and user "${username}"`;

/**
 * Makes a running local Postgres or MySQL serve the configured database and user. Data initialized in this session
 * already does. On data recorded for another database or user, or created before the record existed, it creates them
 * in the container. When that fails, the error says what the data was created for and how to recreate it.
 */
export const reconcileLocalDataIdentity = async ({
  config,
  containerName,
  identityFile,
  hadData,
  run = runInContainer
}: {
  config: LocalResourceConfig;
  containerName: string;
  identityFile: string;
  /** Whether the data directory held data before the container started. */
  hadData: boolean;
  run?: RunInContainer;
}): Promise<'recorded' | 'unchanged' | 'created'> => {
  const wanted = { dbName: config.dbName!, username: config.credentials!.username };
  const recorded = readLocalDataIdentity(identityFile);
  if (recorded?.dbName === wanted.dbName && recorded.username === wanted.username) return 'unchanged';
  if (!hadData) {
    writeLocalDataIdentity(identityFile, wanted);
    return 'recorded';
  }
  try {
    await createIdentity({ config, containerName, recorded, run });
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n').find((line) => line.trim()) : undefined;
    const createdFor = recorded
      ? `was created for ${describeIdentity(recorded)}`
      : `has no ${describeIdentity(wanted)}`;
    throw new Error(
      `The local data of "${config.name}" ${createdFor}, and creating ${describeIdentity(wanted)} in it failed` +
        `${reason ? ` (${reason.trim()})` : ''}. Start with freshDb (--fresh-db) to recreate it; this deletes its local data.`
    );
  }
  writeLocalDataIdentity(identityFile, wanted);
  return 'created';
};
