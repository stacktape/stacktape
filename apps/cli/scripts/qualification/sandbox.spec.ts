import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { BUILT_IN_CASES } from './catalog';
import {
  MAX_CASE_RESULT_BYTES,
  MAX_COMPILED_TEMPLATE_BYTES,
  MAX_GENERATED_CONFIG_BYTES,
  MAX_QUALIFICATION_REPORT_BYTES
} from './contracts';
import { QUALIFICATION_RUNNER_DOCKERFILE } from './sandbox-dockerfile';
import type { ProcessResult } from './process';
import {
  describeSandboxFailure,
  processResultExitCode,
  readCollectedQualificationReport,
  stopRunnerAfterDetachedAttach,
  validateCollectedCaseArtifacts,
  validateAndHashOutputTree
} from './run-sandboxed-qualification';
import { hashFileSha256, makeRetainedWorkdirPortable } from './sandbox-output';
import {
  assertPlannedSecurity,
  BLOCKED_HOST_GATEWAYS,
  buildRunnerImageTag,
  planSandboxExecution,
  type PlannedSandboxExecution,
  validateCpusString,
  validateMemoryString,
  validatePidsLimit,
  validateTimeoutMs
} from './sandbox-planning';

const mockRoot = resolve(import.meta.dir, '..', '..', '..', '..');
const mockCommit = '9e04530f68c40f3bb5d3f1ef589d481cb0925bda';
const temporaryDirectories: string[] = [];

