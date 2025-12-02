import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { runBastionSsmShellSession } from '@utils/ssm-session';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandBastionSession = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { bastionResource } = globalStateManager.args;

  const { bastionInstanceId } = deployedStackOverviewManager.resolveBastionInstanceInfo(bastionResource);

  await runBastionSsmShellSession({
    instanceId: bastionInstanceId,
    region: globalStateManager.region
  });
};
