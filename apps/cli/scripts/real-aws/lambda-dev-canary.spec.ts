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
    for (const override of [
      { STP_AWS_LAMBDA_DEV_DEPLOY: undefined },
      { STP_AWS_LAMBDA_DEV_CONFIRM_DISPOSABLE: undefined },
      { STP_AWS_LAMBDA_DEV_PROFILE: 'stacktape-dev' },
      { STP_AWS_LAMBDA_DEV_EXPECTED_ACCOUNT_ID: '12345' },
      { STP_AWS_LAMBDA_DEV_STATE_FILE: 'relative.json' },
      { STP_AWS_LAMBDA_DEV_OWNER: '../unsafe' },
      { AWS_ENDPOINT_URL_LAMBDA: 'http://127.0.0.1:4566' }
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
      name: 'v4lambdadev-unique-run-1234abcd',
      container: 'v4lambdadev-unique-run-1234abcd',
      directory: '/tmp/stacktape-lambda-dev-Ab1234',
      roleAttempted: true,
      functionAttempted: true,
      containerAttempted: true
    };
    expect(validateLambdaDevRecoveryState(state, options)).toMatchObject(state);
    for (const override of [
      { accountId: '999999999999' },
      { owner: 'other-run' },
      { region: 'us-east-1' },
      { name: 'v4lambdadev-other-run-1234abcd' },
      { container: 'unrelated' },
      { directory: '/tmp/stacktape-lambda-dev-owned/../../unrelated' },
      { directory: '/' },
      { roleAttempted: 'true' },
      { functionAttempted: undefined },
      { containerAttempted: 1 }
    ])
      expect(() => validateLambdaDevRecoveryState({ ...state, ...override }, options)).toThrow();
  }
);
