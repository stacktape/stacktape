/**
 * Everything this pipeline believes about a repository, and everything it admits it does not know.
 *
 * This document is the entire channel between the agent and the infrastructure. Nothing else the
 * agent produces reaches the composer — not its prose, not its suggestions, not its opinion about
 * what the user should deploy. That is what makes the pipeline's behaviour a property of our code
 * rather than a property of whichever model happened to be installed.
 *
 * Probes fill most of it in before any model runs. The agent's job is to review that draft:
 * confirm, correct, remove, and fill the gaps, citing every change. Reviewing a draft is a task
 * small models are markedly better at than open-ended authorship, and it means a machine with no
 * coding agent at all still gets a usable document.
 */

import { z } from 'zod';
import { citationSchema } from './citation';
import { dependencyFactSchema } from './dependency';
import { existingDeploymentSchema } from './existing-deployment';
import { serviceFactSchema } from './service';
import { uncertaintySchema } from './uncertainty';

export const packageManagerSchema = z.enum([
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'pip',
  'poetry',
  'uv',
  'go',
  'cargo',
  'maven',
  'gradle',
  'bundler',
  'composer'
]);
export type PackageManager = z.infer<typeof packageManagerSchema>;

export const migrationFactSchema = z.object({
  /** The service that owns these migrations. Per-service because monorepos have several. */
  serviceName: z.string().min(1),
  tool: z.string().min(1),
  command: z.string().min(1),
  /**
   * When migrations run today.
   *
   * Decides whether we need to build anything at all. An application that migrates in its own
   * entrypoint needs nothing from us; one that a human runs by hand needs a hook with database
   * access from inside the network, which is real infrastructure.
   */
  runsAt: z.enum(['service-startup', 'ci', 'manual', 'unknown']),
  evidence: z.array(citationSchema).default([])
});

export type MigrationFact = z.infer<typeof migrationFactSchema>;

export const PROJECT_FACTS_SCHEMA_VERSION = 1;

export const projectFactsSchema = z.object({
  schemaVersion: z.literal(PROJECT_FACTS_SCHEMA_VERSION),
  packageManager: packageManagerSchema.optional(),
  /** Workspace globs, when the repository root declares them. Empty means not a workspace. */
  workspaceGlobs: z.array(z.string().min(1)).default([]),
  services: z.array(serviceFactSchema).default([]),
  dependencies: z.array(dependencyFactSchema).default([]),
  /**
   * Tooling that already deploys this project.
   *
   * Empty for a genuinely greenfield repository, which is the common case. When it is not empty the
   * repository has infrastructure somewhere that we did not create and must not disturb.
   */
  existingDeployments: z.array(existingDeploymentSchema).default([]),
  migrations: z.array(migrationFactSchema).default([]),
  uncertainties: z.array(uncertaintySchema).default([]),
  /**
   * Advisory observations with nowhere else to go.
   *
   * Rendered as clearly-attributed analysis text, never as a question and never with a button. That
   * separation is deliberate: this is the one free-text field the agent controls, so it must not be
   * able to reach the user as an instruction.
   */
  notes: z.array(z.string().min(1)).max(20).default([])
});

/**
 * A validated document: every default filled in.
 *
 * This is what the composer and the verifier consume, so they never have to ask whether an optional
 * array is missing or empty.
 */
export type ProjectFacts = z.infer<typeof projectFactsSchema>;

/**
 * A document as it is *written*, before validation fills the defaults in.
 *
 * Probes and tests build this shape. Keeping it distinct means a probe emitting a service does not
 * have to restate every default the schema already knows, while everything downstream still gets
 * the fully-populated form.
 */
export type ProjectFactsInput = z.input<typeof projectFactsSchema>;

export type CompletenessIssue = {
  /** Dotted path into the document, for pointing the agent at what to fix. */
  path: string;
  message: string;
  /** `blocking` issues make the document unusable; `advisory` ones degrade the result. */
  severity: 'blocking' | 'advisory';
};

const uncertaintyMentions = (facts: ProjectFacts, subject: string): boolean =>
  facts.uncertainties.some((uncertainty) => {
    if ('serviceName' in uncertainty && uncertainty.serviceName === subject) {
      return true;
    }
    if ('dependencyName' in uncertainty && uncertainty.dependencyName === subject) {
      return true;
    }
    return uncertainty.kind === 'unconfirmed-claim' && uncertainty.subject.endsWith(subject);
  });

