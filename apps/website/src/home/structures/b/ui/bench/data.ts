/*
 * Benchmark bars for the Packages and Deploys pictures, read from `src/data/deploy-benchmarks.json` through the
 * benchmark helpers: the published medians, never estimates. Each group's bars run fastest to slowest, with Stacktape
 * wherever its time puts it.
 */
import { BENCHMARKS, findGroup, toolName } from '../../../../../variants/readme/benchmarks';

export type Bar = { label: string; seconds: number; us: boolean };

/** One benchmark group's bars, fastest first. `rename` changes a tool's label, e.g. to add a footnote mark. */
export const barsOf = (comparison: string, view: string, app: string, rename: Record<string, string> = {}): Bar[] =>
  findGroup(comparison, view, app)
    .group.values.toSorted((left, right) => left.median - right.median)
    .map((value) => ({
      label: rename[value.tool] ?? toolName(BENCHMARKS, value.tool),
      seconds: value.median,
      us: value.tool === 'stacktape'
    }));

/** The slowest bar among several groups, so groups shown side by side share one scale. */
export const slowest = (...groups: Bar[][]) => Math.max(...groups.flat().map((bar) => bar.seconds));

/** A run's date as the data writes it, e.g. "22 October 2026". */
export const runLabel = (index: number) => {
  const run = BENCHMARKS.runs[index];
  if (!run) throw new Error(`The benchmark data has no run ${index}`);
  return run.label;
};
