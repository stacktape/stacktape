import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { qualificationReportSchema, type QualificationCaseResult, type QualificationReport } from './contracts';
import { assertProcessSucceeded, runProcess } from './process';
import { writeJsonAtomic } from './report';
import {
  campaignHandoffSchema,
  QUALIFICATION_REVIEW_BUNDLE_VERSION,
  qualificationReviewBundleSchema,
  type AutomatedVerification,
  type CampaignHandoff,
  type CaseArtifactComparison,
  type CaseArtifactDigest,
  type CaseTransition,
  type CaseTransitionType,
  type GitEvidence,
  type QualificationEvidence,
  type QualificationReportSummaryEvidence,
  type QualificationReviewBundle,
  type ReviewerSummary,
  type ReviewRiskFlag
} from './review-bundle-contracts';

export const REVIEW_BUNDLE_DISCLAIMER =
  'This review bundle provides deterministic automated verification of Git commits, working tree state, qualification reports, case transitions, and artifact digests. It does not provide cryptographic tamper-proofing against malicious local environments or compromised test runners. Worker assertions (problem analysis, regression descriptions, uncertainty explanations) are separated from automatically verified facts (Git history, binary diff SHA-256, schema validation, before/after case transitions, artifact hashes).';

export type BuildReviewBundleOptions = {
  handoff: string | CampaignHandoff;
  preFixReport?: string | QualificationReport;
  postFixReport?: string | QualificationReport;
  baseCommit?: string;
  finalCommit?: string;
  worktreeRoot?: string;
  allowDirty?: boolean;
};

const pathExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
};

const hashBufferOrString = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');

const hashFileIfExists = async (path: string): Promise<CaseArtifactDigest | undefined> => {
  try {
    const exists = await pathExists(path);
    if (!exists) return undefined;
    const content = await readFile(path);
    return {
      sha256: createHash('sha256').update(content).digest('hex'),
      bytes: content.byteLength
    };
  } catch {
    return undefined;
  }
};

export const loadAndValidateHandoff = async (
  handoffPathOrObject: string | CampaignHandoff,
  relativeTo = process.cwd()
): Promise<{ handoff: CampaignHandoff; handoffPath?: string }> => {
  if (typeof handoffPathOrObject === 'string') {
    const absolutePath = resolve(relativeTo, handoffPathOrObject);
    const raw = JSON.parse(await readFile(absolutePath, 'utf8'));
    const parsed = campaignHandoffSchema.parse(raw);
    return { handoff: parsed, handoffPath: absolutePath };
  }
  return { handoff: campaignHandoffSchema.parse(handoffPathOrObject) };
};

export const loadAndValidateReport = async (
  reportPathOrObject: string | QualificationReport,
  relativeTo = process.cwd()
): Promise<{ report: QualificationReport; reportPath: string; reportDir: string }> => {
  if (typeof reportPathOrObject === 'string') {
    const absolutePath = resolve(relativeTo, reportPathOrObject);
    const raw = JSON.parse(await readFile(absolutePath, 'utf8'));
    const parsed = qualificationReportSchema.parse(raw);
    return { report: parsed, reportPath: absolutePath, reportDir: dirname(absolutePath) };
  }
  const parsed = qualificationReportSchema.parse(reportPathOrObject);
  return { report: parsed, reportPath: 'in-memory-report.json', reportDir: process.cwd() };
};

const runGit = async (args: string[], cwd: string, timeoutMs = 60_000) => {
  const result = await runProcess({ command: 'git', args, cwd, timeoutMs });
  assertProcessSucceeded(result);
  return result.stdout;
};

