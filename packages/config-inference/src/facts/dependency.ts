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
  'kafka',
  'nats',
  'event-bus',
  'websocket-api',
  'state-machine',
  'user-pool'
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
    kafka: 'eventStream',
    nats: 'eventBroker',
    'event-bus': 'eventBus',
    'websocket-api': 'websocketApi',
    'state-machine': 'stateMachine',
    'user-pool': 'userPool'
  })[kind];

const RESOURCE_NAME_SUFFIXES: ReadonlyArray<{ pattern: RegExp; kind: DependencyKind }> = [
  { pattern: /(?:^|_)BUCKET(?:_NAME|_ARN)?$/, kind: 'object-storage' },
  { pattern: /(?:^|_)TOPIC(?:_NAME|_ARN)?$/, kind: 'topic' },
  { pattern: /(?:^|_)QUEUE(?:_NAME|_URL|_ARN)?$/, kind: 'queue' },
  { pattern: /(?:^|_)TABLE(?:_NAME|_ARN)?$/, kind: 'dynamodb' },
  { pattern: /(?:^|_)EVENT_?BUS(?:_NAME|_ARN)?$/, kind: 'event-bus' },
  { pattern: /(?:^|_)(?:WS|WEBSOCKET)(?:_[A-Z]+)?_(?:URL|ENDPOINT)$/, kind: 'websocket-api' }
];

/**
 * The kind of resource an application names in a variable: `UPLOAD_BUCKET`, `ORDER_EVENTS_TOPIC_ARN`, `JOBS_QUEUE_URL`,
 * `EVENT_BUS_NAME`, `WS_MANAGEMENT_URL`.
 */
export const resourceKindNamedBy = (variableName: string): DependencyKind | undefined =>
  RESOURCE_NAME_SUFFIXES.find((entry) => entry.pattern.test(variableName))?.kind;

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
  /**
   * Delivery guarantees a deployment manifest declares for a queue. A FIFO queue keeps message order and drops
   * duplicates; replacing it with a standard queue changes both without any error.
   */
  /**
   * Whether a Cognito user pool the code signs users in to is the project's own. `project` when the project also
   * consumes the pool's tokens (a handler reading JWT authorizer claims, a token verifier): init then creates it.
   * `unproven` when the code only signs in against a client ID it reads, which an existing pool can just as well own.
   */
  userPoolOwnership: z.enum(['project', 'unproven']).optional(),
  /** A MySQL-compatible database a deployment manifest declares as MariaDB, which a MySQL engine does not replace. */
  mysqlEngine: z.literal('mariadb').optional(),
  /** The code calls `SignUp`: the pool has to let users create their own accounts. */
  userPoolSelfSignUp: z.literal(true).optional(),
  queueSettings: z
    .object({
      fifo: z.literal(true).optional(),
      contentBasedDeduplication: z.literal(true).optional(),
      visibilityTimeoutSeconds: z.number().int().min(0).max(43200).optional()
    })
    .optional(),
  /**
   * The key a DynamoDB table's items are addressed by, read from the code's own requests (`Key: { id }`,
   * `KeyConditionExpression: 'id = :id'`). A table created with another key rejects every one of them.
   */
  itemKey: z.object({ partitionKey: z.string().min(1), sortKey: z.string().min(1).optional() }).optional(),
  /**
   * The attributes of the items the code writes to a DynamoDB table (`Item: { id, expiresAt }`), when no request says
   * which of them is the key. One of them has to be, or the table rejects every write.
   */
  writtenItemAttributes: z.array(z.string().min(1)).min(1).optional(),
  /**
   * The services a state machine runs as its Task states, in order, when the code makes the order clear: the input
   * the code starts an execution with is what the first one reads, and each one's result is what the next one reads.
   */
  workflowSteps: z.array(z.string().min(1)).min(1).optional(),
  /**
   * The README line that mentions a topic fanning out to queues, and the queue names on it, for a queue several functions
   * consume. Prose is too weak to rearrange queues on (it can just as well say the opposite); the gap names it.
   */
  fanoutHint: z
    .object({
      file: z.string().min(1),
      line: z.number().int().positive(),
      queues: z.array(z.string().regex(/^[A-Za-z0-9_-]+$/)).min(1)
    })
    .optional(),
  evidence: z.array(citationSchema).default([]),
  source: factSourceSchema
});

export type DependencyFact = z.infer<typeof dependencyFactSchema>;
