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
/** What the fast deployment did, in order: layer resolutions, function updates and the final cleanup. */
const steps: { step: string; layerArns?: Record<number, string> }[] = [];
let failLayerPublication = false;
mock.module('../_utils/fn-deployment', () => ({
  getLambdaFunctionHotswapInformation: () => ({}),
  getSharedLayerHotswapInformation: () => [],
  findLambdaOutsideFastPathUsingLayers: () => undefined,
  resolveSharedLayerVersions: async (layers: { layerNumber: number }[]) => {
    steps.push({ step: `layers:${layers.map(({ layerNumber }) => layerNumber).join(',')}` });
    if (failLayerPublication) throw new Error('the layer object is gone');
    return new Map(layers.map(({ layerNumber }) => [layerNumber, `arn:layer:${layerNumber}`]));
  },
  updateFunctionCode: async ({
    workloadName,
    layerArns
  }: {
    workloadName: string;
    layerArns?: Map<number, string>;
  }) => {
    steps.push({
      step: `function:${workloadName}`,
      ...(layerArns ? { layerArns: Object.fromEntries(layerArns) } : {})
    });
    return { updatedLayerArns: layerArns ? [...layerArns.values()] : undefined };
  },
  deleteSupersededSharedLayerVersions: async ({ knownLayerArns }: { knownLayerArns: Map<string, string[]> }) => {
    steps.push({ step: `cleanup:${[...knownLayerArns.keys()].join(',')}` });
  }
}));
let performFastDeploy: typeof import('./fast-deploy').performFastDeploy;
beforeAll(async () => {
  ({ performFastDeploy } = await import('./fast-deploy'));
});

const lambda = (name: string, changedLayerNumbers: number[] = [], layerNumbers = changedLayerNumbers) =>
  ({
    workloadName: name,
    lambdaResourceName: `stack-${name}`,
    layers: layerNumbers.map((layerNumber) => ({ layerNumber })),
    changedLayers: changedLayerNumbers.map((layerNumber) => ({ layerNumber }))
  }) as unknown as FastDeployPlan['functions'][number];
const progress = { startEvent: async () => {}, finishEvent: async () => {} };

describe('a fast deployment with shared layers', () => {
  test('publishes the changed layers before any function and gives their versions to the functions that use them', async () => {
    steps.length = 0;
    const plan = {
      functions: [lambda('api', [1]), lambda('worker', [], [1]), lambda('report', [0, 1])],
      services: [],
      layers: [{ layerNumber: 0 }, { layerNumber: 1 }]
    } as unknown as FastDeployPlan;
    await performFastDeploy({ plan, recordRelease: false, progress, deploymentArtifacts: {} } as never);
    expect(steps[0]).toEqual({ step: 'layers:0,1' });
    expect(
      steps
        .slice(1, 4)
        .map(({ step }) => step)
        .toSorted()
    ).toEqual(['function:api', 'function:report', 'function:worker']);
    // A function whose own code alone changed keeps its layers; the others get every layer's version.
    expect(steps.find(({ step }) => step === 'function:worker')!.layerArns).toBeUndefined();
    expect(steps.find(({ step }) => step === 'function:api')!.layerArns).toEqual({
      0: 'arn:layer:0',
      1: 'arn:layer:1'
    });
    expect(steps.at(-1)).toEqual({ step: 'cleanup:stack-api,stack-report' });
  });

  test('changes no function when a layer cannot be published, and says so', async () => {
    steps.length = 0;
    failLayerPublication = true;
    try {
      const plan = {
        functions: [lambda('api', [1])],
        services: [],
        layers: [{ layerNumber: 1 }]
      } as unknown as FastDeployPlan;
      const failure = await performFastDeploy({
        plan,
        recordRelease: false,
        progress,
        deploymentArtifacts: {}
      } as never).catch((error: Error) => error);
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toContain('Publishing the shared layers failed: the layer object is gone');
      expect(steps.map(({ step }) => step)).toEqual(['layers:1']);
    } finally {
      failLayerPublication = false;
    }
  });

  test('neither publishes nor cleans up when no function needs another layer', async () => {
    steps.length = 0;
    const plan = {
      functions: [lambda('api', [], [1])],
      services: [],
      layers: [{ layerNumber: 1 }]
    } as unknown as FastDeployPlan;
    await performFastDeploy({ plan, recordRelease: false, progress, deploymentArtifacts: {} } as never);
    expect(steps.map(({ step }) => step)).toEqual(['layers:', 'function:api']);
  });
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
  const plan = {
    functions: [],
    services: services.map(([workload]) => ({ workload })),
    layers: []
  } as unknown as FastDeployPlan;
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
