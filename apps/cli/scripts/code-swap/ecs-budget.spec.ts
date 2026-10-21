import { expect, test } from 'bun:test';
import { capacityWithOverrides, declaredCapacity, supervisorStopBudget } from '../../src/domain/code-swap/ecs-budget';

test('stop budgets preserve app grace and account for the separately ordered drain', () => {
  expect(supervisorStopBudget()).toEqual({
    grace: 2,
    drain: 2,
    routingDrain: 30,
    stopTimeout: 60,
    cloudMapDrain: 35,
    maximumOrderedStop: 100
  });
  expect(supervisorStopBudget(30).stopTimeout).toBe(62);
  expect(supervisorStopBudget(40).stopTimeout).toBe(82);
  expect(supervisorStopBudget(59).stopTimeout).toBe(120);
  for (const grace of [-1, 0.5, 60, 120, NaN]) expect(() => supervisorStopBudget(grace)).toThrow();
});
test('the service cap includes autoscaling maximum and deployment surge', () => {
  const service = (maximum: number, maximumPercent = 200) => ({ name: 'api', maximum, maximumPercent });
  expect(declaredCapacity([service(5)]).budgets[0]).toEqual({ name: 'api', tasks: 10, pollers: 15 });
  expect(declaredCapacity([service(10, 100)]).budgets[0]?.reason).toContain('surge');
  expect(declaredCapacity([service(6)]).budgets[0]?.reason).toContain('maximum 12 tasks');
  expect(declaredCapacity([service(11, 100)]).budgets[0]?.reason).toBeDefined();
  expect(declaredCapacity([service(7, 150)]).budgets[0]?.tasks).toBe(10);
  expect(declaredCapacity([service(8, 150)]).budgets[0]?.reason).toContain('maximum 12 tasks');
  for (const maximum of [0, -1, 1.5, Infinity, NaN])
    expect(declaredCapacity([service(maximum)]).budgets[0]?.reason).toContain('unknown');
  for (const percent of [0, 99, 201, Infinity, NaN])
    expect(declaredCapacity([service(1, percent)]).budgets[0]?.reason).toContain('unknown');
  expect(declaredCapacity(Array.from({ length: 33 }, (_, i) => ({ ...service(5), name: `api${i}` }))).total).toBe(495);
  expect(() => declaredCapacity(Array.from({ length: 34 }, (_, i) => ({ ...service(5), name: `api${i}` })))).toThrow(
    '500'
  );
});

