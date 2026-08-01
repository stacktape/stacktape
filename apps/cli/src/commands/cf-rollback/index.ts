import { initializeCloudFormationRollbackOperation } from '../_utils/initialization';

export const commandCfRollback = async () => {
  const { deploymentArtifacts, stack, stackContext, tui } = await initializeCloudFormationRollbackOperation();

  const stackName = stackContext.stackName;
  const spinner = tui.createSpinner({ text: `Rolling back stack ${tui.prettyStackName(stackName)}` });

  try {
    await stack.rollbackStack();
    spinner.success({ text: `Stack ${tui.prettyStackName(stackName)} rolled back` });
  } catch (error) {
    spinner.error(`Rollback failed for ${stackName}`);
    throw error;
  }

  const cleanupSpinner = tui.createSpinner({ text: 'Cleaning up rolled-back deployment artifacts' });
  try {
    await deploymentArtifacts.deleteArtifactsRollbackedDeploy();
    cleanupSpinner.success({ text: 'Cleaned up rolled-back deployment artifacts' });
  } catch (error) {
    cleanupSpinner.error('Failed to clean up deployment artifacts');
    throw error;
  }

  return null;
};
