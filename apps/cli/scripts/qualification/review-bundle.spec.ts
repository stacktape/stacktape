import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QualificationReport } from './contracts';
import {
  buildReviewBundle,
  loadAndValidateHandoff,
  renderReviewBundleMarkdown,
  writeReviewBundle
} from './review-bundle';
import type { CampaignHandoff } from './review-bundle-contracts';
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
  cases = []
}: {
  runId: string;
  productCommit: string;
  status?: 'passed' | 'failed';
  cases?: QualificationReport['cases'];
}): QualificationReport => ({
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
    passed: cases.filter((c) => c.status === 'passed').length,
    failed: cases.filter((c) => c.status === 'failed').length,
    skipped: cases.filter((c) => c.status === 'skipped').length,
    durationMs: 5000
  },
  globalSteps: [],
  cases
});

describe('qualification review bundle contracts & logic', () => {
  test('validates and loads a valid campaign handoff', async () => {
    const validHandoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'fastify-postgres-fix',
      campaignType: 'product-bug',
      title: 'Fix Fastify PostgreSQL connection string parsing in importer',
      summary: 'Fixed incorrect port inference when PGPORT was specified in .env files.',
      baseCommit: 'a'.repeat(40),
      finalCommit: 'b'.repeat(40),
      preFixReportPath: 'fixtures/pre-report.json',
      postFixReportPath: 'fixtures/post-report.json',
      focusedRegression: {
        testFile: 'src/domain/importer/postgres.spec.ts',
        testCommand: 'bun test src/domain/importer/postgres.spec.ts',
        description: 'Verifies PGPORT environment resolution.'
      },
      affectedTypecheck: {
        command: 'pnpm --filter @stacktape/config-inference run typecheck'
      },
      neighborCases: ['express-postgres-basic', 'docker-fastapi'],
      runtimeEvidence: {
        executed: false,
        notRunReason: 'Import-only configuration change; runtime packaging behavior unaffected.'
      },
      classifiedFailures: [
        {
          caseId: 'fastify-postgres-worker',
          classification: 'importer',
          explanation: 'PGPORT was parsed as string instead of integer in postgres probe.'
        }
      ],
      uncertainties: ['Did not test with legacy PostgreSQL 9.6 connection URLs.']
    };

    const { handoff } = await loadAndValidateHandoff(validHandoff);
    expect(handoff.campaignId).toBe('fastify-postgres-fix');
    expect(handoff.campaignType).toBe('product-bug');
    expect(handoff.runtimeEvidence?.executed).toBeFalse();
  });

  test('rejects unexecuted runtime claim without notRunReason', async () => {
    const invalidHandoff = {
      schemaVersion: 1,
      campaignId: 'invalid-runtime',
      campaignType: 'product-bug',
      title: 'Invalid runtime evidence',
      summary: 'Testing validation error',
      baseCommit: 'a'.repeat(40),
      finalCommit: 'b'.repeat(40),
      preFixReportPath: 'pre.json',
      postFixReportPath: 'post.json',
      runtimeEvidence: {
        executed: false
      }
    };

    expect(loadAndValidateHandoff(invalidHandoff as any)).rejects.toThrow('explicit not-run uncertainty');
  });

  test('builds a valid review bundle with fixed cases and generates markdown', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const outputDir = await createTempDir();

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
        tags: ['node', 'fastify', 'postgres'],
        steps: [
          {
            name: 'import',
            status: 'failed',
            durationMs: 1000,
            summary: 'Invalid postgres port configuration.',
            failure: { code: 'IMPORT_CONTRACT_FAILED', message: 'Expected port 5432, got null.' }
          }
        ]
      },
      {
        id: 'express-postgres-basic',
        title: 'Express Postgres Basic',
        fingerprint: '2'.repeat(64),
        sourceFingerprint: 'e'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 800,
        source: { kind: 'local', path: 'fixtures/express', license: 'MIT' },
        tags: ['node', 'express'],
        steps: [{ name: 'import', status: 'passed', durationMs: 800, summary: 'Passed.' }]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        id: 'fastify-postgres-worker',
        title: 'Fastify PostgreSQL Worker',
        fingerprint: '3'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 1100,
        source: { kind: 'local', path: 'fixtures/fastify', license: 'MIT' },
        tags: ['node', 'fastify', 'postgres'],
        steps: [{ name: 'import', status: 'passed', durationMs: 1100, summary: 'Passed import contract.' }]
      },
      {
        id: 'express-postgres-basic',
        title: 'Express Postgres Basic',
        fingerprint: '2'.repeat(64),
        sourceFingerprint: 'e'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 800,
        source: { kind: 'local', path: 'fixtures/express', license: 'MIT' },
        tags: ['node', 'express'],
        steps: [{ name: 'import', status: 'passed', durationMs: 800, summary: 'Passed.' }]
      }
    ];

    // Write reports and artifacts
    const preReportDir = join(outputDir, 'pre-run');
    const postReportDir = join(outputDir, 'post-run');
    await mkdir(join(preReportDir, 'cases', 'fastify-postgres-worker'), { recursive: true });
    await mkdir(join(postReportDir, 'cases', 'fastify-postgres-worker'), { recursive: true });

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

    const preReport = createMockReport({
      runId: 'pre-fix-run',
      productCommit: baseCommit,
      status: 'failed',
      cases: preCases
    });
    const postReport = createMockReport({
      runId: 'post-fix-run',
      productCommit: finalCommit,
      status: 'passed',
      cases: postCases
    });

    const preReportPath = join(preReportDir, 'qualification-report.json');
    const postReportPath = join(postReportDir, 'qualification-report.json');
    await writeFile(preReportPath, JSON.stringify(preReport), 'utf8');
    await writeFile(postReportPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'fastify-postgres-fix',
      campaignType: 'product-bug',
      title: 'Fix Fastify PostgreSQL connection string parsing in importer',
      summary: 'Fixed port inference in PostgreSQL probe.',
      baseCommit,
      finalCommit,
      preFixReportPath: preReportPath,
      postFixReportPath: postReportPath,
      focusedRegression: {
        testFile: 'src/domain/importer/postgres.spec.ts',
        testCommand: 'bun test src/domain/importer/postgres.spec.ts',
        description: 'Verifies PGPORT environment resolution.'
      },
      affectedTypecheck: {
        command: 'pnpm --filter @stacktape/config-inference run typecheck'
      },
      neighborCases: ['express-postgres-basic'],
      runtimeEvidence: {
        executed: false,
        notRunReason: 'Import-only change.'
      }
    };

    const bundle = await buildReviewBundle({
      handoff,
      worktreeRoot: repoDir
    });

    expect(bundle.reviewerSummary.verdict).toBe('ready-for-review');
    expect(bundle.reviewerSummary.fixedCasesCount).toBe(1);
    expect(bundle.reviewerSummary.regressedCasesCount).toBe(0);
    expect(bundle.qualificationEvidence.fixedCaseIds).toEqual(['fastify-postgres-worker']);
    expect(bundle.claimsVsVerification.automatedVerification.productBugFixVerified).toBeTrue();
    expect(bundle.claimsVsVerification.automatedVerification.cleanWorktreeVerified).toBeTrue();
    expect(bundle.claimsVsVerification.automatedVerification.artifactsHashedCount).toBeGreaterThan(0);

    const transition = bundle.qualificationEvidence.caseTransitions.find((t) => t.id === 'fastify-postgres-worker');
    expect(transition?.transitionType).toBe('fixed');
    expect(transition?.configArtifact?.changed).toBeTrue();

    const markdown = renderReviewBundleMarkdown(bundle);
    expect(markdown).toContain('READY FOR REVIEW');
    expect(markdown).toContain('Fix Fastify PostgreSQL connection string parsing in importer');
    expect(markdown).toContain('fastify-postgres-worker');
    expect(markdown).toContain('Binary Diff SHA-256');
    expect(markdown).toContain('Trust Boundary & Disclaimer');
    expect(markdown).toContain('does not provide cryptographic tamper-proofing');

    const written = await writeReviewBundle(join(outputDir, 'bundle-out'), bundle);
    expect(await Bun.file(written.jsonPath).exists()).toBeTrue();
    expect(await Bun.file(written.markdownPath).exists()).toBeTrue();
  });

  test('fails closed on dirty worktree', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    // Create a dirty file
    await writeFile(join(repoDir, 'untracked-dirty.txt'), 'dirty\n', 'utf8');

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'dirty-test',
      campaignType: 'new-coverage',
      title: 'Dirty test',
      summary: 'Summary',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    expect(buildReviewBundle({ handoff, worktreeRoot: repoDir })).rejects.toThrow('Worktree is dirty');

    // With --allow-dirty it should succeed but record WORKTREE_DIRTY risk flag and reject verdict
    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir, allowDirty: true });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.riskFlags.some((f) => f.code === 'WORKTREE_DIRTY')).toBeTrue();
  });

  test('fails closed on base commit or final commit mismatch with reports', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    // Pre report has wrong commit
    const wrongSha = 'c'.repeat(40);
    const preReport = createMockReport({ runId: 'pre-run', productCommit: wrongSha });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'mismatch-test',
      campaignType: 'new-coverage',
      title: 'Mismatch test',
      summary: 'Summary',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.riskFlags.some((f) => f.code === 'BASE_COMMIT_MISMATCH')).toBeTrue();
  });

  test('fails closed for product-bug campaign with 0 fixed cases', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'sample-case',
        title: 'Sample Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'f'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 500,
        source: { kind: 'local', path: 'fixtures/sample', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'passed', durationMs: 500, summary: 'Passed.' }]
      }
    ];

    const postCases = [...preCases];

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'no-fixed-cases',
      campaignType: 'product-bug',
      title: 'No fixed cases test',
      summary: 'Claiming bug fix without failed-before/passed-after proof',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath,
      focusedRegression: {
        testFile: 'test.spec.ts',
        testCommand: 'bun test test.spec.ts',
        description: 'Test'
      },
      affectedTypecheck: {
        command: 'pnpm typecheck'
      },
      neighborCases: ['neighbor-case'],
      runtimeEvidence: { executed: false, notRunReason: 'Reason' }
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.reviewerSummary.verdict).toBe('rejected');
    expect(bundle.riskFlags.some((f) => f.code === 'NO_FIXED_CASES_FOR_PRODUCT_BUG')).toBeTrue();
  });

  test('detects sensitive file changes and assigns appropriate risk flags', async () => {
    const { repoDir, baseCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    // Modify sensitive files
    await mkdir(join(repoDir, 'apps', 'cli', 'scripts', 'qualification'), { recursive: true });
    await mkdir(join(repoDir, 'apps', 'cli', 'src', 'aws'), { recursive: true });
    await mkdir(join(repoDir, 'packages', 'packaging', 'src'), { recursive: true });

    await writeFile(
      join(repoDir, 'apps', 'cli', 'scripts', 'qualification', 'offline-aws.ts'),
      '// modified\n',
      'utf8'
    );
    await writeFile(join(repoDir, 'apps', 'cli', 'src', 'aws', 'client.ts'), '// modified\n', 'utf8');
    await writeFile(join(repoDir, 'packages', 'packaging', 'src', 'packager.ts'), '// modified\n', 'utf8');

    await git(repoDir, 'add', '.');
    await git(repoDir, 'commit', '-m', 'modify sensitive files');
    const finalCommit = await git(repoDir, 'rev-parse', 'HEAD');

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'sensitive-test',
      campaignType: 'harness-fix',
      title: 'Harness modification',
      summary: 'Updating harness and packaging core',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath,
      runtimeEvidence: { executed: false, notRunReason: 'Offline guard only' }
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.riskFlags.some((f) => f.code === 'HARNESS_MODIFIED')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'AWS_OR_OFFLINE_GUARD_MODIFIED')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'PACKAGING_CORE_MODIFIED')).toBeTrue();
  });

  test('flags source fingerprint mutation between pre-fix and post-fix', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'mutated-case',
        title: 'Mutated Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'a'.repeat(64),
        execution: 'executed',
        status: 'passed',
        durationMs: 500,
        source: { kind: 'local', path: 'fixtures/mutated', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'passed', durationMs: 500, summary: 'Passed.' }]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        ...preCases[0],
        sourceFingerprint: 'b'.repeat(64) // Changed!
      }
    ];

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'mutation-test',
      campaignType: 'new-coverage',
      title: 'Mutation test',
      summary: 'Testing source mutation detection',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.riskFlags.some((f) => f.code === 'SOURCE_FINGERPRINT_MUTATION')).toBeTrue();
    const transition = bundle.qualificationEvidence.caseTransitions.find((t) => t.id === 'mutated-case');
    expect(transition?.sourceFingerprintMatch).toBeFalse();
  });

  test('flags missing focused regression, typecheck, or neighbor cases for product-bug', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preCases: QualificationReport['cases'] = [
      {
        id: 'fixed-case',
        title: 'Fixed Case',
        fingerprint: '1'.repeat(64),
        sourceFingerprint: 'a'.repeat(64),
        execution: 'executed',
        status: 'failed',
        durationMs: 500,
        source: { kind: 'local', path: 'fixtures/fixed', license: 'MIT' },
        tags: ['node'],
        steps: [{ name: 'import', status: 'failed', durationMs: 500, summary: 'Failed.' }]
      }
    ];

    const postCases: QualificationReport['cases'] = [
      {
        ...preCases[0],
        status: 'passed',
        steps: [{ name: 'import', status: 'passed', durationMs: 500, summary: 'Passed.' }]
      }
    ];

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit, cases: preCases });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit, cases: postCases });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    // Missing focusedRegression, affectedTypecheck, neighborCases
    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'missing-evidence-test',
      campaignType: 'product-bug',
      title: 'Missing evidence test',
      summary: 'Testing missing evidence flags',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff, worktreeRoot: repoDir });
    expect(bundle.riskFlags.some((f) => f.code === 'MISSING_FOCUSED_REGRESSION_FOR_PRODUCT_BUG')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'MISSING_AFFECTED_TYPECHECK_FOR_PRODUCT_BUG')).toBeTrue();
    expect(bundle.riskFlags.some((f) => f.code === 'MISSING_NEIGHBOR_CASES_FOR_PRODUCT_BUG')).toBeTrue();
  });

  test('flags missing runtime evidence when packaging code changes without runtime proof', async () => {
    const { repoDir, baseCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    // Modify packaging file
    await mkdir(join(repoDir, 'packages', 'packaging', 'src'), { recursive: true });
    await writeFile(join(repoDir, 'packages', 'packaging', 'src', 'bundle.ts'), '// packaging change\n', 'utf8');
    await git(repoDir, 'add', '.');
    await git(repoDir, 'commit', '-m', 'packaging change');
    const finalCommit = await git(repoDir, 'rev-parse', 'HEAD');

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoffWithoutRuntime: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'packaging-no-runtime',
      campaignType: 'new-coverage',
      title: 'Packaging change without runtime evidence',
      summary: 'Testing packaging runtime evidence check',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };

    const bundle = await buildReviewBundle({ handoff: handoffWithoutRuntime, worktreeRoot: repoDir });
    expect(bundle.riskFlags.some((f) => f.code === 'MISSING_RUNTIME_EVIDENCE_FOR_PACKAGING')).toBeTrue();
  });

  test('executes via CLI script run-review-bundle.ts', async () => {
    const { repoDir, baseCommit, finalCommit } = await setupTestGitRepo();
    const tempDir = await createTempDir();

    const preReport = createMockReport({ runId: 'pre-run', productCommit: baseCommit });
    const postReport = createMockReport({ runId: 'post-run', productCommit: finalCommit });
    const prePath = join(tempDir, 'pre.json');
    const postPath = join(tempDir, 'post.json');
    await writeFile(prePath, JSON.stringify(preReport), 'utf8');
    await writeFile(postPath, JSON.stringify(postReport), 'utf8');

    const handoffPath = join(tempDir, 'handoff.json');
    const handoff: CampaignHandoff = {
      schemaVersion: 1,
      campaignId: 'cli-test',
      campaignType: 'new-coverage',
      title: 'CLI execution test',
      summary: 'Testing CLI execution of review bundle generator',
      baseCommit,
      finalCommit,
      preFixReportPath: prePath,
      postFixReportPath: postPath
    };
    await writeFile(handoffPath, JSON.stringify(handoff), 'utf8');

    const bundleOut = join(tempDir, 'bundle-output');
    const result = await runProcess({
      command: process.execPath,
      args: [
        join(import.meta.dir, 'run-review-bundle.ts'),
        `--handoff=${handoffPath}`,
        `--worktree-root=${repoDir}`,
        `--output-dir=${bundleOut}`
      ],
      cwd: repoDir,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(result);
    const parsedStdout = JSON.parse(result.stdout);
    expect(parsedStdout.verdict).toBe('ready-for-review');
    expect(parsedStdout.campaignId).toBe('cli-test');
    expect(await Bun.file(join(bundleOut, 'review-bundle.json')).exists()).toBeTrue();
    expect(await Bun.file(join(bundleOut, 'review-bundle.md')).exists()).toBeTrue();
  });
});
