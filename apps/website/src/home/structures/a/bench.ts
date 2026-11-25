/*
 * Benchmark views for the charts in Packages and Deploys, built from `src/data/deploy-benchmarks.json` through
 * the existing helpers, so the page shows the file's numbers. Every group is sorted fastest first.
 */
import { BENCHMARKS, findGroup } from '../../../variants/readme/benchmarks';

type Source = { comparison: string; view: string; apps: string[] };

export type ChartView = {
  id: string;
  label: string;
  title: string;
  note?: string;
  groups: { label: string; unit: string; values: { tool: string; median: number }[] }[];
  max: number;
};

const build = (id: string, label: string, title: string, source: Source, note?: string): ChartView => {
  const groups = source.apps.map((app) => {
    const { comparison, group } = findGroup(source.comparison, source.view, app);
    return {
      label: group.label,
      unit: comparison.unit,
      values: group.values.toSorted((a, b) => a.median - b.median)
    };
  });
  const max = Math.max(...groups.flatMap((group) => group.values.map((value) => value.median)));
  return { id, label, title, note, groups, max };
};

const run = BENCHMARKS.runs[0];
if (!run) throw new Error('The benchmark data has no run');
export const RUN = run;

export const PACKAGING_VIEWS = [
  build('packaging', 'Packaging', 'Package Lambda functions, empty build cache', {
    comparison: 'packaging',
    view: 'empty-cache',
    apps: ['lambda-1', 'lambda-25']
  })
];

export const DEPLOY_VIEWS = [
  build('lambda', 'Lambda', 'Code change to Lambda functions', {
    comparison: 'lambda-deploy',
    view: 'handler',
    apps: ['lambda-1', 'lambda-25']
  }),
  build(
    'containers',
    'Containers',
    'Code change to a container service',
    { comparison: 'container-deploy', view: 'code-change', apps: ['container-node', 'container-python'] },
    'Stacktape with code swap, an opt-in setting for code changes. Its normal image deploy is slower and loses to Heroku.'
  ),
  build(
    'push',
    'Git push',
    'From git push until the new code serves',
    { comparison: 'git-push', view: 'warm', apps: ['container-node', 'container-python', 'five-services'] },
    'Stacktape on its Console runner with code swap (23 Oct). Heroku built from the pushed source and Render from a warm push, on their own machines (22 Oct).'
  )
];
