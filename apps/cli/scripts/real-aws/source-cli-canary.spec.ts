import { describe, expect, test } from 'bun:test';
import { probeMismatches } from './scoped-access-canary';
import { resolveCanaryOptions } from './source-cli-canary';

const PREFIX = 'STP_AWS_TEST_CANARY_';
const guarded = {
  [`${PREFIX}DEPLOY`]: '1',
  [`${PREFIX}EXPECTED_ACCOUNT_ID`]: '123456789012',
  [`${PREFIX}PROFILE`]: 'disposable',
  [`${PREFIX}OWNER`]: 'local-test-1',
  [`${PREFIX}STATE_FILE`]: '/tmp/state.json'
};
const resolve = (env: Record<string, string | undefined>) =>
  resolveCanaryOptions(env, { prefix: PREFIX, projectPrefix: 'v4testcanary-' });

describe('resolveCanaryOptions', () => {
  test('accepts an explicit, guarded run and generates a unique project name', () => {
    const options = resolve(guarded);
    expect(options).toMatchObject({ expectedAccountId: '123456789012', profile: 'disposable', region: 'eu-west-1' });
    expect(options.projectName).toMatch(/^v4testcanary-[a-z0-9]+-[0-9a-f]{4}$/);
    expect(resolve(guarded).projectName).not.toBe(options.projectName);
  });

  test.each([
    ['no opt-in', { [`${PREFIX}DEPLOY`]: undefined }, /explicit opt-in/],
    ['an endpoint override', { AWS_ENDPOINT_URL_S3: 'http://localhost:4566' }, /endpoint override/],
    ['a partial account id', { [`${PREFIX}EXPECTED_ACCOUNT_ID`]: '12345' }, /12-digit/],
    ['no profile', { [`${PREFIX}PROFILE`]: '' }, /PROFILE/],
    ['a foreign project name', { [`${PREFIX}PROJECT_NAME`]: 'production-api' }, /must start with v4testcanary-/],
    ['a bare project prefix', { [`${PREFIX}PROJECT_NAME`]: 'v4testcanary-' }, /must start with v4testcanary-/],
    ['no owner', { [`${PREFIX}OWNER`]: undefined }, /OWNER/],
    ['a relative state file', { [`${PREFIX}STATE_FILE`]: 'state.json' }, /absolute path/]
  ])('refuses %s', (_name, override, message) => {
    expect(() => resolve({ ...guarded, ...override })).toThrow(message);
  });
});

describe('probeMismatches', () => {
  const body = {
    variant: 'a',
    access: { tableA: 'allowed', tableB: 'denied', bucketA: 'allowed', bucketB: 'denied', queueA: 'allowed' },
    stpVariables: ['STP_BUCKET_A_NAME', 'STP_QUEUE_A_URL', 'STP_TABLE_A_NAME'],
    secretSha256: 'hash-a'
  };

  test('accepts the expected access, variables and secret', () => {
    expect(probeMismatches('a', 'hash-a', { status: 200, body })).toEqual([]);
  });

  test('reports access that was not revoked, a leaked variable and a stale secret', () => {
    const stale = {
      ...body,
      variant: 'b',
      access: { tableA: 'allowed', tableB: 'allowed', bucketA: 'denied', bucketB: 'allowed', queueA: 'denied' },
      stpVariables: ['STP_BUCKET_B_NAME', 'STP_TABLE_A_NAME', 'STP_TABLE_B_NAME']
    };
    expect(probeMismatches('b', 'hash-b', { status: 200, body: stale })).toEqual([
      'tableA allowed (expected denied)',
      'STP_TABLE_A_* present',
      'secret value'
    ]);
  });

  test('reports a failed request', () => {
    expect(probeMismatches('a', 'hash-a', { status: 502, body: null })).toEqual(['HTTP 502']);
  });
});
