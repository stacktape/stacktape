import type { SampleRecord } from './cli-report';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { comparePairedStartup, describeSettings, renderReport, summarizeSamples } from './cli-report';
import { lineChanges, reportInputFromSavedRun, rerenderRun } from './cli-report-rerender';

const sample = (install: string, round: number, wallMs: number): SampleRecord =>
  ({
    id: `startup-version-${install}-${round}`,
    suite: 'startup',
    scenario: 'version',
    install,
    round,
    warmUp: round === 0,
    timings: false,
    exitCode: 0,
    signal: null,
    wallMs,
    maxRssBytes: 1000 * 1024 * 1024,
    harnessPeakRssBytes: 50 * 1024 * 1024,
    userCpuMs: 1700,
    systemCpuMs: 300,
    invalidReasons: [],
    loadBefore: 1,
    loadAfter: 1,
    homeState: 'home',
    harnessSource: 'unchanged',
    analysis: null,
    clock: { spawnMonotonicNs: null, exitMonotonicNs: null, childAnchors: null },
    dockerOperations: null,
    fixtureRequests: [],
    staleFixtureRequests: [],
    dnsQueries: [],
    escapedProcesses: []
  }) as SampleRecord;

const samples = [0, 1, 2, 3].flatMap((round) => [
  sample('reference', round, 1500 + round),
  sample('other', round, 1504 + round)
]);
const config = {
  installs: [
    {
      name: 'reference',
      sha256: 'a',
      bytes: 1,
      compileTarget: 'bun-linux-x64',
      version: '1',
      installBytes: 2,
      helperLambdas: []
    },
    {
      name: 'other',
      sha256: 'b',
      bytes: 1,
      compileTarget: 'bun-linux-x64',
      version: '1',
      installBytes: 2,
      helperLambdas: []
    }
  ].map((install) => ({
    ...install,
    builtFrom: {
      before: {
        available: false,
        reason: 'test',
        revision: null,
        changesSha256: null,
        changedPaths: [],
        scopes: [],
        excluded: []
      },
      after: {
        available: false,
        reason: 'test',
        revision: null,
        changesSha256: null,
        changedPaths: [],
        scopes: [],
        excluded: []
      },
      check: 'unavailable'
    }
  })),
  suites: ['startup'],
  startupSamples: 3,
  activeStartupSamples: 11,
  packageSamples: 11,
  functions: [1, 10],
  packageInstall: null,
  timeoutMs: 120_000
};
const outer = {
  passed: true,
  checks: [{ check: 'every measured sample is valid', passed: true, detail: '[]' }],
  clock: {
    elapsedMonotonicMs: 1087,
    elapsedRealtimeMs: 1000,
    elapsedHostMs: 1000,
    monotonicPerHost: 1.087,
    monotonicPerRealtime: 1.087
  },
  loadBefore: 0.5,
  loadAfter: 1.5
};
const inner = { toolVersions: { versions: { bun: '1.4.1' }, dnsQueries: [] } };
const report = {
  summaries: summarizeSamples(samples),
  paired: comparePairedStartup({ samples, reference: 'reference' }),
  samples
};

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-report-rerender-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const saveRun = async (
  name: string,
  overrides: { report?: object; outer?: object; original?: string; omit?: string; raw?: Record<string, string> } = {}
) => {
  const directory = join(root, name);
  await mkdir(directory);
  const files: Record<string, object> = {
    'harness-config.json': config,
    'outer.json': overrides.outer ?? outer,
    'inner-report.json': inner,
    'report.json': overrides.report ?? report
  };
  for (const [file, content] of Object.entries(files)) {
    if (file === overrides.omit) continue;
    await writeFile(join(directory, file), overrides.raw?.[file] ?? JSON.stringify(content));
  }
  if (overrides.original !== undefined) await writeFile(join(directory, 'report.md'), overrides.original);
  return directory;
};

