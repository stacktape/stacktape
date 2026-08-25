import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { QUALIFICATION_RUNNER_DOCKERFILE } from './sandbox-dockerfile';
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

describe('sandboxed qualification planning & command composition', () => {
  test('generates commit-keyed image tag', () => {
    const tag = buildRunnerImageTag(mockCommit);
    expect(tag).toBe('stacktape-qualification-runner:9e04530f68c4');
  });

  test('configures Dockerfile ENTRYPOINT to the runner script and planned runner command passes only flags', () => {
    expect(QUALIFICATION_RUNNER_DOCKERFILE).toContain(
      'ENTRYPOINT ["bun", "apps/cli/scripts/qualification/run-project-qualification.ts"]'
    );

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
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [
        '--manifest=apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json',
        '--resume-from=apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json',
        '--lanes=import'
      ],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      runIdSuffix: 'stagetest'
    });

    expect(planned.stagedInputs).toHaveLength(3);
    expect(planned.stagedInputs[0].containerRelativePath).toBe(
      'inputs/manifest-0-source-0-qualification-self-test-docker'
    );
    expect(planned.stagedInputs[0].hostPath).toBe(
      resolve(mockRoot, 'apps/cli/scripts/qualification/fixtures/self-test-docker-project')
    );
    expect(planned.stagedInputs[1].containerRelativePath).toBe('inputs/manifest-0.json');
    expect(planned.stagedInputs[1].content).toContain('"path": "manifest-0-source-0-qualification-self-test-docker"');
    expect(planned.stagedInputs[2].containerRelativePath).toBe('inputs/resume-report.json');

    expect(planned.innerCommandArgs).toContain('--manifest=/qualification/inputs/manifest-0.json');
    expect(planned.innerCommandArgs).toContain('--resume-from=/qualification/inputs/resume-report.json');
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
});

describe('sandboxed qualification resource & lane validation', () => {
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
