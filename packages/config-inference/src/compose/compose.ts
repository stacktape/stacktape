/**
 * Turning verified facts into a Stacktape configuration.
 *
 * Nothing here consults a model. Given the same facts this produces the same configuration, byte
 * for byte, which is what makes the pipeline's output a property of code we can test rather than of
 * whichever agent the user happened to have installed.
 *
 * Two habits run through it. Every resource records *why it exists*, so the wizard can point at the
 * line in the user's own repository that produced it. And anything that cannot be composed becomes
 * a stated gap rather than a silent omission — a configuration that is quietly missing a service is
 * far worse than one that says, in the file, that a service could not be worked out.
 */

import type { Citation } from '../facts/citation';
import { resourceKindNamedBy, type DependencyFact } from '../facts/dependency';
import { AWS_DEPLOYMENT_TOOLS, DEPLOYMENT_TOOL_LABELS } from '../facts/existing-deployment';
import type { PackageManager, ProjectFacts } from '../facts/project-facts';
import { posix } from 'node:path';
import { invokingDependencyName, UNROUTED_HTTP_SOURCE, type FunctionTrigger, type ServiceFact } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { resolveAssumptions, type Assumption } from './assumptions';
import { classifyService, type ServiceResourceType } from './classify';
import { resolveEngineVersion, type EngineVersionCatalogue } from './engine-versions';
import { generatedDatabasePasswordSecretReference, secretNameFor, wiringFor } from './env-wiring';
import { NO_SCHEDULE } from '../facts/apply-answer';
import { composeLocalScripts } from './local-scripts';
import { composeMigrationHooks } from './migrations';
import { monorepoPackaging } from './monorepo';
import { normalizeScheduleExpression } from './schedule';
import { MODE_PREFERENCES, MODE_PROFILES, type InfrastructureMode } from './modes';
import {
  defaultDeploymentPreferences,
  profileForPreferences,
  type DeploymentPreferences,
  type InfrastructureProfile
} from './preferences';

/**
 * A resource entry as Stacktape reads it.
 *
 * Deliberately structural rather than the imported `StacktapeConfig` type: the composer builds
 * these bottom-up, and threading the full discriminated union through construction buys nothing
 * that validating the finished document does not buy better.
 */
export type ComposedResource = {
  type: string;
  properties: Record<string, unknown>;
};

export type ComposedConfig = {
  projectName?: string;
  resources: Record<string, ComposedResource>;
  /** Deploy-time migration scripts referenced from `hooks`, and the project's own seed and migrate commands. */
  scripts?: Record<string, ComposedResource>;
  hooks?: { afterDeploy: Array<{ scriptName: string }> };
};

export type Provenance = {
  /** Why this resource exists, in the house voice, for the wizard and for a config comment. */
  reason: string;
  evidence: Citation[];
};

export type CompositionGap = {
  subject: string;
  /** What we could not do, phrased for the user rather than for a log. */
  message: string;
};

/** A setting the code reads with no fallback, which nothing in the configuration sets. */
export type UnsetSetting = {
  serviceName: string;
  /** The resource whose `environment` would set it. */
  resourceName: string;
  variableName: string;
  evidence: Citation[];
};

export type CompositionResult = {
  config: ComposedConfig;
  /** Keyed by resource name. */
  provenance: Record<string, Provenance>;
  gaps: CompositionGap[];
  /**
   * Settings the app may need to start, for the user to fill in before deploying.
   *
   * Kept apart from `gaps` because the page lists them by name, next to where the code reads them.
   * Without this, the first time anyone heard of them was a container exiting on AWS.
   */
  unsetSettings: UnsetSetting[];
  /**
   * Decisions taken on the user's behalf, with what else they could have been.
   *
   * Every open question ends up here rather than in front of the user. Carrying them is not
   * bookkeeping: an earlier version dropped them, which meant a claim the verifier had carefully
   * downgraded was composed into real infrastructure with no trace of the doubt that produced it.
   */
  assumptions: Assumption[];
  /**
   * Questions with no sensible default, left open.
   *
   * Normally empty. A kind that reaches here is one the interface must actually ask about, which is
   * the signal that it was worth interrupting someone for.
   */
  unresolved: Uncertainty[];
  /** The explicit cost, resilience, retention, and network choices used for this configuration. */
  preferences: DeploymentPreferences;
  /** The fact-aware defaults, kept stable while the user compares or changes a preference. */
  recommendedPreferences: DeploymentPreferences;
  /** @deprecated Present only when the caller used a legacy mode preset. */
  mode?: InfrastructureMode;
  /** Service name → the resource name it composed into, for walking from facts to config. */
  serviceResources: Record<string, string>;
  /** False only when there is nothing to deploy at all. */
  deployable: boolean;
};

/**
 * Hosting values that mean something is already serving real traffic.
 *
 * `local` is a developer's own machine and `unknown` is an absence of information; everything else
 * names a provider where the user's data is live right now.
 */
const EXTERNALLY_HOSTED: ReadonlySet<string> = new Set([
  'supabase',
  'neon',
  'planetscale',
  'railway',
  'render',
  'heroku',
  'upstash',
  'mongodb-atlas',
  'aws',
  'self-hosted'
]);

/** Existing resources the application can keep using through an address/credential secret. */
const POINTABLE_EXTERNAL_KINDS: ReadonlySet<DependencyFact['kind']> = new Set([
  'postgres',
  'mysql',
  'mssql',
  'mongodb',
  'redis',
  'amqp',
  'search',
  'kafka',
  'nats'
]);

/** Network services whose consumers must read an address, unlike IAM-only buckets/tables/queues. */
const ADDRESS_REQUIRED_KINDS: ReadonlySet<DependencyFact['kind']> = new Set([
  'postgres',
  'mysql',
  'mssql',
  'mongodb',
  'redis',
  'amqp',
  'search',
  'kafka',
  'nats'
]);

const DEPENDENCY_LABELS: Partial<Record<DependencyFact['kind'], string>> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  mongodb: 'MongoDB',
  redis: 'Redis',
  amqp: 'the message broker',
  search: 'the search service',
  kafka: 'Kafka',
  nats: 'NATS'
};

/** The resources a function can be invoked by and also write to. */
const SELF_TRIGGER_LABELS: Partial<Record<DependencyFact['kind'], string>> = {
  'object-storage': 'bucket',
  queue: 'queue',
  topic: 'topic',
  dynamodb: 'table',
  'event-bus': 'event bus'
};

type StreamType = Extract<FunctionTrigger, { type: 'dynamodb-stream' }>['streamType'];

/** The stream view a table needs so every handler on its stream gets the images it reads. */
const streamTypeFor = (dependencyName: string, services: readonly ServiceFact[]): StreamType | undefined => {
  const types = new Set(
    services.flatMap((service) =>
      service.functionTriggers.flatMap((trigger) =>
        trigger.type === 'dynamodb-stream' && trigger.dependencyName === dependencyName ? [trigger.streamType] : []
      )
    )
  );
  if (types.size === 0) return undefined;
  return types.size === 1 ? [...types][0] : 'NEW_AND_OLD_IMAGES';
};

const dependencyLabel = (kind: DependencyFact['kind']): string => DEPENDENCY_LABELS[kind] ?? kind;

/**
 * Where a SQLite file lives for each answer to the SQLite decision.
 *
 * A container's own disk is replaced on every deploy and restart. `persistent-volume` mounts one EFS
 * filesystem at this directory in every service that uses the file; `accept-ephemeral` keeps the
 * file on the container's disk. Moving the data to a managed database is not offered: every SQLite
 * driver and Prisma schema we have seen needs code changes for that, which a configuration cannot make.
 */
const SQLITE_DIRECTORIES = {
  'persistent-volume': '/data',
  'accept-ephemeral': '/tmp'
} as const;
type SqliteChoice = keyof typeof SQLITE_DIRECTORIES;

/** Variables a web app reads for its own public address, wired to the URL Stacktape gives it. */
const SELF_URL_VARIABLE = /^(?:APP|APPLICATION|SITE|NEXTAUTH|BASE|PUBLIC)_URL$/i;

/**
 * Variables that are not the app's own settings: test runners, CI, the platforms a project came from,
 * and what the runtime or Stacktape sets. Reported as unset, they would bury the real ones.
 */
const TOOLING_VARIABLE =
  /^(?:CI|NODE_ENV|PORT|HOST|HOSTNAME|PWD|HOME|TZ|DEBUG|VITEST|JEST_WORKER_ID|GITHUB_ACTIONS|AWS_REGION|AWS_DEFAULT_REGION|K_SERVICE|DYNO|(?:PLAYWRIGHT|CYPRESS|FLY|RENDER|VERCEL|NETLIFY|RAILWAY|HEROKU|AWS_LAMBDA|STP|STACKTAPE)_\w+|RENDER|VERCEL|NETLIFY)$/;

/** Files that run while building or testing, never in the deployed app. */
const TOOLING_FILE =
  /(?:^|\/)(?:(?:vite|vitest|playwright|jest|cypress|webpack|rollup|tsup|eslint|prettier|tailwind|postcss|babel|react-router|remix|drizzle|knip|commitlint)\.config\.[cm]?[jt]s|[\w.-]+[._](?:test|spec)\.\w+|[\w-]+_test\.go|tests?\/|__tests__\/|e2e\/|remix\.init\/|scripts\/)/;

/** A variable only tests, build tools or another platform read: never a setting or secret the deployed app needs. */
const isToolingVariable = (variable: { name: string; evidence: readonly Citation[] }): boolean =>
  TOOLING_VARIABLE.test(variable.name) ||
  (variable.evidence.length > 0 && variable.evidence.every((citation) => TOOLING_FILE.test(citation.file)));

