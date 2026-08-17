/**
 * Something in the repository that runs.
 *
 * Every field here answers a question about *observed code*, never about desired infrastructure.
 * There is deliberately no "kind" saying web-service or function or static site: that is a
 * classification, classification is the composer's job, and an enum handed to the agent would both
 * re-import the variance we are trying to remove and fail to express the distinctions Stacktape
 * actually makes.
 *
 * The test for adding a field: could a careful person confirm or refute it by reading the
 * repository? If not, it does not belong — a field describing what infrastructure *should* be is
 * "the agent writes the config" wearing a different hat.
 */

import { z } from 'zod';
import { citationSchema, factSourceSchema } from './citation';

/**
 * What a variable is *for*, which decides where its value has to come from and when.
 *
 * This is the highest-value classification in the whole schema, because it is the difference
 * between infrastructure that deploys and an application that works:
 *
 * - `build-time` values are compiled into an artifact. Supply one only at runtime and a front-end
 *   ships with an empty string where its API URL should be — and the deploy goes green.
 * - `cross-service-reference` values must resolve to another service's generated address, which
 *   nobody can hardcode because it does not exist until the stack is created.
 * - `infra-dependency` values come from something we are provisioning.
 * - `third-party-secret` values we cannot know and must never guess; the user supplies them and
 *   they go straight to secret storage.
 * - `runtime-config` is the ordinary remainder: log levels, feature flags, ports.
 */
export const environmentVariableRoleSchema = z.enum([
  'infra-dependency',
  'third-party-secret',
  'build-time',
  'runtime-config',
  'cross-service-reference'
]);

export type EnvironmentVariableRole = z.infer<typeof environmentVariableRoleSchema>;

export const environmentVariableUseSchema = z.object({
  name: z.string().min(1),
  role: environmentVariableRoleSchema,
  /** Which dependency supplies it, when the role is `infra-dependency`. */
  dependencyName: z.string().min(1).optional(),
  /** Which service it addresses, when the role is `cross-service-reference`. */
  targetServiceName: z.string().min(1).optional(),
  /**
   * Which part of that service's address the source manifest requests.
   *
   * Render distinguishes a hostname, port and `host:port`, while Stacktape's portable service
   * reference is a complete URL. Keeping the observed shape lets the composer refuse a lossy
   * conversion instead of quietly putting `https://...` where an application expects a bare host.
   */
  targetServiceProperty: z.enum(['url', 'host', 'port', 'hostport']).optional(),
  /** A deployment manifest supplies a value, but init deliberately retained only its name. */
  hasDeclaredValue: z.boolean().optional(),
  /** False when the code has a working fallback for its absence. */
  required: z.boolean().default(true),
  evidence: z.array(citationSchema).default([])
});

export type EnvironmentVariableUse = z.infer<typeof environmentVariableUseSchema>;

/**
 * How often and for how long the process runs.
 *
 * Together with `exposesHttp` and `longLivedConnections` this is what the composer classifies from.
 * A per-request HTTP service can be a function; the same service holding websockets cannot.
 */
export const executionModelSchema = z.enum(['per-request', 'long-running', 'scheduled', 'one-shot']);
export type ExecutionModel = z.infer<typeof executionModelSchema>;

/**
 * Constraints a service must satisfy however it was produced.
 *
 * Stated once and applied by both this schema and the agent submission schema. A submission schema
 * looser than its target lets `submit_facts` answer "accepted" to something that then fails when it
 * is merged: the model is told it succeeded, the run crashes afterwards, and the one opportunity to
 * have it fix the problem has already gone. That happened on a live run, and the fix was a second
 * copy of these rules — which is exactly how the two drift apart again.
 *
 * The messages are written for the agent, because it is the only reader that can act on them.
 *
 * Only the rules that hold for *any* producer live here. A cross-service reference with no target,
 * for instance, is a hard error for the agent — it is told to report an unknown instead — but an
 * ordinary gap in a probe-built document, which `checkFactsCompleteness` turns into a decision. That
 * rule therefore stays on the submission schema.
 */
