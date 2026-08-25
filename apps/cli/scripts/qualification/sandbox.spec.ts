import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  assertPlannedSecurity,
  BLOCKED_HOST_GATEWAYS,
  buildRunnerImageTag,
  parseSandboxedOptions,
  planSandboxExecution,
  type PlannedSandboxExecution
} from './sandbox-planning';

const mockRoot = resolve(import.meta.dir, '..', '..', '..', '..');
const mockCommit = 'c93aa3368da23061f7c0cbf1c379d935681f6beb';

describe('sandboxed qualification planning', () => {
  test('generates commit-keyed image tag', () => {
    const tag = buildRunnerImageTag(mockCommit);
    expect(tag).toBe('stacktape-qualification-runner:c93aa3368da2');
  });

  test('translates explicit mounts and inner CLI arguments without exposing host paths or sockets', () => {
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: [
        '--preset=smoke',
        '--lanes=import,package',
        '--output-dir=./custom-output',
        '--cache-root=./custom-cache',
        '--shard=1/4',
        '--max-cases=5',
        '--fail-fast',
        '--keep-workdirs',
        '--memory=12g',
        '--cpus=6'
      ],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      hostHomeDirectory: 'C:\\Users\\mockuser',
      runIdSuffix: 'test1234'
    });

    expect(planned.imageTag).toBe('stacktape-qualification-runner:c93aa3368da2');
    expect(planned.networkName).toBe('stp-qual-net-test1234');
    expect(planned.dindContainerName).toBe('stp-qual-dind-test1234');
    expect(planned.runnerContainerName).toBe('stp-qual-runner-test1234');

    expect(planned.environment.DOCKER_HOST).toBe('tcp://stp-qual-dind-test1234:2375');
    expect(planned.environment.STACKTAPE_QUALIFICATION_SANDBOX).toBe('1');
    expect(planned.environment.AWS_ACCESS_KEY_ID).toBe('offline-qualification');
    expect(planned.environment.AWS_SECRET_ACCESS_KEY).toBe('offline-qualification');
    expect(planned.environment.STACKTAPE_API_KEY).toBe('offline-qualification-do-not-use');

    expect(planned.mounts).toHaveLength(2);
    expect(planned.mounts[0]).toMatchObject({
      containerPath: '/qualification/output',
      mode: 'rw',
      label: 'qualification-output'
    });
    expect(planned.mounts[1]).toMatchObject({
      containerPath: '/qualification/cache',
      mode: 'rw',
      label: 'qualification-cache'
    });

    expect(planned.innerCommandArgs).toContain('--output-dir=/qualification/output');
    expect(planned.innerCommandArgs).toContain('--cache-root=/qualification/cache');
    expect(planned.innerCommandArgs).toContain('--preset=smoke');
    expect(planned.innerCommandArgs).toContain('--lanes=import,package');
    expect(planned.innerCommandArgs).toContain('--shard=1/4');
    expect(planned.innerCommandArgs).toContain('--max-cases=5');
    expect(planned.innerCommandArgs).toContain('--fail-fast');
    expect(planned.innerCommandArgs).toContain('--keep-workdirs');

    expect(planned.runnerArgs).toContain('--network');
    expect(planned.runnerArgs).toContain('stp-qual-net-test1234');
    expect(planned.runnerArgs).toContain('--memory');
    expect(planned.runnerArgs).toContain('12g');
    expect(planned.runnerArgs).toContain('--cpus');
    expect(planned.runnerArgs).toContain('6');

    for (const host of BLOCKED_HOST_GATEWAYS) {
      expect(planned.runnerArgs).toContain(host);
    }

    expect(planned.dindArgs).toContain('--privileged');
    expect(planned.dindArgs).toContain('--host=tcp://0.0.0.0:2375');
  });

  test('mounts external manifest directory read-only and maps container manifest path', () => {
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: ['--manifest=./custom/my-manifest.json', '--lanes=import'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      hostHomeDirectory: 'C:\\Users\\mockuser',
      runIdSuffix: 'manifesttest'
    });

    const manifestMount = planned.mounts.find((m) => m.label === 'manifest-0');
    expect(manifestMount).toBeDefined();
    expect(manifestMount?.mode).toBe('ro');
    expect(manifestMount?.containerPath).toBe('/qualification/manifests/0');
    expect(planned.innerCommandArgs).toContain('--manifest=/qualification/manifests/0/my-manifest.json');
  });

  test('mounts resume report directory read-only and maps container resume path', () => {
    const planned = planSandboxExecution({
      productCommit: mockCommit,
      rawArgs: ['--resume-from=./previous/qualification-report.json', '--lanes=import'],
      invocationDirectory: mockRoot,
      rootDirectory: mockRoot,
      hostHomeDirectory: 'C:\\Users\\mockuser',
      runIdSuffix: 'resumetest'
    });

    const resumeMount = planned.mounts.find((m) => m.label === 'resume-report');
    expect(resumeMount).toBeDefined();
    expect(resumeMount?.mode).toBe('ro');
    expect(resumeMount?.containerPath).toBe('/qualification/resume');
    expect(planned.innerCommandArgs).toContain('--resume-from=/qualification/resume/qualification-report.json');
  });
});

