/**
 * What an agent is allowed to say, which is much less than what a facts document contains.
 *
 * The first version of this pipeline let the agent submit a whole `ProjectFacts`. That was a hole
 * straight through the middle of the design: the document carries `source`, and verification skips
 * downgrading anything marked `source: 'probe'` on the grounds that a probe's citations are
 * constructed rather than recalled. An agent that writes `source: 'probe'` on a fabricated database
 * is therefore never checked and never questioned. One field disabled the entire verification layer.
 *
 * The same applied to policy. `blocksDeploy`, `recommended` and uncertainty identifiers all decide
 * how firmly we hold something and what we advise — none of which is an observation about the
 * repository, and all of which a prompt-injected agent would love to control.
 *
 * So the agent's schema contains observations and nothing else. Provenance, blocking policy,
 * recommendations, identifiers and user-facing prose are stamped on by us, deterministically, after
 * the submission is parsed. The trust boundary is now a type rather than a convention.
 */

import { z } from 'zod';
import { citationSchema } from './citation';
import { dependencyKindSchema } from './dependency';
import { checkServiceConsistency, environmentVariableUseSchema, serviceShape } from './service';
import {
  migrationFactSchema,
  PROJECT_FACTS_SCHEMA_VERSION,
  projectFactsSchema,
  type MigrationFact,
  type ProjectFacts
} from './project-facts';
import type { Uncertainty } from './uncertainty';

/**
 * The service shape the facts document uses, minus probe-only retained literals and `source`.
 * An agent may classify a variable, but prompt-injected repository text must not choose a value
 * that reaches the generated deployment configuration.
 */
const agentServiceSchema = z
  .object({
    ...serviceShape,
    environmentVariables: z.array(environmentVariableUseSchema.omit({ safeLiteralValue: true })).default([])
  })
  .superRefine((service, ctx) => {
    checkServiceConsistency(service, ctx);
    // Stricter than the facts schema on purpose. A probe-built document may leave a cross-service
    // target open, and `checkFactsCompleteness` turns that into a decision; the agent is the one
    // reader that can go and look, so it has to either name the service or say it could not.
    for (const variable of service.environmentVariables) {
      if (variable.role === 'cross-service-reference' && variable.targetServiceName === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['environmentVariables'],
          message: `"${variable.name}" points at another service, so it must name that service — or report a \`cross-service-target-unknown\` unknown instead.`
        });
      }
    }
  });

/**
 * Note the absence of `currentlyHostedOn`.
 *
 * Establishing where data lives today requires reading an environment *value*, which only the probe
 * layer ever does. The agent has no way to know it and therefore no way to say it — which also means
 * it cannot claim a live external database is absent, or invent one that is not there.
 */
const agentDependencySchema = z.object({
  name: z.string().min(1),
  kind: dependencyKindSchema,
  engineVersion: z.string().min(1).optional(),
  extensions: z.array(z.string().min(1)).default([]),
  consumedBy: z.array(z.string().min(1)).default([]),
  evidence: z.array(citationSchema).default([])
});

/**
 * Gaps the agent may report, as parameters only.
 *
 * Deliberately a subset of the uncertainty vocabulary. `unconfirmed-claim` belongs to the verifier,
 * `external-database-disposition` requires knowledge the agent does not have, and `stage-intent` is
 * always ours to ask. Nothing here carries a recommendation, a severity, or a word of prose.
 */
const agentUnknownSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('database-engine-ambiguous'),
    environmentVariableName: z.string().min(1),
    candidates: z.array(dependencyKindSchema).min(2),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('command-unknown'),
    serviceName: z.string().min(1),
    command: z.enum(['build', 'start']),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('environment-variable-timing'),
    serviceName: z.string().min(1),
    environmentVariableName: z.string().min(1),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('cross-service-target-unknown'),
    serviceName: z.string().min(1),
    environmentVariableName: z.string().min(1),
    candidateServiceNames: z.array(z.string().min(1)).default([]),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('schedule-unknown'),
    serviceName: z.string().min(1),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('service-deployment-intent'),
    serviceName: z.string().min(1),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('local-filesystem-writes'),
    serviceName: z.string().min(1),
    paths: z.array(z.string().min(1)).min(1),
    purpose: z.enum(['uploads', 'cache', 'unknown']),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('sqlite-persistence'),
    serviceName: z.string().min(1),
    paths: z.array(z.string().min(1)).min(1),
    evidence: z.array(citationSchema).default([])
  }),
  z.object({
    kind: z.literal('migration-timing-unknown'),
    serviceName: z.string().min(1),
    command: z.string().min(1),
    evidence: z.array(citationSchema).default([])
  })
]);

