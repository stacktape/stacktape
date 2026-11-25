/*
 * The deploy benchmarks as the website shows them: the published medians from
 * https://github.com/stacktape/deploy-benchmarks, copied into `src/data/deploy-benchmarks.json` with
 * the results file each value came from. Nothing here estimates or derives a measurement; the
 * helpers only format values and size bars.
 */
import raw from '../data/deploy-benchmarks.json';

type ToolId = 'stacktape' | 'serverless' | 'sst' | 'cdk' | 'cdk-hotswap' | 'heroku' | 'render';

type BenchmarkValue = {
  tool: string;
  median: number;
  min: number;
  max: number;
  runs: number;
  date: string;
  /** The results file in the benchmark repository this value was copied from. */
  file: string;
};

type BenchmarkGroup = { app: string; label: string; values: BenchmarkValue[] };
type BenchmarkView = { id: string; label: string; groups: BenchmarkGroup[] };

type Comparison = {
  id: string;
  label: string;
  title: string;
  description: string;
  unit: string;
  views: BenchmarkView[];
  notes: string[];
};

type BenchmarkRun = {
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

type BenchmarkData = {
  status: string;
  source: string;
  issues: string;
  runs: BenchmarkRun[];
  tools: Record<ToolId, string>;
  comparisons: Comparison[];
};

export const BENCHMARKS: BenchmarkData = raw;

export const toolName = (data: BenchmarkData, tool: string) => data.tools[tool as ToolId] ?? tool;

/** The README section of one run in the public benchmark repository, where its method and results are. */
export const runReadme = (date: string) => {
  const run = BENCHMARKS.runs.find((candidate) => candidate.date === date);
  if (!run) throw new Error(`The benchmark data has no run of ${date}`);
  return run.readme;
};

export const findGroup = (comparisonId: string, viewId: string, app: string) => {
  const comparison = BENCHMARKS.comparisons.find((candidate) => candidate.id === comparisonId);
  const view = comparison?.views.find((candidate) => candidate.id === viewId);
  const group = view?.groups.find((candidate) => candidate.app === app);
  if (!comparison || !group) throw new Error(`No benchmark group ${comparisonId}/${viewId}/${app}`);
  return { comparison, group };
};
