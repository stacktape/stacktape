import { ECSClient, UpdateCapacityProviderCommand } from '@aws-sdk/client-ecs';

const ecsClient = new ECSClient({});

export const disableEcsManagedTerminationProtection: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['disableEcsManagedTerminationProtection']
> = async (currentProps, _previousProps, operation, _physicalResourceId) => {
  if (operation === 'Delete') {
    const capacityProviderName =
      typeof currentProps.capacityProviderName === 'string' ? currentProps.capacityProviderName.trim() : '';
    if (!capacityProviderName) {
      console.info('No capacity provider name provided, skipping disabling managed termination protection.');
      return { data: {}, physicalResourceId: 'unknown-dmtp' };
    }
    console.info(`Disabling managed termination protection for capacity provider: ${capacityProviderName}`);
    await ecsClient.send(
      new UpdateCapacityProviderCommand({
        name: capacityProviderName,
        autoScalingGroupProvider: {
          managedTerminationProtection: 'DISABLED'
        }
      })
    );
    console.info(`Successfully disabled managed termination protection for capacity provider: ${capacityProviderName}`);
  }
  return { data: {}, physicalResourceId: `${currentProps.capacityProviderName}-dmtp` };
};
