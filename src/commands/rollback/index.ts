import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';

import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandRollback = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: true,
    commandRequiresConfig: false
  });

  const stackName = globalStateManager.targetStack.stackName;
  const spinner = tuiManager.createSpinner({ text: `Rolling back stack ${tuiManager.prettyStackName(stackName)}` });

  try {
    await stackManager.rollbackStack();
    spinner.success({ text: `Stack ${tuiManager.prettyStackName(stackName)} rolled back` });
  } catch (error) {
    spinner.error(`Rollback failed for ${stackName}`);
    throw error;
  }

  const cleanupSpinner = tuiManager.createSpinner({ text: 'Cleaning up rolled-back deployment artifacts' });
  try {
    await deploymentArtifactManager.deleteArtifactsRollbackedDeploy();
    cleanupSpinner.success({ text: 'Cleaned up rolled-back deployment artifacts' });
  } catch (error) {
    cleanupSpinner.error('Failed to clean up deployment artifacts');
    throw error;
  }

  return null;
};
