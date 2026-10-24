import { describe, expect, test } from 'bun:test';
import { containerHostPort, databaseContainerName, findOwnedContainers, resolveOptions } from './dev-mode-canary';

const valid = {
  STP_AWS_DEV_CANARY_DEPLOY: '1',
  STP_AWS_DEV_CANARY_EXPECTED_ACCOUNT_ID: '123456789012',
  STP_AWS_DEV_CANARY_PROFILE: 'dev-profile',
  STP_AWS_DEV_CANARY_OWNER: 'local-run-1',
  STP_AWS_DEV_CANARY_STATE_FILE: '/tmp/dev-canary-state.json',
  STP_AWS_DEV_CANARY_PROJECT_NAME: 'v4devcanary-abc-1f2e'
};

describe.skipIf(process.platform !== 'linux')('dev-mode canary options', () => {
  test('a complete opt-in resolves to the project, a stage derived from it and every scenario', () => {
    const options = resolveOptions(valid);
    expect(options.projectName).toBe('v4devcanary-abc-1f2e');
    // Local container names include the stage, so a run never shares containers with another run.
    expect(options.stage).toBe('c1f2e');
    expect(options.region).toBe('eu-west-1');
    expect(options.scenarios[0]).toBe('first-run-agent');
  });

  test.each([
    ['no opt-in', { STP_AWS_DEV_CANARY_DEPLOY: undefined }, 'explicit opt-in'],
    ['an endpoint override', { AWS_ENDPOINT_URL: 'http://127.0.0.1:4566' }, 'endpoint override'],
    ['a partial account id', { STP_AWS_DEV_CANARY_EXPECTED_ACCOUNT_ID: '12345' }, '12-digit'],
    ['a profile with spaces', { STP_AWS_DEV_CANARY_PROFILE: 'my profile' }, 'PROFILE'],
    ['a foreign project prefix', { STP_AWS_DEV_CANARY_PROJECT_NAME: 'customer-app' }, 'v4devcanary-'],
    ['a relative state file', { STP_AWS_DEV_CANARY_STATE_FILE: 'state.json' }, 'absolute path'],
    ['an unknown scenario', { STP_AWS_DEV_CANARY_SCENARIOS: 'first-run-agent,deploy-prod' }, 'unknown scenario']
  ])('refuses %s before touching AWS', (_name, override, message) => {
    expect(() => resolveOptions({ ...valid, ...override })).toThrow(message);
  });
});

describe('dev-mode canary container discovery', () => {
  const run = { projectName: 'v4devcanary-abc-1f2e', stage: 'c1f2e' };
  const state = { workDirectory: '/tmp/stacktape-dev-canary-run' };
  const ownedDatabase = JSON.stringify([
    { Name: `/${databaseContainerName(run, state)}`, State: { Status: 'running' }, Mounts: [] },
    { Name: '/someone-else', State: { Status: 'running' }, Mounts: [{ Source: '/home/other' }] },
    {
      Name: '/mounted',
      State: { Status: 'exited' },
      Mounts: [{ Source: '/tmp/stacktape-dev-canary-run/project/data' }]
    }
  ]);

  test("finds the run's containers by name and by mounts from its project", () => {
    const docker = (args: string[]) =>
      args[0] === 'ps' ? { exitCode: 0, stdout: 'a\nb\nc' } : { exitCode: 0, stdout: ownedDatabase };
    expect(findOwnedContainers(run, state, docker)).toEqual([
      { name: databaseContainerName(run, state), status: 'running' },
      { name: 'mounted', status: 'exited' }
    ]);
  });

  test.each([
    [
      'docker ps fails',
      (args: string[]) => (args[0] === 'ps' ? { exitCode: 1, stdout: '' } : { exitCode: 0, stdout: '[]' })
    ],
    [
      'docker inspect keeps failing',
      (args: string[]) => (args[0] === 'ps' ? { exitCode: 0, stdout: 'a' } : { exitCode: 1, stdout: '' })
    ]
  ])('treats an unknown container state as a failure when %s', (_name, docker) => {
    expect(() => findOwnedContainers(run, state, docker)).toThrow('container state is unknown');
  });
});

describe('dev-mode canary container host port', () => {
  // `inspect` answers "<running> <network mode> <PORT>"; `port` answers the published mapping.
  const docker =
    (inspect: { exitCode: number; stdout: string }, port = { exitCode: 0, stdout: '127.0.0.1:3001\n[::1]:3001' }) =>
    (args: string[]) =>
      args[0] === 'inspect' ? inspect : port;

  test.each([
    ['a published port (Docker Desktop)', docker({ exitCode: 0, stdout: 'true bridge 3000' }), 3001],
    ['the host network (native Linux), which serves on PORT', docker({ exitCode: 0, stdout: 'true host 3002' }), 3002],
    ['a container that is not running yet', docker({ exitCode: 0, stdout: 'false bridge 3000' }), undefined],
    ['a container that does not exist yet', docker({ exitCode: 1, stdout: '' }), undefined],
    [
      'a bridge container without a published port',
      docker({ exitCode: 0, stdout: 'true bridge 3000' }, { exitCode: 1, stdout: '' }),
      undefined
    ]
  ])('reads %s', (_name, run, expected) => {
    expect(containerHostPort('api', 3000, run)).toBe(expected);
  });
});