/**
 * The completion criteria, stated once and used twice.
 *
 * They go into the agent's instructions verbatim and they run against whatever it submits. Small
 * models improve sharply against an explicit checklist, and — more importantly — every gap here has
 * a legitimate way out through `uncertainties`. A required field with no escape hatch is a
 * fabrication generator: a model that must supply a start command will invent one.
 */
export const checkFactsCompleteness = (facts: ProjectFacts): CompletenessIssue[] => {
  const issues: CompletenessIssue[] = [];
  const serviceNames = new Set(facts.services.map((service) => service.name));
  const dependencyNames = new Set(facts.dependencies.map((dependency) => dependency.name));

  if (facts.services.length !== serviceNames.size) {
    issues.push({ path: 'services', message: 'Service names must be unique.', severity: 'blocking' });
  }
  if (facts.dependencies.length !== dependencyNames.size) {
    issues.push({ path: 'dependencies', message: 'Dependency names must be unique.', severity: 'blocking' });
  }

  facts.services.forEach((service, index) => {
    const at = `services[${index}]`;

    // Something has to tell us how to run this, unless it is purely a bundle of files to serve.
    if (service.startCommand === undefined && service.dockerfile === undefined && !service.servesStaticAssets) {
      if (!uncertaintyMentions(facts, service.name)) {
        issues.push({
          path: `${at}.startCommand`,
          message: `"${service.name}" has no start command, Dockerfile or static output. Supply one, or raise a \`command-unknown\` uncertainty.`,
          severity: 'blocking'
        });
      }
    }

    if (service.exposesHttp && service.port === undefined) {
      issues.push({
        path: `${at}.port`,
        message: `"${service.name}" serves HTTP but states no port. A port read from the code is far better than a default.`,
        severity: 'advisory'
      });
    }

    for (const variable of service.environmentVariables) {
      if (variable.role === 'infra-dependency' && !dependencyNames.has(variable.dependencyName ?? '')) {
        issues.push({
          path: `${at}.environmentVariables`,
          message: `"${variable.name}" names dependency "${variable.dependencyName}", which is not declared.`,
          severity: 'blocking'
        });
      }
      if (variable.role === 'cross-service-reference') {
        const target = variable.targetServiceName;
        if (target === undefined) {
          if (!uncertaintyMentions(facts, service.name)) {
            issues.push({
              path: `${at}.environmentVariables`,
              message: `"${variable.name}" points at another service but names none. Name it, or raise a \`cross-service-target-unknown\` uncertainty.`,
              severity: 'blocking'
            });
          }
        } else if (!serviceNames.has(target)) {
          issues.push({
            path: `${at}.environmentVariables`,
            message: `"${variable.name}" points at service "${target}", which is not declared.`,
            severity: 'blocking'
          });
        }
      }
    }
  });

  facts.dependencies.forEach((dependency, index) => {
    if (dependency.consumedBy.length === 0) {
      issues.push({
        path: `dependencies[${index}].consumedBy`,
        // Worth reporting rather than dropping: an unconsumed dependency is usually a service we
        // failed to find, not a dependency that does not exist.
        message: `"${dependency.name}" is used by no service. Name its consumers, or remove it.`,
        severity: 'advisory'
      });
    }
    for (const consumer of dependency.consumedBy) {
      if (!serviceNames.has(consumer)) {
        issues.push({
          path: `dependencies[${index}].consumedBy`,
          message: `"${dependency.name}" names consumer "${consumer}", which is not a declared service.`,
          severity: 'blocking'
        });
      }
    }
  });

  facts.migrations.forEach((migration, index) => {
    if (!serviceNames.has(migration.serviceName)) {
      issues.push({
        path: `migrations[${index}].serviceName`,
        message: `Migrations name service "${migration.serviceName}", which is not declared.`,
        severity: 'blocking'
      });
    }
  });

  return issues;
};

/** Whether a document is usable by the composer at all. */
export const factsAreUsable = (issues: readonly CompletenessIssue[]): boolean =>
  !issues.some((issue) => issue.severity === 'blocking');
