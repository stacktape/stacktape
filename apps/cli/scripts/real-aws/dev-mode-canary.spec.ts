import { describe, expect, test } from 'bun:test';
import { resolveOptions } from './dev-mode-canary';

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
