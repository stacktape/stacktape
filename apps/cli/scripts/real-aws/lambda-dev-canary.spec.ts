import { expect, test } from 'bun:test';
import { resolveLambdaDevOptions, validateLambdaDevRecoveryState } from './lambda-dev-canary';

const valid = {
  STP_AWS_LAMBDA_DEV_DEPLOY: '1',
  STP_AWS_LAMBDA_DEV_CONFIRM_DISPOSABLE: 'this-is-a-disposable-test-account',
  STP_AWS_LAMBDA_DEV_PROFILE: 'stacktape-e2e',
  STP_AWS_LAMBDA_DEV_EXPECTED_ACCOUNT_ID: '123456789012',
  STP_AWS_LAMBDA_DEV_STATE_FILE: '/tmp/lambda-dev-state.json',
  STP_AWS_LAMBDA_DEV_OWNER: 'unique-run'
};

test.skipIf(process.platform !== 'linux')(
  'the Lambda dev canary requires the exact disposable-account and recovery opt-in',
  () => {
    expect(resolveLambdaDevOptions(valid)).toMatchObject({
      accountId: '123456789012',
      profile: 'stacktape-e2e',
      region: 'eu-west-1'
    });
    expect(resolveLambdaDevOptions({ ...valid, STP_AWS_LAMBDA_DEV_REGION: 'eu-north-1' }).region).toBe('eu-north-1');
    expect(
      resolveLambdaDevOptions({
        ...valid,
        STP_AWS_LAMBDA_DEV_REGION: 'eu-central-1',
        STP_AWS_LAMBDA_DEV_NETWORK_SUFFIX: 'r2b'
      })
    ).toMatchObject({ region: 'eu-central-1', networkSuffix: 'r2b' });
    for (const override of [
      { STP_AWS_LAMBDA_DEV_REGION: 'eu-north-1; rm -rf /' },
      { STP_AWS_LAMBDA_DEV_DEPLOY: undefined },
      { STP_AWS_LAMBDA_DEV_CONFIRM_DISPOSABLE: undefined },
      { STP_AWS_LAMBDA_DEV_PROFILE: 'stacktape-dev' },
      { STP_AWS_LAMBDA_DEV_EXPECTED_ACCOUNT_ID: '12345' },
      { STP_AWS_LAMBDA_DEV_STATE_FILE: 'relative.json' },
      { STP_AWS_LAMBDA_DEV_OWNER: '../unsafe' },
      { STP_AWS_LAMBDA_DEV_REPORT: 'relative-report.json' },
      { AWS_ENDPOINT_URL_LAMBDA: 'http://127.0.0.1:4566' },
      { STP_AWS_LAMBDA_DEV_NETWORK_SUFFIX: '../other' }
    ])
      expect(() => resolveLambdaDevOptions({ ...valid, ...override })).toThrow();
  }
);

test.skipIf(process.platform !== 'linux')(
  'recovery refuses foreign identities, unsafe directories and malformed creation state',
  () => {
    const options = resolveLambdaDevOptions(valid);
    const state = {
      accountId: options.accountId,
      owner: options.owner,
      region: options.region,
      projectName: 'v4lambdadev-1234abcd',
      networkSuffix: '1234abcd',
      directory: '/tmp/stacktape-lambda-dev-Ab1234',
      boxInstanceId: 'i-0123456789abcdef0',
      createAttempted: true
    };
    expect(validateLambdaDevRecoveryState(state, options)).toMatchObject(state);
    // A run that named its network keeps that name in its recovery state.
    const named = resolveLambdaDevOptions({ ...valid, STP_AWS_LAMBDA_DEV_NETWORK_SUFFIX: 'r2b' });
    expect(validateLambdaDevRecoveryState({ ...state, networkSuffix: 'r2b' }, named)).toMatchObject({
      networkSuffix: 'r2b'
    });
    expect(() => validateLambdaDevRecoveryState(state, named)).toThrow();
    for (const override of [
      { accountId: '999999999999' },
      { owner: 'other-run' },
      { region: 'us-east-1' },
      { projectName: 'v4lambdadev-ffffffff' },
      { networkSuffix: '../other' },
      { directory: '/tmp/stacktape-lambda-dev-owned/../../unrelated' },
      { directory: '/' },
      { boxInstanceId: 'i-unrelated; rm' },
      { createAttempted: 'true' }
    ])
      expect(() => validateLambdaDevRecoveryState({ ...state, ...override }, options)).toThrow();
  }
);
