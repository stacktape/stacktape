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

const expectationSchema = z
  .object({
    resourceTypes: z.record(z.string(), z.number().int().nonnegative()),
    dependencyKinds: z.record(z.string(), z.number().int().nonnegative()).optional(),
    serviceCount: z.number().int().nonnegative(),
    httpServiceCount: z.number().int().nonnegative(),
    existingDeployments: z.array(z.string()).optional(),
    requiredConfig: z.array(z.string()).optional(),
    forbiddenConfig: z.array(z.string()).optional(),
    requiredGapPatterns: z.array(z.string()).optional(),
    forbiddenGapPatterns: z.array(z.string()).optional(),
    forbidCurrentlyHostedDependencies: z.boolean().optional()
  })
  .strict();

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

export type QualificationStep = {
  name: 'harness' | 'acquire' | 'import' | 'package' | 'runtime' | 'aws';
  status: StepStatus;
  durationMs: number;
  summary: string;
  reproductionCommand?: string;
  failure?: { code: string; message: string; outputTail?: string };
  details?: Record<string, unknown>;
};

export type QualificationCaseResult = {
  id: string;
  title: string;
  fingerprint: string;
  sourceFingerprint: string;
  execution: 'executed' | 'reused';
  status: StepStatus;
  durationMs: number;
  source: QualificationCaseManifest['source'];
  tags: string[];
  steps: QualificationStep[];
  generatedConfigPath?: string;
  keptWorkdir?: string;
  resumedFrom?: { reportPath: string; runId: string };
};

export type QualificationReport = {
  schemaVersion: typeof QUALIFICATION_REPORT_VERSION;
  runId: string;
  generatedAt: string;
  productCommit: string;
  productFingerprint: string;
  manifests?: string[];
  lanes: QualificationLane[];
  environment: {
    platform: NodeJS.Platform;
    architecture: string;
    bun: string;
    node: string;
    docker?: string;
  };
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  globalSteps: QualificationStep[];
  cases: QualificationCaseResult[];
};
