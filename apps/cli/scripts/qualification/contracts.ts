import { isAbsolute, win32 } from 'node:path';
import { z } from 'zod';

export const QUALIFICATION_REPORT_VERSION = 2 as const;

export const qualificationLaneSchema = z.enum(['import', 'package', 'runtime', 'aws']);
export type QualificationLane = z.infer<typeof qualificationLaneSchema>;

export const stepStatusSchema = z.enum(['passed', 'failed', 'skipped']);
export type StepStatus = z.infer<typeof stepStatusSchema>;

const safeIdSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and internal dashes.');

const relativeProjectPathSchema = z
  .string()
  .min(1)
  .superRefine((value, context) => {
    const normalized = value.replaceAll('\\', '/');
    if (isAbsolute(value) || win32.isAbsolute(value) || normalized.split('/').includes('..')) {
      context.addIssue({ code: 'custom', message: 'The path must stay inside its declared source root.' });
    }
  });

const expectedServiceSchema = z
  .object({
    // Project facts require globally unique service names, so this is the only selector that can
    // make an order-independent expectation unambiguous. Every other field is an assertion.
    name: z.string().min(1),
    path: z.string().min(1).optional(),
    framework: z.string().min(1).optional(),
    exposesHttp: z.boolean().optional(),
    startCommand: z.string().min(1).optional(),
    buildCommand: z.string().min(1).optional(),
    dockerfile: z.string().min(1).optional()
  })
  .strict();

export type ExpectedService = z.infer<typeof expectedServiceSchema>;

const expectationSchema = z
  .object({
    resourceTypes: z.record(z.string(), z.number().int().nonnegative()),
    dependencyKinds: z.record(z.string(), z.number().int().nonnegative()).optional(),
    serviceCount: z.number().int().nonnegative(),
    httpServiceCount: z.number().int().nonnegative(),
    services: z.array(expectedServiceSchema).optional(),
    existingDeployments: z.array(z.string()).optional(),
    requiredConfig: z.array(z.string()).optional(),
    forbiddenConfig: z.array(z.string()).optional(),
    requiredGapPatterns: z.array(z.string()).optional(),
    forbiddenGapPatterns: z.array(z.string()).optional(),
    forbidCurrentlyHostedDependencies: z.boolean().optional()
  })
  .strict()
  .superRefine((expectation, context) => {
    const seen = new Set<string>();
    for (const [index, service] of (expectation.services ?? []).entries()) {
      if (seen.has(service.name)) {
        context.addIssue({
          code: 'custom',
          path: ['services', index, 'name'],
          message: `Duplicate expected service name ${service.name}.`
        });
      }
      seen.add(service.name);
    }
  });

const publicGitSourceSchema = z
  .object({
    kind: z.literal('git'),
    repository: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), 'Use an HTTPS repository URL.')
      .refine((value) => {
        const parsed = new URL(value);
        return parsed.username === '' && parsed.password === '';
      }, 'Repository URLs must not contain credentials.'),
    commit: z.string().regex(/^[a-f0-9]{40}$/, 'Pin a full 40-character Git commit.'),
    subdirectory: relativeProjectPathSchema.optional(),
    license: z.string().min(1),
    licenseUrl: z.string().url().optional()
  })
  .strict();

const localSourceSchema = z
  .object({
    kind: z.literal('local'),
    path: relativeProjectPathSchema,
    license: z.string().min(1)
  })
  .strict();

export const qualificationCaseManifestSchema = z
  .object({
    id: safeIdSchema,
    title: z.string().min(1).max(160),
    why: z.string().min(1).max(1_000),
    source: z.discriminatedUnion('kind', [publicGitSourceSchema, localSourceSchema]),
    origin: z.enum(['official-starter', 'official-example', 'real-application', 'synthetic']),
    tags: z.array(safeIdSchema).min(1),
    lanes: z.array(z.enum(['import', 'package'])).min(1),
    expect: expectationSchema.optional(),
    deployment: z
      .object({
        policy: z.enum(['never', 'routine', 'periodic', 'deep']),
        costClass: z.enum(['negligible', 'low', 'medium', 'high']),
        reason: z.string().min(1),
        scenario: safeIdSchema.optional()
      })
      .strict()
      .optional()
  })
  .strict();

export type QualificationCaseManifest = z.infer<typeof qualificationCaseManifestSchema>;

export const qualificationManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    cases: z.array(qualificationCaseManifestSchema).min(1)
  })
  .strict()
  .superRefine((manifest, context) => {
    const seen = new Set<string>();
    for (const [index, entry] of manifest.cases.entries()) {
      if (seen.has(entry.id)) {
        context.addIssue({ code: 'custom', path: ['cases', index, 'id'], message: `Duplicate case id ${entry.id}.` });
      }
      seen.add(entry.id);
    }
  });

export type QualificationManifest = z.infer<typeof qualificationManifestSchema>;

export const qualificationStepSchema = z
  .object({
    name: z.enum(['harness', 'acquire', 'import', 'package', 'runtime', 'aws']),
    status: stepStatusSchema,
    durationMs: z.number().nonnegative(),
    summary: z.string(),
    reproductionCommand: z.string().optional(),
    failure: z.object({ code: z.string(), message: z.string(), outputTail: z.string().optional() }).strict().optional(),
    details: z.record(z.string(), z.unknown()).optional()
  })
  .strict();
export type QualificationStep = z.infer<typeof qualificationStepSchema>;

export const qualificationCaseResultSchema = z
  .object({
    id: safeIdSchema,
    title: z.string(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    execution: z.enum(['executed', 'reused']),
    status: stepStatusSchema,
    durationMs: z.number().nonnegative(),
    source: z.discriminatedUnion('kind', [publicGitSourceSchema, localSourceSchema]),
    tags: z.array(safeIdSchema),
    steps: z.array(qualificationStepSchema),
    generatedConfigPath: z.string().optional(),
    keptWorkdir: z.string().optional(),
    resumedFrom: z.object({ reportPath: z.string(), runId: z.string() }).strict().optional()
  })
  .strict();
export type QualificationCaseResult = z.infer<typeof qualificationCaseResultSchema>;

export const qualificationReportSchema = z
  .object({
    schemaVersion: z.literal(QUALIFICATION_REPORT_VERSION),
    runId: z.string().min(1),
    generatedAt: z.string().datetime(),
    productCommit: z.string(),
    productFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    manifests: z.array(z.string()).optional(),
    lanes: z.array(qualificationLaneSchema),
    environment: z
      .object({
        platform: z.custom<NodeJS.Platform>((value) => typeof value === 'string'),
        architecture: z.string(),
        bun: z.string(),
        node: z.string(),
        docker: z.string().optional()
      })
      .strict(),
    summary: z
      .object({
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        durationMs: z.number().nonnegative()
      })
      .strict(),
    globalSteps: z.array(qualificationStepSchema),
    cases: z.array(qualificationCaseResultSchema)
  })
  .strict();
export type QualificationReport = z.infer<typeof qualificationReportSchema>;
