import type { TimingSpan } from './cli-sample';
import type { ReportInput, SampleRecord } from './cli-report';
import { describe, expect, test } from 'bun:test';
import {
  bootstrapMedianInterval,
  comparePairedStartup,
  markdownTable,
  renderReport,
  summarizeSamples
} from './cli-report';
import { analyzeTimings } from './cli-timing-analysis';

const BASE = BigInt(5_000_000_000_000);
const ns = (milliseconds: number) => (BASE + BigInt(Math.round(milliseconds * 1_000_000))).toString();

const span = (name: string, start: number, end: number | null, detail?: TimingSpan['detail']): TimingSpan => ({
  name,
  start,
  end,
  ...(detail && { detail })
});

/** A timed run: time origin 30 ms after the spawn, exit handler at 900 ms, the harness sees the exit 20 ms later. */
const analysis = (spans: TimingSpan[], exitCode = 0) =>
  analyzeTimings({
    document: {
      schema: 3,
      kind: 'stacktape-cli-timings',
      timeOrigin: 1_000_000,
      clockAnchors: {
        init: { monotonicNs: ns(35), performanceMs: 5 },
        exit: { monotonicNs: ns(930), performanceMs: 900 }
      },
      pid: 1,
      exitCode,
      exitAt: 900,
      instrumentedSubprocesses: 0,
      droppedSpans: 0,
      spans
    },
    wallMs: 950,
    spawnMonotonicNs: ns(0),
    exitMonotonicNs: ns(950)
  });

const sample = (
  overrides: Partial<SampleRecord> & Pick<SampleRecord, 'suite' | 'scenario' | 'install'>
): SampleRecord => ({
  id: `${overrides.suite}-${overrides.scenario}-${overrides.install}-${overrides.round ?? 1}`,
  round: 1,
  warmUp: false,
  timings: false,
  exitCode: 0,
  signal: null,
  wallMs: 1000,
  maxRssBytes: 900 * 1024 * 1024,
  harnessPeakRssBytes: 100 * 1024 * 1024,
  userCpuMs: 800,
  systemCpuMs: 200,
  invalidReasons: [],
  loadBefore: 0.5,
  loadAfter: 0.5,
  homeState: 'state-a',
  harnessSource: 'unchanged',
  analysis: null,
  clock: { spawnMonotonicNs: null, exitMonotonicNs: null, childAnchors: null },
  dockerOperations: null,
  fixtureRequests: [],
  staleFixtureRequests: [],
  dnsQueries: [],
  escapedProcesses: [],
  ...overrides
});

const reportInput = (samples: SampleRecord[], overrides: Partial<ReportInput> = {}): ReportInput => ({
  passed: true,
  checks: [{ check: 'every measured sample is valid', passed: true, detail: '[]' }],
  clock: {
    elapsedMonotonicMs: 108_700,
    elapsedRealtimeMs: 100_000,
    elapsedHostMs: 100_000,
    monotonicPerHost: 1.087,
    monotonicPerRealtime: 1.087
  },
  settings: { startupSamples: 2 },
  installs: [],
  reference: 'uninstrumented',
  summaries: summarizeSamples(samples),
  paired: comparePairedStartup({ samples, reference: 'uninstrumented' }),
  hostDockerLatency: null,
  host: null,
  toolVersions: null,
  source: { before: null, after: null, check: null },
  load: { before: null, after: null },
  ...overrides
});

/** Every table of a Markdown document: its header cells and its rows' cells, split on unescaped pipes. */
const readTables = (markdown: string) => {
  const tables: { header: string[]; rows: string[][] }[] = [];
  let current: string[][] | null = null;
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) {
      current = null;
      continue;
    }
    const cells = line
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim());
    if (!current) {
      current = [cells];
      tables.push({ header: cells, rows: [] });
    } else if (!cells.every((cell) => /^-+:?$/.test(cell))) {
      tables.at(-1)!.rows.push(cells);
    }
  }
  return tables;
};

