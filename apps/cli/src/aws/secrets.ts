import type { SecretListEntry, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  RestoreSecretCommand,
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

  /** Rejects with the SDK's own error, so a caller can tell a missing permission (`AccessDeniedException`) apart. */
  untag = ({ secretId, tagKeys }: { secretId: string; tagKeys: string[] }) =>
    this.#createClient().send(new UntagResourceCommand({ SecretId: secretId, TagKeys: tagKeys }));

  /** Cancels a scheduled deletion. */
  restore = ({ secretId }: { secretId: string }) => {
    const handleError = this.#getErrorHandler(`Failed to restore secret with id ${secretId}.`);
    return this.#createClient()
      .send(new RestoreSecretCommand({ SecretId: secretId }))
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

  /** Secrets Manager keeps a deleted secret, and its name, for the recovery window: 30 days unless given. */
  delete = ({ secretId, recoveryWindowInDays }: { secretId: string; recoveryWindowInDays?: number }) => {
    const handleError = this.#getErrorHandler(`Failed to delete secret with id ${secretId}.`);
    return this.#createClient()
      .send(
        new DeleteSecretCommand({
          SecretId: secretId,
          ...(recoveryWindowInDays ? { RecoveryWindowInDays: recoveryWindowInDays } : {})
        })
      )
      .catch(handleError);
  };

  /** With `includePlannedDeletion`, deleted secrets in their recovery window are listed too, with `DeletedDate`. */
  list = async ({ includePlannedDeletion = false }: { includePlannedDeletion?: boolean } = {}): Promise<
    SecretListEntry[]
  > => {
    const handleError = this.#getErrorHandler('Failed to list secrets.');
    const secrets: SecretListEntry[] = [];
    let nextToken: string | undefined;
    do {
      const response = await this.#createClient()
        .send(
          new ListSecretsCommand({
            ...(nextToken ? { NextToken: nextToken } : {}),
            ...(includePlannedDeletion ? { IncludePlannedDeletion: true } : {})
          })
        )
        .catch(handleError);
      secrets.push(...(response.SecretList || []));
      nextToken = response.NextToken;
    } while (nextToken);
    return secrets;
  };
}