const analyzeGitState = async ({
  baseCommit,
  finalCommit,
  rootDir,
  allowDirty
}: {
  baseCommit: string;
  finalCommit: string;
  rootDir: string;
  allowDirty: boolean;
}): Promise<{ gitEvidence: GitEvidence; gitRiskFlags: ReviewRiskFlag[] }> => {
  const gitRiskFlags: ReviewRiskFlag[] = [];

  // Check working tree cleanliness
  const statusStdout = await runGit(['status', '--porcelain=v1', '--untracked-files=all'], rootDir);
  const isClean = statusStdout.trim() === '';
  if (!isClean) {
    const dirtyFiles = statusStdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3).trim());

    if (!allowDirty) {
      throw new Error(
        `Worktree is dirty. The review bundle requires a clean final worktree.\nDirty entries:\n${statusStdout.trim()}`
      );
    }

    gitRiskFlags.push({
      code: 'WORKTREE_DIRTY',
      severity: 'critical',
      message: `Worktree contains uncommitted tracked or untracked changes (${dirtyFiles.length} file(s)).`,
      files: dirtyFiles.slice(0, 50)
    });
  }

  // Resolve and verify commits
  const resolvedBase = (await runGit(['rev-parse', '--verify', `${baseCommit}^{commit}`], rootDir)).trim();
  const resolvedFinal = (await runGit(['rev-parse', '--verify', `${finalCommit}^{commit}`], rootDir)).trim();

  // Changed files
  const nameOnlyStdout = await runGit(['diff', '--name-only', resolvedBase, resolvedFinal], rootDir);
  const changedFiles = nameOnlyStdout
    .split('\n')
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean)
    .sort();

  const changedFilesSha256 = hashBufferOrString(changedFiles.join('\n'));

  // Binary diff
  const binaryDiffStdout = await runGit(['diff', '--binary', resolvedBase, resolvedFinal], rootDir);
  const binaryDiffSha256 = hashBufferOrString(binaryDiffStdout);

  // Diff stats
  const numstatStdout = await runGit(['diff', '--numstat', resolvedBase, resolvedFinal], rootDir);
  let insertions = 0;
  let deletions = 0;
  for (const line of numstatStdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const ins = Number(parts[0]);
      const del = Number(parts[1]);
      if (!Number.isNaN(ins)) insertions += ins;
      if (!Number.isNaN(del)) deletions += del;
    }
  }

  const gitEvidence: GitEvidence = {
    baseCommit: resolvedBase,
    finalCommit: resolvedFinal,
    commitRange: `${resolvedBase.slice(0, 10)}..${resolvedFinal.slice(0, 10)}`,
    cleanFinalWorktree: isClean,
    binaryDiffSha256,
    changedFilesSha256,
    changedFiles,
    diffStat: {
      filesChanged: changedFiles.length,
      insertions,
      deletions
    }
  };

  return { gitEvidence, gitRiskFlags };
};

const SENSITIVE_PATTERNS = [
  {
    code: 'HARNESS_MODIFIED' as const,
    severity: 'high' as const,
    message: 'Qualification runner, offline AWS guard, or qualification scripts were modified.',
    matches: (file: string) =>
      file.startsWith('apps/cli/scripts/qualification/') ||
      file.startsWith('apps/cli/scripts/real-aws/') ||
      file.includes('verify-source-cli-aws-readonly')
  },
  {
    code: 'MANIFEST_MODIFIED' as const,
    severity: 'high' as const,
    message: 'Corpus manifest, catalog, or qualification expectations were modified.',
    matches: (file: string) =>
      file.endsWith('manifest.json') ||
      file.includes('catalog.ts') ||
      file.includes('init-real-project-corpus-cases') ||
      file.includes('synthetic-project-corpus-expectations')
  },
  {
    code: 'AWS_OR_OFFLINE_GUARD_MODIFIED' as const,
    severity: 'high' as const,
    message: 'AWS clients, credential contexts, or CloudFormation generation logic was modified.',
    matches: (file: string) =>
      file.startsWith('apps/cli/src/aws/') ||
      file.startsWith('packages/cloudformation/') ||
      file.includes('offline-aws.ts')
  },
  {
    code: 'CORE_SYNTHESIS_MODIFIED' as const,
    severity: 'medium' as const,
    message: 'Core CLI synthesis, config inference, or naming packages were modified.',
    matches: (file: string) =>
      file.startsWith('apps/cli/src/domain/') ||
      file.startsWith('packages/config-inference/') ||
      file.startsWith('packages/config-authoring/') ||
      file.startsWith('packages/config/') ||
      file.startsWith('packages/naming/') ||
      file.startsWith('packages/stack-info/')
  },
  {
    code: 'PACKAGING_CORE_MODIFIED' as const,
    severity: 'medium' as const,
    message: 'Packaging core package or helper Lambdas were modified.',
    matches: (file: string) => file.startsWith('packages/packaging/') || file.startsWith('apps/cli/helper-lambdas/')
  }
];

