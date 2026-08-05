import { describe, expect, test } from 'bun:test';
import { mergeConnectToEnvironmentVariables } from './connect-to-helper';

describe('connectTo environment variables', () => {
  test('keeps explicit environment values and appends only missing connected-resource values', () => {
    expect(
      mergeConnectToEnvironmentVariables(
        [
          { Name: 'STP_MAIN_DATABASE_CONNECTION_STRING', Value: 'assembled-at-runtime' },
          { Name: 'LOG_LEVEL', Value: 'info' }
        ],
        [
          { Name: 'STP_MAIN_DATABASE_CONNECTION_STRING', Value: 'contains-a-dynamic-secret-reference' },
          { Name: 'STP_MAIN_DATABASE_HOST', Value: 'database-host' }
        ]
      )
    ).toEqual([
      { Name: 'STP_MAIN_DATABASE_CONNECTION_STRING', Value: 'assembled-at-runtime' },
      { Name: 'LOG_LEVEL', Value: 'info' },
      { Name: 'STP_MAIN_DATABASE_HOST', Value: 'database-host' }
    ]);
  });
});
