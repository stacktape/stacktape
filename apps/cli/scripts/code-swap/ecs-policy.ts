import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { StpContainerWorkload } from '../../src/domain/config-manager/resolved-types/multi-container-workloads';
import { capacityWithOverrides, supervisorHealthCheck, supervisorStopBudget } from './ecs-budget';

const phase3Run = z.object({
  phase3: z.boolean().optional(),
  mode: z.enum(['swap', 'image']).optional(),
  readinessControl: z.boolean().optional()
});
export const benchmarkHasPhase3 = () => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  return Boolean(path && phase3Run.parse(JSON.parse(readFileSync(path, 'utf8'))).phase3);
};
export const benchmarkOmitsDrain = () => Boolean(process.env.STP_CODE_SWAP_BENCH_RUN && !benchmarkHasPhase3());
export const benchmarkContainerPolicy = (
  workload: StpContainerWorkload,
  container: StpContainerWorkload['containers'][number],
  overrides?: unknown
) => {
  if (!benchmarkHasPhase3()) return {};
  if (workload.containers.length !== 1 || container.internalHealthCheck || container.essential === false)
    throw new Error('Phase 3 qualifies one essential application without authored checks.');
  if (workload.resources.instanceTypes || container.packaging?.type !== 'js-bundle')
    throw new Error('Phase 3 qualifies Node Fargate js-bundle only.');
  // The owned harness has one service. Reject other composition rather than
  // pretending a per-service calculation enforces a stack-wide total.
  if (workload.name !== 'api') throw new Error('Phase 3 benchmark supports only its owned api service.');
  const run = phase3Run.parse(JSON.parse(readFileSync(process.env.STP_CODE_SWAP_BENCH_RUN!, 'utf8')));
  const capacity = capacityWithOverrides(
    { name: workload.name, maximum: workload.scaling.maxInstances, maximumPercent: 200 },
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
