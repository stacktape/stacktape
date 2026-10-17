import { beforeAll, describe, expect, mock, test } from 'bun:test';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { RollingUpdateFinish } from 'src/aws/ecs';
import type { FastDeployPlan } from './fast-deploy';

const hints: string[] = [];
const finishes = new Map<string, RollingUpdateFinish>();
mock.module('@application-services/tui-manager', () => ({
  tuiManager: { hint: (message: string) => hints.push(message) }
}));
mock.module('../_utils/cw-deployment', () => ({
  getECSHotswapInformation: async () => ({}),
  updateEcsService: async ({ workload }: { workload: StpContainerWorkload }) => ({
    finishedWhen: finishes.get(workload.name)
  })
}));
mock.module('../_utils/fn-deployment', () => ({
  getLambdaFunctionHotswapInformation: () => ({}),
  updateFunctionCode: async () => {}
}));
let performFastDeploy: typeof import('./fast-deploy').performFastDeploy;
beforeAll(async () => {
  ({ performFastDeploy } = await import('./fast-deploy'));
});

const webService = (
  name: string,
  { ingress = 'http-api-gateway', healthCheck = false }: { ingress?: string; healthCheck?: boolean } = {}
) =>
  ({
    name,
    nameChain: [name],
    configParentResourceType: 'web-service',
    containers: [
      {
        name: 'service-container',
        events: [{ type: ingress, properties: {} }],
        ...(healthCheck && { internalHealthCheck: { healthCheckCommand: ['CMD', 'true'] } })
      }
    ]
  }) as unknown as StpContainerWorkload;

const deploy = async (services: [StpContainerWorkload, RollingUpdateFinish][]) => {
  hints.length = 0;
  for (const [workload, finishedWhen] of services) finishes.set(workload.name, finishedWhen);
  const plan = { functions: [], services: services.map(([workload]) => ({ workload })) } as unknown as FastDeployPlan;
  const progress = { startEvent: async () => {}, finishEvent: async () => {} };
  await performFastDeploy({ plan, recordRelease: false, progress, deploymentArtifacts: {} } as never);
  return hints;
};

describe('the hint after a fast deploy that waited for ECS to stop the old containers', () => {
  test('is printed once for web services behind an HTTP API without internalHealthCheck', async () => {
    const printed = await deploy([
      [webService('api'), 'rollout-completed'],
      [webService('admin'), 'rollout-completed'],
      [webService('web', { healthCheck: true }), 'new-instances-discoverable']
    ]);

    expect(printed).toEqual([
      'The update of api, admin waited about 3 minutes for ECS to stop the old containers, although the new version ' +
        'already served requests. Add internalHealthCheck to their containers so Stacktape finishes as soon as the new ' +
        'version is healthy: https://docs.stacktape.com/resources/compute/web-service/#how-deploys-replace-containers'
    ]);
    expect((await deploy([[webService('api'), 'rollout-completed']]))[0]).toContain('to its container');
  });

  test.each<[string, StpContainerWorkload, RollingUpdateFinish]>([
    [
      'finished once API Gateway discovered the new version',
      webService('api', { healthCheck: true }),
      'new-instances-discoverable'
    ],
    // With a health check, only a missing permission makes the update wait; the hint would not help.
    ['has an internalHealthCheck', webService('api', { healthCheck: true }), 'rollout-completed'],
    ['is behind a load balancer', webService('api', { ingress: 'application-load-balancer' }), 'rollout-completed'],
    [
      'is not a web service',
      { ...webService('worker'), configParentResourceType: 'worker-service' } as StpContainerWorkload,
      'rollout-completed'
    ]
  ])('is not printed for a service that %s', async (_, workload, finishedWhen) => {
    expect(await deploy([[workload, finishedWhen]])).toEqual([]);
  });
});
