import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { STSClient } from '@aws-sdk/client-sts';
import { describe, expect, spyOn, test } from 'bun:test';
import {
  assertCliVersionOutput,
  assertNoOpSnapshot,
  assertOwnedStack,
  assertUpdatedSnapshot,
  buildCanaryEnvironment,
  resolveCanaryOptions,
  runPackagingCanary
} from './packaging-canary';

const guardedProfileEnvironment = {
  STACKTAPE_API_KEY: 'test-value',
  STP_AWS_CANARY_DEPLOY: '1',
  STP_AWS_CANARY_CONFIRM_DISPOSABLE: 'this-is-a-disposable-test-account',
  STP_AWS_CANARY_EXPECTED_ACCOUNT_ID: '123456789012',
  STP_AWS_CANARY_CREDENTIAL_MODE: 'profile',
  STP_AWS_CANARY_PROFILE: 'development',
  STP_AWS_CANARY_OWNER: 'local-test-123',
  STP_AWS_CANARY_PROJECT_NAME: 'v4canary-test-123'
};

const functionSnapshot = (revision: string) => ({
  arn: 'arn:aws:lambda:eu-west-1:123456789012:function:v4canary-test-123-dev-retryAdvisor',
  codeSha256: 'code-hash',
  lastModified: '2026-08-01T00:00:00.000Z',
  revisionId: 'revision-id',
  url: 'https://abc.lambda-url.eu-west-1.on.aws/',
  layerArn: 'arn:aws:lambda:eu-west-1:123456789012:layer:shared:1',
  canaryRevision: revision
});

const awsSnapshot = (revision: string, lastUpdatedTime: string | null = null) => ({
  stackId: 'arn:aws:cloudformation:eu-west-1:123456789012:stack/v4canary-test-123-dev/id',
  lastUpdatedTime,
  functions: {
    catalogReport: {
      ...functionSnapshot(revision),
      arn: 'arn:aws:lambda:eu-west-1:123456789012:function:v4canary-test-123-dev-catalogReport'
    },
    retryAdvisor: functionSnapshot(revision)
  }
});

