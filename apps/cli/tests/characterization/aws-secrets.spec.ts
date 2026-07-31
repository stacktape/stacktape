import { afterEach, describe, expect, test } from 'bun:test';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
  UpdateSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { AwsSdkManager } from '../../src/aws/sdk-manager';

const credentials = {
  accessKeyId: 'synthetic-access-key',
  secretAccessKey: 'synthetic-secret-key'
};

const createManager = () => {
  const manager = new AwsSdkManager();
  manager.init({ credentials, plugins: [], region: 'eu-west-1' });
  return manager;
};

describe.serial('AWS Secrets Manager boundary', () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) {
      restore();
    }
  });

  test.serial(
    'translates create, update, versioned get and delete operations without changing their AWS inputs',
    async () => {
      const commands: (CreateSecretCommand | DeleteSecretCommand | GetSecretValueCommand | UpdateSecretCommand)[] = [];
      const originalSend = SecretsManagerClient.prototype.send;
      SecretsManagerClient.prototype.send = async function (
        command: CreateSecretCommand | DeleteSecretCommand | GetSecretValueCommand | UpdateSecretCommand
      ) {
        commands.push(command);
        return command instanceof GetSecretValueCommand ? { SecretString: 'synthetic-value' } : {};
      } as typeof originalSend;
      restores.push(() => {
        SecretsManagerClient.prototype.send = originalSend;
      });
      const secrets = createManager().secrets;

      await secrets.create({ name: 'example', value: 'first-value' });
      await secrets.update({ secretId: 'example-arn', value: 'second-value' });
      const result = await secrets.get({
        secretId: 'example-arn',
        versionId: 'version-1',
        versionStage: 'AWSPREVIOUS'
      });
      await secrets.delete({ secretId: 'example-arn' });

      expect(result.SecretString).toBe('synthetic-value');
      expect(commands.map(({ input }) => input)).toEqual([
        { Description: 'Created by Stacktape', Name: 'example', SecretString: 'first-value' },
        { SecretId: 'example-arn', SecretString: 'second-value' },
        { SecretId: 'example-arn', VersionId: 'version-1', VersionStage: 'AWSPREVIOUS' },
        { SecretId: 'example-arn' }
      ]);
    }
  );

  test.serial('lists every page and tolerates an AWS page with no SecretList', async () => {
    const commands: ListSecretsCommand[] = [];
    const originalSend = SecretsManagerClient.prototype.send;
    SecretsManagerClient.prototype.send = async function (command: ListSecretsCommand) {
      commands.push(command);
      if (!command.input.NextToken) {
        return { NextToken: 'second-page' };
      }
      return { SecretList: [{ ARN: 'second-arn', Name: 'second' }] };
    } as typeof originalSend;
    restores.push(() => {
      SecretsManagerClient.prototype.send = originalSend;
    });

    const result = await createManager().secrets.list();

    expect(commands.map(({ input }) => input)).toEqual([{}, { NextToken: 'second-page' }]);
    expect(result).toEqual([{ ARN: 'second-arn', Name: 'second' }]);
  });
});
