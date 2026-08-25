import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { QUALIFICATION_RUNNER_DOCKERFILE } from './sandbox-dockerfile';
import { processResultExitCode, validateAndHashOutputTree } from './run-sandboxed-qualification';
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
    expect(trailingArgs).toContain('--preset=smoke');
    expect(trailingArgs).toContain('--lanes=import,package');
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
    const resumeReportPath = join(resumeRoot, 'qualification-report.json');
    writeFileSync(
      resumeReportPath,
      `${JSON.stringify({
        schemaVersion: 2,
        runId: 'qualification-resume-fixture',
        generatedAt: '2026-08-25T00:00:00.000Z',
        productCommit: mockCommit,
        productFingerprint: 'c'.repeat(64),
        lanes: ['import'],
        environment: { platform: process.platform, architecture: process.arch, bun: '1.3.14', node: '24.0.0' },
        summary: { passed: 1, failed: 0, skipped: 0, durationMs: 1 },
        globalSteps: [],
        cases: [resumedResult]
      })}\n`
    );
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [
        '--manifest=apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json',
        `--resume-from=${resumeReportPath}`,
        '--lanes=import'
      ],
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

    expect(planned.innerCommandArgs).toContain('--manifest=/qualification/inputs/manifest-0.json');
    expect(planned.innerCommandArgs).toContain('--resume-from=/qualification/inputs/resume-report.json');
    expect(planned.expectedCaseIds).toEqual(['qualification-self-test-docker']);
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
    const workdir = join(root, 'workdirs', 'node-case');
    mkdirSync(join(workdir, 'packages', 'target'), { recursive: true });
    writeFileSync(join(workdir, 'packages', 'target', 'package.json'), '{}\n');
    mkdirSync(join(workdir, 'node_modules'));
    symlinkSync('../packages/target', join(workdir, 'node_modules', 'target'), 'dir');
    const accepted = await validateAndHashOutputTree(root, true);
    const containedLink = accepted.find((entry) => entry.path === 'workdirs/node-case/node_modules/target');
    expect(containedLink?.type).toBe('symlink');
    expect(containedLink?.linkTarget?.replaceAll('\\', '/')).toBe('../packages/target');

    const outside = join(dirname(root), `${basename(root)}-escape`);
    mkdirSync(outside);
    temporaryDirectories.push(outside);
    symlinkSync(outside, join(workdir, 'node_modules', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(validateAndHashOutputTree(root, true)).rejects.toThrow(/absolute link|escaping link/);
  });
});

describe('sandboxed qualification resource & lane validation', () => {
  test('prioritizes timeout and interruption over a misleading zero exit code', () => {
    expect(processResultExitCode({ exitCode: 0, timedOut: true })).toBe(124);
    expect(processResultExitCode({ exitCode: 0, timedOut: false, interruptedSignal: 'SIGINT' })).toBe(130);
    expect(processResultExitCode({ exitCode: 0, timedOut: false })).toBe(0);
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
