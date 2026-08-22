/**
 * Running the probes and reconciling what they found.
 *
 * Probes overlap on purpose. The manifest sees `pg` in the dependencies, the environment file sees
 * a `postgres://` scheme, and a compose file names a `postgres:16` image — three independent routes
 * to the same conclusion. That redundancy is what later lets verification treat an agent's claim as
 * corroborated, so merging must preserve it: evidence accumulates rather than being replaced.
 */

import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import type { Citation } from '../facts/citation';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../facts/dependency';
import type { ExistingDeploymentFact } from '../facts/existing-deployment';
import {
  PROJECT_FACTS_SCHEMA_VERSION,
  projectFactsSchema,
  type MigrationFact,
  type PackageManager,
  type ProjectFacts
} from '../facts/project-facts';
import type { EnvironmentVariableUse, ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { classifyFileAccess } from '../policy/file-access';
import { raiseConventionalCommands, raisePlannedCommands, type CommandPlanner } from './conventions';
import { raiseDockerfileOwnership } from './dockerfile-ownership';
import { enrichEnvironmentUsage } from './environment-usage';
import { listRepositoryFiles } from './file-tree';
import type { Probe, ProbeContext, ProbeOutput } from './probe';
import { ENV_NAME_TO_KIND } from './probes/environment';
import { readSourceFile } from './read-source';

const MAX_EVIDENCE_PER_FACT = 6;

const mergeEvidence = (existing: Citation[], incoming: readonly Citation[]): Citation[] => {
  const seen = new Set(existing.map((citation) => `${citation.file}:${citation.line}:${citation.field ?? ''}`));
  const merged = [...existing];
  for (const citation of incoming) {
    const key = `${citation.file}:${citation.line}:${citation.field ?? ''}`;
    if (seen.has(key) || merged.length >= MAX_EVIDENCE_PER_FACT) continue;
    seen.add(key);
    merged.push(citation);
  }
  return merged;
};

/**
 * Fold generic dependency findings together while preserving concretely named instances.
 *
 * Manifests and environment files usually know only "DynamoDB" and use the shared default name;
 * deployment descriptors can name `UsersTable` and `OrdersTable` independently. Collapsing those
 * back to one resource would discard the descriptor's highest-value information.
 */
const mergeDependency = (existing: DependencyFact, incoming: DependencyFact): DependencyFact => ({
  ...existing,
  consumedBy: [...new Set([...existing.consumedBy, ...incoming.consumedBy])],
  addressedBy: [...new Set([...existing.addressedBy, ...incoming.addressedBy])],
  // A stated version beats no version. `pg` in a manifest proves Postgres and nothing about
  // which Postgres; the `postgres:15` line in a compose file states it outright.
  engineVersion: existing.engineVersion ?? incoming.engineVersion,
  extensions: [...new Set([...existing.extensions, ...incoming.extensions])],
  // A managed host read from the connection string is stronger than an infrastructure declaration:
  // the latter may never have been deployed. A localhost connection is development evidence and
  // must not erase the declaration that protects a possibly-live production database.
  currentlyHostedOn:
    incoming.hostingEvidence === 'connection-string' &&
    incoming.currentlyHostedOn !== 'local' &&
    incoming.currentlyHostedOn !== 'unknown'
      ? incoming.currentlyHostedOn
      : (existing.currentlyHostedOn ?? incoming.currentlyHostedOn),
  hostingEvidence:
    incoming.hostingEvidence === 'connection-string' &&
    incoming.currentlyHostedOn !== 'local' &&
    incoming.currentlyHostedOn !== 'unknown'
      ? incoming.hostingEvidence
      : (existing.hostingEvidence ?? incoming.hostingEvidence),
  // Same reasoning for a declared size: only an importer states one, and one statement is enough.
  ...((existing.sizeHint ?? incoming.sizeHint) ? { sizeHint: existing.sizeHint ?? incoming.sizeHint } : {}),
  evidence: mergeEvidence(existing.evidence, incoming.evidence)
});

const mergeDependencies = (outputs: readonly ProbeOutput[]): DependencyFact[] => {
  const exact = new Map<string, DependencyFact>();
  for (const output of outputs) {
    for (const dependency of output.dependencies ?? []) {
      const key = `${dependency.kind}:${dependency.name}`;
      const existing = exact.get(key);
      exact.set(
        key,
        existing === undefined
          ? { ...dependency, evidence: [...dependency.evidence] }
          : mergeDependency(existing, dependency)
      );
    }
  }

  const result: DependencyFact[] = [];
  for (const kind of new Set([...exact.values()].map((dependency) => dependency.kind))) {
    const candidates = [...exact.values()].filter((dependency) => dependency.kind === kind);
    const genericName = defaultDependencyName(kind);
    const explicit = candidates.filter((dependency) => dependency.name !== genericName);
    const generic = candidates.filter((dependency) => dependency.name === genericName);

    if (explicit.length === 0) {
      const [first, ...rest] = generic;
      if (first !== undefined) result.push(rest.reduce(mergeDependency, first));
      continue;
    }

    // A deployment descriptor naming two tables is stronger than a package import saying only
    // "DynamoDB". Keep both concrete instances. A single concrete instance can safely absorb the
    // generic manifest/environment evidence; with several, assigning it to one would be a guess.
    if (explicit.length === 1) {
      result.push(generic.reduce(mergeDependency, explicit[0]!));
    } else {
      result.push(...explicit);
    }
  }
  return result;
};

/**
 * Fold services together by the directory they live in, plus which process they are.
 *
 * Directory alone is the right key almost always: a `package.json` and a `Procfile` describing the
 * same application must end up as one service, not two. The exception is a directory that really
 * does hold several deployable processes, which `processType` names — see the field's own comment.
 */
const serviceKey = (service: ServiceFactInput): string =>
  service.processType === undefined ? service.path : `${service.path}::${service.processType}`;

const normalizedServiceName = (service: Pick<ServiceFactInput, 'name'>): string =>
  service.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const mergeEnvironmentVariables = (
  existing: NonNullable<ServiceFactInput['environmentVariables']> = [],
  incoming: NonNullable<ServiceFactInput['environmentVariables']> = []
): NonNullable<ServiceFactInput['environmentVariables']> => {
  const rolePriority: Readonly<Record<EnvironmentVariableUse['role'], number>> = {
    'infra-dependency': 4,
    'cross-service-reference': 3,
    'third-party-secret': 2,
    'runtime-config': 1,
    'build-time': 0
  };
  const variables = new Map(
    existing.map((variable) => [variable.name, { ...variable, evidence: [...(variable.evidence ?? [])] }])
  );
  for (const variable of incoming) {
    const current = variables.get(variable.name);
    const preferred =
      current === undefined || rolePriority[variable.role] > rolePriority[current.role] ? variable : current;
    variables.set(
      variable.name,
      current === undefined
        ? { ...variable, evidence: [...(variable.evidence ?? [])] }
        : {
            ...preferred,
            hasDeclaredValue: current.hasDeclaredValue || variable.hasDeclaredValue,
            safeLiteralValue:
              preferred.role === 'runtime-config' ? (current.safeLiteralValue ?? variable.safeLiteralValue) : undefined,
            targetServiceProperty: current.targetServiceProperty ?? variable.targetServiceProperty,
            evidence: mergeEvidence(current.evidence, variable.evidence ?? [])
          }
    );
  }
  return [...variables.values()];
};

const BACKGROUND_PROCESS_TYPE = /(?:^|:)(?:worker|scheduler|cron|consumer)$/;

const mergeService = (existing: ServiceFactInput, incoming: ServiceFactInput): ServiceFactInput => ({
  ...existing,
  // An importer can identify a container before the language manifest is read. Keep the concrete
  // application language once another probe establishes it; `container` describes packaging, not
  // what the user writes.
  language:
    existing.language === 'unknown' || existing.language === 'container' ? incoming.language : existing.language,
  // A declared background process can publish a metrics/health port without becoming a public web
  // service. Outside that explicit role, a positive bind/EXPOSE finding remains stronger than
  // silence from another probe.
  exposesHttp: BACKGROUND_PROCESS_TYPE.test(existing.processType ?? incoming.processType ?? '')
    ? false
    : existing.servesStaticAssets !== undefined || incoming.servesStaticAssets !== undefined
      ? false
      : existing.exposesHttp || incoming.exposesHttp,
  port: BACKGROUND_PROCESS_TYPE.test(existing.processType ?? incoming.processType ?? '')
    ? undefined
    : existing.servesStaticAssets !== undefined || incoming.servesStaticAssets !== undefined
      ? undefined
      : (existing.port ?? incoming.port),
  processType: existing.processType ?? incoming.processType,
  framework: existing.framework ?? incoming.framework,
  runtimeVersion: existing.runtimeVersion ?? incoming.runtimeVersion,
  buildCommand: existing.buildCommand ?? incoming.buildCommand,
  startCommand: existing.startCommand ?? incoming.startCommand,
  buildRoot: existing.buildRoot ?? incoming.buildRoot,
  containerEntrypoint: existing.containerEntrypoint ?? incoming.containerEntrypoint,
  functionEntrypoint: existing.functionEntrypoint ?? incoming.functionEntrypoint,
  functionTriggers: [
    ...new Map(
      [...(existing.functionTriggers ?? []), ...(incoming.functionTriggers ?? [])].map((trigger) => [
        JSON.stringify(trigger),
        trigger
      ])
    ).values()
  ],
  dockerfile: existing.dockerfile ?? incoming.dockerfile,
  healthCheckPath: existing.healthCheckPath ?? incoming.healthCheckPath,
  writesLocalFilesystem: existing.writesLocalFilesystem ?? incoming.writesLocalFilesystem,
  servesStaticAssets: existing.servesStaticAssets ?? incoming.servesStaticAssets,
  environmentVariables: mergeEnvironmentVariables(
    existing.environmentVariables ?? [],
    incoming.environmentVariables ?? []
  ),
  evidence: mergeEvidence([...(existing.evidence ?? [])], incoming.evidence ?? [])
});

/**
 * Find which declared process a generic package-manifest service describes.
 *
 * Render/Fly can run `web` and `worker` from one directory. Their importer must preserve both, but
 * the package manifest later describes the directory without a process name. Treating that as a
 * third service is a particularly convincing false positive: the generated config deploys the web
 * app twice. HTTP shape is the strongest discriminator; conventional `web`/`app` process names are
 * the fallback. If neither settles it, leaving the generic service separate is more honest than
 * folding it into an arbitrary worker.
 */
const genericMergeTarget = (
  services: ReadonlyMap<string, ServiceFactInput>,
  incoming: ServiceFactInput
): [string, ServiceFactInput] | undefined => {
  const entries = [...services.entries()];
  const exactCommandMatches = entries.filter(
    ([, service]) =>
      service.path === incoming.path &&
      service.startCommand !== undefined &&
      incoming.startCommand !== undefined &&
      service.startCommand.trim() === incoming.startCommand.trim() &&
      service.exposesHttp === incoming.exposesHttp
  );
  if (exactCommandMatches.length === 1) return exactCommandMatches[0];
  const exactNameMatches = entries.filter(
    ([, service]) => normalizedServiceName(service) === normalizedServiceName(incoming)
  );
  if (exactNameMatches.length === 1) return exactNameMatches[0];
  const candidates = entries.filter(
    ([, service]) => service.path === incoming.path && service.processType !== undefined
  );
  // A production descriptor often builds from the repository root while the package manifest
  // correctly locates the application in a child directory. Dockerfile ownership and an exact
  // static output directory are stronger identities than that build-context difference. They also
  // let a Render Blueprint and a local Compose file enrich one service instead of deploying it
  // twice.
  const structuralMatches = entries.filter(([, service]) => {
    const existingDescriptor = service.processType?.split(':')[0];
    const incomingDescriptor = incoming.processType?.split(':')[0];
    const comesFromAnotherDescription =
      incomingDescriptor === undefined || existingDescriptor === undefined || existingDescriptor !== incomingDescriptor;
    if (
      comesFromAnotherDescription &&
      service.path === incoming.path &&
      service.startCommand !== undefined &&
      incoming.startCommand !== undefined &&
      service.startCommand.trim() === incoming.startCommand.trim() &&
      service.exposesHttp === incoming.exposesHttp
    ) {
      return true;
    }
    if (
      comesFromAnotherDescription &&
      service.dockerfile !== undefined &&
      incoming.dockerfile !== undefined &&
      service.dockerfile === incoming.dockerfile &&
      service.exposesHttp === incoming.exposesHttp
    ) {
      return true;
    }
    if (
      service.servesStaticAssets !== undefined &&
      incoming.servesStaticAssets !== undefined &&
      service.servesStaticAssets.path === incoming.servesStaticAssets.path
    ) {
      return true;
    }
    if (
      incoming.processType === undefined &&
      incoming.path !== '.' &&
      service.dockerfile?.startsWith(`${incoming.path}/`)
    ) {
      return true;
    }
    const existingName = normalizedServiceName(service);
    const incomingName = normalizedServiceName(incoming);
    if (
      comesFromAnotherDescription &&
      existingName.length >= 3 &&
      existingName === incomingName &&
      (service.path === '.' || incoming.path === '.')
    ) {
      return true;
    }
    return (
      Math.min(existingName.length, incomingName.length) >= 4 &&
      (service.servesStaticAssets !== undefined || incoming.servesStaticAssets !== undefined) &&
      (existingName.endsWith(incomingName) || incomingName.endsWith(existingName))
    );
  });
  if (incoming.processType !== undefined) {
    // Two deployment descriptors can describe the same web/worker pair with provider-qualified
    // process identities (`fly:web`, `compose:web`). Merge only an unambiguous matching suffix;
    // unrelated functions in the same directory remain separate.
    const processLabel = incoming.processType.split(':').at(-1)?.toLowerCase();
    const matchingProcess = candidates.filter(
      ([, service]) => service.processType?.split(':').at(-1)?.toLowerCase() === processLabel
    );
    if (matchingProcess.length === 1) return matchingProcess[0];
    return structuralMatches.length === 1 ? structuralMatches[0] : undefined;
  }
  if (structuralMatches.length === 1) return structuralMatches[0];
  if (candidates.length === 1) return candidates[0];

  const matchingHttp = candidates.filter(([, service]) => service.exposesHttp === incoming.exposesHttp);
  if (matchingHttp.length === 1) return matchingHttp[0];

  const conventionalWeb = candidates.filter(([, service]) => /(?:^|:)(?:app|web)$/.test(service.processType ?? ''));
  return conventionalWeb.length === 1 ? conventionalWeb[0] : undefined;
};

const mergeServices = (
  outputs: readonly ProbeOutput[]
): { services: ServiceFactInput[]; renames: Map<string, string> } => {
  const byPath = new Map<string, ServiceFactInput>();
  const lifecycleDockerfiles = new Set(
    outputs.flatMap((output) => [...(output.lifecycleDockerfiles ?? []), ...(output.descriptorTargetDockerfiles ?? [])])
  );
  const developmentProcesses = new Set(outputs.flatMap((output) => output.developmentProcesses ?? []));
  /**
   * Names that stopped existing because their service folded into another one.
   *
   * The language probe calls the application `orders`, the Procfile calls the same directory `web`,
   * and the merge keeps `orders` — at which point everything else the Procfile said *about* `web`
   * (its release-phase migration, above all) points at a service that is no longer declared. The
   * probes cannot coordinate on names, so the assembler has to forward them.
   */
  const renames = new Map<string, string>();

  for (const output of outputs) {
    for (const service of output.services ?? []) {
      const key = serviceKey(service);
      if (developmentProcesses.has(key)) {
        const candidates = [...byPath.values()].filter(
          (candidate) =>
            candidate.path === service.path &&
            candidate.processType?.startsWith('compose:') !== true &&
            (candidate.exposesHttp === service.exposesHttp || candidate.servesStaticAssets !== undefined)
        );
        const target = candidates.length === 1 ? candidates[0] : undefined;
        if (target !== undefined) {
          if (target.name !== service.name) renames.set(service.name, target.name);
          continue;
        }
      }
      if (
        service.dockerfile !== undefined &&
        lifecycleDockerfiles.has(service.dockerfile) &&
        service.processType === undefined &&
        service.startCommand === undefined &&
        service.containerEntrypoint === undefined
      ) {
        continue;
      }
      const existing = byPath.get(key);
      if (existing === undefined) {
        const generic = service.processType === undefined ? undefined : byPath.get(service.path);
        const matchingNameElsewhere = [...byPath.values()].some(
          (candidate) => candidate !== generic && normalizedServiceName(candidate) === normalizedServiceName(service)
        );
        if (
          generic !== undefined &&
          generic.processType === undefined &&
          (!matchingNameElsewhere || normalizedServiceName(generic) === normalizedServiceName(service)) &&
          ((generic.exposesHttp && service.exposesHttp) ||
            /(?:^|:)(?:app|web)$/.test(service.processType ?? '') ||
            (generic.path !== '.' &&
              service.dockerfile?.startsWith(`${generic.path}/`) === true &&
              (generic.framework !== undefined ||
                generic.containerEntrypoint !== undefined ||
                generic.servesStaticAssets !== undefined)) ||
            generic.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
              service.processType
                ?.split(':')
                .at(-1)
                ?.replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase())
        ) {
          byPath.delete(service.path);
          const keepGenericName = service.processType?.startsWith('procfile:') === true;
          if (generic.name !== service.name) {
            renames.set(keepGenericName ? service.name : generic.name, keepGenericName ? generic.name : service.name);
          }
          // The process declaration is more specific than a package-script convention, so it owns conflicts; the generic
          // package service still contributes framework, runtime and other missing details.
          byPath.set(key, {
            ...mergeService(service, generic),
            name: keepGenericName ? generic.name : service.name
          });
          continue;
        }
        const target = genericMergeTarget(byPath, service);
        if (target !== undefined) {
          const [targetKey, targetService] = target;
          if (service.name !== targetService.name) renames.set(service.name, targetService.name);
          byPath.set(targetKey, mergeService(targetService, service));
          continue;
        }
        byPath.set(key, {
          ...service,
          evidence: [...(service.evidence ?? [])]
        });
        continue;
      }
      if (service.name !== existing.name) renames.set(service.name, existing.name);
      byPath.set(key, mergeService(existing, service));
    }
  }

  const merged = [...byPath.values()];
  const descriptorOwnedDockerfiles = new Set(
    merged.flatMap((service) =>
      service.processType !== undefined && service.dockerfile !== undefined ? [service.dockerfile] : []
    )
  );
  const services = merged.filter(
    (service) =>
      !(
        service.processType === undefined &&
        service.dockerfile !== undefined &&
        descriptorOwnedDockerfiles.has(service.dockerfile) &&
        service.startCommand === undefined &&
        service.containerEntrypoint === undefined &&
        service.functionEntrypoint === undefined
      )
  );

  return { services, renames };
};

/**
 * Attach dependencies to the services that use them.
 *
 * A dependency nobody consumes reads as noise, gets no `connectTo`, and gets flagged by the
 * completeness check. When a probe could not attribute it — the environment probe sees a `.env` at
 * the repository root with no idea which package reads it — there are two sound answers:
 *
 * - One service: it is the consumer.
 * - Several services, all in the same directory: they are one codebase — a Procfile's web and
 *   worker, say — and the dependency list that named the database belongs to all of them. The
 *   worker needs the database exactly as much as the web process does; this is what makes a
 *   Sidekiq worker come out connected to Redis rather than standing next to it.
 *
 * Services spread across directories stay unattributed, for the agent to resolve: a monorepo's
 * root-level `.env` really is ambiguous about which package reads it.
 */
const attributeDependencies = (
  dependencies: DependencyFact[],
  services: readonly ServiceFactInput[]
): DependencyFact[] => {
  if (services.length === 0)
    return dependencies.map((dependency) => ({
      ...dependency,
      consumedBy: []
    }));
  const paths = new Set(services.map((service) => service.path));
  const oneCodebase = paths.size === 1;
  const serviceNames = new Set(services.map((service) => service.name));
  const normalizedServiceNames = new Map(
    services.map((service) => [service.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(), service.name])
  );

  return dependencies.map((dependency) => {
    if (dependency.consumedBy.length > 0) {
      const resolved = dependency.consumedBy.map(
        (consumer) =>
          (serviceNames.has(consumer) ? consumer : undefined) ??
          normalizedServiceNames.get(consumer.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ??
          consumer
      );
      const known = resolved.filter((consumer) => serviceNames.has(consumer));
      if (known.length === 0 && services.every((service) => service.functionEntrypoint !== undefined)) {
        return {
          ...dependency,
          consumedBy: services.map((service) => service.name)
        };
      }
      const evidenceRoots = new Set(dependency.evidence.map((citation) => posix.dirname(citation.file)));
      const colocatedServices = services.filter((service) => evidenceRoots.has(service.path));
      if (known.length === 0 && colocatedServices.length > 0) {
        return {
          ...dependency,
          consumedBy: colocatedServices.map((service) => service.name)
        };
      }
      // A manifest-only workspace package is not a deployable consumer. Keeping its package name
      // here turns an advisory attribution gap into a structurally invalid configuration.
      if (known.length === 0) return { ...dependency, consumedBy: [] };
      // A concrete descriptor resource already names its real consumers. Generic package evidence
      // may additionally point at a shared library package, which is not independently deployable.
      // Once at least one real service is known, retain only real services for that concrete resource.
      return { ...dependency, consumedBy: [...new Set(known)] };
    }
    if (services.length === 1) return { ...dependency, consumedBy: [services[0]!.name] };
    if (oneCodebase)
      return {
        ...dependency,
        consumedBy: services.map((service) => service.name)
      };
    return dependency;
  });
};

const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);
const EXAMPLE_ENVIRONMENT_FILE = /(?:^|\/)(?:\.?)env[-.](?:example|sample|template|defaults?)(?:[-.].*)?$/i;

const hasOnlyExampleEnvironmentEvidence = (dependency: DependencyFact): boolean =>
  dependency.evidence.length > 0 &&
  dependency.evidence.every((citation) => EXAMPLE_ENVIRONMENT_FILE.test(citation.file));

const hasSourceUsage = (dependency: DependencyFact, services: readonly ServiceFactInput[]): boolean =>
  services.some((service) =>
    (service.environmentVariables ?? []).some(
      (variable) =>
        variable.dependencyName === dependency.name &&
        (variable.evidence ?? []).some((citation) => !EXAMPLE_ENVIRONMENT_FILE.test(citation.file))
    )
  );

const isExternalHosting = (dependency: DependencyFact): boolean =>
  dependency.currentlyHostedOn !== undefined &&
  dependency.currentlyHostedOn !== 'local' &&
  dependency.currentlyHostedOn !== 'unknown';

/**
 * Keep a non-default/disabled capability when the repository proves it is real rather than merely
 * supported by a client library. Live connection evidence and IaC declarations always win. A
 * kind-specific environment read (`MONGODB_URI`, unlike generic `DATABASE_TYPE`) wins too.
 */
const hasStrongDependencyEvidence = (dependency: DependencyFact, services: readonly ServiceFactInput[]): boolean =>
  isExternalHosting(dependency) ||
  dependency.hostingEvidence === 'deployment-manifest' ||
  services.some((service) =>
    (service.environmentVariables ?? []).some((variable) => {
      if (variable.dependencyName !== dependency.name) return false;
      return (
        (variable.evidence ?? []).some((citation) => !EXAMPLE_ENVIRONMENT_FILE.test(citation.file)) &&
        ENV_NAME_TO_KIND.find((entry) => entry.pattern.test(variable.name))?.kind === dependency.kind
      );
    })
  );

/**
 * Questions another probe has already answered.
 *
 * Each probe reports only what it can see, so the environment probe raises an engine question on a
 * bare `DATABASE_URL=` without knowing the manifest three directories away declared `pg`. Only the
 * assembler holds every finding at once, so this is the one place the reconciliation can happen —
 * and it has to happen, because a question the repository already answers is exactly the kind of
 * friction the product is supposed to remove.
 */
const resolvedByOtherProbes = (
  uncertainties: Iterable<Uncertainty>,
  dependencies: readonly DependencyFact[]
): Uncertainty[] => {
  const establishedDatabase = dependencies.some((dependency) => DATABASE_KINDS.has(dependency.kind));
  return [...uncertainties].filter(
    (uncertainty) => uncertainty.kind === 'database-engine-ambiguous' && establishedDatabase
  );
};

export type CandidateFactsResult = {
  facts: ProjectFacts;
  /** Files the walk found, reused by the agent tooling so it never walks the tree twice. */
  files: readonly string[];
  truncated: boolean;
};

/** Build the probe context for a repository root. */
export const createProbeContext = (root: string, files: readonly string[]): ProbeContext => ({
  root,
  files,
  read: (repoRelativePath, options) => readSourceFile(root, repoRelativePath, options),
  readPrivileged: async (repoRelativePath) => {
    // Even the privileged reader refuses credential material. A probe has no business opening a
    // private key, so the exception it holds is narrow by construction: environment values only.
    if (classifyFileAccess(repoRelativePath) === 'blocked') return null;
    try {
      return await readFile(join(root, repoRelativePath), 'utf8');
    } catch {
      return null;
    }
  }
});

/**
 * Produce the candidate facts document a repository yields without any AI at all.
 *
 * This is both the draft the agent reviews and, when no agent is available, the final answer. That
 * dual role is deliberate: it gives the pipeline an honest floor, and it gives the eval harness a
 * baseline to measure what an agent actually adds.
 */
export const assembleCandidateFacts = async ({
  root,
  probes,
  files,
  planner
}: {
  root: string;
  probes: readonly Probe[];
  files?: readonly string[];
  /**
   * External build-planner, injected by the CLI. Absent in tests and the eval harness, so the
   * deterministic baseline never depends on a binary being installed.
   */
  planner?: CommandPlanner;
}): Promise<CandidateFactsResult> => {
  const listing = files === undefined ? await listRepositoryFiles(root) : { files: [...files], truncated: false };
  const context = createProbeContext(root, listing.files);

  // Probes are independent and every one of them is I/O, so they run together. Order is preserved
  // because the merge below resolves conflicts by probe order, and a scan whose result depends on
  // which file system call returned first would not be reproducible.
  const outputs: ProbeOutput[] = await Promise.all(
    probes.map(async (probe) => {
      try {
        return await probe.run(context);
      } catch {
        // One probe failing is a gap in the draft, not a failed analysis. The agent fills gaps; a
        // thrown exception here would deny the user the whole feature over one malformed manifest.
        return {};
      }
    })
  );

  const { services, renames } = mergeServices(outputs);
  for (const environment of outputs.flatMap((output) => output.serviceEnvironments ?? [])) {
    for (const service of services) {
      if (service.path !== environment.path) continue;
      if (environment.processType !== undefined && service.processType !== environment.processType) continue;
      service.environmentVariables = mergeEnvironmentVariables(
        service.environmentVariables ?? [],
        environment.environmentVariables
      );
    }
  }
  // Forward descriptor-local names before attribution decides whether a consumer exists. Waiting
  // until afterwards loses the link entirely: Compose calls it `backend`, the language manifest
  // calls the merged service `flask`, and attribution otherwise discards `backend` as unknown.
  const mergedDependencies = mergeDependencies(outputs);
  for (const dependency of mergedDependencies) {
    dependency.consumedBy = [...new Set(dependency.consumedBy.map((name) => renames.get(name) ?? name))];
  }
  let dependencies = attributeDependencies(mergedDependencies, services);
  for (const dependency of dependencies) {
    // Safe to mutate: `mergeDependencies` built these objects fresh a few lines up.
    dependency.consumedBy = [...new Set(dependency.consumedBy)];

    // Environment manifests often name the address (`DATABASE_URL`) even when source files are not
    // present in the checkout. `connectTo` grants access and publishes Stacktape-prefixed values,
    // but the application still reads its own name. Carry the dependency's unambiguous address
    // names onto every attributed consumer so composition can emit the explicit resource parameter.
    for (const serviceName of hasOnlyExampleEnvironmentEvidence(dependency) ? [] : dependency.consumedBy) {
      const service = services.find((candidate) => candidate.name === serviceName);
      if (service === undefined) continue;
      service.environmentVariables = mergeEnvironmentVariables(
        service.environmentVariables ?? [],
        dependency.addressedBy.map((name) => ({
          name,
          role: 'infra-dependency',
          dependencyName: dependency.name,
          required: true,
          evidence: [...dependency.evidence]
        }))
      );
    }
  }

  // Snapshot the descriptor-owned state. Dependency preference reconciliation runs after one source
  // pass (so an explicit `MONGODB_URI` can keep Mongo), then replays source enrichment against the
  // surviving set so generic `DATABASE_URL` can bind to the selected database.
  const variablesBeforeUsage = new Map(
    services.map((service) => [service, [...(service.environmentVariables ?? [])]] as const)
  );
  const consumersBeforeUsage = new Map(
    dependencies.map((dependency) => [dependency, [...dependency.consumedBy]] as const)
  );

  // After merge and attribution, because it needs the final service names to record consumption
  // and the final dependency list to link a variable unambiguously. The explicit range lifts the
  // default first-page budget: a scanner wants the whole file, within the byte ceilings.
  await enrichEnvironmentUsage({
    services,
    dependencies,
    files: listing.files,
    read: (path) =>
      readSourceFile(root, path, {
        startLine: 1,
        endLine: Number.MAX_SAFE_INTEGER
      })
  });

  const preferredKinds = new Set(outputs.flatMap((output) => output.preferredDependencyKinds ?? []));
  const preferredDatabaseKinds = [...preferredKinds].filter((kind) => DATABASE_KINDS.has(kind));
  let selectedDatabaseKind = preferredDatabaseKinds.length === 1 ? preferredDatabaseKinds[0] : undefined;
  const disabledKinds = new Set(outputs.flatMap((output) => output.disabledDependencyKinds ?? []));
  const reconciliationUncertainties: Uncertainty[] = [];
  if (selectedDatabaseKind === undefined) {
    const databaseDependencies = dependencies.filter((dependency) => DATABASE_KINDS.has(dependency.kind));
    const strongDatabaseKinds = [
      ...new Set(
        databaseDependencies
          .filter((dependency) => hasStrongDependencyEvidence(dependency, services))
          .map((dependency) => dependency.kind)
      )
    ];
    if (strongDatabaseKinds.length === 1) {
      selectedDatabaseKind = strongDatabaseKinds[0];
    } else {
      const weakGenericDatabases = databaseDependencies.filter(
        (dependency) =>
          dependency.name === defaultDependencyName(dependency.kind) &&
          !hasStrongDependencyEvidence(dependency, services)
      );
      const candidates = [...new Set(weakGenericDatabases.map((dependency) => dependency.kind))];
      if (candidates.length > 1) {
        selectedDatabaseKind = candidates.includes('postgres') ? 'postgres' : candidates[0]!;
        reconciliationUncertainties.push({
          kind: 'database-engine-ambiguous',
          id: 'database-engine:manifest-drivers',
          blocksDeploy: true,
          evidence: weakGenericDatabases.flatMap((dependency) => dependency.evidence).slice(0, MAX_EVIDENCE_PER_FACT),
          source: 'probe',
          environmentVariableName: 'the application database configuration',
          candidates,
          recommended: selectedDatabaseKind
        });
      }
    }
  }
  const reconciledDependencies = dependencies.filter((dependency) => {
    if (
      hasOnlyExampleEnvironmentEvidence(dependency) &&
      !isExternalHosting(dependency) &&
      !hasSourceUsage(dependency, services)
    ) {
      return false;
    }
    const disabled = disabledKinds.has(dependency.kind);
    const nonPreferredDatabase =
      selectedDatabaseKind !== undefined &&
      DATABASE_KINDS.has(dependency.kind) &&
      dependency.kind !== selectedDatabaseKind;
    if (disabled) return isExternalHosting(dependency) || dependency.hostingEvidence === 'deployment-manifest';
    return !nonPreferredDatabase || hasStrongDependencyEvidence(dependency, services);
  });

  if (reconciledDependencies.length !== dependencies.length) {
    dependencies = reconciledDependencies;
    const survivingNames = new Set(dependencies.map((dependency) => dependency.name));
    for (const service of services) {
      service.environmentVariables = (variablesBeforeUsage.get(service) ?? []).filter(
        (variable) => variable.dependencyName === undefined || survivingNames.has(variable.dependencyName)
      );
    }
    for (const dependency of dependencies) {
      dependency.consumedBy = [...(consumersBeforeUsage.get(dependency) ?? [])];
    }
    await enrichEnvironmentUsage({
      services,
      dependencies,
      files: listing.files,
      read: (path) =>
        readSourceFile(root, path, {
          startLine: 1,
          endLine: Number.MAX_SAFE_INTEGER
        })
    });
  }

  const uncertainties = new Map<string, Uncertainty>();
  for (const output of outputs) {
    for (const uncertainty of output.uncertainties ?? []) {
      uncertainties.set(uncertainty.id, uncertainty);
    }
  }
  // Where nothing textual says how a service runs, the ecosystem's convention becomes the open
  // question's suggested answer — a dead end turned into a decided-for-you card.
  for (const uncertainty of raiseConventionalCommands({
    services,
    files: listing.files
  })) {
    if (!uncertainties.has(uncertainty.id)) uncertainties.set(uncertainty.id, uncertainty);
  }
  // A Dockerfile that reads as a copied template gets the ownership decision: Stacktape's tuned
  // packaging by recommendation, the file untouched, one click to flip.
  for (const uncertainty of await raiseDockerfileOwnership({
    services,
    read: context.read
  })) {
    if (!uncertainties.has(uncertainty.id)) uncertainties.set(uncertainty.id, uncertainty);
  }
  // For services neither the repository nor the curated table could answer, ask the container
  // builder itself what it would do — its plan is the build, so the suggestion is reality.
  if (planner !== undefined) {
    const planned = await raisePlannedCommands({
      services,
      planner,
      alreadyRaised: (id) => uncertainties.has(id)
    });
    for (const uncertainty of planned) {
      uncertainties.set(uncertainty.id, uncertainty);
    }
  }
  for (const uncertainty of resolvedByOtherProbes(uncertainties.values(), dependencies)) {
    uncertainties.delete(uncertainty.id);
  }
  for (const uncertainty of reconciliationUncertainties) uncertainties.set(uncertainty.id, uncertainty);

  // Folded through the rename map first: a migration the Procfile attributed to `web` belongs to
  // whatever service `web` merged into, and without the remap it references a name that no longer
  // exists — which the completeness check rightly treats as blocking.
  const migrationsByKey = new Map<string, MigrationFact>();
  for (const output of outputs) {
    for (const migration of output.migrations ?? []) {
      const serviceName = renames.get(migration.serviceName) ?? migration.serviceName;
      const key = `${serviceName}:${migration.tool}`;
      const existing = migrationsByKey.get(key);
      // Two probes can see the same migrations: the dependency list proves the tool exists, and a
      // Procfile's release phase shows when it actually runs. An observed timing always beats
      // `unknown` — `unknown` becomes a decision for the user, and there is nothing to decide when
      // the repository already says.
      if (existing !== undefined && (existing.runsAt !== 'unknown' || migration.runsAt === 'unknown')) continue;
      migrationsByKey.set(key, { ...migration, serviceName });
    }
  }
  const migrations = [...migrationsByKey.values()];

  const packageManager = outputs.find((output) => output.packageManager !== undefined)?.packageManager as
    | PackageManager
    | undefined;
  const workspaceGlobs = [...new Set(outputs.flatMap((output) => output.workspaceGlobs ?? []))];
  const notes = outputs.flatMap((output) => output.notes ?? []).slice(0, 20);

  // One entry per tool. Only one probe looks for these today, but a repository can legitimately hold
  // both a Terraform stack and a Vercel deployment, and both are worth saying out loud.
  const existingDeployments: ExistingDeploymentFact[] = [];
  const seenTools = new Set<string>();
  for (const output of outputs) {
    for (const deployment of output.existingDeployments ?? []) {
      if (seenTools.has(deployment.tool)) continue;
      seenTools.add(deployment.tool);
      existingDeployments.push(deployment);
    }
  }

  const facts = projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    ...(packageManager === undefined ? {} : { packageManager }),
    workspaceGlobs,
    services,
    dependencies,
    existingDeployments,
    migrations,
    uncertainties: [...uncertainties.values()],
    notes
  });

  return { facts, files: listing.files, truncated: listing.truncated };
};
