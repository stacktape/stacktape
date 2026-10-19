import { expect, test } from 'bun:test';
import { declaredCapacity, supervisorStopBudget } from './ecs-budget';

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
test('declared maxima, surge and stopping generation fit before opt-in', () => {
  const service = (maximum: number, maximumPercent = 200) => ({
    name: 'api',
    maximum,
    maximumPercent,
    minimumHealthyPercent: 100
  });
  expect(declaredCapacity([service(150)]).total).toBe(450);
  expect(() => declaredCapacity([service(151)])).toThrow();
  // Exactly 451, including a declared maximum even when desired count is one.
  expect(() => declaredCapacity([service(149, 101), { ...service(75, 101), name: 'other' }])).toThrow();
  expect(() => declaredCapacity([service(100), { ...service(51), name: 'other' }])).toThrow();
  expect(() => declaredCapacity([service(Infinity)])).toThrow();
  expect(() => declaredCapacity([{ ...service(1), minimumHealthyPercent: 0 }])).toThrow();
  expect(() => declaredCapacity([service(1, 150)])).toThrow();
});

test('the benchmark can compare image readiness while swaps always retain the ECS gate', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { benchmarkContainerPolicy } = await import('./ecs-policy');
  const directory = await mkdtemp(join(tmpdir(), 'swap-readiness-control-'));
  const path = join(directory, 'run.json');
  const previous = process.env.STP_CODE_SWAP_BENCH_RUN;
  const container = { name: 'app', packaging: { type: 'js-bundle' } } as Parameters<typeof benchmarkContainerPolicy>[1];
  const workload = { name: 'api', containers: [container], resources: {}, scaling: { maxInstances: 2 } } as Parameters<
    typeof benchmarkContainerPolicy
  >[0];
  try {
    process.env.STP_CODE_SWAP_BENCH_RUN = path;
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap' }));
    expect(benchmarkContainerPolicy(workload, container).HealthCheck?.Command).toEqual([
      'CMD',
      '/stacktape-supervisor',
      'readiness'
    ]);
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'image', readinessControl: false }));
    expect(benchmarkContainerPolicy(workload, container).HealthCheck).toBeUndefined();
    expect(benchmarkContainerPolicy(workload, container).StopTimeout).toBe(60);
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap', readinessControl: false }));
    expect(() => benchmarkContainerPolicy(workload, container)).toThrow('image-only');
    await writeFile(path, JSON.stringify({ phase3: true, mode: 'swap' }));
    expect(() =>
      benchmarkContainerPolicy({ ...workload, scaling: { ...workload.scaling, maxInstances: 151 } }, container)
    ).toThrow('declared slots');
  } finally {
    if (previous === undefined) delete process.env.STP_CODE_SWAP_BENCH_RUN;
    else process.env.STP_CODE_SWAP_BENCH_RUN = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