const dockerResult = (stdout: string, exitCode = 0, stderr = ''): ProcessResult => ({
  command: 'docker mock',
  exitCode,
  signal: null,
  durationMs: 1,
  stdout,
  stderr,
  stdoutTruncated: false,
  stderrTruncated: false,
  timedOut: false,
  forceTerminationRequested: false
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('sandboxed qualification planning & command composition', () => {
  test('generates commit-keyed image tag', () => {
    const tag = buildRunnerImageTag(mockCommit);
    expect(tag).toBe('stacktape-qualification-runner:9e04530f68c4');
  });

  test('configures Dockerfile ENTRYPOINT to the runner script and planned runner command passes only flags', () => {
    expect(QUALIFICATION_RUNNER_DOCKERFILE).toContain(
      'ENTRYPOINT ["bun", "apps/cli/scripts/qualification/run-project-qualification.ts"]'
    );
    expect(QUALIFICATION_RUNNER_DOCKERFILE).toContain('git config --system --add safe.directory /workspace');
    expect(QUALIFICATION_RUNNER_DOCKERFILE).toContain('docker buildx version');
    expect(QUALIFICATION_RUNNER_DOCKERFILE).toContain('buildx-v0.36.1.linux-');
    expect(QUALIFICATION_RUNNER_DOCKERFILE).not.toContain('chmod -R 755 /workspace');

    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: ['--preset=smoke', '--lanes=import,package'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'cmdtest'
    });

    const imageIndex = planned.runnerArgs.indexOf(planned.imageTag);
    expect(imageIndex).toBeGreaterThan(-1);

    const trailingArgs = planned.runnerArgs.slice(imageIndex + 1);
    expect(trailingArgs).not.toContain('bun');
    expect(trailingArgs).not.toContain('run-project-qualification.ts');
    expect(trailingArgs).toContain('--output-dir=/qualification/output');
    expect(trailingArgs).toContain(`--run-id=${planned.runId}`);
    expect(trailingArgs).toContain('--preset=smoke');
    expect(trailingArgs).toContain('--lanes=import,package');
  });

  test('preserves self-test semantics in the host replay command', () => {
    const manifest = resolve(
      mockRoot,
      'apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json'
    );
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [
        `--manifest=${manifest}`,
        '--case=qualification-self-test-docker',
        '--lanes=import,package',
        '--memory=6g'
      ],
      hostReplayArgs: ['--self-test', '--memory=6g', '--rebuild-image'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'selftest',
      isSelfTest: true
    });

    expect(planned.hostReplay.args).toEqual(['qualify:projects:sandboxed', '--', '--self-test', '--memory=6g']);
  });

  test('enforces zero host bind mounts and configures non-root read-only execution with named volumes and tmpfs', () => {
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: ['--preset=smoke', '--lanes=import,package', '--memory=12g', '--cpus=6', '--pids-limit=4096'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'mounttest'
    });

    expect(planned.runnerArgs).toContain('--user');
    expect(planned.runnerArgs).toContain('1000:1000');
    expect(planned.runnerArgs).toContain('--read-only');
    expect(planned.runnerArgs).toContain('--cap-drop=ALL');
    expect(planned.runnerArgs).toContain('--security-opt=no-new-privileges:true');

    expect(planned.runnerArgs).toContain('--tmpfs');
    expect(planned.runnerArgs).toContain('/tmp:rw,exec,nosuid,size=4g');
    expect(planned.runnerArgs).toContain('/run:rw,noexec,nosuid,size=64m');
    expect(planned.runnerArgs).toContain('/home/node:rw,exec,nosuid,size=1g');
    expect(planned.runnerArgs).toContain(
      '/workspace/apps/cli/.stacktape:rw,exec,nosuid,size=4g,uid=1000,gid=1000,mode=0700'
    );

    expect(planned.runnerArgs).toContain(`${planned.inputVolumeName}:/qualification/inputs:ro`);
    expect(planned.runnerArgs).toContain(`${planned.outputVolumeName}:/qualification/output:rw`);
    expect(planned.runnerArgs).toContain(`${planned.cacheVolumeName}:/qualification/cache:rw`);

    for (let i = 0; i < planned.runnerArgs.length; i++) {
      if (planned.runnerArgs[i] === '-v' || planned.runnerArgs[i] === '--volume') {
        const vol = planned.runnerArgs[i + 1] ?? '';
        if (vol.startsWith('C:\\') || vol.startsWith('/Users') || vol.startsWith('/home/')) {
          throw new Error(`Found host path directly in volume argument: ${vol}`);
        }
      }
    }
  });

  test('stages external manifests and resume files cleanly without bind-mounting host directories', () => {
    const resumeRoot = mkdtempSync(join(tmpdir(), 'qualification-resume-'));
    temporaryDirectories.push(resumeRoot);
    const resumeCaseDirectory = join(resumeRoot, 'cases', 'qualification-self-test-docker');
    mkdirSync(resumeCaseDirectory, { recursive: true });
    const resumedResult = {
      id: 'qualification-self-test-docker',
      title: 'Qualification sandbox Docker self-test',
      fingerprint: 'a'.repeat(64),
      sourceFingerprint: 'b'.repeat(64),
      execution: 'executed',
      status: 'passed',
      durationMs: 1,
      source: { kind: 'local', path: '.', license: 'Synthetic' },
      tags: ['docker', 'node'],
      steps: [
        { name: 'acquire', status: 'passed', durationMs: 0, summary: 'Acquired.' },
        { name: 'import', status: 'passed', durationMs: 1, summary: 'Imported.' }
      ]
    };
    writeFileSync(join(resumeCaseDirectory, 'result.json'), `${JSON.stringify(resumedResult)}\n`);
    writeFileSync(join(resumeCaseDirectory, 'stacktape.yml'), 'resources: {}\n');
    const unselectedResult = {
      ...resumedResult,
      id: 'unselected-resume',
      title: 'Unselected resume evidence',
      fingerprint: 'd'.repeat(64)
    };
    const unselectedCaseDirectory = join(resumeRoot, 'cases', unselectedResult.id);
    mkdirSync(unselectedCaseDirectory, { recursive: true });
    writeFileSync(join(unselectedCaseDirectory, 'result.json'), `${JSON.stringify(unselectedResult)}\n`);
    writeFileSync(join(unselectedCaseDirectory, 'stacktape.yml'), 'resources: {}\n');
    const resumeReportPath = join(resumeRoot, 'qualification-report.json');
    writeFileSync(
      resumeReportPath,
      `${JSON.stringify({
        schemaVersion: 3,
        runId: 'qualification-resume-fixture',
        generatedAt: '2026-08-25T00:00:00.000Z',
        productCommit: mockCommit,
        productFingerprint: 'c'.repeat(64),
        lanes: ['import'],
        awsScenarios: [],
        environment: { platform: process.platform, architecture: process.arch, bun: '1.3.14', node: '24.0.0' },
        summary: { passed: 2, failed: 0, skipped: 0, durationMs: 1 },
        globalSteps: [],
        cases: [resumedResult, unselectedResult]
      })}\n`
    );
    const rawArgs = [
      '--manifest=apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json',
      `--resume-from=${resumeReportPath}`,
      '--lanes=import'
    ];
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs,
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'stagetest'
    });

    expect(planned.stagedInputs).toHaveLength(4);
    expect(planned.stagedInputs[0].containerRelativePath).toBe(
      'inputs/manifest-0-source-0-qualification-self-test-docker'
    );
    expect(planned.stagedInputs[0].hostPath).toBe(
      resolve(mockRoot, 'apps/cli/scripts/qualification/fixtures/self-test-docker-project')
    );
    expect(planned.stagedInputs[1].containerRelativePath).toBe('inputs/manifest-0.json');
    expect(planned.stagedInputs[1].content).toContain('"path": "manifest-0-source-0-qualification-self-test-docker"');
    expect(planned.stagedInputs[2].containerRelativePath).toBe('inputs/resume-report.json');
    expect(planned.stagedInputs[3].containerRelativePath).toBe('inputs/cases/qualification-self-test-docker');
    expect(planned.stagedInputs.some((input) => input.label === 'resume-case-unselected-resume')).toBeFalse();

    expect(planned.innerCommandArgs).toContain('--manifest=/qualification/inputs/manifest-0.json');
    expect(planned.innerCommandArgs).toContain('--resume-from=/qualification/inputs/resume-report.json');
    expect(planned.expectedCaseIds).toEqual(['qualification-self-test-docker']);

    truncateSync(join(resumeCaseDirectory, 'result.json'), MAX_CASE_RESULT_BYTES + 1);
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs,
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot,
        runIdSuffix: 'oversizedresult'
      })
    ).toThrow('result.json exceeds');
  });

  test('bounds the selected resume campaign rather than staging unbounded passing artifacts', () => {
    const resumeRoot = mkdtempSync(join(tmpdir(), 'qualification-resume-bound-'));
    temporaryDirectories.push(resumeRoot);
    const entries = BUILT_IN_CASES.slice(0, 2);
    const results = entries.map((entry, index) => {
      const result = {
        id: entry.id,
        title: entry.title,
        fingerprint: String(index + 1).repeat(64),
        sourceFingerprint: String(index + 3).repeat(64),
        execution: 'executed' as const,
        status: 'passed' as const,
        durationMs: 1,
        source: entry.source,
        tags: entry.tags,
        steps: [
          { name: 'acquire' as const, status: 'passed' as const, durationMs: 0, summary: 'Acquired.' },
          { name: 'import' as const, status: 'passed' as const, durationMs: 1, summary: 'Imported.' }
        ]
      };
      const caseDirectory = join(resumeRoot, 'cases', entry.id);
      mkdirSync(caseDirectory, { recursive: true });
      writeFileSync(join(caseDirectory, 'result.json'), `${JSON.stringify(result)}\n`);
      const configPath = join(caseDirectory, 'stacktape.yml');
      writeFileSync(configPath, 'resources: {}\n');
      truncateSync(configPath, 300 * 1024 ** 2);
      return result;
    });
    const reportPath = join(resumeRoot, 'qualification-report.json');
    writeFileSync(
      reportPath,
      `${JSON.stringify({
        schemaVersion: 3,
        runId: 'qualification-large-resume',
        generatedAt: '2026-08-25T00:00:00.000Z',
        productCommit: mockCommit,
        productFingerprint: 'f'.repeat(64),
        lanes: ['import'],
        awsScenarios: [],
        environment: { platform: process.platform, architecture: process.arch, bun: '1.3.14', node: '24.0.0' },
        summary: { passed: 2, failed: 0, skipped: 0, durationMs: 2 },
        globalSteps: [],
        cases: results
      })}\n`
    );

    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: [
          `--case=${entries.map((entry) => entry.id).join(',')}`,
          '--lanes=import',
          `--resume-from=${reportPath}`
        ],
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot,
        runIdSuffix: 'resumebound'
      })
    ).toThrow('campaign staging limit');
  });

  test('rejects oversized reports before reading and parsing them', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-report-bound-'));
    temporaryDirectories.push(root);
    const reportPath = join(root, 'qualification-report.json');
    writeFileSync(reportPath, '{}\n');
    truncateSync(reportPath, MAX_QUALIFICATION_REPORT_BYTES + 1);

    await expect(readCollectedQualificationReport(reportPath)).rejects.toThrow('no larger than');
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: ['--case=heroku-node-getting-started', '--lanes=import', `--resume-from=${reportPath}`],
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot,
        runIdSuffix: 'reportbound'
      })
    ).toThrow('no larger than');
  });

  test('stages only selected local sources, deduplicates them, and supports spaces in paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification manifest with spaces-'));
    temporaryDirectories.push(root);
    const selectedSource = join(root, 'selected project');
    const unrelatedSource = join(root, 'unrelated project');
    mkdirSync(selectedSource);
    mkdirSync(unrelatedSource);
    writeFileSync(join(selectedSource, 'package.json'), '{}\n');
    writeFileSync(join(unrelatedSource, 'package.json'), '{}\n');
    const manifestPath = join(root, 'manifest.json');
    writeFileSync(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: [
          {
            id: 'selected-one',
            title: 'Selected one',
            why: 'Selected source staging fixture.',
            source: { kind: 'local', path: 'selected project', license: 'Synthetic' },
            origin: 'synthetic',
            tags: ['node'],
            lanes: ['import']
          },
          {
            id: 'selected-two',
            title: 'Selected two',
            why: 'Deduplicated source staging fixture.',
            source: { kind: 'local', path: 'selected project', license: 'Synthetic' },
            origin: 'synthetic',
            tags: ['node'],
            lanes: ['import']
          },
          {
            id: 'not-selected',
            title: 'Not selected',
            why: 'Must not be copied into the sandbox.',
            source: { kind: 'local', path: 'unrelated project', license: 'Synthetic' },
            origin: 'synthetic',
            tags: ['node'],
            lanes: ['import']
          }
        ]
      })}\n`
    );

    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [`--manifest=${manifestPath}`, '--case=selected-one,selected-two', '--lanes=import'],
      invocationDirectory: root,
      rootDirectory: mockRoot,
      runIdSuffix: 'selected'
    });
    const stagedDirectories = planned.stagedInputs.filter((entry) => entry.isDirectory);
    expect(stagedDirectories).toHaveLength(1);
    expect(stagedDirectories[0].hostPath).toBe(selectedSource);
    expect(planned.stagedInputs.some((entry) => entry.hostPath === unrelatedSource)).toBeFalse();
    expect(planned.stagedInputs.find((entry) => entry.content !== undefined)?.content).toContain(
      '"path": "manifest-0-source-0-selected-one"'
    );
  });

  test('stages only the effective local source after sharding and max-case selection', () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-sharded-staging-'));
    temporaryDirectories.push(root);
    for (const source of ['first', 'second', 'third']) {
      mkdirSync(join(root, source));
      writeFileSync(join(root, source, 'package.json'), '{}\n');
    }
    const manifestPath = join(root, 'manifest.json');
    writeFileSync(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: ['first', 'second', 'third'].map((id) => ({
          id: `${id}-case`,
          title: id,
          why: `Exercise ${id} selection.`,
          source: { kind: 'local', path: id, license: 'Synthetic' },
          origin: 'synthetic',
          tags: ['node'],
          lanes: ['import']
        }))
      })}\n`
    );
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [`--manifest=${manifestPath}`, '--lanes=import', '--shard=2/3', '--max-cases=1'],
      invocationDirectory: root,
      rootDirectory: mockRoot,
      runIdSuffix: 'sharded'
    });
    expect(planned.expectedCaseIds).toEqual(['second-case']);
    expect(planned.stagedInputs.filter((entry) => entry.isDirectory).map((entry) => entry.hostPath)).toEqual([
      join(root, 'second')
    ]);
  });

  test('rejects a local source whose directory link escapes the manifest root', () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-symlink-'));
    temporaryDirectories.push(root);
    const manifestDirectory = join(root, 'manifest');
    const outsideSource = join(root, 'outside');
    mkdirSync(manifestDirectory);
    mkdirSync(outsideSource);
    symlinkSync(
      outsideSource,
      join(manifestDirectory, 'linked-project'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    const manifestPath = join(manifestDirectory, 'manifest.json');
    writeFileSync(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: [
          {
            id: 'escaped-source',
            title: 'Escaped source',
            why: 'Must be rejected before Docker copies it.',
            source: { kind: 'local', path: 'linked-project', license: 'Synthetic' },
            origin: 'synthetic',
            tags: ['node'],
            lanes: ['import']
          }
        ]
      })}\n`
    );
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: [`--manifest=${manifestPath}`, '--lanes=import'],
        invocationDirectory: root,
        rootDirectory: mockRoot
      })
    ).toThrow('resolves outside');
  });

  test('applies labels to all planned resources for tracking and orphan management', () => {
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: ['--preset=smoke'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'labeltest'
    });

    expect(planned.labels['stacktape.qualification.managed']).toBe('true');
    expect(planned.labels['stacktape.qualification.run-id']).toBe(planned.runId);
    expect(planned.labels['stacktape.qualification.commit']).toBe(mockCommit);

    expect(planned.runnerArgs).toContain('stacktape.qualification.managed=true');
    expect(planned.dindArgs).toContain('stacktape.qualification.managed=true');
  });

  test('rejects unexpected files and links before sandbox output is materialized', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-output-'));
    temporaryDirectories.push(root);
    writeFileSync(join(root, 'qualification-report.json'), '{}\n');
    const accepted = await validateAndHashOutputTree(root, false);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].path).toBe('qualification-report.json');

    writeFileSync(join(root, 'unexpected.txt'), 'not allowed\n');
    await expect(validateAndHashOutputTree(root, false)).rejects.toThrow('unexpected artifact');
    rmSync(join(root, 'unexpected.txt'));

    const outside = join(dirname(root), `${basename(root)}-outside`);
    writeFileSync(outside, 'outside\n');
    temporaryDirectories.push(outside);
    symlinkSync(outside, join(root, 'qualification-report.md'));
    await expect(validateAndHashOutputTree(root, false)).rejects.toThrow('link outside a retained workdir');
  });

  test('allows only contained relative symlinks inside retained workdirs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-workdir-links-'));
    temporaryDirectories.push(root);
    const workdir = join(root, 'workdirs', 'node-case-Ab12Cd');
    mkdirSync(join(workdir, 'packages', 'target'), { recursive: true });
    writeFileSync(join(workdir, 'packages', 'target', 'package.json'), '{}\n');
    mkdirSync(join(workdir, 'links'));
    symlinkSync('../packages/target', join(workdir, 'links', 'target'), 'dir');
    const accepted = await validateAndHashOutputTree(root, true);
    const containedLink = accepted.find((entry) => entry.path === 'workdirs/node-case-Ab12Cd/links/target');
    expect(containedLink?.type).toBe('symlink');
    expect(containedLink?.linkTarget?.replaceAll('\\', '/')).toBe('../packages/target');

    const outside = join(dirname(root), `${basename(root)}-escape`);
    mkdirSync(outside);
    temporaryDirectories.push(outside);
    symlinkSync(outside, join(workdir, 'links', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(validateAndHashOutputTree(root, true)).rejects.toThrow(/absolute link|escaping link/);
  });

  test('makes contained absolute workdir links portable and removes unsafe links', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-portable-links-'));
    temporaryDirectories.push(root);
    const workdir = join(root, 'workdirs', 'node-case-Ab12Cd');
    const target = join(workdir, 'cache', 'target');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'package.json'), '{}\n');
    mkdirSync(join(workdir, 'links'));
    symlinkSync(target, join(workdir, 'links', 'contained'), process.platform === 'win32' ? 'junction' : 'dir');
    const outside = join(dirname(root), `${basename(root)}-portable-outside`);
    mkdirSync(outside);
    temporaryDirectories.push(outside);
    symlinkSync(outside, join(workdir, 'links', 'unsafe'), process.platform === 'win32' ? 'junction' : 'dir');

    const result = await makeRetainedWorkdirPortable(workdir);
    expect(result).toEqual({
      convertedAbsoluteLinks: 1,
      removedUnsafeLinks: 1,
      prunedDependencyDirectories: 0,
      prunedIsolatedHomes: 0
    });
    const accepted = await validateAndHashOutputTree(root, true);
    expect(accepted.find((entry) => entry.path.endsWith('/links/contained'))?.type).toBe('symlink');
    expect(accepted.find((entry) => entry.path.endsWith('/links/unsafe'))?.type).toBe('file');
  });

  test('prunes installed Node dependencies before retaining a portable workdir', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-pruned-dependencies-'));
    temporaryDirectories.push(root);
    const workdir = join(root, 'workdirs', 'node-case-Ab12Cd');
    const dependencies = join(workdir, 'project', 'node_modules');
    const isolatedHome = join(workdir, 'isolated-home');
    mkdirSync(dependencies, { recursive: true });
    mkdirSync(join(isolatedHome, '.cache'), { recursive: true });
    writeFileSync(join(workdir, 'project', 'package.json'), '{}\n');
    writeFileSync(join(dependencies, 'installed.js'), 'export {};\n');
    writeFileSync(join(isolatedHome, '.cache', 'download'), 'disposable cache\n');

    const result = await makeRetainedWorkdirPortable(workdir);

    expect(result.prunedDependencyDirectories).toBe(1);
    expect(result.prunedIsolatedHomes).toBe(1);
    expect(existsSync(dependencies)).toBeFalse();
    expect(existsSync(isolatedHome)).toBeFalse();
    expect(existsSync(join(workdir, 'project', 'package.json'))).toBeTrue();
    const accepted = await validateAndHashOutputTree(root, true);
    expect(accepted.some((entry) => entry.path.endsWith('/project/package.json'))).toBeTrue();
  });

  test('hashes copied artifacts incrementally with the same SHA-256 result', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-stream-hash-'));
    temporaryDirectories.push(root);
    const content = Buffer.alloc(512 * 1024 + 17, 0x5a);
    const path = join(root, 'artifact.bin');
    writeFileSync(path, content);
    expect(await hashFileSha256(path)).toBe(createHash('sha256').update(content).digest('hex'));
  });

  test('requires exact per-case artifacts before accepting a sandbox report', async () => {
    const root = mkdtempSync(join(tmpdir(), 'qualification-case-artifacts-'));
    temporaryDirectories.push(root);
    const caseDirectory = join(root, 'cases', 'artifact-case');
    mkdirSync(caseDirectory, { recursive: true });
    const result = {
      id: 'artifact-case',
      title: 'Artifact case',
      fingerprint: 'a'.repeat(64),
      sourceFingerprint: 'b'.repeat(64),
      execution: 'executed' as const,
      status: 'passed' as const,
      durationMs: 3,
      source: { kind: 'local' as const, path: '.', license: 'Synthetic' },
      tags: ['artifacts'],
      steps: [
        { name: 'acquire' as const, status: 'passed' as const, durationMs: 1, summary: 'Acquired.' },
        { name: 'import' as const, status: 'passed' as const, durationMs: 1, summary: 'Imported.' },
        { name: 'package' as const, status: 'passed' as const, durationMs: 1, summary: 'Packaged.' }
      ],
      generatedConfigPath: 'cases/artifact-case/stacktape.yml'
    };
    const report = {
      schemaVersion: 3 as const,
      runId: 'artifact-run',
      generatedAt: '2026-08-25T00:00:00.000Z',
      productCommit: mockCommit,
      productFingerprint: 'c'.repeat(64),
      lanes: ['import' as const, 'package' as const],
      awsScenarios: [],
      environment: { platform: process.platform, architecture: process.arch, bun: '1.3.14', node: '24.0.0' },
      summary: { passed: 1, failed: 0, skipped: 0, durationMs: 3 },
      globalSteps: [],
      cases: [result]
    };

    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('result.json');
    writeFileSync(join(caseDirectory, 'result.json'), `${JSON.stringify(result)}\n`);
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('stacktape.yml');
    writeFileSync(join(caseDirectory, 'stacktape.yml'), 'resources: {}\n');
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('compiled-template.yml');
    writeFileSync(join(caseDirectory, 'compiled-template.yml'), '   \n');
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('must be nonempty');
    writeFileSync(join(caseDirectory, 'compiled-template.yml'), 'Resources: {}\n');
    await expect(validateCollectedCaseArtifacts(root, report)).resolves.toBeUndefined();
    truncateSync(join(caseDirectory, 'compiled-template.yml'), MAX_COMPILED_TEMPLATE_BYTES + 1);
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('no larger than');
    writeFileSync(join(caseDirectory, 'compiled-template.yml'), 'Resources: {}\n');
    truncateSync(join(caseDirectory, 'stacktape.yml'), MAX_GENERATED_CONFIG_BYTES + 1);
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('no larger than');
    writeFileSync(join(caseDirectory, 'stacktape.yml'), 'resources: {}\n');
    truncateSync(join(caseDirectory, 'result.json'), MAX_CASE_RESULT_BYTES + 1);
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('no larger than');
    writeFileSync(join(caseDirectory, 'result.json'), `${JSON.stringify({ ...result, title: 'Mismatch' })}\n`);
    await expect(validateCollectedCaseArtifacts(root, report)).rejects.toThrow('does not match');
  });
});

describe('sandboxed qualification resource & lane validation', () => {
  test('prioritizes timeout and interruption over a misleading zero exit code', () => {
    expect(processResultExitCode({ exitCode: 0, timedOut: true })).toBe(124);
    expect(processResultExitCode({ exitCode: 0, timedOut: false, interruptedSignal: 'SIGINT' })).toBe(130);
    expect(processResultExitCode({ exitCode: 0, timedOut: true, interruptedSignal: 'SIGINT' })).toBe(130);
    expect(processResultExitCode({ exitCode: 0, timedOut: false })).toBe(0);
  });

  test('preserves the primary runner failure alongside report validation diagnostics', () => {
    expect(describeSandboxFailure(new Error('missing report'), { exitCode: 1, timedOut: true }, 10_000)).toEqual({
      failureKind: 'runner-timeout',
      failure: 'Qualification runner timed out after 10000ms.',
      reportValidationFailure: expect.stringContaining('missing report')
    });
    expect(
      describeSandboxFailure(
        new Error('missing report'),
        { exitCode: 1, timedOut: true, interruptedSignal: 'SIGINT' },
        10_000
      )
    ).toEqual({
      failureKind: 'runner-interrupted',
      failure: 'Qualification runner was interrupted by SIGINT.',
      reportValidationFailure: expect.stringContaining('missing report')
    });
    expect(
      describeSandboxFailure(
        new Error('missing report'),
        { exitCode: 1, timedOut: false, interruptedSignal: 'SIGINT' },
        10_000
      )
    ).toEqual({
      failureKind: 'runner-interrupted',
      failure: 'Qualification runner was interrupted by SIGINT.',
      reportValidationFailure: expect.stringContaining('missing report')
    });
    expect(describeSandboxFailure(new Error('invalid JSON'), { exitCode: 0, timedOut: false }, 10_000)).toEqual({
      failureKind: 'report-validation',
      failure: 'Qualification output did not contain a verifiable report.',
      reportValidationFailure: expect.stringContaining('invalid JSON')
    });
  });

  test('accepts a runner that exits between inspection and kill', async () => {
    const results = [dockerResult('true'), dockerResult('', 1, 'container is not running'), dockerResult('false')];
    const result = await stopRunnerAfterDetachedAttach(
      { runnerContainerName: 'stp-qual-runner-test' } as PlannedSandboxExecution,
      async () => results.shift()!
    );
    expect(result).toEqual({ stopped: true });
    expect(results).toHaveLength(0);
  });

  test('fails closed when runner termination cannot be verified', async () => {
    const result = await stopRunnerAfterDetachedAttach(
      { runnerContainerName: 'stp-qual-runner-test' } as PlannedSandboxExecution,
      async () => {
        throw new Error('Docker process could not be started.');
      }
    );
    expect(result.stopped).toBeFalse();
    if (result.stopped === false) expect(result.failure).toContain('Could not inspect runner state');
  });

  test('validates resource bound inputs correctly', () => {
    expect(validateMemoryString('8g')).toBe('8g');
    expect(validateMemoryString('4096m')).toBe('4096m');
    expect(() => validateMemoryString('100m')).toThrow('Memory limit must be between 512m and 64g');
    expect(() => validateMemoryString('128g')).toThrow('Memory limit must be between 512m and 64g');
    expect(() => validateMemoryString('invalid')).toThrow('Invalid memory limit');

    expect(validateCpusString('4')).toBe('4');
    expect(validateCpusString('0.5')).toBe('0.5');
    expect(() => validateCpusString('0.1')).toThrow('CPU limit must be a positive number');
    expect(() => validateCpusString('128')).toThrow('CPU limit must be a positive number');

    expect(validatePidsLimit(2048)).toBe(2048);
    expect(() => validatePidsLimit(16)).toThrow('PIDs limit must be an integer between 64 and 32768');

    expect(validateTimeoutMs(60_000)).toBe(60_000);
    expect(() => validateTimeoutMs(1000)).toThrow('Timeout must be between 10000ms');
  });

  test('fails closed if aws lane is requested in the sandbox', () => {
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: ['--lanes=import,aws'],
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot
      })
    ).toThrow('The aws lane cannot be executed in the qualification sandbox');
  });

  test('rejects an explicitly empty lane selection', () => {
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: ['--lanes='],
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot
      })
    ).toThrow('at least one lane');
  });

  test('rejects project selection for a global-only lane', () => {
    expect(() =>
      planSandboxExecution({
        productCommit: mockCommit,
        rawArgs: ['--case=heroku-node-getting-started', '--lanes=runtime'],
        invocationDirectory: mockRoot,
        rootDirectory: mockRoot
      })
    ).toThrow('require the import or package lane');
  });
});

describe('sandboxed qualification security boundary enforcement', () => {
  const validPlanned: PlannedSandboxExecution = {
    runId: 'qual-test',
    createdAt: new Date().toISOString(),
    networkName: 'stp-qual-net-test',
    dindContainerName: 'stp-qual-dind-test',
    stagingContainerName: 'stp-qual-stage-test',
    runnerContainerName: 'stp-qual-runner-test',
    inputVolumeName: 'stp-qual-input-test',
    outputVolumeName: 'stp-qual-out-test',
    cacheVolumeName: 'stp-qual-cache-test',
    imageTag: 'stacktape-qualification-runner:9e04530f68c4',
    productCommit: mockCommit,
    labels: { 'stacktape.qualification.managed': 'true', 'stacktape.qualification.run-id': 'qual-test' },
    dindArgs: ['run', '-d', 'docker:27-dind'],
    runnerArgs: [
      'run',
      '--name',
      'stp-qual-runner-test',
      '--user',
      '1000:1000',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      '--tmpfs',
      '/workspace/apps/cli/.stacktape:rw,exec,nosuid,size=4g,uid=1000,gid=1000,mode=0700',
      '-v',
      'stp-qual-input-test:/qualification/inputs:ro',
      '-v',
      'stp-qual-out-test:/qualification/output:rw',
      'stacktape-qualification-runner:9e04530f68c4',
      '--output-dir=/qualification/output'
    ],
    innerCommandArgs: ['--output-dir=/qualification/output'],
    stagedInputs: [],
    environment: {
      DOCKER_HOST: 'tcp://stp-qual-dind-test:2375',
      STACKTAPE_QUALIFICATION_SANDBOX: '1',
      AWS_ACCESS_KEY_ID: 'offline-qualification',
      AWS_SECRET_ACCESS_KEY: 'offline-qualification',
      STACKTAPE_API_KEY: 'offline-qualification-do-not-use'
    },
    hostOverrides: BLOCKED_HOST_GATEWAYS,
    hostOutputDirectory: 'C:\\output',
    manifests: [],
    expectedCaseIds: [],
    hostReplay: { command: 'pnpm', args: ['qualify:projects:sandboxed', '--'], cwd: mockRoot },
    manifestMappings: [],
    resourceLimits: { memory: '8g', cpus: '4', pidsLimit: 2048, timeoutMs: 7200000 },
    isSelfTest: false
  };

  test('passes valid planned configuration', () => {
    expect(() => assertPlannedSecurity(validPlanned)).not.toThrow();
  });

  test('fails closed if host Docker socket is passed in runner arguments', () => {
    const taintedSocketMount: PlannedSandboxExecution = {
      ...validPlanned,
      runnerArgs: [...validPlanned.runnerArgs, '-v', '/var/run/docker.sock:/var/run/docker.sock']
    };
    expect(() => assertPlannedSecurity(taintedSocketMount)).toThrow('host Docker socket');
  });

  test('fails closed if host bind mount is passed in runner arguments', () => {
    const hostMount: PlannedSandboxExecution = {
      ...validPlanned,
      runnerArgs: [...validPlanned.runnerArgs, '-v', 'C:\\Users\\admin:/qualification/host']
    };
    expect(() => assertPlannedSecurity(hostMount)).toThrow('host bind mounts are prohibited');
  });

  test('fails closed if DOCKER_HOST does not route via TCP to DinD', () => {
    const taintedDockerHost: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        DOCKER_HOST: 'unix:///var/run/docker.sock'
      }
    };
    expect(() => assertPlannedSecurity(taintedDockerHost)).toThrow('DOCKER_HOST');
  });

  test('fails closed if STACKTAPE_QUALIFICATION_SANDBOX is missing or not 1', () => {
    const missingSandboxFlag: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        STACKTAPE_QUALIFICATION_SANDBOX: '0'
      }
    };
    expect(() => assertPlannedSecurity(missingSandboxFlag)).toThrow('STACKTAPE_QUALIFICATION_SANDBOX');
  });

  test('fails closed if --read-only or --cap-drop=ALL is omitted', () => {
    const missingReadOnly: PlannedSandboxExecution = {
      ...validPlanned,
      runnerArgs: validPlanned.runnerArgs.filter((a) => a !== '--read-only')
    };
    expect(() => assertPlannedSecurity(missingReadOnly)).toThrow('--read-only');

    const missingCapDrop: PlannedSandboxExecution = {
      ...validPlanned,
      runnerArgs: validPlanned.runnerArgs.filter((a) => a !== '--cap-drop=ALL')
    };
    expect(() => assertPlannedSecurity(missingCapDrop)).toThrow('--cap-drop=ALL');
  });

  test('fails closed if real credentials leak into environment', () => {
    const leakedAwsSecret: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        AWS_SECRET_ACCESS_KEY: 'real-secret-must-never-leak'
      }
    };
    expect(() => assertPlannedSecurity(leakedAwsSecret)).toThrow('real AWS_SECRET_ACCESS_KEY');
  });
});
