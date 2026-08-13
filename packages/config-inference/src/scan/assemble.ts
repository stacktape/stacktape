/**
 * Running the probes and reconciling what they found.
 *
 * Probes overlap on purpose. The manifest sees `pg` in the dependencies, the environment file sees
 * a `postgres://` scheme, and a compose file names a `postgres:16` image — three independent routes
 * to the same conclusion. That redundancy is what later lets verification treat an agent's claim as
 * corroborated, so merging must preserve it: evidence accumulates rather than being replaced.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Citation } from '../facts/citation';
import type { DependencyFact, DependencyKind } from '../facts/dependency';
import type { ExistingDeploymentFact } from '../facts/existing-deployment';
import {
  PROJECT_FACTS_SCHEMA_VERSION,
  projectFactsSchema,
  type MigrationFact,
  type PackageManager,
  type ProjectFacts
} from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import { classifyFileAccess } from '../policy/file-access';
import { listRepositoryFiles } from './file-tree';
import type { Probe, ProbeContext, ProbeOutput } from './probe';
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
 * Fold dependency findings together by kind.
 *
 * Keyed on kind rather than name because probes name things independently and would otherwise
 * produce `mainDatabase` twice. The consequence — a repository with two Postgres instances collapses
 * into one — is accepted here: no probe can currently tell two instances apart, and the agent, which
 * can, is free to split them when it reviews the draft.
 */
const mergeDependencies = (outputs: readonly ProbeOutput[]): DependencyFact[] => {
  const byKind = new Map<DependencyKind, DependencyFact>();

  for (const output of outputs) {
    for (const dependency of output.dependencies ?? []) {
      const existing = byKind.get(dependency.kind);
      if (existing === undefined) {
        byKind.set(dependency.kind, { ...dependency, evidence: [...dependency.evidence] });
        continue;
      }
      byKind.set(dependency.kind, {
        ...existing,
        consumedBy: [...new Set([...existing.consumedBy, ...dependency.consumedBy])],
        addressedBy: [...new Set([...existing.addressedBy, ...dependency.addressedBy])],
        // A stated version beats no version. `pg` in a manifest proves Postgres and nothing about
        // which Postgres; the `postgres:15` line in a compose file states it outright.
        engineVersion: existing.engineVersion ?? dependency.engineVersion,
        extensions: [...new Set([...existing.extensions, ...dependency.extensions])],
        // Knowing where something is hosted today is rarer and more valuable than not knowing, so
        // any probe that establishes it wins over the ones that did not.
        currentlyHostedOn: existing.currentlyHostedOn ?? dependency.currentlyHostedOn,
        evidence: mergeEvidence(existing.evidence, dependency.evidence)
      });
    }
  }

  return [...byKind.values()];
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

const mergeServices = (
  outputs: readonly ProbeOutput[]
): { services: ServiceFactInput[]; renames: Map<string, string> } => {
  const byPath = new Map<string, ServiceFactInput>();
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
      const existing = byPath.get(key);
      if (existing === undefined) {
        byPath.set(key, { ...service, evidence: [...(service.evidence ?? [])] });
        continue;
      }
      if (service.name !== existing.name) renames.set(service.name, existing.name);
      byPath.set(key, {
        ...existing,
        // A later probe that can see a bind call or an EXPOSE directive knows more about HTTP than
        // one reading a dependency list, so a positive finding is never overwritten by silence.
        exposesHttp: existing.exposesHttp || service.exposesHttp,
        port: existing.port ?? service.port,
        framework: existing.framework ?? service.framework,
        runtimeVersion: existing.runtimeVersion ?? service.runtimeVersion,
        buildCommand: existing.buildCommand ?? service.buildCommand,
        startCommand: existing.startCommand ?? service.startCommand,
        dockerfile: existing.dockerfile ?? service.dockerfile,
        healthCheckPath: existing.healthCheckPath ?? service.healthCheckPath,
        writesLocalFilesystem: existing.writesLocalFilesystem ?? service.writesLocalFilesystem,
        servesStaticAssets: existing.servesStaticAssets ?? service.servesStaticAssets,
        evidence: mergeEvidence([...(existing.evidence ?? [])], service.evidence ?? [])
      });
    }
  }

  return { services: [...byPath.values()], renames };
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
  if (services.length === 0) return dependencies;
  const paths = new Set(services.map((service) => service.path));
  const oneCodebase = paths.size === 1;

  return dependencies.map((dependency) => {
    if (dependency.consumedBy.length > 0) return dependency;
    if (services.length === 1) return { ...dependency, consumedBy: [services[0]!.name] };
    if (oneCodebase) return { ...dependency, consumedBy: services.map((service) => service.name) };
    return dependency;
  });
};

const DATABASE_KINDS: ReadonlySet<DependencyKind> = new Set(['postgres', 'mysql', 'mssql', 'mongodb', 'sqlite']);

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
  read: (repoRelativePath) => readSourceFile(root, repoRelativePath),
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
  files
}: {
  root: string;
  probes: readonly Probe[];
  files?: readonly string[];
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
  const dependencies = attributeDependencies(mergeDependencies(outputs), services);
  for (const dependency of dependencies) {
    // Safe to mutate: `mergeDependencies` built these objects fresh a few lines up.
    dependency.consumedBy = dependency.consumedBy.map((name) => renames.get(name) ?? name);
  }

  const uncertainties = new Map<string, Uncertainty>();
  for (const output of outputs) {
    for (const uncertainty of output.uncertainties ?? []) {
      uncertainties.set(uncertainty.id, uncertainty);
    }
  }
  for (const uncertainty of resolvedByOtherProbes(uncertainties.values(), dependencies)) {
    uncertainties.delete(uncertainty.id);
  }

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
