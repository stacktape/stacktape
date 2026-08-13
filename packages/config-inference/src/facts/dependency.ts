/**
 * Backing services the application talks to.
 *
 * These are *instances*, not categories. A repository with a primary database and a separate
 * analytics database has two entries, because they become two pieces of infrastructure with
 * different sizes and different costs. Modelling them as one "postgres" fact was the shape that
 * made the first version of this pipeline unable to describe perfectly ordinary applications.
 */

import { z } from 'zod';
import { citationSchema, factSourceSchema } from './citation';

export const dependencyKindSchema = z.enum([
  'postgres',
  'mysql',
  'mssql',
  'mongodb',
  'sqlite',
  'redis',
  'object-storage',
  'dynamodb',
  'queue',
  'search',
  'email',
  'kafka'
]);

export type DependencyKind = z.infer<typeof dependencyKindSchema>;

/**
 * Where the data lives today.
 *
 * Derived by a probe from the *values* in environment files — a host ending in `supabase.co` is a
 * Supabase database — and the probe emits only this enum. The value itself never leaves the probe,
 * so the agent still never sees a connection string while we still capture the one thing that
 * matters about it: whether something is already running that we must not disturb.
 */
export const dependencyHostingSchema = z.enum([
  'supabase',
  'neon',
  'planetscale',
  'railway',
  'render',
  'heroku',
  'upstash',
  'mongodb-atlas',
  'aws',
  'self-hosted',
  'local',
  'unknown'
]);

export type DependencyHosting = z.infer<typeof dependencyHostingSchema>;

/**
 * The name a dependency of this kind gets when nothing else names it.
 *
 * These become resource names in the generated configuration, so they are chosen to read well in a
 * config file: `mainDatabase`, not `postgres-1`. Every probe needs the same answer, and two probes
 * disagreeing would produce two resources for one database.
 */
export const defaultDependencyName = (kind: DependencyKind): string =>
  ({
    postgres: 'mainDatabase',
    mysql: 'mainDatabase',
    mssql: 'mainDatabase',
    mongodb: 'mainDatabase',
    sqlite: 'localDatabase',
    redis: 'cache',
    'object-storage': 'storageBucket',
    dynamodb: 'mainTable',
    queue: 'jobQueue',
    search: 'searchIndex',
    email: 'mailer',
    kafka: 'eventStream'
  })[kind];

export const dependencyFactSchema = z.object({
  /**
   * Identifier for this instance within the analysis.
   *
   * Becomes the basis of the resource name in the generated configuration, so it is chosen to read
   * well in a config file: `mainDatabase`, not `postgres-1`.
   */
  name: z.string().min(1),
  kind: dependencyKindSchema,
  /**
   * Engine version, when the repository states one.
   *
   * Worth carrying because it is occasionally load-bearing: a compose file pinning Postgres 15 and
   * a migration using a 16-only feature are a deploy-time failure we can see coming.
   */
  engineVersion: z.string().min(1).optional(),
  /**
   * Engine extensions the application depends on, such as `pgvector` or `postgis`.
   *
   * These constrain which managed configurations are valid at all, so missing one produces a
   * database that provisions successfully and then fails the first migration.
   */
  extensions: z.array(z.string().min(1)).default([]),
  /** Names of services that use this dependency. */
  consumedBy: z.array(z.string().min(1)).default([]),
  /**
   * Environment variables that carry the address of this dependency, by name only.
   *
   * Load-bearing when we decide not to create the dependency: a live Supabase database is left
   * alone, so nothing injects `DATABASE_URL`, and without this the composer has no way to know which
   * variable the application will look for. Names only — the value is never carried anywhere.
   */
  addressedBy: z.array(z.string().min(1)).default([]),
  currentlyHostedOn: dependencyHostingSchema.optional(),
  evidence: z.array(citationSchema).default([]),
  source: factSourceSchema
});

export type DependencyFact = z.infer<typeof dependencyFactSchema>;
