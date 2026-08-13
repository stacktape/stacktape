import {
  GetAccountCommand,
  GetConfigurationSetCommand,
  GetEmailIdentityCommand,
  type SESv2Client
} from '@aws-sdk/client-sesv2';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsEmail {
  readonly #createClient: () => SESv2Client;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => SESv2Client;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  getIdentityIfExists = async (identity: string) => {
    try {
      return await this.#createClient().send(new GetEmailIdentityCommand({ EmailIdentity: identity }));
    } catch (error) {
      if ((error as { name?: string }).name === 'NotFoundException') return undefined;
      return this.#getErrorHandler(`Failed to inspect SES identity ${identity}.`)(error as Error);
    }
  };

  getAccount = () =>
    this.#createClient()
      .send(new GetAccountCommand({}))
      .catch(this.#getErrorHandler('Failed to inspect the SES account.'));

  getConfigurationSetIfExists = async (configurationSetName: string) => {
    try {
      return await this.#createClient().send(
        new GetConfigurationSetCommand({ ConfigurationSetName: configurationSetName })
      );
    } catch (error) {
      if ((error as { name?: string }).name === 'NotFoundException') return undefined;
      return this.#getErrorHandler(`Failed to inspect SES configuration set ${configurationSetName}.`)(error as Error);
    }
  };
}
