import type { LambdaClient } from '@aws-sdk/client-lambda';
import {
  GetFunctionConfigurationCommand,
  GetProvisionedConcurrencyConfigCommand,
  InvokeCommand,
  ListTagsCommand,
  PublishVersionCommand,
  TagResourceCommand,
  UpdateAliasCommand,
  UpdateFunctionCodeCommand,
  waitUntilFunctionUpdated
} from '@aws-sdk/client-lambda';
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export type InvokeLambdaReturnValue = Omit<import('@aws-sdk/client-lambda').InvokeCommandOutput, 'Payload'> & {
  Payload: string;
};

export class AwsLambda {
  readonly #createClient: () => LambdaClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => LambdaClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  updateFunctionCode = async ({
    lambdaResourceName,
    artifactBucketName,
    artifactS3Key
  }: {
    lambdaResourceName: string;
    artifactBucketName: string;
    artifactS3Key: string;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to update function code of function ${lambdaResourceName}.`);
    return this.#createClient()
      .send(
        new UpdateFunctionCodeCommand({
          FunctionName: lambdaResourceName,
          S3Bucket: artifactBucketName,
          S3Key: artifactS3Key
        })
      )
      .catch(errorHandler);
  };

  getFunction = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to get configuration of function ${lambdaResourceName}.`);
    return this.#createClient()
      .send(new GetFunctionConfigurationCommand({ FunctionName: lambdaResourceName }))
      .catch(errorHandler);
  };

  invoke = async ({
    lambdaResourceName,
    payload,
    asynchronous
  }: {
    lambdaResourceName: string;
    payload: Record<string, any>;
    asynchronous?: boolean;
  }): Promise<InvokeLambdaReturnValue> => {
    const errorHandler = this.#getErrorHandler(`Failed to invoke function ${lambdaResourceName}.`);
    const response = await this.#createClient()
      .send(
        new InvokeCommand({
          FunctionName: lambdaResourceName,
          Payload: fromUtf8(JSON.stringify(payload)),
          InvocationType: asynchronous ? 'Event' : 'RequestResponse'
        })
      )
      .catch(errorHandler);
    return {
      ...response,
      Payload: toUtf8(response.Payload)
    };
  };

  listTags = async ({ lambdaArn }: { lambdaArn: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to get lambda tags.');
    return (
      (
        await this.#createClient()
          .send(new ListTagsCommand({ Resource: lambdaArn }))
          .catch(errorHandler)
      ).Tags || {}
    );
  };

  getProvisionedConcurrencyConfig = async ({
    functionName,
    qualifier
  }: {
    functionName: string;
    qualifier: string;
  }) => {
    const errorHandler = this.#getErrorHandler('Failed to get provisioned concurrency config.');
    return this.#createClient()
      .send(new GetProvisionedConcurrencyConfigCommand({ FunctionName: functionName, Qualifier: qualifier }))
      .catch(errorHandler);
  };

  tagFunction = async ({ lambdaArn, tags }: { lambdaArn: string; tags: { key: string; value: string }[] }) => {
    const errorHandler = this.#getErrorHandler('Failed to tag lambda.');
    const tagObject: Record<string, string> = {};
    tags.forEach(({ key, value }) => {
      tagObject[key] = value;
    });
    return this.#createClient()
      .send(new TagResourceCommand({ Resource: lambdaArn, Tags: tagObject }))
      .catch(errorHandler);
  };

  waitUntilUpdated = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errorHandler = this.#getErrorHandler(
      `Failure when waiting for update of lambda function ${lambdaResourceName}.`
    );
    await waitUntilFunctionUpdated(
      { client: this.#createClient(), maxWaitTime: 120 },
      { FunctionName: lambdaResourceName }
    ).catch(errorHandler);
  };

  publishVersion = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errorHandler = this.#getErrorHandler(
      `Failure when publishing lambda function ${lambdaResourceName} version.`
    );
    return this.#createClient()
      .send(new PublishVersionCommand({ FunctionName: lambdaResourceName }))
      .catch(errorHandler);
  };

  updateAlias = async ({
    lambdaResourceName,
    aliasName,
    version
  }: {
    lambdaResourceName: string;
    aliasName: string;
    version: string;
  }) => {
    const errorHandler = this.#getErrorHandler(
      `Failure when updating lambda function ${lambdaResourceName} alias ${aliasName}.`
    );
    return this.#createClient()
      .send(new UpdateAliasCommand({ FunctionName: lambdaResourceName, Name: aliasName, FunctionVersion: version }))
      .catch(errorHandler);
  };
}
