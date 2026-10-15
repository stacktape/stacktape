import type { ExpectedError as ExpectedErrorType } from '@utils/errors';
import { ExpectedError } from '@utils/errors';
import { getECSHotswapInformation, updateEcsService } from '../_utils/cw-deployment';
import { getLambdaFunctionHotswapInformation, updateFunctionCode } from '../_utils/fn-deployment';
import type { initializeDeployOperation } from '../_utils/initialization';

type DeployOperation = Awaited<ReturnType<typeof initializeDeployOperation>>;

export type FastDeployPlan = {
  functions: ReturnType<typeof getLambdaFunctionHotswapInformation>[];
  services: Awaited<ReturnType<typeof getECSHotswapInformation>>[];
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
  const functions = config.allLambdasEligibleForHotswap
    .map((lambdaProps) => getLambdaFunctionHotswapInformation({ lambdaProps }))
    .filter(({ needsUpdate }) => needsUpdate);
  return { plan: { functions, services } };
};

/**
 * Updates every planned function and service directly, then records the deployment as a release. Every update runs to
 * completion before a failure is reported, so the error names exactly which workloads run the new code.
 */
export const performFastDeploy = async ({
  plan,
  deploymentArtifacts,
  progress
}: { plan: FastDeployPlan } & Pick<DeployOperation, 'deploymentArtifacts' | 'progress'>) => {
  const workloadCount = plan.functions.length + plan.services.length;
  await progress.startEvent({ eventType: 'HOTSWAP_UPDATE', description: 'Updating code directly' });
  const updates = [
    ...plan.functions.map((update) => ({ name: update.workloadName, run: () => updateFunctionCode(update) })),
    ...plan.services.map((update) => ({ name: update.workload.name, run: () => updateEcsService(update) }))
  ];
  const results = await Promise.allSettled(updates.map(({ run }) => run()));
  const failed = updates.filter((_, index) => results[index].status === 'rejected');
  if (failed.length) {
    const updated = updates.filter((_, index) => results[index].status === 'fulfilled').map(({ name }) => name);
    const firstError = (results.find(({ status }) => status === 'rejected') as PromiseRejectedResult).reason;
    throw new ExpectedError(
      'STACK',
      `Updating ${failed.map(({ name }) => name).join(', ')} failed: ${(firstError as ExpectedErrorType)?.message ?? firstError}`,
      [
        updated.length
          ? `${updated.join(', ')} already run${updated.length === 1 ? 's' : ''} the new code.`
          : 'No function or service was changed.',
        'Fix the problem and deploy again. Workloads that already run the new code are skipped.'
      ]
    );
  }
  if (workloadCount) {
    await deploymentArtifacts.recordFastRelease();
    await deploymentArtifacts.deleteAllObsoleteArtifacts();
  }
  await progress.finishEvent({
    eventType: 'HOTSWAP_UPDATE',
    finalMessage: workloadCount
      ? `Updated ${workloadCount} workload${workloadCount === 1 ? '' : 's'}`
      : 'No code changes (nothing to update)'
  });
};
