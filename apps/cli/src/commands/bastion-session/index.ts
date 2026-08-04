import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { runBastionSsmShellSession } from '@utils/ssm-session';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandBastionSession = async () => {
  const { args, stackContext } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { bastionResource } = args;

  const { bastionInstanceId } = deployedStackOverviewManager.resolveBastionInstanceInfo(bastionResource);

  await runBastionSsmShellSession({
    instanceId: bastionInstanceId,
    region: stackContext.region
  });
};