describe('rerenderRun', () => {
  const expectedBody = renderReport(reportInputFromSavedRun({ config, outer, inner, report }));

  test('renders the saved run exactly as the renderer would, deterministically, with a provenance note', async () => {
    const directory = await saveRun('complete', { original: expectedBody.replace('Every check held.', 'Old text.') });
    const first = await rerenderRun({ runDirectory: directory, command: 'command', reason: 'Because.' });
    const second = await rerenderRun({ runDirectory: directory, command: 'command', reason: 'Because.' });
    expect(first.body).toBe(expectedBody);
    expect(first.markdown).toBe(second.markdown);
    expect(first.markdown.endsWith(expectedBody)).toBe(true);
    expect(first.markdown).toContain(
      `\`report.json\` ${createHash('sha256').update(JSON.stringify(report)).digest('hex')}`
    );
    expect(first.markdown).toContain('> the original. Because.');
    expect(first.removed).toEqual(['Old text.']);
    expect(first.added).toEqual(['Every check held.']);
    // The settings name only the suites that ran.
    expect(expectedBody).toContain('startup rounds');
    expect(expectedBody).not.toContain('package rounds');
    expect(describeSettings(config as never, null)).not.toHaveProperty('package rounds');
  });

  test('refuses summaries that differ from what the saved samples give', async () => {
    const tampered = { ...report, summaries: [{ ...report.summaries[0], valid: 99 }, ...report.summaries.slice(1)] };
    const directory = await saveRun('tampered', { report: tampered });
    await expect(rerenderRun({ runDirectory: directory, command: 'c', reason: 'r' })).rejects.toThrow(
      'summaries recomputed from the saved samples differ'
    );
  });

  test('refuses a paired comparison that differs from what the saved samples give', async () => {
    const tampered = { ...report, paired: [] };
    const directory = await saveRun('tampered-paired', { report: tampered });
    await expect(rerenderRun({ runDirectory: directory, command: 'c', reason: 'r' })).rejects.toThrow(
      'paired comparison recomputed from the saved samples differs'
    );
  });

  test.each([
    [
      'a clock field of the wrong type',
      { outer: { ...outer, clock: { ...outer.clock, monotonicPerHost: 'fast' } } },
      "The saved run's outer.json.clock.monotonicPerHost is not a number"
    ],
    [
      'a sample field of the wrong type',
      {
        report: {
          ...report,
          samples: report.samples.map((item, index) => (index === 1 ? { ...item, wallMs: '1500' } : item))
        }
      },
      "The saved run's report.json.samples[1].wallMs is not a number"
    ],
    [
      'a sample without its analysis',
      {
        report: {
          ...report,
          samples: report.samples.map((item, index) =>
            index === 2 ? Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'analysis')) : item
          )
        }
      },
      "The saved run's report.json.samples[2].analysis is not an object"
    ],
    ['artifact results', { report: { ...report, artifacts: [] } }, 'has artifact results'],
    ['a file that is not JSON', { raw: { 'outer.json': '{ "passed": true' } }, "The saved run's outer.json is not JSON"]
  ] as const)('refuses a saved run with %s, naming what is wrong', async (label, overrides, problem) => {
    const directory = await saveRun(`malformed-${label}`, overrides);
    await expect(rerenderRun({ runDirectory: directory, command: 'c', reason: 'r' })).rejects.toThrow(problem);
  });

  test('refuses a run that lacks a saved file', async () => {
    const directory = await saveRun('incomplete', { omit: 'outer.json' });
    await expect(rerenderRun({ runDirectory: directory, command: 'c', reason: 'r' })).rejects.toThrow(
      'The saved run has no outer.json'
    );
  });
});

describe('lineChanges', () => {
  test('lists removed and added lines in order', () => {
    expect(lineChanges('a\nb\nc', 'a\nB\nc\nd')).toEqual({ removed: ['b'], added: ['B', 'd'] });
  });

  test('lists a line that only moved as removed and added', () => {
    expect(lineChanges('a\nb\nc\nd', 'a\nc\nb\nd')).toEqual({ removed: ['b'], added: ['b'] });
  });
});
