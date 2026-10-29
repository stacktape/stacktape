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
import { environmentVariableUseSchema, repositoryPathSchema, serviceFactSchema } from './service';
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
   * The directory the command runs from, when it is not the repository root: `api/Procfile`'s `release: python
   * manage.py migrate` needs `api/manage.py`. A deploy hook runs from the project root otherwise.
   */
  directory: repositoryPathSchema.optional(),
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

/**
 * A command developers run by hand against the project's databases, read from a manifest (`npm run seed`).
 *
 * Distinct from a migration: nothing runs it on deploy. It becomes a config script so `stacktape dev` can seed the
 * local databases with it.
 */
export const localScriptFactSchema = z.object({
  name: z.enum(['seed', 'migrate']),
  /** The command as the developer runs it, from `directory`. */
  command: z.string().min(1),
  directory: repositoryPathSchema,
  /** What the script's own source reads; empty when the command runs a tool whose source is not in the repository. */
  environmentVariables: z.array(environmentVariableUseSchema).default([]),
  evidence: z.array(citationSchema).default([])
});

export type LocalScriptFact = z.infer<typeof localScriptFactSchema>;

/**
 * A source file shaped like a Lambda handler that init does not turn into a function, or turns into one Stacktape may
 * not load: a Java class with no Maven or Gradle build next to it, a C# handler with no project file, a Go, Rust or
 * Ruby handler, a Java class whose package is not its folder name (Stacktape names the handler after the folder), or
 * a Dockerfile that builds a container-image Lambda (the path is the Dockerfile).
 */
export const handlerFindingSchema = z.object({
  path: repositoryPathSchema,
  language: z.string().min(1),
  reason: z.enum(['no-build-file', 'unsupported-language', 'java-package', 'container-image']),
  /** The Java package, or its absence, when the reason is `java-package`. */
  packageName: z.string().min(1).optional()
});

export type HandlerFinding = z.infer<typeof handlerFindingSchema>;

/**
 * Why leaving a declared setting out changes what the deployment does, beyond losing the setting itself.
 *
 * - `access`: a route or API would accept callers the source refuses.
 * - `condition`: the declaration exists only while a condition holds, which init could not prove.
 * - `profile`: Compose starts the service only when its profile is selected.
 * - `network`: the workload would run outside the network the source places it in.
 * - `storage`: files the workload keeps would not survive or not be there.
 * - `failure-handling`: failed events would lose their declared retries or dead-letter target.
 * - `execution`: the workload would run with other limits, ordering or concurrency than declared.
 * - `identity`: users would sign in without a declared protection.
 * - `encryption`: data would not use the declared encryption key.
 * - `container-security`: the container would run with fewer restrictions than declared.
 * - `code-integrity`: code the source requires to be signed would be accepted unsigned.
 * - `permissions`: the workload would get broader AWS permissions than its source grants.
 */
export const importConcernSchema = z.enum([
  'access',
  'condition',
  'profile',
  'network',
  'storage',
  'failure-handling',
  'execution',
  'identity',
  'encryption',
  'container-security',
  'code-integrity',
  'permissions'
]);

export type ImportConcern = z.infer<typeof importConcernSchema>;

/** A declaration name or key path as an importer read it: `AdminApi`, `Auth.ResourcePolicy`, `services.web`. */
const declaredNameSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_.:$@/*+-]+$/);

/**
 * A setting a deployment manifest declares that init did not carry into the configuration.
 *
 * Importers keep an explicit list of the keys they map. Every other key becomes one of these, so a setting init does
 * not understand is never dropped silently. When leaving it out would make the result less safe than the source, the
 * importer leaves the whole declaration out (`omitted`) instead of writing it without the setting.
 */
export const importGapSchema = z.object({
  /** The manifest, repository-relative. */
  file: repositoryPathSchema,
  /** The declaration in it: a SAM logical ID, `functions.api`, `services.web`, `ReadFunction.Events.Get`. */
  object: declaredNameSchema,
  keys: z.array(declaredNameSchema).min(1).max(20),
  /**
   * `omitted`: init left the declaration out because of these keys. `not-carried`: init wrote the declaration without
   * them. `not-imported`: the keys are declarations of their own (resources) that init created nothing for.
   */
  effect: z.enum(['omitted', 'not-carried', 'not-imported']),
  concern: importConcernSchema.optional()
});

export type ImportGap = z.infer<typeof importGapSchema>;

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
  localScripts: z.array(localScriptFactSchema).default([]),
  handlerFindings: z.array(handlerFindingSchema).default([]),
  importGaps: z.array(importGapSchema).default([]),
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
/**
 * Frameworks whose dedicated resource owns the build and start, so a missing start command is not
 * a gap. Shared with the convention raiser in `scan/conventions.ts`, which must skip exactly the
 * same set — two copies of this list is how the two drift into disagreeing.
 */
export const SELF_PACKAGING_FRAMEWORKS: ReadonlySet<string> = new Set([
  'nextjs',
  'nuxt',
  'sveltekit',
  'astro',
  'remix',
  'solid-start',
  'tanstack-start'
]);

export const checkFactsCompleteness = (facts: ProjectFacts): CompletenessIssue[] => {
  const issues: CompletenessIssue[] = [];
  const serviceNames = new Set(facts.services.map((service) => service.name));
  const dependencyNames = new Set(facts.dependencies.map((dependency) => dependency.name));

  if (facts.services.length !== serviceNames.size) {
    issues.push({
      path: 'services',
      message: 'Service names must be unique.',
      severity: 'blocking'
    });
  }
  if (facts.dependencies.length !== dependencyNames.size) {
    issues.push({
      path: 'dependencies',
      message: 'Dependency names must be unique.',
      severity: 'blocking'
    });
  }

  facts.services.forEach((service, index) => {
    const at = `services[${index}]`;
    const selfPackagingFramework = SELF_PACKAGING_FRAMEWORKS.has(service.framework ?? '');

    // Something has to tell us how to run this, unless it is purely a bundle of files to serve.
    if (
      service.startCommand === undefined &&
      service.dockerfile === undefined &&
      service.containerEntrypoint === undefined &&
      service.functionEntrypoint === undefined &&
      !selfPackagingFramework &&
      !service.servesStaticAssets
    ) {
      if (!uncertaintyMentions(facts, service.name)) {
        issues.push({
          path: `${at}.startCommand`,
          message: `"${service.name}" has no start command, Dockerfile or static output. Supply one, or raise a \`command-unknown\` uncertainty.`,
          severity: 'blocking'
        });
      }
    }

    for (const trigger of service.functionTriggers) {
      if ('dependencyName' in trigger && !dependencyNames.has(trigger.dependencyName)) {
        issues.push({
          path: `${at}.functionTriggers`,
          message: `The ${trigger.type} trigger names dependency "${trigger.dependencyName}", which is not declared.`,
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