const checkSensitiveFiles = (changedFiles: readonly string[]): ReviewRiskFlag[] => {
  const flags: ReviewRiskFlag[] = [];
  for (const rule of SENSITIVE_PATTERNS) {
    const matching = changedFiles.filter(rule.matches);
    if (matching.length > 0) {
      flags.push({
        code: rule.code,
        severity: rule.severity,
        message: rule.message,
        files: matching
      });
    }
  }
  return flags;
};

const resolveArtifactPath = (
  reportDir: string,
  caseId: string,
  fileName: 'stacktape.yml' | 'compiled-template.yml',
  _caseResult?: QualificationCaseResult
) => {
  // Check standard cases/<id>/<fileName>
  const directPath = join(reportDir, 'cases', caseId, fileName);
  return directPath;
};

const evaluateCaseTransitions = async ({
  preReport,
  preReportDir,
  postReport,
  postReportDir
}: {
  preReport: QualificationReport;
  preReportDir: string;
  postReport: QualificationReport;
  postReportDir: string;
}): Promise<{
  caseTransitions: CaseTransition[];
  fixedCaseIds: string[];
  regressedCaseIds: string[];
  addedCaseIds: string[];
  unchangedPassedCaseIds: string[];
  unchangedFailedCaseIds: string[];
  sourceFingerprintMutationFlags: ReviewRiskFlag[];
  artifactsHashedCount: number;
}> => {
  const preCases = new Map(preReport.cases.map((c) => [c.id, c]));
  const postCases = new Map(postReport.cases.map((c) => [c.id, c]));
  const allIds = [...new Set([...preCases.keys(), ...postCases.keys()])].sort();

  const caseTransitions: CaseTransition[] = [];
  const fixedCaseIds: string[] = [];
  const regressedCaseIds: string[] = [];
  const addedCaseIds: string[] = [];
  const unchangedPassedCaseIds: string[] = [];
  const unchangedFailedCaseIds: string[] = [];
  const sourceFingerprintMutationFlags: ReviewRiskFlag[] = [];
  let artifactsHashedCount = 0;

  for (const id of allIds) {
    const preCase = preCases.get(id);
    const postCase = postCases.get(id);

    const beforeStatus = preCase?.status ?? 'absent';
    const afterStatus = postCase?.status ?? 'absent';

    const sourceFingerprintBefore = preCase?.sourceFingerprint;
    const sourceFingerprintAfter = postCase?.sourceFingerprint;
    const sourceFingerprintMatch =
      sourceFingerprintBefore === undefined || sourceFingerprintAfter === undefined
        ? true
        : sourceFingerprintBefore === sourceFingerprintAfter;

    if (!sourceFingerprintMatch) {
      sourceFingerprintMutationFlags.push({
        code: 'SOURCE_FINGERPRINT_MUTATION',
        severity: 'high',
        message: `Case ${id} source fingerprint changed between pre-fix (${sourceFingerprintBefore?.slice(
          0,
          10
        )}) and post-fix (${sourceFingerprintAfter?.slice(0, 10)}).`,
        caseIds: [id]
      });
    }

    let transitionType: CaseTransitionType;
    if (beforeStatus === 'absent') {
      transitionType = afterStatus === 'passed' ? 'added-passed' : 'added-failed';
      addedCaseIds.push(id);
    } else if (afterStatus === 'absent') {
      transitionType = 'removed';
    } else if (beforeStatus === 'failed' && afterStatus === 'passed') {
      transitionType = 'fixed';
      fixedCaseIds.push(id);
    } else if (beforeStatus === 'passed' && afterStatus === 'failed') {
      transitionType = 'regressed';
      regressedCaseIds.push(id);
    } else if (beforeStatus === 'passed' && afterStatus === 'passed') {
      transitionType = 'unchanged-passed';
      unchangedPassedCaseIds.push(id);
    } else if (beforeStatus === 'failed' && afterStatus === 'failed') {
      transitionType = 'unchanged-failed';
      unchangedFailedCaseIds.push(id);
    } else {
      transitionType = 'unchanged-skipped';
    }

    // Artifact comparisons
    let configArtifact: CaseArtifactComparison | undefined;
    let templateArtifact: CaseArtifactComparison | undefined;

    const preConfigPath = resolveArtifactPath(preReportDir, id, 'stacktape.yml', preCase);
    const postConfigPath = resolveArtifactPath(postReportDir, id, 'stacktape.yml', postCase);
    const preConfigDigest = await hashFileIfExists(preConfigPath);
    const postConfigDigest = await hashFileIfExists(postConfigPath);
    if (preConfigDigest !== undefined || postConfigDigest !== undefined) {
      if (preConfigDigest) artifactsHashedCount++;
      if (postConfigDigest) artifactsHashedCount++;
      configArtifact = {
        before: preConfigDigest,
        after: postConfigDigest,
        changed:
          preConfigDigest !== undefined && postConfigDigest !== undefined
            ? preConfigDigest.sha256 !== postConfigDigest.sha256
            : true
      };
    }

    const preTemplatePath = resolveArtifactPath(preReportDir, id, 'compiled-template.yml', preCase);
    const postTemplatePath = resolveArtifactPath(postReportDir, id, 'compiled-template.yml', postCase);
    const preTemplateDigest = await hashFileIfExists(preTemplatePath);
    const postTemplateDigest = await hashFileIfExists(postTemplatePath);
    if (preTemplateDigest !== undefined || postTemplateDigest !== undefined) {
      if (preTemplateDigest) artifactsHashedCount++;
      if (postTemplateDigest) artifactsHashedCount++;
      templateArtifact = {
        before: preTemplateDigest,
        after: postTemplateDigest,
        changed:
          preTemplateDigest !== undefined && postTemplateDigest !== undefined
            ? preTemplateDigest.sha256 !== postTemplateDigest.sha256
            : true
      };
    }

    const failuresBefore = preCase?.steps
      .filter((s) => s.status === 'failed')
      .map((s) => `${s.name}: ${s.failure?.message ?? s.summary}`);
    const failuresAfter = postCase?.steps
      .filter((s) => s.status === 'failed')
      .map((s) => `${s.name}: ${s.failure?.message ?? s.summary}`);

    caseTransitions.push({
      id,
      title: postCase?.title ?? preCase?.title ?? id,
      transitionType,
      beforeStatus,
      afterStatus,
      ...(sourceFingerprintBefore ? { sourceFingerprintBefore } : {}),
      ...(sourceFingerprintAfter ? { sourceFingerprintAfter } : {}),
      sourceFingerprintMatch,
      ...(configArtifact ? { configArtifact } : {}),
      ...(templateArtifact ? { templateArtifact } : {}),
      ...(failuresBefore && failuresBefore.length > 0 ? { failuresBefore } : {}),
      ...(failuresAfter && failuresAfter.length > 0 ? { failuresAfter } : {})
    });
  }

  return {
    caseTransitions,
    fixedCaseIds,
    regressedCaseIds,
    addedCaseIds,
    unchangedPassedCaseIds,
    unchangedFailedCaseIds,
    sourceFingerprintMutationFlags,
    artifactsHashedCount
  };
};

