import { isAbsolute, win32 } from 'node:path';
import { z } from 'zod';

export const QUALIFICATION_REPORT_VERSION = 4 as const;
export const MAX_QUALIFICATION_REPORT_BYTES = 32 * 1024 ** 2;
export const MAX_CASE_RESULT_BYTES = 4 * 1024 ** 2;
export const MAX_GENERATED_CONFIG_BYTES = 4 * 1024 ** 2;
export const MAX_COMPILED_TEMPLATE_BYTES = 16 * 1024 ** 2;

export const qualificationLaneSchema = z.enum(['import', 'package', 'runtime', 'aws']);
export type QualificationLane = z.infer<typeof qualificationLaneSchema>;

export const stepStatusSchema = z.enum(['passed', 'failed', 'skipped']);
export type StepStatus = z.infer<typeof stepStatusSchema>;

export const caseStatusSchema = z.enum(['passed', 'failed', 'skipped', 'discovery']);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

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
    port: z.number().int().positive().max(65_535).optional(),
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
    forbidCurrentlyHostedDependencies: z.boolean().optional(),
    // Some platform-specific projects are valuable negative contracts: the correct result is an
    // explicit unsupported-runtime gap and no fabricated AWS resource.
    allowNoResources: z.boolean().optional()
  })
  .strict()
  .superRefine((expectation, context) => {
    if (
      expectation.allowNoResources === true &&
      Object.values(expectation.resourceTypes).some((count) => count !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['allowNoResources'],
        message: 'allowNoResources requires zero expected resources.'
      });
    }
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

const perCaseStepOrder = ['harness', 'acquire', 'import', 'package'] as const;

export const qualificationCaseResultSchema = z
  .object({
    id: safeIdSchema,
    title: z.string(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    execution: z.enum(['executed', 'reused']),
    status: caseStatusSchema,
    durationMs: z.number().nonnegative(),
    source: z.discriminatedUnion('kind', [publicGitSourceSchema, localSourceSchema]),
    tags: z.array(safeIdSchema),
    steps: z.array(qualificationStepSchema),
    generatedConfigPath: z.string().optional(),
    keptWorkdir: z.string().optional(),
    resumedFrom: z
      .object({ reportPath: z.string().min(1), runId: z.string().min(1) })
      .strict()
      .optional()
  })
  .strict()
  .superRefine((result, context) => {
    if ((result.execution === 'reused') !== (result.resumedFrom !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['resumedFrom'],
        message: 'Reused project evidence must identify its source report, and executed evidence must not.'
      });
    }
    if (result.steps.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'A qualification case must contain executed evidence.'
      });
      return;
    }
    const stepNames = result.steps.map((step) => step.name);
    for (const [index, name] of stepNames.entries()) {
      if (name === 'runtime' || name === 'aws') {
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'name'],
          message: `${name} is a run-wide step and cannot be recorded on a project case.`
        });
      }
      if (stepNames.indexOf(name) !== index) {
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'name'],
          message: `Project step ${name} may only be recorded once.`
        });
      }
      const previousName = stepNames[index - 1];
      if (
        previousName !== undefined &&
        perCaseStepOrder.indexOf(name as (typeof perCaseStepOrder)[number]) <
          perCaseStepOrder.indexOf(previousName as (typeof perCaseStepOrder)[number])
      ) {
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'name'],
          message: `Project step ${name} is out of order.`
        });
      }
    }

    const harnessStep = result.steps.find((step) => step.name === 'harness');
    const acquireStep = result.steps.find((step) => step.name === 'acquire');
    const importStep = result.steps.find((step) => step.name === 'import');
    const packageStep = result.steps.find((step) => step.name === 'package');
    if (harnessStep !== undefined && (result.steps.length !== 1 || harnessStep.status !== 'failed')) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'A harness step is terminal project-level failure evidence and must be the only recorded step.'
      });
    }
    if (harnessStep === undefined && acquireStep === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'Project evidence must begin with acquisition.'
      });
    }
    if (acquireStep?.status === 'failed' && result.steps.at(-1) !== acquireStep) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'A failed acquisition is terminal and cannot have downstream lane evidence.'
      });
    }
    if (acquireStep?.status === 'skipped' && result.steps.some((step) => step.status !== 'skipped')) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'Downstream lane steps must be skipped when acquisition is skipped.'
      });
    }
    if (packageStep !== undefined && importStep === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'Packaging evidence requires importer evidence first.'
      });
    }
    if (importStep?.status === 'skipped' && packageStep?.status !== undefined && packageStep.status !== 'skipped') {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'Packaging must be skipped when importing was skipped.'
      });
    }
    if (importStep?.status === 'skipped' && acquireStep?.status !== 'skipped') {
      context.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'Importer evidence can only be skipped when the whole project is a fail-fast skip.'
      });
    }
    const semanticContract = importStep?.details?.semanticContract;
    if (importStep?.status === 'passed' && semanticContract !== 'verified' && semanticContract !== 'absent') {
      context.addIssue({
        code: 'custom',
        path: ['steps', result.steps.indexOf(importStep), 'details', 'semanticContract'],
        message: 'Passed importer evidence must identify whether its semantic contract was verified or absent.'
      });
    }
    if (semanticContract === 'absent' && packageStep?.status === 'passed') {
      context.addIssue({
        code: 'custom',
        path: ['steps', result.steps.indexOf(packageStep), 'status'],
        message: 'Packaging cannot pass before the importer has a reviewed semantic contract.'
      });
    }
    if (semanticContract === 'absent' && result.execution === 'reused') {
      context.addIssue({
        code: 'custom',
        path: ['execution'],
        message: 'Discovery-only evidence must execute again and cannot be reused as qualification evidence.'
      });
    }
    const isUncontractedDiscovery =
      importStep?.status === 'passed' &&
      semanticContract === 'absent' &&
      (packageStep === undefined || packageStep.status === 'skipped');
    const expectedStatus = result.steps.some((step) => step.status === 'failed')
      ? 'failed'
      : result.steps.every((step) => step.status === 'skipped')
        ? 'skipped'
        : isUncontractedDiscovery
          ? 'discovery'
          : 'passed';
    if (result.status !== expectedStatus) {
      context.addIssue({
        code: 'custom',
        path: ['status'],
        message: `Case status must be ${expectedStatus} for its recorded steps.`
      });
    }
    for (const [index, step] of result.steps.entries()) {
      if (step.status === 'failed' && step.failure === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'failure'],
          message: 'A failed step must include structured failure evidence.'
        });
      }
      if (step.status !== 'failed' && step.failure !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'failure'],
          message: 'Only a failed step may include failure evidence.'
        });
      }
    }
  });
