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
  'topic',
  'amqp',
  'search',
  'email',
  'kafka'
]);

export type DependencyKind = z.infer<typeof dependencyKindSchema>;

/**
 * Where a connection string proves the application points today.
 *
 * Derived by a probe from the *values* in environment files — a host ending in `supabase.co` is a
 * Supabase database — and the probe emits only this enum. A checked-in deployment manifest never
 * supplies this field: it proves what somebody intended to create, not that the resource exists.
 * The value itself never leaves the probe.
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

/** What kind of evidence established the dependency declaration or hosting claim. */
export const dependencyHostingEvidenceSchema = z.enum(['connection-string', 'deployment-manifest']);
export type DependencyHostingEvidence = z.infer<typeof dependencyHostingEvidenceSchema>;

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
    topic: 'notificationsTopic',
    amqp: 'messageBroker',
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
  /**
   * A connection string proves where the application points today. An IaC/PaaS declaration only
   * proves intent: it may be production, a preview, or a stack nobody has deployed yet. Static
   * declarations carry this evidence grade without `currentlyHostedOn`, so they can contribute
   * topology and sizing without making a false live-resource claim.
   */
  hostingEvidence: dependencyHostingEvidenceSchema.optional(),
  /**
   * Concrete sizing an existing infrastructure declaration states, carried as a hint.
   *
   * An imported Terraform `instance_class` or SST `instance` is the one sizing signal better than
   * our mode profiles: it is what the user explicitly chose for that declared environment. The
   * composer applies it only when the value fits the target field's own namespace (`db.*`,
   * `cache.*`), so a foreign or mistyped value degrades to the profile default rather than a failed
   * deploy.
   */
  sizeHint: z
    .object({
      /** Instance class in the provider's own vocabulary, e.g. `db.t4g.small` or `cache.m6g.large`. */
      instance: z.string().min(1).optional(),
      storageGb: z.number().int().positive().optional()
    })
    .optional(),
  evidence: z.array(citationSchema).default([]),
  source: factSourceSchema
});

export type DependencyFact = z.infer<typeof dependencyFactSchema>;
