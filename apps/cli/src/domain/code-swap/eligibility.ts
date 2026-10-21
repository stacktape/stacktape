import type { StpContainerWorkload } from '../config-manager/resolved-types/multi-container-workloads';
import { supervisorStopBudget } from './ecs-budget';

export const unsupportedReason = (workload: StpContainerWorkload, _serviceCount: number): string | undefined => {
  const container = workload.containers[0];
  if (workload.containers.length !== 1 || container?.essential === false) return 'side containers are not qualified';
  if (workload.resources.architecture === 'arm64') return 'arm64 is not qualified; use x86 Fargate';
  if (workload.resources.instanceTypes) return 'EC2 is not qualified; use x86 Fargate';
  if (
    container?.packaging?.type !== 'buildpack' &&
    (container?.packaging?.type !== 'js-bundle' ||
      (container.packaging.properties?.runtime && container.packaging.properties.runtime !== 'node'))
  )
    return 'only Node.js js-bundle packaging is qualified';
  if (container.internalHealthCheck) return 'configured health checks are not qualified yet';
  if (workload.deployment) return 'blue/green deployments are not qualified';
  if (
    !container.events?.some((event) => event.type === 'http-api-gateway') ||
    container.events.some((event) => event.type !== 'http-api-gateway')
  )
    return 'only HTTP API routing is qualified';
  if (workload.enableRemoteSessions || workload.tracing)
    return 'remote sessions and tracing sidecars are not qualified';
  try {
    supervisorStopBudget(container.stopTimeout);
  } catch {
    return 'application shutdown grace exceeds the supported stop budget';
  }
  return undefined;
};
