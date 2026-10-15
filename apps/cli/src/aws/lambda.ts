import { pRateLimit } from 'p-ratelimit';
import type { LambdaClient } from '@aws-sdk/client-lambda';
import {
  GetAliasCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  GetProvisionedConcurrencyConfigCommand,
  InvokeCommand,
  ListTagsCommand,
  PublishVersionCommand,
  TagResourceCommand,
  UpdateAliasCommand,
  UpdateFunctionCodeCommand
} from '@aws-sdk/client-lambda';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { setTimeout as sleep } from 'node:timers/promises';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export type InvokeLambdaReturnValue = Omit<import('@aws-sdk/client-lambda').InvokeCommandOutput, 'Payload'> & {
  Payload: string;
};

export class AwsLambda {
  /**
   * Status reads of all functions a deployment waits for share one budget, well below Lambda's GetFunction quota of 100
   * requests per second, so a stack that updates many functions at once is not throttled.
   */
  readonly #readFunctionStatus = pRateLimit({ interval: 1000, rate: 25, concurrency: 10 });
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

  getFunction = async ({ lambdaResourceName, qualifier }: { lambdaResourceName: string; qualifier?: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to get configuration of function ${lambdaResourceName}.`);
    return this.#createClient()
      .send(new GetFunctionConfigurationCommand({ FunctionName: lambdaResourceName, Qualifier: qualifier }))
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

  /**
   * Waits until the function's last update has finished. A code update usually finishes within a second or two, and
   * the SDK waiter checks only every five seconds, so this checks after 250 ms and then backs off to once a second. It
   * reads the state with GetFunction, whose request quota is several times that of GetFunctionConfiguration.
   */
  waitUntilUpdated = async ({
    lambdaResourceName,
    maxWaitTimeMs = 120_000
  }: {
    lambdaResourceName: string;
    maxWaitTimeMs?: number;
  }) => {
    const errorHandler = this.#getErrorHandler(
      `Failure when waiting for update of lambda function ${lambdaResourceName}.`
    );
    const deadline = Date.now() + maxWaitTimeMs;
    for (let delayMs = 250; ; delayMs = Math.min(delayMs * 1.5, 1000)) {
      await sleep(delayMs);
      const { Configuration } = await this.#readFunctionStatus(() =>
        this.#createClient().send(new GetFunctionCommand({ FunctionName: lambdaResourceName }))
      ).catch(errorHandler);
      const { LastUpdateStatus, LastUpdateStatusReason } = Configuration ?? {};
      if (LastUpdateStatus === 'Successful') {
        return;
      }
      if (LastUpdateStatus === 'Failed') {
        errorHandler(new Error(LastUpdateStatusReason || 'The update failed.'));
      }
      if (Date.now() >= deadline) {
        errorHandler(new Error(`The update did not finish within ${maxWaitTimeMs / 1000} seconds.`));
      }
    }
  };

  publishVersion = async ({ lambdaResourceName }: { lambdaResourceName: string }) => {
    const errorHandler = this.#getErrorHandler(
      `Failure when publishing lambda function ${lambdaResourceName} version.`
    );
    return this.#createClient()
      .send(new PublishVersionCommand({ FunctionName: lambdaResourceName }))
      .catch(errorHandler);
  };

  getAlias = async ({ lambdaResourceName, aliasName }: { lambdaResourceName: string; aliasName: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to get alias ${aliasName} of function ${lambdaResourceName}.`);
    return this.#createClient()
      .send(new GetAliasCommand({ FunctionName: lambdaResourceName, Name: aliasName }))
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