export const agentSubmissionSchema = z.object({
  schemaVersion: z.literal(PROJECT_FACTS_SCHEMA_VERSION),
  services: z.array(agentServiceSchema).default([]),
  dependencies: z.array(agentDependencySchema).default([]),
  migrations: z.array(migrationFactSchema).default([]),
  unknowns: z.array(agentUnknownSchema).default([])
});

export type AgentSubmission = z.infer<typeof agentSubmissionSchema>;
export type AgentUnknown = z.infer<typeof agentUnknownSchema>;

/**
 * Our policy for each kind of gap: how firmly we hold it, and what we advise.
 *
 * Kept here rather than in the submission so the agent cannot soften a question it would rather not
 * be asked. Blocking means proceeding without an answer would produce infrastructure we would not
 * stand behind.
 */
const UNKNOWN_POLICY: Record<AgentUnknown['kind'], { blocksDeploy: boolean; recommended?: string }> = {
  'database-engine-ambiguous': { blocksDeploy: true },
  'command-unknown': { blocksDeploy: true },
  'environment-variable-timing': { blocksDeploy: true, recommended: 'runtime' },
  'cross-service-target-unknown': { blocksDeploy: true },
  'schedule-unknown': { blocksDeploy: true },
  'service-deployment-intent': { blocksDeploy: false, recommended: 'deploy' },
  'local-filesystem-writes': {
    blocksDeploy: true,
    recommended: 'object-storage'
  },
  'sqlite-persistence': {
    blocksDeploy: true,
    recommended: 'migrate-to-managed-database'
  },
  'migration-timing-unknown': {
    blocksDeploy: true,
    recommended: 'deploy-hook'
  }
};

const toUncertainty = (unknown: AgentUnknown): Uncertainty => {
  const policy = UNKNOWN_POLICY[unknown.kind];
  const subject = 'serviceName' in unknown ? unknown.serviceName : unknown.environmentVariableName;
  const base = {
    id: `${unknown.kind}:${subject}`,
    blocksDeploy: policy.blocksDeploy,
    evidence: unknown.evidence,
    // Stamped by us. The agent has no way to claim probe provenance.
    source: 'agent' as const
  };

  switch (unknown.kind) {
    case 'database-engine-ambiguous':
      return {
        ...base,
        kind: 'database-engine-ambiguous',
        environmentVariableName: unknown.environmentVariableName,
        candidates: unknown.candidates,
        recommended: unknown.candidates[0]!
      };
    case 'command-unknown':
      // Suggestions are ours to derive from the repository, never the agent's to write: they are
      // rendered next to a text field the user is about to trust.
      return {
        ...base,
        kind: 'command-unknown',
        serviceName: unknown.serviceName,
        command: unknown.command,
        suggestions: []
      };
    case 'environment-variable-timing':
      return {
        ...base,
        kind: 'environment-variable-timing',
        serviceName: unknown.serviceName,
        environmentVariableName: unknown.environmentVariableName,
        recommended: 'runtime'
      };
    case 'cross-service-target-unknown':
      return {
        ...base,
        kind: 'cross-service-target-unknown',
        serviceName: unknown.serviceName,
        environmentVariableName: unknown.environmentVariableName,
        candidateServiceNames: unknown.candidateServiceNames
      };
    case 'schedule-unknown':
      return {
        ...base,
        kind: 'schedule-unknown',
        serviceName: unknown.serviceName,
        suggestions: []
      };
    case 'service-deployment-intent':
      return {
        ...base,
        kind: 'service-deployment-intent',
        serviceName: unknown.serviceName,
        recommended: 'deploy'
      };
    case 'local-filesystem-writes':
      return {
        ...base,
        kind: 'local-filesystem-writes',
        serviceName: unknown.serviceName,
        paths: unknown.paths,
        purpose: unknown.purpose,
        recommended: 'object-storage'
      };
    case 'sqlite-persistence':
      return {
        ...base,
        kind: 'sqlite-persistence',
        serviceName: unknown.serviceName,
        paths: unknown.paths,
        recommended: 'migrate-to-managed-database'
      };
    case 'migration-timing-unknown':
      return {
        ...base,
        kind: 'migration-timing-unknown',
        serviceName: unknown.serviceName,
        command: unknown.command,
        recommended: 'deploy-hook'
      };
  }
};

