import { z } from 'zod';
import { qualificationLaneSchema, stepStatusSchema } from './contracts';

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

const commitShaSchema = z.string().regex(/^[a-f0-9]{40}$/, 'Must be a full 40-character Git commit SHA.');
const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Must be a 64-character SHA-256 hex digest.');

export const focusedRegressionClaimSchema = z
  .object({
    testFile: z.string().min(1),
    testCommand: z.string().min(1),
    description: z.string().min(1)
  })
  .strict();
export type FocusedRegressionClaim = z.infer<typeof focusedRegressionClaimSchema>;

export const affectedTypecheckClaimSchema = z
  .object({
    command: z.string().min(1),
    description: z.string().min(1).optional()
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
    campaignId: z.string().min(2).max(100),
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

export const caseArtifactDigestSchema = z
  .object({
    sha256: sha256HexSchema,
    bytes: z.number().int().nonnegative()
  })
  .strict();
export type CaseArtifactDigest = z.infer<typeof caseArtifactDigestSchema>;

export const caseArtifactComparisonSchema = z
  .object({
    before: caseArtifactDigestSchema.optional(),
    after: caseArtifactDigestSchema.optional(),
    changed: z.boolean()
  })
  .strict();
export type CaseArtifactComparison = z.infer<typeof caseArtifactComparisonSchema>;

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
    configArtifact: caseArtifactComparisonSchema.optional(),
    templateArtifact: caseArtifactComparisonSchema.optional(),
    failuresBefore: z.array(z.string()).optional(),
    failuresAfter: z.array(z.string()).optional()
  })
  .strict();
export type CaseTransition = z.infer<typeof caseTransitionSchema>;

export const reviewRiskSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type ReviewRiskSeverity = z.infer<typeof reviewRiskSeveritySchema>;

export const reviewRiskCodeSchema = z.enum([
  'WORKTREE_DIRTY',
  'BASE_COMMIT_MISMATCH',
  'FINAL_COMMIT_MISMATCH',
  'HARNESS_MODIFIED',
  'MANIFEST_MODIFIED',
  'AWS_OR_OFFLINE_GUARD_MODIFIED',
  'CORE_SYNTHESIS_MODIFIED',
  'PACKAGING_CORE_MODIFIED',
  'SOURCE_FINGERPRINT_MUTATION',
  'REGRESSED_CASES',
  'NO_FIXED_CASES_FOR_PRODUCT_BUG',
  'MISSING_FOCUSED_REGRESSION_FOR_PRODUCT_BUG',
  'MISSING_AFFECTED_TYPECHECK_FOR_PRODUCT_BUG',
  'MISSING_NEIGHBOR_CASES_FOR_PRODUCT_BUG',
  'MISSING_RUNTIME_EVIDENCE_FOR_PACKAGING',
  'UNVERIFIED_WORKER_CLAIMS'
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

export const gitEvidenceSchema = z
  .object({
    baseCommit: commitShaSchema,
    finalCommit: commitShaSchema,
    commitRange: z.string().min(1),
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

export const qualificationReportSummaryEvidenceSchema = z
  .object({
    runId: z.string().min(1),
    generatedAt: z.string().datetime(),
    productCommit: commitShaSchema,
    productFingerprint: sha256HexSchema,
    lanes: z.array(qualificationLaneSchema),
    summary: z
      .object({
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        durationMs: z.number().nonnegative()
      })
      .strict(),
    reportPath: z.string().min(1)
  })
  .strict();
export type QualificationReportSummaryEvidence = z.infer<typeof qualificationReportSummaryEvidenceSchema>;

export const qualificationEvidenceSchema = z
  .object({
    preFixReport: qualificationReportSummaryEvidenceSchema,
    postFixReport: qualificationReportSummaryEvidenceSchema,
    caseTransitions: z.array(caseTransitionSchema),
    fixedCaseIds: z.array(z.string()),
    regressedCaseIds: z.array(z.string()),
    addedCaseIds: z.array(z.string()),
    unchangedPassedCaseIds: z.array(z.string()),
    unchangedFailedCaseIds: z.array(z.string())
  })
  .strict();
export type QualificationEvidence = z.infer<typeof qualificationEvidenceSchema>;

export const automatedVerificationSchema = z
  .object({
    cleanWorktreeVerified: z.boolean(),
    baseCommitVerified: z.boolean(),
    finalCommitVerified: z.boolean(),
    preFixReportVerified: z.boolean(),
    postFixReportVerified: z.boolean(),
    productBugFixVerified: z.boolean(),
    focusedRegressionVerified: z.boolean(),
    affectedTypecheckVerified: z.boolean(),
    neighborCasesVerified: z.boolean(),
    runtimeEvidenceVerified: z.boolean(),
    artifactsHashedCount: z.number().int().nonnegative()
  })
  .strict();
export type AutomatedVerification = z.infer<typeof automatedVerificationSchema>;

export const reviewerSummarySchema = z
  .object({
    verdict: z.enum(['ready-for-review', 'requires-attention', 'rejected']),
    campaignId: z.string().min(1),
    campaignType: campaignTypeSchema,
    title: z.string().min(1),
    baseCommit: commitShaSchema,
    finalCommit: commitShaSchema,
    totalChangedFiles: z.number().int().nonnegative(),
    fixedCasesCount: z.number().int().nonnegative(),
    regressedCasesCount: z.number().int().nonnegative(),
    riskFlagsCount: z.number().int().nonnegative(),
    criticalOrHighRiskCount: z.number().int().nonnegative()
  })
  .strict();
export type ReviewerSummary = z.infer<typeof reviewerSummarySchema>;

export const qualificationReviewBundleSchema = z
  .object({
    schemaVersion: z.literal(QUALIFICATION_REVIEW_BUNDLE_VERSION),
    bundleId: z.string().min(1),
    generatedAt: z.string().datetime(),
    reviewerSummary: reviewerSummarySchema,
    gitEvidence: gitEvidenceSchema,
    qualificationEvidence: qualificationEvidenceSchema,
    claimsVsVerification: z
      .object({
        workerClaims: campaignHandoffSchema,
        automatedVerification: automatedVerificationSchema
      })
      .strict(),
    riskFlags: z.array(reviewRiskFlagSchema),
    disclaimer: z.string().min(1)
  })
  .strict();
export type QualificationReviewBundle = z.infer<typeof qualificationReviewBundleSchema>;
