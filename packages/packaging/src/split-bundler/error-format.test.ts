import { describe, expect, test } from 'bun:test';
import { formatBuildError } from './error-format';

describe('formatBuildError', () => {
  test('uses the message of a structural error object', () => {
    expect(formatBuildError({ message: 'build failed' })).toBe('build failed');
  });

  test('joins messages from structural Bun diagnostics', () => {
    expect(formatBuildError({ errors: [{ message: 'first diagnostic' }, { message: 'second diagnostic' }] })).toBe(
      'first diagnostic\nsecond diagnostic'
    );
  });
});