/**
 * Fold a submission into the probe baseline.
 *
 * Probe facts are immutable here. When the agent describes something the probe already found, its
 * evidence is added and the probe's provenance stands; when it describes something new, the result
 * is marked `source: 'agent'` and is therefore subject to verification and downgrade. There is no
 * path by which agent-authored content acquires probe provenance.
 */
export const mergeAgentSubmission = ({
  baseline,
  submission
}: {
  baseline: ProjectFacts;
  submission: AgentSubmission;
}): ProjectFacts => {
  const services = [...baseline.services];
  const servicesByPath = new Map(services.map((service, index) => [service.path, index]));
  /** Disagreements between the two readings, raised as questions rather than resolved silently. */
  const challenges: Uncertainty[] = [];

  /**
   * Fields where the two readings disagreeing is worth a question.
   *
   * Commands are deliberately absent, and it cost a test to learn why. A probe reports the runner
   * invocation it read out of the manifest (`npm run start`); an agent reports the command that
   * runner ultimately executes (`node dist/index.js`). Those are the same instruction written at two
   * levels, they disagree as strings on almost every project, and asking the user to arbitrate
   * between them would make the most common case the noisiest one. The probe's form is also
   * definitionally correct — it is what the manifest declares — so there is nothing to arbitrate.
   *
   * What is left are unambiguous scalars, where a difference is a real difference.
   */
  const CHALLENGEABLE = ['port', 'framework'] as const;

  for (const submitted of submission.services) {
    const existingIndex = servicesByPath.get(submitted.path);
    if (existingIndex === undefined) {
      services.push({ ...submitted, source: 'agent' });
      servicesByPath.set(submitted.path, services.length - 1);
      continue;
    }
    const existing = services[existingIndex]!;

    // A probe still outranks the agent — its citation was constructed from bytes it had just read
    // and cannot be misattributed. But outranking is not the same as discarding: where the agent
    // read something *different*, that disagreement goes to the user instead of into the bin. We
    // asked it to correct the draft; throwing the correction away after telling it the submission
    // was accepted made that instruction a lie.
    for (const field of CHALLENGEABLE) {
      const probeValue = existing[field];
      const agentValue = submitted[field];
      if (probeValue === undefined || agentValue === undefined || String(probeValue) === String(agentValue)) {
        continue;
      }
      challenges.push({
        kind: 'conflicting-observation',
        id: `conflicting-observation:${existing.name}:${field}`,
        blocksDeploy: false,
        evidence: [...existing.evidence, ...submitted.evidence].slice(0, 4),
        source: 'agent',
        subject: `service:${existing.name}`,
        field,
        probeValue: String(probeValue),
        agentValue: String(agentValue),
        recommended: 'probe'
      });
    }

    services[existingIndex] = {
      ...existing,
      // The agent fills gaps; where it disagrees, the disagreement is raised above rather than
      // applied here.
      runtimeVersion: existing.runtimeVersion ?? submitted.runtimeVersion,
      framework: existing.framework ?? submitted.framework,
      port: existing.port ?? submitted.port,
      buildCommand: existing.buildCommand ?? submitted.buildCommand,
      startCommand: existing.startCommand ?? submitted.startCommand,
      containerEntrypoint: existing.containerEntrypoint ?? submitted.containerEntrypoint,
      functionEntrypoint: existing.functionEntrypoint ?? submitted.functionEntrypoint,
      functionTriggers: existing.functionTriggers.length > 0 ? existing.functionTriggers : submitted.functionTriggers,
      dockerfile: existing.dockerfile ?? submitted.dockerfile,
      healthCheckPath: existing.healthCheckPath ?? submitted.healthCheckPath,
      workspace: existing.workspace ?? submitted.workspace,
      servesStaticAssets: existing.servesStaticAssets ?? submitted.servesStaticAssets,
      writesLocalFilesystem: existing.writesLocalFilesystem ?? submitted.writesLocalFilesystem,
      longLivedConnections:
        existing.longLivedConnections === 'none' ? submitted.longLivedConnections : existing.longLivedConnections,
      exposesHttp: existing.exposesHttp || submitted.exposesHttp,
      environmentVariables:
        existing.environmentVariables.length > 0 ? existing.environmentVariables : submitted.environmentVariables,
      evidence: [...existing.evidence, ...submitted.evidence].slice(0, 8)
    };
  }

  const dependencies = [...baseline.dependencies];
  const dependencyIndex = new Map(
    dependencies.map((dependency, index) => [`${dependency.kind}:${dependency.name}`, index])
  );

  for (const submitted of submission.dependencies) {
    const key = `${submitted.kind}:${submitted.name}`;
    const existingIndex = dependencyIndex.get(key);
    if (existingIndex === undefined) {
      // `addressedBy` is not on the agent's schema: which variable carries an address is read off the
      // environment file itself, and is not something the model should be able to assert.
      dependencies.push({ ...submitted, addressedBy: [], source: 'agent' });
      dependencyIndex.set(key, dependencies.length - 1);
      continue;
    }
    const existing = dependencies[existingIndex]!;
    dependencies[existingIndex] = {
      ...existing,
      engineVersion: existing.engineVersion ?? submitted.engineVersion,
      extensions: [...new Set([...existing.extensions, ...submitted.extensions])],
      consumedBy: [...new Set([...existing.consumedBy, ...submitted.consumedBy])],
      evidence: [...existing.evidence, ...submitted.evidence].slice(0, 8)
    };
  }

  const migrations: MigrationFact[] = [...baseline.migrations];
  const migrationKeys = new Set(migrations.map((migration) => `${migration.serviceName}:${migration.tool}`));
  for (const submitted of submission.migrations) {
    const key = `${submitted.serviceName}:${submitted.tool}`;
    if (migrationKeys.has(key)) continue;
    migrationKeys.add(key);
    migrations.push(submitted);
  }

  const uncertainties = [...baseline.uncertainties, ...challenges];
  const uncertaintyIds = new Set(uncertainties.map((uncertainty) => uncertainty.id));
  for (const unknown of submission.unknowns) {
    const uncertainty = toUncertainty(unknown);
    if (uncertaintyIds.has(uncertainty.id)) continue;
    uncertaintyIds.add(uncertainty.id);
    uncertainties.push(uncertainty);
  }

  const merged = {
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    ...(baseline.packageManager === undefined ? {} : { packageManager: baseline.packageManager }),
    workspaceGlobs: baseline.workspaceGlobs,
    services,
    dependencies,
    migrations,
    uncertainties,
    // `notes` stays a probe-and-verifier field. Free prose from something that reads untrusted files
    // has no route to the user, not even an advisory one.
    notes: baseline.notes
  };

  const parsed = projectFactsSchema.safeParse(merged);
  if (parsed.success) {
    return parsed.data;
  }

  // Merging must never throw. The submission schema now enforces the same constraints as the target,
  // so reaching here means the agent produced something the two schemas disagree about — a bug on
  // our side. Losing the agent's contribution costs the user quality; crashing costs them the whole
  // analysis, and they did nothing wrong.
  return baseline;
};
