import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeBenchmark, calibrateClock, passesServingGate, passesRegressionGate, percentile } from './analyze';
import { diagnoseConfiguration } from './diagnose';
test('the serving gate keeps tails, failures in sample count, and both matched-image ratios', () => {
  expect(
    percentile(
      Array.from({ length: 20 }, (_, i) => i + 1),
      0.95
    )
  ).toBe(19);
  const swap = { n: 20, p50: 5, p95: 15, max: 25 },
    image = { n: 20, p50: 10, p95: 30 };
  expect(passesServingGate(swap, image)).toBe(true);
  expect(passesRegressionGate(swap)).toBe(true);
  for (const candidate of [
    { ...swap, n: 19 },
    { ...swap, p50: 5.01 },
    { ...swap, p95: 15.01 },
    { ...swap, max: 25.01 }
  ]) {
    expect(passesServingGate(candidate, image)).toBe(false);
    expect(passesRegressionGate(candidate)).toBe(false);
  }
  expect(passesServingGate(swap, { ...image, p50: 9.9 })).toBe(false);
  expect(passesServingGate(swap, { ...image, p95: 29.9 })).toBe(false);
});
test('clock calibration measures the rate instead of assuming the historical 9.6 percent correction', () => {
  const polls = Array.from({ length: 200 }, (_, i) => ({
    hostMs: 1000 + i * 500 * 1.096 + 20,
    awsMs: 1792300000000 + i * 500,
    rttMs: 40,
    status: 200
  }));
  expect(calibrateClock(polls).rate).toBeCloseTo(1.096, 6);
  expect(() => calibrateClock(polls.slice(0, 5))).toThrow('Insufficient');
});

test('per-edit fits handle gradual clock-rate changes that invalidate one long-run fit', () => {
  const windows = Array.from({ length: 10 }, (_, window) =>
    Array.from({ length: 200 }, (_, i) => {
      const seconds = window * 250000 + i * 40;
      return {
        hostMs: 1000 + 1.09 * seconds + (0.005 * seconds * seconds) / 2000000 + 20,
        awsMs: 1792300000000 + seconds,
        rttMs: 40,
        status: 200
      };
    })
  );
  expect(() => calibrateClock(windows.flat())).toThrow('Clock discontinuity');
  for (const window of windows) {
    const fit = calibrateClock(window, 3000);
    const middle = (window[0]!.awsMs + window.at(-1)!.awsMs) / 2 - 1792300000000;
    expect(fit.rate).toBeCloseTo(1.09 + (0.01 * middle) / 2000000, 5);
    expect(fit.maxResidualMs).toBeLessThan(1);
  }
});

