import { describe, expect, test } from 'bun:test';
import { normalizeCliError } from '@application-services/application-manager';
import { getReturnableError } from '@utils/errors';
import { validateArgs } from '@utils/validator';
import { assertAwsProfileDoesNotExist, assertAwsProfilesConfigured } from '../../src/commands/_utils/aws-profile-input';
import { containerErrors } from '../../src/commands/_utils/container-errors';
import { getLogGroupInfoForStacktapeResource } from '../../src/commands/_utils/logs';
import { requireSecretName, requireSecretValueInput } from '../../src/commands/_utils/secret-input';
import { resolveInfoStackName } from '../../src/commands/info-stack';

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
      hints: ['Create a profile with `stacktape aws-profile:create`.']
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

  test('resolves an explicit or derived stack name and reports incomplete targeting', () => {
    expect(resolveInfoStackName({ stackName: 'orders-live' })).toBe('orders-live');
    expect(resolveInfoStackName({ projectName: 'orders', stage: 'preview' })).toBe('orders-preview');
    expectCliError(() => resolveInfoStackName({ projectName: 'orders' }), {
      category: 'CLI',
      code: 'CLI_STACK_TARGET_REQUIRED',
      hints: ['Provide `--stackName`, or provide both `--projectName` and `--stage`.']
    });
  });

  test('uses central argument validation for required command options and machine output', () => {
    const validationError = expectCliError(
      () =>
        validateArgs({
          command: 'metrics',
          rawArgs: { stage: 'production', region: 'eu-west-1', metric: 'Errors' },
          defaults: {},
          fromEnv: {}
        }),
      {
        category: 'CLI',
        code: 'CLI_ARGUMENT_REQUIRED',
        message:
          'Missing required argument `--resourceName` for command `metrics`. Required arguments: `--stage`, `--region`, `--resourceName`, `--metric`.'
      }
    );

    const returned = getReturnableError(normalizeCliError(validationError)) as Error & {
      details: { code: string; errorType: string; hints: string[] };
    };
    expect(returned.details).toMatchObject({
      errorType: 'CLI',
      code: 'CLI_ARGUMENT_REQUIRED',
      hints: expect.arrayContaining([expect.stringContaining('stacktape metrics --help')])
    });
  });

  test('keeps missing-log-group failures machine-readable', () => {
    expectCliError(
      () =>
        getLogGroupInfoForStacktapeResource({
          resourceName: 'api',
          stackName: 'orders-dev',
          stackResources: []
        }),
      {
        category: 'CONFIG',
        code: 'LOG_GROUP_NOT_FOUND',
        message: 'No log group was found for resource `api`.'
      }
    );
  });

  test('reports invalid container targets and actionable container selection', () => {
    expect(containerErrors.invalidResource('worker')).toMatchObject({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_RESOURCE_INVALID',
      message: 'Resource `worker` is not a deployed container workload.'
    });
    expect(
      containerErrors.selectionRequired({ resourceName: 'api', availableContainers: ['web', 'sidecar'] })
    ).toMatchObject({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_SELECTION_REQUIRED',
      hints: ['Specify `--container` with one of: `web`, `sidecar`.']
    });
  });

  test('validates non-interactive secret input before any secret operation', () => {
    const nameError = expectCliError(() => requireSecretName(undefined), {
      category: 'CLI',
      code: 'CLI_SECRET_NAME_REQUIRED',
      hints: ['Provide `--secretName <name>`.']
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
      hints: ['Provide `--secretName <name>`.']
    });
  });
});
