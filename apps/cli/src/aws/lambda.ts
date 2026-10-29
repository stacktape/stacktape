import { pRateLimit } from 'p-ratelimit';
import type { LambdaClient, Runtime } from '@aws-sdk/client-lambda';
import {
  DeleteFunctionUrlConfigCommand,
  DeleteLayerVersionCommand,
  GetAliasCommand,
  GetFunctionCommand,
  GetLayerVersionByArnCommand,
  GetFunctionConfigurationCommand,
  GetFunctionUrlConfigCommand,
  GetProvisionedConcurrencyConfigCommand,
  InvokeCommand,
  ListFunctionsCommand,
  ListLayerVersionsCommand,
  ListTagsCommand,
  PublishLayerVersionCommand,
  PublishVersionCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateAliasCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand
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

  /** Whether the function URL still exists. A deleted function has no URL. */
  functionUrlExists = async ({ functionName, qualifier }: { functionName: string; qualifier?: string }) => {
    try {
      await this.#createClient().send(
        new GetFunctionUrlConfigCommand({ FunctionName: functionName, Qualifier: qualifier })
      );
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'ResourceNotFoundException') return false;
      throw error;
    }
  };

  /** Deletes a function URL; requests to it fail at once. AWS errors are passed through unchanged. */
  deleteFunctionUrl = async ({ functionName, qualifier }: { functionName: string; qualifier?: string }) => {
    await this.#createClient().send(
      new DeleteFunctionUrlConfigCommand({ FunctionName: functionName, Qualifier: qualifier })
    );
  };

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

  /**
   * Replaces the function's layers. Lambda refuses a configuration update while another update of the function is in
   * progress, so wait for a preceding code update first.
   */
  updateFunctionLayers = async ({
    lambdaResourceName,
    layerArns
  }: {
    lambdaResourceName: string;
    layerArns: string[];
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to update the layers of function ${lambdaResourceName}.`);
    return this.#createClient()
      .send(new UpdateFunctionConfigurationCommand({ FunctionName: lambdaResourceName, Layers: layerArns }))
      .catch(errorHandler);
  };

  /** The layer ARNs the function runs with now. Shares the status read budget, as it reads with GetFunction. */
  getFunctionLayerArns = async ({ lambdaResourceName }: { lambdaResourceName: string }): Promise<string[]> => {
    const errorHandler = this.#getErrorHandler(`Failed to read the layers of function ${lambdaResourceName}.`);
    const { Configuration } = await this.#readFunctionStatus(() =>
      this.#createClient().send(new GetFunctionCommand({ FunctionName: lambdaResourceName }))
    ).catch(errorHandler);
    return (Configuration?.Layers ?? []).flatMap(({ Arn }) => (Arn ? [Arn] : []));
  };

  /** Download locations stay inside the deployment workflow; never include these signed URLs in diagnostics. */
  getFunctionDeployment = async ({ lambdaResourceName }: { lambdaResourceName: string }) =>
    this.#readFunctionStatus(() =>
      this.#createClient().send(new GetFunctionCommand({ FunctionName: lambdaResourceName }))
    ).catch(this.#getErrorHandler(`Failed to read deployed code of function ${lambdaResourceName}.`));

  getLayerVersion = async ({ arn }: { arn: string }) =>
    this.#createClient()
      .send(new GetLayerVersionByArnCommand({ Arn: arn }))
      .catch(this.#getErrorHandler('Failed to read a deployed layer version.'));

  /** Signed Lambda artifact URLs must never appear in errors, including a failed response-body read. */
  downloadArtifact = async ({ location }: { location?: string }): Promise<Buffer> => {
    if (!location) throw new Error('AWS did not return the deployed artifact download location.');
    try {
      const response = await fetch(location, { redirect: 'error' });
      if (!response.ok) throw new Error('Artifact download failed.');
      return Buffer.from(await response.arrayBuffer());
    } catch {
      throw new Error('Could not download a deployed Lambda artifact.');
    }
  };

  publishLayerVersion = async ({
    layerName,
    description,
    compatibleRuntimes,
    artifactBucketName,
    artifactS3Key,
    zipFile
  }: {
    layerName: string;
    description?: string;
    compatibleRuntimes?: string[];
    artifactBucketName?: string;
    artifactS3Key?: string;
    zipFile?: Uint8Array;
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to publish a version of layer ${layerName}.`);
    return this.#createClient()
      .send(
        new PublishLayerVersionCommand({
          LayerName: layerName,
          Description: description,
          CompatibleRuntimes: compatibleRuntimes as Runtime[] | undefined,
          Content: zipFile ? { ZipFile: zipFile } : { S3Bucket: artifactBucketName, S3Key: artifactS3Key }
        })
      )
      .catch(errorHandler);
  };

  /** Every version of the layer, newest first. A layer that was never published has no versions. */
  listLayerVersions = async ({ layerName }: { layerName: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to list the versions of layer ${layerName}.`);
    const versions: { version: number; arn: string; description?: string }[] = [];
    let marker: string | undefined;
    do {
      const page = await this.#createClient()
        .send(new ListLayerVersionsCommand({ LayerName: layerName, Marker: marker }))
        .catch(errorHandler);
      for (const { Version, LayerVersionArn, Description } of page.LayerVersions ?? []) {
        if (Version !== undefined && LayerVersionArn) {
          versions.push({ version: Version, arn: LayerVersionArn, description: Description });
        }
      }
      marker = page.NextMarker;
    } while (marker);
    return versions;
  };

  deleteLayerVersion = async ({ layerName, version }: { layerName: string; version: number }) => {
    const errorHandler = this.#getErrorHandler(`Failed to delete version ${version} of layer ${layerName}.`);
    await this.#createClient()
      .send(new DeleteLayerVersionCommand({ LayerName: layerName, VersionNumber: version }))
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

  untagFunction = async ({ lambdaArn, tagKeys }: { lambdaArn: string; tagKeys: string[] }) => {
    const errorHandler = this.#getErrorHandler('Failed to remove lambda tags.');
    return this.#createClient()
      .send(new UntagResourceCommand({ Resource: lambdaArn, TagKeys: tagKeys }))
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

  /** Names of the functions whose VPC configuration uses the security group. */
  listFunctionsInSecurityGroup = async (securityGroupId: string) => {
    const errorHandler = this.#getErrorHandler('Failed to list Lambda functions.');
    const names: string[] = [];
    let marker: string | undefined;
    do {
      const page = await this.#createClient()
        .send(new ListFunctionsCommand({ Marker: marker }))
        .catch(errorHandler);
      for (const { FunctionName, VpcConfig } of page.Functions ?? []) {
        if (FunctionName && VpcConfig?.SecurityGroupIds?.includes(securityGroupId)) names.push(FunctionName);
      }
      marker = page.NextMarker;
    } while (marker);
    return names;
  };
}