export const checkServiceConsistency = (
  service: {
    executionModel: ExecutionModel;
    schedule?: string | undefined;
    exposesHttp: boolean;
    functionEntrypoint?: string | undefined;
    functionTriggers?: readonly FunctionTrigger[] | undefined;
    environmentVariables: readonly Pick<
      EnvironmentVariableUse,
      'name' | 'role' | 'dependencyName' | 'targetServiceName'
    >[];
  },
  ctx: z.RefinementCtx
): void => {
  // A scheduled service with no schedule is the clearest case: the composer cannot emit anything for
  // it, so catching it at the boundary turns a broken config into something we can still decide.
  if (service.executionModel === 'scheduled' && service.schedule === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['schedule'],
      message: 'A scheduled service must state its schedule, or report a `schedule-unknown` unknown instead.'
    });
  }
  if (service.exposesHttp && service.executionModel === 'one-shot') {
    ctx.addIssue({
      code: 'custom',
      path: ['executionModel'],
      message: 'A service cannot both serve HTTP and run once to completion.'
    });
  }
  if ((service.functionTriggers?.length ?? 0) > 0 && service.functionEntrypoint === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['functionTriggers'],
      message: 'Function triggers require a `functionEntrypoint`.'
    });
  }
  for (const variable of service.environmentVariables) {
    if (variable.role === 'infra-dependency' && variable.dependencyName === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['environmentVariables'],
        message: `"${variable.name}" is an infrastructure dependency, so it must name the dependency that supplies it (use the name from the project brief, for example "mainDatabase").`
      });
    }
  }
};

/**
 * A repository-relative POSIX path, and nothing that could escape the repository.
 *
 * These strings become build contexts and Dockerfile paths further down, so a `../../..` — from an
 * agent, or from a probe reading a malformed manifest — would make packaging read outside the
 * project. Rejecting the shape here is cheap; the filesystem boundary checks again before opening
 * anything.
 */
export const repositoryPathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !/^[A-Za-z]:/.test(value), 'must be repository-relative')
  .refine((value) => !value.split('/').includes('..'), 'must not contain ".."')
  // POSIX separators only, and no empty segment. Both keep the string comparable to the file listing
  // the probes work from, where `apps\web` and `a//b` are simply not names anything has.
  .refine((value) => !value.includes('\\'), 'must use forward slashes')
  .refine((value) => !value.includes('//'), 'must not contain an empty path segment');

/**
 * An event that invokes a handler-shaped service.
 *
 * These are observations from deployment descriptors such as AWS SAM, not infrastructure choices:
 * the composer still decides which Stacktape integration represents each trigger.
 */
export const functionTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('http'),
    method: z.string().min(1),
    path: z.string().min(1)
  }),
  z.object({
    type: z.literal('queue'),
    dependencyName: z.string().min(1),
    batchSize: z.number().int().positive().optional()
  }),
  z.object({ type: z.literal('topic'), dependencyName: z.string().min(1) }),
  z.object({
    type: z.literal('object-storage'),
    dependencyName: z.string().min(1),
    eventType: z.string().min(1).optional()
  }),
  z.object({ type: z.literal('schedule'), rate: z.string().min(1) })
]);

export type FunctionTrigger = z.infer<typeof functionTriggerSchema>;

const containerEntrypointSchema = z
  .string()
  .min(1)
  .refine((value) => {
    const file = value.split(':')[0];
    return file !== undefined && repositoryPathSchema.safeParse(file).success;
  }, 'must begin with a repository-relative source file');

/**
 * Everything a service is, apart from where the claim came from.
 *
 * Shared verbatim with the agent submission schema, which is this shape minus `source` — the agent
 * is not allowed to stamp its own provenance. Keeping one copy is not tidiness: a submission schema
 * that has drifted looser than the facts schema accepts a submission that then fails on merge, and
 * the model is told it succeeded after the last chance to have it fix anything.
 */
