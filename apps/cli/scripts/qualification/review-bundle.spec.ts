import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { qualificationCaseResultSchema, qualificationReportSchema, type QualificationReport } from './contracts';
import {
  assertPathConfined,
  buildReviewBundle,
  hashBufferOrString,
  renderReviewBundleMarkdown,
  writeReviewBundle
} from './review-bundle';
import { campaignIdSchema, type CampaignHandoff } from './review-bundle-contracts';
import { assertProcessSucceeded, runProcess } from './process';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true, maxRetries: 3 })));
});

const createTempDir = async () => {
  const path = await mkdtemp(join(tmpdir(), 'stacktape-review-bundle-test-'));
  temporaryRoots.push(path);
  return path;
};

const git = async (cwd: string, ...args: string[]) => {
  const result = await runProcess({ command: 'git', args, cwd, timeoutMs: 30_000 });
  assertProcessSucceeded(result);
  return result.stdout.trim();
};

const setupTestGitRepo = async () => {
  const repoDir = await createTempDir();
  await git(repoDir, 'init');
  await git(repoDir, 'config', 'user.email', 'tester@example.invalid');
  await git(repoDir, 'config', 'user.name', 'Tester');

  // Base commit
  await writeFile(join(repoDir, 'README.md'), '# Base Project\n', 'utf8');
  await git(repoDir, 'add', 'README.md');
  await git(repoDir, 'commit', '-m', 'base commit');
  const baseCommit = await git(repoDir, 'rev-parse', 'HEAD');

  // Final commit
  await writeFile(join(repoDir, 'feature.txt'), 'new feature\n', 'utf8');
  await git(repoDir, 'add', 'feature.txt');
  await git(repoDir, 'commit', '-m', 'final commit');
  const finalCommit = await git(repoDir, 'rev-parse', 'HEAD');

  return { repoDir, baseCommit, finalCommit };
};

const createMockReport = ({
  runId,
  productCommit,
  status: _status = 'passed',
  cases = [],
  globalSteps = []
}: {
  runId: string;
  productCommit: string;
  status?: 'passed' | 'failed';
  cases?: QualificationReport['cases'];
  globalSteps?: QualificationReport['globalSteps'];
}): QualificationReport => {
  const passed =
    cases.filter((c) => c.status === 'passed').length + globalSteps.filter((s) => s.status === 'passed').length;
  const failed =
    cases.filter((c) => c.status === 'failed').length + globalSteps.filter((s) => s.status === 'failed').length;
  const skipped =
    cases.filter((c) => c.status === 'skipped').length + globalSteps.filter((s) => s.status === 'skipped').length;

  return {
    schemaVersion: 2,
    runId,
    generatedAt: new Date().toISOString(),
    productCommit,
    productFingerprint: 'a'.repeat(64),
    lanes: ['import', 'package'],
    environment: {
      platform: process.platform,
      architecture: process.arch,
      bun: Bun.version,
      node: process.versions.node
    },
    summary: {
      passed,
      failed,
      skipped,
      durationMs: 5000
    },
    globalSteps,
    cases
  };
};

