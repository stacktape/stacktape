/*
 * The deploy benchmarks as the website shows them: the published medians from
 * https://github.com/stacktape/deploy-benchmarks, copied into `src/data/deploy-benchmarks.json` with
 * the results file each value came from. Nothing here estimates or derives a measurement; the
 * helpers only format values and size bars.
 */
import raw from '../../data/deploy-benchmarks.json';

export type ToolId = 'stacktape' | 'serverless' | 'sst' | 'cdk' | 'cdk-hotswap' | 'heroku' | 'render';

export type BenchmarkValue = {
  tool: string;
  median: number;
  min: number;
  max: number;
  runs: number;
  date: string;
  /** The results file in the benchmark repository this value was copied from. */
  file: string;
};

export type BenchmarkGroup = { app: string; label: string; values: BenchmarkValue[] };
export type BenchmarkView = { id: string; label: string; groups: BenchmarkGroup[] };

export type Comparison = {
  id: string;
  label: string;
  title: string;
  description: string;
  unit: string;
  views: BenchmarkView[];
  notes: string[];
};

export type BenchmarkRun = {
  date: string;
  label: string;
  what: string;
  window: string;
  machine: string;
  stacktape: string;
  competitors: string;
  readme: string;
  files: string;
};

export type BenchmarkData = {
  status: string;
  source: string;
  issues: string;
  runs: BenchmarkRun[];
  tools: Record<ToolId, string>;
  comparisons: Comparison[];
};

export const BENCHMARKS: BenchmarkData = raw;

export const toolName = (data: BenchmarkData, tool: string) => data.tools[tool as ToolId] ?? tool;

/** Seconds keep the one decimal the results publish; megabytes keep two. */
export const formatValue = (value: number, unit: string) =>
  unit === 'MB' ? `${value.toFixed(2)} MB` : `${value.toFixed(1)} s`;

/** One scale per comparison, shared by all of its views, so switching a view never rescales the bars. */
export const scaleMax = (comparison: Comparison) =>
  Math.max(...comparison.views.flatMap((view) => view.groups.flatMap((group) => group.values.map((v) => v.median))));

/** A link to the results file a value came from, on the repository's main branch. */
export const fileUrl = (data: BenchmarkData, file: string) => `${data.source}/blob/main/${file}`;

export const findGroup = (comparisonId: string, viewId: string, app: string) => {
  const comparison = BENCHMARKS.comparisons.find((candidate) => candidate.id === comparisonId);
  const view = comparison?.views.find((candidate) => candidate.id === viewId);
  const group = view?.groups.find((candidate) => candidate.app === app);
  if (!comparison || !group) throw new Error(`No benchmark group ${comparisonId}/${viewId}/${app}`);
  return { comparison, group };
};
