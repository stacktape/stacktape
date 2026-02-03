import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { runEcsExecCommand } from '@utils/ssm-session';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandDebugContainerExec = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { command, resourceName } = globalStateManager.args;

  if (!command) {
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --command',
      'Provide --command "<command to execute>" (e.g., --command "ls -la")'
    );
  }

  if (!resourceName) {
    throw new ExpectedError('CLI', 'Missing required flag: --resourceName', 'Provide --resourceName <service-name>');
  }

  const { task, containerName, clusterArn } = await resolveTargetContainer();

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
};

const resolveTargetContainer = async () => {
  const {
    resourceName,
    container,
    taskArn: specifiedTaskArn
  } = globalStateManager.args as StacktapeCliArgs & {
    taskArn?: string;
  };

  const workloadInfo = deployedStackOverviewManager.deployedWorkloadsWithEcsTaskDefinition.find(
    ({ nameChain }) => nameChain[0] === resourceName
  );
  if (!workloadInfo) {
    throw stpErrors.e119({ containerResourceName: resourceName });
  }

  const ecsServiceEntry = Object.entries(workloadInfo.resource.cloudformationChildResources).find(
    ([, { cloudformationResourceType }]) => {
      return (
        cloudformationResourceType === 'AWS::ECS::Service' ||
        cloudformationResourceType === 'Stacktape::ECSBlueGreenV1::Service'
      );
    }
  );

  if (!ecsServiceEntry) {
    throw new ExpectedError(
      'NON_EXISTING_RESOURCE',
      `Resource "${resourceName}" does not have a deployed ECS service`,
      'This resource may be a dev stack without running containers. Deploy a full stack to use this command.'
    );
  }

  const ecsServiceCfLogicalName = ecsServiceEntry[0];

  const {
    ecsServiceTaskDefinition,
    ecsService: { clusterArn }
  } = stackManager.existingStackResources.find(
    ({ LogicalResourceId }) => LogicalResourceId === ecsServiceCfLogicalName
  );

  const containersInTaskDefinition = ecsServiceTaskDefinition.containerDefinitions.map(({ name }) => name);

  if (
    (containersInTaskDefinition.length > 1 && !container) ||
    (container && !containersInTaskDefinition.includes(container))
  ) {
    throw stpErrors.e120({ containerResourceName: resourceName, availableContainers: containersInTaskDefinition });
  }

  const tasks = await awsSdkManager.listEcsTasks({
    ecsClusterName: clusterArn,
    desiredStatus: DesiredStatus.RUNNING
  });

  if (tasks.length === 0) {
    throw new ExpectedError(
      'NON_EXISTING_RESOURCE',
      'No running tasks found for this resource',
      'Wait for tasks to start or check the ECS service status'
    );
  }

  let taskArn = tasks[0]?.taskArn;

  // Use specified taskArn if provided
  if (specifiedTaskArn) {
    const matchingTask = tasks.find(
      (t) => t.taskArn === specifiedTaskArn || t.taskArn.endsWith(`/${specifiedTaskArn}`)
    );
    if (!matchingTask) {
      throw new ExpectedError(
        'NON_EXISTING_RESOURCE',
        `Task not found: ${specifiedTaskArn}`,
        `Available tasks: ${tasks.map((t) => t.taskArn.split('/').pop()).join(', ')}`
      );
    }
    taskArn = matchingTask.taskArn;
  }

  const task = tasks.find(({ taskArn: tArn }) => tArn === taskArn);
  return { task, containerName: container || containersInTaskDefinition[0], clusterArn };
};