describe('qualification review bundle', () => {
  test('strictly validates campaignId syntax and rejects reserved or path traversal names', () => {
    expect(campaignIdSchema.parse('fastify-postgres-fix')).toBe('fastify-postgres-fix');
    expect(campaignIdSchema.parse('fix-case-123')).toBe('fix-case-123');

    // Invalid syntax
    expect(() => campaignIdSchema.parse('Upper-Case')).toThrow();
    expect(() => campaignIdSchema.parse('with_underscore')).toThrow();
    expect(() => campaignIdSchema.parse('with/slash')).toThrow();
    expect(() => campaignIdSchema.parse('with\\backslash')).toThrow();
    expect(() => campaignIdSchema.parse('../escape')).toThrow();
    expect(() => campaignIdSchema.parse('C:\\projects')).toThrow();
    expect(() => campaignIdSchema.parse('\\\\unc\\share')).toThrow();
    expect(() => campaignIdSchema.parse('con')).toThrow('reserved');
    expect(() => campaignIdSchema.parse('PRN')).toThrow();
    expect(() => campaignIdSchema.parse('nul')).toThrow('reserved');
    expect(() => campaignIdSchema.parse('com1')).toThrow('reserved');
    expect(() => campaignIdSchema.parse('lpt1')).toThrow('reserved');
    expect(() => campaignIdSchema.parse('a\x00b')).toThrow();
  });

  test('assertPathConfined strictly confines paths and rejects escapes', async () => {
    const base = await createTempDir();
    const sub = join(base, 'sub');
    await mkdir(sub);

    expect(assertPathConfined({ baseDirectory: base, targetPath: 'sub', label: 'test' })).toBe(sub);
    expect(() => assertPathConfined({ baseDirectory: base, targetPath: '../outside', label: 'test' })).toThrow(
      'resolves outside'
    );
    expect(() => assertPathConfined({ baseDirectory: base, targetPath: '\\\\server\\share', label: 'test' })).toThrow(
      'UNC path'
    );
    expect(() => assertPathConfined({ baseDirectory: base, targetPath: 'a\x00b', label: 'test' })).toThrow(
      'control characters'
    );
  });

  test('qualificationReportSchema rejects forged case status and count inconsistencies', () => {
    // Case status contradicts step results
    expect(() =>
      qualificationCaseResultSchema.parse({
        id: 'bad-case',
        title: 'Bad Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'passed', // Forged passed status!
        durationMs: 100,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        steps: [
          {
            name: 'import',
            status: 'failed',
            durationMs: 100,
            summary: 'Failed step'
          }
        ]
      })
    ).toThrow('contradicts step results');

    // Reused case without resumedFrom
    expect(() =>
      qualificationCaseResultSchema.parse({
        id: 'reused-case',
        title: 'Reused Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'reused',
        status: 'passed',
        durationMs: 0,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'passed', durationMs: 0, summary: 'Passed' }]
      })
    ).toThrow("must include 'resumedFrom'");

    // Report with aggregate count mismatch
    expect(() =>
      qualificationReportSchema.parse({
        schemaVersion: 2,
        runId: 'count-mismatch',
        generatedAt: new Date().toISOString(),
        productCommit: 'a'.repeat(40),
        productFingerprint: 'b'.repeat(64),
        lanes: ['import'],
        environment: { platform: 'win32', architecture: 'x64', bun: '1.3.14', node: '24.0.0' },
        summary: { passed: 99, failed: 0, skipped: 0, durationMs: 100 }, // Forged count!
        globalSteps: [],
        cases: [
          {
            id: 'real-case',
            title: 'Real Case',
            fingerprint: '1'.repeat(64),
            sourceFingerprint: 'f'.repeat(64),
            execution: 'executed',
            status: 'passed',
            durationMs: 100,
            source: { kind: 'local', path: 'proj', license: 'MIT' },
            tags: ['node'],
            steps: [{ name: 'import', status: 'passed', durationMs: 100, summary: 'Passed' }]
          }
        ]
      })
    ).toThrow('does not match actual count');
  });

  test('builds a valid product-bug review bundle with verified command evidence and artifacts', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    // Create command log files
    const logDir = join(tempDir, 'logs');
    await mkdir(logDir, { recursive: true });
    const regressionLogText = 'PASS packages/config-inference/src/probes/postgres.spec.ts\n1 pass\n0 fail\n';
    const typecheckLogText = '$ tsc -p tsconfig.json\nDone.\n';
    const regressionLogPath = join(logDir, 'regression.log');
    const typecheckLogPath = join(logDir, 'typecheck.log');
    await writeFile(regressionLogPath, regressionLogText, 'utf8');
    await writeFile(typecheckLogPath, typecheckLogText, 'utf8');

    const regressionLogSha256 = hashBufferOrString(regressionLogText);
    const typecheckLogSha256 = hashBufferOrString(typecheckLogText);

    // Pre & Post qualification reports & artifacts
    const preReportDir = join(tempDir, 'pre-run');
    const postReportDir = join(tempDir, 'post-run');
    await mkdir(join(preReportDir, 'cases', 'fastify-postgres-worker'), { recursive: true });
    await mkdir(join(postReportDir, 'cases', 'fastify-postgres-worker'), { recursive: true });
    await mkdir(join(postReportDir, 'cases', 'express-postgres-neighbor'), { recursive: true });

    await writeFile(
      join(preReportDir, 'cases', 'fastify-postgres-worker', 'stacktape.yml'),
      'resources:\n  database:\n    type: relational-database\n',
      'utf8'
    );
    await writeFile(
      join(postReportDir, 'cases', 'fastify-postgres-worker', 'stacktape.yml'),
      'resources:\n  database:\n    type: relational-database\n    properties:\n      port: 5432\n',
      'utf8'
    );
    await writeFile(
      join(postReportDir, 'cases', 'express-postgres-neighbor', 'stacktape.yml'),
      'resources:\n  database:\n    type: relational-database\n',
      'utf8'
    );

    const preCases: QualificationReport['cases'] = [
      {
        id: 'fastify-postgres-worker',
        title: 'Fastify PostgreSQL Worker',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'failed',
        durationMs: 1200,
        source: { kind: 'local', path: 'fixtures/fastify', license: 'MIT' },
        tags: ['node', 'fastify'],
        steps: [
          {
            name: 'import',
            status: 'failed',
            durationMs: 1000,
            summary: 'Port parsing failed',
            failure: { code: 'IMPORT_FAILED', message: 'Expected port 5432' }
          }
        ]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        id: 'fastify-postgres-worker',
        title: 'Fastify PostgreSQL Worker',
        fingerprint: '3'.repeat(64),
        sourceFingerprint: 'f'.repeat(64), // SAME source fingerprint
        execution: 'executed',
        status: 'passed',
        durationMs: 1100,
        source: { kind: 'local', path: 'fixtures/fastify', license: 'MIT' },
        tags: ['node', 'fastify'],
        steps: [{ name: 'import', status: 'passed', durationMs: 1100, summary: 'Passed import' }]
      },
      {
        id: 'express-postgres-neighbor',
        title: 'Express Postgres Neighbor',
        fingerprint: '4'.repeat(64),
        sourceFingerprint: 'e'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 800,
        source: { kind: 'local', path: 'fixtures/express', license: 'MIT' },
        tags: ['node', 'express'],
        steps: [{ name: 'import', status: 'passed', durationMs: 800, summary: 'Passed import' }]
      }
    ];

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit, cases: postCases });

    const preReportPath = join(preReportDir, 'qualification-report.json');
    const postReportPath = join(postReportDir, 'qualification-report.json');
    await writeFile(preReportPath, JSON.stringify(preReport), 'utf8');
    await writeFile(postReportPath, JSON.stringify(postReport), 'utf8');

    const handoffPath = join(tempDir, 'campaign-handoff.json');
    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'fastify-postgres-fix',
      campaignType: 'product-bug',
      title: 'Fix Fastify PostgreSQL port inference',
      summary: 'Fixed integer parsing for PGPORT environment variable.',
      baseCommit,
      finalCommit,
      preFixReportPath: preReportPath,
      postFixReportPath: postReportPath,
      focusedRegression: {
        testFile: 'packages/config-inference/src/probes/postgres.spec.ts',
        testCommand: 'bun test packages/config-inference/src/probes/postgres.spec.ts',
        description: 'Verifies PGPORT parsing',
        commandEvidence: {
          argv: ['bun', 'test', 'packages/config-inference/src/probes/postgres.spec.ts'],
          cwd: repoDir,
          startedAt: '2026-08-25T01:00:00.000Z',
          completedAt: '2026-08-25T01:00:01.000Z',
          durationMs: 1000,
          exitCode: 0,
          logPath: 'logs/regression.log',
          logSha256: regressionLogSha256
        }
      },
      affectedTypecheck: {
        command: 'pnpm --filter @stacktape/config-inference run typecheck',
        commandEvidence: {
          argv: ['pnpm', '--filter', '@stacktape/config-inference', 'run', 'typecheck'],
          cwd: repoDir,
          startedAt: '2026-08-25T01:00:02.000Z',
          completedAt: '2026-08-25T01:00:05.000Z',
          durationMs: 3000,
          exitCode: 0,
          logPath: 'logs/typecheck.log',
          logSha256: typecheckLogSha256
        }
      },
      neighborCases: ['express-postgres-neighbor']
    };
    await writeFile(handoffPath, JSON.stringify(handoff), 'utf8');

    const bundle = await buildReviewBundle({
      handoff: handoffPath,
      worktreeRoot: repoDir
    });

    expect(bundle.reviewerSummary.verdict).toBe('ready-for-review');
    expect(bundle.claimsVsVerification.independentlyVerified.productBugSameSourceSameLaneFixed).toBeTrue();
    expect(bundle.claimsVsVerification.independentlyVerified.neighborCasesPassVerified).toBeTrue();
    expect(bundle.claimsVsVerification.executedCommandEvidence.focusedRegression?.verified).toBeTrue();
    expect(bundle.claimsVsVerification.executedCommandEvidence.affectedTypecheck?.verified).toBeTrue();
    expect(bundle.qualificationEvidence.caseTransitions[0].configArtifact?.changed).toBeTrue();

    const markdown = renderReviewBundleMarkdown(bundle);
    expect(markdown).toContain('READY FOR REVIEW');
    expect(markdown).toContain('fastify-postgres-fix');
    expect(markdown).toContain('Worker-Authored Claims (Visibly Untrusted Input)');
    expect(markdown).toContain('does not provide cryptographic tamper-proofing');

    const bundleOut = join(tempDir, 'bundle-out');
    const written = await writeReviewBundle(bundleOut, bundle);
    expect(await Bun.file(written.jsonPath).exists()).toBeTrue();
    expect(await Bun.file(written.markdownPath).exists()).toBeTrue();
  });

  test('rejects product-bug fix when source fingerprint mutated between pre and post', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'fastify-case',
        title: 'Fastify Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'a'.repeat(64),
        execution: 'executed',
        status: 'failed',
        durationMs: 1000,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'failed', durationMs: 1000, summary: 'Failed' }]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        id: 'fastify-case',
        title: 'Fastify Case',
        fingerprint: '2'.repeat(64),
        sourceFingerprint: 'b'.repeat(64), // MUTATED SOURCE!
        execution: 'executed',
        status: 'passed',
        durationMs: 1000,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'passed', durationMs: 1000, summary: 'Passed' }]
      }
    ];

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'mutated-product-bug',
      campaignType: 'product-bug',
      title: 'Mutated bug test',
      summary: 'Testing source mutation rejection',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath,
      neighborCases: []
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.riskFlags.some((f) => f.code === 'SOURCE_FINGERPRINT_MUTATED_ON_FIX')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'PRODUCT_BUG_PROOF_FAILED')).toBeTrue();
  });

  test('rejects fake fix where pre-fix failed on package but post-fix ran only import', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'packaging-case',
        title: 'Packaging Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'failed',
        durationMs: 2000,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        steps: [
          { name: 'import', status: 'passed', durationMs: 1000, summary: 'Import ok' },
          { name: 'package', status: 'failed', durationMs: 1000, summary: 'Package build error' }
        ]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        id: 'packaging-case',
        title: 'Packaging Case',
        fingerprint: '2'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 1000,
        source: { kind: 'local', path: 'proj', license: 'MIT' },
        tags: ['node'],
        // In post-fix, package was NOT run (only import was run!)
        steps: [{ name: 'import', status: 'passed', durationMs: 1000, summary: 'Import ok' }]
      }
    ];

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'fake-fix-lane-mismatch',
      campaignType: 'product-bug',
      title: 'Lane mismatch test',
      summary: 'Package failed before but only import ran after',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.claimsVsVerification.independentlyVerified.productBugSameSourceSameLaneFixed).toBeFalse();
    expect(bundle.riskFlags.some((f) => f.code === 'PRODUCT_BUG_PROOF_FAILED')).toBeTrue();
  });

  test('detects coverage loss when previously passing case or lane is removed or skipped', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'passing-case-1',
        title: 'Passing Case 1',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: '1'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 1000,
        source: { kind: 'local', path: 'p1', license: 'MIT' },
        tags: ['node'],
        steps: [
          { name: 'import', status: 'passed', durationMs: 500, summary: 'Import pass' },
          { name: 'package', status: 'passed', durationMs: 500, summary: 'Package pass' }
        ]
      },
      {
        id: 'passing-case-2',
        title: 'Passing Case 2',
        fingerprint: '2'.repeat(64),
        sourceFingerprint: '2'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 500,
        source: { kind: 'local', path: 'p2', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'passed', durationMs: 500, summary: 'Import pass' }]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        id: 'passing-case-1',
        title: 'Passing Case 1',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: '1'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 500,
        source: { kind: 'local', path: 'p1', license: 'MIT' },
        tags: ['node'],
        // package lane was skipped!
        steps: [
          { name: 'import', status: 'passed', durationMs: 500, summary: 'Import pass' },
          { name: 'package', status: 'skipped', durationMs: 0, summary: 'Package skipped' }
        ]
      }
      // passing-case-2 was completely removed!
    ];

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'coverage-loss-test',
      campaignType: 'new-coverage',
      title: 'Coverage loss test',
      summary: 'Testing detection of removed cases and skipped lanes',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.riskFlags.some((f) => f.code === 'COVERAGE_LOSS_CASE_REMOVED')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'COVERAGE_LOSS_LANE_SKIPPED')).toBeTrue();
  });

  test('validates campaign-type rules for new-coverage, harness-fix, and investigation', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    // 1. new-coverage with 0 added cases
    const newCoverageHandoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'empty-new-coverage',
      campaignType: 'new-coverage',
      title: 'Empty coverage',
      summary: 'No new cases added',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };
    const newCoverageBundle = await buildReviewBundle({ handoff: newCoverageHandoff, worktreeRoot: repoDir });
    expect(newCoverageBundle.reviewerSummary.verdict).toBe('rejected');
    expect(newCoverageBundle.riskFlags.some((f) => f.code === 'NEW_COVERAGE_PROOF_FAILED')).toBeTrue();

    // 2. harness-fix always requires human attention
    const harnessHandoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'harness-fix-test',
      campaignType: 'harness-fix',
      title: 'Harness test',
      summary: 'Fixing harness runner',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };
    const harnessBundle = await buildReviewBundle({ handoff: harnessHandoff, worktreeRoot: repoDir });
    expect(harnessBundle.reviewerSummary.verdict).toBe('requires-attention');
    expect(harnessBundle.riskFlags.some((f) => f.code === 'HARNESS_FIX_REQUIRES_ATTENTION')).toBeTrue();

    // 3. investigation can never be ready-for-review
    const investigationHandoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'investigation-test',
      campaignType: 'investigation',
      title: 'Investigation test',
      summary: 'Spike investigation',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };
    const investigationBundle = await buildReviewBundle({ handoff: investigationHandoff, worktreeRoot: repoDir });
    expect(investigationBundle.reviewerSummary.verdict).toBe('requires-attention');
    expect(investigationBundle.riskFlags.some((f) => f.code === 'INVESTIGATION_NOT_FOR_INTEGRATION')).toBeTrue();
  });

  test('sanitizes malicious worker Markdown and HTML injection', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const maliciousHandoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'malicious-injection',
      campaignType: 'investigation',
      title: 'Legit Title\n# FAKE HEADING\n| Fake | Table |',
      summary: 'Summary with <script>alert("hack")</script> and **`READY FOR REVIEW`** claim.',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath,
      uncertainties: ['<img src=x onerror=alert(1)>', '# Malicious Heading']
    };

    const bundle = await buildReviewBundle({ handoff: maliciousHandoff, worktreeRoot: repoDir });
    const markdown = renderReviewBundleMarkdown(bundle);
    expect(markdown).toContain('```text\nSummary with <script>');
    expect(markdown).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(markdown).toContain('Legit Title # FAKE HEADING \\| Fake \\| Table \\|');
  });

  test('CLI script run-review-bundle.ts returns distinct exit codes for verdicts', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preReport = createMockReport({ runId: 'pre', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    // Investigation -> requires-attention (exit code 2)
    const handoffPath = join(tempDir, 'investigation-handoff.json');
    await writeFile(
      handoffPath,
      JSON.stringify({
        schemaVersion: 1,
        campaignId: 'cli-investigation',
        campaignType: 'investigation',
        title: 'CLI investigation test',
        summary: 'Investigation testing exit code',
        baseCommit,
        finalCommit,
        preFixReportPath: prePath,
        postFixReportPath: postPath
      }),
      'utf8'
    );

    const result = await runProcess({
      command: process.execPath,
      args: [
        join(import.meta.dir, 'run-review-bundle.ts'),
        `--handoff=${handoffPath}`,
        `--worktree-root=${repoDir}`,
        `--output-dir=${join(tempDir, 'bundle-out')}`
      ],
      cwd: repoDir,
      timeoutMs: 30_000
    });

    expect(result.exitCode).toBe(2);
    const parsedStdout = JSON.parse(result.stdout);
    expect(parsedStdout.verdict).toBe('requires-attention');
  });
});
