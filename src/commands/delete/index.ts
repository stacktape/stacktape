import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { templateManager } from '@domain-services/template-manager';
import { ExpectedError } from '@utils/errors';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandDelete = async (): Promise<DeleteReturnValue> => {
  // Set up TUI for delete operation BEFORE initialization (simplified phases: Initialize, Delete)
  tuiManager.configureForDelete();
  tuiManager.setHeader({
    action: 'DELETING',
    projectName: globalStateManager.args.projectName || 'project',
    stageName: globalStateManager.stage || 'stage',
    region: globalStateManager.region || 'region'
  });
  eventManager.setPhase('INITIALIZE');

  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: true,
    commandRequiresConfig: false
  });

  // Update header with actual values now that we have them
  tuiManager.setHeader({
    action: 'DELETING',
    projectName: globalStateManager.targetStack.projectName,
    stageName: globalStateManager.targetStack.stage,
    region: globalStateManager.region
  });

  await configManager.loadGlobalConfig();
  await notificationManager.init(configManager.deploymentNotifications);

  const stackName = globalStateManager.targetStack.stackName;

  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff: templateManager.getOldTemplateDiff() });
  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return;
  }

  eventManager.setPhase('DEPLOY');

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

  tuiManager.setPendingCompletion({
    success: true,
    message: 'DELETION SUCCESSFUL',
    links: [],
    consoleUrl: undefined
  });

  // @todo-return-value
  return null;
};
