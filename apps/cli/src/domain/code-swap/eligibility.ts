import type { StpContainerWorkload } from '../config-manager/resolved-types/multi-container-workloads';
import { supervisorStopBudget } from './ecs-budget';

// A path the supervisor can request and the image can carry in an environment variable unchanged.
const SIMPLE_URL_PATH = /^\/[\w\-./~%?=&]*$/;

/**
 * How requests reach a code-swap service. Behind an application load balancer, the supervisor runs the target group's
 * health check (GET `checkPath`, status 200, `checkTimeout` seconds) before and after each switch.
 */
export const codeSwapRouting = (
  workload: StpContainerWorkload
):
  | { type: 'http-api-gateway' }
  | { type: 'application-load-balancer'; checkPath: string; checkTimeout: number }
  | undefined => {
  const container = workload.containers[0];
  const events = container?.events ?? [];
  if (events.length && events.every((event) => event.type === 'http-api-gateway')) return { type: 'http-api-gateway' };
  if (events.length === 1 && events[0]!.type === 'application-load-balancer')
    return {
      type: 'application-load-balancer',
      checkPath: container!.loadBalancerHealthCheck?.healthcheckPath || '/',
      checkTimeout: container!.loadBalancerHealthCheck?.healthcheckTimeout || 4
    };
  return undefined;
};

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
  const routing = codeSwapRouting(workload);
  if (!routing) return 'only HTTP API and application load balancer routing are qualified';
  if (routing.type === 'application-load-balancer' && !SIMPLE_URL_PATH.test(routing.checkPath))
    return 'the load balancer health check path must be a plain URL path';
  if (workload.enableRemoteSessions || workload.tracing)
    return 'remote sessions and tracing sidecars are not qualified';
  try {
    supervisorStopBudget(container.stopTimeout);
  } catch {
    return 'application shutdown grace exceeds the supported stop budget';
  }
  return undefined;
};
