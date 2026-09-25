/**
 * The CLI harness's summaries, its paired startup comparison and `report.md`, kept apart from the measurement so they
 * can be tested.
 *
 * Every duration is in guest-monotonic milliseconds: `performance.now()` in the harness and in the CLI, both Linux
 * `CLOCK_MONOTONIC` on the machine that ran them. Under WSL that clock runs at a varying rate against the Windows
 * host's, about 8-9% fast on the measurement machine. The report states the factor measured over its own run and
 * applies it nowhere, so durations from different runs need that qualification. A comparison within one run, such as
 * the paired startup comparison, does not: both sides were read on the same clock, a few seconds apart.
 */
import type { ArtifactManifest } from './artifact-inspection';
import type { ArtifactScenarioResult } from './cli-artifact-contract';
import type { CiInstallResult, CiInstallSampleEvidence } from './ci-install';
import type { CommandEvidence, CommandsResult } from './cli-commands';
import type { ConfigOnlyResult, ConfigOnlySampleEvidence, Grouping } from './config-only';
import type { CliSample } from './cli-sample';
import type { PhaseName, TimingAnalysis } from './cli-timing-analysis';
import type { ClockComparison } from './clock-rate';
import type { Distribution, HostEnvironment, SourceCheck, SourceIdentity } from './measurement-context';
import { PHASE_NAMES } from './cli-timing-analysis';
import { describeSourceIdentity, summarize } from './measurement-context';

export type Suite = 'startup' | 'active-startup' | 'package' | 'ci-install' | 'config-only' | 'commands';

export type SampleRecord = {
  id: string;
  suite: Suite;
  scenario: string;
  install: string;
  round: number;
  warmUp: boolean;
  timings: boolean;
  exitCode: number | null;
  signal: string | null;
  wallMs: number;
  /**
   * The kernel's peak resident set of the CLI process or its largest reaped descendant. Linux carries the spawning
   * process's own peak into a child created with vfork, as `Bun.spawn` creates it, so this is never below
   * `harnessPeakRssBytes`, and it is the CLI's own figure only when it is above that.
   */
  maxRssBytes: number | null;
  /** The harness's own peak resident set (`VmHWM`) when it started the sample; null in reports that predate it. */
  harnessPeakRssBytes?: number | null;
  userCpuMs: number | null;
  systemCpuMs: number | null;
  invalidReasons: string[];
  loadBefore: number;
  loadAfter: number;
  /** A digest of the CLI's home directory before the sample; null in reports that predate it. */
  homeState?: string | null;
  harnessSource: string;
  analysis: TimingAnalysis | null;
  /** The raw shared-clock readings the cross-process times come from, for inspection. */
  clock: {
    spawnMonotonicNs: string | null;
    exitMonotonicNs: string | null;
    childAnchors: NonNullable<CliSample['timings']>['clockAnchors'] | null;
  };
  dockerOperations: CliSample['dockerOperations'];
  fixtureRequests: CliSample['fixtureRequests'];
  staleFixtureRequests: CliSample['staleFixtureRequests'];
  dnsQueries: CliSample['dnsQueries'];
  escapedProcesses: CliSample['escapedProcesses'];
  /**
   * What the command left in the project's `.stacktape`, inspected after it exited and before the harness removed it;
   * only with `--inspect-artifacts`, and absent in reports that predate it.
   */
  artifacts?: ArtifactManifest | null;
  /** A `ci-install` sample's prepared state, the state it left and its extracted handler's answer. */
  ciInstall?: CiInstallSampleEvidence | null;
  /** A `config-only` sample's configuration state, the project before and after, and its extracted handlers' answers. */
  configOnly?: ConfigOnlySampleEvidence | null;
  /** A `commands` sample's facts: its `config:validate` span and what its output reported. */
  command?: CommandEvidence | null;
  /**
   * A `package` sample's fixture functions, Docker situation and the install's helper-Lambda files with their
   * recorded SHA-256, for checking its artifacts.
   */
  packageCase?: { functions: string[]; situation: string; helperLambdas?: { file: string; sha256: string }[] } | null;
};

/** A value and how often it occurred; what is counted (samples or requests) is stated where it is used. */
export type Counted = { value: string; count: number };

export type PhaseCoverage = {
  /** Timed samples in which a span of the phase was recorded; 0 means no sample reached the phase. */
  visitedIn: number;
  of: number;
  unionMs: Distribution | null;
  sumMs: Distribution | null;
};

export type TimingSummary = {
  /** Valid samples with a timing document. */
  timed: number;
  beforeOriginMs: Distribution | null;
  toEntryMs: Distribution | null;
  moduleLoadMs: Distribution | null;
  readArgumentsMs: Distribution | null;
  commandMs: Distribution | null;
  shutdownMs: Distribution | null;
  afterExitHandlerMs: Distribution | null;
  /** Timed samples whose shared-clock checks held. */
  crossProcessMeasured: number;
  crossProcessProblems: string[];
  conservationResidualMs: Distribution | null;
  /** Timed samples that started bundling. */
  bundlingReached: number;
  originToBundlingMs: Distribution | null;
  spawnToBundlingMs: Distribution | null;
  /** Counted in samples. */
  packagingPaths: Counted[];
  /** Counted in samples; `none` for a command that did not fail. */
  failedAt: Counted[];
  /** Counted in samples; `none` when every span ended. */
  unfinishedSpans: Counted[];
  droppedSpans: number;
  phases: Record<PhaseName, PhaseCoverage>;
  subprocesses: {
    executable: string;
    description: string | null;
    /** Distinct exit codes, `null` where the process did not report one. */
    exitCodes: (number | null)[];
    /** How many ran per timed sample. */
    perSample: Distribution | null;
    ms: Distribution | null;
  }[];
};

export type EvidenceSummary = {
  /** Every sample of the group, warm-ups included, so nothing the CLI contacted is left out. */
  samples: number;
  /** Requests the fixture answered, counted in requests: kind, target, status and whether it was allowed. */
  fixtureRequests: Counted[];
  staleFixtureRequests: number;
  /** Names the DNS recorder was asked for, counted in queries; null without a recorder. */
  dnsQueries: Counted[] | null;
  /** Each sample's Docker commands as the guard saw them, counted in samples; null without a guard. */
  dockerSequences: Counted[] | null;
  escapedProcesses: number;
};

export type SampleSummary = {
  suite: Suite;
  scenario: string;
  install: string;
  /** Measured samples: warm-ups excluded. */
  samples: number;
  valid: number;
  invalid: { id: string; invalidReasons: string[] }[];
  /** Counted in measured samples. */
  exitCodes: Counted[];
  wallMs: Distribution | null;
  userCpuMs: Distribution | null;
  systemCpuMs: Distribution | null;
  maxRssMiB: Distribution | null;
  /** Valid samples whose max RSS is not above the harness's own peak, so it bounds the CLI's from above only. */
  maxRssNotAttributable: number;
  harnessPeakRssMiB: Distribution | null;
  load: Distribution | null;
  /** Distinct home-directory states the measured samples started from; null when not recorded. */
  homeStates: number | null;
  timing: TimingSummary | null;
  evidence: EvidenceSummary;
};

const MIB = 1024 * 1024;

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

const count = <T>(values: T[], key: (value: T) => string): Counted[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, occurrences]) => ({ value, count: occurrences }))
    .toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));
};

const numbers = (values: (number | null | undefined)[]) =>
  values.filter((value): value is number => typeof value === 'number');

