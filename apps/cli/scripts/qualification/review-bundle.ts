import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import {
  qualificationReportSchema,
  type QualificationLane,
  type QualificationReport,
  type StepStatus
} from './contracts';
import { assertProcessSucceeded, runProcess } from './process';
import {
  campaignHandoffSchema,
  hasControlCharacters,
  QUALIFICATION_REVIEW_BUNDLE_VERSION,
  qualificationReviewBundleSchema,
  type ArtifactRecord,
  type CaseArtifactComparison,
  type CaseTransition,
  type CaseTransitionType,
  type ClaimsVsVerification,
  type CommandEvidence,
  type ExecutedCommandEvidenceRecord,
  type GitCommitInfo,
  type GitEvidence,
  type LaneTransition,
  type LaneTransitionType,
  type QualificationEvidence,
  type QualificationReviewBundle,
  type ReportFileEvidence,
  type ReviewerSummary,
  type ReviewRiskFlag
} from './review-bundle-contracts';

export const REVIEW_BUNDLE_DISCLAIMER =
  'This review bundle provides deterministic automated verification of Git commits, repository provenance, qualification report schemas, case transitions, command execution logs, and artifact digests. It does not provide cryptographic tamper-proofing against malicious local host environments or compromised test runners. Worker-authored assertions (problem descriptions, justifications, failure classifications, uncertainty notes) are separated from automatically verified facts (Git history, streaming binary diff SHA-256, schema validation, same-source same-lane case transitions, artifact hashes).';

export type BuildReviewBundleOptions = {
  handoff: string | object;
  preFixReport?: string | QualificationReport;
  postFixReport?: string | QualificationReport;
  baseCommit?: string;
  finalCommit?: string;
  worktreeRoot?: string;
  outputDirectory?: string;
  allowDirty?: boolean;
};

export const assertPathConfined = ({
  baseDirectory,
  targetPath,
  label
}: {
  baseDirectory: string;
  targetPath: string;
  label: string;
}): string => {
  if (targetPath.startsWith('\\\\') || targetPath.startsWith('//')) {
    throw new Error(`${label} cannot be a UNC path.`);
  }
  if (hasControlCharacters(targetPath)) {
    throw new Error(`${label} contains invalid control characters.`);
  }
  const resolvedBase = resolve(baseDirectory);
  const resolvedTarget = resolve(baseDirectory, targetPath);
  const rel = relative(resolvedBase, resolvedTarget);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('../') || isAbsolute(rel) || win32.isAbsolute(rel)) {
    throw new Error(`${label} resolves outside ${resolvedBase}.`);
  }
  return resolvedTarget;
};

export const hashBufferOrString = (content: string | Buffer): string =>
  createHash('sha256').update(content).digest('hex');

export const hashFileStream = (filePath: string): Promise<{ sha256: string; bytes: number }> =>
  new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    let bytes = 0;
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => {
      bytes += chunk.length;
      hash.update(chunk);
    });
    stream.once('error', reject);
    stream.once('end', () => resolveHash({ sha256: hash.digest('hex'), bytes }));
  });

export const hashBinaryDiffStream = (base: string, final: string, cwd: string): Promise<string> =>
  new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const child = spawn('git', ['diff', '--binary', base, final], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => hash.update(chunk));
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) reject(new Error(`git diff --binary exited with code ${code}`));
      else resolveHash(hash.digest('hex'));
    });
  });

export const writePlainTextAtomic = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.partial-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, content, 'utf8');
  await rename(temporaryPath, path);
};

