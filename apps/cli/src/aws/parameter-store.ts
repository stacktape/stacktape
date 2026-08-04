import type { SSMClient } from '@aws-sdk/client-ssm';
import type { TuiManager } from '@application-services/tui-manager';
import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersCommand,
  ParameterNotFound,
  ParameterType,
  PutParameterCommand
} from '@aws-sdk/client-ssm';
import { chunkArray } from '@utils/misc';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;
type SsmClientFactory = (region?: string) => SSMClient;

export class AwsParameterStore {
  readonly #createClient: SsmClientFactory;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #printer?: Pick<TuiManager, 'debug'>;

  constructor({
    createClient,
    getErrorHandler,
    printer
  }: {
    createClient: SsmClientFactory;
    getErrorHandler: ErrorHandlerFactory;
    printer?: Pick<TuiManager, 'debug'>;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#printer = printer;
  }

  get = ({ name, region }: { name: string; region?: string }) => {
    const handleError = this.#getErrorHandler('Failed to get parameter from SSM Parameter Store.');
    return this.#createClient(region)
      .send(new GetParameterCommand({ Name: name, WithDecryption: true }))
      .catch(handleError);
  };

  put = ({ name, value, encrypted }: { name: string; value: string; encrypted?: boolean }) => {
    const handleError = this.#getErrorHandler('Failed to put parameter into SSM Parameter Store.');
    return this.#createClient()
      .send(
        new PutParameterCommand({
          Name: name,
          Value: value,
          Type: encrypted ? ParameterType.SECURE_STRING : ParameterType.STRING,
          Overwrite: true
        })
      )
      .catch(handleError);
  };

  delete = ({ name }: { name: string }) => {
    const handleError = this.#getErrorHandler(`Failed to delete SSM parameter ${name}.`);
    return this.#createClient()
      .send(new DeleteParameterCommand({ Name: name }))
      .catch((error) => {
        if (error instanceof ParameterNotFound) {
          this.#printer?.debug(`Could not delete SSM parameter "${name}", because it does not exist.`);
          return;
        }
        return handleError(error);
      });
  };

  getMany = async ({ names }: { names: string[] }) => {
    const handleError = this.#getErrorHandler('Failed to get parameters from SSM Parameter Store.');
    const parameterPages = await Promise.all(
      chunkArray(names, 10).map(async (nameBatch) => {
        const { Parameters = [] } = await this.#createClient()
          .send(new GetParametersCommand({ Names: nameBatch, WithDecryption: true }))
          .catch(handleError);
        return Parameters;
      })
    );
    return parameterPages.flat();
  };
}
