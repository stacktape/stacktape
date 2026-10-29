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
import type { ImportConcern, ImportGap, PackageManager, ProjectFacts } from '../facts/project-facts';
import { posix } from 'node:path';
import {
  DIRECT_INVOCATION_SOURCE,
  invokingDependencyName,
  UNROUTED_HTTP_SOURCE,
  type FunctionTrigger,
  type ServiceFact
} from '../facts/service';
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

/** What leaving a declared setting out would change, as the second half of a gap sentence. */
const IMPORT_CONCERN_CONSEQUENCES: Record<ImportConcern, string> = {
  access: 'without it the route would accept callers your source refuses',
  condition: 'it exists only while its condition is true, and init could not prove that it is',
  profile: 'Compose starts it only when that profile is selected',
  network: 'it would run outside the network your source puts it in',
  storage: 'the files it keeps there would not survive or would not be there',
  'failure-handling': 'failed events would no longer go to their declared retries or dead-letter target',
  execution: 'it would run with other limits, ordering or concurrency than declared',
  identity: 'users would sign in without that protection',
  encryption: 'its data would not use the declared encryption key',
  'container-security': 'the container would run with fewer restrictions than declared',
  'code-integrity': 'unsigned code would be accepted'
};

const quotedList = (values: readonly string[]): string => {
  const quoted = values.map((value) => `\`${value}\``);
  return quoted.length <= 1 ? (quoted[0] ?? '') : `${quoted.slice(0, -1).join(', ')} and ${quoted.at(-1)}`;
};