export const serviceShape = {
  name: z.string().min(1),
  /** Repository-relative directory this service is built and run from. */
  path: repositoryPathSchema,
  /**
   * Which process within that directory this is, when a directory holds more than one.
   *
   * A `Procfile` with `web:` and `worker:` in it is one codebase and two deployable things, sharing
   * a build and differing only in how they start. Services are otherwise folded together by
   * directory, which is right for the usual case — a manifest and a Procfile describing the same
   * application — and would silently discard the worker without this.
   *
   * Absent means "the main process here", which is what folds with what the other probes found.
   */
  processType: z.string().min(1).optional(),
  language: z.string().min(1),
  /** Declared runtime version, e.g. `22` or `3.12`. Decides buildpack and runtime selection. */
  runtimeVersion: z.string().min(1).optional(),
  framework: z.string().min(1).optional(),

  // ── Observations the composer classifies from ────────────────────────────────────────────────
  exposesHttp: z.boolean(),
  port: z.number().int().positive().optional(),
  /**
   * Connections held open beyond a single request.
   *
   * Rules out a per-request execution target regardless of anything else, and decides whether the
   * generated load balancer needs a longer idle timeout and whether the application needs a shared
   * adapter to work across more than one instance.
   */
  longLivedConnections: z.enum(['websocket', 'sse', 'none']).default('none'),
  executionModel: executionModelSchema,
  /** Cron or rate expression, when `executionModel` is `scheduled`. */
  schedule: z.string().min(1).optional(),
  /** A directory of built assets this service serves itself, rather than from a CDN. */
  servesStaticAssets: z.object({ path: repositoryPathSchema }).optional(),
  /**
   * Paths the application writes to on local disk.
   *
   * The most common silent containerisation failure there is. A container's filesystem does not
   * survive a restart, so a SQLite file or an uploads directory works perfectly until the first
   * redeploy and then quietly loses everything written since launch.
   */
  writesLocalFilesystem: z
    .object({
      paths: z.array(z.string().min(1)).min(1),
      purpose: z.enum(['sqlite', 'uploads', 'cache', 'logs', 'unknown'])
    })
    .optional(),

  // ── How it is built and started ──────────────────────────────────────────────────────────────
  buildCommand: z.string().min(1).optional(),
  startCommand: z.string().min(1).optional(),
  /**
   * Repository directory from which packaging/build commands run when it differs from the source
   * directory that owns the service. Deployment manifests commonly build a child app from the
   * monorepo root; keeping the two paths separate prevents root-level env files from being assigned
   * to every app while preserving the declared Docker/build context.
   */
  buildRoot: repositoryPathSchema.optional(),
  /** Source entrypoint for Stacktape's container buildpack, optionally followed by `:app` for Python. */
  containerEntrypoint: containerEntrypointSchema.optional(),
  /** Source file exporting a Lambda-compatible handler. Its presence proves this is per-invocation compute. */
  functionEntrypoint: repositoryPathSchema.optional(),
  /** Repository-declared events that invoke `functionEntrypoint`. */
  functionTriggers: z.array(functionTriggerSchema).default([]),
  /** Repository-relative path to a Dockerfile, when the service ships one. */
  dockerfile: repositoryPathSchema.optional(),
  healthCheckPath: z.string().min(1).optional(),

  /**
   * Where this service sits in a workspace, when the repository is a monorepo.
   *
   * Monorepos are the most breakage-dense shape this pipeline meets, and almost all of it is
   * packaging rather than infrastructure: shared packages that must be built first, a generated
   * database client, a build that only works from the repository root. A path and a build command
   * cannot express any of that.
   */
  workspace: z
    .object({
      packageName: z.string().min(1).optional(),
      /** Workspace packages this service imports and therefore needs built and included. */
      internalDependencies: z.array(z.string().min(1)).default([]),
      /** True when the build command must run from the repository root, not the service directory. */
      buildsFromRoot: z.boolean().default(false)
    })
    .optional(),

  environmentVariables: z.array(environmentVariableUseSchema).default([]),
  evidence: z.array(citationSchema).default([])
} as const;

export const serviceFactSchema = z
  .object({ ...serviceShape, source: factSourceSchema })
  .superRefine(checkServiceConsistency);

export type ServiceFact = z.infer<typeof serviceFactSchema>;
/** A service as written by a producer, before schema defaults are applied. */
export type ServiceFactInput = z.input<typeof serviceFactSchema>;
