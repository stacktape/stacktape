import { codeSwapBeginMutation, codeSwapOperation } from '@domain-services/code-swap/lifecycle-hooks';
import { createDevNetworkAws, getDevNetworkName } from '@domain-services/dev-network';
import { releaseStackLeases } from '@domain-services/dev-network/leases';
import { ExpectedError } from '@utils/errors';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { withSyncRetries } from '@domain-services/config-manager/utils/uptime-checks';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { deleteDevGeneratedSecrets } from '../_utils/secret-preflight';
import { isStackCreatedByDev } from '../dev/dev-stack-safety';
import { initializeDeleteOperation } from '../_utils/initialization';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { SHARED_LAYER_NUMBERS } from '@domain-services/deployment-artifact-manager/shared-layers';
import { deleteSupersededSharedLayerVersions } from '../_utils/fn-deployment';

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
    deleteStack: (options: { beforeDelete: () => Promise<unknown> }) => Promise<unknown>;
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

  await codeSwapOperation('delete');
  await config.loadGlobalConfig();
  config.validateGuardrails({ hasConfig: !!config.config });
  await notification.init();

  const stackName = stackContext.stackName;

  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff: template.getOldTemplateDiff() });
  if (abort) {
    await application.handleExitSignal('SIGINT');
    return;
  }

  // Read before the deletion: a dev stack rolled back to its bootstrap template has only its stack tag left.
  const wasDevStack = isStackCreatedByDev({
    isDevStack: deployedStackOverview.getStackMetadata(stackMetadataNames.isDevStack()),
    tags: stack.existingStackDetails?.Tags
  });
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
  // A dev stage leased relay ports in the account's dev network; they are free for other stages again.
  if (wasDevStack) {
    try {
      await releaseStackLeases({ store: createDevNetworkAws().leases, networkName: getDevNetworkName(), stackName });
    } catch (err) {
      tui.info(`Could not release the dev network relay ports of ${stackName}: ${err}`);
    }
    try {
      const deletedSecrets = await deleteDevGeneratedSecrets({ stackName });
      if (deletedSecrets.length) {
        tui.info(
          `Scheduled the secrets dev mode generated for ${stackName} for deletion: ${deletedSecrets.join(', ')}. ` +
            'A deployment or dev session that uses one within 7 days restores it.'
        );
      }
    } catch (err) {
      tui.info(`Could not delete the secrets dev mode generated for ${stackName}: ${err}`);
    }
  }
  // CloudFormation deleted the layer versions it published. Those fast deployments published under the stack's layer
  // names are not CloudFormation's, so they go here, now that no function runs them.
  await deleteSupersededSharedLayerVersions({
    layers: SHARED_LAYER_NUMBERS.map((layerNumber) => ({
      layerName: awsResourceNames.sharedChunkLayer({ stackName, layerNumber })
    })),
    functionNames: []
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
  codeSwapBeginMutation();
  // CloudFormation cannot delete a bucket or repository that still has content, so emptying them finishes first. It
  // overlaps the ECS scale-down and the CloudFront disable that the stack delete starts.
  await stack.deleteStack({ beforeDelete: deploymentArtifacts.deleteAllArtifacts });

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
