import { describe, expect, test } from 'bun:test';
import { CliError, ExpectedError } from '@utils/errors';
import { normalizeCliError } from './index';

describe('normalizeCliError', () => {
  test('puts the plain explanation of a raw AWS failure first, once, and keeps the message', () => {
    const message =
      'Stack action update failed.\n\n  \u001B[31m1.\u001B[39m ApiLambda (in api)\n     Unzipped size must be smaller than 262144000 bytes\n';
    const error = new ExpectedError('STACK', message, ['You can monitor stack rollback progress in the AWS console.']);

    normalizeCliError(error);
    const normalized = normalizeCliError(error) as CliError;

    expect(normalized.message).toBe(message);
    expect(normalized.hints).toHaveLength(2);
    expect(normalized.hints[0]).toStartWith('Function `api` is larger than 250 MB unzipped');
    expect(normalized.hints[0]).toContain('https://docs.stacktape.com/packaging/function/js-bundle#');
    expect(normalized.hints[1]).toBe('You can monitor stack rollback progress in the AWS console.');
  });

  test('leaves an error no rule recognizes as it was', () => {
    const error = new ExpectedError('CONFIG', 'Resource `api` is not defined.', 'Check the resource name.');
    expect((normalizeCliError(error) as CliError).hints).toEqual(['Check the resource name.']);
  });
});