describe('summarizeSamples', () => {
  test('keeps suite, scenario and install apart, and never merges groups whose joined names would collide', () => {
    const summaries = summarizeSamples([
      sample({ suite: 'startup', scenario: 'a | b', install: 'c' }),
      sample({ suite: 'startup', scenario: 'a', install: 'b | c' })
    ]);
    expect(summaries.map(({ suite, scenario, install }) => [suite, scenario, install])).toEqual([
      ['startup', 'a | b', 'c'],
      ['startup', 'a', 'b | c']
    ]);
  });

  test('excludes warm-ups and invalid samples from the distributions, and lists the invalid ones', () => {
    const [summary] = summarizeSamples([
      sample({ suite: 'startup', scenario: 'version', install: 'x', round: 0, warmUp: true, wallMs: 5000 }),
      sample({ suite: 'startup', scenario: 'version', install: 'x', round: 1, wallMs: 1000 }),
      sample({ suite: 'startup', scenario: 'version', install: 'x', round: 2, wallMs: 1100 }),
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'x',
        round: 3,
        wallMs: 9000,
        invalidReasons: ['timed out']
      })
    ]);
    expect(summary).toMatchObject({ samples: 3, valid: 2, wallMs: { count: 2, median: 1050, min: 1000, max: 1100 } });
    expect(summary!.invalid).toEqual([{ id: 'startup-version-x-3', invalidReasons: ['timed out'] }]);
  });

  test('counts a max RSS not above the harness peak as not attributable to the CLI', () => {
    const [summary] = summarizeSamples([
      sample({ suite: 'startup', scenario: 'version', install: 'x', round: 1 }),
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'x',
        round: 2,
        maxRssBytes: 300 * 1024 * 1024,
        harnessPeakRssBytes: 300 * 1024 * 1024
      })
    ]);
    expect(summary!.maxRssNotAttributable).toBe(1);
  });

  test('reports phases no sample reached as unvisited, and the failing step and path of those that did', () => {
    const [summary] = summarizeSamples([
      sample({
        suite: 'package',
        scenario: '1-functions-buildx-failure',
        install: 'x',
        timings: true,
        exitCode: 1,
        analysis: analysis(
          [
            span('docker:probe', 100, 110, { running: true }),
            span('docker:build-platforms', 111, 150, { outcome: 'error' }),
            span('subprocess', 112, 149, { executable: 'docker', ordinal: 1, exitCode: 1, outcome: 'error' })
          ],
          1
        )
      })
    ]);
    const timing = summary!.timing!;
    expect(timing.failedAt).toEqual([{ value: 'docker:build-platforms', count: 1 }]);
    expect(timing.bundlingReached).toBe(0);
    expect(timing.originToBundlingMs).toBeNull();
    // 10 ms probing and 39 ms reading the platforms, with a 1 ms gap between them.
    expect(timing.phases.docker).toMatchObject({ visitedIn: 1, of: 1, unionMs: { median: 49 }, sumMs: { median: 49 } });
    expect(timing.phases.build).toEqual({ visitedIn: 0, of: 1, unionMs: null, sumMs: null });
    expect(timing.subprocesses).toEqual([
      {
        executable: 'docker',
        description: null,
        exitCodes: [1],
        perSample: { count: 1, median: 1, min: 1, max: 1 },
        ms: { count: 1, median: 37, min: 37, max: 37 }
      }
    ]);
  });
});

describe('comparePairedStartup', () => {
  const pairedSamples = (differences: number[]) =>
    differences.flatMap((difference, index) => [
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'uninstrumented',
        round: index + 1,
        wallMs: 1600 + index
      }),
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'instrumented',
        round: index + 1,
        wallMs: 1600 + index + difference
      })
    ]);

  test('pairs samples of the same round only, leaving out warm-ups, invalid samples and unmatched rounds', () => {
    const samples = [
      ...pairedSamples([2, -1, 3, 1, 0]),
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'uninstrumented',
        round: 0,
        warmUp: true,
        wallMs: 9000
      }),
      sample({ suite: 'startup', scenario: 'version', install: 'instrumented', round: 0, warmUp: true, wallMs: 1 }),
      sample({ suite: 'startup', scenario: 'version', install: 'instrumented', round: 6, wallMs: 1 }),
      sample({
        suite: 'startup',
        scenario: 'version',
        install: 'uninstrumented',
        round: 7,
        wallMs: 9000,
        invalidReasons: ['timed out']
      }),
      sample({ suite: 'startup', scenario: 'version', install: 'instrumented', round: 7, wallMs: 1 })
    ];
    const [comparison] = comparePairedStartup({ samples, reference: 'uninstrumented' });
    expect(comparison).toMatchObject({
      scenario: 'version',
      reference: 'uninstrumented',
      install: 'instrumented',
      pairs: 5,
      sameHomeState: 5,
      medianPairedDifferenceMs: 1,
      installFaster: 1
    });
    expect(comparison!.interval95Ms[0]).toBeLessThanOrEqual(1);
    expect(comparison!.interval95Ms[1]).toBeGreaterThanOrEqual(1);
  });

  test('gives the same interval every time for the same samples', () => {
    const differences = [5, -3, 8, 0, 2, 11, -6, 4, 1, 7, -2, 3, 6, -1, 9, 2, 0, 5, -4, 3, 1];
    expect(bootstrapMedianInterval(differences)).toEqual(bootstrapMedianInterval(differences));
    const [comparison] = comparePairedStartup({ samples: pairedSamples(differences), reference: 'uninstrumented' });
    expect(comparison!.medianPairedDifferenceMs).toBe(2);
    expect(comparison!.interval95Ms[0]).toBeLessThan(2);
    expect(comparison!.interval95Ms[1]).toBeGreaterThan(2);
  });

  test('counts pairs whose samples started from different home states', () => {
    const samples = pairedSamples([1, 2]);
    samples[3] = { ...samples[3]!, homeState: 'state-b' };
    expect(comparePairedStartup({ samples, reference: 'uninstrumented' })[0]!.sameHomeState).toBe(1);
  });
});

