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
import type { ProjectFacts } from '../facts/project-facts';
import type { ServiceFact } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { resolveAssumptions, type Assumption } from './assumptions';
import { classifyService, type ServiceResourceType } from './classify';
import { resolveEngineVersion, type EngineVersionCatalogue } from './engine-versions';
import { DEFAULT_MODE, MODE_PROFILES, type InfrastructureMode, type ModeProfile } from './modes';

/**
 * A resource entry as Stacktape reads it.
 *
 * Deliberately structural rather than the imported `StacktapeConfig` type: the composer builds
 * these bottom-up, and threading the full discriminated union through construction buys nothing
 * that validating the finished document does not buy better.
 */
export type ComposedResource = { type: string; properties: Record<string, unknown> };

export type ComposedConfig = {
  projectName?: string;
  resources: Record<string, ComposedResource>;
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
const secretReference = (projectName: string | undefined, resourceName: string): string =>
  `$Secret('${projectName === undefined ? '' : `${projectName}.`}${resourceName}.password')`;

const packagingFor = (service: ServiceFact): Record<string, unknown> => {
  if (service.dockerfile !== undefined) {
    // Their Dockerfile is the most faithful description of how this runs that exists. Use it.
    return {
      type: 'custom-dockerfile',
      properties: {
        buildContextPath: service.path,
        dockerfilePath: service.dockerfile
      }
    };
  }
  // Nixpacks detects the language and builds without anyone writing a Dockerfile, which is the
  // whole promise for a user who does not want to learn containers.
  return {
    type: 'nixpacks',
    properties: {
      sourceDirectoryPath: service.path,
      ...(service.startCommand === undefined ? {} : { startCmd: service.startCommand })
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
  serviceResourceNames: ReadonlyMap<string, string>,
  composedDependencyNames: ReadonlySet<string>
): Array<{ name: string; value: unknown }> => {
  const variables: Array<{ name: string; value: unknown }> = [];

  for (const variable of service.environmentVariables) {
    if (variable.role === 'infra-dependency') {
      if (variable.dependencyName !== undefined && !composedDependencyNames.has(variable.dependencyName)) {
        variables.push({ name: variable.name, value: `$Secret('${variable.name.toLowerCase()}')` });
      }
      continue; // Otherwise supplied by connectTo.
    }
    if (variable.role === 'third-party-secret') {
      variables.push({ name: variable.name, value: `$Secret('${variable.name.toLowerCase()}')` });
      continue;
    }
    if (variable.role === 'cross-service-reference' && variable.targetServiceName !== undefined) {
      const target = serviceResourceNames.get(variable.targetServiceName);
      if (target !== undefined) {
        variables.push({ name: variable.name, value: `$ResourceParam('${target}', 'url')` });
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
                instanceSize: profile.database.instanceSize,
                ...(profile.database.multiAz ? { multiAz: true } : {})
              },
              version: resolved.version
            }
          },
          ...(profile.database.deletionProtection ? { deletionProtection: true } : {}),
          automatedBackupRetentionDays: profile.database.backupRetentionDays
        }
      },
      reason: `Your code connects to a ${dependency.kind} database.${
        resolved.movedOffPin
          ? ` Version ${dependency.engineVersion} is no longer offered on RDS, so ${resolved.version} is used instead.`
          : ''
      }`
    };
  }

  switch (dependency.kind) {
    case 'redis':
      return {
        resource: {
          type: 'redis-cluster',
          properties: {
            instanceSize: profile.redis.instanceSize,
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
          properties: { primaryKey: { partitionKey: { name: 'pk', type: 'string' } } }
        },
        reason: 'Your code uses DynamoDB.'
      };
    case 'queue':
      return { resource: { type: 'sqs-queue', properties: {} }, reason: 'Your code publishes to a queue.' };
    case 'search':
      return {
        resource: { type: 'open-search-domain', properties: {} },
        reason: 'Your code queries a search index.'
      };
    case 'sqlite':
      // Not a resource at all. A SQLite file on a container filesystem disappears on the next
      // deploy, so this has to reach the user as a decision rather than as infrastructure.
      return { unsupported: 'SQLite runs inside your application, so there is nothing to create for it.' };
    case 'email':
      return {
        unsupported: 'Sending email uses SES, which is configured on your domain rather than created as a resource.'
      };
    case 'kafka':
      return { unsupported: 'Managed Kafka is not something Stacktape creates for you yet.' };
    case 'mongodb':
      return {
        resource: { type: 'mongo-db-atlas-cluster', properties: {} },
        reason: 'Your code connects to MongoDB.'
      };
    default:
      return { unsupported: `No Stacktape resource corresponds to ${dependency.kind}.` };
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
  /** Variables a service needs because we decided *not* to create what they address, by service name. */
  const externalVariables = new Map<string, Array<{ name: string; value: unknown }>>();
  for (const dependency of facts.dependencies) {
    // Something is already running on it. Creating a replacement is the one outcome the user was
    // promised would not happen silently, so composition stops here and asks. Detecting a live
    // Supabase database and then provisioning RDS next to it would be worse than not detecting it.
    if (dependency.currentlyHostedOn !== undefined && EXTERNALLY_HOSTED.has(dependency.currentlyHostedOn)) {
      const decisionId = `external-database:${dependency.name}`;
      // Something is already serving real data from it, so the default is to keep pointing at it —
      // creating a second, empty database beside a live one is the outcome nobody would have wanted.
      const chosen = decisions[decisionId] ?? 'point-at-existing';
      assumptions.push({
        id: decisionId,
        kind: 'external-database-disposition',
        chosen,
        alternatives: ['point-at-existing', 'create-new'],
        parameters: { dependencyName: dependency.name, provider: dependency.currentlyHostedOn },
        evidence: [...dependency.evidence],
        notable: true
      });
      if (chosen === 'point-at-existing') {
        // Leaving it alone still leaves the application needing its address. Nothing creates it, so
        // `connectTo` has nothing to name — and a container deployed without `DATABASE_URL` starts,
        // crashes, and looks like our bug. The variable goes in as a secret reference: the user
        // already has the connection string, we have never read it, and the file stays coherent.
        for (const serviceName of dependency.consumedBy) {
          const forService = externalVariables.get(serviceName) ?? [];
          for (const variableName of dependency.addressedBy) {
            forService.push({ name: variableName, value: `$Secret('${variableName.toLowerCase()}')` });
            gaps.push({
              subject: `${serviceName}.${variableName}`,
              message: `${variableName} points at the database you already have, which we are leaving alone. Put its value in the ${variableName.toLowerCase()} secret before deploying.`
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
    resources[name] = composed.resource;
    provenance[name] = { reason: composed.reason, evidence: dependency.evidence.slice(0, 3) };
  }

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

    const environment = environmentFor(service, serviceResourceNames, composedDependencyNames);
    // The agent path may already have written the same variable from the service's own facts, so the
    // first entry for a name wins rather than the file carrying it twice.
    for (const extra of externalVariables.get(service.name) ?? []) {
      if (!environment.some((entry) => entry.name === extra.name)) environment.push(extra);
    }

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
    }

    resources[name] = buildServiceResource({
      resourceType: classification.resourceType,
      service,
      environment,
      connectTo,
      profile
    });
    provenance[name] = { reason: classification.reason, evidence: classification.evidence };

    if (
      service.startCommand === undefined &&
      service.dockerfile === undefined &&
      classification.resourceType !== 'hosting-bucket'
    ) {
      gaps.push({
        subject: service.name,
        message: `We could not work out how to start ${service.name}. Set the start command in the configuration.`
      });
    }
  }

  // Something else already deploys this repository. We are not going to touch it — but saying so is
  // the difference between a tool that noticed and a tool that did not, and somebody who deploys
  // this without realising they now have two of everything will blame us for the bill.
  for (const deployment of facts.existingDeployments) {
    const label = DEPLOYMENT_TOOL_LABELS[deployment.tool];
    gaps.push({
      subject: deployment.tool,
      message: AWS_DEPLOYMENT_TOOLS.has(deployment.tool)
        ? `This project already deploys with ${label}. What we wrote is a separate stack: it does not read, change, or take over anything ${label} manages.`
        : `This project deploys to ${label} today. Deploying this creates a second copy on AWS, and your ${label} deployment keeps running untouched.`
    });
  }

  return {
    config: {
      ...(projectName === undefined ? {} : { projectName }),
      resources
    },
    provenance,
    gaps,
    assumptions,
    // Anything `resolveAssumptions` could not decide. Normally none.
    unresolved: facts.uncertainties,
    mode,
    // The only thing that makes a configuration undeployable is having nothing in it.
    deployable: Object.keys(resources).length > 0
  };
};

const buildServiceResource = ({
  resourceType,
  service,
  environment,
  connectTo,
  profile
}: {
  resourceType: ServiceResourceType;
  service: ServiceFact;
  environment: Array<{ name: string; value: unknown }>;
  connectTo: readonly string[];
  profile: ModeProfile;
}): ComposedResource => {
  const shared = {
    ...(environment.length > 0 ? { environment } : {}),
    ...(connectTo.length > 0 ? { connectTo: [...connectTo] } : {})
  };

  if (resourceType === 'hosting-bucket') {
    return {
      type: 'hosting-bucket',
      properties: { uploadDirectoryPath: service.servesStaticAssets?.path ?? `${service.path}/dist` }
    };
  }

  if (resourceType.endsWith('-web')) {
    // The framework resources take the application directory and handle their own build.
    return { type: resourceType, properties: { appDirectory: service.path, ...shared } };
  }

  if (resourceType === 'batch-job') {
    return {
      type: 'batch-job',
      properties: {
        container: { packaging: packagingFor(service) },
        resources: { ...profile.container },
        ...(service.schedule === undefined
          ? {}
          : { events: [{ type: 'schedule', properties: { scheduleRate: service.schedule } }] }),
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
      packaging: packagingFor(service),
      resources: { ...profile.container },
      // Scaling is only meaningful for something that stays up. A batch job is sized, not scaled.
      scaling: { minInstances: profile.scaling.minInstances, maxInstances: profile.scaling.maxInstances },
      ...shared
    }
  };
};