const summarizeTiming = (analyses: TimingAnalysis[]): TimingSummary => {
  const of = (pick: (analysis: TimingAnalysis) => number | null) => summarize(numbers(analyses.map(pick)));
  const subprocessKeys = [
    ...new Set(
      analyses.flatMap(({ subprocesses }) =>
        subprocesses.map(({ executable, description }) => JSON.stringify([executable, description]))
      )
    )
  ].toSorted();
  return {
    timed: analyses.length,
    beforeOriginMs: of(({ beforeOriginMs }) => beforeOriginMs),
    toEntryMs: of(({ toEntryMs }) => toEntryMs),
    moduleLoadMs: of(({ moduleLoadMs }) => moduleLoadMs),
    readArgumentsMs: of(({ readArgumentsMs }) => readArgumentsMs),
    commandMs: of(({ commandMs }) => commandMs),
    shutdownMs: of(({ shutdownMs }) => shutdownMs),
    afterExitHandlerMs: of(({ afterExitHandlerMs }) => afterExitHandlerMs),
    crossProcessMeasured: analyses.filter(({ crossProcess }) => crossProcess.measured).length,
    crossProcessProblems: [
      ...new Set(analyses.flatMap(({ crossProcess }) => ('problems' in crossProcess ? crossProcess.problems : [])))
    ],
    conservationResidualMs: of(({ crossProcess }) =>
      crossProcess.measured ? crossProcess.conservationResidualMs : null
    ),
    bundlingReached: analyses.filter(({ originToBundlingMs }) => originToBundlingMs !== null).length,
    originToBundlingMs: of(({ originToBundlingMs }) => originToBundlingMs),
    spawnToBundlingMs: of(({ spawnToBundlingMs }) => spawnToBundlingMs),
    packagingPaths: count(analyses, ({ packagingPaths }) => (packagingPaths ? describePaths(packagingPaths) : 'none')),
    failedAt: count(analyses, ({ failedAt }) => failedAt ?? 'none'),
    unfinishedSpans: count(analyses, ({ unfinishedSpans }) =>
      unfinishedSpans.length ? unfinishedSpans.join(', ') : 'none'
    ),
    droppedSpans: analyses.reduce((sum, { droppedSpans }) => sum + droppedSpans, 0),
    phases: Object.fromEntries(
      PHASE_NAMES.map((phase) => {
        const visited = analyses.flatMap(({ phases }) => {
          const summary = phases[phase];
          return summary.visited ? [summary] : [];
        });
        return [
          phase,
          {
            visitedIn: visited.length,
            of: analyses.length,
            unionMs: summarize(visited.map(({ unionMs }) => unionMs)),
            sumMs: summarize(visited.map(({ sumMs }) => sumMs))
          }
        ];
      })
    ) as Record<PhaseName, PhaseCoverage>,
    subprocesses: subprocessKeys.map((key) => {
      const [executable, description] = JSON.parse(key) as [string, string | null];
      const matching = (analysis: TimingAnalysis) =>
        analysis.subprocesses.filter(
          (subprocess) => subprocess.executable === executable && subprocess.description === description
        );
      const all = analyses.flatMap(matching);
      return {
        executable,
        description,
        exitCodes: [...new Set(all.map(({ exitCode }) => exitCode))],
        perSample: summarize(analyses.map((analysis) => matching(analysis).length)),
        ms: summarize(numbers(all.map(({ ms }) => ms)))
      };
    })
  };
};

/**
 * The paths `packaging:paths` recorded, such as `split 2` or `perFunction 10`, and whether Docker was running when a
 * report from an older CLI, which still asked, recorded it.
 */
const describePaths = (paths: Record<string, unknown>) =>
  [
    ...(typeof paths.dockerRunning === 'boolean' ? [`docker ${paths.dockerRunning ? 'running' : 'not running'}`] : []),
    ...Object.entries(paths)
      .filter(([name, value]) => name !== 'dockerRunning' && typeof value === 'number' && value > 0)
      .map(([name, value]) => `${name} ${value}`)
  ].join(', ');

const summarizeEvidence = (group: SampleRecord[]): EvidenceSummary => ({
  samples: group.length,
  fixtureRequests: count(
    group.flatMap(({ fixtureRequests }) => fixtureRequests),
    ({ kind, target, status, allowed }) => `${kind} ${target} ${status}${allowed ? '' : ' refused'}`
  ),
  staleFixtureRequests: group.reduce((sum, { staleFixtureRequests }) => sum + staleFixtureRequests.length, 0),
  dnsQueries: group.some(({ dnsQueries }) => dnsQueries !== null)
    ? count(
        group.flatMap(({ dnsQueries }) => dnsQueries ?? []),
        ({ name }) => name
      )
    : null,
  dockerSequences: group.some(({ dockerOperations }) => dockerOperations !== null)
    ? count(group, ({ dockerOperations }) =>
        dockerOperations?.length
          ? dockerOperations
              .map(({ operation, decision, exitCode }) => `${operation} ${decision} ${exitCode}`)
              .join(' → ')
          : 'no Docker command'
      )
    : null,
  escapedProcesses: group.reduce((sum, { escapedProcesses }) => sum + escapedProcesses.length, 0)
});