describe('renderReport', () => {
  const samples = [
    sample({ suite: 'startup', scenario: 'version', install: 'uninstrumented', wallMs: 1600 }),
    sample({ suite: 'startup', scenario: 'version', install: 'instrumented', wallMs: 1602 }),
    sample({
      suite: 'package',
      scenario: '1-functions-platform-ready',
      install: 'instrumented',
      timings: true,
      analysis: analysis([span('split:build', 200, 400, { functions: 1 }), span('telemetry:report', 800, 810)]),
      fixtureRequests: [
        {
          kind: 'aws',
          target: 'sts:GetCallerIdentity',
          status: 200,
          allowed: true,
          bytesIn: 1,
          bytesOut: 1,
          startMs: 1,
          endMs: 2
        }
      ],
      dockerOperations: [
        { decision: 'simulated', operation: 'info', reason: '', exitCode: 0, privileged: false, binfmt: false }
      ]
    }),
    sample({ suite: 'startup', scenario: 'odd | name', install: 'instrumented' })
  ];

  test('renders every table with one cell per column and suite, scenario and install as three columns', () => {
    const markdown = renderReport(reportInput(samples));
    const tables = readTables(markdown);
    expect(tables.length).toBeGreaterThanOrEqual(5);
    for (const { header, rows } of tables) {
      for (const row of rows) expect(row).toHaveLength(header.length);
    }
    const samplesTable = tables.find(({ header }) => header.includes('Wall ms') && header[0] === 'Suite')!;
    expect(samplesTable.header.slice(0, 3)).toEqual(['Suite', 'Scenario', 'Install']);
    expect(samplesTable.rows.map((row) => row.slice(0, 3))).toEqual([
      ['startup', 'version', 'uninstrumented'],
      ['startup', 'version', 'instrumented'],
      ['package', '1-functions-platform-ready', 'instrumented'],
      ['startup', 'odd \\| name', 'instrumented']
    ]);
  });

  test('states the units, the guest clock factor of the run and that it is not applied', () => {
    const markdown = renderReport(reportInput(samples));
    expect(markdown).toContain('guest-monotonic milliseconds');
    expect(markdown).toContain('1.087 ms per host-clock ms');
    expect(markdown).toContain('applied nowhere');
    expect(markdown).toContain('not the size of a customer install');
    expect(markdown).toContain('Use the union for elapsed time.');
  });

  test('shows unvisited phases as unvisited, never as zero', () => {
    const tables = readTables(renderReport(reportInput(samples)));
    const phases = tables.find(({ header }) => header[0] === 'Phase')!;
    const row = (phase: string) => phases.rows.find(([name]) => name === phase)!;
    expect(row('s3')[1]).toBe('unvisited (0/1)');
    expect(row('build')[1]).toBe('union 200 (200–200); sum 200; 1/1');
    expect(row('telemetry')[1]).toBe('union 10 (10–10); sum 10; 1/1');
  });

  test('lists what each group contacted', () => {
    const tables = readTables(renderReport(reportInput(samples)));
    const evidence = tables.find(({ header }) => header.includes('Fixture requests'))!;
    const packageRow = evidence.rows.find((row) => row[0] === 'package')!;
    expect(packageRow[evidence.header.indexOf('Fixture requests')]).toBe('aws sts:GetCallerIdentity 200 ×1');
    expect(packageRow[evidence.header.indexOf('Docker (guard)')]).toBe('info simulated 0 ×1');
  });

  test('refuses a row whose cells do not match the columns', () => {
    expect(() => markdownTable([{ title: 'a' }, { title: 'b' }], [['1']])).toThrow('1 cells for 2 columns');
  });
});
