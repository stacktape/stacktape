import { describe, expect, test } from 'bun:test';
import { normalizeCliError } from '@application-services/application-manager';
import { CliError, getReturnableError } from '@utils/errors';
import { validateCommand, validateS3BucketName } from '@utils/validator';

describe('CLI error contract', () => {
  test('normalizes unknown failures once without requiring a stack trace', () => {
    const error = new Error('broken without a stack');
    error.stack = undefined;

    const normalized = normalizeCliError(error);

    expect(normalized.details).toMatchObject({
      code: 'UNEXPECTED_ERROR',
      errorType: 'UNEXPECTED',
      originalErrorType: 'Error'
    });
  });

  test('returns the stable code and hints to machine consumers', () => {
    const normalized = normalizeCliError(
      new CliError({
        category: 'CLI',
        code: 'CLI_COMMAND_UNKNOWN',
        message: 'Unknown command `oops`.',
        hints: 'Use `stacktape help`.'
      })
    );

    const returned = getReturnableError(normalized) as Error & {
      details: { errorId: string | null; code: string; errorType: string; hints: string[] };
    };

    expect(returned.details).toEqual({
      errorId: null,
      errorType: 'CLI',
      code: 'CLI_COMMAND_UNKNOWN',
      hints: ['Use `stacktape help`.']
    });
  });

  test('uses descriptive validation codes and accepts a valid S3 bucket name', () => {
    expect(() => validateS3BucketName('valid-bucket-name')).not.toThrow();
    expect(() => validateS3BucketName('INVALID')).toThrow(
      expect.objectContaining({ code: 'CONFIG_VALIDATION_BUCKET_NAME_INVALID' })
    );
    expect(() => validateCommand({ rawCommands: ['not-a-command' as any] })).toThrow(
      expect.objectContaining({ code: 'CLI_COMMAND_UNKNOWN' })
    );
  });
});
