/**
 * Which resource parameter an application's own variable name is asking for.
 *
 * `connectTo` grants the access and injects `STP_*`-prefixed values, but an application reads the
 * names it was written with — `DATABASE_URL`, `REDIS_HOST`, `S3_BUCKET`. Leaving those unset
 * deploys infrastructure that exists next to an application that cannot reach it, which is the
 * worst first impression this product can make. So a variable that names a dependency we are
 * creating gets an explicit `$ResourceParam(...)` with the application's own name.
 *
 * The parameter names here are the ones the CLI's stack-overview resolvers actually publish
 * (`resource-resolvers/*`): `connectionString`/`host`/`port`/`dbName`/`jdbcConnectionString` for
 * databases, `connectionString`/`host`/`port` for Redis, `name`/`arn` for buckets and tables,
 * `url`/`name`/`arn` for queues, `arn`/`name` for topics, `connectionString` for Atlas,
 * `domainEndpoint` for OpenSearch. Inventing a parameter name here fails at deploy time, so add
 * one only after reading the resolver that publishes it.
 */

import type { DependencyKind } from '../facts/dependency';

export type EnvironmentWiring =
  | { kind: 'param'; param: string }
  /** The generated database password secret — the same one the database resource itself uses. */
  | { kind: 'password-secret' }
  /** Recognized, and deliberately left unwired: the platform default is the honest answer. */
  | { kind: 'none' };

const RDS_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql']);
const CONNECTION_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'redis', 'mongodb']);

/**
 * The parameter a bare, shapeless name resolves to — the dependency's primary handle.
 *
 * A variable that reached this point is proven to address the dependency (it appeared in an
 * environment file for it, or matched its kind's naming pattern), so leaving it unwired is a worse
 * default than the one value every client library for that kind accepts.
 */
const PRIMARY_HANDLE: Partial<Record<DependencyKind, string>> = {
  postgres: 'connectionString',
  mysql: 'connectionString',
  mssql: 'connectionString',
  redis: 'connectionString',
  mongodb: 'connectionString',
  queue: 'url',
  'object-storage': 'name',
  dynamodb: 'name',
  topic: 'name',
  search: 'domainEndpoint'
};

/**
 * Resolve one variable name against one dependency kind.
 *
 * Shape rules run most-specific first, because the names overlap: `POSTGRES_JDBC_URL` contains
 * `URL`, `DATABASE_URL` contains `DATABASE`, and only the ordering keeps each landing on the
 * parameter it means.
 */
export const wiringFor = (kind: DependencyKind, variableName: string): EnvironmentWiring => {
  const name = variableName.toUpperCase();

  if (/PASSWORD|PASSWD/.test(name)) {
    // Only RDS databases get a generated password secret; everything else has no password of ours
    // to hand out, and a wrong guess here would put a connection string where a password belongs.
    return RDS_KINDS.has(kind) ? { kind: 'password-secret' } : { kind: 'none' };
  }
  if (/USER(NAME)?$/.test(name)) return { kind: 'none' };
  if (/JDBC/.test(name))
    return RDS_KINDS.has(kind) ? { kind: 'param', param: 'jdbcConnectionString' } : { kind: 'none' };
  if (/(URL|URI|DSN|CONNECTION_?STRING)$/.test(name)) {
    if (CONNECTION_KINDS.has(kind)) return { kind: 'param', param: 'connectionString' };
    if (kind === 'queue') return { kind: 'param', param: 'url' };
    if (kind === 'search') return { kind: 'param', param: 'domainEndpoint' };
    return { kind: 'none' };
  }
  if (/HOST(NAME)?$/.test(name)) {
    if (RDS_KINDS.has(kind) || kind === 'redis') return { kind: 'param', param: 'host' };
    if (kind === 'search') return { kind: 'param', param: 'domainEndpoint' };
    return { kind: 'none' };
  }
  if (name.endsWith('PORT')) {
    return RDS_KINDS.has(kind) || kind === 'redis' ? { kind: 'param', param: 'port' } : { kind: 'none' };
  }
  // `REDIS_DB` is a numeric database index, not a name we can supply.
  if (kind === 'redis' && /(_DB|_DB_INDEX)$/.test(name)) return { kind: 'none' };
  if (/(DB_?NAME|DATABASE|SCHEMA|_DB)$/.test(name)) {
    return RDS_KINDS.has(kind) ? { kind: 'param', param: 'dbName' } : { kind: 'none' };
  }
  if (name.endsWith('ARN')) {
    return kind === 'queue' || kind === 'topic' || kind === 'dynamodb' || kind === 'object-storage' || kind === 'search'
      ? { kind: 'param', param: 'arn' }
      : { kind: 'none' };
  }
  if (/(NAME|BUCKET|TABLE|TOPIC|QUEUE)$/.test(name)) {
    return kind === 'object-storage' || kind === 'dynamodb' || kind === 'topic' || kind === 'queue'
      ? { kind: 'param', param: 'name' }
      : { kind: 'none' };
  }
  if (name.endsWith('ENDPOINT')) {
    return kind === 'search' ? { kind: 'param', param: 'domainEndpoint' } : { kind: 'none' };
  }

  const primary = PRIMARY_HANDLE[kind];
  return primary === undefined ? { kind: 'none' } : { kind: 'param', param: primary };
};

/**
 * A variable name reduced to what may appear inside a `$Secret('…')` directive.
 *
 * Variable names can come from an agent that read untrusted repository content, and these strings
 * are interpolated into directive syntax — a name containing `')` would break out of the argument.
 * Lowercase alphanumerics, underscore, dot and dash survive; a name with nothing left is not a
 * name we can mint a secret for.
 */
export const secretNameFor = (variableName: string): string | undefined => {
  const safe = variableName.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return safe.length === 0 ? undefined : safe;
};

/**
 * Reference the JSON `password` key in a project-scoped generated database secret.
 *
 * `$Secret()` reserves the first dot as its secret-name/key separator, so a shape such as
 * `project.mainDatabase.password` resolves secret `project`, key `mainDatabase`, and silently
 * ignores `password`. Keep the AWS secret name dot-free and use exactly one separator.
 */
export const generatedDatabasePasswordSecretReference = (
  projectName: string | undefined,
  resourceName: string
): string => `$Secret('${projectName === undefined ? resourceName : `${projectName}-${resourceName}`}.password')`;
