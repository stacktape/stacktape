import { describe, expect, test } from 'bun:test';
import { normalizeCliError } from '@application-services/application-manager';
import { getReturnableError } from '@utils/errors';
import { assertAwsProfileDoesNotExist, assertAwsProfilesConfigured } from '../../src/commands/_utils/aws-profile-input';
import { requireSecretName, requireSecretValueInput } from '../../src/commands/_utils/secret-input';

const expectCliError = (
  action: () => unknown,
  expected: { category: string; code: string; message?: string; hints?: string[] }
) => {
  try {
    action();
    throw new Error('Expected action to throw');
  } catch (error) {
    expect(error).toMatchObject(expected);
    const serialized = `${(error as Error).message}\n${((error as { hints?: string[] }).hints || []).join('\n')}`;
    expect(serialized).not.toContain('\u001b[');
    return error;
  }
};

describe('modernized command error contracts', () => {
  test('distinguishes missing and duplicate AWS profiles with stable semantic codes', () => {
    expectCliError(() => assertAwsProfilesConfigured([]), {
      category: 'CREDENTIALS',
      code: 'AWS_PROFILE_NOT_CONFIGURED',
      hints: ['Create a profile with `stacktape aws-profile create`.']
    });

    expectCliError(
      () =>
        assertAwsProfileDoesNotExist({
          profile: 'production',
          credentialsProfiles: { production: {} },
          configProfiles: undefined
        }),
      {
        category: 'CREDENTIALS',
        code: 'AWS_PROFILE_ALREADY_EXISTS',
        message: 'Credentials for profile `production` are already set in the shared AWS credentials file.'
      }
    );
  });

  test('validates non-interactive secret input before any secret operation', () => {
    const nameError = expectCliError(() => requireSecretName(undefined), {
      category: 'CLI',
      code: 'CLI_SECRET_NAME_REQUIRED',
      hints: ['Provide `--secret-name <name>`.']
    });
    expectCliError(() => requireSecretValueInput({ secretFile: undefined, secretValue: undefined }), {
      category: 'CLI',
      code: 'CLI_SECRET_VALUE_REQUIRED'
    });
    expect(requireSecretName('database-password')).toBe('database-password');
    expect(() => requireSecretValueInput({ secretFile: undefined, secretValue: 'value' })).not.toThrow();

    const returned = getReturnableError(normalizeCliError(nameError)) as Error & {
      details: { code: string; errorType: string; hints: string[] };
    };
    expect(returned.details).toMatchObject({
      errorType: 'CLI',
      code: 'CLI_SECRET_NAME_REQUIRED',
      hints: ['Provide `--secret-name <name>`.']
    });
  });
});
