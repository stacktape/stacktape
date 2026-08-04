import type { SecretListEntry, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  UpdateSecretCommand
} from '@aws-sdk/client-secrets-manager';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsSecrets {
  readonly #createClient: () => SecretsManagerClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => SecretsManagerClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  create = ({ name, value }: { name: string; value: string }) => {
    const handleError = this.#getErrorHandler('Failed to create secret.');
    return this.#createClient()
      .send(new CreateSecretCommand({ Description: 'Created by Stacktape', Name: name, SecretString: value }))
      .catch(handleError);
  };

  update = ({ secretId, value }: { secretId: string; value: string }) => {
    const handleError = this.#getErrorHandler('Failed to update secret.');
    return this.#createClient()
      .send(new UpdateSecretCommand({ SecretId: secretId, SecretString: value }))
      .catch(handleError);
  };

  get = ({ secretId, versionId, versionStage }: { secretId: string; versionId?: string; versionStage?: string }) => {
    const handleError = this.#getErrorHandler('Failed to get secret value.');
    return this.#createClient()
      .send(
        new GetSecretValueCommand({
          SecretId: secretId,
          ...(versionId ? { VersionId: versionId } : {}),
          ...(versionStage ? { VersionStage: versionStage } : {})
        })
      )
      .catch(handleError);
  };

  delete = ({ secretId }: { secretId: string }) => {
    const handleError = this.#getErrorHandler(`Failed to delete secret with id ${secretId}.`);
    return this.#createClient()
      .send(new DeleteSecretCommand({ SecretId: secretId }))
      .catch(handleError);
  };

  list = async (): Promise<SecretListEntry[]> => {
    const handleError = this.#getErrorHandler('Failed to list secrets.');
    const secrets: SecretListEntry[] = [];
    let nextToken: string | undefined;
    do {
      const response = await this.#createClient()
        .send(new ListSecretsCommand(nextToken ? { NextToken: nextToken } : {}))
        .catch(handleError);
      secrets.push(...(response.SecretList || []));
      nextToken = response.NextToken;
    } while (nextToken);
    return secrets;
  };
}
