import { isAbsolute, win32 } from 'node:path';
import { z } from 'zod';
import { qualificationLaneSchema, stepStatusSchema } from './contracts';

export const hasControlCharacters = (str: string): boolean => {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
};

export const CAMPAIGN_HANDOFF_VERSION = 1 as const;
export const QUALIFICATION_REVIEW_BUNDLE_VERSION = 1 as const;

export const campaignTypeSchema = z.enum([
  'product-bug',
  'new-coverage',
  'harness-fix',
  'corpus-refresh',
  'investigation'
]);
export type CampaignType = z.infer<typeof campaignTypeSchema>;

export const failureClassificationSchema = z.enum([
  'importer',
  'packaging',
  'core-synthesis',
  'harness',
  'upstream-project',
  'environment'
]);
export type FailureClassification = z.infer<typeof failureClassificationSchema>;

const RESERVED_DEVICE_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9'
]);

export const campaignIdSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and internal dashes.')
  .refine((id) => !RESERVED_DEVICE_NAMES.has(id.toLowerCase()), 'Campaign ID cannot be a reserved device name.');

export const commitShaSchema = z.string().regex(/^[a-f0-9]{40}$/, 'Must be a full 40-character Git commit SHA.');
export const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Must be a 64-character SHA-256 hex digest.');

export const relativePathSchema = z
  .string()
  .min(1)
  .superRefine((value, context) => {
    const normalized = value.replaceAll('\\', '/');
    if (
      isAbsolute(value) ||
      win32.isAbsolute(value) ||
      normalized.startsWith('/') ||
      normalized.startsWith('\\\\') ||
      normalized.split('/').includes('..') ||
      hasControlCharacters(value)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Path must stay inside its declared root and not use absolute, UNC, or dot-dot notation.'
      });
    }
  });

export const commandEvidenceSchema = z
  .object({
    argv: z.array(z.string().min(1)).min(1),
    cwd: z.string().min(1),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    durationMs: z.number().int().nonnegative(),
    exitCode: z.number().int(),
    logPath: relativePathSchema,
    logSha256: sha256HexSchema
  })
  .strict();
export type CommandEvidence = z.infer<typeof commandEvidenceSchema>;

export const focusedRegressionClaimSchema = z
  .object({
    testFile: z.string().min(1),
    testCommand: z.string().min(1),
    description: z.string().min(1),
    commandEvidence: commandEvidenceSchema.optional()
  })
  .strict();
export type FocusedRegressionClaim = z.infer<typeof focusedRegressionClaimSchema>;

export const affectedTypecheckClaimSchema = z
  .object({
    command: z.string().min(1),
    description: z.string().min(1).optional(),
    commandEvidence: commandEvidenceSchema.optional()
  })
  .strict();
export type AffectedTypecheckClaim = z.infer<typeof affectedTypecheckClaimSchema>;

export const runtimeEvidenceClaimSchema = z
  .object({
    executed: z.boolean(),
    command: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    notRunReason: z.string().min(1).optional(),
    notes: z.string().min(1).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.executed && (value.notRunReason === undefined || value.notRunReason.trim() === '')) {
      context.addIssue({
        code: 'custom',
        path: ['notRunReason'],
        message: 'When runtime lane is not executed, an explicit not-run uncertainty reason is required.'
      });
    }
  });
export type RuntimeEvidenceClaim = z.infer<typeof runtimeEvidenceClaimSchema>;

export const classifiedFailureClaimSchema = z
  .object({
    caseId: z.string().min(1),
    classification: failureClassificationSchema,
    explanation: z.string().min(1)
  })
  .strict();
export type ClassifiedFailureClaim = z.infer<typeof classifiedFailureClaimSchema>;

