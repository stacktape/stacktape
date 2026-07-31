import type { CreateDeploymentCommandInput, CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CreateDeploymentCommand, waitUntilDeploymentSuccessful } from '@aws-sdk/client-codedeploy';
import type {
  DescribeServicesCommandInput,
  DesiredStatus,
  ECSClient,
  ExecuteCommandCommandInput,
  UpdateServiceCommandInput
} from '@aws-sdk/client-ecs';
import {
  DeploymentRolloutState,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ExecuteCommandCommand,
  ListTasksCommand,
  PutAccountSettingDefaultCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand
} from '@aws-sdk/client-ecs';
import type { StartSessionResponse } from '@aws-sdk/client-ssm';
import type TaskDefinition from '@cloudform/ecs/taskDefinition';
import { createWaiter, WaiterState } from '@aws-sdk/util-waiter';
import { chunkArray, lowerCaseFirstCharacterOfObjectKeys, serialize, wait } from '@utils/misc';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsEcs {
  readonly #createClient: () => ECSClient;
  readonly #createCodeDeployClient: () => CodeDeployClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    createCodeDeployClient,
    getErrorHandler
  }: {
    createClient: () => ECSClient;
    createCodeDeployClient: () => CodeDeployClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#createCodeDeployClient = createCodeDeployClient;
    this.#getErrorHandler = getErrorHandler;
  }

  setAccountSetting = async (settingName: string, settingValue: 'enabled' | 'disabled') => {
    const errorHandler = this.#getErrorHandler(
      `Unable to set ecs setting ${settingName} to desired value ${settingValue}`
    );
    return this.#createClient()
      .send(new PutAccountSettingDefaultCommand({ name: settingName, value: settingValue }))
      .catch(errorHandler);
  };

  getTaskDefinition = async ({ ecsTaskDefinitionFamily }: { ecsTaskDefinitionFamily: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to get ECS task definition with tags.');
    return this.#createClient()
      .send(new DescribeTaskDefinitionCommand({ taskDefinition: ecsTaskDefinitionFamily, include: ['TAGS'] }))
      .catch(errorHandler);
  };

  getService = async ({ serviceArn }: { serviceArn: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to get ECS Service information');
    const ecsClusterName = serviceArn.split('/')[1];
    const { services: [service] = [] } = await this.#createClient()
      .send(new DescribeServicesCommand({ services: [serviceArn], cluster: ecsClusterName }))
      .catch(errorHandler);
    return service;
  };

  registerTaskDefinition = async ({
    cloudformationEcsTaskDefinition
  }: {
    cloudformationEcsTaskDefinition: TaskDefinition;
  }) => {
    const errorHandler = this.#getErrorHandler('Failed to register new ECS task definition.');
    const lowerCasedProps = serialize(lowerCaseFirstCharacterOfObjectKeys(cloudformationEcsTaskDefinition.Properties));
    return (await this.#createClient().send(new RegisterTaskDefinitionCommand(lowerCasedProps)).catch(errorHandler))
      .taskDefinition;
  };

  startCodeDeployUpdate = async (parameters: CreateDeploymentCommandInput) => {
    const errorHandler = this.#getErrorHandler('Failed to start the update of ECS service (using CodeDeploy).');
    return this.#createCodeDeployClient()
      .send(new CreateDeploymentCommand({ ...parameters }))
      .catch(errorHandler);
  };

  waitForCodeDeployUpdate = async ({ deploymentId }: { deploymentId: string }) => {
    const errorHandler = this.#getErrorHandler(`CodeDeploy ECS service deployment ${deploymentId} failed.`);

    await waitUntilDeploymentSuccessful(
      { client: this.#createCodeDeployClient(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
      { deploymentId }
    ).catch((error) => {
      let errorToReport = error;
      try {
        const parsedError = JSON.parse(`${error}`.slice(7));
        if (parsedError.result.reason.deploymentInfo.errorInformation) {
          errorToReport = new Error(
            `[${parsedError.result.reason.deploymentInfo.errorInformation.code}]: ${parsedError.result.reason.deploymentInfo.errorInformation.message}`
          );
        }
      } catch {}
      errorHandler(errorToReport);
    });
  };

  startRollingUpdate = async (parameters: UpdateServiceCommandInput) => {
    const errorHandler = this.#getErrorHandler('Failed to start the update of ECS service.');
    await this.#createClient()
      .send(new UpdateServiceCommand({ ...parameters }))
      .catch(errorHandler);
  };

  waitForRollingUpdate = async ({ ecsServiceArn }: { ecsServiceArn: string }) => {
    const errorHandler = this.#getErrorHandler(`ECS service ${ecsServiceArn} failed to update.`);
    let targetDeploymentId: string;
    await wait(2000);
    const ecsClusterName = ecsServiceArn.split('/')[1];
    const waiterInput: DescribeServicesCommandInput = { services: [ecsServiceArn], cluster: ecsClusterName };
    const waiterResult = await createWaiter(
      { client: this.#createClient(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
      waiterInput,
      async (ecsClient, input) => {
        const serviceState = await ecsClient.send(new DescribeServicesCommand(input));
        const targetedDeployment = targetDeploymentId
          ? serviceState.services[0].deployments.find(({ id }) => id === targetDeploymentId)
          : serviceState.services[0].deployments.find(({ status }) => status === 'PRIMARY');

        if (!targetedDeployment) {
          return {
            state: WaiterState.RETRY,
            reason: `ECS service ${ecsServiceArn} update in progress.`
          };
        }
        targetDeploymentId = targetedDeployment.id;

        const failure =
          (targetedDeployment.rolloutState === DeploymentRolloutState.FAILED
            ? targetedDeployment.rolloutStateReason
            : undefined) ||
          serviceState.failures?.find(({ reason }) => reason === 'MISSING')?.detail ||
          serviceState.services?.find(({ status }) => status === 'DRAINING')?.status ||
          serviceState.services?.find(({ status }) => status === 'INACTIVE')?.status;

        if (failure) {
          return {
            state: WaiterState.FAILURE,
            reason: `ECS service ${ecsServiceArn} failed to update. Reason: ${failure}`
          };
        }

        if (targetedDeployment.desiredCount && targetedDeployment.runningCount === targetedDeployment.desiredCount) {
          return {
            state: WaiterState.SUCCESS,
            reason: `ECS service ${ecsServiceArn} updated successfully.`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: `ECS service ${ecsServiceArn} update in progress.`
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errorHandler(new Error(waiterResult.reason));
    }
  };

  startExecSession = async (startSessionInput: ExecuteCommandCommandInput) => {
    const errorHandler = this.#getErrorHandler('Unable to start container session');
    const {
      session: { sessionId, streamUrl, tokenValue }
    } = await this.#createClient()
      .send(new ExecuteCommandCommand(startSessionInput))
      .catch((error) => {
        if (
          `${error}`.includes(
            'The execute command failed because execute command was not enabled when the task was run'
          )
        ) {
          return errorHandler(
            new Error(
              'Container sessions are not enabled for this workload. Please set `enableRemoteSessions: true` on your container service definition.'
            )
          );
        }
        return errorHandler(error);
      });
    return { SessionId: sessionId, StreamUrl: streamUrl, TokenValue: tokenValue } as StartSessionResponse;
  };

  listTasks = async ({ ecsClusterName, desiredStatus }: { ecsClusterName: string; desiredStatus?: DesiredStatus }) => {
    const taskArnsList: string[] = [];
    let { nextToken, taskArns } = await this.#createClient().send(
      new ListTasksCommand({ cluster: ecsClusterName, desiredStatus })
    );
    taskArnsList.push(...taskArns);
    while (nextToken) {
      ({ nextToken, taskArns } = await this.#createClient().send(
        new ListTasksCommand({ cluster: ecsClusterName, nextToken, desiredStatus })
      ));
      taskArnsList.push(...taskArns);
    }
    return (
      await Promise.all(
        chunkArray(taskArnsList, 100).map(async (chunk) =>
          this.#createClient().send(new DescribeTasksCommand({ tasks: chunk, cluster: ecsClusterName }))
        )
      )
    )
      .flat()
      .map(({ tasks }) => tasks)
      .flat();
  };
}
