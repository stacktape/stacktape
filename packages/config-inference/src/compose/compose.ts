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
import type { DependencyFact } from '../facts/dependency';
import { AWS_DEPLOYMENT_TOOLS, DEPLOYMENT_TOOL_LABELS } from '../facts/existing-deployment';
import type { PackageManager, ProjectFacts } from '../facts/project-facts';
import { posix } from 'node:path';
import type { ServiceFact } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { resolveAssumptions, type Assumption } from './assumptions';
import { classifyService, type ServiceResourceType } from './classify';
import { resolveEngineVersion, type EngineVersionCatalogue } from './engine-versions';
import { generatedDatabasePasswordSecretReference, secretNameFor, wiringFor } from './env-wiring';
import { composeMigrationHooks } from './migrations';
import { monorepoPackaging } from './monorepo';
import { DEFAULT_MODE, MODE_PROFILES, type InfrastructureMode, type ModeProfile } from './modes';

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
  /** Deploy-time scripts, referenced from `hooks`. Emitted for detected database migrations. */
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

export type CompositionResult = {
  config: ComposedConfig;
  /** Keyed by resource name. */
  provenance: Record<string, Provenance>;
  gaps: CompositionGap[];
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
  /** The sizing profile this configuration was built for. */
  mode: InfrastructureMode;
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
  'kafka'
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
  'kafka'
]);

const DEPENDENCY_LABELS: Partial<Record<DependencyFact['kind'], string>> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  mongodb: 'MongoDB',
  redis: 'Redis',
  amqp: 'the message broker',
  search: 'the search service',
  kafka: 'Kafka'
};

const dependencyLabel = (kind: DependencyFact['kind']): string => DEPENDENCY_LABELS[kind] ?? kind;

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
const SUPPORTED_PYTHON_VERSIONS: ReadonlySet<number> = new Set([2.7, 3.6, 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14]);

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
  if (service.language === 'python') {
    const version = Number.parseFloat(service.runtimeVersion);
    return SUPPORTED_PYTHON_VERSIONS.has(version) ? { pythonVersion: version } : {};
  }
  return {};
};