export type QualificationCaseResult = z.infer<typeof qualificationCaseResultSchema>;

export const qualificationReportSchema = z
  .object({
    schemaVersion: z.literal(QUALIFICATION_REPORT_VERSION),
    runId: z.string().min(1),
    generatedAt: z.string().datetime(),
    productCommit: z.string(),
    productFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    manifests: z.array(z.string()).optional(),
    lanes: z.array(qualificationLaneSchema).min(1, 'A qualification report must contain at least one lane.'),
    awsScenarios: z.array(safeIdSchema),
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
        discovery: z.number().int().nonnegative(),
        durationMs: z.number().nonnegative()
      })
      .strict(),
    globalSteps: z.array(qualificationStepSchema),
    cases: z.array(qualificationCaseResultSchema)
  })
  .strict()
  .superRefine((report, context) => {
    const ids = new Set<string>();
    for (const [index, result] of report.cases.entries()) {
      if (ids.has(result.id)) {
        context.addIssue({ code: 'custom', path: ['cases', index, 'id'], message: `Duplicate case id ${result.id}.` });
      }
      ids.add(result.id);
    }
    const recordedStatuses = [
      ...report.cases.map((result) => result.status),
      ...report.globalSteps.map((step) => step.status)
    ];
    const actualSummary = {
      passed: recordedStatuses.filter((status) => status === 'passed').length,
      failed: recordedStatuses.filter((status) => status === 'failed').length,
      skipped: recordedStatuses.filter((status) => status === 'skipped').length,
      discovery: recordedStatuses.filter((status) => status === 'discovery').length
    };
    for (const key of ['passed', 'failed', 'skipped', 'discovery'] as const) {
      if (report.summary[key] !== actualSummary[key]) {
        context.addIssue({
          code: 'custom',
          path: ['summary', key],
          message: `Summary ${key} count must equal ${actualSummary[key]}.`
        });
      }
    }
    if (new Set(report.lanes).size !== report.lanes.length) {
      context.addIssue({ code: 'custom', path: ['lanes'], message: 'Qualification lanes must be unique.' });
    }
    if (report.lanes.includes('package') && !report.lanes.includes('import')) {
      context.addIssue({
        code: 'custom',
        path: ['lanes'],
        message: 'The package lane requires the import lane in the same report.'
      });
    }

    const expectedGlobalStepNames = [
      ...(report.lanes.includes('runtime') ? (['runtime'] as const) : []),
      ...report.awsScenarios.map(() => 'aws' as const)
    ];
    const actualGlobalStepNames = report.globalSteps.map((step) => step.name);
    if (JSON.stringify(actualGlobalStepNames) !== JSON.stringify(expectedGlobalStepNames)) {
      context.addIssue({
        code: 'custom',
        path: ['globalSteps'],
        message: `Global steps must exactly match requested global lanes: ${expectedGlobalStepNames.join(', ') || 'none'}.`
      });
    }
    if (new Set(report.awsScenarios).size !== report.awsScenarios.length) {
      context.addIssue({ code: 'custom', path: ['awsScenarios'], message: 'AWS scenarios must be unique.' });
    }
    if (report.lanes.includes('aws') !== report.awsScenarios.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['awsScenarios'],
        message: 'The aws lane and its explicit scenarios must be declared together.'
      });
    }
    for (const [index, step] of report.globalSteps.entries()) {
      if (step.status === 'skipped') {
        context.addIssue({
          code: 'custom',
          path: ['globalSteps', index, 'status'],
          message: 'A requested global lane must execute and cannot be reported as skipped.'
        });
      }
      if (step.status === 'failed' && step.failure === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['globalSteps', index, 'failure'],
          message: 'A failed global step must include structured failure evidence.'
        });
      }
      if (step.status !== 'failed' && step.failure !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['globalSteps', index, 'failure'],
          message: 'Only a failed global step may include failure evidence.'
        });
      }
      if (step.name === 'aws') {
        const scenario = step.details?.scenario;
        const expectedScenario = report.awsScenarios[index - (report.lanes.includes('runtime') ? 1 : 0)];
        if (scenario !== expectedScenario) {
          context.addIssue({
            code: 'custom',
            path: ['globalSteps', index, 'details', 'scenario'],
            message: `AWS step must identify its requested scenario ${expectedScenario ?? '(missing)'}.`
          });
        }
      }
    }

    const hasProjectLanes = report.lanes.includes('import') || report.lanes.includes('package');
    if (hasProjectLanes && report.cases.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['cases'],
        message: 'Import or package qualification must contain at least one selected project case.'
      });
    }
    for (const [caseIndex, result] of report.cases.entries()) {
      if (result.status === 'skipped') {
        const stoppedAfterValues = result.steps.map((step) => step.details?.stoppedAfter);
        const stoppedAfter = stoppedAfterValues[0];
        const precedingFailureIndex =
          typeof stoppedAfter === 'string'
            ? report.cases.findIndex((candidate) => candidate.id === stoppedAfter && candidate.status === 'failed')
            : -1;
        if (
          typeof stoppedAfter !== 'string' ||
          stoppedAfterValues.some((value) => value !== stoppedAfter) ||
          precedingFailureIndex < 0 ||
          precedingFailureIndex >= caseIndex
        ) {
          context.addIssue({
            code: 'custom',
            path: ['cases', caseIndex, 'steps'],
            message: 'A skipped project must identify the same earlier failed case in every step as stoppedAfter.'
          });
        }
      }
      if (!hasProjectLanes || result.steps.some((step) => step.name === 'harness')) continue;
      const acquireStep = result.steps.find((step) => step.name === 'acquire');
      const importStep = result.steps.find((step) => step.name === 'import');
      const packageStep = result.steps.find((step) => step.name === 'package');
      if (acquireStep?.status !== 'failed' && report.lanes.includes('import') && importStep === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['cases', caseIndex, 'steps'],
          message: 'The selected project is missing its requested import step.'
        });
      }
      if (acquireStep?.status !== 'failed' && report.lanes.includes('package') && packageStep === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['cases', caseIndex, 'steps'],
          message: 'The selected project is missing its requested package step.'
        });
      }
      if (!report.lanes.includes('package') && packageStep !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['cases', caseIndex, 'steps'],
          message: 'A project cannot record a package step when that lane was not requested.'
        });
      }
    }
  });
export type QualificationReport = z.infer<typeof qualificationReportSchema>;
