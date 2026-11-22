import type { StacktapeCliArgs } from 'src/config/cli/types';
import { tuiManager } from '@application-services/tui-manager';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { runEcsExecCommand } from '@utils/ssm-session';
import { containerErrors } from '../_utils/container-errors';
import { isServiceTask, resolveDeployedEcsService } from '../_utils/deployed-ecs-service';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

type ContainerExecArgs = StacktapeCliArgs & { taskArn?: string };

export const commandContainerExec = async () => {
  const { args: capturedArgs } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });
  const args = capturedArgs as ContainerExecArgs;

  const { command, resourceName } = args;

  const { task, containerName, clusterArn } = await resolveTargetContainer({ args });

  const result = await runEcsExecCommand({
    clusterArn,
    taskArn: task.taskArn,
    containerName,
    command
  });

  tuiManager.info(
    JSON.stringify(
      {
        resourceName,
        containerName,
        taskArn: task.taskArn,
        command,
        output: result.output,
        exitCode: result.exitCode
      },
      null,
      2
    )
  );
  if (result.exitCode === null) {
    throw new CliError({
      category: 'AWS',
      code: 'CONTAINER_EXEC_FAILED',
      message:
        'The command did not report an exit code: the container exec session failed or the container has no `/bin/sh`.',
      hints: 'Check the session output above. `container exec` runs the command with `/bin/sh -c`.'
    });
  }
  if (result.exitCode !== 0) {
    throw new CliError({
      category: 'AWS',
      code: 'CONTAINER_EXEC_FAILED',
      message: `The command exited with code ${result.exitCode}.`,
      hints: 'Check the command output above.'
    });
  }
};

const resolveTargetContainer = async ({ args }: { args: ContainerExecArgs }) => {
  const { resourceName, container, taskArn: specifiedTaskArn } = args;

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

  // Use specified taskArn if provided
  if (specifiedTaskArn) {
    const matchingTask = tasks.find(
      (t) => t.taskArn === specifiedTaskArn || t.taskArn.endsWith(`/${specifiedTaskArn}`)
    );
    if (!matchingTask) {
      throw new CliError({
        category: 'NON_EXISTING_RESOURCE',
        code: 'CONTAINER_TASK_NOT_FOUND',
        message: `Task \`${specifiedTaskArn}\` was not found.`,
        hints: `Available tasks: ${tasks.map((task) => `\`${task.taskArn.split('/').pop()}\``).join(', ')}.`
      });
    }
    taskArn = matchingTask.taskArn;
  }

  const task = tasks.find(({ taskArn: tArn }) => tArn === taskArn);
  return { task, containerName: container || containersInTaskDefinition[0], clusterArn };
};
