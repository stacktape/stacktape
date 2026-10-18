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
    layerArns,
    deferFinalTags
  }: {
    workloadName: string;
    layerArns?: Map<number, string>;
    deferFinalTags?: boolean;
  }) => {
    steps.push({
      step: `function:${workloadName}`,
      ...(layerArns ? { layerArns: Object.fromEntries(layerArns) } : {})
    });
    const tagUpdatedFunction = async () => {
      steps.push({ step: `tag:${workloadName}` });
    };
    if (!deferFinalTags) return { updatedLayerArns: layerArns ? [...layerArns.values()] : undefined };
    return { updatedLayerArns: layerArns ? [...layerArns.values()] : undefined, tagUpdatedFunction };
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
  test('leaves functions pending when release recording fails, and records the retry before confirming tags', async () => {
    steps.length = 0;
    const plan = { functions: [lambda('api')], services: [], layers: [] } as FastDeployPlan;
    let failRecording = true;
    const deploymentArtifacts = {
      recordFastRelease: async () => {
        steps.push({ step: 'release' });
        if (failRecording) throw new Error('release storage unavailable');
      },
      deleteAllObsoleteArtifacts: async () => {
        steps.push({ step: 'retention' });
      }
    };
    await expect(
      performFastDeploy({ plan, recordRelease: true, progress, deploymentArtifacts } as never)
    ).rejects.toThrow('release storage unavailable');
    expect(steps.map(({ step }) => step)).toEqual(['layers:', 'function:api', 'release']);
    failRecording = false;
    steps.length = 0;
    await performFastDeploy({ plan, recordRelease: true, progress, deploymentArtifacts } as never);
    expect(steps.map(({ step }) => step)).toEqual(['layers:', 'function:api', 'release', 'tag:api', 'retention']);
  });

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

describe('HTTP API readiness after a fast deploy', () => {
  test('does not recommend internalHealthCheck when the default HTTP check already proves readiness', async () => {
    expect(await deploy([[webService('api'), 'new-instances-discoverable']])).toEqual([]);
    expect(await deploy([[webService('api'), 'rollout-completed']])).toEqual([]);
  });
});