test('the benchmark can compare image readiness while swaps always retain the ECS gate', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { codeSwapContainerPolicy } = await import('../../src/domain/code-swap/ecs-policy');
  const directory = await mkdtemp(join(tmpdir(), 'swap-readiness-control-'));
  const path = join(directory, 'run.json');
  const previous = process.env.STP_CODE_SWAP_BENCH_RUN;
  const container = { name: 'app', packaging: { type: 'js-bundle' } } as Parameters<typeof codeSwapContainerPolicy>[1];
  const workload = { name: 'api', containers: [container], resources: {}, scaling: { maxInstances: 2 } } as Parameters<
    typeof codeSwapContainerPolicy
  >[0];
  try {
    process.env.STP_CODE_SWAP_BENCH_RUN = path;
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap' }));
    expect(codeSwapContainerPolicy(workload, container).HealthCheck?.Command).toEqual([
      'CMD',
      '/stacktape-supervisor',
      'readiness'
    ]);
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'image', readinessControl: false }));
    expect(codeSwapContainerPolicy(workload, container).HealthCheck).toBeUndefined();
    expect(codeSwapContainerPolicy(workload, container).StopTimeout).toBe(60);
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap', readinessControl: false }));
    expect(() => codeSwapContainerPolicy(workload, container)).toThrow('image-only');
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap' }));
    expect(
      codeSwapContainerPolicy({ ...workload, scaling: { ...workload.scaling, maxInstances: 6 } }, container)
    ).toEqual({});
  } finally {
    if (previous === undefined) delete process.env.STP_CODE_SWAP_BENCH_RUN;
    else process.env.STP_CODE_SWAP_BENCH_RUN = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('effective desired-count and surge overrides cannot bypass the cap', () => {
  const service = { name: 'api', maximum: 5, maximumPercent: 200 };
  expect(capacityWithOverrides(service, undefined).tasks).toBe(10);
  expect(capacityWithOverrides(service, { DesiredCount: 6 }).reason).toContain('maximum 12');
  expect(
    capacityWithOverrides({ ...service, maximum: 10 }, { 'DeploymentConfiguration.MaximumPercent': 100 }).tasks
  ).toBe(10);
  expect(
    capacityWithOverrides({ ...service, maximum: 6 }, { DeploymentConfiguration: { MaximumPercent: 200 } }).reason
  ).toContain('maximum 12');
  expect(capacityWithOverrides(service, { DeploymentConfiguration: { Ref: 'unknown' } }).reason).toContain('unknown');
  expect(capacityWithOverrides(service, { DesiredCount: { Ref: 'unknown' } }).reason).toContain('unknown');
});

test('an autoscaling resource override cannot exceed the service cap', () => {
  const service = { name: 'api', maximum: 1, maximumPercent: 200 };
  expect(declaredCapacity([{ ...service, scalingOverrides: { MaxCapacity: 5 } }]).budgets[0]?.tasks).toBe(10);
  expect(declaredCapacity([{ ...service, scalingOverrides: { MaxCapacity: 6 } }]).budgets[0]?.reason).toContain(
    'maximum 12'
  );
  for (const MaxCapacity of [{ Ref: 'unknown' }, -1, 0, 1.5])
    expect(declaredCapacity([{ ...service, scalingOverrides: { MaxCapacity } }]).budgets[0]?.reason).toContain(
      'unknown'
    );
});

test('unresolved and scheduled override bounds use images', () => {
  const service = { name: 'api', maximum: 1, maximumPercent: 200 };
  for (const scalingOverrides of [
    { ScheduledActions: [{ ScalableTargetAction: { MaxCapacity: 100 } }] },
    { 'MaxCapacity.Ref': 'unknown' }
  ])
    expect(declaredCapacity([{ ...service, scalingOverrides }]).budgets[0]?.reason).toContain('unknown');
  for (const overrides of [
    { 'DesiredCount.Ref': 'unknown' },
    { 'DeploymentController.Type': 'CODE_DEPLOY' },
    { 'DeploymentConfiguration.MaximumPercent.Ref': 'unknown' }
  ])
    expect(declaredCapacity([{ ...service, overrides }]).budgets[0]?.reason).toContain('unknown');
});

test('healthy-old capacity rejects stop-first and unresolved minimumHealthyPercent overrides', () => {
  const service = { name: 'api', maximum: 5, maximumPercent: 200 };
  for (const overrides of [
    { 'DeploymentConfiguration.MinimumHealthyPercent': 90 },
    { DeploymentConfiguration: { MaximumPercent: 200, MinimumHealthyPercent: 90 } },
    { 'DeploymentConfiguration.MinimumHealthyPercent.Ref': 'unknown' },
    { 'DeploymentConfiguration.MaximumPercent': 100 }
  ])
    expect(capacityWithOverrides(service, overrides).reason).toBeDefined();
  expect(
    capacityWithOverrides({ ...service, maximum: 9 }, { 'DeploymentConfiguration.MaximumPercent': 112 }).tasks
  ).toBe(10);
});

test('customer workload eligibility keeps unqualified platforms and checks on images', async () => {
  const { unsupportedReason } = await import('../../src/domain/code-swap/eligibility');
  const workload = {
    name: 'orders',
    codeSwap: true,
    resources: { memory: 1024 },
    scaling: { maxInstances: 2 },
    containers: [
      { name: 'server', packaging: { type: 'js-bundle', properties: {} }, events: [{ type: 'http-api-gateway' }] }
    ]
  } as Parameters<typeof unsupportedReason>[0];
  expect(unsupportedReason(workload, 1)).toBeUndefined();
  expect(unsupportedReason({ ...workload, resources: { ...workload.resources, architecture: 'arm64' } }, 1)).toContain(
    'arm64'
  );
  expect(unsupportedReason(workload, 5)).toBeUndefined();
  expect(
    unsupportedReason(
      {
        ...workload,
        containers: [{ ...workload.containers[0]!, internalHealthCheck: { healthCheckCommand: ['CMD', 'true'] } }]
      },
      1
    )
  ).toContain('configured health');
});

test('memory fallback explains the measured requirement and a supported remedy', async () => {
  const { memoryFallbackReason } = await import('../../src/domain/code-swap/ecs-budget');
  const memory = {
    peakBytes: 200 * 1024 * 1024,
    effectiveLimitBytes: 512 * 1024 * 1024,
    peakFile: 'memory.max_usage_in_bytes'
  };
  const reason = memoryFallbackReason(memory, [512, 1024, 2048]);
  expect(reason).toContain('627 MiB');
  expect(reason).toContain('resources.memory: 1024');
  expect(memoryFallbackReason({ ...memory, peakBytes: 0 }, [512, 1024])).toContain('Increasing memory alone cannot');
});

test('surge must permit a replacement at the smallest configured fleet too', () => {
  const service = { name: 'api', minimum: 1, maximum: 7, maximumPercent: 150 };
  expect(capacityWithOverrides(service, undefined).reason).toContain('surge');
  expect(capacityWithOverrides({ ...service, minimum: 2 }, undefined).tasks).toBe(10);
  expect(capacityWithOverrides({ ...service, minimum: 2 }, { DesiredCount: 1 }).reason).toContain('surge');
  expect(
    capacityWithOverrides({ ...service, minimum: 2, scalingOverrides: { MinCapacity: 1 } }, undefined).reason
  ).toContain('surge');
});

test('an image-only fallback never receives a command for a supervisor absent from its image', async () => {
  const { codeSwapIntegration } = await import('../../src/domain/code-swap/integration');
  const { codeSwapContainerPolicy } = await import('../../src/domain/code-swap/ecs-policy');
  const previous = codeSwapIntegration.imageHasSupervisor;
  try {
    codeSwapIntegration.imageHasSupervisor = new Map([['orders', false]]);
    const container = { name: 'app', packaging: { type: 'js-bundle' } } as Parameters<
      typeof codeSwapContainerPolicy
    >[1];
    const workload = {
      name: 'orders',
      codeSwap: true,
      containers: [container],
      resources: {},
      scaling: { minInstances: 1, maxInstances: 2 }
    } as Parameters<typeof codeSwapContainerPolicy>[0];
    expect(codeSwapContainerPolicy(workload, container)).toEqual({});
  } finally {
    codeSwapIntegration.imageHasSupervisor = previous;
  }
});
