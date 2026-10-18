import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { RollingUpdateFinish } from 'src/aws/ecs';
import { tuiManager } from '@application-services/tui-manager';
import type { ExpectedError as ExpectedErrorType } from '@utils/errors';
import { CliError, ExpectedError } from '@utils/errors';
import { getECSHotswapInformation, updateEcsService } from '../_utils/cw-deployment';
import {
  deleteSupersededSharedLayerVersions,
  findLambdaOutsideFastPathUsingLayers,
  getLambdaFunctionHotswapInformation,
  getSharedLayerHotswapInformation,
  resolveSharedLayerVersions,
  type SharedLayerHotswapInformation,
  updateFunctionCode
} from '../_utils/fn-deployment';
import type { initializeDeployOperation } from '../_utils/initialization';
import { prepareSharedLayerTransitions } from '../_utils/shared-layer-transition';

type DeployOperation = Awaited<ReturnType<typeof initializeDeployOperation>>;

export type FastDeployPlan = {
  functions: ReturnType<typeof getLambdaFunctionHotswapInformation>[];
  services: Awaited<ReturnType<typeof getECSHotswapInformation>>[];
  /** The shared chunk layers the planned functions use. A layer whose content changed gets a version before them. */
  layers: SharedLayerHotswapInformation[];
};

/**
 * Finds the functions and container services whose running code differs from this deployment. Returns a reason
 * instead when one of them cannot be updated directly.
 */
export const planFastDeploy = async ({
  config
}: Pick<DeployOperation, 'config'>): Promise<{ plan: FastDeployPlan } | { reason: string }> => {
  // Directive results were cached for CloudFormation. Container workloads resolve some of them again locally.
  config.invalidatePotentiallyChangedDirectiveResults();
  const services = (
    await Promise.all(config.allContainerWorkloads.map((workload) => getECSHotswapInformation({ workload })))
  ).filter(({ ecsTaskDefinition, ecsService }) => ecsTaskDefinition.needsUpdate || ecsService.needsUpdate);
  // A direct update would bypass the traffic shifting a blue/green deployment configures.
  const blueGreenService = services.find(({ blueGreen }) => blueGreen);
  if (blueGreenService) {
    return { reason: `${blueGreenService.workload.name} uses blue/green deployment` };
  }
  const sharedLayers = getSharedLayerHotswapInformation();
  const functions = config.allLambdasEligibleForHotswap
    .map((lambdaProps) => getLambdaFunctionHotswapInformation({ lambdaProps, sharedLayers }))
    .filter(({ needsUpdate }) => needsUpdate);
  // CloudFormation publishes versions for an alias, which can shift traffic gradually or keep provisioned capacity.
  const aliasedFunction = functions.find(({ aliasName }) => aliasName);
  if (aliasedFunction) {
    return { reason: `${aliasedFunction.workloadName} is invoked through an alias` };
  }
  // Every function that shares a changed layer must be updated here, or it would keep running the old shared code.
  const outsideFunction = findLambdaOutsideFastPathUsingLayers({
    config,
    layerNumbers: functions.flatMap(({ changedLayers }) => changedLayers.map(({ layerNumber }) => layerNumber))
  });
  if (outsideFunction) {
    return { reason: `${outsideFunction} uses a changed shared layer and cannot be updated directly` };
  }
  const layers = sharedLayers.filter(({ layerNumber }) =>
    functions.some((lambda) => lambda.layers.some((layer) => layer.layerNumber === layerNumber))
  );
  if (functions.some(({ changedLayers }) => changedLayers.some(({ layerNumber }) => layerNumber === 0))) {
    return { reason: 'native dependency layer changed' };
  }
  return { plan: { functions, services, layers } };
};

/**
 * A hint for web services behind an HTTP API whose update waited for ECS to stop the old containers. Without an
 * `internalHealthCheck`, nothing shows when the new containers are ready, so the update finishes about 3 minutes after
 * API Gateway started sending them requests.
 */
export const rolloutWaitHint = (
  updates: { workload: StpContainerWorkload; finishedWhen?: RollingUpdateFinish }[]
): string | undefined => {
  const names = updates
    .filter(
      ({ workload, finishedWhen }) =>
        finishedWhen === 'rollout-completed' &&
        workload.configParentResourceType === 'web-service' &&
        workload.containers.some(({ events }) => (events ?? []).some(({ type }) => type === 'http-api-gateway')) &&
        !workload.containers.some(({ internalHealthCheck, essential }) => internalHealthCheck && essential !== false)
    )
    .map(({ workload }) => workload.nameChain[0]);
  if (!names.length) return undefined;
  return (
    `The update of ${names.join(', ')} waited about 3 minutes for ECS to stop the old containers, although the new ` +
    `version already served requests. Add internalHealthCheck to ${names.length === 1 ? 'its container' : 'their containers'} ` +
    'so Stacktape finishes as soon as the new version is healthy: ' +
    'https://docs.stacktape.com/resources/compute/web-service/#how-deploys-replace-containers'
  );
};

