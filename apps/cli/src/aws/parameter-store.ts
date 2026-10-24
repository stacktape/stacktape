import type { SSMClient } from '@aws-sdk/client-ssm';
import type { TuiManager } from '@application-services/tui-manager';
import {
  DeleteParameterCommand,
  DeleteParametersCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  GetParametersCommand,
  ParameterAlreadyExists,
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

  /** Every plain parameter under `path`, at any depth. */
  listByPath = async ({ path }: { path: string }) => {
    const handleError = this.#getErrorHandler(`Failed to list SSM parameters under ${path}.`);
    const result: Array<{ name: string; value: string }> = [];
    let nextToken: string | undefined;
    do {
      const page = await this.#createClient()
        .send(new GetParametersByPathCommand({ Path: path, Recursive: true, NextToken: nextToken }))
        .catch(handleError);
      for (const { Name, Value } of page.Parameters ?? []) {
        if (Name && Value !== undefined) result.push({ name: Name, value: Value });
      }
      nextToken = page.NextToken;
    } while (nextToken);
    return result;
  };

  /** Creates a plain parameter; one that already exists keeps its value. */
  createIfAbsent = async ({ name, value }: { name: string; value: string }) => {
    const handleError = this.#getErrorHandler(`Failed to create SSM parameter ${name}.`);
    await this.#createClient()
      .send(new PutParameterCommand({ Name: name, Value: value, Type: ParameterType.STRING, Overwrite: false }))
      .catch((error) => {
        if (error instanceof ParameterAlreadyExists) return;
        return handleError(error);
      });
  };

  deleteMany = async ({ names }: { names: string[] }) => {
    const handleError = this.#getErrorHandler('Failed to delete SSM parameters.');
    for (const batch of chunkArray(names, 10)) {
      await this.#createClient()
        .send(new DeleteParametersCommand({ Names: batch }))
        .catch(handleError);
    }
  };
}
