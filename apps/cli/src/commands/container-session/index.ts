import { tuiManager } from '@application-services/tui-manager';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { runEcsExecSsmShellSession } from '@utils/ssm-session';
import { containerErrors } from '../_utils/container-errors';
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
  const workloadInfo = deployedStackOverviewManager.deployedWorkloadsWithEcsTaskDefinition.find(
    ({ nameChain }) => nameChain[0] === resourceName
  );
  if (!workloadInfo) {
    throw containerErrors.invalidResource(resourceName);
  }
  const ecsServiceCfLogicalName = Object.entries(workloadInfo.resource.cloudformationChildResources).find(
    ([, { cloudformationResourceType }]) => {
      return (
        cloudformationResourceType === 'AWS::ECS::Service' ||
        cloudformationResourceType === 'Stacktape::ECSBlueGreenV1::Service'
      );
    }
  )[0];

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
    throw containerErrors.selectionRequired({ resourceName, availableContainers: containersInTaskDefinition });
  }

  const tasks = await awsSdkManager.ecs.listTasks({
    ecsClusterName: clusterArn,
    desiredStatus: DesiredStatus.RUNNING
  });

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
