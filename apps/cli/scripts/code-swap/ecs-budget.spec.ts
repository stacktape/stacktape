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
test('the service cap includes autoscaling maximum and deployment surge', () => {
  const service = (maximum: number, maximumPercent = 200) => ({ name: 'api', maximum, maximumPercent });
  expect(declaredCapacity([service(5)]).budgets[0]).toEqual({ name: 'api', tasks: 10, pollers: 15 });
  expect(declaredCapacity([service(10, 100)]).total).toBe(20);
  expect(declaredCapacity([service(6)]).budgets[0]?.reason).toContain('maximum 12 tasks');
  expect(declaredCapacity([service(11, 100)]).budgets[0]?.reason).toContain('exceeds 10');
  expect(declaredCapacity([service(7, 150)]).budgets[0]?.reason).toContain('maximum 11 tasks');
  for (const maximum of [0, -1, 1.5, Infinity, NaN])
    expect(declaredCapacity([service(maximum)]).budgets[0]?.reason).toContain('unknown');
  for (const percent of [0, 99, 201, Infinity, NaN])
    expect(declaredCapacity([service(1, percent)]).budgets[0]?.reason).toContain('unknown');
  expect(declaredCapacity(Array.from({ length: 25 }, (_, i) => ({ ...service(10, 100), name: `api${i}` }))).total).toBe(
    500
  );
  expect(() =>
    declaredCapacity(Array.from({ length: 26 }, (_, i) => ({ ...service(10, 100), name: `api${i}` })))
  ).toThrow('500');
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
