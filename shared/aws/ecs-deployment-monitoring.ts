import type { StackEvent } from '@aws-sdk/client-cloudformation';
import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
// import { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { Deployment, Task, TaskSet } from '@aws-sdk/client-ecs';
import type { AwsSdkManager } from './sdk-manager';
import { ResourceStatus } from '@aws-sdk/client-cloudformation';
import { DeploymentControllerType, DesiredStatus } from '@aws-sdk/client-ecs';
import { consoleLinks } from '@shared/naming/console-links';
import { wait } from '@shared/utils/misc';

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

  /**
   * Formats the failure message for display.
   * Returns a clean, readable error message focused on actionable information.
   */
  getFailureMessage() {
    if (!this.#printer || !this.#failedTask || this.#pollInProgress) {
      return undefined;
    }

    const failedTaskId = this.#failedTask.taskArn.split('/').at(-1);
    const lines: string[] = [];

    // Container failure details
    for (const { name, exitCode, reason, logStreamLink, logs } of this.#failedContainersDetail) {
      const hasMultipleContainers = (this.#failedTask.containers || []).length > 1;

      // Exit code info
      if (Number.isInteger(exitCode)) {
        const containerLabel = hasMultipleContainers ? `Container ${this.#printer.makeBold(name)} exited` : 'Exited';
        lines.push(`${containerLabel} with code ${this.#printer.colorize('red', String(exitCode))}${reason ? ` (${reason})` : ''}`);
      } else if (reason) {
        const containerLabel = hasMultipleContainers ? `Container ${this.#printer.makeBold(name)}` : 'Container';
        lines.push(`${containerLabel} failed: ${reason}`);
      }

      // Container logs - filter noise and show only relevant lines
      if (logs?.length) {
        const relevantLogs = this.#filterRelevantLogs(logs);
        if (relevantLogs.length > 0) {
          lines.push('');
          lines.push(this.#printer.colorize('gray', 'Last logs before exit:'));

          // Limit to last 15 relevant log lines
          const logsToShow = relevantLogs.slice(-15);
          for (const { timestamp, message: logMessage } of logsToShow) {
            const time = new Date(timestamp).toTimeString().split(' ')[0];
            const trimmedMessage = logMessage.trim();
            lines.push(`  ${this.#printer.colorize('gray', time)} ${trimmedMessage}`);
          }

          if (relevantLogs.length > 15) {
            lines.push(`  ${this.#printer.colorize('gray', `... ${relevantLogs.length - 15} earlier lines omitted`)}`);
          }
        }
      }

      // AWS Console links
      lines.push('');
      const taskLink = consoleLinks.ecsTask({
        clusterName: this.#clusterName,
        region: this.#awsSdkManager.region,
        taskId: failedTaskId,
        selectedContainer: name
      });
      lines.push(`${this.#printer.colorize('gray', 'Task details:')} ${this.#printer.terminalLink(taskLink, taskLink)}`);
      if (logStreamLink) {
        lines.push(`${this.#printer.colorize('gray', 'Full logs:')} ${this.#printer.terminalLink(logStreamLink, logStreamLink)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Filters out noisy log messages that aren't useful for debugging.
   * Keeps error messages, stack traces, and startup failures.
   */
  #filterRelevantLogs(logs: FilteredLogEvent[]): FilteredLogEvent[] {
    const noisePatterns = [
      /DeprecationWarning/i,
      /ExperimentalWarning/i,
      /\(Use `node --trace/i,
      /FastifyWarning.*deprecated/i,
      /Server listening at http:\/\/127\.0\.0\.1/i,
      /Server listening at http:\/\/169\.254/i, // AWS metadata IP
      /Server listening at http:\/\/172\./i // Internal Docker IPs
    ];

    return logs.filter(({ message }) => {
      if (!message) return false;
      // Always keep error-related messages
      if (/error|exception|fatal|failed|crash/i.test(message)) return true;
      if (/^\s+at\s+/.test(message)) return true; // Stack trace lines
      // Filter out noise
      return !noisePatterns.some((pattern) => pattern.test(message));
    });
  }

  printWarningMessage = () => {
    if (this.#printer) {
      const failureMessage = this.getFailureMessage();
      if (failureMessage) {
        this.#printer.warn(`[${this.#pollerPrintName}] Container startup failed\n${failureMessage}`);
        this.#printer.hint('Task logs are only available during deployment. Save the links above if needed.');
      }
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
