import { ExpectedError } from '@utils/errors';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { initializeDeleteOperation } from '../_utils/initialization';

type DeleteOperation = Awaited<ReturnType<typeof initializeDeleteOperation>>;

type DeleteExecutionOperation = {
  config: Pick<DeleteOperation['config'], 'config' | 'hooks'>;
  deploymentArtifacts: { deleteAllArtifacts: () => Promise<unknown> };
  event: Pick<DeleteOperation['event'], 'processHooks' | 'registerHooks' | 'setPhase'>;
  notification: Pick<DeleteOperation['notification'], 'sendDeploymentNotification'>;
  stack: {
    deleteStack: () => Promise<unknown>;
    existingStackDetails: { EnableTerminationProtection?: boolean };
  };
  stackName: string;
  tui: Pick<DeleteOperation['tui'], 'colorize' | 'setPendingCompletion'>;
};

export const commandDelete = async () => {
  const { application, config, deploymentArtifacts, event, notification, stack, stackContext, template, tui } =
    await initializeDeleteOperation();

  await config.loadGlobalConfig();
  config.validateGuardrails({ hasConfig: !!config.config });
  await notification.init();

  const stackName = stackContext.stackName;

  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff: template.getOldTemplateDiff() });
  if (abort) {
    await application.handleExitSignal('SIGINT');
    return;
  }

  return executeDeleteOperation({ config, deploymentArtifacts, event, notification, stack, stackName, tui });
};

export const executeDeleteOperation = async ({
  config,
  deploymentArtifacts,
  event,
  notification,
  stack,
  stackName,
  tui
}: DeleteExecutionOperation) => {
  event.setPhase('DEPLOY');

  if (stack.existingStackDetails.EnableTerminationProtection) {
    throw new ExpectedError(
      'STACK',
      `Unable to delete stack "${tui.colorize('red', stackName)}". Termination protection is enabled on the stack.`,
      `To disable termination protection, you first need to deploy(update) stack with ${tui.colorize(
        'blue',
        'terminationProtection'
      )} property set to false.`
    );
  }

  await notification.sendDeploymentNotification({
    message: { text: `Deleting stack ${stackName}.`, type: 'progress' }
  });

  if (config.config) {
    await event.registerHooks(config.hooks);
    await event.processHooks({ captureType: 'START' });
  }
  await deploymentArtifacts.deleteAllArtifacts();
  await stack.deleteStack();

  await notification.sendDeploymentNotification({
    message: { text: `Stack ${stackName} deleted successfully.`, type: 'success' }
  });

  tui.setPendingCompletion({
    success: true,
    message: 'DELETION SUCCESSFUL',
    links: [],
    consoleUrl: undefined
  });

  // @todo-return-value
  return null;
};
