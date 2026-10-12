import { expect, test } from 'bun:test';
import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { AwsSecrets } from '../../src/aws/secrets';

// Deliberate malformed provider page: MiniStack's regular pagination is covered by generated-access/access.spec.ts.
test('an empty provider page with a continuation token does not discard later secrets', async () => {
  const secrets = new AwsSecrets({
    createClient: () =>
      ({
        send: async (command: { input: { NextToken?: string } }) =>
          command.input.NextToken
            ? { SecretList: [{ ARN: 'second-arn', Name: 'second' }] }
            : { NextToken: 'second-page' }
      }) as SecretsManagerClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });
  expect(await secrets.list()).toEqual([{ ARN: 'second-arn', Name: 'second' }]);
});
