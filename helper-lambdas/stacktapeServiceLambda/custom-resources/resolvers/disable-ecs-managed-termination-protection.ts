import { ECSClient, UpdateCapacityProviderCommand } from '@aws-sdk/client-ecs';

const ecsClient = new ECSClient({});

export const disableEcsManagedTerminationProtection: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['disableEcsManagedTerminationProtection']
> = async (currentProps, _previousProps, operation, _physicalResourceId) => {
  if (operation === 'Delete') {
    console.info(
      `Disabling managed termination protection for capacity provider: ${currentProps.capacityProviderName}`
    );
    await ecsClient.send(
      new UpdateCapacityProviderCommand({
        name: currentProps.capacityProviderName as string,
        autoScalingGroupProvider: {
          managedTerminationProtection: 'DISABLED'
        }
      })
    );
    console.info(
      `Successfully disabled managed termination protection for capacity provider: ${currentProps.capacityProviderName}`
    );
  }
  return { data: {}, physicalResourceId: `${currentProps.capacityProviderName}-dmtp` };
};