const packagingFor = (
  service: ServiceFact,
  packageManager: PackageManager | undefined,
  suppressNixpacksRelease = false
): Record<string, unknown> => {
  const buildRoot = service.buildRoot ?? service.path;
  if (service.dockerfile !== undefined) {
    // Their Dockerfile is the most faithful description of how this runs that exists. Use it.
    return {
      type: 'custom-dockerfile',
      properties: {
        buildContextPath: buildRoot,
        // Facts keep repository-relative evidence paths; Stacktape expects this one relative to the
        // build context.
        dockerfilePath: buildRoot === '.' ? service.dockerfile : posix.relative(buildRoot, service.dockerfile)
      }
    };
  }
  if (service.containerEntrypoint !== undefined) {
    const pythonRunMode =
      service.framework === 'fastapi' || service.framework === 'starlette'
        ? 'ASGI'
        : service.framework === 'flask' || service.framework === 'django'
          ? 'WSGI'
          : undefined;
    const languageSpecificConfig = {
      ...(pythonRunMode === undefined ? {} : { runAppAs: pythonRunMode }),
      ...runtimeVersionConfig(service)
    };
    return {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: service.containerEntrypoint,
        ...(Object.keys(languageSpecificConfig).length === 0 ? {} : { languageSpecificConfig })
      }
    };
  }
  // A workspace member that imports internal packages must be installed and built from the root,
  // or its `workspace:*` specifiers fail before the first resource exists.
  const monorepo = monorepoPackaging(service, packageManager);
  const nixpacks =
    monorepo?.packaging ??
    // Nixpacks detects the language and builds without anyone writing a Dockerfile, which is the
    // whole promise for a user who does not want to learn containers.
    ({
      type: 'nixpacks',
      properties: {
        sourceDirectoryPath: buildRoot,
        ...(service.startCommand === undefined ? {} : { startCmd: service.startCommand })
      }
    } as { type: 'nixpacks'; properties: Record<string, unknown> });

  if (suppressNixpacksRelease) {
    // Nixpacks' Procfile provider replays `release:` as an image-build step, where the database the
    // migration needs does not exist yet. The deploy owns that migration as an `afterDeploy` hook,
    // so the build-time copy is neutralised with a no-op phase.
    const phases = (nixpacks.properties.phases as Array<{ name: string; cmds: string[] }> | undefined) ?? [];
    nixpacks.properties = { ...nixpacks.properties, phases: [...phases, { name: 'release', cmds: ['true'] }] };
  }
  return nixpacks;
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
    projectName: string | undefined;
  }
): Array<{ name: string; value: unknown }> => {
  const { serviceResourceNames, composedDependencies, projectName } = context;
  const variables: Array<{ name: string; value: unknown }> = [];

  for (const variable of service.environmentVariables) {
    if (variable.role === 'infra-dependency') {
      if (variable.dependencyName === undefined) continue;
      const composed = composedDependencies.get(variable.dependencyName);
      if (composed === undefined) {
        const secretName = secretNameFor(variable.name);
        if (secretName !== undefined) {
          variables.push({ name: variable.name, value: `$Secret('${secretName}')` });
        }
        continue;
      }
      // `connectTo` grants the access, but it injects `STP_*`-prefixed values — the application
      // reads the name it was written with, so that name gets the parameter explicitly.
      const wiring = wiringFor(composed.kind, variable.name);
      if (wiring.kind === 'param') {
        variables.push({
          name: variable.name,
          value: `$ResourceParam('${composed.resourceName}', '${wiring.param}')`
        });
      } else if (wiring.kind === 'password-secret') {
        variables.push({ name: variable.name, value: secretReference(projectName, composed.resourceName) });
      }
      continue;
    }
    if (variable.role === 'third-party-secret') {
      const secretName = secretNameFor(variable.name);
      if (secretName !== undefined) {
        variables.push({ name: variable.name, value: `$Secret('${secretName}')` });
      }
      continue;
    }
    if (variable.role === 'runtime-config' && variable.hasDeclaredValue) {
      const secretName = secretNameFor(variable.name);
      if (secretName !== undefined) {
        variables.push({ name: variable.name, value: `$Secret('${secretName}')` });
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

const composeDependency = (
  dependency: DependencyFact,
  profile: ModeProfile,
  projectName: string | undefined,
  engineVersions: EngineVersionCatalogue | undefined
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
          ...(profile.database.deletionProtection ? { deletionProtection: true } : {}),
          automatedBackupRetentionDays: profile.database.backupRetentionDays
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
          properties: profile.bucket.versioning ? { versioning: true } : {}
        },
        reason: 'Your code reads and writes object storage.'
      };
    case 'dynamodb':
      return {
        resource: {
          type: 'dynamo-db-table',
          properties: {
            primaryKey: { partitionKey: { name: 'pk', type: 'string' } }
          }
        },
        reason: 'Your code uses DynamoDB.'
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
    case 'sqlite':
      // Not a resource at all. A SQLite file on a container filesystem disappears on the next
      // deploy, so this has to reach the user as a decision rather than as infrastructure.
      return {
        unsupported: 'SQLite runs inside your application, so there is nothing to create for it.'
      };
    case 'email':
      return {
        unsupported: 'Sending email uses SES, which is configured on your domain rather than created as a resource.'
      };
    case 'kafka':
      return {
        unsupported: 'Managed Kafka is not something Stacktape creates for you yet.'
      };
    case 'amqp':
      return {
        unsupported:
          'This application requires a RabbitMQ-compatible AMQP broker; substituting SQS would not be compatible.'
      };
    case 'mongodb':
      return {
        // Atlas requires an explicit tier. M10 is its smallest dedicated tier and the conservative
        // default used throughout Stacktape's own MongoDB documentation; omitting it produces YAML
        // that the real config schema rejects before deployment starts.
        resource: { type: 'mongo-db-atlas-cluster', properties: { clusterTier: 'M10' } },
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
  mode = DEFAULT_MODE,
  decisions = {},
  engineVersions
}: {
  facts: ProjectFacts;
  projectName?: string;
  /** How much infrastructure to ask for. The one thing no amount of reading the code can tell us. */
  mode?: InfrastructureMode;
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
  const profile = MODE_PROFILES[mode];
  // Every open question is answered here, before anything is composed. The result is a complete
  // configuration and a list of what was decided — not a half-configuration and a list of prompts.
  const { facts, assumptions } = resolveAssumptions(input, decisions);

  const resources: Record<string, ComposedResource> = {};
  const provenance: Record<string, Provenance> = {};
  const gaps: CompositionGap[] = [];
  const taken = new Set<string>();

  const dependencyResourceNames = new Map<string, string>();
  /** Dependency names we are actually creating, so a variable pointing at one we are not can say so. */
  const composedDependencyNames = new Set<string>();
  /** The same set with the kind and resource name attached, for wiring variables to parameters. */
  const composedDependencies = new Map<string, { kind: DependencyFact['kind']; resourceName: string }>();
  /** Variables a service needs because we decided *not* to create what they address, by service name. */
  const externalVariables = new Map<string, Array<{ name: string; value: unknown }>>();
  for (const dependency of facts.dependencies) {
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

    const composed = composeDependency(dependency, profile, projectName, engineVersions);
    if ('unsupported' in composed) {
      gaps.push({ subject: dependency.name, message: composed.unsupported });
      if (dependency.kind === 'sqlite') {
        assumptions.push({
          id: `sqlite:${dependency.name}`,
          kind: 'sqlite-persistence',
          chosen: 'migrate-to-managed-database',
          alternatives: ['migrate-to-managed-database', 'persistent-volume', 'accept-ephemeral'],
          parameters: { serviceName: dependency.consumedBy[0] ?? 'app' },
          evidence: [...dependency.evidence],
          notable: true
        });
      }
      continue;
    }
    const name = uniqueName(dependency.name, taken);
    dependencyResourceNames.set(dependency.name, name);
    composedDependencyNames.add(dependency.name);
    composedDependencies.set(dependency.name, { kind: dependency.kind, resourceName: name });
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

  const httpTriggeredServices = facts.services.filter((service) =>
    service.functionTriggers.some((trigger) => trigger.type === 'http')
  );
  const httpApiGatewayName = httpTriggeredServices.length === 0 ? undefined : uniqueName('httpApiGateway', taken);
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

  // Detected migrations become the documented pattern: a local-script the deploy runs afterwards.
  // Without this, the migration decision card describes a hook that does not exist and the first
  // deploy ships a schema-less database. Computed before the services so their packaging can know
  // which migrations this deploy now owns.
  const migrationHooks = composeMigrationHooks({
    migrations: facts.migrations,
    services: facts.services,
    dependencies: facts.dependencies,
    composedDependencies,
    assumptions,
    projectName
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

  for (const [index, service] of facts.services.entries()) {
    const name = resourceNames[index]!;
    const classification = classifyService(service);
    const connectTo = facts.dependencies
      .filter((dependency) => dependency.consumedBy.includes(service.name))
      .map((dependency) => dependencyResourceNames.get(dependency.name))
      .filter((value): value is string => value !== undefined);

    const environment = environmentFor(service, { serviceResourceNames, composedDependencies, projectName });
    // The agent path may already have written the same variable from the service's own facts, so the
    // first entry for a name wins rather than the file carrying it twice.
    for (const extra of externalVariables.get(service.name) ?? []) {
      if (!environment.some((entry) => entry.name === extra.name)) environment.push(extra);
    }

    const declaredRuntimeSettings = service.environmentVariables
      .filter((variable) => variable.role === 'runtime-config' && variable.hasDeclaredValue)
      .map((variable) => ({ name: variable.name, secretName: secretNameFor(variable.name) }))
      .filter((variable): variable is { name: string; secretName: string } => variable.secretName !== undefined)
      .toSorted((left, right) => left.name.localeCompare(right.name));

    for (const variable of service.environmentVariables) {
      if (
        variable.role === 'infra-dependency' &&
        variable.dependencyName !== undefined &&
        !composedDependencyNames.has(variable.dependencyName) &&
        // The kept-external branch above says this better, naming the provider it is leaving alone.
        !gaps.some((gap) => gap.subject === `${service.name}.${variable.name}`)
      ) {
        gaps.push({
          subject: `${service.name}.${variable.name}`,
          message: `${variable.name} points at something we are not creating, so put its value in the ${variable.name.toLowerCase()} secret before deploying.`
        });
      }
      if (variable.role === 'build-time') {
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
      connectTo,
      dependencyResourceNames,
      ...(httpApiGatewayName === undefined ? {} : { httpApiGatewayName }),
      profile,
      packageManager: facts.packageManager,
      // This deploy owns the migration, so the image build must not replay it. Nixpacks' Procfile
      // provider runs `release:` at build time, where the database this migration needs does not
      // exist — caught on the first real-AWS run of the validation lane.
      suppressNixpacksRelease: migrationHooks.hookedServices.includes(service.name)
    });
    provenance[name] = {
      reason: classification.reason,
      evidence: classification.evidence
    };

    // Root-context builds can carry a stated limitation; the packaging itself is emitted inside
    // `buildServiceResource`, and the caveat belongs next to the other honest omissions. Only the
    // container shapes reach the Nixpacks branch — framework `-web` resources, hosting buckets and
    // functions package themselves.
    const usesNixpacksPackaging =
      (classification.resourceType === 'web-service' ||
        classification.resourceType === 'worker-service' ||
        classification.resourceType === 'private-service' ||
        classification.resourceType === 'batch-job') &&
      service.dockerfile === undefined &&
      service.containerEntrypoint === undefined;
    const monorepoCaveat = usesNixpacksPackaging ? monorepoPackaging(service, facts.packageManager)?.caveat : undefined;
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
    if (classification.resourceType === 'function' && service.functionTriggers.length === 0) {
      gaps.push({
        subject: service.name,
        message: `We found the ${service.name} handler but no event that invokes it. Add its HTTP, queue, topic, bucket or schedule trigger.`
      });
    }
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
      message: AWS_DEPLOYMENT_TOOLS.has(deployment.tool)
        ? `This project has ${label} deployment files. What we wrote is a separate stack: it does not read, change, or take over anything those files may manage.`
        : `This project has ${label} deployment config. If an app is already running there, deploying this creates a second copy on AWS and leaves the current one untouched.`
    });
  }

  // Several probes can establish the same missing user action for two views of one codebase. The
  // subject remains useful internally, but repeating identical prose makes the review look more
  // dangerous and more laborious than it is. The first occurrence has the strongest provenance
  // because probe order is deliberate.
  const uniqueGaps = [...new Map(gaps.map((gap) => [gap.message, gap])).values()];

  return {
    config: {
      ...(projectName === undefined ? {} : { projectName }),
      resources,
      ...(Object.keys(migrationHooks.scripts).length === 0
        ? {}
        : { scripts: migrationHooks.scripts, hooks: { afterDeploy: migrationHooks.afterDeploy } })
    },
    provenance,
    gaps: uniqueGaps,
    assumptions,
    // Anything `resolveAssumptions` could not decide. Normally none.
    unresolved: facts.uncertainties,
    mode,
    // Which resource each service became, for anything that has to walk from facts to config —
    // the preflight verifier being the first consumer.
    serviceResources: Object.fromEntries(serviceResourceNames),
    // The only thing that makes a configuration undeployable is having nothing in it.
    deployable: Object.keys(resources).length > 0
  };
};

const buildServiceResource = ({
  resourceType,
  service,
  environment,
  connectTo,
  dependencyResourceNames,
  httpApiGatewayName,
  profile,
  packageManager,
  suppressNixpacksRelease
}: {
  resourceType: ServiceResourceType;
  service: ServiceFact;
  environment: Array<{ name: string; value: unknown }>;
  connectTo: readonly string[];
  dependencyResourceNames: ReadonlyMap<string, string>;
  httpApiGatewayName?: string;
  profile: ModeProfile;
  packageManager: PackageManager | undefined;
  suppressNixpacksRelease: boolean;
}): ComposedResource => {
  const shared = {
    ...(environment.length > 0 ? { environment } : {}),
    ...(connectTo.length > 0 ? { connectTo: [...connectTo] } : {})
  };

  if (resourceType === 'hosting-bucket') {
    const buildRoot = service.buildRoot ?? service.path;
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
            })
      }
    };
  }

  if (resourceType === 'function') {
    const events: Array<{ type: string; properties: Record<string, unknown> }> = [];
    for (const trigger of service.functionTriggers) {
      if (trigger.type === 'http') {
        if (httpApiGatewayName !== undefined) {
          events.push({
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName,
              method: trigger.method.toUpperCase(),
              path: trigger.path
            }
          });
        }
        continue;
      }
      if (trigger.type === 'schedule') {
        events.push({
          type: 'schedule',
          properties: { scheduleRate: trigger.rate }
        });
        continue;
      }
      const dependencyName = dependencyResourceNames.get(trigger.dependencyName);
      if (dependencyName === undefined) continue;
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
    return {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: { entryfilePath: service.functionEntrypoint }
        },
        ...(events.length === 0 ? {} : { events }),
        ...shared
      }
    };
  }

  if (resourceType.endsWith('-web')) {
    // The framework resources take the application directory and handle their own build.
    return {
      type: resourceType,
      properties: { appDirectory: service.path, ...shared }
    };
  }

  if (resourceType === 'batch-job') {
    return {
      type: 'batch-job',
      properties: {
        container: { packaging: packagingFor(service, packageManager, suppressNixpacksRelease) },
        resources: { ...profile.container },
        ...(service.schedule === undefined
          ? {}
          : {
              events: [
                {
                  type: 'schedule',
                  properties: { scheduleRate: service.schedule }
                }
              ]
            }),
        ...shared
      }
    };
  }

  // No health check is emitted on purpose. Stacktape's `internalHealthCheck` takes a container
  // command, not an HTTP path, and a guessed command — `curl` against a nixpacks image that may not
  // ship curl — produces a container that never reports healthy and a deploy that hangs until it
  // times out. The platform defaults are correct far more often than a guess, and the observed
  // `healthCheckPath` is better spent on load-balancer configuration once that is modelled.
  return {
    type: resourceType,
    properties: {
      packaging: packagingFor(service, packageManager, suppressNixpacksRelease),
      resources: { ...profile.container },
      // Scaling is only meaningful for something that stays up. A batch job is sized, not scaled.
      scaling: {
        minInstances: profile.scaling.minInstances,
        maxInstances: profile.scaling.maxInstances
      },
      ...shared
    }
  };
};
