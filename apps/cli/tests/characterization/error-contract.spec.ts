import { describe, expect, test } from 'bun:test';
import { normalizeCliError } from '@application-services/application-manager';
import { renderErrorToString } from '@application-services/tui-manager/error-rendering';
import { awsCdkConstructErrors } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/aws-cdk-construct/errors';
import { configErrors } from '@domain-services/config-manager/errors';
import { stpErrors } from 'src/config/error-messages';
import { CliError, getReturnableError } from '@utils/errors';
import { validateCommand, validateS3BucketName } from '@utils/validator';

describe('CLI error contract', () => {
  test('keeps intentional failures structured and preserves their cause', () => {
    const cause = new Error('root cause');
    const error = new CliError({
      category: 'CLI',
      code: 'CLI_EXAMPLE_FAILURE',
      message: 'Could not use `example`.',
      hints: ['Try `stacktape help`.', 'Read the documentation.'],
      cause
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.category).toBe('CLI');
    expect(error.code).toBe('CLI_EXAMPLE_FAILURE');
    expect(error.hints).toEqual(['Try `stacktape help`.', 'Read the documentation.']);
    expect(error.cause).toBe(cause);
  });

  test('adapts the numbered registry to the same class while it is migrated', () => {
    const error = stpErrors.e14({ configPath: 'stacktape.yml' });

    expect(error).toBeInstanceOf(CliError);
    expect(error).toMatchObject({ category: 'CONFIG_VALIDATION', code: 'CONFIG_VALIDATION_E14' });
  });

  test('uses semantic, presentation-neutral config errors', () => {
    const error = configErrors.configFileMissing();

    expect(error).toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_FILE_REQUIRED'
    });
    expect(error.hints).toEqual([expect.stringContaining('stacktape init')]);
    expect(error.message).not.toContain('\u001b[');
    expect(error.hints.join('\n')).not.toContain('\u001b[');
  });

  test('keeps AWS CDK construct failures local, actionable, and machine-readable', () => {
    const cause = new Error('Cannot find module ./construct');
    const importError = awsCdkConstructErrors.importFailed({
      constructName: 'billing',
      exportName: 'BillingConstruct',
      filePath: 'infra/billing.ts',
      cause
    });
    const dependencyError = awsCdkConstructErrors.dependenciesMissing();

    expect(importError).toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_IMPORT_FAILED',
      cause
    });
    expect(importError.message).toContain('BillingConstruct');
    expect(importError.hints).toEqual([expect.stringContaining('exports')]);
    expect(importError.message).not.toContain('\u001b[');
    expect(dependencyError).toMatchObject({
      category: 'MISSING_PREREQUISITE',
      code: 'AWS_CDK_CONSTRUCT_DEPENDENCIES_MISSING'
    });
    expect(dependencyError.message).toContain('constructs');
  });

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

  test('renders backtick spans only at the presentation boundary', () => {
    const rendered = renderErrorToString(
      {
        errorType: 'CLI',
        message: 'Unknown command `oops`.',
        hints: ['Use `stacktape help`.'],
        isExpected: true
      },
      (color, text) => `<${color}>${text}</${color}>`,
      (text) => `<bold>${text}</bold>`
    );

    expect(rendered).toContain('<cyan><bold>oops</bold></cyan>');
    expect(rendered).toContain('<cyan><bold>stacktape help</bold></cyan>');
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
