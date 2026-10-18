import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { RollingUpdateFinish } from 'src/aws/ecs';
import { tuiManager } from '@application-services/tui-manager';
import type { ExpectedError as ExpectedErrorType } from '@utils/errors';
import { CliError, ExpectedError } from '@utils/errors';
import { hasApplicationHealthCheck } from '../_utils/container-health';
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

/** Publication starts only after the corresponding object exists. Store failures until every upload has settled. */
export const createSharedLayerPublication = (plan: FastDeployPlan) => {
  const changed = new Set(
    plan.functions.flatMap(({ changedLayers }) => changedLayers.map(({ layerNumber }) => layerNumber))
  );
  const layers = plan.layers.filter(({ layerNumber }) => changed.has(layerNumber));
  const publications = new Map<number, Promise<{ arns: Map<number, string> } | { error: unknown }>>();
  const onLayerUploaded = (layerNumber: number) => {
    const layer = layers.find((candidate) => candidate.layerNumber === layerNumber);
    if (!layer || publications.has(layerNumber)) return;
    publications.set(
      layerNumber,
      resolveSharedLayerVersions([layer], { parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS' }).then(
        (arns) => ({ arns }),
        (error: unknown) => ({ error })
      )
    );
  };
  return {
    onLayerUploaded,
    settle: async () => {
      await Promise.all(publications.values());
    },
    wait: async () => {
      const results = await Promise.all(publications.values());
      if (publications.size !== layers.length) throw new Error('A shared layer object was not uploaded.');
      const arns = new Map<number, string>();
      for (const result of results) {
        if ('error' in result) throw result.error;
        for (const [number, arn] of result.arns) arns.set(number, arn);
      }
      return arns;
    }
  };
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

/** One hint per deploy for HTTP API web services whose application health was not checked. */
export const rolloutWaitHint = (
  updates: { workload: StpContainerWorkload; finishedWhen?: RollingUpdateFinish }[]
): string | undefined => {
  const names = updates
    .filter(
      ({ workload, finishedWhen }) =>
        (finishedWhen === 'new-instances-discoverable' || finishedWhen === 'rollout-completed') &&
        workload.configParentResourceType === 'web-service' &&
        workload.containers.some(({ events }) => (events ?? []).some(({ type }) => type === 'http-api-gateway')) &&
        !hasApplicationHealthCheck(workload.containers)
    )
    .map(({ workload }) => workload.nameChain[0]);
  if (!names.length) return undefined;
  return (
    `Application health is unchecked for ${names.join(', ')}. Add a one-line internalHealthCheck for failure detection ` +
    'and automatic rollback: https://docs.stacktape.com/resources/compute/web-service/#health-checks'
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
  progress,
  layerVersions
}: { plan: FastDeployPlan; recordRelease: boolean; layerVersions?: Promise<Map<number, string>> } & Pick<
  DeployOperation,
  'deploymentArtifacts' | 'progress'
>) => {
  const workloadCount = plan.functions.length + plan.services.length;
  await progress.startEvent({ eventType: 'HOTSWAP_UPDATE', description: 'Updating code directly' });
  // Publication and bridge preparation are independent. Functions whose layers stay unchanged can also update while
  // those run; a consumer of changed layers waits for both before its first mutation.
  const changedLayerNumbers = new Set(
    plan.functions.flatMap(({ changedLayers }) => changedLayers.map(({ layerNumber }) => layerNumber))
  );
  const publication = (
    layerVersions ??
    resolveSharedLayerVersions(plan.layers.filter(({ layerNumber }) => changedLayerNumbers.has(layerNumber)))
  ).then(
    (arns) => ({ arns }),
    (error: unknown) => ({ error })
  );
  const serviceUpdates: Parameters<typeof rolloutWaitHint>[0] = [];
  const preparation = prepareSharedLayerTransitions(plan.functions, plan.layers).then(
    (transitions) => ({ transitions }),
    (error: unknown) => ({
      error: new CliError({
        category: 'DEPLOYMENT',
        code: 'SHARED_LAYER_TRANSITION_FAILED',
        message: `Could not prepare a safe shared-layer transition: ${error instanceof Error ? error.message : String(error)}`,
        hints: ['Fix the problem and deploy again, or use --fullDeploy.']
      })
    })
  );
  const updatedLayerArns = new Map<string, string[]>();
  const confirmFunctionTags: (() => Promise<unknown>)[] = [];
  const updates = [
    ...plan.functions.map((update) => ({
      name: update.workloadName,
      run: async () => {
        let layerArns: Map<number, string> | undefined;
        let transitionalLayerArns: string[] | undefined;
        if (update.changedLayers.length) {
          const result = await publication;
          if ('error' in result)
            throw new Error(
              `Publishing the shared layers failed: ${result.error instanceof Error ? result.error.message : String(result.error)}`
            );
          layerArns = result.arns;
          const prepared = await preparation;
          if ('error' in prepared) throw prepared.error;
          transitionalLayerArns = prepared.transitions.get(update.lambdaResourceName);
        }
        const { updatedLayerArns: arns, tagUpdatedFunction } = await updateFunctionCode({
          ...update,
          transitionalLayerArns,
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
  // A publication failure can be reported before bridge preparation finishes. Settle every started request before
  // returning, including when no shared consumer reached its first mutation.
  await Promise.all([publication, preparation]);
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
