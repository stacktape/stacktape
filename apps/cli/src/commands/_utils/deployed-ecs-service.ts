import type { Task } from '@aws-sdk/client-ecs';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { CliError } from '@utils/errors';
import { containerErrors } from './container-errors';

/** The deployed ECS service of a container resource (`web-service`, `private-service`, `worker-service` or `multi-container-workload`). */
export const resolveDeployedEcsService = (resourceName: string) => {
  const workloadInfo = deployedStackOverviewManager.deployedWorkloadsWithEcsTaskDefinition.find(
    ({ nameChain }) => nameChain[0] === resourceName
  );
  if (!workloadInfo) {
    throw containerErrors.invalidResource(resourceName);
  }
  const ecsServiceCfLogicalName = Object.entries(workloadInfo.resource.cloudformationChildResources).find(
    ([, { cloudformationResourceType }]) =>
      cloudformationResourceType === 'AWS::ECS::Service' ||
      cloudformationResourceType === 'Stacktape::ECSBlueGreenV1::Service'
  )?.[0];
  const stackResource =
    ecsServiceCfLogicalName &&
    stackManager.existingStackResources.find(({ LogicalResourceId }) => LogicalResourceId === ecsServiceCfLogicalName);
  if (!stackResource?.ecsService) {
    throw new CliError({
      category: 'NON_EXISTING_RESOURCE',
      code: 'CONTAINER_SERVICE_NOT_DEPLOYED',
      message: `Resource \`${resourceName}\` does not have a deployed ECS service.`,
      hints: 'The resource may be a dev stack without running containers. Deploy a full stack to use this command.'
    });
  }
  const { clusterArn, serviceName } = stackResource.ecsService;
  return {
    clusterArn,
    clusterName: clusterArn.split('/').pop(),
    serviceName,
    containerNames: (stackResource.ecsServiceTaskDefinition?.containerDefinitions ?? []).map(({ name }) => name)
  };
};

/** The workload's cluster also runs one-off tasks, such as release commands; only the service's own tasks are targets. */
export const isServiceTask = (task: Task, serviceName: string) => task.group === `service:${serviceName}`;