describe('real-AWS packaging canary guardrails', () => {
  test('an account mismatch cannot trigger cleanup or any resource lookup', async () => {
    const identity = spyOn(STSClient.prototype, 'send').mockImplementation(async () => ({ Account: '999999999999' }));
    const cloudFormation = spyOn(CloudFormationClient.prototype, 'send').mockImplementation(() => {
      throw new Error('Unexpected resource access');
    });
    const logs = spyOn(CloudWatchLogsClient.prototype, 'send').mockImplementation(() => {
      throw new Error('Unexpected log deletion');
    });
    try {
      await expect(runPackagingCanary({ env: guardedProfileEnvironment })).rejects.toThrow(
        'not explicitly allowed account'
      );
      expect(cloudFormation).not.toHaveBeenCalled();
      expect(logs).not.toHaveBeenCalled();
    } finally {
      identity.mockRestore();
      cloudFormation.mockRestore();
      logs.mockRestore();
    }
  });

  test('rejecting an existing stack does not enter cleanup, even if its owner matches', async () => {
    const identity = spyOn(STSClient.prototype, 'send').mockImplementation(async () => ({ Account: '123456789012' }));
    const cloudFormation = spyOn(CloudFormationClient.prototype, 'send')
      .mockImplementation(() => {
        throw new Error('Unexpected cleanup after preflight rejection');
      })
      .mockImplementationOnce(async () => ({
        Stacks: [{ Tags: [{ Key: 'stacktape-canary-owner', Value: guardedProfileEnvironment.STP_AWS_CANARY_OWNER }] }]
      }));
    const logs = spyOn(CloudWatchLogsClient.prototype, 'send').mockImplementation(() => {
      throw new Error('Unexpected log deletion');
    });
    try {
      await expect(runPackagingCanary({ env: guardedProfileEnvironment })).rejects.toThrow(
        'Refusing to mutate existing stack'
      );
      expect(cloudFormation).toHaveBeenCalledTimes(1);
      expect(logs).not.toHaveBeenCalled();
    } finally {
      identity.mockRestore();
      cloudFormation.mockRestore();
      logs.mockRestore();
    }
  });

  test('requires an explicit mutation opt-in, disposable-account phrase, account id, and API key', () => {
    expect(() => resolveCanaryOptions({ platform: 'linux', env: {} })).toThrow('explicit opt-in');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STP_AWS_CANARY_CONFIRM_DISPOSABLE: 'yes' }
      })
    ).toThrow('this-is-a-disposable-test-account');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STP_AWS_CANARY_EXPECTED_ACCOUNT_ID: '123' }
      })
    ).toThrow('12-digit');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STACKTAPE_API_KEY: undefined }
      })
    ).toThrow('STACKTAPE_API_KEY');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STP_AWS_CANARY_OWNER: undefined }
      })
    ).toThrow('identify this exact canary run');
  });

  test('supports Windows while refusing endpoint overrides, unsafe names, and implicit credentials', () => {
    expect(resolveCanaryOptions({ platform: 'win32', env: guardedProfileEnvironment }).projectName).toBe(
      'v4canary-test-123'
    );
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, AWS_ENDPOINT_URL_S3: 'http://localhost:4566' }
      })
    ).toThrow('endpoint override');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STP_AWS_CANARY_PROJECT_NAME: 'production' }
      })
    ).toThrow('must start with v4canary-');
    expect(() =>
      resolveCanaryOptions({
        platform: 'linux',
        env: { ...guardedProfileEnvironment, STP_AWS_CANARY_CREDENTIAL_MODE: undefined }
      })
    ).toThrow('explicitly set');
  });

  test('allows environment credentials only inside a GitHub Actions OIDC job', () => {
    const environmentMode = {
      ...guardedProfileEnvironment,
      STP_AWS_CANARY_CREDENTIAL_MODE: 'environment',
      STP_AWS_CANARY_PROFILE: undefined,
      AWS_ACCESS_KEY_ID: 'temporary-access',
      AWS_SECRET_ACCESS_KEY: 'temporary-secret'
    };
    expect(() => resolveCanaryOptions({ platform: 'linux', env: environmentMode })).toThrow('GitHub Actions OIDC');
    expect(
      resolveCanaryOptions({
        platform: 'linux',
        env: {
          ...environmentMode,
          GITHUB_ACTIONS: 'true',
          ACTIONS_ID_TOKEN_REQUEST_URL: 'https://actions.example.invalid/oidc'
        }
      }).credentials
    ).toEqual({ mode: 'environment' });
  });

  test('scrubs ambient credentials and endpoint overrides in profile mode', () => {
    const options = resolveCanaryOptions({ platform: 'linux', env: guardedProfileEnvironment });
    const env = buildCanaryEnvironment({
      options,
      revision: 'initial-test',
      invocationId: 'aws-canary-test',
      inheritedEnvironment: {
        STACKTAPE_API_KEY: 'test-value',
        AWS_ACCESS_KEY_ID: 'ambient-access',
        AWS_SECRET_ACCESS_KEY: 'ambient-secret',
        AWS_SESSION_TOKEN: 'ambient-session',
        AWS_ENDPOINT_URL: 'http://localhost:4566',
        AWS_ENDPOINT_URL_S3: 'http://localhost:4566'
      }
    });

    expect(env).toMatchObject({
      AWS_PROFILE: 'development',
      AWS_DEFAULT_PROFILE: 'development',
      AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
      STP_AWS_CANARY_REVISION: 'initial-test',
      STP_INVOCATION_ID: 'aws-canary-test'
    });
    expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(env.AWS_SESSION_TOKEN).toBeUndefined();
    expect(
      Object.keys(env).filter((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_'))
    ).toEqual([]);
  });

  test('requires an unchanged redeploy to preserve the complete AWS fingerprint', () => {
    const before = awsSnapshot('initial');
    expect(() => assertNoOpSnapshot(before, structuredClone(before))).not.toThrow();

    const changed = structuredClone(before);
    changed.functions.retryAdvisor.layerArn = changed.functions.retryAdvisor.layerArn.replace(':1', ':2');
    expect(() => assertNoOpSnapshot(before, changed)).toThrow('resource fingerprint');
  });

  test('requires exact binary versions and exact stack ownership', () => {
    expect(() => assertCliVersionOutput('Stacktape version: 4.0.0-preview.1.\n', '4.0.0-preview.1')).not.toThrow();
    expect(() => assertCliVersionOutput('Stacktape version: 4.0.0-preview.10.\n', '4.0.0-preview.1')).toThrow(
      'expected Stacktape version: 4.0.0-preview.1.'
    );

    const options = resolveCanaryOptions({ platform: 'linux', env: guardedProfileEnvironment });
    const stack = { Tags: [{ Key: 'stacktape-canary-owner', Value: options.owner }] };
    expect(() => assertOwnedStack(stack, options)).not.toThrow();
    expect(() =>
      assertOwnedStack({ Tags: [{ Key: 'stacktape-canary-owner', Value: 'another-run' }] }, options)
    ).toThrow('Refusing to mutate');
  });

  test('accepts only a narrow configuration update', () => {
    const before = awsSnapshot('initial');
    const after = awsSnapshot('updated', '2026-08-01T00:05:00.000Z');
    expect(() => assertUpdatedSnapshot(before, after, 'updated')).not.toThrow();

    const codeChanged = structuredClone(after);
    codeChanged.functions.catalogReport.codeSha256 = 'different-code';
    expect(() => assertUpdatedSnapshot(before, codeChanged, 'updated')).toThrow('code changed');
  });
});
