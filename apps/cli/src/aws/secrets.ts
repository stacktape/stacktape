import type { SecretListEntry, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  UntagResourceCommand,
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

  create = ({
    name,
    value,
    description = 'Created by Stacktape',
    tags
  }: {
    name: string;
    value: string;
    description?: string;
    tags?: { Key: string; Value: string }[];
  }) => {
    const handleError = this.#getErrorHandler('Failed to create secret.');
    return this.#createClient()
      .send(
        new CreateSecretCommand({
          Description: description,
          Name: name,
          SecretString: value,
          ...(tags?.length ? { Tags: tags } : {})
        })
      )
      .catch(handleError);
  };

  untag = ({ secretId, tagKeys }: { secretId: string; tagKeys: string[] }) => {
    const handleError = this.#getErrorHandler(`Failed to untag secret with id ${secretId}.`);
    return this.#createClient()
      .send(new UntagResourceCommand({ SecretId: secretId, TagKeys: tagKeys }))
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

  /** Without `forceWithoutRecovery`, Secrets Manager keeps the secret, and its name, for a 30-day recovery window. */
  delete = ({ secretId, forceWithoutRecovery }: { secretId: string; forceWithoutRecovery?: boolean }) => {
    const handleError = this.#getErrorHandler(`Failed to delete secret with id ${secretId}.`);
    return this.#createClient()
      .send(
        new DeleteSecretCommand({
          SecretId: secretId,
          ...(forceWithoutRecovery ? { ForceDeleteWithoutRecovery: true } : {})
        })
      )
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
