import { tuiManager } from '@application-services/tui-manager';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { runEcsExecSsmShellSession } from '@utils/ssm-session';
import { CliError } from '@utils/errors';
import { containerErrors } from '../_utils/container-errors';
import { isServiceTask, resolveDeployedEcsService } from '../_utils/deployed-ecs-service';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandContainerSession = async () => {
  const { args, stackContext } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { command, container, resourceName } = args;
  const { task, containerName } = await resolveTargetContainer({ container, resourceName });

  await runEcsExecSsmShellSession({
    task,
    containerName,
    region: stackContext.region,
    command
  });
};

const resolveTargetContainer = async ({ resourceName, container }: { resourceName: string; container?: string }) => {
  const {
    clusterArn,
    serviceName,
    containerNames: containersInTaskDefinition
  } = resolveDeployedEcsService(resourceName);
  if (
    (containersInTaskDefinition.length > 1 && !container) ||
    (container && !containersInTaskDefinition.includes(container))
  ) {
    throw containerErrors.selectionRequired({ resourceName, availableContainers: containersInTaskDefinition });
  }

  const tasks = (
    await awsSdkManager.ecs.listTasks({
      ecsClusterName: clusterArn,
      desiredStatus: DesiredStatus.RUNNING
    })
  ).filter((task) => isServiceTask(task, serviceName));

  if (tasks.length === 0) {
    throw new CliError({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_TASK_NOT_RUNNING',
      message: `No running task was found for resource \`${resourceName}\`.`,
      hints: 'Wait for a task to start or check the ECS service status.'
    });
  }

  let taskArn = tasks[0]?.taskArn;
  if (tasks.length > 1) {
    taskArn = await tuiManager.promptSelect({
      message: 'There are multiple instances running. Please select the one you want to connect to.',
      options: tasks
        .sort((t1, t2) => t1.taskArn.localeCompare(t2.taskArn))
        .map(({ taskArn: ta, startedAt }) => ({
          label: `${ta.split('/').pop()} (started at: ${startedAt})`,
          value: ta
        }))
    });
  }
  tuiManager.debug(JSON.stringify(tasks, null, 2));
  const task = tasks.find(({ taskArn: tArn }) => tArn === taskArn);
  return { task, containerName: container || containersInTaskDefinition[0] };
};
