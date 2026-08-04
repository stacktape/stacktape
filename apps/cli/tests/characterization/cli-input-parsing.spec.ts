import { describe, expect, test } from 'bun:test';
import { parseJsonObjectArgument } from '../../src/commands/_utils/parse-json-argument';
import { CliError } from '@utils/errors';

describe('CLI JSON argument parsing', () => {
  test('accepts an object and rejects non-object JSON with the caller code', () => {
    expect(
      parseJsonObjectArgument({ value: '{"key":"value"}', flag: '--input', code: 'CLI_TEST_INPUT_INVALID' })
    ).toEqual({ key: 'value' });

    expect(() =>
      parseJsonObjectArgument({ value: '["value"]', flag: '--input', code: 'CLI_TEST_INPUT_INVALID' })
    ).toThrow(expect.objectContaining({ code: 'CLI_TEST_INPUT_INVALID' }));
  });

  test('does not retain invalid credential-bearing input in the error', () => {
    const secret = 'DO-NOT-PRINT-THIS-INPUT';
    let error: CliError | undefined;
    try {
      parseJsonObjectArgument({ value: `{"token":"${secret}`, flag: '--input', code: 'CLI_TEST_INPUT_INVALID' });
    } catch (caught) {
      error = caught as CliError;
    }

    expect(error).toBeInstanceOf(CliError);
    expect(`${error?.message}\n${error?.stack}`).not.toContain(secret);
  });
});