/** Resource types that can mount an EFS volume and be held to a single running copy. */
const VOLUME_RESOURCE_TYPES: ReadonlySet<ServiceResourceType> = new Set([
  'web-service',
  'worker-service',
  'private-service'
]);

/**
 * The value for a variable that tells the app where its SQLite file is.
 *
 * A `*_URL`-style variable is a connection string whose scheme depends on the driver: Prisma and
 * libsql read `file:`, SQLAlchemy, dj-database-url and Doctrine read `sqlite:///` followed by an
 * absolute path, Rails reads `sqlite3:`, JDBC reads `jdbc:sqlite:`. Any other name is taken to hold a plain path.
 */
const sqliteVariableValue = (variableName: string, language: string | undefined, filePath: string): string => {
  if (!/(?:URL|URI|DSN)$/i.test(variableName)) return filePath;
  if (language === 'python' || language === 'php') return `sqlite:///${filePath}`;
  if (language === 'ruby') return `sqlite3:${filePath}`;
  if (language === 'java') return `jdbc:sqlite:${filePath}`;
  return `file:${filePath}`;
};

const RDS_ENGINE_TYPES: Partial<Record<DependencyFact['kind'], string>> = {
  postgres: 'postgres',
  mysql: 'mysql',
  mssql: 'sqlserver-ex'
};

/**
 * Secret reference for a generated database password, kept out of the configuration file itself.
 *
 * Scoped by project, because Secrets Manager names are account-wide: two projects initialised into
 * one account would otherwise share a single `mainDatabase.password`, quietly coupling their
 * databases and breaking one when the other is cleaned up.
 */
const secretReference = generatedDatabasePasswordSecretReference;

/** Node majors and Python versions the buildpack schema accepts. Anything else is left unpinned. */
const SUPPORTED_NODE_MAJORS: ReadonlySet<number> = new Set([16, 17, 18, 19, 20, 21, 22, 23, 24]);

/**
 * Pin the buildpack runtime to the version the repository declares, when the schema can take it.
 *
 * A declared engine that silently builds on a different major is a first-deploy failure with a
 * confusing face — the build worked locally on Node 22 and fails in the buildpack's default. Only
 * exact schema-supported values are emitted; `>=18` and `3.10` (absent from the schema's union)
 * stay unpinned rather than mis-pinned.
 */
const runtimeVersionConfig = (service: ServiceFact): Record<string, unknown> => {
  if (service.runtimeVersion === undefined) return {};
  if (service.language === 'javascript' || service.language === 'typescript') {
    const major = Number.parseInt(service.runtimeVersion, 10);
    return SUPPORTED_NODE_MAJORS.has(major) ? { nodeVersion: major } : {};
  }
  return {};
};

const JS_ENTRY_FILE = /\.(m?[jt]sx?|cjs)$/;

/**
 * The start command for a Python entry point Railpack cannot know: the scan found the ASGI or WSGI application
 * object (`app/main.py:app`), Railpack only knows the framework. Django needs nothing: Railpack finds its WSGI module.
 */
