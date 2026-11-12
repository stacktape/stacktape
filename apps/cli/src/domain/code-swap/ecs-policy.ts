import { codeSwapIntegration } from './integration';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { StpContainerWorkload } from '../config-manager/resolved-types/multi-container-workloads';
import { unsupportedReason } from './eligibility';
import { capacityWithOverrides, supervisorHealthCheck, supervisorStopBudget } from './ecs-budget';
import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { ContainerDefinition, KeyValuePair } from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';

export class NotRoutableError extends Error {}

/**
 * For about a minute after an instance registers, a single Cloud Map read can return no healthy instances, and the next
 * read 400 ms later returns the right answer. A swap must not fall back to an image deploy over one such read, so only a
 * mismatch that persists counts as lost routing.
 */
export const retryWhileNotRoutable = async <T>(
  read: () => Promise<T>,
  { timeoutMs = 10_000, retryDelayMs = 500 }: { timeoutMs?: number; retryDelayMs?: number } = {}
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await read();
    } catch (error) {
      if (!(error instanceof NotRoutableError) || Date.now() >= deadline) throw error;
      await Bun.sleep(retryDelayMs);
    }
  }
};

export const resolveStatusRole = (
  definition: KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>,
  roleId: string
) => {
  for (const container of definition.Properties.ContainerDefinitions as ContainerDefinition[]) {
    if (container.Essential === false) continue;
    const environment = container.Environment as KeyValuePair[] | undefined;
    const role = environment?.find((entry) => entry.Name === 'STP_SUPERVISOR_ROLE_ID');
    if (role) role.Value = roleId;
    else container.Environment = [...(environment ?? []), { Name: 'STP_SUPERVISOR_ROLE_ID', Value: roleId }];
  }
};

const benchmarkRunSchema = z.object({
  optOut: z.boolean().optional(),
  mode: z.enum(['swap', 'image']).optional(),
  readinessControl: z.boolean().optional()
});
const readBenchmarkRun = () => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  return path ? benchmarkRunSchema.parse(JSON.parse(readFileSync(path, 'utf8'))) : undefined;
};
export const codeSwapContainerPolicy = (
  workload: StpContainerWorkload,
  container: StpContainerWorkload['containers'][number],
  overrides?: unknown,
  scalingOverrides?: unknown,
  serviceCount = 1
) => {
  const benchmarkRun = readBenchmarkRun();
  if (!workload.codeSwap && (!benchmarkRun || benchmarkRun.optOut)) return {};
  if (codeSwapIntegration.imageHasSupervisor.get(workload.name) === false) return {};
  if (workload.codeSwap && unsupportedReason(workload, serviceCount)) return {};
  if (workload.containers.length !== 1 || container.internalHealthCheck || container.essential === false)
    throw new Error('Code swap needs one essential application container without its own health check.');
  if (workload.resources.instanceTypes || !['js-bundle', 'buildpack'].includes(container.packaging?.type ?? ''))
    throw new Error('Code swap needs Fargate with js-bundle or buildpack packaging.');
  // The benchmark deploys one service without opting in. Reject any other composition rather than pretending a
  // per-service calculation enforces a stack-wide total.
  if (!workload.codeSwap && workload.name !== 'api') throw new Error('Benchmark supports only its owned api service.');
  const run = benchmarkRun ?? { mode: 'swap', readinessControl: true };
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