export const campaignHandoffSchema = z
  .object({
    schemaVersion: z.literal(CAMPAIGN_HANDOFF_VERSION),
    campaignId: campaignIdSchema,
    campaignType: campaignTypeSchema,
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(10_000),
    baseCommit: commitShaSchema,
    finalCommit: commitShaSchema,
    preFixReportPath: z.string().min(1),
    postFixReportPath: z.string().min(1),
    focusedRegression: focusedRegressionClaimSchema.optional(),
    affectedTypecheck: affectedTypecheckClaimSchema.optional(),
    neighborCases: z.array(z.string().min(1)).optional(),
    runtimeEvidence: runtimeEvidenceClaimSchema.optional(),
    classifiedFailures: z.array(classifiedFailureClaimSchema).optional(),
    uncertainties: z.array(z.string().min(1)).optional(),
    riskNotes: z.string().optional()
  })
  .strict();
export type CampaignHandoff = z.infer<typeof campaignHandoffSchema>;

export const gitCommitInfoSchema = z
  .object({
    sha: commitShaSchema,
    authorName: z.string(),
    authorEmail: z.string(),
    authoredAt: z.string(),
    subject: z.string()
  })
  .strict();
export type GitCommitInfo = z.infer<typeof gitCommitInfoSchema>;

export const gitEvidenceSchema = z
  .object({
    baseCommit: commitShaSchema,
    finalCommit: commitShaSchema,
    headCommit: commitShaSchema,
    branch: z.string(),
    remoteOriginUrl: z.string().optional(),
    commitRange: z.string().min(1),
    commits: z.array(gitCommitInfoSchema),
    cleanFinalWorktree: z.boolean(),
    binaryDiffSha256: sha256HexSchema,
    changedFilesSha256: sha256HexSchema,
    changedFiles: z.array(z.string()),
    diffStat: z
      .object({
        filesChanged: z.number().int().nonnegative(),
        insertions: z.number().int().nonnegative(),
        deletions: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();
export type GitEvidence = z.infer<typeof gitEvidenceSchema>;

export const reportFileEvidenceSchema = z
  .object({
    path: z.string().min(1),
    sha256: sha256HexSchema,
    bytes: z.number().int().nonnegative(),
    productCommit: commitShaSchema,
    productFingerprint: sha256HexSchema,
    runId: z.string().min(1),
    summary: z
      .object({
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        durationMs: z.number().nonnegative()
      })
      .strict(),
    lanes: z.array(qualificationLaneSchema)
  })
  .strict();
export type ReportFileEvidence = z.infer<typeof reportFileEvidenceSchema>;

export const artifactRecordSchema = z
  .object({
    relativePath: z.string().min(1),
    sha256: sha256HexSchema,
    bytes: z.number().int().nonnegative(),
    artifactType: z.enum(['stacktape-config', 'cloudformation-template'])
  })
  .strict();
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;

export const caseArtifactComparisonSchema = z
  .object({
    before: artifactRecordSchema.optional(),
    after: artifactRecordSchema.optional(),
    changed: z.boolean()
  })
  .strict();
export type CaseArtifactComparison = z.infer<typeof caseArtifactComparisonSchema>;

export const laneTransitionTypeSchema = z.enum([
  'fixed',
  'regressed',
  'unchanged-passed',
  'unchanged-failed',
  'unchanged-skipped',
  'added-passed',
  'added-failed',
  'removed',
  'skipped-regression'
]);
export type LaneTransitionType = z.infer<typeof laneTransitionTypeSchema>;

export const laneTransitionSchema = z
  .object({
    lane: qualificationLaneSchema,
    beforeStatus: stepStatusSchema.or(z.literal('absent')),
    afterStatus: stepStatusSchema.or(z.literal('absent')),
    transition: laneTransitionTypeSchema,
    summary: z.string().optional()
  })
  .strict();
export type LaneTransition = z.infer<typeof laneTransitionSchema>;

export const caseTransitionTypeSchema = z.enum([
  'fixed',
  'regressed',
  'unchanged-passed',
  'unchanged-failed',
  'unchanged-skipped',
  'added-passed',
  'added-failed',
  'removed'
]);
export type CaseTransitionType = z.infer<typeof caseTransitionTypeSchema>;

export const caseTransitionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    transitionType: caseTransitionTypeSchema,
    beforeStatus: stepStatusSchema.or(z.literal('absent')),
    afterStatus: stepStatusSchema.or(z.literal('absent')),
    sourceFingerprintBefore: sha256HexSchema.optional(),
    sourceFingerprintAfter: sha256HexSchema.optional(),
    sourceFingerprintMatch: z.boolean(),
    laneTransitions: z.array(laneTransitionSchema),
    configArtifact: caseArtifactComparisonSchema.optional(),
    templateArtifact: caseArtifactComparisonSchema.optional(),
    failuresBefore: z.array(z.string()).optional(),
    failuresAfter: z.array(z.string()).optional()
  })
  .strict();
export type CaseTransition = z.infer<typeof caseTransitionSchema>;

export const executedCommandEvidenceRecordSchema = z
  .object({
    claimType: z.enum(['focused-regression', 'affected-typecheck', 'other']),
    verified: z.boolean(),
    argv: z.array(z.string()),
    cwd: z.string(),
    exitCode: z.number().int(),
    durationMs: z.number().int().nonnegative(),
    logRelativePath: z.string(),
    logSha256: sha256HexSchema,
    logBytes: z.number().int().nonnegative(),
    failureReason: z.string().optional()
  })
  .strict();
export type ExecutedCommandEvidenceRecord = z.infer<typeof executedCommandEvidenceRecordSchema>;

export const claimsVsVerificationSchema = z
  .object({
    workerClaims: campaignHandoffSchema,
    claimPresent: z
      .object({
        focusedRegression: z.boolean(),
        affectedTypecheck: z.boolean(),
        neighborCases: z.boolean(),
        runtimeEvidence: z.boolean()
      })
      .strict(),
    reportedEvidence: z
      .object({
        preFixReportSummary: reportFileEvidenceSchema,
        postFixReportSummary: reportFileEvidenceSchema,
        fixedCasesCount: z.number().int().nonnegative(),
        regressedCasesCount: z.number().int().nonnegative(),
        addedCasesCount: z.number().int().nonnegative(),
        runtimeLanePassedInPostReport: z.boolean()
      })
      .strict(),
    executedCommandEvidence: z
      .object({
        focusedRegression: executedCommandEvidenceRecordSchema.optional(),
        affectedTypecheck: executedCommandEvidenceRecordSchema.optional()
      })
      .strict(),
    independentlyVerified: z
      .object({
        cleanWorktree: z.boolean(),
        headEqualsFinalCommit: z.boolean(),
        baseIsAncestorOfFinal: z.boolean(),
        preFixReportCommitMatchesBase: z.boolean(),
        postFixReportCommitMatchesFinal: z.boolean(),
        qualificationReportsSchemaValid: z.boolean(),
        caseSourceFingerprintsMatch: z.boolean(),
        campaignTypeRequirementsSatisfied: z.boolean(),
        productBugSameSourceSameLaneFixed: z.boolean(),
        neighborCasesPassVerified: z.boolean(),
        expectedArtifactsPresent: z.boolean(),
        artifactsHashedCount: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();
export type ClaimsVsVerification = z.infer<typeof claimsVsVerificationSchema>;

export const reviewRiskSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type ReviewRiskSeverity = z.infer<typeof reviewRiskSeveritySchema>;

export const reviewRiskCodeSchema = z.enum([
  'WORKTREE_DIRTY',
  'FINAL_COMMIT_NOT_HEAD',
  'BASE_COMMIT_NOT_ANCESTOR',
  'BASE_COMMIT_MISMATCH',
  'FINAL_COMMIT_MISMATCH',
  'HARNESS_MODIFIED',
  'MANIFEST_MODIFIED',
  'AWS_OR_OFFLINE_GUARD_MODIFIED',
  'CORE_SYNTHESIS_MODIFIED',
  'PACKAGING_CORE_MODIFIED',
  'SOURCE_FINGERPRINT_MUTATION',
  'SOURCE_FINGERPRINT_MUTATED_ON_FIX',
  'REGRESSED_CASES',
  'COVERAGE_LOSS_CASE_REMOVED',
  'COVERAGE_LOSS_CASE_SKIPPED',
  'COVERAGE_LOSS_LANE_SKIPPED',
  'PRODUCT_BUG_PROOF_FAILED',
  'NEW_COVERAGE_PROOF_FAILED',
  'HARNESS_FIX_REQUIRES_ATTENTION',
  'HARNESS_FIX_NO_HARNESS_DIFF',
  'CORPUS_REFRESH_NO_CORPUS_DIFF',
  'CORPUS_REFRESH_LOST_COVERAGE',
  'INVESTIGATION_NOT_FOR_INTEGRATION',
  'MISSING_FOCUSED_REGRESSION_COMMAND_EVIDENCE',
  'FOCUSED_REGRESSION_COMMAND_FAILED',
  'MISSING_AFFECTED_TYPECHECK_COMMAND_EVIDENCE',
  'AFFECTED_TYPECHECK_COMMAND_FAILED',
  'NEIGHBOR_CASES_UNVERIFIED',
  'MISSING_RUNTIME_EVIDENCE_FOR_PACKAGING',
  'PACKAGING_RUNTIME_UNVERIFIED_WITH_REASON',
  'MISSING_EXPECTED_ARTIFACT',
  'ARTIFACT_SYMLINK_REJECTED',
  'ARTIFACT_PATH_ESCAPE',
  'OUTPUT_DIR_ESCAPE'
]);
export type ReviewRiskCode = z.infer<typeof reviewRiskCodeSchema>;

export const reviewRiskFlagSchema = z
  .object({
    code: reviewRiskCodeSchema,
    severity: reviewRiskSeveritySchema,
    message: z.string().min(1),
    files: z.array(z.string()).optional(),
    caseIds: z.array(z.string()).optional()
  })
  .strict();
export type ReviewRiskFlag = z.infer<typeof reviewRiskFlagSchema>;

export const reviewerSummarySchema = z
  .object({
    verdict: z.enum(['ready-for-review', 'requires-attention', 'rejected']),
    verdictExplanation: z.string().min(1),
    campaignId: campaignIdSchema,
    campaignType: campaignTypeSchema,
    title: z.string().min(1),
    baseCommit: commitShaSchema,
    finalCommit: commitShaSchema,
    totalChangedFiles: z.number().int().nonnegative(),
    fixedCasesCount: z.number().int().nonnegative(),
    regressedCasesCount: z.number().int().nonnegative(),
    riskFlagsCount: z.number().int().nonnegative(),
    criticalRiskCount: z.number().int().nonnegative(),
    highRiskCount: z.number().int().nonnegative()
  })
  .strict();
export type ReviewerSummary = z.infer<typeof reviewerSummarySchema>;

export const qualificationEvidenceSchema = z
  .object({
    preFixReport: reportFileEvidenceSchema,
    postFixReport: reportFileEvidenceSchema,
    caseTransitions: z.array(caseTransitionSchema),
    fixedCaseIds: z.array(z.string()),
    regressedCaseIds: z.array(z.string()),
    addedCaseIds: z.array(z.string()),
    unchangedPassedCaseIds: z.array(z.string()),
    unchangedFailedCaseIds: z.array(z.string())
  })
  .strict();
export type QualificationEvidence = z.infer<typeof qualificationEvidenceSchema>;

export const qualificationReviewBundleSchema = z
  .object({
    schemaVersion: z.literal(QUALIFICATION_REVIEW_BUNDLE_VERSION),
    bundleId: z.string().min(1),
    generatedAt: z.string().datetime(),
    reviewerSummary: reviewerSummarySchema,
    gitEvidence: gitEvidenceSchema,
    qualificationEvidence: qualificationEvidenceSchema,
    claimsVsVerification: claimsVsVerificationSchema,
    riskFlags: z.array(reviewRiskFlagSchema),
    disclaimer: z.string().min(1)
  })
  .strict();
export type QualificationReviewBundle = z.infer<typeof qualificationReviewBundleSchema>;
