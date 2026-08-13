import { ExpectedError } from '@utils/errors';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { initializeDeleteOperation } from '../_utils/initialization';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';

type DeleteOperation = Awaited<ReturnType<typeof initializeDeleteOperation>>;
type RetainedSharedResource = { kind: string; identity: string; stackName: string };

const parseRetainedSharedResources = (serialized: string): RetainedSharedResource[] | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (entry): entry is RetainedSharedResource =>
        !!entry &&
        typeof entry === 'object' &&
        'kind' in entry &&
        typeof entry.kind === 'string' &&
        'identity' in entry &&
        typeof entry.identity === 'string' &&
        'stackName' in entry &&
        typeof entry.stackName === 'string'
    )
  ) {
    return undefined;
  }
  return parsed;
};

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
  tui: Pick<DeleteOperation['tui'], 'colorize' | 'info' | 'setPendingCompletion'>;
  retainedSharedResources?: RetainedSharedResource[];
};

export const commandDelete = async () => {
  const {
    application,
    config,
    deployedStackOverview,
    deploymentArtifacts,
    event,
    notification,
    stack,
    stackContext,
    template,
    tui
  } = await initializeDeleteOperation();

  await config.loadGlobalConfig();
  config.validateGuardrails({ hasConfig: !!config.config });
  await notification.init();

  const stackName = stackContext.stackName;

  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff: template.getOldTemplateDiff() });
  if (abort) {
    await application.handleExitSignal('SIGINT');
    return;
  }

  const retainedMetadata = deployedStackOverview.getStackMetadata(stackMetadataNames.retainedSharedResources());
  const retainedSharedResources =
    typeof retainedMetadata === 'string' ? parseRetainedSharedResources(retainedMetadata) : undefined;
  return executeDeleteOperation({
    config,
    deploymentArtifacts,
    event,
    notification,
    retainedSharedResources,
    stack,
    stackName,
    tui
  });
};

export const executeDeleteOperation = async ({
  config,
  deploymentArtifacts,
  event,
  notification,
  retainedSharedResources,
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

  if (retainedSharedResources?.length) {
    tui.info(
      `Retained shared resources (used by other projects or stages):\n${retainedSharedResources
        .map(({ identity, stackName }) => `- ${identity} (${stackName})`)
        .join('\n')}`
    );
  }

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