describe('sandboxed qualification security boundary enforcement', () => {
  const validPlanned: PlannedSandboxExecution = {
    runId: 'qualification-test',
    networkName: 'stp-qual-net-test',
    dindContainerName: 'stp-qual-dind-test',
    runnerContainerName: 'stp-qual-runner-test',
    imageTag: 'stacktape-qualification-runner:c93aa3368da2',
    productCommit: mockCommit,
    dindArgs: ['run', '-d', 'docker:27-dind'],
    runnerArgs: ['run', 'runner'],
    innerCommandArgs: ['--output-dir=/qualification/output'],
    mounts: [
      { hostPath: 'C:\\output', containerPath: '/qualification/output', mode: 'rw', label: 'output' },
      { hostPath: 'C:\\cache', containerPath: '/qualification/cache', mode: 'rw', label: 'cache' }
    ],
    environment: {
      DOCKER_HOST: 'tcp://stp-qual-dind-test:2375',
      STACKTAPE_QUALIFICATION_SANDBOX: '1',
      AWS_ACCESS_KEY_ID: 'offline-qualification',
      AWS_SECRET_ACCESS_KEY: 'offline-qualification',
      STACKTAPE_API_KEY: 'offline-qualification-do-not-use'
    },
    hostOverrides: BLOCKED_HOST_GATEWAYS,
    outputDirectory: 'C:\\output',
    cacheRoot: 'C:\\cache',
    manifests: [],
    resourceLimits: { memory: '8g', cpus: '4', pidsLimit: 2048, timeoutMs: 7200000 }
  };

  test('passes valid planned configuration', () => {
    expect(() => assertPlannedSecurity(validPlanned, 'C:\\Users\\mockuser')).not.toThrow();
  });

  test('fails closed if host Docker socket is mounted', () => {
    const taintedSocketMount: PlannedSandboxExecution = {
      ...validPlanned,
      mounts: [
        ...validPlanned.mounts,
        {
          hostPath: '/var/run/docker.sock',
          containerPath: '/var/run/docker.sock',
          mode: 'rw',
          label: 'socket'
        }
      ]
    };
    expect(() => assertPlannedSecurity(taintedSocketMount, 'C:\\Users\\mockuser')).toThrow('host Docker socket');
  });

  test('fails closed if host user home or system root is mounted', () => {
    const taintedHomeMount: PlannedSandboxExecution = {
      ...validPlanned,
      mounts: [
        ...validPlanned.mounts,
        {
          hostPath: 'C:\\Users\\mockuser',
          containerPath: '/qualification/home',
          mode: 'ro',
          label: 'home'
        }
      ]
    };
    expect(() => assertPlannedSecurity(taintedHomeMount, 'C:\\Users\\mockuser')).toThrow('user home directory');

    const taintedRootMount: PlannedSandboxExecution = {
      ...validPlanned,
      mounts: [
        ...validPlanned.mounts,
        {
          hostPath: 'C:\\',
          containerPath: '/qualification/root',
          mode: 'ro',
          label: 'root'
        }
      ]
    };
    expect(() => assertPlannedSecurity(taintedRootMount, 'C:\\Users\\mockuser')).toThrow('system root');
  });

  test('fails closed if DOCKER_HOST does not route via TCP to DinD', () => {
    const taintedDockerHost: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        DOCKER_HOST: 'unix:///var/run/docker.sock'
      }
    };
    expect(() => assertPlannedSecurity(taintedDockerHost, 'C:\\Users\\mockuser')).toThrow('DOCKER_HOST');
  });

  test('fails closed if STACKTAPE_QUALIFICATION_SANDBOX is missing or not 1', () => {
    const missingSandboxFlag: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        STACKTAPE_QUALIFICATION_SANDBOX: '0'
      }
    };
    expect(() => assertPlannedSecurity(missingSandboxFlag, 'C:\\Users\\mockuser')).toThrow(
      'STACKTAPE_QUALIFICATION_SANDBOX'
    );
  });

  test('fails closed if real credentials leak into environment', () => {
    const leakedAwsSecret: PlannedSandboxExecution = {
      ...validPlanned,
      environment: {
        ...validPlanned.environment,
        AWS_SECRET_ACCESS_KEY: 'real-secret-must-never-leak'
      }
    };
    expect(() => assertPlannedSecurity(leakedAwsSecret, 'C:\\Users\\mockuser')).toThrow('real AWS_SECRET_ACCESS_KEY');
  });

  test('fails closed if empty commit is provided to planning', () => {
    expect(() =>
      planSandboxExecution({
        productCommit: '',
        rawArgs: ['--lanes=import'],
        rootDirectory: mockRoot
      })
    ).toThrow('Product commit is required');
  });

  test('parses dry-run, help, list, and self-test options without throwing', () => {
    const dryRunParsed = parseSandboxedOptions(['--dry-run', '--preset=smoke', '--lanes=import,package']);
    expect(dryRunParsed.dryRun).toBeTrue();
    expect(dryRunParsed.preset).toBe('smoke');
    expect(dryRunParsed.lanes).toBe('import,package');

    const helpParsed = parseSandboxedOptions(['--help']);
    expect(helpParsed.help).toBeTrue();

    const listParsed = parseSandboxedOptions(['--list']);
    expect(listParsed.list).toBeTrue();

    const selfTestParsed = parseSandboxedOptions(['--self-test']);
    expect(selfTestParsed.selfTest).toBeTrue();
  });
});