const pythonStartCommand = (service: ServiceFact): string | undefined => {
  const entry = service.containerEntrypoint;
  if (entry === undefined) return undefined;
  const match = entry.match(/^(.+)\.py(?::([A-Za-z_]\w*))?$/);
  if (!match) return undefined;
  const buildRoot = service.buildRoot ?? service.path;
  const modulePath = posix.relative(buildRoot === '.' ? '' : buildRoot, match[1]!).replace(/^\.\//, '');
  const target = `${modulePath.split('/').join('.')}:${match[2] ?? 'app'}`;
  if (service.framework === 'fastapi' || service.framework === 'starlette') {
    return `uvicorn ${target} --host 0.0.0.0 --port $PORT`;
  }
  if (service.framework === 'flask') {
    return `gunicorn --bind 0.0.0.0:$PORT ${target}`;
  }
  return undefined;
};

/** Shell operators that make a start command need a shell rather than the image's exec form. */
const NEEDS_SHELL = /[&|;<>$`'"\\()]/;

/** A Procfile line as a container command: exec form when it is plain words, a shell otherwise. */
const containerCommand = (startCommand: string): string[] =>
  NEEDS_SHELL.test(startCommand) ? ['sh', '-c', startCommand] : startCommand.trim().split(/\s+/);

const packagingFor = (
  service: ServiceFact,
  packageManager: PackageManager | undefined,
  siblingDockerfile?: Pick<ServiceFact, 'dockerfile' | 'buildRoot' | 'path'>
): Record<string, unknown> => {
  const buildRoot = service.buildRoot ?? service.path;
  if (service.containerImage !== undefined) {
    // The manifest runs a published image; there is no source to build.
    return { type: 'prebuilt-image', properties: { image: service.containerImage } };
  }
  if (service.dockerfile === undefined && siblingDockerfile?.dockerfile !== undefined) {
    // A Procfile worker beside a web process with a Dockerfile is the same application started differently. The
    // image that already builds the web process runs it; a second buildpack build of a Rails app with native gems
    // is the thing most likely to fail.
    const sibling = packagingFor({ ...siblingDockerfile, containerImage: undefined } as ServiceFact, packageManager);
    return service.startCommand === undefined
      ? sibling
      : {
          ...sibling,
          properties: {
            ...(sibling.properties as Record<string, unknown>),
            command: containerCommand(service.startCommand)
          }
        };
  }
  if (service.dockerfile !== undefined) {
    // Their Dockerfile is the most faithful description of how this runs that exists. Use it.
    return {
      type: 'dockerfile',
      properties: {
        buildContextPath: buildRoot,
        // Facts keep repository-relative evidence paths; Stacktape expects this one relative to the
        // build context.
        dockerfilePath: buildRoot === '.' ? service.dockerfile : posix.relative(buildRoot, service.dockerfile)
      }
    };
  }
  if (service.containerEntrypoint !== undefined && JS_ENTRY_FILE.test(service.containerEntrypoint)) {
    // A known JavaScript entry file: Stacktape bundles it, which is smaller and faster than a project build.
    return {
      type: 'js-bundle',
      properties: {
        entryfilePath: service.containerEntrypoint,
        ...(service.javascriptRuntime === undefined
          ? runtimeVersionConfig(service)
          : { runtime: service.javascriptRuntime })
      }
    };
  }
  // A workspace member that imports internal packages must be installed and built from the root,
  // or its `workspace:*` specifiers fail before the first resource exists.
  const monorepo = monorepoPackaging(service, packageManager);
  if (monorepo !== undefined) return monorepo.packaging;
  // Railpack detects the language and builds without anyone writing a Dockerfile, which is the
  // whole promise for a user who does not want to learn containers.
  const startCommand = service.startCommand ?? pythonStartCommand(service);
  // Railpack builds Java with JDK 21 unless told otherwise; a Gradle toolchain or Maven release pinned to another
  // version fails the build, so the declared version travels along.
  const javaVersion =
    service.language === 'java' && service.runtimeVersion !== undefined ? service.runtimeVersion : undefined;
  return {
    type: 'buildpack',
    properties: {
      sourceDirectoryPath: buildRoot,
      ...(startCommand === undefined ? {} : { startCommand }),
      ...(javaVersion === undefined ? {} : { packages: { java: javaVersion } })
    }
  };
};

/**
 * Environment variables to write into the configuration.
 *
 * Only the ones we can answer. Values that come from a resource we are creating arrive
 * automatically through `connectTo`, so restating them would be noise that drifts; values only the
 * user holds become secret references rather than placeholders, so the file is always coherent and
 * the missing piece is tracked as a task instead of a `TODO` nobody notices.
 *
 * `connectTo` only supplies a variable when the resource on the other end is one we are creating.
 * The default answer for a live Supabase or Neon database is to leave it alone — at which point
 * nothing creates it, `connectTo` has nothing to name, and skipping the variable would deploy a
 * container with no `DATABASE_URL` at all. Those become secret references too: the connection string
 * is the user's, we never read or keep it, and the file stays coherent either way.
 */
const environmentFor = (
  service: ServiceFact,
  context: {
    serviceResourceNames: ReadonlyMap<string, string>;
    /** Dependencies we are creating: fact name → its kind and the resource name it composed into. */
    composedDependencies: ReadonlyMap<string, { kind: DependencyFact['kind']; resourceName: string }>;
    /** Where each SQLite dependency's file is, by dependency name. */
    sqliteFiles: ReadonlyMap<string, string>;
    projectName: string | undefined;
  }
): Array<{ name: string; value: unknown }> => {
  const { serviceResourceNames, composedDependencies, sqliteFiles, projectName } = context;
  const variables: Array<{ name: string; value: unknown }> = [];

  for (const variable of service.environmentVariables) {
    if (variable.role === 'infra-dependency') {
      if (variable.dependencyName === undefined) continue;
      const composed = composedDependencies.get(variable.dependencyName);
      const sqliteFile = sqliteFiles.get(variable.dependencyName);
      if (sqliteFile !== undefined) {
        variables.push({
          name: variable.name,
          value: sqliteVariableValue(variable.name, service.language, sqliteFile)
        });
        continue;
      }
      if (composed === undefined) {
        const secretName = secretNameFor(variable.name);
        if (secretName !== undefined) {
          variables.push({
            name: variable.name,
            value: `$Secret('${secretName}')`
          });
        }
        continue;
      }
      // Code that already reads `connectTo`'s own `STP_<RESOURCE>_<PARAM>` name gets it from `connectTo`; the scan
      // named the resource after it.
      if (variable.name.startsWith('STP_')) continue;
      // `connectTo` grants the access, but it injects `STP_*`-prefixed values — the application
      // reads the name it was written with, so that name gets the parameter explicitly.
      const wiring = wiringFor(composed.kind, variable.name);
      if (wiring.kind === 'param') {
        variables.push({
          name: variable.name,
          value: `$ResourceParam('${composed.resourceName}', '${wiring.param}')`
        });
      } else if (wiring.kind === 'password-secret') {
        variables.push({
          name: variable.name,
          value: secretReference(projectName, composed.resourceName)
        });
      }
      continue;
    }
    if (variable.role === 'third-party-secret') {
      // A token only a test or build tool reads would make the deploy stop on a secret the app never uses.
      if (!variable.required || isToolingVariable(variable)) continue;
      const secretName = secretNameFor(variable.name);
      if (secretName !== undefined) {
        variables.push({
          name: variable.name,
          value: `$Secret('${secretName}')`
        });
      }
      continue;
    }
    if (variable.role === 'runtime-config' && service.exposesHttp && SELF_URL_VARIABLE.test(variable.name)) {
      const self = serviceResourceNames.get(service.name);
      if (self !== undefined)
        variables.push({
          name: variable.name,
          value: `$ResourceParam('${self}', 'url')`
        });
      continue;
    }
    if (variable.role === 'runtime-config' && variable.hasDeclaredValue) {
      if (!variable.required) continue;
      if (variable.safeLiteralValue !== undefined) {
        variables.push({
          name: variable.name,
          value: variable.safeLiteralValue
        });
        continue;
      }
      const secretName = secretNameFor(variable.name);
      if (secretName !== undefined) {
        variables.push({
          name: variable.name,
          value: `$Secret('${secretName}')`
        });
      }
      continue;
    }
    if (variable.role === 'cross-service-reference' && variable.targetServiceName !== undefined) {
      // Render can inject a bare host, a port, or `host:port`. A Stacktape web-service exposes a
      // complete URL; substituting that for one of those narrower shapes produces a valid-looking
      // config and a broken application. Preserve only semantically equivalent URL references and
      // turn every other shape into an explicit review item below.
      if (variable.targetServiceProperty !== undefined && variable.targetServiceProperty !== 'url') {
        continue;
      }
      const target = serviceResourceNames.get(variable.targetServiceName);
      if (target !== undefined) {
        variables.push({
          name: variable.name,
          value: `$ResourceParam('${target}', 'url')`
        });
      }
      continue;
    }
    if (variable.role === 'build-time') {
      // Recorded so the user can see it was noticed; the value has to exist at build time, which is
      // a different mechanism, so it is raised as a gap rather than silently written here.
      continue;
    }
  }

  return variables;
};

/** A workflow with nothing to run, for the user to fill in: init never invents business logic. */
const PLACEHOLDER_DEFINITION = { StartAt: 'Start', States: { Start: { Type: 'Pass', End: true } } };

const stateName = (resourceName: string): string => resourceName.charAt(0).toUpperCase() + resourceName.slice(1);

/** Task states that run the functions in order, each through its ARN. */
const taskChain = (resourceNames: readonly string[]): Record<string, unknown> => ({
  StartAt: stateName(resourceNames[0]!),
  States: Object.fromEntries(
    resourceNames.map((resourceName, index) => [
      stateName(resourceName),
      {
        Type: 'Task',
        Resource: `$ResourceParam('${resourceName}', 'arn')`,
        ...(index === resourceNames.length - 1 ? { End: true } : { Next: stateName(resourceNames[index + 1]!) })
      }
    ])
  )
});

const composeDependency = (
  dependency: DependencyFact,
  profile: InfrastructureProfile,
  projectName: string | undefined,
  engineVersions: EngineVersionCatalogue | undefined,
  privateDatabase: boolean,
  /** Methods of presigned uploads a browser sends to this bucket; empty when none does. */
  browserUploadMethods: ReadonlyArray<'PUT' | 'POST'>,
  /** The stream a table needs for the handlers its stream invokes. */
  streamType: StreamType | undefined
): { resource: ComposedResource; reason: string } | { unsupported: string } => {
  const rdsEngine = RDS_ENGINE_TYPES[dependency.kind];
  if (rdsEngine !== undefined) {
    const resolved = resolveEngineVersion({
      engine: rdsEngine,
      ...(dependency.engineVersion === undefined ? {} : { pin: dependency.engineVersion }),
      ...(engineVersions === undefined ? {} : { catalogue: engineVersions })
    });
    return {
      resource: {
        type: 'relational-database',
        properties: {
          credentials: {
            masterUserName: 'stacktape',
            masterUserPassword: secretReference(projectName, dependency.name)
          },
          engine: {
            type: rdsEngine,
            properties: {
              primaryInstance: {
                // An imported declaration's own size beats the mode profile: it is what the user's
                // production runs on today. Only values in RDS's own namespace are trusted.
                instanceSize: dependency.sizeHint?.instance?.startsWith('db.')
                  ? dependency.sizeHint.instance
                  : profile.database.instanceSize,
                ...(profile.database.multiAz ? { multiAz: true } : {})
              },
              version: resolved.version
            }
          },
          deletionProtection: true,
          automatedBackupRetentionDays: profile.database.backupRetentionDays,
          ...(privateDatabase
            ? {
                accessibility: {
                  accessibilityMode: 'vpc',
                  forceDisablePublicIp: true
                }
              }
            : {}),
          alarms: [
            {
              description: 'Database has less than 2 GiB of free storage',
              trigger: {
                type: 'database-free-storage',
                properties: { thresholdMB: 2048 }
              },
              evaluation: {
                period: 300,
                evaluationPeriods: 3,
                breachedPeriods: 2
              },
              includeInHistory: true
            }
          ]
        }
      },
      reason: `Your code connects to a ${dependencyLabel(dependency.kind)} database.${
        resolved.movedOffPin
          ? ` Version ${dependency.engineVersion} is no longer offered on RDS, so ${resolved.version} is used instead.`
          : ''
      }${dependency.sizeHint?.instance?.startsWith('db.') === true ? ' Sized as your existing infrastructure declares.' : ''}`
    };
  }

  switch (dependency.kind) {
    case 'redis':
      return {
        resource: {
          type: 'redis-cluster',
          properties: {
            instanceSize: dependency.sizeHint?.instance?.startsWith('cache.')
              ? dependency.sizeHint.instance
              : profile.redis.instanceSize,
            defaultUserPassword: secretReference(projectName, dependency.name)
          }
        },
        reason: 'Your code connects to Redis.'
      };
    case 'object-storage':
      return {
        resource: {
          type: 'bucket',
          properties: {
            ...(profile.bucket.versioning ? { versioning: true } : {}),
            // The browser sends the presigned request to S3 itself, which S3 refuses cross-origin without CORS. Only
            // the methods the code presigns are allowed. The origin cannot name the frontend: in stacktape dev the
            // frontend runs locally and the dev stack cannot resolve its URL, and the URL's signature is what
            // authorizes the upload.
            ...(browserUploadMethods.length > 0
              ? {
                  cors: {
                    enabled: true,
                    corsRules: [
                      { allowedOrigins: ['*'], allowedMethods: [...browserUploadMethods], allowedHeaders: ['*'] }
                    ]
                  }
                }
              : {})
          }
        },
        reason: `Your code reads and writes object storage.${
          browserUploadMethods.length > 0
            ? ` Browsers upload to it with presigned URLs, so it accepts cross-origin ${browserUploadMethods.join(' and ')} requests.`
            : ''
        }`
      };
    case 'dynamodb':
      return {
        resource: {
          type: 'dynamo-db-table',
          properties: {
            primaryKey: {
              partitionKey: { name: dependency.itemKey?.partitionKey ?? 'pk', type: 'string' },
              ...(dependency.itemKey?.sortKey === undefined
                ? {}
                : { sortKey: { name: dependency.itemKey.sortKey, type: 'string' } })
            },
            ...(streamType === undefined ? {} : { streamType })
          }
        },
        reason: `Your code uses DynamoDB${dependency.itemKey === undefined ? '' : ` and addresses items by ${dependency.itemKey.partitionKey}`}.${
          streamType === undefined ? '' : ' A function reads its stream of changes.'
        }`
      };
    case 'event-bus':
      return {
        resource: { type: 'event-bus', properties: {} },
        reason: 'Your code publishes events that another of your functions handles.'
      };
    case 'websocket-api':
      return {
        resource: { type: 'websocket-api-gateway', properties: {} },
        reason: 'Your functions handle WebSocket connections and messages.'
      };
    case 'state-machine':
      return {
        // The states are written once the functions have their resource names; a placeholder until then.
        resource: { type: 'state-machine', properties: { definition: PLACEHOLDER_DEFINITION } },
        reason: 'Your code starts executions of a Step Functions workflow.'
      };
    case 'queue':
      return {
        resource: { type: 'sqs-queue', properties: {} },
        reason: 'Your code uses Amazon SQS.'
      };
    case 'topic':
      return {
        resource: { type: 'sns-topic', properties: {} },
        reason: 'Your code publishes to an SNS topic.'
      };
    case 'search':
      return {
        resource: { type: 'open-search-domain', properties: {} },
        reason: 'Your code queries a search index.'
      };
    case 'email':
      return {
        unsupported: 'Sending email uses SES, which is configured on your domain rather than created as a resource.'
      };
    case 'kafka':
      return {
        unsupported: 'Managed Kafka is not something Stacktape creates for you yet.'
      };
    case 'nats':
      return {
        unsupported:
          'Your app needs a NATS server, which Stacktape does not create. Use a hosted NATS service and give the app its address through the secret below.'
      };
    case 'amqp':
      return {
        unsupported:
          'Your app needs a RabbitMQ broker, which Stacktape does not create. Use a hosted one (Amazon MQ runs RabbitMQ) and give the app its URL through the secret below.'
      };
    case 'mongodb':
      return {
        // Atlas requires an explicit tier. M10 is its smallest dedicated tier and the conservative
        // default used throughout Stacktape's own MongoDB documentation; omitting it produces YAML
        // that the real config schema rejects before deployment starts.
        resource: {
          type: 'mongo-db-atlas-cluster',
          properties: { clusterTier: 'M10' }
        },
        reason: 'Your code connects to MongoDB.'
      };
    default:
      return {
        unsupported: `No Stacktape resource corresponds to ${dependency.kind}.`
      };
  }
};

/** Resource names must read well in a config file and be unique within it. */
const uniqueName = (preferred: string, taken: Set<string>): string => {
  const base = preferred
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  const start = /^[a-zA-Z]/.test(base) ? base : `app${base}`;
  if (!taken.has(start)) {
    taken.add(start);
    return start;
  }
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${start}${suffix}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
};

export const composeConfig = ({
  facts: input,
  projectName,
  mode,
  preferences: requestedPreferences,
  decisions = {},
  engineVersions
}: {
  facts: ProjectFacts;
  projectName?: string;
  /** Deprecated headless preset. New callers should send the independent preferences below. */
  mode?: InfrastructureMode;
  /** Explicit browser-wizard choices. These override a legacy mode when both are supplied. */
  preferences?: Partial<DeploymentPreferences>;
  /**
   * Decisions the user changed, keyed by assumption id.
   *
   * Applied instead of the recommendation. Facts are never edited: the same facts plus a different
   * decision map produce a different configuration, which is what keeps a changed mind reversible.
   */
  decisions?: Readonly<Record<string, string>>;
  /**
   * Database versions the deploy will accept, per engine. The CLI passes its bundled dataset — the
   * same one deploy-time validation reads — so composed versions are valid by construction.
   */
  engineVersions?: EngineVersionCatalogue;
}): CompositionResult => {
  // Every open question is answered here, before anything is composed. The result is a complete
  // configuration and a list of what was decided — not a half-configuration and a list of prompts.
  const { facts, assumptions } = resolveAssumptions(input, decisions);
  const recommendedPreferences = defaultDeploymentPreferences(facts);
  const preferences: DeploymentPreferences = {
    ...(mode === undefined ? recommendedPreferences : MODE_PREFERENCES[mode]),
    ...requestedPreferences
  };
  // A pure legacy preset retains its exact historical output (including production's 14-day
  // backup retention). As soon as an explicit preference is present, the independent choices are
  // the contract and derive the profile directly.
  const profile =
    mode !== undefined && requestedPreferences === undefined ? MODE_PROFILES[mode] : profileForPreferences(preferences);

  const resources: Record<string, ComposedResource> = {};
  const provenance: Record<string, Provenance> = {};
  const gaps: CompositionGap[] = [];
  const unsetSettings: UnsetSetting[] = [];
  const taken = new Set<string>();

  const dependencyResourceNames = new Map<string, string>();
  /** Dependency names we are actually creating, so a variable pointing at one we are not can say so. */
  const composedDependencyNames = new Set<string>();
  /** The same set with the kind and resource name attached, for wiring variables to parameters. */
  const composedDependencies = new Map<string, { kind: DependencyFact['kind']; resourceName: string }>();
  /** Newly composed RDS resources with no public address. External databases never enter this set. */
  const privateDatabaseResourceNames = new Set<string>();
  /** Variables a service needs because we decided *not* to create what they address, by service name. */
  const externalVariables = new Map<string, Array<{ name: string; value: unknown }>>();
  /** Where each SQLite dependency's file is, by dependency name. */
  const sqliteFiles = new Map<string, string>();
  /** The one disk every kept SQLite file shares, and the services that mount it. */
  let sqliteVolumeName: string | undefined;
  const sqliteVolumeServices = new Set<string>();
  // An agent reports a SQLite file as a question about a service, and the scan may report the same
  // file as a dependency. Both become one dependency, so the user sees one decision per file and the
  // answer always reaches the configuration.
  const agentSqliteFiles = new Map<string, { chosen: string; path: string }>();
  for (let index = assumptions.length - 1; index >= 0; index -= 1) {
    const assumption = assumptions[index]!;
    if (assumption.kind !== 'sqlite-persistence') continue;
    const { serviceName, paths } = assumption.parameters as { serviceName?: unknown; paths?: unknown };
    if (typeof serviceName === 'string') {
      agentSqliteFiles.set(serviceName, {
        chosen: assumption.chosen,
        path: Array.isArray(paths) && typeof paths[0] === 'string' ? paths[0] : ''
      });
    }
    assumptions.splice(index, 1);
  }
  const dependencies: DependencyFact[] = [
    ...facts.dependencies,
    ...[...agentSqliteFiles.keys()]
      .filter(
        (serviceName) =>
          !facts.dependencies.some(
            (dependency) => dependency.kind === 'sqlite' && dependency.consumedBy.includes(serviceName)
          )
      )
      .map(
        (serviceName): DependencyFact => ({
          name: `${serviceName}Sqlite`,
          kind: 'sqlite',
          extensions: [],
          consumedBy: [serviceName],
          addressedBy: [],
          evidence: [],
          source: 'agent'
        })
      )
  ];
  const unresolvedPulumiCompute =
    facts.services.length === 0 && facts.existingDeployments.some((deployment) => deployment.tool === 'pulumi');
  const hasFrontend = facts.services.some((service) => {
    const { resourceType } = classifyService(service);
    return resourceType === 'hosting-bucket' || resourceType.endsWith('-web');
  });
  for (const dependency of dependencies) {
    // SDK clients in a Pulumi program can identify S3/SQS/etc. without identifying the functions
    // that use them. Creating those weak, unconsumed findings alone leaves orphaned infrastructure
    // and a dangerously convincing success. Concrete Pulumi resource declarations carry
    // deployment-manifest evidence and remain importable.
    if (unresolvedPulumiCompute && dependency.consumedBy.length === 0 && dependency.hostingEvidence === undefined) {
      continue;
    }
    // A current endpoint or an existing infrastructure declaration may already own this data.
    // Creating a replacement is the one outcome the user was promised would not happen silently.
    if (dependency.currentlyHostedOn !== undefined && EXTERNALLY_HOSTED.has(dependency.currentlyHostedOn)) {
      const decisionId = `external-database:${dependency.name}`;
      // A declaration is not proof of a deployed resource, but treating possible production as
      // empty is the dangerous direction. Keep it by default and say exactly how strong the evidence
      // was; a never-deployed declaration is one click away from `create-new`.
      const pointable = POINTABLE_EXTERNAL_KINDS.has(dependency.kind);
      const recommended = pointable ? 'point-at-existing' : 'create-new';
      const requested = decisions[decisionId];
      // A queue/topic/bucket/table trigger needs a concrete resource identity. Until the facts can
      // carry and the config can bind an external ARN/name, offering "use existing" would silently
      // remove the event from the generated function. Keep the only honest option instead of
      // accepting a crafted/stale UI answer that cannot be represented.
      const chosen =
        requested === 'create-new' || (pointable && requested === 'point-at-existing') ? requested : recommended;
      assumptions.push({
        id: decisionId,
        kind: 'external-database-disposition',
        chosen,
        alternatives: pointable ? ['point-at-existing', 'create-new'] : ['create-new'],
        parameters: {
          dependencyName: dependency.name,
          dependencyKind: dependency.kind,
          provider: dependency.currentlyHostedOn,
          basis: dependency.hostingEvidence ?? 'connection-string'
        },
        evidence: [...dependency.evidence],
        notable: true
      });
      if (chosen === 'point-at-existing') {
        if (dependency.addressedBy.length === 0) {
          gaps.push({
            subject: `dependency:${dependency.name}`,
            message: `We left the existing ${dependency.kind} resource alone, but the repository does not show which environment variable gives your app its address. Add that variable before deploying so the app can still reach it.`
          });
        }
        // Leaving it alone still leaves the application needing its address. Nothing creates it, so
        // `connectTo` has nothing to name — and a container deployed without `DATABASE_URL` starts,
        // crashes, and looks like our bug. The variable goes in as a secret reference: the user
        // already has the connection string, we have never read it, and the file stays coherent.
        for (const serviceName of dependency.consumedBy) {
          const forService = externalVariables.get(serviceName) ?? [];
          for (const variableName of dependency.addressedBy) {
            const secretName = secretNameFor(variableName);
            if (secretName === undefined) continue;
            forService.push({
              name: variableName,
              value: `$Secret('${secretName}')`
            });
            gaps.push({
              subject: `${serviceName}.${variableName}`,
              message: `${variableName} points at the database you already have, which we are leaving alone. Put its value in the ${secretName} secret before deploying.`
            });
          }
          externalVariables.set(serviceName, forService);
        }
        continue;
      }
      // They asked for their own: compose it as though it had never been hosted anywhere.
    }

    if (dependency.kind === 'sqlite') {
      // Nothing to create for SQLite itself, but its file has to be somewhere. The answer decides
      // where, and the variables, mounts and scaling below follow from it.
      const decisionId = `sqlite:${dependency.name}`;
      const reported = dependency.consumedBy
        .map((serviceName) => agentSqliteFiles.get(serviceName))
        .find((file) => file !== undefined);
      const requested = decisions[decisionId] ?? reported?.chosen;
      // A disk mounts only into a long-running container. Functions and framework apps on Lambda have
      // nowhere to keep the file, so the only honest answer for them is the one that keeps nothing.
      const consumers = facts.services.filter((service) => dependency.consumedBy.includes(service.name));
      const mountable =
        consumers.length > 0 &&
        consumers.every((service) => VOLUME_RESOURCE_TYPES.has(classifyService(service).resourceType));
      const chosen: SqliteChoice =
        !mountable || requested === 'accept-ephemeral' ? 'accept-ephemeral' : 'persistent-volume';
      const reportedName = reported === undefined ? '' : posix.basename(reported.path);
      let fileName = reportedName === '' ? 'data.db' : reportedName;
      if ([...sqliteFiles.values()].some((path) => posix.basename(path) === fileName)) {
        fileName = `${dependency.name}-${fileName}`;
      }
      const filePath = `${SQLITE_DIRECTORIES[chosen]}/${fileName}`;
      sqliteFiles.set(dependency.name, filePath);
      assumptions.push({
        id: decisionId,
        kind: 'sqlite-persistence',
        chosen,
        alternatives: mountable ? ['persistent-volume', 'accept-ephemeral'] : ['accept-ephemeral'],
        parameters: { serviceName: dependency.consumedBy[0] ?? 'app', filePath },
        evidence: [...dependency.evidence],
        notable: true
      });
      if (chosen === 'persistent-volume') {
        sqliteVolumeName ??= uniqueName('sqliteData', taken);
        if (resources[sqliteVolumeName] === undefined) {
          resources[sqliteVolumeName] = { type: 'efs-filesystem', properties: { backupEnabled: true } };
          provenance[sqliteVolumeName] = {
            reason: `Your app keeps its data in a SQLite file. This disk is mounted at ${SQLITE_DIRECTORIES['persistent-volume']} and keeps the file through deploys and restarts.`,
            evidence: dependency.evidence.slice(0, 3)
          };
        }
        for (const serviceName of dependency.consumedBy) sqliteVolumeServices.add(serviceName);
        // ECS starts the new copy before it stops the old one, and two services can share the file.
        // SQLite's default journal handles writers on two machines through file locks; WAL does not.
        gaps.push({
          subject: `${dependency.name}.journal`,
          message: `SQLite on the attached disk needs its default journal mode. If your code turns on WAL (PRAGMA journal_mode = WAL), turn it off: during a deploy the new copy of the app starts before the old one stops, and WAL cannot be shared between two machines.`
        });
        if (dependency.addressedBy.length === 0) {
          gaps.push({
            subject: `${dependency.name}.path`,
            message: `Your code opens its SQLite file at a path that no setting controls. Change it to ${filePath} so the file is kept on the disk.`
          });
        }
      }
      if (!mountable && consumers.length > 0) {
        gaps.push({
          subject: `${dependency.name}.ephemeral`,
          message: `${consumers.map((service) => service.name).join(', ')} cannot mount a disk, so its SQLite file starts empty on every deploy and is not shared between requests. Move this data to a database before you rely on it.`
        });
      }
      // A release-time migration cannot reach a file inside the app, and an empty file on a fresh
      // container needs its tables too, so the app has to migrate itself when it starts.
      for (const migration of facts.migrations) {
        if (!dependency.consumedBy.includes(migration.serviceName) || migration.runsAt === 'service-startup') continue;
        gaps.push({
          subject: `${migration.serviceName}.migrations`,
          message: `Make ${migration.serviceName} run "${migration.command}" before it starts its server, for example at the start of its start command. The SQLite file is only reachable from inside the running app, so the deploy cannot migrate it for you.`
        });
      }
      continue;
    }

    const privateDatabase = preferences.databaseAccess === 'private' && RDS_ENGINE_TYPES[dependency.kind] !== undefined;
    const browserUploadMethods =
      dependency.kind === 'object-storage' && hasFrontend
        ? [
            ...new Set(
              facts.services
                .filter((service) => dependency.consumedBy.includes(service.name))
                .flatMap((service) => service.presignedUploadMethods ?? [])
            )
          ].toSorted()
        : [];
    const composed = composeDependency(
      dependency,
      profile,
      projectName,
      engineVersions,
      privateDatabase,
      browserUploadMethods,
      streamTypeFor(dependency.name, facts.services)
    );
    if ('unsupported' in composed) {
      gaps.push({ subject: dependency.name, message: composed.unsupported });
      continue;
    }
    const name = uniqueName(dependency.name, taken);
    dependencyResourceNames.set(dependency.name, name);
    composedDependencyNames.add(dependency.name);
    composedDependencies.set(dependency.name, {
      kind: dependency.kind,
      resourceName: name
    });
    if (privateDatabase) privateDatabaseResourceNames.add(name);
    resources[name] = composed.resource;
    provenance[name] = {
      reason: composed.reason,
      evidence: dependency.evidence.slice(0, 3)
    };
    if (dependency.kind === 'mongodb') {
      gaps.push({
        subject: `${dependency.name}.provider`,
        message:
          'Stacktape can create this MongoDB cluster, but MongoDB Atlas is a separate service. Before deploying, add your Atlas organization ID and API keys under providerConfig.mongoDbAtlas, and keep the private key in a Stacktape secret.'
      });
    }
  }

  // A private database still needs an operator path for generated migrations and local database
  // tools. One keyless SSM bastion serves every private RDS resource in this stack.
  const bastionResourceName =
    privateDatabaseResourceNames.size === 0 ? undefined : uniqueName('databaseBastion', taken);
  if (bastionResourceName !== undefined) {
    resources[bastionResourceName] = {
      type: 'bastion',
      properties: { instanceSize: 't3.micro' }
    };
    provenance[bastionResourceName] = {
      reason:
        'Your database has no public address, so this small keyless jump box provides encrypted access for migrations and local tools.',
      evidence: facts.dependencies
        .filter((dependency) => {
          const resourceName = dependencyResourceNames.get(dependency.name);
          return resourceName !== undefined && privateDatabaseResourceNames.has(resourceName);
        })
        .flatMap((dependency) => dependency.evidence)
        .slice(0, 3)
    };
  }

  const httpTriggeredServices = facts.services.filter((service) =>
    service.functionTriggers.some((trigger) => trigger.type === 'http')
  );
  const httpApiGatewayName = httpTriggeredServices.length === 0 ? undefined : uniqueName('httpApiGateway', taken);
  // One HTTP API holds each method and path once; CloudFormation rejects a second. The first function keeps a
  // route, later ones lose it and get a gap.
  const claimedRoutes = new Set<string>();
  const duplicateRoutes = new Map<string, string[]>();
  for (const service of httpTriggeredServices) {
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'http') continue;
      const route = `${httpRouteMethod(trigger.method)} ${trigger.path}`;
      if (!claimedRoutes.has(route)) {
        claimedRoutes.add(route);
        continue;
      }
      duplicateRoutes.set(service.name, [...(duplicateRoutes.get(service.name) ?? []), route]);
    }
  }
  // A WebSocket API also holds each route key once.
  const claimedWebsocketRoutes = new Set<string>();
  const duplicateWebsocketRoutes = new Map<string, string[]>();
  for (const service of facts.services) {
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'websocket') continue;
      for (const routeKey of trigger.routeKeys) {
        const route = `${trigger.dependencyName} ${routeKey}`;
        if (!claimedWebsocketRoutes.has(route)) {
          claimedWebsocketRoutes.add(route);
          continue;
        }
        duplicateWebsocketRoutes.set(service.name, [...(duplicateWebsocketRoutes.get(service.name) ?? []), routeKey]);
      }
    }
  }
  if (httpApiGatewayName !== undefined) {
    resources[httpApiGatewayName] = {
      type: 'http-api-gateway',
      properties: {}
    };
    provenance[httpApiGatewayName] = {
      reason: 'Your function handlers declare HTTP routes, so they share one pay-per-request API gateway.',
      evidence: httpTriggeredServices.flatMap((service) => service.evidence).slice(0, 3)
    };
  }

  // Detected migrations become the documented local-script pattern the deploy runs afterwards.
  // Private databases use its bastion-tunneling variant.
  // Without this, the migration decision card describes a hook that does not exist and the first
  // deploy ships a schema-less database. Computed before the services so their packaging can know
  // which migrations this deploy now owns.
  const migrationHooks = composeMigrationHooks({
    migrations: facts.migrations,
    services: facts.services,
    dependencies: facts.dependencies,
    composedDependencies,
    assumptions,
    projectName,
    privateDatabaseResourceNames,
    ...(bastionResourceName === undefined ? {} : { bastionResourceName })
  });
  gaps.push(...migrationHooks.gaps);

  // Names are allocated per service *position*, not per service name. Keying a map by name looks
  // equivalent and is not: two services called `app` would collapse onto one key and one of them
  // would vanish from the configuration entirely. `checkFactsCompleteness` rejects duplicates
  // upstream, but losing a service is too quiet a failure to leave to an upstream guarantee.
  const resourceNames = facts.services.map((service) => uniqueName(service.name, taken));
  const serviceResourceNames = new Map<string, string>();
  facts.services.forEach((service, index) => {
    if (!serviceResourceNames.has(service.name)) {
      serviceResourceNames.set(service.name, resourceNames[index]!);
    }
  });

  // A workflow's Task states, now that its functions have resource names. Functions nothing invokes are the candidate
  // states when the code does not order them; they are named in one item instead of one gap each.
  const workflowStates = new Set<string>();
  const untriggeredFunctions = facts.services.filter(
    (service) =>
      classifyService(service).resourceType === 'function' &&
      service.functionTriggers.length === 0 &&
      service.schedule === undefined
  );
  const placeholderWorkflows: Array<{ dependencyName: string; resourceName: string }> = [];
  for (const dependency of facts.dependencies) {
    if (dependency.kind !== 'state-machine') continue;
    const resourceName = dependencyResourceNames.get(dependency.name);
    const resource = resourceName === undefined ? undefined : resources[resourceName];
    if (resourceName === undefined || resource === undefined) continue;
    const steps = (dependency.workflowSteps ?? []).map((serviceName) =>
      untriggeredFunctions.some((service) => service.name === serviceName)
        ? serviceResourceNames.get(serviceName)
        : undefined
    );
    if (steps.length > 0 && steps.every((step) => step !== undefined)) {
      resource.properties.definition = taskChain(steps);
      for (const serviceName of dependency.workflowSteps!) workflowStates.add(serviceName);
    } else {
      placeholderWorkflows.push({ dependencyName: dependency.name, resourceName });
    }
  }
  const candidates = untriggeredFunctions
    .map((service) => service.name)
    .filter((serviceName) => !workflowStates.has(serviceName));
  for (const { dependencyName, resourceName } of placeholderWorkflows) {
    for (const candidate of candidates) workflowStates.add(candidate);
    gaps.push({
      subject: `${dependencyName}.definition`,
      message:
        candidates.length === 0
          ? `Your code starts ${resourceName}, a Step Functions workflow, but init cannot tell which states it runs. Its definition is a Pass placeholder; replace it with your workflow's states before deploying.`
          : `Your code starts ${resourceName}, a Step Functions workflow, but init cannot tell which states it runs or in which order. Its definition is a Pass placeholder. These functions are invoked by nothing else and may be its Task states: ${candidates.join(', ')}. Add them as Task states with Resource: $ResourceParam('<function>', 'arn').`
    });
  }

  const dockerfileOwners = facts.services.filter((candidate) => candidate.dockerfile !== undefined);

  for (const [index, service] of facts.services.entries()) {
    const name = resourceNames[index]!;
    const classification = classifyService(service);
    const siblingDockerfile =
      service.dockerfile === undefined
        ? dockerfileOwners.find((candidate) => candidate.path === service.path)
        : undefined;
    const connectTo = facts.dependencies
      .filter((dependency) => dependency.consumedBy.includes(service.name))
      .map((dependency) => dependencyResourceNames.get(dependency.name))
      .filter((value): value is string => value !== undefined);
    const requiresVpc = facts.dependencies.some((dependency) => {
      if (!dependency.consumedBy.includes(service.name)) return false;
      const resourceName = dependencyResourceNames.get(dependency.name);
      return (
        resourceName !== undefined && (privateDatabaseResourceNames.has(resourceName) || dependency.kind === 'redis')
      );
    });

    const environment = environmentFor(service, {
      serviceResourceNames,
      composedDependencies,
      sqliteFiles,
      projectName
    });
    // A frontend's build-time API address: the HTTP API in front of the functions, or the backend service's URL.
    const buildAddresses: Array<{ name: string; value: string }> = [];
    for (const variable of service.environmentVariables) {
      if (variable.role !== 'build-time') continue;
      // A public address of something we create, like the URL browsers open a WebSocket to.
      const dependency =
        variable.dependencyName === undefined ? undefined : composedDependencies.get(variable.dependencyName);
      if (dependency !== undefined) {
        const wiring = wiringFor(dependency.kind, variable.name);
        if (wiring.kind === 'param') {
          buildAddresses.push({
            name: variable.name,
            value: `$ResourceParam('${dependency.resourceName}', '${wiring.param}')`
          });
        }
        continue;
      }
      if (variable.targetServiceName === undefined) continue;
      const target = facts.services.find((candidate) => candidate.name === variable.targetServiceName);
      const targetResource =
        target !== undefined && target.functionTriggers.some((trigger) => trigger.type === 'http')
          ? httpApiGatewayName
          : serviceResourceNames.get(variable.targetServiceName);
      if (targetResource !== undefined) {
        buildAddresses.push({ name: variable.name, value: `$ResourceParam('${targetResource}', 'url')` });
      }
    }
    // The agent path may already have written the same variable from the service's own facts, so the
    // first entry for a name wins rather than the file carrying it twice.
    for (const extra of externalVariables.get(service.name) ?? []) {
      if (!environment.some((entry) => entry.name === extra.name)) environment.push(extra);
    }

    const declaredRuntimeSettings = service.environmentVariables
      .filter(
        (variable) =>
          variable.role === 'runtime-config' &&
          variable.hasDeclaredValue &&
          variable.safeLiteralValue === undefined &&
          variable.required &&
          !(service.exposesHttp && SELF_URL_VARIABLE.test(variable.name))
      )
      .map((variable) => ({
        name: variable.name,
        secretName: secretNameFor(variable.name)
      }))
      .filter((variable): variable is { name: string; secretName: string } => variable.secretName !== undefined)
      .toSorted((left, right) => left.name.localeCompare(right.name));

    for (const variable of service.environmentVariables) {
      if (
        variable.role === 'infra-dependency' &&
        variable.dependencyName !== undefined &&
        !composedDependencyNames.has(variable.dependencyName) &&
        !sqliteFiles.has(variable.dependencyName) &&
        // The kept-external branch above says this better, naming the provider it is leaving alone.
        !gaps.some((gap) => gap.subject === `${service.name}.${variable.name}`)
      ) {
        // A dependency Stacktape does not create already has its own note ("Your app needs a RabbitMQ
        // broker..."); that note names the secret instead of a second note saying the same thing.
        const unsupportedNote = gaps.find(
          (gap) => gap.subject === variable.dependencyName && gap.message.includes('through the secret below')
        );
        if (unsupportedNote !== undefined) {
          unsupportedNote.message = unsupportedNote.message.replace(
            'through the secret below.',
            `through the ${variable.name.toLowerCase()} secret, which you create before deploying.`
          );
        } else {
          gaps.push({
            subject: `${service.name}.${variable.name}`,
            message: `${variable.name} points at something we are not creating, so put its value in the ${variable.name.toLowerCase()} secret before deploying.`
          });
        }
      }
      if (variable.role === 'build-time' && !buildAddresses.some((address) => address.name === variable.name)) {
        gaps.push({
          subject: `${service.name}.${variable.name}`,
          message: `${variable.name} is needed while your app builds, not while it runs. Set it as a build argument.`
        });
      }
      if (
        variable.role === 'cross-service-reference' &&
        variable.targetServiceProperty !== undefined &&
        variable.targetServiceProperty !== 'url'
      ) {
        gaps.push({
          subject: `${service.name}.${variable.name}`,
          message: `${variable.name} expects ${variable.targetServiceProperty === 'hostport' ? 'a host and port' : `a service ${variable.targetServiceProperty}`}, but Stacktape exposes the deployed service as a complete URL. Update this variable explicitly before deploying.`
        });
      }
    }
    // A variable naming the kind of resource that invokes this function was left unbound by the scan: pointing the
    // function's output at its own trigger would invoke it again with every write.
    const selfTriggerVariables = new Set<string>();
    for (const variable of service.environmentVariables) {
      if (variable.role === 'infra-dependency' || variable.role === 'build-time') continue;
      const kind = resourceKindNamedBy(variable.name);
      const label = kind === undefined ? undefined : SELF_TRIGGER_LABELS[kind];
      if (label === undefined) continue;
      const invokedBy = service.functionTriggers.some((trigger) =>
        facts.dependencies.some(
          (dependency) => dependency.name === invokingDependencyName(trigger) && dependency.kind === kind
        )
      );
      if (!invokedBy) continue;
      selfTriggerVariables.add(variable.name);
      gaps.push({
        subject: `${service.name}.${variable.name}`,
        message: `${variable.name} names a ${label}, and the only ${label} init found is the one that invokes ${service.name}. Pointing ${variable.name} at it would invoke ${service.name} again with every write, so init left it unset. Add a separate ${label} for it, with connectTo and ${variable.name} on ${service.name}, before deploying.`
      });
    }
    for (const variable of service.environmentVariables) {
      if (variable.role !== 'runtime-config' || !variable.required || variable.hasDeclaredValue) continue;
      if (selfTriggerVariables.has(variable.name)) continue;
      if (environment.some((entry) => entry.name === variable.name) || isToolingVariable(variable)) continue;
      unsetSettings.push({
        serviceName: service.name,
        resourceName: name,
        variableName: variable.name,
        evidence: variable.evidence.filter((citation) => !TOOLING_FILE.test(citation.file)).slice(0, 2)
      });
    }

    if (declaredRuntimeSettings.length === 1) {
      const [setting] = declaredRuntimeSettings;
      gaps.push({
        subject: `${service.name}.${setting!.name}`,
        message: `${setting!.name} is set in a deployment file. Init never copies values from those files because they can also contain credentials. Before deploying, set the ${setting!.secretName} Stacktape secret to the intended value.`
      });
    } else if (declaredRuntimeSettings.length > 1) {
      gaps.push({
        subject: `${service.name}.runtime-settings`,
        message: `These app settings have values in deployment files: ${declaredRuntimeSettings.map((setting) => setting.name).join(', ')}. Init never copies values from those files because they can also contain credentials. Before deploying, set their matching Stacktape secrets: ${declaredRuntimeSettings.map((setting) => setting.secretName).join(', ')}.`
      });
    }

    resources[name] = buildServiceResource({
      resourceType: classification.resourceType,
      service,
      environment,
      buildAddresses,
      skippedRoutes: duplicateRoutes.get(service.name) ?? [],
      skippedWebsocketRoutes: duplicateWebsocketRoutes.get(service.name) ?? [],
      connectTo,
      dependencyResourceNames,
      ...(httpApiGatewayName === undefined ? {} : { httpApiGatewayName }),
      profile,
      packageManager: facts.packageManager,
      requiresVpc,
      ...(siblingDockerfile === undefined ? {} : { siblingDockerfile })
    });
    provenance[name] = {
      reason: classification.reason,
      evidence: classification.evidence
    };
    // Only container services reach this set: the SQLite decision falls back to the container's own
    // disk when any consumer cannot mount one.
    if (sqliteVolumeName !== undefined && sqliteVolumeServices.has(service.name)) {
      const properties = resources[name]!.properties;
      properties.volumeMounts = [
        {
          type: 'efs',
          properties: { efsFilesystemName: sqliteVolumeName, mountPath: SQLITE_DIRECTORIES['persistent-volume'] }
        }
      ];
      // SQLite has one writer at a time, and every extra copy of the app is another machine contending
      // for the file over a network disk. One copy is the price of keeping it without code changes.
      properties.scaling = { minInstances: 1, maxInstances: 1 };
    }

    // Root-context builds can carry a stated limitation; the packaging itself is emitted inside
    // `buildServiceResource`, and the caveat belongs next to the other honest omissions. Only the
    // container shapes reach the buildpack branch — framework `-web` resources, hosting buckets and
    // functions package themselves.
    const usesBuildpackPackaging =
      (classification.resourceType === 'web-service' ||
        classification.resourceType === 'worker-service' ||
        classification.resourceType === 'private-service' ||
        classification.resourceType === 'batch-job') &&
      service.dockerfile === undefined &&
      (service.containerEntrypoint === undefined || !JS_ENTRY_FILE.test(service.containerEntrypoint));
    const monorepoCaveat = usesBuildpackPackaging
      ? monorepoPackaging(service, facts.packageManager)?.caveat
      : undefined;
    if (monorepoCaveat !== undefined) {
      gaps.push({ subject: service.name, message: monorepoCaveat });
    }

    if (
      service.startCommand === undefined &&
      service.dockerfile === undefined &&
      service.containerEntrypoint === undefined &&
      service.functionEntrypoint === undefined &&
      classification.resourceType !== 'hosting-bucket' &&
      !classification.resourceType.endsWith('-web')
    ) {
      gaps.push({
        subject: service.name,
        message: `We could not work out how to start ${service.name}. Set the start command in the configuration.`
      });
    }
    if (
      classification.resourceType === 'function' &&
      service.functionTriggers.length === 0 &&
      service.schedule === undefined &&
      !workflowStates.has(service.name) &&
      !assumptions.some(
        (assumption) =>
          assumption.kind === 'schedule-unknown' &&
          (assumption.parameters as { serviceName?: string }).serviceName === service.name
      )
    ) {
      gaps.push({
        subject: service.name,
        message: `We found the ${service.name} handler but no event that invokes it. Add its HTTP, queue, topic, bucket or schedule trigger.`
      });
    }
    if (
      requiresVpc &&
      (classification.resourceType === 'function' || classification.resourceType.endsWith('-web')) &&
      service.environmentVariables.some((variable) => variable.role === 'third-party-secret')
    ) {
      gaps.push({
        subject: `${service.name}.vpc-internet-access`,
        message: `${service.name} joins the VPC to reach a private dependency. AWS functions in a VPC cannot call public APIs directly; choose internet-reachable database access or add outbound networking if this code calls a third-party service.`
      });
    }
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'unmapped') continue;
      gaps.push({
        subject: service.name,
        message:
          trigger.sourceType === UNROUTED_HTTP_SOURCE
            ? `${service.name} handles HTTP requests, and so do other handlers, but the code does not say which route each one serves. Add an http-api-gateway event with its method and path to each of them before deploying; only one handler can take the catch-all route.`
            : `${service.name} is invoked by ${trigger.sourceType}. Init cannot translate that trigger yet. Add its Stacktape equivalent before deploying.`
      });
    }
    for (const routeKey of duplicateWebsocketRoutes.get(service.name) ?? []) {
      gaps.push({
        subject: `${service.name}.route`,
        message: `${service.name} and another function both handle the WebSocket route ${routeKey}, which one API cannot hold twice. We left it off ${service.name}; handle it in one function before deploying.`
      });
    }
    for (const route of duplicateRoutes.get(service.name) ?? []) {
      gaps.push({
        subject: `${service.name}.route`,
        message: `${service.name} and another function both declare the HTTP route ${route}, which one API cannot hold twice. We left it off ${service.name}; give it its own route before deploying.`
      });
    }
  }

  for (const assumption of assumptions) {
    if (assumption.kind !== 'schedule-unknown' || assumption.chosen !== NO_SCHEDULE) continue;
    const { serviceName } = assumption.parameters as { serviceName?: string };
    gaps.push({
      subject: `${serviceName}.schedule`,
      message: `${serviceName} looks like a scheduled job, but nothing in the code says how often it runs. We wrote no schedule, so it deploys and runs in stacktape dev but never on its own. Add a schedule event, for example rate(1 day), when you know.`
    });
  }

  for (const dependency of facts.dependencies) {
    if (!ADDRESS_REQUIRED_KINDS.has(dependency.kind) || !composedDependencyNames.has(dependency.name)) continue;
    const consumersWithoutAddress = dependency.consumedBy.filter((serviceName) => {
      const service = facts.services.find((candidate) => candidate.name === serviceName);
      return (
        service !== undefined &&
        !service.environmentVariables.some(
          (variable) => variable.role === 'infra-dependency' && variable.dependencyName === dependency.name
        )
      );
    });
    if (consumersWithoutAddress.length === 0) continue;
    gaps.push({
      subject: `${dependency.name}.address`,
      message: `${consumersWithoutAddress.join(', ')} uses ${dependencyLabel(dependency.kind)}, but the code does not read a configurable address for it. Stacktape will create it and grant access; update the app to read the connection details injected by connectTo before deploying.`
    });
  }

  // Another tool has deployment configuration in this repository. A file cannot prove that it was
  // applied, so the wording stays conditional while still making the possible second copy visible.
  for (const deployment of facts.existingDeployments) {
    const label = DEPLOYMENT_TOOL_LABELS[deployment.tool];
    gaps.push({
      subject: deployment.tool,
      message:
        deployment.tool === 'cloudflare-workers'
          ? 'This project uses Cloudflare Workers runtime APIs and bindings. Init cannot translate those APIs into runnable AWS handlers safely, so it generated no AWS resources for them. Adapt the handlers and D1, R2, Queue, Durable Object, and service bindings before deploying with Stacktape.'
          : deployment.tool === 'pulumi' && unresolvedPulumiCompute
            ? 'This Pulumi program declares AWS compute, but init could not safely connect its handlers to their events. It left weak, unconsumed SDK hints out instead of creating orphaned queues, tables, topics, or buckets. Add the functions and triggers explicitly before deploying.'
            : AWS_DEPLOYMENT_TOOLS.has(deployment.tool)
              ? `This project has ${label} deployment files. What we wrote is a separate stack: it does not read, change, or take over anything those files may manage.`
              : `This project has ${label} deployment config. If an app is already running there, deploying this creates a second copy on AWS and leaves the current one untouched.`
    });
  }

  const scripts: Record<string, ComposedResource> = {
    ...migrationHooks.scripts,
    ...composeLocalScripts({
      localScripts: facts.localScripts,
      services: facts.services,
      composedDependencies,
      projectName,
      takenNames: new Set(Object.keys(migrationHooks.scripts))
    })
  };

  // Several probes can establish the same missing user action for two views of one codebase. The
  // subject remains useful internally, but repeating identical prose makes the review look more
  // dangerous and more laborious than it is. The first occurrence has the strongest provenance
  // because probe order is deliberate.
  const uniqueGaps = [...new Map(gaps.map((gap) => [gap.message, gap])).values()];

  return {
    config: {
      ...(projectName === undefined ? {} : { projectName }),
      resources,
      ...(Object.keys(scripts).length === 0 ? {} : { scripts }),
      ...(migrationHooks.afterDeploy.length === 0 ? {} : { hooks: { afterDeploy: migrationHooks.afterDeploy } })
    },
    provenance,
    gaps: uniqueGaps,
    unsetSettings,
    assumptions,
    // Anything `resolveAssumptions` could not decide. Normally none.
    unresolved: facts.uncertainties,
    preferences,
    recommendedPreferences,
    ...(mode === undefined ? {} : { mode }),
    // Which resource each service became, for anything that has to walk from facts to config —
    // the preflight verifier being the first consumer.
    serviceResources: Object.fromEntries(serviceResourceNames),
    // The only thing that makes a configuration undeployable is having nothing in it.
    deployable: Object.keys(resources).length > 0
  };
};

