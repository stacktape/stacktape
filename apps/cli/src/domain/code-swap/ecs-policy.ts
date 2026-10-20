import { codeSwapIntegration } from './integration';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { StpContainerWorkload } from '../config-manager/resolved-types/multi-container-workloads';
import { unsupportedReason } from './eligibility';
import { capacityWithOverrides, supervisorHealthCheck, supervisorStopBudget } from './ecs-budget';
import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { ContainerDefinition, KeyValuePair } from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';

export const resolveStatusRole = (
  definition: KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>,
  roleId: string
) => {
  for (const container of definition.Properties.ContainerDefinitions as ContainerDefinition[]) {
    if (container.Essential === false) continue;
    const environment = container.Environment as KeyValuePair[] | undefined;
    const role = environment?.find((entry) => entry.Name === 'STP_BENCH_ROLE_ID');
    if (role) role.Value = roleId;
    else container.Environment = [...(environment ?? []), { Name: 'STP_BENCH_ROLE_ID', Value: roleId }];
  }
};

const phase3Run = z.object({
  phase3: z.boolean().optional(),
  optOut: z.boolean().optional(),
  mode: z.enum(['swap', 'image']).optional(),
  readinessControl: z.boolean().optional()
});
export const benchmarkHasPhase3 = () => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  if (!path) return false;
  const run = phase3Run.parse(JSON.parse(readFileSync(path, 'utf8')));
  return Boolean(run.phase3 && !run.optOut);
};
export const benchmarkOmitsDrain = () => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  return Boolean(path && !phase3Run.parse(JSON.parse(readFileSync(path, 'utf8'))).optOut && !benchmarkHasPhase3());
};
export const codeSwapContainerPolicy = (
  workload: StpContainerWorkload,
  container: StpContainerWorkload['containers'][number],
  overrides?: unknown,
  scalingOverrides?: unknown,
  serviceCount = 1
) => {
  if (!workload.codeSwap && !benchmarkHasPhase3()) return {};
  if (codeSwapIntegration.imageHasSupervisor === false) return {};
  if (workload.codeSwap && unsupportedReason(workload, serviceCount)) return {};
  if (workload.containers.length !== 1 || container.internalHealthCheck || container.essential === false)
    throw new Error('Phase 3 qualifies one essential application without authored checks.');
  if (workload.resources.instanceTypes || container.packaging?.type !== 'js-bundle')
    throw new Error('Phase 3 qualifies Node Fargate js-bundle only.');
  // The owned harness has one service. Reject other composition rather than
  // pretending a per-service calculation enforces a stack-wide total.
  if (!workload.codeSwap && workload.name !== 'api') throw new Error('Benchmark supports only its owned api service.');
  const run = process.env.STP_CODE_SWAP_BENCH_RUN
    ? phase3Run.parse(JSON.parse(readFileSync(process.env.STP_CODE_SWAP_BENCH_RUN, 'utf8')))
    : { mode: 'swap', readinessControl: true };
  const capacity = capacityWithOverrides(
    {
      name: workload.name,
      maximum: workload.scaling.maxInstances,
      minimum: workload.scaling.minInstances,
      maximumPercent: 200,
      scalingOverrides
    },
    overrides
  );
  if (run.readinessControl === false && run.mode !== 'image')
    throw new Error('Unchecked readiness control is image-only.');
  if (capacity.reason) return {};
  return {
    HealthCheck: run.readinessControl === false ? undefined : supervisorHealthCheck,
    StopTimeout: supervisorStopBudget(container.stopTimeout).stopTimeout,
    LinuxParameters: { InitProcessEnabled: true }
  };
};
