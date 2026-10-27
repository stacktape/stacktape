import { type APIGatewayClient, GetAccountCommand, UpdateAccountCommand } from '@aws-sdk/client-api-gateway';

/** The regional API Gateway account settings. Its CloudWatch role lets REST and WebSocket stages write logs. */
export class AwsApiGatewayAccount {
  readonly #createClient: () => APIGatewayClient;

  constructor({ createClient }: { createClient: () => APIGatewayClient }) {
    this.#createClient = createClient;
  }

  /** Rejects with the SDK's error, so a caller can tell a denied read from a failed one. */
  getCloudWatchRoleArn = async () => {
    const account = await this.#createClient().send(new GetAccountCommand({}));
    return account.cloudwatchRoleArn || undefined;
  };

  /** Sends the request once. API Gateway rejects a role that it cannot assume yet with `BadRequestException`. */
  setCloudWatchRoleArn = (roleArn: string) =>
    this.#createClient().send(
      new UpdateAccountCommand({ patchOperations: [{ op: 'replace', path: '/cloudwatchRoleArn', value: roleArn }] })
    );
}
