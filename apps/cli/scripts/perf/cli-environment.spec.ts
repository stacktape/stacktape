import { describe, expect, test } from 'bun:test';
import { delimiter, join } from 'node:path';
import { EXTRA_ENVIRONMENT_KEYS, getCliEnvironment, INERT_AWS_CREDENTIALS } from './cli-environment';
import { NETWORK_SANDBOX_ENV, SANDBOX_MASKS_ENV } from './network-sandbox';

const base = {
  home: '/owned/home',
  path: ['/owned/tools', '/owned/path-without-docker'],
  serviceUrl: 'http://127.0.0.1:4000',
  proxyUrl: 'http://127.0.0.1:4001'
};

describe('getCliEnvironment', () => {
  test('gives an existing caller exactly the environment it had before the allowlist', () => {
    expect(getCliEnvironment({ ...base, extra: { DOCKER_CONFIG: '/owned/docker-config' } })).toEqual({
      HOME: '/owned/home',
      // The bytecode qualification runs this environment on Windows too, where PATH is `;`-separated.
      PATH: base.path.join(delimiter),
      LANG: 'C.UTF-8',
      ...INERT_AWS_CREDENTIALS,
      AWS_CONFIG_FILE: join('/owned/home', 'no-aws-config'),
      AWS_SHARED_CREDENTIALS_FILE: join('/owned/home', 'no-aws-credentials'),
      AWS_EC2_METADATA_DISABLED: 'true',
      AWS_ENDPOINT_URL: 'http://127.0.0.1:4000',
      POSTHOG_HOST: 'http://127.0.0.1:4000',
      HTTPS_PROXY: 'http://127.0.0.1:4001',
      HTTP_PROXY: 'http://127.0.0.1:4001',
      https_proxy: 'http://127.0.0.1:4001',
      http_proxy: 'http://127.0.0.1:4001',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
      DOCKER_CONFIG: '/owned/docker-config'
    });
  });

  test('adds CI and owned package-manager locations without touching anything protected', () => {
    const extra = {
      CI: '1',
      npm_config_cache: '/owned/npm-cache',
      XDG_CACHE_HOME: '/owned/cache',
      XDG_CONFIG_HOME: '/owned/config',
      XDG_DATA_HOME: '/owned/data',
      XDG_STATE_HOME: '/owned/state',
      PNPM_HOME: '/owned/pnpm-home'
    };
    const environment = getCliEnvironment({ ...base, extra });
    expect(environment).toMatchObject({ ...extra, HOME: '/owned/home', HTTPS_PROXY: 'http://127.0.0.1:4001' });
    expect(Object.keys(extra).every((key) => (EXTRA_ENVIRONMENT_KEYS as readonly string[]).includes(key))).toBe(true);
  });

  test.each([
    'HOME',
    'PATH',
    'LANG',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'AWS_PROFILE',
    'AWS_CONFIG_FILE',
    'AWS_SHARED_CREDENTIALS_FILE',
    'AWS_ENDPOINT_URL',
    'AWS_EC2_METADATA_DISABLED',
    'POSTHOG_HOST',
    'HTTPS_PROXY',
    'https_proxy',
    'HTTP_PROXY',
    'NO_PROXY',
    'no_proxy',
    'STP_TIMINGS_FILE',
    NETWORK_SANDBOX_ENV,
    SANDBOX_MASKS_ENV,
    'npm_config_registry',
    'NODE_OPTIONS'
  ])('refuses the extra key %s', (key) => {
    expect(() => getCliEnvironment({ ...base, extra: { [key]: 'replaced' } })).toThrow(
      `The measured environment does not accept the extra key ${key}.`
    );
  });

  test('refuses an empty value for an allowed key', () => {
    expect(() => getCliEnvironment({ ...base, extra: { CI: '' } })).toThrow('needs a non-empty string value');
  });
});
