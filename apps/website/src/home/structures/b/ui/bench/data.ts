/*
 * Benchmark bars for the Packages and Deploys pictures, read from `src/data/deploy-benchmarks.json` through the
 * benchmark helpers: the published medians, never estimates. Each group's bars run fastest to slowest, with Stacktape
 * wherever its time puts it.
 */
import { BENCHMARKS, findGroup, toolName } from '../../../../../variants/readme/benchmarks';

export type Bar = { label: string; seconds: number; us: boolean; note?: string };

/**
 * One benchmark group's bars, fastest first. `notes` puts a line under a tool's bar, e.g. how it deployed; `labels`
 * replaces a tool's name, e.g. to say what its time includes.
 */
export const barsOf = (
  comparison: string,
  view: string,
  app: string,
  notes: Record<string, string> = {},
  labels: Record<string, string> = {}
): Bar[] =>
  findGroup(comparison, view, app)
    .group.values.toSorted((left, right) => left.median - right.median)
    .map((value) => {
      const bar: Bar = {
        label: labels[value.tool] ?? toolName(BENCHMARKS, value.tool),
        seconds: value.median,
        us: value.tool === 'stacktape'
      };
      const note = notes[value.tool];
      if (note) bar.note = note;
      return bar;
    });

/** The slowest bar among several groups, so groups shown side by side share one scale. */
export const slowest = (...groups: Bar[][]) => Math.max(...groups.flat().map((bar) => bar.seconds));

/** A run: its date as the data writes it ("22 October 2026") and its results section in the public repository. */
export const runOf = (index: number) => {
  const run = BENCHMARKS.runs[index];
  if (!run) throw new Error(`The benchmark data has no run ${index}`);
  return { label: run.label, link: run.readme };
};