/** SAM and Serverless spell the catch-all method `ANY`; the HTTP API gateway event takes `*`. */
const httpRouteMethod = (method: string): string => (/^(?:any|\*)$/i.test(method) ? '*' : method.toUpperCase());

/** The port Stacktape routes a web or private service's traffic to when its config sets none. */
const DEFAULT_SERVICE_PORT = 3000;

const buildServiceResource = ({
  resourceType,
  service,
  environment,
  buildAddresses,
  skippedRoutes,
  skippedWebsocketRoutes,
  connectTo,
  dependencyResourceNames,
  httpApiGatewayName,
  profile,
  packageManager,
  requiresVpc,
  siblingDockerfile
}: {
  resourceType: ServiceResourceType;
  service: ServiceFact;
  environment: Array<{ name: string; value: unknown }>;
  /** Build-time variables holding another resource's address, for frontends. */
  buildAddresses: Array<{ name: string; value: string }>;
  /** `METHOD /path` routes another function already holds on the shared HTTP API. */
  skippedRoutes: readonly string[];
  /** WebSocket route keys another function already holds. */
  skippedWebsocketRoutes: readonly string[];
  connectTo: readonly string[];
  dependencyResourceNames: ReadonlyMap<string, string>;
  httpApiGatewayName?: string;
  profile: InfrastructureProfile;
  packageManager: PackageManager | undefined;
  requiresVpc: boolean;
  /** Another process of the same source directory that ships a Dockerfile; this one reuses it. */
  siblingDockerfile?: Pick<ServiceFact, 'dockerfile' | 'buildRoot' | 'path'> | undefined;
}): ComposedResource => {
  const shared = {
    ...(environment.length > 0 ? { environment } : {}),
    ...(connectTo.length > 0 ? { connectTo: [...connectTo] } : {})
  };

  if (resourceType === 'hosting-bucket') {
    // A build root comes from a deployment descriptor (a Docker context, a Render root directory) and belongs to that
    // descriptor's command. The package's own `<manager> run build` script only exists in the package directory.
    const ownBuildScript = /^(?:npm|pnpm|yarn|bun) run build$/.test(service.buildCommand ?? '');
    const buildRoot = ownBuildScript ? service.path : (service.buildRoot ?? service.path);
    const contentType =
      service.framework === 'gatsby'
        ? 'gatsby-static-website'
        : service.framework === 'react' ||
            service.framework === 'vue' ||
            service.framework === 'angular' ||
            service.framework === 'vite'
          ? 'single-page-app'
          : 'static-website';
    return {
      type: 'hosting-bucket',
      properties: {
        uploadDirectoryPath: service.servesStaticAssets?.path ?? `${service.path}/dist`,
        hostingContentType: contentType,
        ...(service.buildCommand === undefined
          ? {}
          : {
              build: {
                command: service.buildCommand,
                ...(buildRoot === '.' ? {} : { workingDirectory: buildRoot })
              }
            }),
        // `stacktape dev` runs this command for the frontend and skips a bucket that has none.
        ...(service.devCommand === undefined
          ? {}
          : {
              dev: {
                command: service.devCommand,
                ...(service.path === '.' ? {} : { workingDirectory: service.path })
              }
            }),
        ...(buildAddresses.length === 0 ? {} : { injectEnvironment: buildAddresses })
      }
    };
  }

  if (resourceType === 'function') {
    const events: Array<{ type: string; properties: Record<string, unknown> }> = [];
    for (const trigger of service.functionTriggers) {
      // A function URL is a property of the function, below, not an event integration.
      if (trigger.type === 'unmapped' || trigger.type === 'url') continue;
      if (trigger.type === 'http') {
        if (
          httpApiGatewayName !== undefined &&
          !skippedRoutes.includes(`${httpRouteMethod(trigger.method)} ${trigger.path}`)
        ) {
          events.push({
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName,
              method: httpRouteMethod(trigger.method),
              path: trigger.path,
              ...(trigger.payloadFormat === '2.0' ? { payloadFormat: '2.0' } : {})
            }
          });
        }
        continue;
      }
      if (trigger.type === 'schedule') {
        events.push({
          type: 'schedule',
          properties: { scheduleRate: normalizeScheduleExpression(trigger.rate) }
        });
        continue;
      }
      const dependencyName = dependencyResourceNames.get(trigger.dependencyName);
      if (dependencyName === undefined) continue;
      if (trigger.type === 'websocket') {
        for (const routeKey of trigger.routeKeys) {
          if (skippedWebsocketRoutes.includes(routeKey)) continue;
          events.push({
            type: 'websocket-api-gateway',
            properties: { websocketApiGatewayName: dependencyName, routeKey }
          });
        }
        continue;
      }
      if (trigger.type === 'dynamodb-stream') {
        // New records only: an existing table's stream would otherwise replay the last day of changes into the handler.
        events.push({
          type: 'dynamo-db-stream',
          properties: { streamArn: `$ResourceParam('${dependencyName}', 'streamArn')`, startingPosition: 'LATEST' }
        });
        continue;
      }
      if (trigger.type === 'event-bus') {
        events.push({
          type: 'event-bus',
          properties: {
            eventBusName: dependencyName,
            eventPattern: {
              ...(trigger.sources === undefined ? {} : { source: [...trigger.sources] }),
              'detail-type': [...trigger.detailTypes]
            }
          }
        });
        continue;
      }
      if (trigger.type === 'queue') {
        events.push({
          type: 'sqs',
          properties: {
            sqsQueueName: dependencyName,
            ...(trigger.batchSize === undefined ? {} : { batchSize: trigger.batchSize })
          }
        });
        continue;
      }
      if (trigger.type === 'topic') {
        events.push({
          type: 'sns',
          properties: { snsTopicName: dependencyName }
        });
        continue;
      }
      events.push({
        type: 's3',
        properties: {
          bucketArn: `$ResourceParam('${dependencyName}', 'arn')`,
          s3EventType: trigger.eventType ?? 's3:ObjectCreated:*'
        }
      });
    }
    // A handler typed for a scheduled event whose rate the code does not state: the decided schedule.
    if (service.schedule !== undefined && !events.some((event) => event.type === 'schedule')) {
      events.push({ type: 'schedule', properties: { scheduleRate: normalizeScheduleExpression(service.schedule) } });
    }
    return {
      type: 'function',
      properties: {
        packaging: {
          type: JS_ENTRY_FILE.test(service.functionEntrypoint ?? '') ? 'js-bundle' : 'buildpack',
          properties: {
            entryfilePath: service.functionEntrypoint,
            ...(service.functionHandler === undefined ? {} : { handlerFunction: service.functionHandler })
          }
        },
        ...(events.length === 0 ? {} : { events }),
        ...(service.functionTriggers.some((trigger) => trigger.type === 'url') ? { url: { enabled: true } } : {}),
        ...(requiresVpc ? { joinDefaultVpc: true } : {}),
        alarms: [
          {
            description: 'Function errors stay above 10%',
            trigger: {
              type: 'lambda-error-rate',
              properties: { thresholdPercent: 10 }
            },
            evaluation: {
              period: 300,
              evaluationPeriods: 3,
              breachedPeriods: 2
            },
            includeInHistory: true
          }
        ],
        ...shared
      }
    };
  }

  if (resourceType.endsWith('-web')) {
    // The framework resources take the application directory and handle their own build.
    // The framework resources pass `environment` to their build as well as their server.
    const webEnvironment = [
      ...environment,
      ...buildAddresses.filter((address) => !environment.some((entry) => entry.name === address.name))
    ];
    return {
      type: resourceType,
      properties: {
        appDirectory: service.path,
        ...(requiresVpc ? { serverLambda: { joinDefaultVpc: true } } : {}),
        ...shared,
        ...(webEnvironment.length === 0 ? {} : { environment: webEnvironment }),
        ...(service.devCommand === undefined ? {} : { dev: { command: service.devCommand } })
      }
    };
  }

  if (resourceType === 'batch-job') {
    return {
      type: 'batch-job',
      properties: {
        container: {
          packaging: packagingFor(service, packageManager, siblingDockerfile)
        },
        resources: { ...profile.container },
        ...(service.schedule === undefined
          ? {}
          : {
              events: [
                {
                  type: 'schedule',
                  properties: { scheduleRate: normalizeScheduleExpression(service.schedule) }
                }
              ]
            }),
        ...shared
      }
    };
  }

  // No health check is emitted on purpose. Stacktape's `internalHealthCheck` takes a container
  // command, not an HTTP path, and a guessed command — `curl` against a buildpack image that may not
  // ship curl — produces a container that never reports healthy and a deploy that hangs until it
  // times out. The platform defaults are correct far more often than a guess, and the observed
  // `healthCheckPath` is better spent on load-balancer configuration once that is modelled.
  return {
    type: resourceType,
    properties: {
      packaging: packagingFor(service, packageManager, siblingDockerfile),
      // Stacktape routes a service's traffic to the port in $PORT, 3000 unless set. An app listening on a fixed port
      // would deploy green and never receive a request, so the port it listens on is written whenever it differs.
      ...((resourceType === 'web-service' || resourceType === 'private-service') &&
      service.port !== undefined &&
      service.port !== DEFAULT_SERVICE_PORT
        ? { port: service.port }
        : {}),
      resources: { ...profile.container },
      // Scaling is only meaningful for something that stays up. A batch job is sized, not scaled.
      scaling: {
        minInstances: profile.scaling.minInstances,
        maxInstances: profile.scaling.maxInstances
      },
      ...(resourceType === 'web-service'
        ? {
            alarms: [
              {
                description: 'Web service p95 latency stays above 5 seconds',
                trigger: {
                  type: 'http-api-gateway-latency',
                  properties: { thresholdMilliseconds: 5000, statistic: 'p95' }
                },
                evaluation: {
                  period: 300,
                  evaluationPeriods: 3,
                  breachedPeriods: 2
                },
                includeInHistory: true
              }
            ]
          }
        : {}),
      ...shared
    }
  };
};
