import { describe, expect, test } from 'bun:test';
import type { WizardVerification } from '../../src/init/server/wizard-server';
import { INIT_CANARY_FIXTURES } from './init-canary-fixtures';
import {
  assertCanaryHealthUrl,
  buildWizardEnvironment,
  evaluateFixturePreflight,
  parseInitCanaryState,
  resolveInitCanaryOptions,
  waitForWizardDeployment,
  type InitCanaryState
} from './init-canary';

const guardedEnvironment = {
  STACKTAPE_API_KEY: 'test-value',
  STP_AWS_CANARY_DEPLOY: '1',
  STP_AWS_CANARY_CONFIRM_DISPOSABLE: 'this-is-a-disposable-test-account',
  STP_AWS_CANARY_EXPECTED_ACCOUNT_ID: '123456789012',
  STP_AWS_CANARY_CREDENTIAL_MODE: 'profile',
  STP_AWS_CANARY_PROFILE: 'development',
  STP_AWS_CANARY_OWNER: 'local-init-test-123',
  STP_AWS_CANARY_PROJECT_NAME: 'v4canary-init-test-123',
  STP_AWS_CANARY_STATE_FILE: 'C:\\tmp\\stacktape-init-canary.json',
  STP_INIT_CANARY_AWS_ACCOUNT: 'disposable-account',
  STP_INIT_CANARY_FIXTURE: 'express-basic'
};

const options = () => resolveInitCanaryOptions({ platform: 'linux', env: guardedEnvironment });

const state = (): InitCanaryState => ({
  kind: 'stacktape-init-canary',
  version: 1,
  accountId: '123456789012',
  owner: 'local-init-test-123',
  fixtureId: 'express-basic',
  projectName: 'v4canary-init-test-123',
  stackName: 'v4canary-init-test-123-dev',
  region: 'eu-west-1',
  stage: 'dev',
  invocationId: 'init-canary-test',
  startedAt: '2026-08-17T00:00:00.000Z',
  generatedSecrets: [],
  logGroupsAbsentBefore: true
});

const observations = {
  listeningPorts: [],
  dialedDependency: false,
  missingEnvironmentVariables: [],
  logTail: []
};

describe('real-AWS init canary guardrails', () => {
  test('requires a versioned fixture and an external recovery state file', () => {
    expect(() =>
      resolveInitCanaryOptions({
        platform: 'linux',
        env: { ...guardedEnvironment, STP_AWS_CANARY_STATE_FILE: undefined }
      })
    ).toThrow('STATE_FILE is required');
    expect(() =>
      resolveInitCanaryOptions({
        platform: 'linux',
        env: { ...guardedEnvironment, STP_INIT_CANARY_FIXTURE: 'unknown' }
      })
    ).toThrow('must be one of');
    expect(() =>
      resolveInitCanaryOptions({
        platform: 'linux',
        env: { ...guardedEnvironment, STP_INIT_CANARY_AWS_ACCOUNT: undefined }
      })
    ).toThrow('must name the exact');
  });

  test('keeps files-only and agent-assisted runs explicit', () => {
    expect(options()).toMatchObject({
      fixtureId: 'express-basic',
      codingAgent: 'none',
      modelId: 'default',
      awsAccount: 'disposable-account'
    });
    expect(() =>
      resolveInitCanaryOptions({
        platform: 'linux',
        env: { ...guardedEnvironment, STP_INIT_CANARY_MODEL_ID: 'opus' }
      })
    ).toThrow('must be default in files-only mode');
    expect(
      resolveInitCanaryOptions({
        platform: 'linux',
        env: {
          ...guardedEnvironment,
          STP_INIT_CANARY_CODING_AGENT: 'claude-code',
          STP_INIT_CANARY_MODEL_ID: 'opus'
        }
      })
    ).toMatchObject({ codingAgent: 'claude-code', modelId: 'opus' });
  });

  test('forces only the canary child into browser presentation', () => {
    expect(
      buildWizardEnvironment(
        { CI: 'true', GITHUB_ACTIONS: 'true', BUILDKITE: 'true', AWS_ACCESS_KEY_ID: 'temporary' },
        'linux'
      )
    ).toEqual({ AWS_ACCESS_KEY_ID: 'temporary', DISPLAY: 'stacktape-init-canary' });
  });

  test('binds recovery state to the exact run, stack, account, and fixture', () => {
    expect(parseInitCanaryState(state(), options())).toEqual(state());
    expect(() => parseInitCanaryState({ ...state(), stackName: 'production-dev' }, options())).toThrow('another stack');
    expect(() => parseInitCanaryState({ ...state(), accountId: '999999999999' }, options())).toThrow(
      'another AWS account'
    );
    expect(() => parseInitCanaryState({ ...state(), fixtureId: 'vite-static' }, options())).toThrow('another fixture');
  });

  test('never counts skipped or inconclusive required preflight as a pass', () => {
    const required = INIT_CANARY_FIXTURES['express-basic'];
    const skipped: WizardVerification = {
      status: 'completed',
      services: [
        {
          serviceName: 'api',
          resourceName: 'api',
          status: 'skipped',
          reason: 'Unsupported packaging.',
          observations
        }
      ]
    };
    expect(evaluateFixturePreflight({ fixture: required, verification: skipped })[0]).toContain('was skipped');
    expect(
      evaluateFixturePreflight({
        fixture: required,
        verification: { ...skipped, services: [{ ...skipped.services![0]!, status: 'passed' }] }
      })
    ).toEqual([]);
    expect(
      evaluateFixturePreflight({ fixture: INIT_CANARY_FIXTURES['vite-static'], verification: { status: 'completed' } })
    ).toEqual([]);
  });

  test('treats the deploy POST as an acknowledgement and polls to a terminal result', async () => {
    const started = {
      phase: 'reviewing' as const,
      projectName: 'v4canary-init-test-123',
      timeline: [],
      answers: {},
      deployment: {
        status: 'running' as const,
        stage: 'dev',
        region: 'eu-west-1',
        commandLine: 'stacktape deploy',
        events: [],
        lines: []
      }
    };
    const finished = {
      ...started,
      deployment: {
        ...started.deployment,
        status: 'succeeded' as const,
        outcome: { ok: true, code: 'OK', message: 'ok' }
      }
    };
    let waits = 0;
    const client = {
      getState: async () => finished,
      post: async () => started,
      waitForState: async ({ accept }: { accept: (candidate: typeof finished) => boolean }) => {
        waits += 1;
        expect(accept(finished)).toBeTrue();
        return finished;
      }
    };

    expect(await waitForWizardDeployment({ client, started, timeoutMs: 1_000 })).toEqual(finished);
    expect(waits).toBe(1);
    expect(await waitForWizardDeployment({ client, started: finished, timeoutMs: 1_000 })).toEqual(finished);
    expect(waits).toBe(1);
  });

  test('calls only HTTPS URLs from expected deployed-service domains', () => {
    expect(assertCanaryHealthUrl('https://api-abcd.stacktape-app.com/').hostname).toBe('api-abcd.stacktape-app.com');
    expect(() => assertCanaryHealthUrl('http://api-abcd.stacktape-app.com/')).toThrow('HTTPS');
    expect(() => assertCanaryHealthUrl('https://127.0.0.1/')).toThrow('unexpected canary URL host');
    expect(() => assertCanaryHealthUrl('https://example.com/')).toThrow('unexpected canary URL host');
  });
});