export const buildReviewBundle = async (options: BuildReviewBundleOptions): Promise<QualificationReviewBundle> => {
  const rootDir = resolve(options.worktreeRoot ?? resolve(import.meta.dir, '..', '..', '..', '..'));
  const allowDirty = Boolean(options.allowDirty);

  // 1. Load & validate handoff
  const { handoff } = await loadAndValidateHandoff(options.handoff, rootDir);

  const baseCommit = options.baseCommit ?? handoff.baseCommit;
  const finalCommit = options.finalCommit ?? handoff.finalCommit;
  const preFixReportPath = options.preFixReport ?? handoff.preFixReportPath;
  const postFixReportPath = options.postFixReport ?? handoff.postFixReportPath;

  // 2. Load & validate reports
  const preReportLoaded = await loadAndValidateReport(preFixReportPath, rootDir);
  const postReportLoaded = await loadAndValidateReport(postFixReportPath, rootDir);

  // 3. Analyze Git state
  const { gitEvidence, gitRiskFlags } = await analyzeGitState({
    baseCommit,
    finalCommit,
    rootDir,
    allowDirty
  });

  const riskFlags: ReviewRiskFlag[] = [...gitRiskFlags];

  // 4. Verify commit alignments with reports
  const baseCommitVerified = preReportLoaded.report.productCommit === gitEvidence.baseCommit;
  if (!baseCommitVerified) {
    riskFlags.push({
      code: 'BASE_COMMIT_MISMATCH',
      severity: 'critical',
      message: `Pre-fix qualification report commit (${preReportLoaded.report.productCommit}) does not match declared/verified base commit (${gitEvidence.baseCommit}).`
    });
  }

  const finalCommitVerified = postReportLoaded.report.productCommit === gitEvidence.finalCommit;
  if (!finalCommitVerified) {
    riskFlags.push({
      code: 'FINAL_COMMIT_MISMATCH',
      severity: 'critical',
      message: `Post-fix qualification report commit (${postReportLoaded.report.productCommit}) does not match declared/verified final commit (${gitEvidence.finalCommit}).`
    });
  }

  // 5. Evaluate Case Transitions & Artifacts
  const {
    caseTransitions,
    fixedCaseIds,
    regressedCaseIds,
    addedCaseIds,
    unchangedPassedCaseIds,
    unchangedFailedCaseIds,
    sourceFingerprintMutationFlags,
    artifactsHashedCount
  } = await evaluateCaseTransitions({
    preReport: preReportLoaded.report,
    preReportDir: preReportLoaded.reportDir,
    postReport: postReportLoaded.report,
    postReportDir: postReportLoaded.reportDir
  });

  riskFlags.push(...sourceFingerprintMutationFlags);

  if (regressedCaseIds.length > 0) {
    riskFlags.push({
      code: 'REGRESSED_CASES',
      severity: 'critical',
      message: `Qualification cases regressed after the fix (${regressedCaseIds.length} case(s)): ${regressedCaseIds.join(
        ', '
      )}.`,
      caseIds: regressedCaseIds
    });
  }

  // 6. Check sensitive files
  const sensitiveFlags = checkSensitiveFiles(gitEvidence.changedFiles);
  riskFlags.push(...sensitiveFlags);

  // 7. Check campaign-specific requirements
  let productBugFixVerified = false;
  let focusedRegressionVerified = false;
  let affectedTypecheckVerified = false;
  let neighborCasesVerified = false;

  if (handoff.campaignType === 'product-bug') {
    productBugFixVerified = fixedCaseIds.length > 0;
    if (!productBugFixVerified) {
      riskFlags.push({
        code: 'NO_FIXED_CASES_FOR_PRODUCT_BUG',
        severity: 'critical',
        message:
          'Product-bug campaigns must prove at least one failed-before/passed-after qualification case transition.'
      });
    }

    focusedRegressionVerified = Boolean(
      handoff.focusedRegression &&
      handoff.focusedRegression.testFile.trim().length > 0 &&
      handoff.focusedRegression.testCommand.trim().length > 0
    );
    if (!focusedRegressionVerified) {
      riskFlags.push({
        code: 'MISSING_FOCUSED_REGRESSION_FOR_PRODUCT_BUG',
        severity: 'high',
        message: 'Product-bug campaigns must provide focused regression test evidence.'
      });
    }

    affectedTypecheckVerified = Boolean(
      handoff.affectedTypecheck && handoff.affectedTypecheck.command.trim().length > 0
    );
    if (!affectedTypecheckVerified) {
      riskFlags.push({
        code: 'MISSING_AFFECTED_TYPECHECK_FOR_PRODUCT_BUG',
        severity: 'high',
        message: 'Product-bug campaigns must provide affected package typecheck evidence.'
      });
    }

    neighborCasesVerified = Boolean(handoff.neighborCases && handoff.neighborCases.length > 0);
    if (!neighborCasesVerified) {
      riskFlags.push({
        code: 'MISSING_NEIGHBOR_CASES_FOR_PRODUCT_BUG',
        severity: 'high',
        message: 'Product-bug campaigns must list neighbor cases run to prevent collateral regressions.'
      });
    }
  } else {
    productBugFixVerified = true;
    focusedRegressionVerified = Boolean(handoff.focusedRegression);
    affectedTypecheckVerified = Boolean(handoff.affectedTypecheck);
    neighborCasesVerified = Boolean(handoff.neighborCases && handoff.neighborCases.length > 0);
  }

  // 8. Packaging change runtime evidence requirement
  const packagingChanged = gitEvidence.changedFiles.some(
    (file) => file.startsWith('packages/packaging/') || file.startsWith('apps/cli/helper-lambdas/')
  );
  const runtimeLanePassedInPostReport =
    postReportLoaded.report.lanes.includes('runtime') &&
    postReportLoaded.report.globalSteps.some((s) => s.name === 'runtime' && s.status === 'passed');
  const runtimeClaim = handoff.runtimeEvidence;
  const runtimeEvidenceVerified =
    !packagingChanged ||
    runtimeLanePassedInPostReport ||
    Boolean(runtimeClaim && (runtimeClaim.executed || Boolean(runtimeClaim.notRunReason?.trim())));

  if (packagingChanged && !runtimeEvidenceVerified) {
    riskFlags.push({
      code: 'MISSING_RUNTIME_EVIDENCE_FOR_PACKAGING',
      severity: 'high',
      message: 'Packaging changes require runtime lane evidence or an explicit not-run uncertainty reason.'
    });
  }

  // 9. Automated verification summary
  const automatedVerification: AutomatedVerification = {
    cleanWorktreeVerified: gitEvidence.cleanFinalWorktree,
    baseCommitVerified,
    finalCommitVerified,
    preFixReportVerified: true,
    postFixReportVerified: true,
    productBugFixVerified,
    focusedRegressionVerified,
    affectedTypecheckVerified,
    neighborCasesVerified,
    runtimeEvidenceVerified,
    artifactsHashedCount
  };

  // 10. Compute verdict
  const hasCritical = riskFlags.some((f) => f.severity === 'critical');
  const criticalOrHighRiskCount = riskFlags.filter((f) => f.severity === 'critical' || f.severity === 'high').length;

  let verdict: ReviewerSummary['verdict'];
  if (hasCritical) {
    verdict = 'rejected';
  } else if (criticalOrHighRiskCount > 0 || regressedCaseIds.length > 0) {
    verdict = 'requires-attention';
  } else {
    verdict = 'ready-for-review';
  }

  const reviewerSummary: ReviewerSummary = {
    verdict,
    campaignId: handoff.campaignId,
    campaignType: handoff.campaignType,
    title: handoff.title,
    baseCommit: gitEvidence.baseCommit,
    finalCommit: gitEvidence.finalCommit,
    totalChangedFiles: gitEvidence.changedFiles.length,
    fixedCasesCount: fixedCaseIds.length,
    regressedCasesCount: regressedCaseIds.length,
    riskFlagsCount: riskFlags.length,
    criticalOrHighRiskCount
  };

  const preFixSummaryEvidence: QualificationReportSummaryEvidence = {
    runId: preReportLoaded.report.runId,
    generatedAt: preReportLoaded.report.generatedAt,
    productCommit: preReportLoaded.report.productCommit,
    productFingerprint: preReportLoaded.report.productFingerprint,
    lanes: preReportLoaded.report.lanes,
    summary: preReportLoaded.report.summary,
    reportPath: relative(rootDir, preReportLoaded.reportPath).replaceAll('\\', '/')
  };

  const postFixSummaryEvidence: QualificationReportSummaryEvidence = {
    runId: postReportLoaded.report.runId,
    generatedAt: postReportLoaded.report.generatedAt,
    productCommit: postReportLoaded.report.productCommit,
    productFingerprint: postReportLoaded.report.productFingerprint,
    lanes: postReportLoaded.report.lanes,
    summary: postReportLoaded.report.summary,
    reportPath: relative(rootDir, postReportLoaded.reportPath).replaceAll('\\', '/')
  };

  const qualificationEvidence: QualificationEvidence = {
    preFixReport: preFixSummaryEvidence,
    postFixReport: postFixSummaryEvidence,
    caseTransitions,
    fixedCaseIds,
    regressedCaseIds,
    addedCaseIds,
    unchangedPassedCaseIds,
    unchangedFailedCaseIds
  };

  const bundle: QualificationReviewBundle = {
    schemaVersion: QUALIFICATION_REVIEW_BUNDLE_VERSION,
    bundleId: `review-${handoff.campaignId}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    generatedAt: new Date().toISOString(),
    reviewerSummary,
    gitEvidence,
    qualificationEvidence,
    claimsVsVerification: {
      workerClaims: handoff,
      automatedVerification
    },
    riskFlags,
    disclaimer: REVIEW_BUNDLE_DISCLAIMER
  };

  return qualificationReviewBundleSchema.parse(bundle);
};

const escapeTableCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');

export const renderReviewBundleMarkdown = (bundle: QualificationReviewBundle): string => {
  const { reviewerSummary, gitEvidence, qualificationEvidence, claimsVsVerification, riskFlags } = bundle;
  const workerClaims = claimsVsVerification.workerClaims;
  const verified = claimsVsVerification.automatedVerification;

  const verdictBadge =
    reviewerSummary.verdict === 'ready-for-review'
      ? '`READY FOR REVIEW`'
      : reviewerSummary.verdict === 'requires-attention'
        ? '`REQUIRES ATTENTION`'
        : '`REJECTED (FAIL-CLOSED)`';

  const riskTable =
    riskFlags.length === 0
      ? '_No risk flags identified._'
      : [
          '| Severity | Code | Details | Affected Files / Cases |',
          '| --- | --- | --- | --- |',
          ...riskFlags.map((f) => {
            const affected =
              [
                ...(f.files ?? []).map((file) => `\`${file}\``),
                ...(f.caseIds ?? []).map((id) => `case \`${id}\``)
              ].join(', ') || '—';
            return `| **${f.severity.toUpperCase()}** | \`${f.code}\` | ${escapeTableCell(
              f.message
            )} | ${escapeTableCell(affected)} |`;
          })
        ].join('\n');

  const transitionRows = qualificationEvidence.caseTransitions.map((t) => {
    const configNote = t.configArtifact ? (t.configArtifact.changed ? 'Modified' : 'Identical') : 'None';
    const templateNote = t.templateArtifact ? (t.templateArtifact.changed ? 'Modified' : 'Identical') : 'None';
    const matchNote = t.sourceFingerprintMatch ? 'Yes' : '**No (Mutated)**';
    return `| \`${t.id}\` | \`${t.beforeStatus}\` | \`${t.afterStatus}\` | **${t.transitionType}** | ${matchNote} | ${configNote} | ${templateNote} |`;
  });

  const failureDetails = qualificationEvidence.caseTransitions
    .filter((t) => (t.failuresBefore && t.failuresBefore.length > 0) || (t.failuresAfter && t.failuresAfter.length > 0))
    .map((t) => {
      const parts = [`### Case \`${t.id}\``, ''];
      if (t.failuresBefore && t.failuresBefore.length > 0) {
        parts.push('**Pre-fix Failures:**');
        for (const f of t.failuresBefore) parts.push(`- ${escapeTableCell(f)}`);
      }
      if (t.failuresAfter && t.failuresAfter.length > 0) {
        parts.push('', '**Post-fix Failures:**');
        for (const f of t.failuresAfter) parts.push(`- ${escapeTableCell(f)}`);
      }
      return parts.join('\n');
    });

  const classifiedFailures = workerClaims.classifiedFailures ?? [];
  const classifiedTable =
    classifiedFailures.length === 0
      ? '_None declared._'
      : [
          '| Case | Classification | Root Cause / Explanation |',
          '| --- | --- | --- |',
          ...classifiedFailures.map(
            (c) => `| \`${c.caseId}\` | \`${c.classification}\` | ${escapeTableCell(c.explanation)} |`
          )
        ].join('\n');

  const uncertainties = workerClaims.uncertainties ?? [];
  const uncertaintiesList =
    uncertainties.length === 0
      ? '_None declared by worker._'
      : uncertainties.map((u) => `- ${escapeTableCell(u)}`).join('\n');

  return `${[
    `# Hardening Review Bundle: ${workerClaims.title}`,
    '',
    `**Verdict:** ${verdictBadge}  `,
    `**Campaign:** \`${reviewerSummary.campaignId}\` (\`${reviewerSummary.campaignType}\`)  `,
    `**Generated:** ${bundle.generatedAt}  `,
    '',
    '## Executive Summary',
    '',
    '| Dimension | Value |',
    '| --- | --- |',
    `| **Verdict** | ${verdictBadge} |`,
    `| **Base Commit** | \`${gitEvidence.baseCommit}\` |`,
    `| **Final Commit** | \`${gitEvidence.finalCommit}\` |`,
    `| **Changed Files** | ${gitEvidence.changedFiles.length} files (+${gitEvidence.diffStat.insertions}, -${gitEvidence.diffStat.deletions}) |`,
    `| **Fixed Cases** | ${qualificationEvidence.fixedCaseIds.length} (\`${qualificationEvidence.fixedCaseIds.join(', ') || 'none'}\`) |`,
    `| **Regressed Cases** | ${qualificationEvidence.regressedCaseIds.length} (\`${qualificationEvidence.regressedCaseIds.join(', ') || 'none'}\`) |`,
    `| **Binary Diff SHA-256** | \`${gitEvidence.binaryDiffSha256}\` |`,
    `| **Changed Files SHA-256** | \`${gitEvidence.changedFilesSha256}\` |`,
    `| **Clean Worktree** | ${gitEvidence.cleanFinalWorktree ? 'Yes' : '**No (Dirty)**'} |`,
    '',
    '## Risk Analysis',
    '',
    riskTable,
    '',
    '## Automated Verification vs Worker Claims',
    '',
    '| Check | Verified Fact | Worker Claim / Context |',
    '| --- | --- | --- |',
    `| **Worktree Clean** | ${verified.cleanWorktreeVerified ? 'PASS' : 'FAIL'} | Worker finalized branch |`,
    `| **Commit Alignment** | ${verified.baseCommitVerified && verified.finalCommitVerified ? 'PASS' : 'FAIL'} | \`${gitEvidence.commitRange}\` |`,
    `| **Fixed Case Proof** | ${verified.productBugFixVerified ? 'PASS' : 'FAIL'} | Fixed: ${qualificationEvidence.fixedCaseIds.join(', ') || 'none'} |`,
    `| **Focused Regression** | ${verified.focusedRegressionVerified ? 'PASS' : 'FAIL'} | ${workerClaims.focusedRegression ? `\`${workerClaims.focusedRegression.testCommand}\`` : 'None'} |`,
    `| **Affected Typecheck** | ${verified.affectedTypecheckVerified ? 'PASS' : 'FAIL'} | ${workerClaims.affectedTypecheck ? `\`${workerClaims.affectedTypecheck.command}\`` : 'None'} |`,
    `| **Neighbor Cases** | ${verified.neighborCasesVerified ? 'PASS' : 'FAIL'} | ${workerClaims.neighborCases?.join(', ') || 'None'} |`,
    `| **Runtime Evidence** | ${verified.runtimeEvidenceVerified ? 'PASS' : 'FAIL'} | ${workerClaims.runtimeEvidence?.executed ? 'Executed' : (workerClaims.runtimeEvidence?.notRunReason ?? 'Not specified')} |`,
    `| **Artifacts Hashed** | ${verified.artifactsHashedCount} artifact(s) | Generated configs and templates compared |`,
    '',
    '### Worker Summary & Analysis',
    '',
    workerClaims.summary,
    '',
    '### Failure Classifications',
    '',
    classifiedTable,
    '',
    '### Declared Uncertainties & Gaps',
    '',
    uncertaintiesList,
    '',
    '## Qualification Case Transitions',
    '',
    '| Case ID | Pre-fix Status | Post-fix Status | Transition | Source Matched | Config Diff | Template Diff |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...transitionRows,
    '',
    ...(failureDetails.length > 0 ? ['## Failure Summaries', '', ...failureDetails, ''] : []),
    '## Changed Files',
    '',
    gitEvidence.changedFiles.length === 0
      ? '_No files changed between base and final commits._'
      : gitEvidence.changedFiles.map((file) => `- \`${file}\``).join('\n'),
    '',
    '## Trust Boundary & Disclaimer',
    '',
    `> [!NOTE]`,
    `> ${bundle.disclaimer}`
  ].join('\n')}\n`;
};

export const writeReviewBundle = async (outputDirectory: string, bundle: QualificationReviewBundle) => {
  const jsonPath = join(outputDirectory, 'review-bundle.json');
  const markdownPath = join(outputDirectory, 'review-bundle.md');
  await writeJsonAtomic(jsonPath, bundle);
  await writeJsonAtomic(markdownPath, renderReviewBundleMarkdown(bundle));
  // Note: write markdown plain
  const { writeFile } = await import('node:fs/promises');
  await writeFile(markdownPath, renderReviewBundleMarkdown(bundle), 'utf8');
  return { jsonPath, markdownPath };
};