/** One summary per suite, scenario and install, in the order the samples first appear. */
export const summarizeSamples = (samples: SampleRecord[]): SampleSummary[] => {
  const groups = new Map<string, SampleRecord[]>();
  for (const sample of samples) {
    const key = JSON.stringify([sample.suite, sample.scenario, sample.install]);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  return [...groups.values()].map((group) => {
    const { suite, scenario, install } = group[0]!;
    const measured = group.filter(({ warmUp }) => !warmUp);
    const valid = measured.filter(({ invalidReasons }) => invalidReasons.length === 0);
    const analyses = valid.flatMap(({ analysis }) => (analysis ? [analysis] : []));
    const homeStates = measured.map(({ homeState }) => homeState ?? null);
    return {
      suite,
      scenario,
      install,
      samples: measured.length,
      valid: valid.length,
      invalid: measured
        .filter(({ invalidReasons }) => invalidReasons.length > 0)
        .map(({ id, invalidReasons }) => ({ id, invalidReasons })),
      exitCodes: count(measured, ({ exitCode, signal }) => (exitCode === null ? `signal ${signal}` : String(exitCode))),
      wallMs: summarize(valid.map(({ wallMs }) => wallMs)),
      userCpuMs: summarize(numbers(valid.map(({ userCpuMs }) => userCpuMs))),
      systemCpuMs: summarize(numbers(valid.map(({ systemCpuMs }) => systemCpuMs))),
      maxRssMiB: summarize(numbers(valid.map(({ maxRssBytes }) => maxRssBytes)).map((bytes) => round(bytes / MIB))),
      maxRssNotAttributable: valid.filter(
        ({ maxRssBytes, harnessPeakRssBytes }) =>
          maxRssBytes === null || harnessPeakRssBytes == null || maxRssBytes <= harnessPeakRssBytes
      ).length,
      harnessPeakRssMiB: summarize(
        numbers(valid.map(({ harnessPeakRssBytes }) => harnessPeakRssBytes)).map((bytes) => round(bytes / MIB))
      ),
      load: summarize(valid.map(({ loadBefore }) => loadBefore)),
      homeStates: homeStates.includes(null) ? null : new Set(homeStates).size,
      timing: analyses.length > 0 ? summarizeTiming(analyses) : null,
      evidence: summarizeEvidence(group)
    };
  });
};

// Paired startup comparison ------------------------------------------------------------------------------------------

export type PairedComparison = {
  scenario: string;
  reference: string;
  install: string;
  /** Rounds in which both installs have a valid measured sample of the scenario. */
  pairs: number;
  /** Pairs whose two samples started from the same home-directory state; null when not recorded. */
  sameHomeState: number | null;
  referenceMedianMs: number;
  installMedianMs: number;
  differenceOfMediansMs: number;
  /** The median of the per-round differences, install minus reference. */
  medianPairedDifferenceMs: number;
  /** A 95% percentile-bootstrap interval of the median paired difference. */
  interval95Ms: [number, number];
  /** The interval's ends relative to the reference median, in percent. */
  interval95Percent: [number, number];
  /** Pairs in which the install was faster than the reference. */
  installFaster: number;
  bootstrap: { resamples: number; seed: number };
};

export const BOOTSTRAP = { resamples: 10_000, seed: 20_260_924 } as const;

/** A small seeded generator (mulberry32), so an interval can be reproduced exactly from the report's samples. */
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** Linear interpolation between the closest ranks of sorted values. */
const quantile = (sorted: number[], fraction: number) => {
  const position = (sorted.length - 1) * fraction;
  const lower = sorted[Math.floor(position)]!;
  const upper = sorted[Math.ceil(position)]!;
  return lower + (upper - lower) * (position - Math.floor(position));
};

export const bootstrapMedianInterval = (
  values: number[],
  { resamples, seed }: { resamples: number; seed: number } = BOOTSTRAP
): [number, number] => {
  const random = createRandom(seed);
  const medians = Array.from(
    { length: resamples },
    () => summarize(values.map(() => values[Math.floor(random() * values.length)]!))!.median
  ).toSorted((left, right) => left - right);
  return [quantile(medians, 0.025), quantile(medians, 0.975)];
};

/**
 * Pairs the startup samples of every install with the reference install's sample of the same scenario and round. The
 * installs of a round run back to back in a rotated order, so a pair shares the machine's state of that moment, and
 * slow drift over the run cancels out of the differences.
 */
export const comparePairedStartup = ({
  samples,
  reference
}: {
  samples: SampleRecord[];
  reference: string;
}): PairedComparison[] => {
  const usable = samples.filter(
    ({ suite, warmUp, invalidReasons }) => suite === 'startup' && !warmUp && invalidReasons.length === 0
  );
  const scenarios = [...new Set(usable.map(({ scenario }) => scenario))];
  const installs = [...new Set(usable.map(({ install }) => install))].filter((install) => install !== reference);
  return scenarios.flatMap((scenario) =>
    installs.flatMap((install): PairedComparison[] => {
      const byRound = (name: string) =>
        new Map(
          usable
            .filter((sample) => sample.scenario === scenario && sample.install === name)
            .map((sample) => [sample.round, sample])
        );
      const referenceByRound = byRound(reference);
      const pairs = [...byRound(install).entries()]
        .filter(([roundNumber]) => referenceByRound.has(roundNumber))
        .map(([roundNumber, sample]) => ({ reference: referenceByRound.get(roundNumber)!, install: sample }));
      if (pairs.length === 0) return [];
      const differences = pairs.map((pair) => pair.install.wallMs - pair.reference.wallMs);
      const referenceMedianMs = summarize(pairs.map((pair) => pair.reference.wallMs))!.median;
      const installMedianMs = summarize(pairs.map((pair) => pair.install.wallMs))!.median;
      const interval = bootstrapMedianInterval(differences);
      const recordedHome = pairs.every((pair) => pair.reference.homeState != null && pair.install.homeState != null);
      return [
        {
          scenario,
          reference,
          install,
          pairs: pairs.length,
          sameHomeState: recordedHome
            ? pairs.filter((pair) => pair.reference.homeState === pair.install.homeState).length
            : null,
          referenceMedianMs: round(referenceMedianMs),
          installMedianMs: round(installMedianMs),
          differenceOfMediansMs: round(installMedianMs - referenceMedianMs),
          medianPairedDifferenceMs: round(summarize(differences)!.median),
          interval95Ms: [round(interval[0]), round(interval[1])],
          interval95Percent: [
            round((interval[0] / referenceMedianMs) * 100, 2),
            round((interval[1] / referenceMedianMs) * 100, 2)
          ],
          installFaster: differences.filter((difference) => difference < 0).length,
          bootstrap: { ...BOOTSTRAP }
        }
      ];
    })
  );
};

// Markdown ------------------------------------------------------------------------------------------------------------

/** A pipe inside a cell would start a new column, and a line break would end the row. */
const escapeCell = (value: string) => value.replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ');

/** A GitHub-flavored table; every row must have exactly one cell per column. */
export const markdownTable = (columns: { title: string; numeric?: boolean }[], rows: string[][]) => {
  for (const row of rows) {
    if (row.length !== columns.length) {
      throw new Error(`A report row has ${row.length} cells for ${columns.length} columns: ${row.join(', ')}`);
    }
  }
  const line = (cells: string[]) => `| ${cells.map(escapeCell).join(' | ')} |`;
  return [
    line(columns.map(({ title }) => title)),
    `| ${columns.map(({ numeric }) => (numeric ? '---:' : '---')).join(' | ')} |`,
    ...rows.map(line)
  ];
};

export const formatDistribution = (distribution: Distribution | null | undefined) =>
  distribution ? `${round(distribution.median)} (${round(distribution.min)}–${round(distribution.max)})` : '–';

const formatCounted = (values: Counted[], unit = '') =>
  values.length ? values.map(({ value, count: occurrences }) => `${value} ×${occurrences}${unit}`).join('; ') : '–';

const formatBytes = (bytes: number) => bytes.toLocaleString('en-US');

export type ReportInstall = {
  name: string;
  sha256: string;
  bytes: number;
  compileTarget: string;
  version: string;
  builtFrom: { before: SourceIdentity; after: SourceIdentity; check: string };
  installBytes: number;
  helperLambdas: { path: string; bytes: number; sha256: string }[];
};

export type HostDockerLatency = Record<string, { round: number; wallMs: number; exitCode: number | null }[]>;

/** The harness configuration a report states. */
export type ReportSettingsConfig = {
  suites: Suite[];
  startupSamples: number;
  activeStartupSamples: number;
  packageSamples: number;
  functions: number[];
  packageInstall: string | null;
  timeoutMs: number;
  /** Absent in configurations that predate it. */
  inspectArtifacts?: boolean;
  /** Retained rounds of the opt-in `ci-install` suite; absent in configurations that predate it. */
  ciInstallSamples?: number;
  /** Retained rounds of the opt-in `config-only` suite; absent in configurations that predate it. */
  configOnlySamples?: number;
  /** Retained rounds of the opt-in `commands` suite; absent in configurations that predate it. */
  commandSamples?: number;
};

/**
 * What every sample of a run shared, for the report. The rounds of a suite that did not run are left out; the order is
 * the one reports have always used, so a rendering of an older run differs only where the content does.
 */
export const describeSettings = (config: ReportSettingsConfig, safetyCheckDirectory: string | null) => ({
  suites: config.suites.join(', '),
  ...(config.suites.includes('startup') && {
    'startup rounds': `${config.startupSamples} measured and 1 warm-up for every install and command, without timings`
  }),
  ...(config.suites.includes('active-startup') && {
    'active startup rounds': `${config.activeStartupSamples} measured and 1 warm-up for every command, package install only, with timings`
  }),
  ...(config.suites.includes('package') && {
    'package rounds': `${config.packageSamples} measured and 1 warm-up for every function count and Docker situation, with timings`,
    functions: config.functions.join(', ')
  }),
  'package install': config.packageInstall ?? 'none',
  ...((config.suites.includes('package') || config.suites.includes('config-only')) && {
    'safety check': safetyCheckDirectory ?? 'none'
  }),
  ...(config.suites.includes('ci-install') && {
    'CI-install rounds': `${config.ciInstallSamples} measured and 1 warm-up for every package manager, markerless, marker mate and partial in rotated order, Docker absent, with timings`
  }),
  ...(config.suites.includes('commands') && {
    'command rounds': `${config.commandSamples} measured and 1 warm-up for every install: defaults:list, and validate of a valid and an invalid YAML configuration, installs interleaved and rotated per round, with timings`
  }),
  ...(config.suites.includes('config-only') && {
    'config-only rounds': `${config.configOnlySamples} measured and 1 warm-up for every function count and configuration state, in rotated blocks, platform-ready, with timings and artifact inspection; then 1 control per function count`
  }),
  ...(config.inspectArtifacts && {
    'artifact inspection':
      "every package sample's `.stacktape`, after the process exited and before it was removed, outside the wall time"
  }),
  'timeout per sample': `${config.timeoutMs} ms`,
  environment:
    "an owned HOME shared by the run's samples and digested before each; the AWS example credentials; AWS_ENDPOINT_URL and POSTHOG_HOST at the local fixture, other HTTP(S) through its refusing proxy; loopback-only network, every name answered NXDOMAIN by the recorder",
  'project state':
    "each sample's `.stacktape` removed after it; the package fixture vendors its dependencies and carries the install-hash marker of its lockfile",
  docker:
    'platform-ready and buildx-failure answered by the simulating guard, first on PATH, with the daemon sockets masked; docker-absent has no Docker on PATH'
});

export type ReportInput = {
  passed: boolean;
  checks: { check: string; passed: boolean; detail: string }[];
  clock: ClockComparison;
  settings: Record<string, unknown>;
  installs: ReportInstall[];
  /** The install the paired comparison measures the others against. */
  reference: string | null;
  summaries: SampleSummary[];
  paired: PairedComparison[];
  hostDockerLatency: HostDockerLatency | null;
  host: HostEnvironment | null;
  toolVersions: Record<string, string> | null;
  source: { before: SourceIdentity | null; after: SourceIdentity | null; check: SourceCheck | null };
  load: { before: number | null; after: number | null };
  /** The artifact contract and repeat checks, for a run that inspected artifacts. */
  artifacts?: ArtifactScenarioResult[] | null;
  /** The CI-install requirements, setup and identity, for a run of that suite. */
  ciInstall?: CiInstallResult | null;
  /** The config-only variants, per-state identities, comparisons and paired timing, for a run of that suite. */
  configOnly?: ConfigOnlyResult | null;
  /** The command journeys' requirements, behaviors per install and paired timing, for a run of that suite. */
  commands?: CommandsResult | null;
};

const describeClock = (clock: ClockComparison) =>
  clock.monotonicPerHost === null
    ? `Over this run the guest clock advanced ${clock.monotonicPerRealtime} ms per wall-clock ms; no host clock could be read, and a stepping time service makes that comparison coarse.`
    : `Over this run the guest clock advanced **${clock.monotonicPerHost} ms per host-clock ms** (${clock.elapsedMonotonicMs} guest ms against ${clock.elapsedHostMs} host ms, the Windows clock read through \`cmd.exe\` at the start and end, 10 ms resolution).`;

const LEGEND = [
  '- **Wall**: spawn to exit as the harness saw it, so it includes loading the executable and its teardown.',
  '- **CPU user / system**: CPU time of the process and its reaped descendants, in CPU milliseconds rather than elapsed time.',
  "- **Max RSS**: MiB (2^20 bytes), the peak resident set of the process or its largest reaped descendant. Linux carries the spawning harness's own peak into the child, so a value not above **harness peak** bounds the CLI from above only; the not-attributable count says how often that happened.",
  "- **Before origin**: spawn to the CLI runtime's time origin, on the shared monotonic clock; `–` where a sample's clock checks failed.",
  '- **To entry**: time origin to the first statement of the entry module, inside the CLI.',
  '- **Module load**: the startup dynamic imports together, loading and evaluating each module graph; this is not parsing alone.',
  '- **Read arguments**, **Command**: reading the arguments, then `runCommand` from start to end.',
  '- **Shutdown**: the end of the command to the exit handler.',
  '- **After exit**: the exit handler to the harness seeing the exit: runtime teardown, reaping and the harness noticing.',
  '- **Cross-process**: timed samples whose shared-clock checks (rate, ordering, parts adding up to the wall time) held, and the median residual of that sum.',
  "- **Origin → bundling**: the CLI's time origin to its first bundling step (the split build, or the first per-function build), inside the CLI; **spawn → bundling** adds before origin.",
  "- **Phase union / sum**: the elapsed time the phase's spans cover, overlaps counted once, and their plain sum. The sum counts concurrent per-function work fully, and also counts a span nested in another span of the same phase again: the config phase's `LOAD_CONFIG_FILE` event contains `config:resolve` and `config:validate`, so its sum is about twice its union. Use the union for elapsed time. `unvisited` means no sample recorded a span of the phase; it is never shown as 0."
];

const summaryKey = ({ suite, scenario, install }: SampleSummary) => [suite, scenario, install];

/** The distinct values, in order, such as `10` when every sample had ten. */
const distinct = (values: (number | string)[]) => [...new Set(values.map(String))].join(', ');

const yesNo = (value: boolean) => (value ? 'yes' : 'no');

const renderArtifacts = (results: ArtifactScenarioResult[]) => [
  '## Artifacts',
  '',
  "Inspected after each `package` process exited and before its `.stacktape` was removed, outside the wall time. Paths are relative to `.stacktape`, with the invocation directory shown as `<invocation>`. A ZIP's canonical digest covers its sorted entry paths, kinds, permission bits, sizes and contents, and ignores timestamps, compression, entry order, extra fields and comments. Its exact SHA-256 covers every byte. Where exact bytes vary, three more digests narrow down what varies: the whole file with its timestamp fields zeroed; the entry order; and the modeled entry records with their compressed bytes, apart from timestamps, order and offsets. The last is not a digest of every byte: data descriptors, bytes before or between records, and end-of-central-directory fields other than the comment are outside it. Each successful function ZIP's canonical content must equal its unzipped folder's. A folder's digest uses the same scheme over its files. The output listing covers the whole tree, with each ZIP counted by its canonical digest. Repeats are compared only within a scenario.",
  '',
  ...markdownTable(
    [
      { title: 'Scenario' },
      { title: 'Install' },
      { title: 'Expected path' },
      { title: 'Samples (retained)', numeric: true },
      { title: 'Contract met', numeric: true },
      { title: 'Output state' },
      { title: 'Function ZIPs', numeric: true },
      { title: 'Function folders', numeric: true },
      { title: 'ZIPs equal to their folders', numeric: true },
      { title: 'Helper-Lambda snapshots', numeric: true },
      { title: 'Split bundle', numeric: true },
      { title: 'Shared layers', numeric: true },
      { title: 'Other files', numeric: true },
      { title: 'Canonical repeat (retained, all)' },
      { title: 'Exact ZIP repeat (retained, all)' },
      { title: 'Exact bytes equal once timestamps are zeroed (retained, all)' },
      {
        title:
          'Modeled entry records and compressed bytes equal after timestamp and order normalization (retained, all)'
      }
    ],
    results.map((result) => [
      result.scenario,
      result.install,
      result.expected,
      `${result.samples.length} (${result.retained.samples})`,
      `${result.samples.filter(({ problems }) => problems.length === 0).length}/${result.samples.length}`,
      formatCounted(count(result.samples, ({ state }) => state)),
      distinct(result.samples.map(({ counts }) => counts.functionZips)),
      distinct(result.samples.map(({ counts }) => counts.functionDirectories)),
      distinct(result.samples.map(({ counts }) => counts.zipsMatchingFolder)),
      distinct(result.samples.map(({ counts }) => counts.helperLambdas)),
      distinct(result.samples.map(({ counts }) => counts.splitBundle)),
      distinct(result.samples.map(({ counts }) => counts.sharedLayers)),
      distinct(result.samples.map(({ counts }) => counts.otherFiles)),
      `${yesNo(result.retained.canonicalRepeated)}, ${yesNo(result.all.canonicalRepeated)}`,
      `${yesNo(result.retained.exactRepeated)}, ${yesNo(result.all.exactRepeated)}`,
      `${yesNo(result.retained.exactVariationOnlyTimestamps)}, ${yesNo(result.all.exactVariationOnlyTimestamps)}`,
      `${yesNo(result.retained.modeledEntriesRepeatAfterNormalization)}, ${yesNo(result.all.modeledEntriesRepeatAfterNormalization)}`
    ])
  ),
  '',
  ...markdownTable(
    [
      { title: 'Scenario' },
      { title: 'Artifact' },
      { title: 'Canonical SHA-256' },
      { title: 'Distinct canonical (retained, all)' },
      { title: 'Distinct exact SHA-256 (retained, all)' },
      { title: 'Distinct timestamp-normalized SHA-256 (retained, all)' },
      { title: 'Distinct entry orders (retained, all)' },
      { title: 'Distinct modeled-entry digests (retained, all)' },
      { title: 'Name digest' }
    ],
    results.flatMap((result) =>
      result.all.artifacts.map((artifact) => {
        const retained = result.retained.artifacts.find(({ key }) => key === artifact.key);
        return [
          result.scenario,
          artifact.key,
          artifact.canonicalSha256.length === 1 ? artifact.canonicalSha256[0]! : 'differs',
          `${retained?.canonicalSha256.length ?? 0}, ${artifact.canonicalSha256.length}`,
          artifact.sha256.length > 0 ? `${retained?.sha256.length ?? 0}, ${artifact.sha256.length}` : '–',
          artifact.timestampNormalizedSha256.length > 0
            ? `${retained?.timestampNormalizedSha256.length ?? 0}, ${artifact.timestampNormalizedSha256.length}`
            : '–',
          artifact.entryOrderSha256.length > 0
            ? `${retained?.entryOrderSha256.length ?? 0}, ${artifact.entryOrderSha256.length}`
            : '–',
          artifact.entrywiseNormalizedSha256.length > 0
            ? `${retained?.entrywiseNormalizedSha256.length ?? 0}, ${artifact.entrywiseNormalizedSha256.length}`
            : '–',
          artifact.nameDigest.length === 0 ? '–' : artifact.nameDigest.join(', ')
        ];
      })
    )
  ),
  '',
  ...results.flatMap((result) => [
    ...result.samples.flatMap(({ id, problems }) => problems.map((problem) => `- ${id}: ${problem}`)),
    ...[...new Set(result.samples.flatMap(({ otherFiles }) => otherFiles))].map(
      (path) => `- ${result.scenario}: outside the contract's roles: \`${path}\``
    ),
    ...(result.all.missingIn.length
      ? [`- ${result.scenario}: not in every sample: ${result.all.missingIn.join(', ')}`]
      : [])
  ]),
  ''
];

const formatTree = (size: { files: number; bytes: number } | null | undefined) =>
  size ? `${formatBytes(size.bytes)} B in ${size.files} files` : '–';

const describeCommand = (record: { command: string; exitCode: number | null; wallMs: number } | null | undefined) =>
  record ? `${record.command} (exit ${record.exitCode}, ${round(record.wallMs)} ms)` : '–';

const describeRequests = (record: {
  fixtureRequests: { kind: string; target: string; status: number; allowed: boolean }[] | null;
  dnsQueries: { name: string }[] | null;
}) =>
  record.fixtureRequests === null
    ? 'not recorded'
    : [
        ...record.fixtureRequests.map(
          ({ kind, target, status, allowed }) => `${kind} ${target} ${status}${allowed ? '' : ' refused'}`
        ),
        ...[...new Set((record.dnsQueries ?? []).map(({ name }) => `DNS ${name}`))]
      ].join('; ') || 'none';

const renderCiInstall = (result: CiInstallResult) => {
  const setup = result.setup;
  const retained = result.samples.filter(({ warmUp }) => !warmUp);
  const groups = [...new Set(result.samples.map(({ manager, state }) => `${manager} ${state}`))];
  return [
    '## CI install',
    '',
    "A pipeline has already run its frozen install; a fresh `stacktape package` then starts with `CI=1`, Docker absent. Before every sample the prepared seed (project and the manager's cache and state) is copied back to the same paths and checked, outside the timing. The markerless sample has no `node_modules/.stacktape-install-hash`; its marker mate holds the lockfile's SHA-256. Install ms is the `dependencies:install` span inside the CLI. Requests are those the fixture's proxy and the DNS recorder saw beyond the CLI's own STS, telemetry, update and announcement requests.",
    '',
    ...(setup
      ? [
          `- pnpm version: ${setup.pnpmVersion}. Prewarm, outside the sandbox with network access: ${describeCommand(setup.prewarm)}.`,
          `- Dependency tarball: ${setup.dependency ? `\`${setup.dependency.sha256}\`, ${formatBytes(setup.dependency.bytes)} bytes, packed by ${describeCommand(setup.dependency.pack)}` : 'not packed'}.`,
          '',
          ...markdownTable(
            [
              { title: 'Manager' },
              { title: 'Status' },
              { title: 'packageManager' },
              { title: 'Lockfile' },
              { title: 'Lockfile SHA-256' },
              { title: 'Lockfiles present' },
              { title: 'Seed project' },
              { title: 'Seed cache and state' }
            ],
            setup.managers.map((manager) => [
              manager.manager,
              manager.blocked ? `blocked: ${manager.blocked}` : 'ready',
              manager.packageManagerDeclaration ?? '–',
              manager.lockfile,
              manager.lockSha256 ?? '–',
              manager.lockfilesPresent.join(', ') || 'none',
              formatTree(manager.seed?.project),
              formatTree(manager.seed?.state)
            ])
          ),
          '',
          ...markdownTable(
            [
              { title: 'Manager' },
              { title: 'Setup step' },
              { title: 'Command' },
              { title: 'Exit', numeric: true },
              { title: 'ms', numeric: true },
              { title: 'Requests and DNS' }
            ],
            setup.managers.flatMap((manager) =>
              manager.steps.map((step) => [
                manager.manager,
                step.label,
                step.command,
                String(step.exitCode),
                String(round(step.wallMs)),
                describeRequests(step)
              ])
            )
          ),
          ''
        ]
      : ['No setup was recorded.', '']),
    ...markdownTable(
      [
        { title: 'Manager and state' },
        { title: 'Samples (retained)', numeric: true },
        { title: 'Exit codes' },
        { title: 'Wall ms', numeric: true },
        { title: 'Install ms', numeric: true },
        { title: 'Decision' },
        { title: 'Command' },
        { title: 'Installer children' },
        { title: 'Marker afterwards' },
        { title: 'Unexpected requests' },
        { title: 'DNS' },
        { title: 'Contract met', numeric: true },
        { title: 'Sentinel', numeric: true },
        { title: 'Preparation ms', numeric: true },
        { title: 'Cache and state growth' },
        { title: 'Samples with problems', numeric: true }
      ],
      groups.map((group) => {
        const all = result.samples.filter(({ manager, state }) => `${manager} ${state}` === group);
        const kept = retained.filter(({ manager, state }) => `${manager} ${state}` === group);
        const numbers = (values: (number | null)[]) => values.filter((value): value is number => value !== null);
        return [
          group,
          `${all.length} (${kept.length})`,
          formatCounted(count(kept, ({ exitCode }) => String(exitCode))),
          formatDistribution(summarize(kept.map(({ wallMs }) => wallMs))),
          formatDistribution(summarize(numbers(kept.map(({ installMs }) => installMs)))),
          formatCounted(count(all, ({ decision }) => decision ?? 'none')),
          formatCounted(count(all, ({ command }) => command ?? 'none')),
          formatCounted(
            count(
              all,
              ({ installerChildren }) =>
                installerChildren.map(({ executable, exitCode }) => `${executable} exit ${exitCode}`).join(', ') ||
                'none'
            )
          ),
          formatCounted(count(all, ({ markerAfter }) => markerAfter ?? 'unknown')),
          formatCounted(
            count(
              all.flatMap(({ unexpectedRequests }) => unexpectedRequests),
              (request) => request
            )
          ),
          formatCounted(
            count(
              all.flatMap(({ dnsNames }) => dnsNames),
              (name) => name
            )
          ),
          `${all.filter(({ contract }) => contract && contract.problems.length === 0).length}/${all.length}`,
          `${all.filter(({ sentinelMatched }) => sentinelMatched).length}/${all.length}`,
          formatDistribution(summarize(numbers(all.map(({ preparationMs }) => preparationMs)))),
          formatDistribution(summarize(numbers(all.map(({ growth }) => growth?.state.bytes ?? null)))) +
            ' B state, ' +
            formatDistribution(summarize(numbers(all.map(({ growth }) => growth?.nodeModules.bytes ?? null)))) +
            ' B node_modules',
          `${all.filter(({ problems }) => problems.length > 0).length}/${all.length}`
        ];
      })
    ),
    '',
    ...markdownTable(
      [
        { title: 'Manager' },
        { title: 'Samples', numeric: true },
        { title: 'Distinct function ZIP canonical digests', numeric: true },
        { title: 'Distinct ZIP name digests', numeric: true },
        { title: 'Canonical SHA-256' },
        { title: 'Name digest' }
      ],
      result.identity.map(({ manager, samples, canonicalSha256, nameDigests }) => [
        manager,
        String(samples),
        String(canonicalSha256.length),
        String(nameDigests.length),
        canonicalSha256.length === 1 ? canonicalSha256[0]! : canonicalSha256.join(', ') || '–',
        nameDigests.join(', ') || '–'
      ])
    ),
    '',
    ...result.setupProblems.map((problem) => `- setup: ${problem}`),
    ...result.samples.flatMap(({ id, problems }) => problems.map((problem) => `- ${id}: ${problem}`)),
    ''
  ];
};

const CONFIG_ONLY_PHASES: PhaseName[] = [
  'credentialsAndContext',
  'config',
  'docker',
  'build',
  'hashing',
  'layers',
  'zip'
];

const shortDigest = (digests: string[]) =>
  digests.length === 1 ? digests[0]!.slice(0, 12) : `${digests.length} digests`;

type StateIdentityLike = { canonicalSha256: string[]; nameDigests: string[]; exactSha256: string[] };

/** A grouping in one line: path, shared layers with chunk counts, layered chunks and how the mapped chunks are shared. */
const describeGrouping = (grouping: Grouping | null) => {
  if (!grouping) return 'no single base grouping';
  const layers =
    grouping.layers.map(({ layer, chunks }) => `${layer} with ${chunks} chunks`).join(', ') || 'no shared layer';
  const widths = count(grouping.sharing, (entry) => String(entry.split(', ').length)).map(
    ({ value, count: chunks }) => `${chunks} chunk${chunks === 1 ? '' : 's'} shared by ${value} functions`
  );
  return `${grouping.path}, ${grouping.functions.length} functions, ${layers}, ${grouping.layeredChunks ?? 'no'} layered chunks${widths.length ? `, mapped ${widths.join(', ')}` : ''}`;
};

/** A state's artifact against the base's: `same`, or what differs. */
const describeAgainstBase = (base: StateIdentityLike | undefined, other: StateIdentityLike | undefined) => {
  if (!other) return 'absent';
  if (!base) return `new ${shortDigest(other.canonicalSha256)}`;
  const canonicalSame = JSON.stringify(base.canonicalSha256) === JSON.stringify(other.canonicalSha256);
  const nameSame = JSON.stringify(base.nameDigests) === JSON.stringify(other.nameDigests);
  if (canonicalSame && nameSame) return 'same';
  return [
    canonicalSame ? 'content same' : `content ${shortDigest(other.canonicalSha256)}`,
    ...(other.nameDigests.length > 0 || base.nameDigests.length > 0
      ? [nameSame ? 'name same' : `name ${shortDigest(other.nameDigests)}`]
      : [])
  ].join(', ');
};

const renderConfigOnly = (result: ConfigOnlyResult) => {
  const setup = result.setup;
  const verdict = (comparison: { passed: boolean; problems: string[] }) =>
    comparison.passed ? 'yes' : `**no**: ${comparison.problems.slice(0, 5).join('; ')}`;
  return [
    '## Config only',
    '',
    "The fixture packaged from its YAML `stacktape.yml` while only that file changed, with Docker answered as platform-ready by the guard. `package` rebuilds and rezips everything (`commandCanUseCache: false`), so nothing here measures or implies reuse by a deployment. An edit and its revert run back to back; the three blocks (base, deployment pair, packaging pair) and the function counts rotate per round. Before each sample the configuration held the state's bytes, every other file matched the generated fixture and no output was left; after it, the configuration and files were checked again. Each function ZIP was extracted with `unzip` and its handler invoked by Node on this host through a resolve hook, one process per function: the split path's `/opt/nodejs/chunks/` imports resolved to the sample's unzipped layer folders, and the payload's `@aws-sdk/*` imports to the CLI's own dependency, standing in for the SDK the Lambda runtime provides. That is host Node, not the official Lambda runtime. Columns say whether they count every sample, warm-up included, or only the retained ones.",
    '',
    ...(setup
      ? [
          `- Runtime SDK: \`${setup.sdk.specifier}@${setup.sdk.version ?? 'missing'}\`, resolved from the CLI's dependencies. Resolve hook SHA-256 \`${setup.hooksSha256}\`. Event: \`${JSON.stringify(setup.event)}\`.`,
          '',
          ...markdownTable(
            [
              { title: 'Functions', numeric: true },
              { title: 'Expected path' },
              { title: 'Variant' },
              { title: 'Configuration SHA-256' },
              { title: 'Bytes', numeric: true },
              { title: 'Lines added' },
              { title: 'Lines removed' },
              { title: 'Problems' }
            ],
            setup.shapes.flatMap(({ functions, expected, variants }) =>
              Object.values(variants).map((variant) => [
                String(functions),
                expected,
                variant.variant,
                variant.sha256,
                formatBytes(variant.bytes),
                variant.added.map(({ line, count: times }) => `\`${line.trim()}\` ×${times}`).join('; ') || '–',
                variant.removed.map(({ line, count: times }) => `\`${line.trim()}\` ×${times}`).join('; ') || '–',
                variant.problems.join('; ') || 'none'
              ])
            )
          ),
          '',
          ...markdownTable(
            [{ title: 'Functions', numeric: true }, { title: 'Files other than the configuration' }],
            setup.shapes.map(({ functions, source }) => [
              String(functions),
              `${source.contentSha256}, ${source.files} files, ${formatBytes(source.bytes)} bytes`
            ])
          ),
          ''
        ]
      : ['No setup was recorded.', '']),
    ...markdownTable(
      [
        { title: 'Functions', numeric: true },
        { title: 'State' },
        { title: 'Samples (retained)', numeric: true },
        { title: 'Exit codes (all)' },
        { title: 'Wall ms (retained)', numeric: true },
        { title: 'Packaging path (all)' },
        { title: 'Shared layers (all)' },
        { title: 'Layered chunks (all)' },
        { title: 'Samples with problems (all)', numeric: true }
      ],
      result.shapes.flatMap(({ functions, states }) =>
        states.map((state) => {
          const own = result.samples.filter((sample) => sample.functions === functions && sample.state === state.state);
          return [
            String(functions),
            state.state,
            `${state.samples} (${state.retained})`,
            formatCounted(count(own, ({ exitCode }) => String(exitCode))),
            formatDistribution(summarize(own.filter(({ warmUp }) => !warmUp).map(({ wallMs }) => wallMs))),
            state.observedPaths.join(', ') || '–',
            state.sharedLayers.join(', '),
            state.layeredChunks.map((value) => String(value ?? '–')).join(', '),
            `${state.withProblems}/${state.samples}`
          ];
        })
      )
    ),
    '',
    'Artifacts per state, over all its samples: the canonical content and ZIP name digests, each state against the base. Exact ZIP bytes are counted separately; they vary with the ZIP timestamps and are not an identity.',
    '',
    ...markdownTable(
      [
        { title: 'Functions', numeric: true },
        { title: 'Artifact' },
        { title: 'Base content' },
        { title: 'Base name' },
        { title: 'Deployment edit' },
        { title: 'After it' },
        { title: 'minify: false' },
        { title: 'After it' },
        { title: 'Distinct exact ZIP bytes (all): base / deployment edit / after / minify / after' }
      ],
      result.shapes.flatMap(({ functions, states }) => {
        const find = (state: string, key: string) =>
          states.find((entry) => entry.state === state)?.identity.find((identity) => identity.key === key);
        const keys = [...new Set(states.flatMap(({ identity }) => identity.map(({ key }) => key)))]
          .filter((key) => !key.startsWith('helper Lambda'))
          .toSorted();
        return keys.map((key) => {
          const base = find('base', key);
          return [
            String(functions),
            key,
            base ? shortDigest(base.canonicalSha256) : 'absent',
            base?.nameDigests.length ? shortDigest(base.nameDigests) : '–',
            describeAgainstBase(base, find('deployment-edit', key)),
            describeAgainstBase(base, find('base-after-deployment-edit', key)),
            describeAgainstBase(base, find('packaging-edit', key)),
            describeAgainstBase(base, find('base-after-packaging-edit', key)),
            key.startsWith('function ZIP')
              ? states.map((state) => String(find(state.state, key)?.exactSha256.length ?? 0)).join(' / ')
              : '–'
          ];
        });
      })
    ),
    '',
    ...result.shapes.flatMap((shape) => [
      `**${shape.functions} function${shape.functions === 1 ? '' : 's'}** (expected ${shape.expected}):`,
      `- Every state repeated its identities: ${verdict(shape.statesRepeated)}.`,
      `- Every state kept the base grouping (${describeGrouping(shape.groupingUnchanged.grouping)}): ${verdict(shape.groupingUnchanged)}. Shared-layer content changed under \`minify: false\`: ${shape.packagingChanged.layerContentChanged === null ? 'no shared layer' : yesNo(shape.packagingChanged.layerContentChanged)}, which is not a grouping change.`,
      `- Resolution on host Node through the hook: ${(() => {
        const own = result.samples.filter(
          ({ functions, state }) => functions === shape.functions && state !== 'invalid-deployment-value'
        );
        const failing = own.filter(({ resolverProblems }) => resolverProblems.length > 0);
        return failing.length === 0 && own.length > 0
          ? `every sample's handlers resolved the SDK through the hook${shape.expected === 'split' ? ' and each mapped at least one layer chunk of its own sample' : ', with no layer chunk mapped'}`
          : `**${failing.length} of ${own.length} samples departed from the intended path**`;
      })()}.`,
      `- The deployment-only edit kept every identity: ${verdict(shape.deploymentPreserved)}.`,
      `- Both reverts restored the base: ${verdict(shape.revertsRestored)}.`,
      `- \`minify: false\` changed every function payload on the same path: ${verdict(shape.packagingChanged)}. Function payloads changed: ${shape.packagingChanged.functions.filter(({ canonicalChanged }) => canonicalChanged).length}/${shape.packagingChanged.functions.length}; ZIP name digests changed: ${shape.packagingChanged.functions.filter(({ nameDigestChanged }) => nameDigestChanged).length}/${shape.packagingChanged.functions.length}; split bundle changed: ${shape.packagingChanged.splitBundleChanged === null ? 'no split bundle' : yesNo(shape.packagingChanged.splitBundleChanged)}; shared layers ${shape.packagingChanged.sharedLayers.base} became ${shape.packagingChanged.sharedLayers.edit}.`,
      `- Every function's extracted handler answered the same in every state: ${verdict(shape.answersIdentical)}.`,
      `- Control (every \`CONFIG_REVISION\` a list): ${
        shape.control
          ? `exit ${shape.control.exitCode}, failed at ${shape.control.failedAt ?? 'nothing'}, ${shape.control.functionZips} function ZIPs, ${shape.control.buildEntries} entries under build/, refused entries named for ${shape.control.refusedEntries?.length ?? 0} of ${shape.functions} functions; ${shape.control.problems.length === 0 ? 'as required' : `**${shape.control.problems.join('; ')}**`}`
          : '**not run**'
      }.`,
      ''
    ]),
    'Paired within a round: each state minus the base of the same round, retained rounds only. Command is `runCommand`, the package work without process startup and teardown. Only the config phase reads the YAML, and a packaging input acts in build, hashing, layers and zip. Module load, credentials and Docker probing do not read the edited values, so their differences are run-to-run variation, not an effect of the edit.',
    '',
    ...markdownTable(
      [
        { title: 'Functions', numeric: true },
        { title: 'State minus base' },
        { title: 'Pairs', numeric: true },
        { title: 'Wall ms', numeric: true },
        { title: 'Command ms', numeric: true },
        { title: 'Module load ms (control)', numeric: true },
        ...CONFIG_ONLY_PHASES.map((phase) => ({ title: `${phase} union ms`, numeric: true }))
      ],
      result.shapes.flatMap(({ functions, paired }) =>
        paired.map(({ state, pairs, wallMs, commandMs, moduleLoadMs, phases }) => [
          String(functions),
          state,
          String(pairs),
          formatDistribution(wallMs),
          formatDistribution(commandMs),
          formatDistribution(moduleLoadMs),
          ...CONFIG_ONLY_PHASES.map((phase) => {
            const entry = phases.find((candidate) => candidate.phase === phase);
            return entry && entry.pairs > 0 ? formatDistribution(entry.unionMs) : '–';
          })
        ])
      )
    ),
    '',
    ...result.setupProblems.map((problem) => `- setup: ${problem}`),
    ...result.populationProblems.map((problem) => `- population: ${problem}`),
    ...result.samples.flatMap(({ id, problems, resolverProblems }) =>
      [...problems, ...resolverProblems.map((problem) => `resolution: ${problem}`)].map(
        (problem) => `- ${id}: ${problem}`
      )
    ),
    ''
  ];
};

const renderCommands = (result: CommandsResult) => [
  '## Commands',
  '',
  '`defaults:list` reads no configuration. `validate` resolves the account through the fixture, validates the YAML configuration, then loads stack metadata from AWS, which the fixture refuses: the valid configuration passes validation and stops at that step, the invalid one stops at validation. A behavior is the exit code, the failure point, whether `CONFIG_SCHEMA_INVALID` or success was printed, and the refused entries named. Every sample, warm-ups included.',
  '',
  ...markdownTable(
    [
      { title: 'Scenario' },
      { title: 'Install' },
      { title: 'Retained', numeric: true },
      { title: 'Behaviors (samples)' }
    ],
    result.behaviors.map(({ scenario, install, behaviors }) => [
      scenario,
      install,
      String(result.retained.find((entry) => entry.scenario === scenario && entry.install === install)?.retained ?? 0),
      behaviors.map(({ behavior, samples }) => `${behavior} ×${samples}`).join('; ') || 'none'
    ])
  ),
  '',
  `- The installs behaved the same in every scenario: ${result.behaviorProblems.length === 0 ? 'yes' : `**no**: ${result.behaviorProblems.join('; ')}`}.`,
  '',
  'Paired within a round, retained rounds only: the install minus the reference. `config:validate` is the span in which a validator loaded on first use is evaluated.',
  '',
  ...markdownTable(
    [
      { title: 'Scenario' },
      { title: 'Install minus reference' },
      { title: 'Pairs', numeric: true },
      { title: 'Wall ms', numeric: true },
      { title: 'Command ms', numeric: true },
      { title: 'Module load ms', numeric: true },
      { title: 'config:validate ms', numeric: true },
      { title: 'Max RSS MiB', numeric: true }
    ],
    result.paired.map(
      ({ scenario, reference, install, pairs, wallMs, commandMs, moduleLoadMs, configValidateMs, maxRssMiB }) => [
        scenario,
        `${install} − ${reference}`,
        String(pairs),
        formatDistribution(wallMs),
        formatDistribution(commandMs),
        formatDistribution(moduleLoadMs),
        formatDistribution(configValidateMs),
        formatDistribution(maxRssMiB)
      ]
    )
  ),
  '',
  ...result.samples.flatMap(({ id, problems }) => problems.map((problem) => `- ${id}: ${problem}`)),
  ''
];

export const renderReport = (input: ReportInput): string => {
  const { summaries } = input;
  const timed = summaries.filter((summary) => summary.timing);
  const packages = summaries.filter(({ suite }) => suite === 'package');
  const lines: string[] = [
    '# CLI measurement',
    '',
    input.passed ? 'Every check held.' : '**At least one check failed; see the checks below and `outer.json`.**',
    '',
    '## Units and clock',
    '',
    "- Every time is in **guest-monotonic milliseconds**: `performance.now()` of the harness or the CLI, both this machine's `CLOCK_MONOTONIC`. Cells show the median and, in brackets, the minimum and maximum of valid samples, warm-ups excluded. No tail-latency claim is made.",
    `- ${describeClock(input.clock)} Under WSL this factor varies between runs (8-9% fast on the measurement machine), so it is applied nowhere: a duration here is guest time, roughly host time multiplied by the factor. Durations from different runs compare only with that qualification. The paired startup comparison is within this run and needs none. Nothing here is host real time or a comparison with another tool.`,
    ...LEGEND,
    '',
    '## What ran',
    '',
    ...markdownTable(
      [
        { title: 'Install' },
        { title: 'Executable SHA-256' },
        { title: 'Executable bytes', numeric: true },
        { title: 'Target' },
        { title: 'Version' },
        { title: 'Built from' },
        { title: 'Measured runtime layout bytes', numeric: true }
      ],
      input.installs.map((install) => [
        install.name,
        install.sha256,
        formatBytes(install.bytes),
        install.compileTarget,
        install.version,
        `${describeSourceIdentity(install.builtFrom.before)}; ${install.builtFrom.check} during the build`,
        formatBytes(install.installBytes)
      ])
    ),
    '',
    'The measured runtime layout is the executable and the files a measured command reads, as `build-release-install.ts` builds it. It is not the size of a customer install: the downloaded tools (pack, nixpacks, the Session Manager plugin), the MCP documentation, the init wizard and the starter metadata are left out.',
    '',
    ...markdownTable(
      [{ title: 'Install' }, { title: 'Helper ZIP' }, { title: 'Bytes', numeric: true }, { title: 'SHA-256' }],
      input.installs.flatMap((install) =>
        install.helperLambdas.map(({ path, bytes, sha256 }) => [install.name, path, formatBytes(bytes), sha256])
      )
    ),
    '',
    `- Source during the run: ${input.source.before ? describeSourceIdentity(input.source.before) : 'not read'} before, ${input.source.after ? describeSourceIdentity(input.source.after) : 'not read'} after: **${input.source.check ?? 'not compared'}**.`,
    `- Host: ${input.host ? `${input.host.cpuModel}, ${input.host.logicalCpus} logical CPUs, ${round(input.host.totalMemoryBytes / 1024 ** 3)} GiB, ${input.host.platform} ${input.host.osRelease} ${input.host.arch}, Bun ${input.host.bun}` : 'not read'}. One-minute load ${input.load.before ?? '?'} before and ${input.load.after ?? '?'} after.`,
    `- Tools: ${
      input.toolVersions
        ? Object.entries(input.toolVersions)
            .map(([tool, version]) => `${tool} ${version}`)
            .join('; ')
        : 'not read'
    }.`,
    '- Settings:',
    ...Object.entries(input.settings).map(
      ([name, value]) => `  - ${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
    ),
    ''
  ];

  if (input.paired.length > 0) {
    lines.push(
      '## Startup cost against the reference',
      '',
      `Without \`STP_TIMINGS_FILE\`, each install's wall time minus the reference install's (\`${input.reference}\`) in the same round: the installs of a round run back to back in a rotated order. The interval is a 95% percentile bootstrap of the median paired difference (${BOOTSTRAP.resamples} resamples, seed ${BOOTSTRAP.seed}); its upper end bounds the inactive cost this run can resolve.`,
      '',
      ...markdownTable(
        [
          { title: 'Command' },
          { title: 'Install' },
          { title: 'Pairs', numeric: true },
          { title: 'Same home state', numeric: true },
          { title: 'Reference median ms', numeric: true },
          { title: 'Install median ms', numeric: true },
          { title: 'Difference of medians ms', numeric: true },
          { title: 'Median paired difference ms', numeric: true },
          { title: '95% interval ms', numeric: true },
          { title: '95% interval %', numeric: true },
          { title: 'Install faster', numeric: true }
        ],
        input.paired.map((comparison) => [
          comparison.scenario,
          comparison.install,
          String(comparison.pairs),
          comparison.sameHomeState === null ? '–' : `${comparison.sameHomeState}/${comparison.pairs}`,
          String(comparison.referenceMedianMs),
          String(comparison.installMedianMs),
          String(comparison.differenceOfMediansMs),
          String(comparison.medianPairedDifferenceMs),
          `${comparison.interval95Ms[0]} to ${comparison.interval95Ms[1]}`,
          `${comparison.interval95Percent[0]} to ${comparison.interval95Percent[1]}`,
          `${comparison.installFaster}/${comparison.pairs}`
        ])
      ),
      ''
    );
  }

  lines.push(
    '## Samples',
    '',
    ...markdownTable(
      [
        { title: 'Suite' },
        { title: 'Scenario' },
        { title: 'Install' },
        { title: 'Samples (valid)', numeric: true },
        { title: 'Exit codes' },
        { title: 'Wall ms', numeric: true },
        { title: 'CPU user ms', numeric: true },
        { title: 'CPU system ms', numeric: true },
        { title: 'Max RSS MiB', numeric: true },
        { title: 'Harness peak RSS MiB', numeric: true },
        { title: 'RSS not attributable', numeric: true },
        { title: 'Home states', numeric: true },
        { title: 'Load (1 min)', numeric: true }
      ],
      summaries.map((summary) => [
        ...summaryKey(summary),
        `${summary.samples} (${summary.valid})`,
        formatCounted(summary.exitCodes),
        formatDistribution(summary.wallMs),
        formatDistribution(summary.userCpuMs),
        formatDistribution(summary.systemCpuMs),
        formatDistribution(summary.maxRssMiB),
        formatDistribution(summary.harnessPeakRssMiB),
        `${summary.maxRssNotAttributable}/${summary.valid}`,
        summary.homeStates === null ? '–' : String(summary.homeStates),
        formatDistribution(summary.load)
      ])
    ),
    ''
  );

  if (timed.length > 0) {
    lines.push(
      '## Inside the timed samples',
      '',
      ...markdownTable(
        [
          { title: 'Suite' },
          { title: 'Scenario' },
          { title: 'Install' },
          { title: 'Timed', numeric: true },
          { title: 'Before origin ms', numeric: true },
          { title: 'To entry ms', numeric: true },
          { title: 'Module load ms', numeric: true },
          { title: 'Read arguments ms', numeric: true },
          { title: 'Command ms', numeric: true },
          { title: 'Shutdown ms', numeric: true },
          { title: 'After exit ms', numeric: true },
          { title: 'Cross-process measured', numeric: true },
          { title: 'Residual ms', numeric: true }
        ],
        timed.map((summary) => {
          const timing = summary.timing!;
          return [
            ...summaryKey(summary),
            String(timing.timed),
            formatDistribution(timing.beforeOriginMs),
            formatDistribution(timing.toEntryMs),
            formatDistribution(timing.moduleLoadMs),
            formatDistribution(timing.readArgumentsMs),
            formatDistribution(timing.commandMs),
            formatDistribution(timing.shutdownMs),
            formatDistribution(timing.afterExitHandlerMs),
            `${timing.crossProcessMeasured}/${timing.timed}`,
            formatDistribution(timing.conservationResidualMs)
          ];
        })
      ),
      '',
      ...timed.flatMap((summary) =>
        summary.timing!.crossProcessProblems.length
          ? [
              `- ${summaryKey(summary).join(', ')}: cross-process times refused: ${summary.timing!.crossProcessProblems.join('; ')}.`
            ]
          : []
      ),
      ''
    );
  }

  if (packages.length > 0) {
    lines.push(
      '## Package',
      '',
      ...markdownTable(
        [
          { title: 'Scenario' },
          { title: 'Install' },
          { title: 'Samples (valid)', numeric: true },
          { title: 'Exit codes' },
          { title: 'Wall ms', numeric: true },
          { title: 'Reached bundling', numeric: true },
          { title: 'Origin → bundling ms', numeric: true },
          { title: 'Spawn → bundling ms', numeric: true },
          { title: 'Packaging path (samples)' },
          { title: 'Failed at (samples)' },
          { title: 'Unfinished spans (samples)' }
        ],
        packages.map((summary) => [
          summary.scenario,
          summary.install,
          `${summary.samples} (${summary.valid})`,
          formatCounted(summary.exitCodes),
          formatDistribution(summary.wallMs),
          summary.timing ? `${summary.timing.bundlingReached}/${summary.timing.timed}` : '–',
          formatDistribution(summary.timing?.originToBundlingMs),
          formatDistribution(summary.timing?.spawnToBundlingMs),
          formatCounted(summary.timing?.packagingPaths ?? []),
          formatCounted(summary.timing?.failedAt ?? []),
          formatCounted(summary.timing?.unfinishedSpans ?? [])
        ])
      ),
      ''
    );
  }

  if (timed.length > 0) {
    lines.push(
      '## Phases',
      '',
      'Each cell: the median union (minimum–maximum), the median sum, and the timed samples that reached the phase.',
      '',
      ...markdownTable(
        [
          { title: 'Phase' },
          ...timed.map((summary) => ({ title: `${summary.suite}: ${summary.scenario} (${summary.install})` }))
        ],
        PHASE_NAMES.map((phase) => [
          phase,
          ...timed.map(({ timing }) => {
            const coverage = timing!.phases[phase];
            return coverage.visitedIn === 0
              ? `unvisited (0/${coverage.of})`
              : `union ${formatDistribution(coverage.unionMs)}; sum ${round(coverage.sumMs!.median)}; ${coverage.visitedIn}/${coverage.of}`;
          })
        ])
      ),
      ''
    );
  }

  lines.push(
    '## Evidence',
    '',
    'Every sample of a group, warm-ups included. Fixture requests and DNS names are counted in requests; Docker command sequences, as the guard saw and answered them, in samples.',
    '',
    ...markdownTable(
      [
        { title: 'Suite' },
        { title: 'Scenario' },
        { title: 'Install' },
        { title: 'Samples', numeric: true },
        { title: 'Fixture requests' },
        { title: 'Stale fixture requests', numeric: true },
        { title: 'DNS names' },
        { title: 'Docker (guard)' },
        { title: 'Subprocesses (via utils/exec)' },
        { title: 'Escaped processes', numeric: true }
      ],
      summaries.map((summary) => [
        ...summaryKey(summary),
        String(summary.evidence.samples),
        formatCounted(summary.evidence.fixtureRequests),
        String(summary.evidence.staleFixtureRequests),
        summary.evidence.dnsQueries === null ? 'no recorder' : formatCounted(summary.evidence.dnsQueries),
        summary.evidence.dockerSequences === null ? 'no guard' : formatCounted(summary.evidence.dockerSequences),
        summary.timing
          ? summary.timing.subprocesses.length
            ? summary.timing.subprocesses
                .map(
                  ({ executable, description, exitCodes, perSample, ms }) =>
                    `${executable}${description ? ` (${description})` : ''}: ${formatDistribution(perSample)} per sample, exit ${exitCodes.join('/')}, ${formatDistribution(ms)} ms`
                )
                .join('; ')
            : 'none'
          : 'not timed',
        String(summary.evidence.escapedProcesses)
      ])
    ),
    ''
  );

  const invalid = summaries.flatMap(({ invalid: samples }) => samples);
  if (invalid.length > 0) {
    lines.push(
      '## Invalid samples',
      '',
      ...invalid.map(({ id, invalidReasons }) => `- ${id}: ${invalidReasons.join('; ')}`),
      ''
    );
  }

  if (input.artifacts?.length) lines.push(...renderArtifacts(input.artifacts));
  if (input.ciInstall) lines.push(...renderCiInstall(input.ciInstall));
  if (input.configOnly) lines.push(...renderConfigOnly(input.configOnly));
  if (input.commands) lines.push(...renderCommands(input.commands));

  if (input.hostDockerLatency) {
    lines.push(
      '## Real Docker daemon, read-only, outside the sandbox',
      '',
      "The host's own `docker info` and `docker buildx inspect` (no bootstrap), each a fresh process, the first round a discarded warm-up. The package samples never reach this daemon: their Docker answers are simulated by the guard and say nothing about its latency.",
      '',
      ...markdownTable(
        [
          { title: 'Command' },
          { title: 'Samples', numeric: true },
          { title: 'Exit codes' },
          { title: 'Wall ms', numeric: true }
        ],
        Object.entries(input.hostDockerLatency).map(([command, runs]) => {
          const measured = runs.filter(({ round: roundNumber }) => roundNumber > 0);
          return [
            `docker ${command}`,
            String(measured.length),
            formatCounted(count(measured, ({ exitCode }) => String(exitCode))),
            formatDistribution(summarize(measured.map(({ wallMs }) => wallMs)))
          ];
        })
      ),
      ''
    );
  }

  lines.push(
    '## Checks',
    '',
    ...input.checks.map(
      ({ check, passed, detail }) =>
        `- ${passed ? 'PASS' : 'FAIL'} ${check}${passed ? '' : `: ${detail.slice(0, 300)}`}`
    )
  );
  return `${lines.join('\n')}\n`;
};
