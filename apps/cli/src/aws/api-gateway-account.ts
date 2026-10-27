import { type APIGatewayClient, GetAccountCommand, UpdateAccountCommand } from '@aws-sdk/client-api-gateway';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

/** The regional API Gateway account settings. Its CloudWatch role lets REST and WebSocket stages write logs. */
export class AwsApiGatewayAccount {
  readonly #createClient: () => APIGatewayClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => APIGatewayClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  getCloudWatchRoleArn = async () => {
    const account = await this.#createClient()
      .send(new GetAccountCommand({}))
      .catch(this.#getErrorHandler('Failed to read the API Gateway account settings.'));
    return account.cloudwatchRoleArn || undefined;
  };

  /** Sends the request once. API Gateway rejects a role that it cannot assume yet with `BadRequestException`. */
  setCloudWatchRoleArn = (roleArn: string) =>
    this.#createClient().send(
      new UpdateAccountCommand({ patchOperations: [{ op: 'replace', path: '/cloudwatchRoleArn', value: roleArn }] })
    );
}
