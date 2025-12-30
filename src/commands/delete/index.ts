import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { templateManager } from '@domain-services/template-manager';
import { ExpectedError } from '@utils/errors';
import { tuiManager } from '@utils/tui';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandDelete = async (): Promise<DeleteReturnValue> => {
  // await loadUserCredentials();
  // await recordStackOperationStart(globalStateManager.args.stackName);
  // const stackName = await getStackNameForCommandConditionallyRequiringConfig();

  // await settleAllBeforeThrowing([
  //   startStackOperationRecording({ stackName }),
  //   stackManager.init({
  //     stackName,
  //     commandModifiesStack: true,
  //     commandRequiresDeployedStack: true
  //   })
  // ]);
  // await Promise.all([
  //   deployedStackOverviewManager.init({
  //     stackDetails: stackManager.existingStackDetails,
  //     stackResources: stackManager.existingStackResources
  //   }),
  //   calculatedStackOverviewManager.init(),

  //   templateManager.init({ stackDetails: stackManager.existingStackDetails })
  // ]);

  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: true,
    commandRequiresConfig: false
  });

  await configManager.loadGlobalConfig();
  await notificationManager.init(configManager.deploymentNotifications);

  const stackName = globalStateManager.targetStack.stackName;

  // await Promise.all([
  //   templateManager.init({ stackDetails: stackManager.existingStackDetails }),
  //   deploymentArtifactManager.init({
  //     globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
  //     accountId: globalStateManager.targetAwsAccount.awsAccountId,
  //     stackActionType: 'delete'
  //   })
  // ]);

  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff: templateManager.getOldTemplateDiff() });
  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return;
  }

  if (stackManager.existingStackDetails.EnableTerminationProtection) {
    throw new ExpectedError(
      'STACK',
      `Unable to delete stack "${tuiManager.colorize('red', stackName)}". Termination protection is enabled on the stack.`,
      `To disable termination protection, you first need to deploy(update) stack with ${tuiManager.colorize(
        'blue',
        'terminationProtection'
      )} property set to false.`
    );
  }

  await notificationManager.sendDeploymentNotification({
    message: { text: `Deleting stack ${stackName}.`, type: 'progress' }
  });

  if (configManager.config) {
    await eventManager.registerHooks(configManager.hooks);
    await eventManager.processHooks({ captureType: 'START' });
  }
  await deploymentArtifactManager.deleteAllArtifacts();
  await stackManager.deleteStack();

  await notificationManager.sendDeploymentNotification({
    message: { text: `Stack ${stackName} deleted successfully.`, type: 'success' }
  });

  tuiManager.success(`Successfully deleted stack ${stackName}.`);

  // @todo-return-value
  return null;
};
