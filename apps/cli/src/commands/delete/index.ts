import { codeSwapBeginMutation, codeSwapOperation } from '@domain-services/code-swap/lifecycle-hooks';
import { createDevNetworkAws, getDevNetworkName } from '@domain-services/dev-network';
import { releaseStackLeases } from '@domain-services/dev-network/leases';
import { createStageHolderStore, getStageHolderParameterName } from '@domain-services/dev-network/holders';
import { ExpectedError } from '@utils/errors';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { withSyncRetries } from '@domain-services/config-manager/utils/uptime-checks';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { releaseDevGeneratedSecrets } from '../_utils/secret-preflight';
import { isStackCreatedByDev } from '../dev/dev-stack-safety';
import { initializeDeleteOperation } from '../_utils/initialization';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getSharedNetworkStackName } from '@stacktape/naming/shared-stacks';
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

/** Lambda@Edge functions live in us-east-1, whatever the stack's region. */
const EDGE_FUNCTION_REGION = 'us-east-1';

/**
 * The edge functions the stack's edge function custom resources own (`edgeLambda`, `edgeFunctions`), by the logical ID
 * of their custom resource.
 */
export const findDeployedEdgeFunctions = (template: Pick<CloudFormationTemplate, 'Resources'> | undefined) =>
  Object.entries((template?.Resources ?? {}) as Record<string, { Type?: string; Properties?: Record<string, any> }>)
    .filter(([, { Type }]) => Type === 'AWS::CloudFormation::CustomResource' || Type?.startsWith('Custom::'))
    .flatMap(([logicalId, { Properties = {} }]) =>
      [Properties.edgeLambda, ...(Array.isArray(Properties.edgeFunctions) ? Properties.edgeFunctions : [])]
        .map((props) => props?.resourceName)
        .filter((functionName): functionName is string => typeof functionName === 'string')
        .map((functionName) => ({ logicalId, functionName }))
    );

export type RetainedEdgeFunction = {
  functionArn: string;
  region: typeof EDGE_FUNCTION_REGION;
  /**
   * `retained`: the function still exists after the stack was deleted. `unverified`: CloudFormation deletes it in the
   * background, or the check failed.
   */
  status: 'retained' | 'unverified';
  checkCommand: string;
  deleteCommand: string;
};

/**
 * AWS refuses to delete a Lambda@Edge function while CloudFront still holds replicas of it, for up to a few hours after
 * the distribution is gone. The stack's custom resource then keeps the function so that the stack deletion finishes
 * (`edge-functions.ts`), and only its log said so (r2an 10). This finds such functions after the deletion, so the
 * result names each one with the commands that check and delete it.
 */
const findRetainedEdgeFunctions = async ({
  deployedTemplate,
  deletionContinuesInBackground,
  edgeFunctions,
  awsAccountId
}: {
  deployedTemplate: Pick<CloudFormationTemplate, 'Resources'> | undefined;
  deletionContinuesInBackground: PendingDelete[] | undefined;
  edgeFunctions: { functionExists: (input: { functionName: string }) => Promise<boolean> };
  awsAccountId: string;
}): Promise<RetainedEdgeFunction[]> => {
  const pendingLogicalIds = new Set((deletionContinuesInBackground ?? []).map(({ logicalId }) => logicalId));
  const results = await Promise.all(
    findDeployedEdgeFunctions(deployedTemplate).map(async ({ logicalId, functionName }) => {
      let status: RetainedEdgeFunction['status'] | undefined = 'unverified';
      if (!pendingLogicalIds.has(logicalId)) {
        try {
          status = (await edgeFunctions.functionExists({ functionName })) ? 'retained' : undefined;
        } catch {
          // The deletion succeeded; a failed check leaves the function unconfirmed rather than failing it.
        }
      }
      if (!status) return undefined;
      const functionArn = `arn:aws:lambda:${EDGE_FUNCTION_REGION}:${awsAccountId}:function:${functionName}`;
      return {
        functionArn,
        region: EDGE_FUNCTION_REGION,
        status,
        checkCommand: `aws lambda get-function --region ${EDGE_FUNCTION_REGION} --function-name ${functionArn}`,
        deleteCommand: `aws lambda delete-function --region ${EDGE_FUNCTION_REGION} --function-name ${functionArn}`
      } satisfies RetainedEdgeFunction;
    })
  );
  return results.filter((result) => result !== undefined);
};

const describeRetainedEdgeFunction = ({ functionArn, status, checkCommand, deleteCommand }: RetainedEdgeFunction) =>
  [
    status === 'retained'
      ? `The Lambda@Edge function ${functionArn} still exists in ${EDGE_FUNCTION_REGION}: AWS refuses to delete it while CloudFront still has replicas of it, which it removes within a few hours after the distribution is deleted.`
      : `The Lambda@Edge function ${functionArn} in ${EDGE_FUNCTION_REGION} may remain: AWS refuses to delete it while CloudFront still has replicas of it, for up to a few hours after the distribution is deleted, and the stack deletion then keeps it.`,
    'It costs nothing unless invoked, and a new deploy of this stage reuses it.',
    `Delete it later with \`${deleteCommand}\`. While replicas remain, AWS answers "replicated function". Check that it is gone with \`${checkCommand}\`, which then answers ResourceNotFoundException.`
  ].join(' ');

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
  tui: Pick<DeleteOperation['tui'], 'colorize' | 'info' | 'prettyCommand' | 'setPendingCompletion' | 'warn'>;
  retainedSharedResources?: RetainedSharedResource[];
  /** Checks for edge functions the deleted stack had, in us-east-1. */
  edgeFunctions: { functionExists: (input: { functionName: string }) => Promise<boolean> };
  awsAccountId: string;
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
  // The stage group exists only in the shared network.
  const wasInSharedNetwork =
    !wasDevStack && !!template.oldTemplate?.Resources?.[cfLogicalNames.stageNetworkSecurityGroup()];
  const retainedMetadata = deployedStackOverview.getStackMetadata(stackMetadataNames.retainedSharedResources());
  const retainedSharedResources =
    typeof retainedMetadata === 'string' ? parseRetainedSharedResources(retainedMetadata) : undefined;
  const result = await executeDeleteOperation({
    awsAccountId: globalStateManager.targetAwsAccount.awsAccountId,
    config,
    deploymentArtifacts,
    deployedTemplate: template.oldTemplate,
    edgeFunctions: awsSdkManager.edgeFunctions,
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
  // The network's janitor removes the shared NAT and network later, so the delete never waits for them.
  if (wasInSharedNetwork) {
    tui.info(
      `Kept the shared network \`${getSharedNetworkStackName()}\` and its NAT: they are removed automatically once no stage has used them for a day.`
    );
  }
  return result;
};

export const executeDeleteOperation = async ({
  awsAccountId,
  config,
  deploymentArtifacts,
  deployedTemplate,
  edgeFunctions,
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

  const retainedEdgeFunctions = await findRetainedEdgeFunctions({
    deployedTemplate,
    deletionContinuesInBackground: inBackground,
    edgeFunctions,
    awsAccountId
  });
  retainedEdgeFunctions.forEach((retained) => tui.warn(describeRetainedEdgeFunction(retained)));

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

  // Agents read the functions from the command result; the rest of the result is still to be designed.
  return retainedEdgeFunctions.length ? { retainedEdgeFunctions } : null;
};
