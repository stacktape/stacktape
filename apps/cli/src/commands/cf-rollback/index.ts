import { initializeCloudFormationRollbackOperation } from '../_utils/initialization';

type RollbackSpinner = {
  error: (text: string) => void;
  success: ({ text }: { text: string }) => void;
};

type CloudFormationRollbackExecutionOperation = {
  deploymentArtifacts: { deleteArtifactsRollbackedDeploy: () => Promise<unknown> };
  stack: { rollbackStack: () => Promise<unknown> };
  stackName: string;
  tui: {
    createSpinner: ({ text }: { text: string }) => RollbackSpinner;
    prettyStackName: (stackName: string) => string;
  };
};

export const commandCfRollback = async () => {
  const { deploymentArtifacts, stack, stackContext, tui } = await initializeCloudFormationRollbackOperation();

  return executeCloudFormationRollbackOperation({
    deploymentArtifacts,
    stack,
    stackName: stackContext.stackName,
    tui
  });
};

export const executeCloudFormationRollbackOperation = async ({
  deploymentArtifacts,
  stack,
  stackName,
  tui
}: CloudFormationRollbackExecutionOperation) => {
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