export const writeJsonAtomic = async (path: string, value: unknown): Promise<void> => {
  await writePlainTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const loadAndValidateHandoff = async (handoffPathOrObject: string | object, relativeTo = process.cwd()) => {
  if (typeof handoffPathOrObject === 'string') {
    const absolutePath = resolve(relativeTo, handoffPathOrObject);
    const raw = JSON.parse(await readFile(absolutePath, 'utf8'));
    const parsed = campaignHandoffSchema.parse(raw);
    return { handoff: parsed, handoffPath: absolutePath };
  }
  return { handoff: campaignHandoffSchema.parse(handoffPathOrObject) };
};

export const loadAndValidateReportFile = async (
  reportPathOrObject: string | QualificationReport,
  relativeTo = process.cwd()
): Promise<{
  report: QualificationReport;
  reportPath: string;
  reportDir: string;
  sha256: string;
  bytes: number;
}> => {
  if (typeof reportPathOrObject === 'string') {
    const absolutePath = resolve(relativeTo, reportPathOrObject);
    const { sha256, bytes } = await hashFileStream(absolutePath);
    const raw = JSON.parse(await readFile(absolutePath, 'utf8'));
    const parsed = qualificationReportSchema.parse(raw);
    return {
      report: parsed,
      reportPath: absolutePath,
      reportDir: dirname(absolutePath),
      sha256,
      bytes
    };
  }
  const content = JSON.stringify(reportPathOrObject);
  const parsed = qualificationReportSchema.parse(reportPathOrObject);
  return {
    report: parsed,
    reportPath: 'in-memory-report.json',
    reportDir: process.cwd(),
    sha256: hashBufferOrString(content),
    bytes: Buffer.byteLength(content, 'utf8')
  };
};

const runGit = async (args: string[], cwd: string, timeoutMs = 60_000): Promise<string> => {
  const result = await runProcess({ command: 'git', args, cwd, timeoutMs });
  assertProcessSucceeded(result);
  return result.stdout;
};

const verifyCommandEvidence = async ({
  commandEvidence,
  baseDirectory,
  claimType
}: {
  commandEvidence?: CommandEvidence;
  baseDirectory: string;
  claimType: 'focused-regression' | 'affected-typecheck' | 'other';
}): Promise<{
  record?: ExecutedCommandEvidenceRecord;
  verified: boolean;
  riskFlag?: ReviewRiskFlag;
}> => {
  if (!commandEvidence) {
    return { verified: false };
  }

  let logFullPath: string;
  try {
    logFullPath = assertPathConfined({
      baseDirectory,
      targetPath: commandEvidence.logPath,
      label: `${claimType} logPath`
    });
  } catch (error) {
    return {
      verified: false,
      record: {
        claimType,
        verified: false,
        argv: commandEvidence.argv,
        cwd: commandEvidence.cwd,
        exitCode: commandEvidence.exitCode,
        durationMs: commandEvidence.durationMs,
        logRelativePath: commandEvidence.logPath,
        logSha256: commandEvidence.logSha256,
        logBytes: 0,
        failureReason: error instanceof Error ? error.message : String(error)
      },
      riskFlag: {
        code:
          claimType === 'focused-regression'
            ? 'FOCUSED_REGRESSION_COMMAND_FAILED'
            : 'AFFECTED_TYPECHECK_COMMAND_FAILED',
        severity: 'critical',
        message: `Command log path escapes allowed root: ${String(error)}`
      }
    };
  }

  try {
    const fileStats = await lstat(logFullPath);
    if (fileStats.isSymbolicLink()) {
      return {
        verified: false,
        riskFlag: {
          code:
            claimType === 'focused-regression'
              ? 'FOCUSED_REGRESSION_COMMAND_FAILED'
              : 'AFFECTED_TYPECHECK_COMMAND_FAILED',
          severity: 'critical',
          message: `${claimType} log file cannot be a symbolic link.`
        }
      };
    }

    const { sha256, bytes } = await hashFileStream(logFullPath);
    if (sha256 !== commandEvidence.logSha256) {
      return {
        verified: false,
        record: {
          claimType,
          verified: false,
          argv: commandEvidence.argv,
          cwd: commandEvidence.cwd,
          exitCode: commandEvidence.exitCode,
          durationMs: commandEvidence.durationMs,
          logRelativePath: commandEvidence.logPath,
          logSha256: commandEvidence.logSha256,
          logBytes: bytes,
          failureReason: `Log SHA-256 mismatch: recorded ${commandEvidence.logSha256}, actual ${sha256}`
        },
        riskFlag: {
          code:
            claimType === 'focused-regression'
              ? 'FOCUSED_REGRESSION_COMMAND_FAILED'
              : 'AFFECTED_TYPECHECK_COMMAND_FAILED',
          severity: 'critical',
          message: `${claimType} log SHA-256 digest does not match file on disk.`
        }
      };
    }

    if (commandEvidence.exitCode !== 0) {
      return {
        verified: false,
        record: {
          claimType,
          verified: false,
          argv: commandEvidence.argv,
          cwd: commandEvidence.cwd,
          exitCode: commandEvidence.exitCode,
          durationMs: commandEvidence.durationMs,
          logRelativePath: commandEvidence.logPath,
          logSha256: commandEvidence.logSha256,
          logBytes: bytes,
          failureReason: `Command exited with nonzero code ${commandEvidence.exitCode}`
        },
        riskFlag: {
          code:
            claimType === 'focused-regression'
              ? 'FOCUSED_REGRESSION_COMMAND_FAILED'
              : 'AFFECTED_TYPECHECK_COMMAND_FAILED',
          severity: 'high',
          message: `${claimType} command exited with nonzero code ${commandEvidence.exitCode}.`
        }
      };
    }

    return {
      verified: true,
      record: {
        claimType,
        verified: true,
        argv: commandEvidence.argv,
        cwd: commandEvidence.cwd,
        exitCode: commandEvidence.exitCode,
        durationMs: commandEvidence.durationMs,
        logRelativePath: commandEvidence.logPath,
        logSha256: commandEvidence.logSha256,
        logBytes: bytes
      }
    };
  } catch (error) {
    return {
      verified: false,
      riskFlag: {
        code:
          claimType === 'focused-regression'
            ? 'FOCUSED_REGRESSION_COMMAND_FAILED'
            : 'AFFECTED_TYPECHECK_COMMAND_FAILED',
        severity: 'critical',
        message: `Could not verify ${claimType} log file: ${String(error)}`
      }
    };
  }
};

const analyzeGitProvenance = async ({
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

  // Check status
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

  // HEAD commit
  const headCommit = (await runGit(['rev-parse', 'HEAD'], rootDir)).trim();
  const resolvedBase = (await runGit(['rev-parse', '--verify', `${baseCommit}^{commit}`], rootDir)).trim();
  const resolvedFinal = (await runGit(['rev-parse', '--verify', `${finalCommit}^{commit}`], rootDir)).trim();

  if (resolvedFinal !== headCommit) {
    gitRiskFlags.push({
      code: 'FINAL_COMMIT_NOT_HEAD',
      severity: 'critical',
      message: `Final commit ${resolvedFinal} does not equal current HEAD ${headCommit}.`
    });
  }

  // Ancestry check
  try {
    await runGit(['merge-base', '--is-ancestor', resolvedBase, resolvedFinal], rootDir);
  } catch {
    gitRiskFlags.push({
      code: 'BASE_COMMIT_NOT_ANCESTOR',
      severity: 'critical',
      message: `Base commit ${resolvedBase} is not an ancestor of final commit ${resolvedFinal}.`
    });
  }

  // Branch & remote
  let branch = 'HEAD';
  try {
    branch = (await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], rootDir)).trim();
  } catch {}

  let remoteOriginUrl: string | undefined;
  try {
    remoteOriginUrl = (await runGit(['remote', 'get-url', 'origin'], rootDir)).trim();
  } catch {}

  // Commit history list
  const logStdout = await runGit(
    ['log', '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%s', `${resolvedBase}..${resolvedFinal}`],
    rootDir
  );
  const commits: GitCommitInfo[] = logStdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, authorName, authorEmail, authoredAt, subject] = line.split('\x1f');
      return {
        sha: sha ?? '',
        authorName: authorName ?? '',
        authorEmail: authorEmail ?? '',
        authoredAt: authoredAt ?? '',
        subject: subject ?? ''
      };
    });

  // Changed files NUL-delimited
  const nameOnlyStdout = await runGit(['diff', '-z', '--name-only', resolvedBase, resolvedFinal], rootDir);
  const changedFiles = nameOnlyStdout
    .split('\0')
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean)
    .sort();
  const changedFilesSha256 = hashBufferOrString(changedFiles.join('\n'));

  // Streaming binary diff hash
  const binaryDiffSha256 = await hashBinaryDiffStream(resolvedBase, resolvedFinal, rootDir);

  // Numstat diff stats
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
    headCommit,
    branch,
    ...(remoteOriginUrl ? { remoteOriginUrl } : {}),
    commitRange: `${resolvedBase.slice(0, 10)}..${resolvedFinal.slice(0, 10)}`,
    commits,
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

