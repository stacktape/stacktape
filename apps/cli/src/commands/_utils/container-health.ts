import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';

/** ECS task health only includes checks on essential containers (essential defaults to true). */
export const hasApplicationHealthCheck = (containers: StpContainerWorkload['containers']): boolean =>
  containers.some(({ internalHealthCheck, essential }) => internalHealthCheck && essential !== false);