test('analysis and its CLI reject failed controls and memory fallbacks even with fast serving', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-swap-gate-'));
  try {
    await Promise.all(
      [512, 1024].flatMap((memory) =>
        [1, 2].map(async (tasks) => {
          const location = join(directory, `${memory}-${tasks}`);
          await mkdir(location);
          await Promise.all(
            ['swap', 'image'].flatMap((mode) =>
              Array.from({ length: 20 }, async (_, index) => {
                const label = `${mode}-${memory}-${tasks}-${String(index + 1).padStart(2, '0')}`;
                const start = 100000 + index * 100000;
                const serving = mode === 'swap' ? 4000 : 40000;
                const polls = Array.from({ length: 101 }, (_, i) => {
                  const elapsed = (i * (mode === 'swap' ? 10000 : 60000)) / 100;
                  return {
                    hostMs: start + elapsed * 1.096 + 20,
                    awsMs: 1792300000000 + elapsed,
                    rttMs: 40,
                    status: 200
                  };
                });
                await Promise.all([
                  writeFile(join(location, `${label}-polls.json`), JSON.stringify(polls)),
                  writeFile(
                    join(location, `${label}.json`),
                    JSON.stringify({
                      label,
                      start,
                      firstMs: serving * 1.096,
                      allMs: (serving + 100) * 1.096,
                      exitMs: (serving + 1000) * 1.096,
                      before: ['task-a'],
                      after: ['task-a'],
                      details: { mode }
                    })
                  )
                ]);
              })
            )
          );
        })
      )
    );
    expect((await analyzeBenchmark(directory)).go).toBe(true);
    const swapPollsPath = join(directory, '512-1/swap-512-1-01-polls.json');
    const originalPolls = await readFile(swapPollsPath, 'utf8');
    const errorPolls = JSON.parse(originalPolls) as { status: number; error?: string }[];
    errorPolls[0] = { ...errorPolls[0]!, status: 0, error: 'TimeoutError: public request timed out' };
    await writeFile(swapPollsPath, JSON.stringify(errorPolls));
    expect((await analyzeBenchmark(directory)).go).toBe(false);
    const ledger = JSON.parse(await readFile(join(directory, '512-1/request-errors.json'), 'utf8')) as {
      phase: string;
      type: string;
    }[];
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.phase).toBe('swap');
    expect(ledger[0]!.type).toContain('TimeoutError');
    await writeFile(swapPollsPath, originalPolls);
    const controlPath = join(directory, '512-1/image-512-1-01.json');
    const originalControl = await readFile(controlPath, 'utf8');
    const control = JSON.parse(originalControl) as { failure?: string };
    control.failure = 'The image served but its release history failed.';
    await writeFile(controlPath, JSON.stringify(control));
    expect((await analyzeBenchmark(directory)).go).toBe(false);
    await writeFile(controlPath, originalControl);
    const target = join(directory, '512-1/swap-512-1-01.json');
    const failed = JSON.parse(await readFile(target, 'utf8')) as { details: { mode: string; fallback?: string } };
    failed.details = { mode: 'image', fallback: 'memory_screen' };
    await writeFile(target, JSON.stringify(failed));
    const child = Bun.spawn([process.execPath, join(import.meta.dir, 'analyze.ts'), directory], {
      stdout: 'ignore',
      stderr: 'pipe'
    });
    expect(await child.exited).toBe(1);
    expect((JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8')) as { go: boolean }).go).toBe(false);
    expect(await readFile(target, 'utf8')).toBe(JSON.stringify(failed));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

test('diagnostics map shared monotonic traces through AWS fits and retain requests crossing proposal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-swap-diagnostics-'));
  try {
    const label = 'swap-512-1-01',
      awsStart = 1792300000000,
      start = 1000,
      hostClockOffsetMs = 5000;
    const host = (seconds: number) => start + seconds * 1100;
    const at = (seconds: number) => host(seconds) + hostClockOffsetMs;
    const events = [
      { phase: 'event', eventType: 'LOAD_USER_DATA', status: 'started', hostMs: at(1) },
      { phase: 'event', eventType: 'LOAD_CONFIG_FILE', status: 'started', hostMs: at(1.5) },
      { phase: 'event', eventType: 'LOAD_METADATA_FROM_AWS', status: 'completed', hostMs: at(2) },
      { phase: 'event', eventType: 'BUILD_CODE', status: 'completed', hostMs: at(2.1) },
      { phase: 'event', eventType: 'UPLOAD_IMAGE', status: 'completed', hostMs: at(4) },
      { phase: 'bundleUpload:start', hostMs: at(1.9) },
      { phase: 'bundleUpload:end', hostMs: at(2) },
      { phase: 'prepareFleet:end', hostMs: at(2.1) },
      { phase: 'preparePrerequisitesReady', hostMs: at(2.1) },
      { phase: 'signal:prepare', hostMs: at(2.2) },
      { phase: 'signal:commit', hostMs: at(4.5) },
      {
        phase: 'aws-http',
        hostMs: at(2),
        startedHostMs: at(1.5),
        service: 'sts.example',
        target: 'GetCallerIdentity',
        socketMs: 11,
        dnsMs: 33,
        connectMs: 66,
        tlsMs: 110,
        sentMs: 132,
        firstByteMs: 440,
        totalMs: 550,
        attempt: 'attempt=2; max=3',
        reused: 0
      },
      {
        phase: 'aws-http',
        hostMs: at(3),
        startedHostMs: at(2),
        service: 'sts.example',
        socketMs: 1,
        sentMs: 22,
        firstByteMs: 1089,
        totalMs: 1100,
        reused: 1
      }
    ];
    await writeFile(join(directory, `${label}-trace.jsonl`), events.map((e) => JSON.stringify(e)).join('\n'));
    const failed = {
      hostMs: host(3),
      requestStartMs: host(2),
      awsMs: 0,
      rttMs: 1100,
      status: 503,
      requestId: 'gateway-one'
    };
    await writeFile(join(directory, `${label}-polls.json`), JSON.stringify([failed]));
    await writeFile(
      join(directory, 'continuous-traffic.json'),
      JSON.stringify([
        { ...failed, hostMs: host(-4), requestStartMs: host(-5), phase: 'baseline', requestId: 'baseline-one' }
      ])
    );
    await writeFile(
      join(directory, 'gateway-errors.json'),
      JSON.stringify([
        {
          timestamp: awsStart + 3000,
          message: JSON.stringify({
            requestId: 'gateway-one',
            requestTimeEpoch: '1792300003',
            status: '503',
            integrationError: 'unavailable',
            integrationLatency: '1'
          })
        }
      ])
    );
    const report = await diagnoseConfiguration(
      directory,
      [
        {
          label,
          start,
          hostClockOffsetMs,
          allMs: 4.65 * 1100,
          details: { mode: 'swap', completed: [{ task: 'task-a', timings: { switchedAtMs: awsStart + 4600 } }] }
        }
      ],
      new Map([[label, { rate: 1.1, offset: start - 1.1 * awsStart }]])
    );
    expect(report.timingSeconds.startup!.p50).toBeCloseTo(1, 4);
    expect(report.timingSeconds.precommit!.p50).toBeCloseTo(0.5, 4);
    expect(report.timingSeconds.commitToSwitch!.p50).toBeCloseTo(0.1, 4);
    const timings = JSON.parse(await readFile(join(directory, 'timing-details.json'), 'utf8'));
    expect(timings[0].overlappingWork.bundleUpload).toBeCloseTo(0.1, 6);
    expect(timings[0].overlappingWork.proposalWrite).toBeCloseTo(0.1, 6);
    const transport = timings[0].networkRequests;
    expect(transport[0].attempt).toBe('attempt=2; max=3');
    expect(transport[0].transportSeconds.dns).toBeCloseTo(0.02, 6);
    expect(transport[0].transportSeconds.connect).toBeCloseTo(0.03, 6);
    expect(transport[0].transportSeconds.tls).toBeCloseTo(0.04, 6);
    expect(transport[0].transportSeconds.responseWait).toBeCloseTo(0.28, 6);
    expect(transport[0].transportSeconds.total).toBeCloseTo(0.5, 6);
    expect(transport[1].transportSeconds.dns).toBe(0);
    expect(transport[1].transportSeconds.tls).toBe(0);
    expect(report.requestErrors.total).toBe(2);
    expect(report.requestErrors.duringSwaps).toBe(1);
    expect(report.requestErrors.gatewayMatched).toBe(1);
    const ledger = JSON.parse(await readFile(join(directory, 'request-errors.json'), 'utf8')) as {
      transition?: string;
      requestStartAwsMs?: number;
      requestEndAwsMs?: number;
      gateway?: { loggedAtMs: number; integrationError: string };
    }[];
    expect(ledger[0]!.transition).toBe('crosses-proposal');
    expect(ledger[0]!.requestStartAwsMs).toBeCloseTo(awsStart + 2000, 2);
    expect(ledger[0]!.requestEndAwsMs).toBeCloseTo(awsStart + 3000, 2);
    expect(ledger[0]!.gateway?.loggedAtMs).toBe(awsStart + 3000);
    expect(ledger[0]!.gateway?.integrationError).toBe('unavailable');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== 'linux')(
  'initial route qualification resets after gateway errors and foreign tasks',
  async () => {
    const { createServer } = await import('node:http');
    const { waitForInitialRoutes } = await import('./run');
    let count = 0;
    const server = createServer((_req, res) => {
      count++;
      res.statusCode = count === 2 ? 503 : 200;
      res.setHeader('x-lab-now-ms', String(Date.now()));
      res.setHeader('x-lab-task', count === 3 ? 'foreign' : 'expected');
      res.end(JSON.stringify({ revision: 'baseline' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const samples: Parameters<typeof waitForInitialRoutes>[2] = [];
    try {
      const { port } = server.address() as import('node:net').AddressInfo;
      await waitForInitialRoutes(`http://127.0.0.1:${port}`, ['expected'], samples, 80);
      expect(samples[0]!.status).toBe(200);
      expect(samples[1]!.status).toBe(503);
      expect(samples[2]!.task).toBe('foreign');
      const stable = samples.slice(3);
      expect(stable.every((s) => s.status === 200 && s.task === 'expected')).toBe(true);
      expect(stable.at(-1)!.awsMs - stable[0]!.awsMs).toBeGreaterThanOrEqual(80);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
);