const validateAndHashArtifactFile = async ({
  reportDir,
  caseId,
  fileName,
  artifactType
}: {
  reportDir: string;
  caseId: string;
  fileName: 'stacktape.yml' | 'compiled-template.yml';
  artifactType: 'stacktape-config' | 'cloudformation-template';
}): Promise<{ record?: ArtifactRecord; riskFlag?: ReviewRiskFlag }> => {
  const expectedPath = join(reportDir, 'cases', caseId, fileName);
  try {
    const stats = await lstat(expectedPath);
    if (stats.isSymbolicLink()) {
      return {
        riskFlag: {
          code: 'ARTIFACT_SYMLINK_REJECTED',
          severity: 'critical',
          message: `Artifact file ${expectedPath} cannot be a symbolic link.`,
          caseIds: [caseId]
        }
      };
    }

    const realReportDir = await realpath(reportDir);
    const realArtifactPath = await realpath(expectedPath);
    const rel = relative(realReportDir, realArtifactPath);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || win32.isAbsolute(rel)) {
      return {
        riskFlag: {
          code: 'ARTIFACT_PATH_ESCAPE',
          severity: 'critical',
          message: `Artifact ${expectedPath} resolves outside report directory ${realReportDir}.`,
          caseIds: [caseId]
        }
      };
    }

    const { sha256, bytes } = await hashFileStream(realArtifactPath);
    return {
      record: {
        relativePath: `cases/${caseId}/${fileName}`,
        sha256,
        bytes,
        artifactType
      }
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
};

const evaluateCaseTransitionsAndArtifacts = async ({
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
  transitionRiskFlags: ReviewRiskFlag[];
  artifactsHashedCount: number;
  productBugSameSourceSameLaneFixed: boolean;
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
  const transitionRiskFlags: ReviewRiskFlag[] = [];
  let artifactsHashedCount = 0;
  let productBugSameSourceSameLaneFixed = false;

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
      transitionRiskFlags.push({
        code: 'SOURCE_FINGERPRINT_MUTATION',
        severity: 'high',
        message: `Case '${id}' source fingerprint changed between pre-fix (${sourceFingerprintBefore?.slice(
          0,
          10
        )}) and post-fix (${sourceFingerprintAfter?.slice(0, 10)}).`,
        caseIds: [id]
      });
    }

    // Lane transitions
    const laneTransitions: LaneTransition[] = [];
    const allLanes: QualificationLane[] = ['import', 'package', 'runtime', 'aws'];
    let hasSameSourceSameLaneFix = false;

    for (const lane of allLanes) {
      const preStep = preCase?.steps.find((s) => s.name === lane);
      const postStep = postCase?.steps.find((s) => s.name === lane);

      const beforeLaneStatus: StepStatus | 'absent' = preStep?.status ?? 'absent';
      const afterLaneStatus: StepStatus | 'absent' = postStep?.status ?? 'absent';

      if (beforeLaneStatus === 'absent' && afterLaneStatus === 'absent') {
        continue;
      }

      let transition: LaneTransitionType;
      if (beforeLaneStatus === 'passed' && (afterLaneStatus === 'skipped' || afterLaneStatus === 'absent')) {
        transition = 'skipped-regression';
        transitionRiskFlags.push({
          code: 'COVERAGE_LOSS_LANE_SKIPPED',
          severity: 'critical',
          message: `Case '${id}' previously passed lane '${lane}' but was skipped or absent in post-fix run.`,
          caseIds: [id]
        });
      } else if (beforeLaneStatus === 'failed' && afterLaneStatus === 'passed') {
        transition = 'fixed';
        if (sourceFingerprintMatch) {
          hasSameSourceSameLaneFix = true;
        } else {
          transitionRiskFlags.push({
            code: 'SOURCE_FINGERPRINT_MUTATED_ON_FIX',
            severity: 'critical',
            message: `Case '${id}' passed lane '${lane}' after failing, but its source fingerprint mutated.`,
            caseIds: [id]
          });
        }
      } else if (beforeLaneStatus === 'passed' && afterLaneStatus === 'failed') {
        transition = 'regressed';
      } else if (beforeLaneStatus === 'passed' && afterLaneStatus === 'passed') {
        transition = 'unchanged-passed';
      } else if (beforeLaneStatus === 'failed' && afterLaneStatus === 'failed') {
        transition = 'unchanged-failed';
      } else if (beforeLaneStatus === 'skipped' && afterLaneStatus === 'skipped') {
        transition = 'unchanged-skipped';
      } else if (beforeLaneStatus === 'absent' && afterLaneStatus === 'passed') {
        transition = 'added-passed';
      } else if (beforeLaneStatus === 'absent' && afterLaneStatus === 'failed') {
        transition = 'added-failed';
      } else {
        transition = 'removed';
      }

      laneTransitions.push({
        lane,
        beforeStatus: beforeLaneStatus,
        afterStatus: afterLaneStatus,
        transition,
        summary: postStep?.summary ?? preStep?.summary
      });
    }

    let caseTransitionType: CaseTransitionType;
    if (beforeStatus === 'absent') {
      caseTransitionType = afterStatus === 'passed' ? 'added-passed' : 'added-failed';
      addedCaseIds.push(id);
    } else if (afterStatus === 'absent') {
      caseTransitionType = 'removed';
      if (beforeStatus === 'passed') {
        transitionRiskFlags.push({
          code: 'COVERAGE_LOSS_CASE_REMOVED',
          severity: 'critical',
          message: `Previously passing case '${id}' was removed from post-fix run.`,
          caseIds: [id]
        });
      }
    } else if (beforeStatus === 'failed' && afterStatus === 'passed') {
      caseTransitionType = 'fixed';
      if (sourceFingerprintMatch && hasSameSourceSameLaneFix) {
        fixedCaseIds.push(id);
        productBugSameSourceSameLaneFixed = true;
      }
    } else if (beforeStatus === 'passed' && afterStatus === 'failed') {
      caseTransitionType = 'regressed';
      regressedCaseIds.push(id);
    } else if (beforeStatus === 'passed' && afterStatus === 'skipped') {
      caseTransitionType = 'regressed';
      regressedCaseIds.push(id);
      transitionRiskFlags.push({
        code: 'COVERAGE_LOSS_CASE_SKIPPED',
        severity: 'critical',
        message: `Previously passing case '${id}' was skipped in post-fix run.`,
        caseIds: [id]
      });
    } else if (beforeStatus === 'passed' && afterStatus === 'passed') {
      caseTransitionType = 'unchanged-passed';
      unchangedPassedCaseIds.push(id);
    } else if (beforeStatus === 'failed' && afterStatus === 'failed') {
      caseTransitionType = 'unchanged-failed';
      unchangedFailedCaseIds.push(id);
    } else {
      caseTransitionType = 'unchanged-skipped';
    }

    // Artifact checks
    const preConfig = await validateAndHashArtifactFile({
      reportDir: preReportDir,
      caseId: id,
      fileName: 'stacktape.yml',
      artifactType: 'stacktape-config'
    });
    if (preConfig.riskFlag) transitionRiskFlags.push(preConfig.riskFlag);
    if (preConfig.record) artifactsHashedCount++;

    const postConfig = await validateAndHashArtifactFile({
      reportDir: postReportDir,
      caseId: id,
      fileName: 'stacktape.yml',
      artifactType: 'stacktape-config'
    });
    if (postConfig.riskFlag) transitionRiskFlags.push(postConfig.riskFlag);
    if (postConfig.record) artifactsHashedCount++;

    // Require post stacktape.yml if case passed import in post report
    const passedImportInPost = postCase?.steps.some((s) => s.name === 'import' && s.status === 'passed');
    if (passedImportInPost && (!postConfig.record || postConfig.record.bytes === 0)) {
      transitionRiskFlags.push({
        code: 'MISSING_EXPECTED_ARTIFACT',
        severity: 'critical',
        message: `Case '${id}' passed import lane but is missing valid non-empty post stacktape.yml artifact.`,
        caseIds: [id]
      });
    }

    let configArtifact: CaseArtifactComparison | undefined;
    if (preConfig.record || postConfig.record) {
      configArtifact = {
        before: preConfig.record,
        after: postConfig.record,
        changed:
          preConfig.record !== undefined && postConfig.record !== undefined
            ? preConfig.record.sha256 !== postConfig.record.sha256
            : true
      };
    }

    const preTemplate = await validateAndHashArtifactFile({
      reportDir: preReportDir,
      caseId: id,
      fileName: 'compiled-template.yml',
      artifactType: 'cloudformation-template'
    });
    if (preTemplate.riskFlag) transitionRiskFlags.push(preTemplate.riskFlag);
    if (preTemplate.record) artifactsHashedCount++;

    const postTemplate = await validateAndHashArtifactFile({
      reportDir: postReportDir,
      caseId: id,
      fileName: 'compiled-template.yml',
      artifactType: 'cloudformation-template'
    });
    if (postTemplate.riskFlag) transitionRiskFlags.push(postTemplate.riskFlag);
    if (postTemplate.record) artifactsHashedCount++;

    // Require post compiled-template.yml if case passed package in post report
    const passedPackageInPost = postCase?.steps.some((s) => s.name === 'package' && s.status === 'passed');
    if (passedPackageInPost && (!postTemplate.record || postTemplate.record.bytes === 0)) {
      transitionRiskFlags.push({
        code: 'MISSING_EXPECTED_ARTIFACT',
        severity: 'critical',
        message: `Case '${id}' passed package lane but is missing valid non-empty post compiled-template.yml artifact.`,
        caseIds: [id]
      });
    }

    let templateArtifact: CaseArtifactComparison | undefined;
    if (preTemplate.record || postTemplate.record) {
      templateArtifact = {
        before: preTemplate.record,
        after: postTemplate.record,
        changed:
          preTemplate.record !== undefined && postTemplate.record !== undefined
            ? preTemplate.record.sha256 !== postTemplate.record.sha256
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
      transitionType: caseTransitionType,
      beforeStatus,
      afterStatus,
      ...(sourceFingerprintBefore ? { sourceFingerprintBefore } : {}),
      ...(sourceFingerprintAfter ? { sourceFingerprintAfter } : {}),
      sourceFingerprintMatch,
      laneTransitions,
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
    transitionRiskFlags,
    artifactsHashedCount,
    productBugSameSourceSameLaneFixed
  };
};

export const buildReviewBundle = async (options: BuildReviewBundleOptions): Promise<QualificationReviewBundle> => {
  const rootDir = resolve(options.worktreeRoot ?? resolve(import.meta.dir, '..', '..', '..', '..'));
  const allowDirty = Boolean(options.allowDirty);

  // 1. Load & validate handoff
  const { handoff, handoffPath } = await loadAndValidateHandoff(options.handoff, rootDir);
  const handoffBaseDir = handoffPath ? dirname(handoffPath) : rootDir;

  const baseCommit = options.baseCommit ?? handoff.baseCommit;
  const finalCommit = options.finalCommit ?? handoff.finalCommit;
  const preFixReportPath = options.preFixReport ?? handoff.preFixReportPath;
  const postFixReportPath = options.postFixReport ?? handoff.postFixReportPath;

  // 2. Load & validate reports
  const preLoaded = await loadAndValidateReportFile(preFixReportPath, rootDir);
  const postLoaded = await loadAndValidateReportFile(postFixReportPath, rootDir);

  // 3. Analyze Git state
  const { gitEvidence, gitRiskFlags } = await analyzeGitProvenance({
    baseCommit,
    finalCommit,
    rootDir,
    allowDirty
  });

  const riskFlags: ReviewRiskFlag[] = [...gitRiskFlags];

  // 4. Verify commit alignment
  const preCommitMatches = preLoaded.report.productCommit === gitEvidence.baseCommit;
  if (!preCommitMatches) {
    riskFlags.push({
      code: 'BASE_COMMIT_MISMATCH',
      severity: 'critical',
      message: `Pre-fix qualification report commit (${preLoaded.report.productCommit}) does not match declared base commit (${gitEvidence.baseCommit}).`
    });
  }

  const postCommitMatches = postLoaded.report.productCommit === gitEvidence.finalCommit;
  if (!postCommitMatches) {
    riskFlags.push({
      code: 'FINAL_COMMIT_MISMATCH',
      severity: 'critical',
      message: `Post-fix qualification report commit (${postLoaded.report.productCommit}) does not match declared final commit (${gitEvidence.finalCommit}).`
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
    transitionRiskFlags,
    artifactsHashedCount,
    productBugSameSourceSameLaneFixed
  } = await evaluateCaseTransitionsAndArtifacts({
    preReport: preLoaded.report,
    preReportDir: preLoaded.reportDir,
    postReport: postLoaded.report,
    postReportDir: postLoaded.reportDir
  });

  riskFlags.push(...transitionRiskFlags);

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

  // 6. Sensitive file checks
  const sensitiveFlags = checkSensitiveFiles(gitEvidence.changedFiles);
  riskFlags.push(...sensitiveFlags);

  // 7. Verify command evidence (never run shell strings!)
  const focusedRegressionVerifiedResult = await verifyCommandEvidence({
    commandEvidence: handoff.focusedRegression?.commandEvidence,
    baseDirectory: handoffBaseDir,
    claimType: 'focused-regression'
  });
  if (focusedRegressionVerifiedResult.riskFlag) riskFlags.push(focusedRegressionVerifiedResult.riskFlag);

  const affectedTypecheckVerifiedResult = await verifyCommandEvidence({
    commandEvidence: handoff.affectedTypecheck?.commandEvidence,
    baseDirectory: handoffBaseDir,
    claimType: 'affected-typecheck'
  });
  if (affectedTypecheckVerifiedResult.riskFlag) riskFlags.push(affectedTypecheckVerifiedResult.riskFlag);

  // 8. Verify neighbor cases against post report
  let neighborCasesPassVerified = false;
  if (handoff.neighborCases && handoff.neighborCases.length > 0) {
    const missingOrFailedNeighbors = handoff.neighborCases.filter((id) => {
      const postCase = postLoaded.report.cases.find((c) => c.id === id);
      return !postCase || postCase.status !== 'passed';
    });
    if (missingOrFailedNeighbors.length === 0) {
      neighborCasesPassVerified = true;
    } else {
      riskFlags.push({
        code: 'NEIGHBOR_CASES_UNVERIFIED',
        severity: 'high',
        message: `Neighbor cases missing or not passed in post-fix report: ${missingOrFailedNeighbors.join(', ')}.`,
        caseIds: missingOrFailedNeighbors
      });
    }
  }

  // 9. Verify packaging runtime evidence
  const packagingChanged = gitEvidence.changedFiles.some(
    (file) => file.startsWith('packages/packaging/') || file.startsWith('apps/cli/helper-lambdas/')
  );
  const runtimeLanePassedInPostReport =
    postLoaded.report.lanes.includes('runtime') &&
    postLoaded.report.globalSteps.some((s) => s.name === 'runtime' && s.status === 'passed');

  if (packagingChanged) {
    if (!runtimeLanePassedInPostReport) {
      if (handoff.runtimeEvidence?.notRunReason) {
        riskFlags.push({
          code: 'PACKAGING_RUNTIME_UNVERIFIED_WITH_REASON',
          severity: 'high',
          message: `Packaging code changed without runtime lane execution. Worker supplied omission reason: ${handoff.runtimeEvidence.notRunReason}`
        });
      } else {
        riskFlags.push({
          code: 'MISSING_RUNTIME_EVIDENCE_FOR_PACKAGING',
          severity: 'critical',
          message: 'Packaging code changed without runtime lane execution or an explicit not-run uncertainty reason.'
        });
      }
    }
  }

  // 10. Campaign type rules verification
  let campaignTypeRequirementsSatisfied = false;

  switch (handoff.campaignType) {
    case 'product-bug': {
      const hasFixedCase = productBugSameSourceSameLaneFixed && fixedCaseIds.length > 0;
      const hasRegression = focusedRegressionVerifiedResult.verified;
      const hasTypecheck = affectedTypecheckVerifiedResult.verified;
      const hasNeighbors = neighborCasesPassVerified;

      if (!hasFixedCase) {
        riskFlags.push({
          code: 'PRODUCT_BUG_PROOF_FAILED',
          severity: 'critical',
          message:
            'Product-bug campaigns must prove at least one same-source same-lane failed-before/passed-after transition.'
        });
      }
      if (!hasRegression) {
        riskFlags.push({
          code: 'MISSING_FOCUSED_REGRESSION_COMMAND_EVIDENCE',
          severity: 'high',
          message: 'Product-bug campaigns must provide verified focused regression command evidence.'
        });
      }
      if (!hasTypecheck) {
        riskFlags.push({
          code: 'MISSING_AFFECTED_TYPECHECK_COMMAND_EVIDENCE',
          severity: 'high',
          message: 'Product-bug campaigns must provide verified affected package typecheck command evidence.'
        });
      }
      if (!hasNeighbors) {
        riskFlags.push({
          code: 'NEIGHBOR_CASES_UNVERIFIED',
          severity: 'high',
          message: 'Product-bug campaigns must list neighbor cases that pass in the post-fix qualification report.'
        });
      }

      campaignTypeRequirementsSatisfied = hasFixedCase && hasRegression && hasTypecheck && hasNeighbors;
      break;
    }
    case 'new-coverage': {
      const hasAddedPassed =
        addedCaseIds.length > 0 || caseTransitions.some((t) => t.transitionType === 'added-passed');
      if (!hasAddedPassed) {
        riskFlags.push({
          code: 'NEW_COVERAGE_PROOF_FAILED',
          severity: 'critical',
          message: 'New-coverage campaign claims new coverage but no new passing cases or lanes were added.'
        });
      }
      campaignTypeRequirementsSatisfied = hasAddedPassed;
      break;
    }
    case 'harness-fix': {
      const harnessFilesChanged = gitEvidence.changedFiles.some(
        (f) =>
          f.startsWith('apps/cli/scripts/qualification/') ||
          f.startsWith('apps/cli/scripts/real-aws/') ||
          f.includes('verify-source-cli-aws-readonly')
      );
      if (!harnessFilesChanged) {
        riskFlags.push({
          code: 'HARNESS_FIX_NO_HARNESS_DIFF',
          severity: 'high',
          message: 'Harness-fix campaign declared but no test harness files were modified in Git diff.'
        });
      }
      riskFlags.push({
        code: 'HARNESS_FIX_REQUIRES_ATTENTION',
        severity: 'high',
        message: 'Harness modifications always require manual reviewer inspection and attention.'
      });
      campaignTypeRequirementsSatisfied = harnessFilesChanged;
      break;
    }
    case 'corpus-refresh': {
      const corpusFilesChanged = gitEvidence.changedFiles.some(
        (f) =>
          f.endsWith('manifest.json') ||
          f.includes('catalog.ts') ||
          f.includes('init-real-project-corpus-cases') ||
          f.includes('synthetic-project-corpus-expectations')
      );
      if (!corpusFilesChanged) {
        riskFlags.push({
          code: 'CORPUS_REFRESH_NO_CORPUS_DIFF',
          severity: 'high',
          message: 'Corpus-refresh campaign declared but no manifest or corpus files were modified in Git diff.'
        });
      }
      const hasLostCoverage =
        regressedCaseIds.length > 0 ||
        caseTransitions.some(
          (t) => t.transitionType === 'removed' || t.laneTransitions.some((l) => l.transition === 'skipped-regression')
        );
      if (hasLostCoverage) {
        riskFlags.push({
          code: 'CORPUS_REFRESH_LOST_COVERAGE',
          severity: 'critical',
          message: 'Corpus refresh caused regressions or lost coverage.'
        });
      }
      campaignTypeRequirementsSatisfied = corpusFilesChanged && !hasLostCoverage;
      break;
    }
    case 'investigation': {
      riskFlags.push({
        code: 'INVESTIGATION_NOT_FOR_INTEGRATION',
        severity: 'medium',
        message: 'Investigation campaigns are exploratory and not eligible for direct ready-for-review integration.'
      });
      campaignTypeRequirementsSatisfied = false;
      break;
    }
  }

  // 11. Compute verdict
  const criticalRiskCount = riskFlags.filter((f) => f.severity === 'critical').length;
  const highRiskCount = riskFlags.filter((f) => f.severity === 'high').length;

  let verdict: ReviewerSummary['verdict'];
  let verdictExplanation: string;

  if (criticalRiskCount > 0) {
    verdict = 'rejected';
    verdictExplanation = `Failed closed with ${criticalRiskCount} critical risk flag(s).`;
  } else if (
    highRiskCount > 0 ||
    handoff.campaignType === 'harness-fix' ||
    handoff.campaignType === 'investigation' ||
    regressedCaseIds.length > 0 ||
    !campaignTypeRequirementsSatisfied
  ) {
    verdict = 'requires-attention';
    verdictExplanation = `Requires human attention (${highRiskCount} high risk flag(s), campaign requirements check).`;
  } else {
    verdict = 'ready-for-review';
    verdictExplanation = 'All automated fail-closed checks passed. Ready for human reviewer evaluation.';
  }

  const reviewerSummary: ReviewerSummary = {
    verdict,
    verdictExplanation,
    campaignId: handoff.campaignId,
    campaignType: handoff.campaignType,
    title: handoff.title,
    baseCommit: gitEvidence.baseCommit,
    finalCommit: gitEvidence.finalCommit,
    totalChangedFiles: gitEvidence.changedFiles.length,
    fixedCasesCount: fixedCaseIds.length,
    regressedCasesCount: regressedCaseIds.length,
    riskFlagsCount: riskFlags.length,
    criticalRiskCount,
    highRiskCount
  };

  const preFixSummaryEvidence: ReportFileEvidence = {
    path: relative(rootDir, preLoaded.reportPath).replaceAll('\\', '/'),
    sha256: preLoaded.sha256,
    bytes: preLoaded.bytes,
    productCommit: preLoaded.report.productCommit,
    productFingerprint: preLoaded.report.productFingerprint,
    runId: preLoaded.report.runId,
    summary: preLoaded.report.summary,
    lanes: preLoaded.report.lanes
  };

  const postFixSummaryEvidence: ReportFileEvidence = {
    path: relative(rootDir, postLoaded.reportPath).replaceAll('\\', '/'),
    sha256: postLoaded.sha256,
    bytes: postLoaded.bytes,
    productCommit: postLoaded.report.productCommit,
    productFingerprint: postLoaded.report.productFingerprint,
    runId: postLoaded.report.runId,
    summary: postLoaded.report.summary,
    lanes: postLoaded.report.lanes
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

  const claimsVsVerification: ClaimsVsVerification = {
    workerClaims: handoff,
    claimPresent: {
      focusedRegression: Boolean(handoff.focusedRegression),
      affectedTypecheck: Boolean(handoff.affectedTypecheck),
      neighborCases: Boolean(handoff.neighborCases && handoff.neighborCases.length > 0),
      runtimeEvidence: Boolean(handoff.runtimeEvidence)
    },
    reportedEvidence: {
      preFixReportSummary: preFixSummaryEvidence,
      postFixReportSummary: postFixSummaryEvidence,
      fixedCasesCount: fixedCaseIds.length,
      regressedCasesCount: regressedCaseIds.length,
      addedCasesCount: addedCaseIds.length,
      runtimeLanePassedInPostReport
    },
    executedCommandEvidence: {
      ...(focusedRegressionVerifiedResult.record ? { focusedRegression: focusedRegressionVerifiedResult.record } : {}),
      ...(affectedTypecheckVerifiedResult.record ? { affectedTypecheck: affectedTypecheckVerifiedResult.record } : {})
    },
    independentlyVerified: {
      cleanWorktree: gitEvidence.cleanFinalWorktree,
      headEqualsFinalCommit: gitEvidence.headCommit === gitEvidence.finalCommit,
      baseIsAncestorOfFinal: !gitRiskFlags.some((f) => f.code === 'BASE_COMMIT_NOT_ANCESTOR'),
      preFixReportCommitMatchesBase: preCommitMatches,
      postFixReportCommitMatchesFinal: postCommitMatches,
      qualificationReportsSchemaValid: true,
      caseSourceFingerprintsMatch: !riskFlags.some((f) => f.code === 'SOURCE_FINGERPRINT_MUTATION'),
      campaignTypeRequirementsSatisfied,
      productBugSameSourceSameLaneFixed,
      neighborCasesPassVerified,
      expectedArtifactsPresent: !riskFlags.some((f) => f.code === 'MISSING_EXPECTED_ARTIFACT'),
      artifactsHashedCount
    }
  };

  const bundle: QualificationReviewBundle = {
    schemaVersion: QUALIFICATION_REVIEW_BUNDLE_VERSION,
    bundleId: `review-${handoff.campaignId}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    generatedAt: new Date().toISOString(),
    reviewerSummary,
    gitEvidence,
    qualificationEvidence,
    claimsVsVerification,
    riskFlags,
    disclaimer: REVIEW_BUNDLE_DISCLAIMER
  };

  return qualificationReviewBundleSchema.parse(bundle);
};

const sanitizeForMarkdownText = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');

export const renderReviewBundleMarkdown = (bundle: QualificationReviewBundle): string => {
  const { reviewerSummary, gitEvidence, qualificationEvidence, claimsVsVerification, riskFlags } = bundle;
  const workerClaims = claimsVsVerification.workerClaims;
  const verified = claimsVsVerification.independentlyVerified;

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
                ...(f.files ?? []).map((file) => `\`${sanitizeForMarkdownText(file)}\``),
                ...(f.caseIds ?? []).map((id) => `case \`${sanitizeForMarkdownText(id)}\``)
              ].join(', ') || '—';
            return `| **${f.severity.toUpperCase()}** | \`${f.code}\` | ${sanitizeForMarkdownText(
              f.message
            )} | ${affected} |`;
          })
        ].join('\n');

  const transitionRows = qualificationEvidence.caseTransitions.map((t) => {
    const configNote = t.configArtifact ? (t.configArtifact.changed ? 'Modified' : 'Identical') : 'None';
    const templateNote = t.templateArtifact ? (t.templateArtifact.changed ? 'Modified' : 'Identical') : 'None';
    const matchNote = t.sourceFingerprintMatch ? 'Yes' : '**No (Mutated)**';
    return `| \`${sanitizeForMarkdownText(t.id)}\` | \`${t.beforeStatus}\` | \`${t.afterStatus}\` | **${
      t.transitionType
    }** | ${matchNote} | ${configNote} | ${templateNote} |`;
  });

  const failureDetails = qualificationEvidence.caseTransitions
    .filter((t) => (t.failuresBefore && t.failuresBefore.length > 0) || (t.failuresAfter && t.failuresAfter.length > 0))
    .map((t) => {
      const parts = [`### Case \`${sanitizeForMarkdownText(t.id)}\``, ''];
      if (t.failuresBefore && t.failuresBefore.length > 0) {
        parts.push('**Pre-fix Failures:**');
        for (const f of t.failuresBefore) parts.push(`- ${sanitizeForMarkdownText(f)}`);
      }
      if (t.failuresAfter && t.failuresAfter.length > 0) {
        parts.push('', '**Post-fix Failures:**');
        for (const f of t.failuresAfter) parts.push(`- ${sanitizeForMarkdownText(f)}`);
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
            (c) =>
              `| \`${sanitizeForMarkdownText(c.caseId)}\` | \`${c.classification}\` | ${sanitizeForMarkdownText(
                c.explanation
              )} |`
          )
        ].join('\n');

  const uncertainties = workerClaims.uncertainties ?? [];
  const uncertaintiesList =
    uncertainties.length === 0
      ? '_None declared by worker._'
      : uncertainties.map((u) => `- ${sanitizeForMarkdownText(u)}`).join('\n');

  return `${[
    `# Hardening Review Bundle: ${sanitizeForMarkdownText(workerClaims.title)}`,
    '',
    `**Verdict:** ${verdictBadge} (${reviewerSummary.verdictExplanation})  `,
    `**Campaign:** \`${sanitizeForMarkdownText(reviewerSummary.campaignId)}\` (\`${reviewerSummary.campaignType}\`)  `,
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
    `| **Fixed Cases** | ${qualificationEvidence.fixedCaseIds.length} (\`${qualificationEvidence.fixedCaseIds.map(sanitizeForMarkdownText).join(', ') || 'none'}\`) |`,
    `| **Regressed Cases** | ${qualificationEvidence.regressedCaseIds.length} (\`${qualificationEvidence.regressedCaseIds.map(sanitizeForMarkdownText).join(', ') || 'none'}\`) |`,
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
    '| Check | Verified Fact | Detail / Evidence |',
    '| --- | --- | --- |',
    `| **Worktree Clean** | ${verified.cleanWorktree ? 'PASS' : 'FAIL'} | Worktree clean check |`,
    `| **Commit Alignment** | ${verified.preFixReportCommitMatchesBase && verified.postFixReportCommitMatchesFinal ? 'PASS' : 'FAIL'} | Base & Final match reports |`,
    `| **Fixed Case Proof** | ${verified.productBugSameSourceSameLaneFixed ? 'PASS' : 'FAIL'} | Same-source same-lane fix verified |`,
    `| **Focused Regression Evidence** | ${claimsVsVerification.executedCommandEvidence.focusedRegression?.verified ? 'PASS' : 'FAIL / CLAIM ONLY'} | ${
      claimsVsVerification.executedCommandEvidence.focusedRegression?.verified
        ? `Log SHA-256 verified (${claimsVsVerification.executedCommandEvidence.focusedRegression.logRelativePath})`
        : 'No verified command log evidence'
    } |`,
    `| **Affected Typecheck Evidence** | ${claimsVsVerification.executedCommandEvidence.affectedTypecheck?.verified ? 'PASS' : 'FAIL / CLAIM ONLY'} | ${
      claimsVsVerification.executedCommandEvidence.affectedTypecheck?.verified
        ? `Log SHA-256 verified (${claimsVsVerification.executedCommandEvidence.affectedTypecheck.logRelativePath})`
        : 'No verified command log evidence'
    } |`,
    `| **Neighbor Cases Pass** | ${verified.neighborCasesPassVerified ? 'PASS' : 'FAIL'} | Verified against post-fix report |`,
    `| **Runtime Lane Pass** | ${claimsVsVerification.reportedEvidence.runtimeLanePassedInPostReport ? 'PASS' : 'NOT EXECUTED'} | Post-fix global runtime lane step |`,
    `| **Artifacts Hashed & Confinement** | ${verified.artifactsHashedCount} artifact(s) | Generated configs and templates verified |`,
    '',
    '## Worker-Authored Claims (Visibly Untrusted Input)',
    '',
    '> [!NOTE]',
    '> The following section contains worker prose statements. These statements are presented as declared claims and are distinct from automated facts.',
    '',
    '```text',
    workerClaims.summary.replaceAll('```', '\\`\\`\\`'),
    '```',
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
      : gitEvidence.changedFiles.map((file) => `- \`${sanitizeForMarkdownText(file)}\``).join('\n'),
    '',
    '## Trust Boundary & Disclaimer',
    '',
    `> [!NOTE]`,
    `> ${bundle.disclaimer}`
  ].join('\n')}\n`;
};

export const writeReviewBundle = async (
  outputDirectory: string,
  bundle: QualificationReviewBundle
): Promise<{ jsonPath: string; markdownPath: string }> => {
  const jsonPath = join(outputDirectory, 'review-bundle.json');
  const markdownPath = join(outputDirectory, 'review-bundle.md');
  await writeJsonAtomic(jsonPath, bundle);
  await writePlainTextAtomic(markdownPath, renderReviewBundleMarkdown(bundle));
  return { jsonPath, markdownPath };
};
