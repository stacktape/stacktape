import { ExpectedError } from '@utils/errors';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { withSyncRetries } from '@domain-services/config-manager/utils/uptime-checks';
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
  lifecycle: Pick<DeleteOperation['lifecycle'], 'processHooks' | 'registerHooks'>;
  notification: Pick<DeleteOperation['notification'], 'sendDeploymentNotification'>;
  progress: Pick<DeleteOperation['progress'], 'setPhase'>;
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
    lifecycle,
    notification,
    progress,
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
  const result = await executeDeleteOperation({
    config,
    deploymentArtifacts,
    lifecycle,
    notification,
    progress,
    retainedSharedResources,
    stack,
    stackName,
    tui
  });
  // The stack is gone, so its uptime checks leave the Console projection with it. Best effort: a
  // failed sync leaves paused rows behind, which the next deploy of this stage reconciles.
  try {
    await withSyncRetries(() =>
      stacktapeTrpcApiManager.apiClient.syncUptimeChecks({
        project: stackContext.projectName,
        stage: stackContext.stage,
        checks: []
      })
    );
  } catch (err) {
    tui.info(`Could not remove uptime check definitions from the Stacktape Console: ${err}`);
  }
  return result;
};

export const executeDeleteOperation = async ({
  config,
  deploymentArtifacts,
  lifecycle,
  notification,
  progress,
  retainedSharedResources,
  stack,
  stackName,
  tui
}: DeleteExecutionOperation) => {
  progress.setPhase('DEPLOY');

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
    await lifecycle.registerHooks(config.hooks);
    await lifecycle.processHooks({ captureType: 'START' });
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
