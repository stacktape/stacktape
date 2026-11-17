import { describe, expect, test } from 'bun:test';
import { isCiEnvironment, toAccountFreeTelemetryProperties } from './telemetry-allowlist';

describe('toAccountFreeTelemetryProperties', () => {
  test('keeps only the allowlisted fields', () => {
    expect(
      toAccountFreeTelemetryProperties({
        app: 'cli',
        app_version: '4.0.0',
        command: 'deploy',
        outcome: 'error',
        error_code: 'CONFIG_NEEDS_CONSOLE',
        platform: 'linux',
        arch: 'x64',
        is_ci: false,
        args_keys: ['projectName', 'stage'],
        invocation_id: '2026-11-17T10-00-00-000_abc',
        locale: 'sk-SK',
        timezone: 'Europe/Bratislava',
        stackName: 'shop-production',
        message: 'Stack shop-production failed'
      })
    ).toEqual({
      app: 'cli',
      app_version: '4.0.0',
      command: 'deploy',
      outcome: 'error',
      error_code: 'CONFIG_NEEDS_CONSOLE',
      platform: 'linux',
      arch: 'x64',
      is_ci: false
    });
  });
});

describe('isCiEnvironment', () => {
  test.each([
    [{}, false],
    [{ CI: '' }, false],
    [{ CI: 'false' }, false],
    [{ CI: '0' }, false],
    [{ CI: 'true' }, true],
    [{ CI: '1' }, true]
  ] as const)('%p', (environment, expected) => {
    expect(isCiEnvironment(environment)).toBe(expected);
  });
});