const importGapMessage = ({ file, object, keys, effect, concern }: ImportGap): string => {
  const consequence = concern === undefined ? '' : `: ${IMPORT_CONCERN_CONSEQUENCES[concern]}`;
  if (effect === 'omitted') {
    return `${file}: init left \`${object}\` out because it did not carry ${quotedList(keys)}${consequence}. Before deploying, add it to the configuration with an equivalent setting, or leave it out on purpose.`;
  }
  if (effect === 'not-imported') {
    return `${file} declares ${quotedList(keys)}, which init did not import from it. Before deploying, check that the configuration has what the app needs from ${keys.length === 1 ? 'it' : 'them'}.`;
  }
  return `${file}: init did not carry ${quotedList(keys)} of \`${object}\`${consequence}. Before deploying, set the Stacktape equivalent, or confirm the app works without ${keys.length === 1 ? 'it' : 'them'}.`;
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

const SNS_SQS_ADDRESS = /(?:^|_)(?:TOPIC_ARN|QUEUE_URL|QUEUE_ARN)$/;
/**
 * A variable holding the HTTP address of a service: `API_URL`, `ME_URL`, `PAYMENTS_ENDPOINT`. A datastore's connection
 * URL, an error tracker's DSN or the app's own callback address is not one.
 */
const ADDRESS_VARIABLE = /(?:^|_)(?:URL|URI|ENDPOINT|ORIGIN)$/;
const NOT_A_SERVICE_ADDRESS =
  /DATABASE|(?:^|_)(?:DB|PG|POSTGRES|MYSQL|MARIADB|MONGO(?:DB)?|REDIS|VALKEY|CACHE|AMQP|RABBIT(?:MQ)?|KAFKA|NATS|ELASTIC(?:SEARCH)?|OPENSEARCH|SEARCH|SMTP|MAIL|S3|BUCKET|QUEUE|TOPIC|SENTRY|WEBHOOK|CALLBACK|REDIRECT)(?:_|$)|^(?:APP|APPLICATION|SITE|NEXTAUTH|BASE|PUBLIC|SELF)_URL$/;

/** The resources only a publish or send call proves, as a gap names them. */
const MESSAGING_VARIABLE_LABELS: Partial<
  Record<DependencyFact['kind'], { kind: 'topic' | 'queue'; label: string; call: string; resourceType: string }>
> = {
  topic: { kind: 'topic', label: 'an SNS topic', call: 'publish', resourceType: 'sns-topic' },
  queue: { kind: 'queue', label: 'an SQS queue', call: 'send', resourceType: 'sqs-queue' }
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
        dockerfilePath: buildRoot === '.' ? service.dockerfile : posix.relative(buildRoot, service.dockerfile),
        // A deployment manifest that replaces the image's command (Compose `command`) runs that instead of `CMD`.
        ...(service.commandOverridesImage === true && service.startCommand !== undefined
          ? { command: containerCommand(service.startCommand) }
          : {})
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
type ServiceReferenceContext = {
  serviceResourceNames: ReadonlyMap<string, string>;
  services: readonly ServiceFact[];
  httpApiGatewayName: string | undefined;
};

/**
 * The value of a variable that addresses another service of the project, or undefined when Stacktape has no value of
 * the shape the code expects.
 *
 * Render can inject a bare host, a port, or `host:port`. A Stacktape web-service exposes a complete URL; substituting
 * that for one of those narrower shapes produces a valid-looking config and a broken application, so those become an
 * explicit review item instead. A private service's `address` is `host:port`, so its URL gets the scheme in front. An
 * HTTP-triggered function is reached through the HTTP API, and a function the code invokes by name gets its ARN, which
 * the Lambda `Invoke` API takes as well.
 */
const serviceReferenceValue = (
  variable: Pick<ServiceFact['environmentVariables'][number], 'targetServiceName' | 'targetServiceProperty'>,
  { serviceResourceNames, services, httpApiGatewayName }: ServiceReferenceContext
): string | undefined => {
  if (variable.targetServiceName === undefined) return undefined;
  const resourceName = serviceResourceNames.get(variable.targetServiceName);
  const target = services.find((candidate) => candidate.name === variable.targetServiceName);
  if (resourceName === undefined || target === undefined) return undefined;
  const property = variable.targetServiceProperty ?? 'url';
  if (target.functionEntrypoint !== undefined) {
    if (property === 'arn') return `$ResourceParam('${resourceName}', 'arn')`;
    if (property !== 'url') return undefined;
    if (target.functionTriggers.some((trigger) => trigger.type === 'url')) {
      return `$ResourceParam('${resourceName}', 'url')`;
    }
    return target.functionTriggers.some((trigger) => trigger.type === 'http') && httpApiGatewayName !== undefined
      ? `$ResourceParam('${httpApiGatewayName}', 'url')`
      : undefined;
  }
  if (target.internalOnly === true) {
    if (property === 'hostport') return `$ResourceParam('${resourceName}', 'address')`;
    return property === 'url' ? `$CfFormat('http://{}', $ResourceParam('${resourceName}', 'address'))` : undefined;
  }
  return property === 'url' ? `$ResourceParam('${resourceName}', 'url')` : undefined;
};

/** Services another service has to `connectTo`: functions it invokes, and private services it calls. */
const connectedServices = (service: ServiceFact, services: readonly ServiceFact[]): string[] =>
  service.environmentVariables.flatMap((variable) => {
    if (variable.role !== 'cross-service-reference') return [];
    const target = services.find((candidate) => candidate.name === variable.targetServiceName);
    if (target === undefined) return [];
    const invoked = target.functionEntrypoint !== undefined && variable.targetServiceProperty === 'arn';
    return invoked || (target.functionEntrypoint === undefined && target.internalOnly === true) ? [target.name] : [];
  });

const environmentFor = (
  service: ServiceFact,
  context: ServiceReferenceContext & {
    /** Dependencies we are creating: fact name → its kind and the resource name it composed into. */
    composedDependencies: ReadonlyMap<string, { kind: DependencyFact['kind']; resourceName: string }>;
    /** Where each SQLite dependency's file is, by dependency name. */
    sqliteFiles: ReadonlyMap<string, string>;
    projectName: string | undefined;
    /** User pools by dependency name. An app client ID is no secret, so one init does not create stays unset. */
    userPoolNames: ReadonlySet<string>;
  }
): Array<{ name: string; value: unknown }> => {
  const { serviceResourceNames, composedDependencies, sqliteFiles, projectName, userPoolNames } = context;
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
        if (userPoolNames.has(variable.dependencyName)) continue;
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
      const value = serviceReferenceValue(variable, context);
      if (value !== undefined) variables.push({ name: variable.name, value });
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

/**
 * The sign-in rules of a user pool init creates. A declaration's own rules are kept; without one, accounts are created
 * by an administrator unless the code calls SignUp, because an open pool would let anyone sign up through the Cognito
 * API and pass the API's token check.
 */
const userPoolProperties = (dependency: DependencyFact): Record<string, unknown> => {
  const declared = dependency.userPoolSettings;
  const adminOnly = declared?.allowOnlyAdminsToCreateAccount ?? dependency.userPoolSelfSignUp !== true;
  return {
    ...(adminOnly ? { allowOnlyAdminsToCreateAccount: true } : {}),
    ...(declared?.mfa === undefined
      ? {}
      : {
          mfaConfiguration: {
            status: declared.mfa.status,
            ...(declared.mfa.enabledTypes === undefined ? {} : { enabledTypes: [...declared.mfa.enabledTypes] })
          }
        }),
    ...(declared?.passwordPolicy === undefined ? {} : { passwordPolicy: { ...declared.passwordPolicy } }),
    ...(declared?.generateClientSecret === true ? { generateClientSecret: true } : {})
  };
};

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
  const rdsEngine =
    dependency.kind === 'mysql' && dependency.mysqlEngine === 'mariadb' ? 'mariadb' : RDS_ENGINE_TYPES[dependency.kind];
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
      reason: `Your code connects to a ${rdsEngine === 'mariadb' ? 'MariaDB' : dependencyLabel(dependency.kind)} database.${
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
            ...(profile.bucket.versioning || dependency.bucketVersioning === true ? { versioning: true } : {}),
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
            // A declared key carries its attribute types; a key read from requests is a string unless declared.
            primaryKey: dependency.tableKey ?? {
              partitionKey: { name: dependency.itemKey?.partitionKey ?? 'pk', type: 'string' },
              ...(dependency.itemKey?.sortKey === undefined
                ? {}
                : { sortKey: { name: dependency.itemKey.sortKey, type: 'string' } })
            },
            ...(streamType === undefined ? {} : { streamType })
          }
        },
        reason: `${dependency.tableKey === undefined ? 'Your code uses DynamoDB' : 'Your deployment files declare this table and its key'}${dependency.tableKey === undefined && dependency.itemKey !== undefined ? ` and addresses items by ${dependency.itemKey.partitionKey}` : ''}.${
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
    case 'user-pool': {
      const variables = dependency.addressedBy;
      const client = variables.find((name) => /CLIENT_?ID$/.test(name)) ?? 'the client ID variable';
      return dependency.userPoolOwnership === 'project'
        ? {
            resource: {
              type: 'user-auth-pool',
              properties: userPoolProperties(dependency)
            },
            reason: `Your code signs users in with Cognito, and the repository creates its own user pool, so this creates the pool and the app client ${client} names.`
          }
        : {
            unsupported: `Your code signs users in with a Cognito user pool through ${variables.join(' and ')}. Nothing in the repository creates that pool, so it is probably an existing one with its users, and init created none and set no value. Before deploying, set ${variables.join(' and ')} to your pool's values. If this project should own a new, empty pool, add a user-auth-pool resource and set ${client} to $ResourceParam('<pool name>', 'clientId').`
          };
    }
    case 'state-machine':
      return {
        // The states are written once the functions have their resource names; a placeholder until then.
        resource: { type: 'state-machine', properties: { definition: PLACEHOLDER_DEFINITION } },
        reason: 'Your code starts executions of a Step Functions workflow.'
      };
    case 'queue': {
      const settings = dependency.queueSettings;
      return {
        resource: {
          type: 'sqs-queue',
          properties: {
            ...(settings?.fifo === true
              ? {
                  fifoEnabled: true,
                  ...(settings.contentBasedDeduplication === true ? { contentBasedDeduplication: true } : {})
                }
              : {}),
            ...(settings?.visibilityTimeoutSeconds === undefined
              ? {}
              : { visibilityTimeoutSeconds: settings.visibilityTimeoutSeconds })
          }
        },
        reason:
          settings?.fifo === true
            ? 'Your deployment files declare a FIFO queue, so it keeps message order and drops duplicate messages.'
            : 'Your code uses Amazon SQS.'
      };
    }
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
  // A handler that reads JWT authorizer claims gets its route behind the project's own user pool, when there is one.
  const projectUserPools = facts.dependencies.filter(
    (dependency) => dependency.kind === 'user-pool' && dependency.userPoolOwnership === 'project'
  );
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
  /** The disk composed for each Compose named volume, by volume name. */
  const persistentVolumeResources = new Map<string, string>();
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
    if (dependency.kind === 'queue') {
      // AWS refuses a queue trigger whose function may run longer than the queue hides a message.
      const longestConsumerTimeout = Math.max(
        0,
        ...facts.services
          .filter((service) =>
            service.functionTriggers.some(
              (trigger) => trigger.type === 'queue' && trigger.dependencyName === dependency.name
            )
          )
          .map((service) => service.functionTimeoutSeconds ?? 0)
      );
      if (longestConsumerTimeout > (dependency.queueSettings?.visibilityTimeoutSeconds ?? 30)) {
        composed.resource.properties.visibilityTimeoutSeconds = Math.min(longestConsumerTimeout * 6, 43200);
      }
    }
    provenance[name] = {
      reason: composed.reason,
      evidence: dependency.evidence.slice(0, 3)
    };
    const writtenAttributes = dependency.writtenItemAttributes ?? [];
    if (
      dependency.kind === 'dynamodb' &&
      dependency.itemKey === undefined &&
      writtenAttributes.length > 0 &&
      !writtenAttributes.includes('pk')
    ) {
      const listed = (conjunction: string) =>
        writtenAttributes.length === 1
          ? writtenAttributes[0]
          : `${writtenAttributes.slice(0, -1).join(', ')} ${conjunction} ${writtenAttributes.at(-1)}`;
      gaps.push({
        subject: `${dependency.name}.primaryKey`,
        message: `Your code writes items with ${listed('and')} to ${name}, but no request names the table's key. Its partition key is the placeholder pk, which these items do not have, so DynamoDB rejects every write. Before deploying, set primaryKey.partitionKey to ${writtenAttributes.length === 1 ? `${listed('or')}, if that identifies an item` : `whichever of ${listed('or')} identifies an item`}.`
      });
    }
    if (dependency.kind === 'mongodb') {
      gaps.push({
        subject: `${dependency.name}.provider`,
        message:
          'Stacktape can create this MongoDB cluster, but MongoDB Atlas is a separate service. Before deploying, add your Atlas organization ID and API keys under providerConfig.mongoDbAtlas, and keep the private key in a Stacktape secret.'
      });
    }
  }

  // A queue's declared dead-letter target: another queue composed here, or an existing queue's ARN. Written once every
  // queue has its resource name.
  for (const dependency of dependencies) {
    const deadLetter = dependency.queueSettings?.deadLetter;
    const queueName = dependencyResourceNames.get(dependency.name);
    if (deadLetter === undefined || queueName === undefined) continue;
    const targetName =
      deadLetter.dependencyName === undefined ? undefined : dependencyResourceNames.get(deadLetter.dependencyName);
    if (targetName === undefined && deadLetter.queueArn === undefined) {
      gaps.push({
        subject: `${dependency.name}.redrivePolicy`,
        message: `Your deployment files send messages that keep failing on ${queueName} to a dead-letter queue init did not create. Before deploying, set its redrivePolicy to a queue that exists, or failed messages are lost when they expire.`
      });
      continue;
    }
    resources[queueName]!.properties.redrivePolicy = {
      ...(targetName === undefined ? { targetSqsQueueArn: deadLetter.queueArn } : { targetSqsQueueName: targetName }),
      maxReceiveCount: deadLetter.maxReceiveCount
    };
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

  const userPoolNames = new Set(
    facts.dependencies.filter((dependency) => dependency.kind === 'user-pool').map((dependency) => dependency.name)
  );
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

  const migrationHooks = composeMigrationHooks({
    migrations: facts.migrations,
    services: facts.services,
    dependencies: facts.dependencies,
    composedDependencies,
    assumptions,
    projectName,
    serviceResourceNames,
    privateDatabaseResourceNames,
    ...(bastionResourceName === undefined ? {} : { bastionResourceName })
  });
  gaps.push(...migrationHooks.gaps);

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

  // Two different functions on one queue split its messages between them. Nothing here says that is the intent, and a
  // project with a topic usually means every consumer to get every message.
  const queueConsumers = new Map<string, string[]>();
  for (const service of facts.services) {
    if (service.functionEntrypoint === undefined) continue;
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'queue') continue;
      const consumer = serviceResourceNames.get(service.name);
      if (consumer !== undefined)
        queueConsumers.set(trigger.dependencyName, [...(queueConsumers.get(trigger.dependencyName) ?? []), consumer]);
    }
  }
  const topicNames = facts.dependencies.flatMap((dependency) =>
    dependency.kind === 'topic' && dependencyResourceNames.has(dependency.name)
      ? [dependencyResourceNames.get(dependency.name)!]
      : []
  );
  for (const [dependencyName, consumers] of queueConsumers) {
    const queueName = dependencyResourceNames.get(dependencyName);
    if (queueName === undefined || new Set(consumers).size < 2) continue;
    const listed =
      consumers.length === 2
        ? `${consumers[0]} and ${consumers[1]} both`
        : `${consumers.slice(0, -1).join(', ')} and ${consumers.at(-1)} all`;
    const subscription =
      topicNames.length === 1
        ? `give each its own queue subscribed to ${topicNames[0]} before deploying: an sqs-queue and sqs event per consumer, an AWS::SNS::Subscription in cloudformationResources, and a policyStatements entry on the queue that lets sns.amazonaws.com send to it`
        : 'publish to an SNS topic and give each its own queue subscribed to it before deploying';
    const hint = facts.dependencies.find((dependency) => dependency.name === dependencyName)?.fanoutHint;
    const queues =
      hint === undefined
        ? ''
        : hint.queues.length === 1
          ? hint.queues[0]
          : `${hint.queues.slice(0, -1).join(', ')} and ${hint.queues.at(-1)}`;
    gaps.push({
      subject: `${queueName}.consumers`,
      message: `${listed} consume ${queueName}, so each message reaches only one of them. If each consumer must receive every message, ${subscription}.${hint === undefined ? '' : ` ${hint.file} line ${hint.line} names ${queues} in a sentence about a topic.`} Leave it as is only if they share the work on purpose.`
    });
  }

  const invokedByName = new Set(
    facts.services.flatMap((service) =>
      connectedServices(service, facts.services).filter((name) =>
        facts.services.some((target) => target.name === name && target.functionEntrypoint !== undefined)
      )
    )
  );
  const dockerfileOwners = facts.services.filter((candidate) => candidate.dockerfile !== undefined);
  const browserCalledServices = new Set(
    facts.services.flatMap((service) =>
      service.environmentVariables.flatMap((variable) =>
        variable.role === 'build-time' && variable.targetServiceName !== undefined ? [variable.targetServiceName] : []
      )
    )
  );

  for (const [index, service] of facts.services.entries()) {
    const name = resourceNames[index]!;
    const classification = classifyService(service);
    const siblingDockerfile =
      service.dockerfile === undefined
        ? dockerfileOwners.find((candidate) => candidate.path === service.path)
        : undefined;
    const connectTo = [
      ...new Set(
        [
          ...facts.dependencies
            .filter((dependency) => dependency.consumedBy.includes(service.name))
            .map((dependency) => dependencyResourceNames.get(dependency.name)),
          ...connectedServices(service, facts.services).map((serviceName) => serviceResourceNames.get(serviceName))
        ].filter((value): value is string => value !== undefined)
      )
    ];
    const requiresVpc = facts.dependencies.some((dependency) => {
      if (!dependency.consumedBy.includes(service.name)) return false;
      const resourceName = dependencyResourceNames.get(dependency.name);
      return (
        resourceName !== undefined && (privateDatabaseResourceNames.has(resourceName) || dependency.kind === 'redis')
      );
    });

    const environment = environmentFor(service, {
      serviceResourceNames,
      services: facts.services,
      httpApiGatewayName,
      composedDependencies,
      sqliteFiles,
      projectName,
      userPoolNames
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
        // The user pool's own note names the variable to set.
        !userPoolNames.has(variable.dependencyName) &&
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
        variable.targetServiceProperty !== 'url' &&
        !environment.some((entry) => entry.name === variable.name)
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
      // A topic or queue only a publish or send call proves (`messaging-calls.ts`). Without one, the variable can name
      // the app's own resource or another project's, so init creates none and says what to add. Only an ARN or a queue
      // URL is surely SNS or SQS: `SST_TOPIC` is an IoT topic, `JOBS_QUEUE` can be a BullMQ queue.
      const namedKind = SNS_SQS_ADDRESS.test(variable.name) ? resourceKindNamedBy(variable.name) : undefined;
      const messaging = namedKind === undefined ? undefined : MESSAGING_VARIABLE_LABELS[namedKind];
      if (messaging !== undefined) {
        const param = wiringFor(messaging.kind, variable.name);
        const address =
          param.kind === 'param' ? `$ResourceParam('<${messaging.kind} name>', '${param.param}')` : 'its address';
        gaps.push({
          subject: `${service.name}.${variable.name}`,
          message: `${variable.name} names ${messaging.label}, but no ${messaging.call} call in the code takes its target from it, so init created none. If the app owns it, add an ${messaging.resourceType}, list it in connectTo on ${name} and set ${variable.name} to ${address}. If it belongs to another project, set ${variable.name} to its address. Do this before deploying.`
        });
        continue;
      }
      // An address the code sends requests to (`fetch(process.env.API_URL + '/me')`) is how it reaches another service.
      // Left empty, every one of those requests fails, so it is a named gap rather than one more optional setting.
      if (
        variable.requestedOverHttp === true &&
        ADDRESS_VARIABLE.test(variable.name) &&
        !NOT_A_SERVICE_ADDRESS.test(variable.name)
      ) {
        gaps.push({
          subject: `${service.name}.${variable.name}`,
          message: `${service.name} reads ${variable.name}, an address nothing in the configuration sets, and init could not tell which service it points at. Before deploying, set ${variable.name} in ${name}'s environment: $ResourceParam('<resource name>', 'url') for one of your services, or the address of an outside one.`
        });
        continue;
      }
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
      ...(projectUserPools.length === 1 && dependencyResourceNames.has(projectUserPools[0]!.name)
        ? { userPoolResourceName: dependencyResourceNames.get(projectUserPools[0]!.name)! }
        : {}),
      profile,
      packageManager: facts.packageManager,
      requiresVpc,
      ...(siblingDockerfile === undefined ? {} : { siblingDockerfile })
    });
    if (
      service.containerHealthCheck !== undefined &&
      resources[name]!.type !== 'function' &&
      resources[name]!.properties.internalHealthCheck === undefined
    ) {
      gaps.push({
        subject: `${service.name}.internalHealthCheck`,
        message: `Your deployment files check ${service.name}'s health with ${service.containerHealthCheck.command.slice(1).join(' ')}, but ${name} is not packaged from the Dockerfile that command was written for, so it has no health check. Before deploying, add an internalHealthCheck its image can run, or package it from its Dockerfile.`
      });
    }
    const servesUrl = service.functionTriggers.some((trigger) => trigger.type === 'url');
    // A browser that calls the URL itself (a `VITE_`/`PUBLIC_` address) needs CORS on it; a server-side caller does not.
    if (servesUrl && browserCalledServices.has(service.name)) {
      resources[name]!.properties.url = { enabled: true, cors: { enabled: true } };
    }
    provenance[name] = {
      reason: servesUrl
        ? `${classification.reason} Its function URL is public (authMode NONE): anyone with the URL can call it. Set url.authMode to AWS_IAM to require signed requests.`
        : classification.reason,
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
    // A Compose named volume is storage the repository says must outlive the container. Services that mount the same
    // volume share one disk, as they do under Compose.
    for (const volume of service.persistentVolumes ?? []) {
      if (!VOLUME_RESOURCE_TYPES.has(classification.resourceType)) {
        gaps.push({
          subject: `${service.name}.volume`,
          message: `${service.name} keeps files in the ${volume.name} volume at ${volume.mountPath}, but it runs as a ${classification.resourceType}, which has no disk that survives a restart. Before deploying, move that data to a bucket or a database.`
        });
        continue;
      }
      // A subpath is a directory of the volume; the disk's access point roots the mount there.
      const subdirectory =
        volume.subpath === undefined ? undefined : posix.normalize(volume.subpath).replace(/\/$/, '');
      if (
        subdirectory !== undefined &&
        (subdirectory.startsWith('/') || subdirectory === '..' || subdirectory.startsWith('../'))
      ) {
        gaps.push({
          subject: `${service.name}.volume`,
          message: `${service.name} mounts ${volume.subpath} of the ${volume.name} volume at ${volume.mountPath}, a path outside the volume, so we did not mount it. Before deploying, give it a subpath inside the volume.`
        });
        continue;
      }
      let filesystemName = persistentVolumeResources.get(volume.name);
      if (filesystemName === undefined) {
        filesystemName = uniqueName(`${volume.name}Volume`, taken);
        persistentVolumeResources.set(volume.name, filesystemName);
        resources[filesystemName] = { type: 'efs-filesystem', properties: { backupEnabled: true } };
        provenance[filesystemName] = {
          reason: `Your Compose file keeps the ${volume.name} volume, so this disk keeps its files through deploys and restarts. It starts empty: copy existing files onto it if the app needs them.`,
          evidence: service.evidence.slice(0, 2)
        };
      }
      const properties = resources[name]!.properties;
      properties.volumeMounts = [
        ...((properties.volumeMounts as unknown[] | undefined) ?? []),
        {
          type: 'efs',
          properties: {
            efsFilesystemName: filesystemName,
            ...(subdirectory === undefined || subdirectory === '.' ? {} : { rootDirectory: `/${subdirectory}` }),
            mountPath: volume.mountPath,
            ...(volume.readOnly === true ? { readOnly: true } : {})
          }
        }
      ];
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
    const unreadOutputConfig = service.servesStaticAssets?.unreadOutputConfig;
    if (classification.resourceType === 'hosting-bucket' && unreadOutputConfig !== undefined) {
      gaps.push({
        subject: `${service.name}.uploadDirectoryPath`,
        message: `${unreadOutputConfig} decides where the build writes, in a way init could not read, so uploadDirectoryPath: ${service.servesStaticAssets!.path} is only the default. Set it to the directory your build writes before deploying.`
      });
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
    // Without the project's own pool there is nothing init can attach; the route stays as it is on main, public.
    if (
      projectUserPools.length !== 1 &&
      service.functionTriggers.some((trigger) => trigger.type === 'http' && trigger.authorization === 'jwt')
    ) {
      gaps.push({
        subject: `${service.name}.authorizer`,
        message: `${service.name} reads the claims of a JWT authorizer, but init found no user pool this project creates, so its route has no authorizer: anyone can call it and the claims arrive empty. Before deploying, add a cognito authorizer for your user pool, or a lambda authorizer that checks your tokens, to its http-api-gateway event.`
      });
    }
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'http' || trigger.pathParameters === undefined) continue;
      const missing = trigger.pathParameters.filter((parameter) => !trigger.path.includes(`{${parameter}}`));
      if (missing.length === 0) continue;
      gaps.push({
        subject: `${service.name}.route`,
        message: `${service.name} reads the path ${missing.length === 1 ? 'parameter' : 'parameters'} ${missing.join(', ')}, but init could not tell its route, so it takes every request on ${trigger.path} and ${missing.length === 1 ? 'that parameter arrives' : 'those parameters arrive'} empty. Before deploying, set its http-api-gateway event to the route that defines ${missing.map((parameter) => `{${parameter}}`).join(' and ')}.`
      });
    }
    for (const trigger of service.functionTriggers) {
      if (trigger.type !== 'unmapped') continue;
      // The caller already gets the function's ARN and connectTo from the variable it reads.
      if (trigger.sourceType === DIRECT_INVOCATION_SOURCE && invokedByName.has(service.name)) continue;
      // The import gap already names the setting that left it out.
      if (trigger.reason === 'import-gap') continue;
      if (trigger.reason !== undefined) {
        gaps.push({
          subject: `${service.name}.trigger`,
          message:
            trigger.reason === 'protected-route'
              ? `${service.name} serves ${trigger.sourceType}. Stacktape cannot reproduce that protection, so we left the route out rather than make it public. Before deploying, add it back to the function's http-api-gateway events with a Stacktape authorizer (cognito, lambda or aws-iam).`
              : `Your deployment files disable ${trigger.sourceType} for ${service.name}, so we left it out and it does not start running. Add it to the function's events when you want it on.`
        });
        continue;
      }
      gaps.push({
        subject: service.name,
        message:
          trigger.sourceType === UNROUTED_HTTP_SOURCE
            ? `${service.name} handles HTTP requests, and so do other handlers, but the code does not say which route each one serves. Add an http-api-gateway event with its method and path to each of them before deploying; only one handler can take the catch-all route.`
            : trigger.sourceType === DIRECT_INVOCATION_SOURCE
              ? `Your code invokes ${service.name} directly with the Lambda Invoke API. Before deploying, give the workload that calls it connectTo: [${name}] and pass it the function's ARN with $ResourceParam('${name}', 'arn').`
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

  for (const importGap of facts.importGaps) {
    gaps.push({ subject: `${importGap.file}:${importGap.object}`, message: importGapMessage(importGap) });
  }

  for (const handler of facts.handlerFindings) {
    if (handler.reason === 'container-image') {
      const directory = posix.dirname(handler.path);
      const zipFunction = facts.services.find(
        (service) =>
          service.functionEntrypoint !== undefined &&
          (directory === '.' || service.functionEntrypoint.startsWith(`${directory}/`)) &&
          serviceResourceNames.has(service.name)
      );
      const raw =
        'an AWS::Lambda::Function with PackageType: Image under cloudformationResources, and push the image to ECR yourself';
      const zipName = zipFunction === undefined ? undefined : serviceResourceNames.get(zipFunction.name);
      gaps.push({
        subject: handler.path,
        message:
          zipFunction === undefined
            ? `${handler.path} builds a container-image Lambda function. Stacktape packages functions as zip archives only, so init created nothing for it. To deploy it, add ${raw}.`
            : `${handler.path} builds a container-image Lambda function. Stacktape packages functions as zip archives only, so init deploys the ${zipName} function from ${zipFunction.functionEntrypoint} as a zip archive and runs no container for the Dockerfile. That works when the handler needs nothing the image adds. If it needs the image, replace the ${zipName} function with ${raw}.`
      });
      continue;
    }
    if (handler.reason === 'java-package') {
      const folder = posix.basename(posix.dirname(handler.path));
      const className = posix.basename(handler.path, '.java');
      gaps.push({
        subject: handler.path,
        message: `${className} is in ${handler.packageName === undefined ? 'the default package' : `package ${handler.packageName}`}, but Stacktape currently builds a Java handler from the class's folder: ${folder}.${className}::handleRequest. Lambda cannot load that class, so every invocation fails. Until Stacktape builds the handler from the package, put ${className} in package ${folder}.`
      });
      continue;
    }
    gaps.push({
      subject: handler.path,
      message:
        handler.reason === 'no-build-file'
          ? handler.language === 'Go'
            ? `${handler.path} looks like a Go Lambda handler, but init found no go.mod that builds it, so it created no function for it. If it should deploy, add a go.mod for it and a function with buildpack packaging and entryfilePath: ${handler.path}.`
            : `${handler.path} looks like a ${handler.language} Lambda handler, but init found no ${handler.language === 'Java' ? 'pom.xml or build.gradle' : '.csproj project file'} that builds it, so it created no function for it. If it should deploy, add a function with buildpack packaging, its entryfilePath and its handlerFunction.`
          : `${handler.path} looks like a ${handler.language} Lambda handler. Init does not create ${handler.language} functions yet. If it should deploy, add a function with buildpack packaging and entryfilePath: ${handler.path}.`
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

/** Java and .NET Lambda runtimes. The build compiles for the declared release, and the function has to run it. */
const COMPILED_RUNTIMES: Readonly<Record<string, ReadonlySet<string>>> = {
  java: new Set(['11', '17', '21', '25']),
  dotnet: new Set(['6', '8', '10'])
};

const compiledRuntime = (service: ServiceFact): { runtime?: string } => {
  const version = service.runtimeVersion;
  if (version === undefined || COMPILED_RUNTIMES[service.language]?.has(version) !== true) return {};
  return { runtime: `${service.language}${version}` };
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
  userPoolResourceName,
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
  /** The project's own user pool, whose tokens a JWT-protected route checks. */
  userPoolResourceName?: string;
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
              ...(trigger.payloadFormat === '2.0' ? { payloadFormat: '2.0' } : {}),
              ...(trigger.authorization === 'aws-iam' ? { authorizer: { type: 'aws-iam' } } : {}),
              ...(trigger.authorization === 'jwt' && userPoolResourceName !== undefined
                ? { authorizer: { type: 'cognito', properties: { userPoolName: userPoolResourceName } } }
                : {})
            }
          });
        }
        continue;
      }
      if (trigger.type === 'schedule') {
        events.push({
          type: 'schedule',
          properties: {
            scheduleRate: normalizeScheduleExpression(trigger.rate),
            ...(trigger.enabled === false ? { enabled: false } : {}),
            ...(trigger.input === undefined ? {} : { input: trigger.input }),
            ...(trigger.inputPath === undefined ? {} : { inputPath: trigger.inputPath })
          }
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
            ...(trigger.batchSize === undefined ? {} : { batchSize: trigger.batchSize }),
            ...(trigger.maxBatchWindowSeconds === undefined
              ? {}
              : { maxBatchWindowSeconds: trigger.maxBatchWindowSeconds }),
            ...(trigger.reportBatchItemFailures === true ? { reportBatchItemFailures: true } : {})
          }
        });
        continue;
      }
      if (trigger.type === 'topic') {
        events.push({
          type: 'sns',
          properties: {
            snsTopicName: dependencyName,
            ...(trigger.filterPolicy === undefined ? {} : { filterPolicy: trigger.filterPolicy })
          }
        });
        continue;
      }
      events.push({
        type: 's3',
        properties: {
          bucketArn: `$ResourceParam('${dependencyName}', 'arn')`,
          s3EventType: trigger.eventType ?? 's3:ObjectCreated:*',
          ...(trigger.keyPrefix === undefined && trigger.keySuffix === undefined
            ? {}
            : {
                filterRule: {
                  ...(trigger.keyPrefix === undefined ? {} : { prefix: trigger.keyPrefix }),
                  ...(trigger.keySuffix === undefined ? {} : { suffix: trigger.keySuffix })
                }
              })
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
        ...compiledRuntime(service),
        ...(service.functionTimeoutSeconds === undefined ? {} : { timeout: service.functionTimeoutSeconds }),
        ...(service.functionMemoryMb === undefined ? {} : { memory: service.functionMemoryMb }),
        ...(service.functionArchitecture === undefined ? {} : { architecture: service.functionArchitecture }),
        ...(service.functionReservedConcurrency === undefined
          ? {}
          : { reservedConcurrency: service.functionReservedConcurrency }),
        ...(service.functionLayers === undefined ? {} : { layers: [...service.functionLayers] }),
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
    const events = [
      ...(service.schedule === undefined
        ? []
        : [{ type: 'schedule', properties: { scheduleRate: normalizeScheduleExpression(service.schedule) } }]),
      // A job each queue message starts.
      ...service.functionTriggers.flatMap((trigger) => {
        const queueName = trigger.type === 'queue' ? dependencyResourceNames.get(trigger.dependencyName) : undefined;
        return queueName === undefined ? [] : [{ type: 'sqs', properties: { sqsQueueName: queueName } }];
      })
    ];
    return {
      type: 'batch-job',
      properties: {
        // A job's variables belong to its container.
        container: {
          packaging: packagingFor(service, packageManager, siblingDockerfile),
          ...(environment.length > 0 ? { environment } : {})
        },
        // AWS Batch takes whole vCPUs on EC2 compute environments.
        resources: { ...profile.container, cpu: Math.max(1, Math.ceil(profile.container.cpu)) },
        ...(events.length === 0 ? {} : { events }),
        ...(connectTo.length > 0 ? { connectTo: [...connectTo] } : {})
      }
    };
  }

  // No health check is guessed. Stacktape's `internalHealthCheck` takes a container command, not an HTTP path, and a
  // guessed command — `curl` against a buildpack image that may not ship curl — produces a container that never reports
  // healthy and a deploy that hangs until it times out. A command the deployment manifest declares is carried into the
  // image it was written for, the one its Dockerfile builds; other packaging may not ship what it runs.
  const packaging = packagingFor(service, packageManager, siblingDockerfile);
  const healthCheck =
    service.containerHealthCheck === undefined || packaging.type !== 'dockerfile'
      ? undefined
      : {
          healthCheckCommand: [...service.containerHealthCheck.command],
          ...(service.containerHealthCheck.intervalSeconds === undefined
            ? {}
            : { intervalSeconds: Math.min(300, Math.max(5, service.containerHealthCheck.intervalSeconds)) }),
          ...(service.containerHealthCheck.timeoutSeconds === undefined
            ? {}
            : { timeoutSeconds: Math.min(60, Math.max(2, service.containerHealthCheck.timeoutSeconds)) }),
          ...(service.containerHealthCheck.retries === undefined
            ? {}
            : { retries: Math.min(10, service.containerHealthCheck.retries) }),
          ...(service.containerHealthCheck.startPeriodSeconds === undefined
            ? {}
            : { startPeriodSeconds: Math.min(300, service.containerHealthCheck.startPeriodSeconds) })
        };
  return {
    type: resourceType,
    properties: {
      packaging,
      ...(healthCheck === undefined ? {} : { internalHealthCheck: healthCheck }),
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
      // The default HTTP API closes every connection after one response. WebSockets and streamed responses need an
      // Application Load Balancer, the one web-service ingress that keeps a connection open.
      ...(resourceType === 'web-service' && service.longLivedConnections !== 'none'
        ? {
            loadBalancing: { type: 'application-load-balancer' },
            alarms: [
              {
                description: 'Web service returns errors on more than 10% of requests',
                trigger: { type: 'application-load-balancer-error-rate', properties: { thresholdPercent: 10 } },
                evaluation: { period: 300, evaluationPeriods: 3, breachedPeriods: 2 },
                includeInHistory: true
              }
            ]
          }
        : resourceType === 'web-service'
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
