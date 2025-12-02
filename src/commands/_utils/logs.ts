import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getSimpleServiceDefaultContainerName } from '@shared/naming/utils';
import { ExpectedError } from '@utils/errors';

export const getLogGroupInfoForStacktapeResource = ({
  resourceName,
  containerName
}: {
  resourceName: string;
  containerName?: string;
}) => {
  const existingResource = deployedStackOverviewManager.getStpResource({ nameChain: [resourceName] });
  if (!existingResource) {
    // throw error
  }
  const logGroupAwsResourceName =
    existingResource.resourceType === 'web-service' ||
    existingResource.resourceType === 'private-service' ||
    existingResource.resourceType === 'worker-service'
      ? awsResourceNames.containerLogGroup({
          stackName: globalStateManager.targetStack.stackName,
          stpResourceName: resourceName,
          containerName: getSimpleServiceDefaultContainerName()
        })
      : existingResource.resourceType === 'multi-container-workload'
        ? awsResourceNames.containerLogGroup({
            stackName: globalStateManager.targetStack.stackName,
            stpResourceName: resourceName,
            containerName
          })
        : existingResource.resourceType === 'batch-job'
          ? awsResourceNames.batchJobLogGroup({
              stackName: globalStateManager.targetStack.stackName,
              stpResourceName: resourceName
            })
          : awsResourceNames.lambdaLogGroup({
              lambdaAwsResourceName: awsResourceNames.lambda(resourceName, globalStateManager.targetStack.stackName)
            });

  const logGroup = stackManager.existingStackResources.find((resource) => {
    return resource.PhysicalResourceId === logGroupAwsResourceName;
  });

  if (!logGroup) {
    throw new ExpectedError('CONFIG', `No log group found for resource ${resourceName}`);
  }

  return logGroup;
};
