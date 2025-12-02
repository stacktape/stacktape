import type { StackEvent } from '@aws-sdk/client-cloudformation';
import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
// import { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { Deployment, Task, TaskSet } from '@aws-sdk/client-ecs';
import type { AwsSdkManager } from './sdk-manager';
import { ResourceStatus } from '@aws-sdk/client-cloudformation';
import { DeploymentControllerType, DesiredStatus } from '@aws-sdk/client-ecs';
import { consoleLinks } from '@shared/naming/console-links';
import { splitStringIntoLines, wait } from '@shared/utils/misc';

export class EcsServiceDeploymentStatusPoller {
  #serviceArn: string;
  #pollerPrintName?: string;
  #clusterName: string;
  #awsSdkManager: AwsSdkManager;
  #targetDeploymentOrTaskSet: Deployment | TaskSet;
  #pollInterval: NodeJS.Timeout;
  #inspectDeploymentsCreatedAfterDate: Date;
  #pollInProgress = false;
  #printer?: Printer;
  #failedTask: Task;
  #failedContainersDetail: {
    name: string;
    healthStatus: string;
    exitCode: number;
    reason: string;
    logStreamLink: string;
    logs: FilteredLogEvent[];
  }[] = [];

  #warnMessagePrinted = false;

  constructor({
    ecsServiceArn,
    pollerPrintName,
    awsSdkManager,
    inspectDeploymentsCreatedAfterDate
  }: {
    ecsServiceArn: string;
    pollerPrintName?: string;
    awsSdkManager: AwsSdkManager;
    inspectDeploymentsCreatedAfterDate?: Date;
  }) {
    this.#serviceArn = ecsServiceArn;
    this.#clusterName = ecsServiceArn.split('/')[1];
    this.#awsSdkManager = awsSdkManager;
    this.#printer = this.#awsSdkManager.printer;
    this.#pollerPrintName = pollerPrintName || this.#serviceArn.split('/').at(-1);
    this.#pollInterval = setInterval(this.#pollStatus, 4000);
    this.#inspectDeploymentsCreatedAfterDate = inspectDeploymentsCreatedAfterDate || new Date(Date.now() - 30000);
  }

  // get pollingFinished() {
  //   return this.#failedTask && !this.#pollInProgress;
  // }

  #pollStatus = async () => {
    if (this.#pollInProgress || this.#warnMessagePrinted) {
      return;
    }

    this.#pollInProgress = true;

    // if we already found failed task, we stop polling
    if (this.#failedTask) {
      this.stopPolling();
      this.#pollInProgress = false;
      this.printWarningMessage();
      return;
    }

    const service = await this.#awsSdkManager.getEcsService({ serviceArn: this.#serviceArn });

    this.#targetDeploymentOrTaskSet =
      service.deploymentController?.type === DeploymentControllerType.CODE_DEPLOY
        ? service.taskSets?.find(
            ({ createdAt, status }) =>
              status === 'ACTIVE' && new Date(createdAt) > this.#inspectDeploymentsCreatedAfterDate
          )
        : service.deployments?.find(
            ({ status, createdAt }) =>
              status === 'PRIMARY' && new Date(createdAt) > this.#inspectDeploymentsCreatedAfterDate
          );

    if (this.#targetDeploymentOrTaskSet) {
      const tasks = await this.#awsSdkManager.listEcsTasks({
        ecsClusterName: this.#clusterName,
        desiredStatus: DesiredStatus.STOPPED
      });
      this.#failedTask = tasks.find(
        ({ createdAt }) => new Date(createdAt) > new Date(this.#targetDeploymentOrTaskSet.createdAt)
      );
      // inspecting failed task
      if (this.#failedTask) {
        // wait for logs to be delivered and other things before inspecting
        await wait(20000);
        const { taskDefinition } = await this.#awsSdkManager.getEcsTaskDefinition({
          ecsTaskDefinitionFamily: this.#failedTask.taskDefinitionArn
        });
        const essentialContainers = taskDefinition.containerDefinitions
          .filter(({ essential }) => essential)
          .map(({ name }) => name);
        await Promise.all(
          this.#failedTask.containers
            .filter(({ name }) => essentialContainers.includes(name))
            .map(async (failedContainerInfo) => {
              const { name, healthStatus, exitCode, reason, runtimeId } = failedContainerInfo;
              const logGroupName = taskDefinition.containerDefinitions.find(({ name: tdName }) => tdName === name)
                .logConfiguration?.options?.['awslogs-group'];
              const logStreamName = logGroupName && runtimeId ? `ecs/${name}/${runtimeId.split('-')[0]}` : undefined;
              const logs =
                logGroupName && logStreamName
                  ? await this.#awsSdkManager.getLogEvents({ logGroupName, logStreamNames: [logStreamName] })
                  : undefined;
              this.#failedContainersDetail.push({
                name,
                healthStatus,
                exitCode,
                reason,
                logs,
                logStreamLink:
                  logGroupName && logStreamName
                    ? consoleLinks.logStream(this.#awsSdkManager.region, logGroupName, logStreamName)
                    : undefined
              });
            })
        );
      }
    }
    this.#pollInProgress = false;
  };

  getFailureMessage() {
    if (this.#printer && this.#failedTask && !this.#pollInProgress) {
      const failedTaskId = this.#failedTask.taskArn.split('/').at(-1);
      let message = `${this.#printer.colorize('gray', `${'˅'.repeat(120)}\n`)}[${this.#printer.colorize(
        'red',
        this.#pollerPrintName
      )}] - ${this.#printer.colorize(
        'yellow',
        'There seems to be a problem when starting the task.'
      )}\n${this.#printer.makeBold('Reason: ')}${this.#printer.colorize(
        'gray',
        this.#failedTask.stoppedReason
      )}${this.#printer.colorize('gray', `\n${'^'.repeat(120)}\n`)}`;
      const containersMessage = this.#failedContainersDetail
        // .filter(({ exitCode }) => Number.isInteger(exitCode))
        .map(({ name, exitCode, reason, logStreamLink, logs }) => {
          const stringifiedLogs =
            logs?.length &&
            logs
              .map(
                ({ timestamp, message: logMessage }) =>
                  `${this.#printer.colorize(
                    'gray',
                    `[${new Date(timestamp).toTimeString().split(' ')[0]}]`
                  )}: ${this.#printer.colorize('cyan', logMessage)}`
              )
              .join('\n');
          return `** Container${
            (this.#failedTask.containers || []).length > 1 ? ` ${this.#printer.makeBold(name)}` : ''
          } ${Number.isInteger(exitCode) ? `is exiting with exitcode ${this.#printer.makeBold(exitCode)}` : 'failure'}${reason ? ` (${reason})` : ''}. **${
            stringifiedLogs
              ? `\n${this.#printer.colorize('blue', 'Container logs:')}\n${
                  stringifiedLogs.length > 2000
                    ? `${this.#printer.colorize('gray', '...')}\n${stringifiedLogs.slice(
                        -2000
                      )}\n${this.#printer.colorize('gray', '...')}\n${this.#printer.terminalLink(
                        logStreamLink,
                        'See logs here'
                      )}`
                    : stringifiedLogs
                }`
              : ''
          }\nSee more information about the failing container in\n${this.#printer.terminalLink(
            consoleLinks.ecsTask({
              clusterName: this.#clusterName,
              region: this.#awsSdkManager.region,
              taskId: failedTaskId,
              selectedContainer: name
            }),
            'AWS console'
          )}`;
        })
        .join(`\n${'-'.repeat(30)}\n`);
      message = message.concat(containersMessage);
      return splitStringIntoLines(message, 160, 40).join('\n');
    }
  }

  printWarningMessage = () => {
    if (this.#printer) {
      this.#printer.warn(`${this.getFailureMessage()}`);
      this.#printer.hint(
        'Information about failed containers/tasks is only available temporary during deployment.\nAfter deployment fails and rolls-back the information will not be available'
      );
      this.#warnMessagePrinted = true;
    }
  };

  stopPolling = () => {
    clearInterval(this.#pollInterval);
  };
}

export const isEcsServiceCreateOrUpdateCloudformationEvent = (stackEvent: StackEvent) =>
  (stackEvent.ResourceType === 'AWS::ECS::Service' ||
    stackEvent.ResourceType === 'Stacktape::ECSBlueGreenV1::Service') &&
  (stackEvent.ResourceStatus === ResourceStatus.CREATE_IN_PROGRESS ||
    stackEvent.ResourceStatus === ResourceStatus.ROLLBACK_IN_PROGRESS ||
    stackEvent.ResourceStatus === ResourceStatus.UPDATE_IN_PROGRESS) &&
  Boolean(stackEvent.PhysicalResourceId);
