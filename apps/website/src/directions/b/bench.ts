import data from '../../data/deploy-benchmarks.json';

/** One bar: a tool's median for one benchmark case, read from the published benchmark data. */
export type Bar = { tool: string; label: string; seconds: number; date: string };

const label = (tool: string) => (data.tools as Record<string, string>)[tool] ?? tool;

/** Every tool's median for one case, fastest first. */
export const bars = (comparison: string, view: string, app: string): Bar[] => {
  const group = data.comparisons
    .find((candidate) => candidate.id === comparison)
    ?.views.find((candidate) => candidate.id === view)
    ?.groups.find((candidate) => candidate.app === app);
  if (!group) throw new Error(`No benchmark ${comparison}/${view}/${app}`);
  return group.values
    .map((value) => ({ tool: value.tool, label: label(value.tool), seconds: value.median, date: value.date }))
    .toSorted((a, b) => a.seconds - b.seconds);
};

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "22 Oct 2026" from an ISO date. */
export const runDate = (iso: string) => DAY.format(new Date(`${iso}T00:00:00Z`));

export const FIRST_RUN = data.runs[0];
