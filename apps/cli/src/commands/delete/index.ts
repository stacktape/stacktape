import { codeSwapBeginMutation, codeSwapOperation } from '@domain-services/code-swap/lifecycle-hooks';
import { createDevNetworkAws, getDevNetworkName } from '@domain-services/dev-network';
import { releaseStackLeases } from '@domain-services/dev-network/leases';
import { createStageHolderStore, getStageHolderParameterName } from '@domain-services/dev-network/holders';
import { ExpectedError } from '@utils/errors';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { withSyncRetries } from '@domain-services/config-manager/utils/uptime-checks';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { releaseDevGeneratedSecrets } from '../_utils/secret-preflight';
import { isStackCreatedByDev } from '../dev/dev-stack-safety';
import { initializeDeleteOperation } from '../_utils/initialization';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { createSharedNetworkRemovalAws, removeUnusedSharedNetwork } from '@domain-services/shared-network/removal';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { SHARED_LAYER_NUMBERS } from '@domain-services/deployment-artifact-manager/shared-layers';
import { deleteSupersededSharedLayerVersions } from '../_utils/fn-deployment';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { EnrichedStackResourceInfo } from '@domain-services/cloudformation-stack-manager/types';
import type { PendingDelete } from '@domain-services/cloudformation-stack-manager/background-delete';
import {
  findDeletionProtectedResources,
  getDeletionProtectionError
} from '@domain-services/cloudformation-stack-manager/deletion-protection';

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

const describeDeletionInBackground = (pending: PendingDelete[]) => {
  const shown = pending.slice(0, 5).map(({ logicalId }) => logicalId);
  const more = pending.length - shown.length;
  const names = `${shown.join(', ')}${more ? ` and ${more} more` : ''}`;
  return [
    `AWS is still removing ${pending.length} resource${pending.length > 1 ? 's' : ''} that cost nothing: ${names}.`,
    'This finishes in the background, usually within minutes (network interfaces of functions in a VPC can take up to 20).',
    'A deploy of this stage waits until it is done. If AWS fails to remove one of them, the next deploy reports it and the next delete retries it.'
  ].join(' ');
};

type DeleteExecutionOperation = {
  config: Pick<DeleteOperation['config'], 'config' | 'hooks'>;
  deploymentArtifacts: {
    artifactStoreIsStackResource: boolean;
    deleteAllArtifacts: () => Promise<unknown>;
    deleteArtifactStore: () => Promise<unknown>;
  };
  /** The template CloudFormation would delete. */
  deployedTemplate: Pick<CloudFormationTemplate, 'Resources'> | undefined;
  lifecycle: Pick<DeleteOperation['lifecycle'], 'processHooks' | 'registerHooks'>;
  notification: Pick<DeleteOperation['notification'], 'sendDeploymentNotification'>;
  progress: Pick<DeleteOperation['progress'], 'setPhase'>;
  stack: {
    deleteStack: (options: {
      beforeDelete: () => Promise<unknown>;
      finishInBackground: boolean;
    }) => Promise<{ deletionContinuesInBackground?: PendingDelete[] } | undefined>;
    existingStackDetails: { EnableTerminationProtection?: boolean; StackStatus?: string };
    existingStackResources: EnrichedStackResourceInfo[];
  };
  stackName: string;
  tui: Pick<DeleteOperation['tui'], 'colorize' | 'info' | 'prettyCommand' | 'setPendingCompletion'>;
  retainedSharedResources?: RetainedSharedResource[];
  /** Return once only resources that cost nothing remain; see `background-delete.ts`. */
  finishInBackground: boolean;
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
  // The stage group exists only in the shared network; its imports keep the shared stacks until the stack is gone.
  const wasInSharedNetwork =
    !wasDevStack && !!template.oldTemplate?.Resources?.[cfLogicalNames.stageNetworkSecurityGroup()];
  const retainedMetadata = deployedStackOverview.getStackMetadata(stackMetadataNames.retainedSharedResources());
  const retainedSharedResources =
    typeof retainedMetadata === 'string' ? parseRetainedSharedResources(retainedMetadata) : undefined;
  const result = await executeDeleteOperation({
    config,
    deploymentArtifacts,
    deployedTemplate: template.oldTemplate,
    // A dev stage releases its relay ports and secrets once its stack is gone, so its delete waits for the end.
    finishInBackground: !wasDevStack,
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
      await createStageHolderStore().delete(
        getStageHolderParameterName({ networkName: getDevNetworkName(), stackName })
      );
    } catch (err) {
      tui.info(`Could not release the dev network relay ports of ${stackName}: ${err}`);
    }
    try {
      // Dev mode generated these passwords for the stage. They stay: a deployment or another stage may use one.
      for (const { name, usedBy } of await releaseDevGeneratedSecrets({ stackName })) {
        const stillUsed = usedBy.length ? ` (the dev stacks ${usedBy.join(', ')} still use it)` : '';
        tui.info(
          `Kept generated secret ${name}${stillUsed}; delete it with ${tui.prettyCommand('secret:delete')} when no stage needs it.`
        );
      }
    } catch (err) {
      tui.info(`Could not check the secrets dev mode generated for ${stackName}: ${err}`);
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
  // The shared NAT and network go with the last stage that uses them. The stage itself is deleted either way.
  if (wasInSharedNetwork) {
    try {
      await removeUnusedSharedNetwork({ aws: createSharedNetworkRemovalAws(), report: tui });
    } catch (err) {
      tui.warn(`Could not check whether the shared network can be removed: ${err}`);
    }
  }
  return result;
};

export const executeDeleteOperation = async ({
  config,
  deploymentArtifacts,
  deployedTemplate,
  finishInBackground,
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

  // CloudFormation cannot delete a protected resource, and Stacktape must not turn the protection off on its way out.
  // Refusing here, before hooks, artifact deletion and the stack delete, keeps the whole stack as it was.
  const protectedResources = findDeletionProtectedResources({
    resources: stack.existingStackResources,
    template: deployedTemplate,
    stackStatus: stack.existingStackDetails.StackStatus
  });
  if (protectedResources.length) {
    throw getDeletionProtectionError({
      stackName,
      stackStatus: stack.existingStackDetails.StackStatus,
      resources: protectedResources
    });
  }

  await notification.sendDeploymentNotification({
    message: { text: `Deleting stack ${stackName}.`, type: 'progress' }
  });

  if (config.config) {
    await lifecycle.registerHooks(config.hooks);
    await lifecycle.processHooks({ captureType: 'START' });
  }
  codeSwapBeginMutation();
  // Read before the deletion, which empties the stack's resource list.
  const artifactStoreIsStackResource = deploymentArtifacts.artifactStoreIsStackResource;
  // CloudFormation cannot delete a bucket or repository that still has content, so emptying them finishes first. It
  // overlaps the ECS scale-down and the CloudFront disable that the stack delete starts.
  const deleteResult = await stack.deleteStack({
    beforeDelete: deploymentArtifacts.deleteAllArtifacts,
    finishInBackground
  });
  // The deployment bucket and image repository of a stack `deploy` created are not stack resources.
  if (!artifactStoreIsStackResource) await deploymentArtifacts.deleteArtifactStore();

  const inBackground = deleteResult?.deletionContinuesInBackground;
  if (inBackground?.length) {
    tui.info(describeDeletionInBackground(inBackground));
  }

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
