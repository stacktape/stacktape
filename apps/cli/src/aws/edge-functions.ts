import type { IAMClient } from '@aws-sdk/client-iam';
import type { LambdaClient, Runtime } from '@aws-sdk/client-lambda';
import {
  CreateRoleCommand,
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
  GetRoleCommand,
  ListRolePoliciesCommand
} from '@aws-sdk/client-iam';
import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  GetFunctionConfigurationCommand,
  PublishVersionCommand,
  waitUntilFunctionActiveV2
} from '@aws-sdk/client-lambda';
import { wait } from '@utils/misc';
import { getAssumeRolePolicyDocumentForFunctionRole } from './iam';

/** How long creating a function retries while its new role is not yet assumable by Lambda (IAM propagation). */
const ROLE_PROPAGATION_TIMEOUT_MS = 60_000;

const isNotFound = (error: unknown) =>
  error instanceof Error && (error.name === 'ResourceNotFoundException' || error.name === 'NoSuchEntityException');

/**
 * Lambda@Edge functions live in us-east-1, whatever the stack's region. Only what the CLI needs to create a new edge
 * function before CloudFormation runs; the stack's edge function custom resource owns it afterwards.
 */
export class AwsEdgeFunctions {
  readonly #createLambdaClient: () => LambdaClient;
  readonly #createIamClient: () => IAMClient;

  constructor({
    createLambdaClient,
    createIamClient
  }: {
    createLambdaClient: () => LambdaClient;
    createIamClient: () => IAMClient;
  }) {
    this.#createLambdaClient = createLambdaClient;
    this.#createIamClient = createIamClient;
  }

  functionExists = async ({ functionName }: { functionName: string }) => {
    try {
      await this.#createLambdaClient().send(new GetFunctionConfigurationCommand({ FunctionName: functionName }));
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  };

  getRoleArn = async ({ roleName }: { roleName: string }) => {
    try {
      return (await this.#createIamClient().send(new GetRoleCommand({ RoleName: roleName }))).Role?.Arn;
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  };

  /** A role Lambda and Lambda@Edge can assume, without permissions: the custom resource adds them. */
  createRole = async ({ roleName, description }: { roleName: string; description: string }) => {
    const { Role } = await this.#createIamClient().send(
      new CreateRoleCommand({
        RoleName: roleName,
        Description: description,
        AssumeRolePolicyDocument: JSON.stringify(getAssumeRolePolicyDocumentForFunctionRole())
      })
    );
    return Role!.Arn!;
  };

  /** Creates the function from a zip file and returns once it is active. */
  createFunction = async ({
    functionName,
    roleArn,
    zipFile,
    handler,
    runtime,
    memory,
    timeout,
    tags
  }: {
    functionName: string;
    roleArn: string;
    zipFile: Uint8Array;
    handler: string;
    runtime: string;
    memory: number;
    timeout: number;
    tags: Record<string, string>;
  }) => {
    const startedAt = Date.now();
    for (;;) {
      try {
        await this.#createLambdaClient().send(
          new CreateFunctionCommand({
            FunctionName: functionName,
            Role: roleArn,
            Code: { ZipFile: zipFile },
            Handler: handler,
            Runtime: runtime as Runtime,
            MemorySize: memory,
            Timeout: timeout,
            Tags: tags
          })
        );
        break;
      } catch (error) {
        // A role created moments ago is not assumable until IAM has propagated it, usually within seconds.
        const roleNotReady =
          error instanceof Error &&
          error.name === 'InvalidParameterValueException' &&
          /cannot be assumed/i.test(error.message);
        if (!roleNotReady || Date.now() - startedAt > ROLE_PROPAGATION_TIMEOUT_MS) throw error;
        await wait(1000);
      }
    }
    await waitUntilFunctionActiveV2(
      { client: this.#createLambdaClient(), maxWaitTime: 120, minDelay: 1, maxDelay: 2 },
      { FunctionName: functionName }
    );
  };

  /** Publishes the function's current code and configuration and returns the version's ARN. */
  publishVersion = async ({ functionName }: { functionName: string }) => {
    const { FunctionArn } = await this.#createLambdaClient().send(
      new PublishVersionCommand({ FunctionName: functionName })
    );
    return FunctionArn!;
  };

  /**
   * Deletes the function unless CloudFront still has replicas of it, which AWS keeps for up to a few hours after a
   * distribution stops using it.
   */
  deleteFunction = async ({ functionName }: { functionName: string }): Promise<'deleted' | 'replicated'> => {
    try {
      await this.#createLambdaClient().send(new DeleteFunctionCommand({ FunctionName: functionName }));
    } catch (error) {
      if (isNotFound(error)) return 'deleted';
      if (error instanceof Error && /replicated function/i.test(error.message)) return 'replicated';
      throw error;
    }
    return 'deleted';
  };

  deleteRole = async ({ roleName }: { roleName: string }) => {
    try {
      const { PolicyNames = [] } = await this.#createIamClient().send(
        new ListRolePoliciesCommand({ RoleName: roleName })
      );
      await Promise.all(
        PolicyNames.map((PolicyName) =>
          this.#createIamClient().send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName }))
        )
      );
      await this.#createIamClient().send(new DeleteRoleCommand({ RoleName: roleName }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  };
}
