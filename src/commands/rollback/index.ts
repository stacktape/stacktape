import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';

import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandRollback = async (): Promise<RollbackReturnValue> => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: true,
    commandRequiresConfig: false
  });

  await stackManager.rollbackStack();
  await deploymentArtifactManager.deleteArtifactsRollbackedDeploy();

  // @todo-return-value
  return null;
};
