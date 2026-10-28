import { describe, expect, test } from 'bun:test';
import { CliError } from '@utils/errors';
import { assertEnvironmentResolved } from './unresolved-environment';

// r2qq finding 1: a local Next.js app got `<<missing_output>>` as the name of the Lambda it invoked, and failed later
// with an AWS validation error that did not name the variable.
describe('assertEnvironmentResolved', () => {
  test('names each variable whose stack output is missing, with the directive it was configured with', () => {
    let error: unknown;
    try {
      assertEnvironmentResolved({
        owner: 'web',
        environment: { IMAGE_FUNCTION_NAME: '<<missing_output>>', API_URL: 'https://api.example.com' },
        configured: {
          IMAGE_FUNCTION_NAME: "$CfResourceParam('ImageLambda', 'FunctionName')",
          API_URL: 'https://api.example.com'
        }
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe('ENVIRONMENT_OUTPUT_MISSING');
    expect((error as CliError).message).toBe(
      "`IMAGE_FUNCTION_NAME` ($CfResourceParam('ImageLambda', 'FunctionName')) of web reads a stack output that the deployed stack does not have, so it has no value."
    );
  });

  test('a resolved environment passes', () => {
    expect(() =>
      assertEnvironmentResolved({ owner: 'web', environment: { IMAGE_FUNCTION_NAME: 'shop-dev-image', PORT: 3000 } })
    ).not.toThrow();
  });
});
