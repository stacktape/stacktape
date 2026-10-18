import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

type Poll = { hostMs: number; awsMs: number; rttMs: number; status: number; error?: string };
type Result = {
  label: string;
  start: number;
  firstMs?: number;
  allMs?: number;
  exitMs?: number;
  failure?: string;
  before: string[];
  after: string[];
  details?: {
    mode: string;
    fallback?: string;
    completed?: {
      task: string;
      timings: { oldReapedAtMs: number; memoryBefore: { peakBytes: number }; memoryAfter: { peakBytes: number } };
    }[];
  };
};
export const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  return p === 0.5
    ? (sorted[Math.floor((sorted.length - 1) / 2)]! + sorted[Math.ceil((sorted.length - 1) / 2)]!) / 2
    : sorted[Math.ceil(p * sorted.length) - 1]!;
};
export const calibrateClock = (polls: Poll[]) => {
  const samples = polls.filter((p) => Number.isFinite(p.awsMs) && p.awsMs > 0 && p.rttMs > 0 && p.rttMs < 200);
  if (samples.length < 100) throw new Error('Insufficient AWS clock samples.');
  const awsMean = samples.reduce((sum, p) => sum + p.awsMs, 0) / samples.length;
  const hostMean = samples.reduce((sum, p) => sum + p.hostMs - p.rttMs / 2, 0) / samples.length;
  const denominator = samples.reduce((sum, p) => sum + (p.awsMs - awsMean) ** 2, 0);
  const rate =
    samples.reduce((sum, p) => sum + (p.awsMs - awsMean) * (p.hostMs - p.rttMs / 2 - hostMean), 0) / denominator;
  const spanMs =
    samples.reduce((max, p) => Math.max(max, p.awsMs), -Infinity) -
    samples.reduce((min, p) => Math.min(min, p.awsMs), Infinity);
  if (spanMs < 30000 || !Number.isFinite(rate) || rate < 0.8 || rate > 1.3)
    throw new Error('Unqualified AWS clock calibration.');
  const offset = hostMean - rate * awsMean;
  const maxResidualMs = samples.reduce(
    (max, p) => Math.max(max, Math.abs(p.hostMs - p.rttMs / 2 - (offset + rate * p.awsMs))),
    0
  );
  if (maxResidualMs > 250) throw new Error(`Clock discontinuity or noisy calibration: ${maxResidualMs} ms residual.`);
  return { rate, offset, spanMs, samples: samples.length, maxResidualMs };
};
const distribution = (values: number[]) => ({
  n: values.length,
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  max: values.length ? Math.max(...values) : null
});
export const passesServingGate = (
  swap: { p50: number | null; p95: number | null; max: number | null; n: number },
  image: { p50: number | null; p95: number | null; n: number }
) =>
  swap.n >= 20 &&
  image.n >= 20 &&
  swap.p50 !== null &&
  swap.p95 !== null &&
  swap.max !== null &&
  image.p50 !== null &&
  image.p95 !== null &&
  swap.p50 <= 5 &&
  swap.p95 <= 15 &&
  swap.max <= 25 &&
  swap.p50 <= image.p50 / 2 &&
  swap.p95 <= image.p95 / 2;
const main = async () => {
  const directory = resolve(process.argv[2] ?? '');
  if (!process.argv[2]) throw new Error('Pass the owned run directory.');
  const report: { configurations: unknown[]; go: boolean; clockSource: string } = {
    configurations: [],
    go: true,
    clockSource: 'Fargate proxy Unix millisecond timestamps, regressed against client monotonic midpoint samples'
  };
  for (const memory of [512, 1024])
    for (const tasks of [1, 2]) {
      const location = join(directory, `${memory}-${tasks}`);
      let names: string[] = [];
      try {
        names = await readdir(location);
      } catch {}
      const results: Result[] = [];
      const polls: Poll[] = [];
      for (const name of names) {
        if (/^(swap|image)-\d+-[12]-\d\d\.json$/.test(name))
          results.push(JSON.parse(await readFile(join(location, name), 'utf8')));
        if (name.endsWith('-polls.json'))
          polls.push(...(JSON.parse(await readFile(join(location, name), 'utf8')) as Poll[]));
      }
      let clock: ReturnType<typeof calibrateClock> | undefined;
      let clockError: string | undefined;
      try {
        clock = calibrateClock(polls);
      } catch (error) {
        clockError = String(error);
      }
      const modes = Object.fromEntries(
        ['swap', 'image'].map((mode) => {
          const selected = results.filter((r) => r.label.startsWith(mode + '-'));
          const samples = (key: 'firstMs' | 'allMs' | 'exitMs') =>
            selected.flatMap((r) => (clock && r[key] !== undefined ? [r[key]! / clock.rate / 1000] : []));
          return [
            mode,
            {
              attempts: selected.length,
              first: distribution(samples('firstMs')),
              all: distribution(samples('allMs')),
              exit: distribution(samples('exitMs')),
              oldExit: distribution(
                selected.flatMap((r) =>
                  clock && r.details?.completed?.length
                    ? [
                        (Math.max(...r.details.completed.map((s) => s.timings.oldReapedAtMs)) * clock.rate +
                          clock.offset -
                          r.start) /
                          clock.rate /
                          1000
                      ]
                    : []
                )
              ),
              failures: selected.filter((r) => r.failure).length,
              fallbacks: selected.filter((r) => r.details?.fallback).length,
              memoryFallbacks: selected.filter((r) => r.details?.fallback === 'memory_screen').length,
              replacedDuringSwap: selected.filter(
                (r) =>
                  r.details?.mode === 'swap' &&
                  JSON.stringify([...r.before].sort()) !== JSON.stringify([...r.after].sort())
              ).length,
              largestPeakMiB: Math.max(
                0,
                ...selected.flatMap(
                  (r) => r.details?.completed?.map((s) => s.timings.memoryAfter.peakBytes / 1024 / 1024) ?? []
                )
              )
            }
          ];
        })
      );
      const swap = modes.swap!,
        image = modes.image!;
      const go =
        !!clock &&
        passesServingGate(swap.first, image.first) &&
        passesServingGate(swap.all, image.all) &&
        swap.failures === 0 &&
        swap.memoryFallbacks === 0 &&
        swap.replacedDuringSwap === 0;
      let continuous: { status: number; error?: string }[] = [];
      let continuousSource: string | undefined;
      for (const name of ['continuous-traffic.json', 'continuous-live.jsonl']) {
        try {
          const raw = await readFile(join(location, name), 'utf8');
          continuous = name.endsWith('jsonl')
            ? raw
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line))
            : JSON.parse(raw);
          continuousSource = name;
          break;
        } catch {}
      }
      const configuration = {
        memory,
        tasks,
        go,
        clock,
        clockError,
        ...modes,
        timedTraffic: {
          requests: polls.length,
          errors: polls.filter((p) => p.error || p.status >= 500 || p.status === 0).length
        },
        continuousTrace: {
          source: continuousSource,
          requests: continuous.length,
          errors: continuous.filter((p) => p.error || p.status >= 500 || p.status === 0).length,
          includesGaps: true,
          mayIncludeCleanup: continuousSource === 'continuous-live.jsonl'
        }
      };
      report.configurations.push(configuration);
      report.go &&= go;
    }
  await writeFile(join(directory, 'summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