/**
 * Updates every planned function and service directly, then records the deployment as a release. Every update runs to
 * completion before a failure is reported, so the error names exactly which workloads run the new code.
 */
export const performFastDeploy = async ({
  plan,
  recordRelease,
  deploymentArtifacts,
  progress
}: { plan: FastDeployPlan; recordRelease: boolean } & Pick<DeployOperation, 'deploymentArtifacts' | 'progress'>) => {
  const workloadCount = plan.functions.length + plan.services.length;
  await progress.startEvent({ eventType: 'HOTSWAP_UPDATE', description: 'Updating code directly' });
  // The layer versions exist before any function changes: a function given its new code first would import shared
  // code that is not there yet, and a layer that cannot be published leaves every function as it was.
  const changedLayerNumbers = new Set(
    plan.functions.flatMap(({ changedLayers }) => changedLayers.map(({ layerNumber }) => layerNumber))
  );
  const layerArns = await resolveSharedLayerVersions(
    plan.layers.filter(({ layerNumber }) => changedLayerNumbers.has(layerNumber))
  ).catch((error: ExpectedErrorType) => {
    throw new ExpectedError('STACK', `Publishing the shared layers failed: ${error?.message ?? error}`, [
      'No function or service was changed.',
      'Fix the problem and deploy again.'
    ]);
  });
  const serviceUpdates: Parameters<typeof rolloutWaitHint>[0] = [];
  const transitions = await prepareSharedLayerTransitions(plan.functions, plan.layers).catch((error: unknown) => {
    throw new CliError({
      category: 'DEPLOYMENT',
      code: 'SHARED_LAYER_TRANSITION_FAILED',
      message: `Could not prepare a safe shared-layer transition: ${error instanceof Error ? error.message : String(error)}`,
      hints: ['No function or service was changed. Fix the problem and deploy again, or use --fullDeploy.']
    });
  });
  const updatedLayerArns = new Map<string, string[]>();
  const confirmFunctionTags: (() => Promise<unknown>)[] = [];
  const updates = [
    ...plan.functions.map((update) => ({
      name: update.workloadName,
      run: async () => {
        const { updatedLayerArns: arns, tagUpdatedFunction } = await updateFunctionCode({
          ...update,
          transitionalLayerArns: transitions.get(update.lambdaResourceName),
          deferFinalTags: recordRelease,
          ...(update.changedLayers.length ? { layerArns } : {})
        });
        if (arns) updatedLayerArns.set(update.lambdaResourceName, arns);
        if (recordRelease) confirmFunctionTags.push(tagUpdatedFunction);
      }
    })),
    ...plan.services.map((update) => ({
      name: update.workload.name,
      run: async () => serviceUpdates.push({ workload: update.workload, ...(await updateEcsService(update)) })
    }))
  ];
  const results = await Promise.allSettled(updates.map(({ run }) => run()));
  const failed = updates.filter((_, index) => results[index].status === 'rejected');
  if (failed.length) {
    // Preserve the identities of successful partial updates for source-map activation. A failed workload still
    // forces the next deploy to retry, so confirming the others cannot hide a missing release.
    await Promise.all(confirmFunctionTags.map((confirm) => confirm()));
    const updated = updates.filter((_, index) => results[index].status === 'fulfilled').map(({ name }) => name);
    const firstError = (results.find(({ status }) => status === 'rejected') as PromiseRejectedResult).reason;
    throw new ExpectedError(
      'STACK',
      `Updating ${failed.map(({ name }) => name).join(', ')} failed: ${(firstError as ExpectedErrorType)?.message ?? firstError}`,
      [
        updated.length
          ? `${updated.join(', ')} already run${updated.length === 1 ? 's' : ''} the new code.`
          : 'No function or service was changed.',
        'Fix the problem and deploy again to finish the release.'
      ]
    );
  }
  if (recordRelease) {
    // Keep successful functions tagged "updating" until the release exists. If recording fails, the next deploy
    // plans them again and retries the release instead of skipping the running but unrecorded code.
    await deploymentArtifacts.recordFastRelease();
    await Promise.all(confirmFunctionTags.map((confirm) => confirm()));
    await deploymentArtifacts.deleteAllObsoleteArtifacts();
  }
  if (changedLayerNumbers.size) {
    await deleteSupersededSharedLayerVersions({ layers: plan.layers, knownLayerArns: updatedLayerArns });
  }
  await progress.finishEvent({
    eventType: 'HOTSWAP_UPDATE',
    finalMessage: workloadCount
      ? `Updated ${workloadCount} workload${workloadCount === 1 ? '' : 's'}`
      : 'No code changes (nothing to update)'
  });
  const hint = rolloutWaitHint(serviceUpdates);
  if (hint) tuiManager.hint(hint);
};
