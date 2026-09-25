/**
 * Reads one CLI timing document (`STP_TIMINGS_FILE`) together with the process the harness observed, and splits the
 * run into the parts a report can compare.
 *
 * - `wallMs`: spawn to exit, measured by the harness on its own monotonic clock.
 * - `beforeOriginMs`: spawn to the runtime's time origin, from the shared monotonic clock (`analyzeCrossProcess`); the
 *   executable is being loaded then, before any JavaScript runs. Null when that could not be measured and checked.
 * - `toEntryMs`: time origin to the first statement of the entry module.
 * - `moduleLoadMs`: the dynamic imports of the startup path, each span covering whatever loading and evaluating that
 *   module graph costs. It is not called parsing: this run cannot tell parsing, compilation and evaluation apart.
 * - `commandMs`: `runCommand` from start to end; `shutdownMs`: from the end of the command to the exit handler;
 *   `afterExitHandlerMs`: from the exit handler to the harness seeing the exit, also from the shared monotonic clock.
 * - `originToBundlingMs`: the child's time origin to its first bundling step, all within the measured process;
 *   `spawnToBundlingMs` adds `beforeOriginMs` when that was measured.
 *
 * Phases group the spans the CLI's owners record. A phase no span of which was recorded is `visited: false`, never zero.
 * Phases can run concurrently, per function for example, so each carries both the wall-clock union of its spans
 * (`unionMs`) and the plain sum (`sumMs`).
 */
import type { TimingDocument, TimingSpan } from './cli-sample';

export type PhaseName =
  | 'credentialsAndContext'
  | 'config'
  | 'docker'
  | 'dependencies'
  | 'build'
  | 'hashing'
  | 'layers'
  | 'copyAndRewrite'
  | 'zip'
  | 's3'
  | 'hooks'
  | 'cleanup'
  | 'telemetry'
  | 'updates'
  | 'announcements';

export type PhaseSummary = { visited: false } | { visited: true; spans: number; unionMs: number; sumMs: number };

type SpanMatcher = (span: TimingSpan) => boolean;

const named =
  (...names: string[]): SpanMatcher =>
  ({ name }) =>
    names.includes(name);
const awsOperation =
  (prefix: string): SpanMatcher =>
  ({ name, detail }) =>
    name === 'aws:request' && typeof detail?.operation === 'string' && detail.operation.startsWith(prefix);
const anyOf =
  (...matchers: SpanMatcher[]): SpanMatcher =>
  (span) =>
    matchers.some((matcher) => matcher(span));

/**
 * The spans each phase is made of. Split packaging records `split:build` for its one bundling step; the per-function
 * buildpack records a `BUILD_CODE` event per function, so those events count as build only when there is no split build.
 */
const PHASES: Record<PhaseName, SpanMatcher> = {
  credentialsAndContext: anyOf(
    named('event:LOAD_AWS_CREDENTIALS', 'credentials:provider-chain', 'context:aws-sdk-init', 'context:target-stack'),
    awsOperation('STS.')
  ),
  config: named('config:load-raw', 'event:LOAD_CONFIG_FILE', 'config:resolve', 'config:validate'),
  docker: named('docker:probe', 'docker:build-platforms', 'docker:remote-cache'),
  dependencies: named('dependencies:install', 'event:INSTALL_DEPENDENCIES'),
  build: named('split:build', 'event:BUILD_CODE'),
  hashing: named('split:function-digest', 'event:CALCULATE_CHECKSUM'),
  layers: named('split:assign-layers', 'split:create-layer-artifacts', 'split:native-layers'),
  copyAndRewrite: named('event:RESOLVE_DEPENDENCIES'),
  zip: named('zip:archive', 'zip:detect-native-tool'),
  s3: anyOf(
    named('event:FETCH_PREVIOUS_ARTIFACTS', 'event:UPLOAD_DEPLOYMENT_ARTIFACTS', 'event:UPLOAD_PACKAGE'),
    awsOperation('S3.')
  ),
  hooks: named('hooks:before', 'hooks:after'),
  cleanup: named('cleanup:run', 'command:delete-temp-folder'),
  telemetry: named('telemetry:report', 'telemetry:report-error'),
  updates: named('updates:check'),
  announcements: named('announcements:print')
};

export const PHASE_NAMES = Object.keys(PHASES) as PhaseName[];

const WRAPPER_SPANS = new Set(['subprocess', 'cli:run-command', 'command:execute', 'event:PACKAGE_ARTIFACTS']);

const round = (milliseconds: number) => Math.round(milliseconds * 10) / 10;

/** Total length covered by the intervals, counting overlaps once. */
const unionLength = (intervals: [number, number][]) => {
  let total = 0;
  let current: [number, number] | null = null;
  for (const [start, end] of intervals.toSorted((left, right) => left[0] - right[0])) {
    if (!current || start > current[1]) {
      if (current) total += current[1] - current[0];
      current = [start, end];
    } else {
      current[1] = Math.max(current[1], end);
    }
  }
  if (current) total += current[1] - current[0];
  return total;
};

const summarizePhase = (spans: TimingSpan[]): PhaseSummary => {
  if (spans.length === 0) return { visited: false };
  // A span that never ended ran until the process exited or failed; it is counted up to its start only.
  const intervals = spans.map((span): [number, number] => [span.start, span.end ?? span.start]);
  return {
    visited: true,
    spans: spans.length,
    unionMs: round(unionLength(intervals)),
    sumMs: round(intervals.reduce((sum, [start, end]) => sum + end - start, 0))
  };
};

/** How far `performance.now()` may drift from the shared monotonic clock over one process before its anchors are refused. */
const RATE_TOLERANCE = 0.001;
/** How far the three measured parts may miss the harness's own wall time before they are refused. */
const CONSERVATION_TOLERANCE_MS = 1;

export type CrossProcessTimes =
  | { measured: false; problems: string[] }
  | {
      measured: true;
      /** From the spawn to the child's time origin: loading the executable before any JavaScript runs. */
      beforeOriginMs: number;
      /** From the child's exit handler to the harness seeing the exit: runtime teardown and reaping. */
      afterExitHandlerMs: number;
      /** `performance.now()` milliseconds per shared-clock millisecond in the child, between its two anchors. */
      rate: number;
      /** Before origin + the child's `exitAt` + after exit, minus the harness's own wall time. */
      conservationResidualMs: number;
    };

/**
 * Places the child's timeline in the harness's, using Linux `CLOCK_MONOTONIC` readings on both sides: the harness's
 * around the spawn and the exit, and the child's anchors, each pairing that clock with `performance.now()`. Wall-clock
 * time is never used: it can be stepped, and a small step would shift the short tails unnoticed.
 *
 * The result is refused, with every reason, unless the child's two clocks advanced at the same rate, the events are in
 * order on the shared clock (spawn, child time origin, child exit anchor, harness sees the exit), which makes both tails
 * non-negative, and the three parts add up to the harness's independently measured wall time. Nothing is clamped.
 */
export const analyzeCrossProcess = ({
  document,
  wallMs,
  spawnMonotonicNs,
  exitMonotonicNs
}: {
  document: TimingDocument;
  wallMs: number;
  spawnMonotonicNs: string | null;
  exitMonotonicNs: string | null;
}): CrossProcessTimes => {
  const init = document.clockAnchors?.init;
  const exit = document.clockAnchors?.exit;
  const problems = [
    ...(spawnMonotonicNs && exitMonotonicNs ? [] : ['the harness could not read the shared monotonic clock']),
    ...(init && exit ? [] : ['the timing document has no shared-clock anchors'])
  ];
  if (!spawnMonotonicNs || !exitMonotonicNs || !init || !exit) return { measured: false, problems };

  const toMs = (nanoseconds: bigint) => Number(nanoseconds) / 1_000_000;
  const spawn = BigInt(spawnMonotonicNs);
  const parentExit = BigInt(exitMonotonicNs);
  const childInit = BigInt(init.monotonicNs);
  const childExit = BigInt(exit.monotonicNs);
  const childPerformanceMs = exit.performanceMs - init.performanceMs;
  const rate = childPerformanceMs > 0 ? childPerformanceMs / toMs(childExit - childInit) : Number.NaN;
  if (!(Math.abs(rate - 1) <= RATE_TOLERANCE)) {
    problems.push(`performance.now() advanced ${rate} ms per shared-clock ms in the child`);
  }
  // Where the child's performance.now() was zero, on the shared clock.
  const childOrigin = childInit - BigInt(Math.round(init.performanceMs * 1_000_000));
  if (childOrigin < spawn) problems.push('the child time origin precedes the spawn on the shared clock');
  if (childExit < childInit) problems.push('the child exit anchor precedes its init anchor');
  if (parentExit < childExit) problems.push('the child exit anchor follows the harness seeing the exit');
  const beforeOriginMs = toMs(childOrigin - spawn);
  const afterExitHandlerMs = toMs(parentExit - childExit);
  const conservationResidualMs = beforeOriginMs + exit.performanceMs + afterExitHandlerMs - wallMs;
  if (!(Math.abs(conservationResidualMs) <= CONSERVATION_TOLERANCE_MS)) {
    problems.push(`before origin, child time and after exit miss the wall time by ${round(conservationResidualMs)} ms`);
  }
  if (problems.length > 0) return { measured: false, problems };
  return {
    measured: true,
    beforeOriginMs: round(beforeOriginMs),
    afterExitHandlerMs: round(afterExitHandlerMs),
    rate: Math.round(rate * 1_000_000) / 1_000_000,
    conservationResidualMs: Math.round(conservationResidualMs * 1000) / 1000
  };
};

export type TimingAnalysis = {
  wallMs: number;
  /** Null unless `crossProcess` was measured. */
  beforeOriginMs: number | null;
  toEntryMs: number | null;
  moduleLoadMs: number | null;
  readArgumentsMs: number | null;
  commandMs: number | null;
  shutdownMs: number | null;
  /** Null unless `crossProcess` was measured. */
  afterExitHandlerMs: number | null;
  crossProcess: CrossProcessTimes;
  /** From the child's time origin to its first bundling step, or null when the command never started one. */
  originToBundlingMs: number | null;
  /** From the spawn to the first bundling step, when both parts were measured. */
  spawnToBundlingMs: number | null;
  /** The packaging path chosen, from `packaging:paths`, or null when the command never chose one. */
  packagingPaths: Record<string, unknown> | null;
  /** Shared chunks the split path assigned to layers (`split:assign-layers`), or null when it did not assign any. */
  layeredChunks: number | null;
  /** The last span that ended in an error or never ended, for a command that failed. */
  failedAt: string | null;
  phases: Record<PhaseName, PhaseSummary>;
  /** Spans that were started but never ended, by name. */
  unfinishedSpans: string[];
  /** Subprocesses started through `utils/exec` only; ZIP tool probes, Git and other direct spawns are not counted. */
  instrumentedSubprocesses: number;
  /**
   * Each `dependencies:install` span: the installer's decision, package manager, whether `ci-info` detected CI, the
   * command from the CLI's own install table, and its duration.
   */
  dependencyInstalls: {
    decision: string | null;
    packageManager: string | null;
    ciDetected: boolean | null;
    command: string | null;
    ms: number | null;
  }[];
  /** Each instrumented subprocess: its executable, the caller's safe description, order, exit code and duration. */
  subprocesses: {
    executable: string;
    description: string | null;
    ordinal: number | null;
    exitCode: number | null;
    ms: number | null;
  }[];
  droppedSpans: number;
};

export const analyzeTimings = ({
  document,
  wallMs,
  spawnMonotonicNs,
  exitMonotonicNs
}: {
  document: TimingDocument;
  wallMs: number;
  /** The harness's shared-clock readings around the spawn and the exit (`BoundedProcessResult`). */
  spawnMonotonicNs: string | null;
  exitMonotonicNs: string | null;
}): TimingAnalysis => {
  const { spans } = document;
  const first = (name: string) => spans.find((span) => span.name === name);
  const duration = (span: TimingSpan | undefined) => (span && span.end !== null ? round(span.end - span.start) : null);
  const moduleLoads = spans.filter(({ name }) => name.startsWith('startup:load-'));
  const runCommand = first('cli:run-command');
  const shutdownStart = first('shutdown:start');
  const splitBuild = first('split:build');
  const bundlingStart =
    splitBuild?.start ??
    spans
      .filter(({ name }) => name === 'event:BUILD_CODE')
      .map(({ start }) => start)
      .toSorted((left, right) => left - right)[0];
  const phases = Object.fromEntries(
    PHASE_NAMES.map((phase) => {
      const matching = spans.filter(PHASES[phase]);
      // A split build also records per-function BUILD_CODE events, which cover more than bundling.
      const counted =
        phase === 'build' && splitBuild ? matching.filter(({ name }) => name === 'split:build') : matching;
      return [phase, summarizePhase(counted)];
    })
  ) as Record<PhaseName, PhaseSummary>;
  // The most specific failing step: wrappers such as the whole command or a child process fail along with it.
  const failures = spans.filter(
    (span) => (span.end === null || span.detail?.outcome === 'error') && !WRAPPER_SPANS.has(span.name)
  );
  const crossProcess = analyzeCrossProcess({ document, wallMs, spawnMonotonicNs, exitMonotonicNs });
  const originToBundlingMs = bundlingStart === undefined ? null : round(bundlingStart);
  return {
    wallMs: round(wallMs),
    beforeOriginMs: crossProcess.measured ? crossProcess.beforeOriginMs : null,
    toEntryMs: first('cli:entry') ? round(first('cli:entry')!.start) : null,
    moduleLoadMs: moduleLoads.length
      ? round(moduleLoads.reduce((sum, span) => sum + (span.end ?? span.start) - span.start, 0))
      : null,
    readArgumentsMs: duration(first('startup:read-arguments')),
    commandMs: duration(runCommand),
    shutdownMs: shutdownStart ? round(document.exitAt - shutdownStart.start) : null,
    afterExitHandlerMs: crossProcess.measured ? crossProcess.afterExitHandlerMs : null,
    crossProcess,
    originToBundlingMs,
    spawnToBundlingMs:
      crossProcess.measured && originToBundlingMs !== null
        ? round(crossProcess.beforeOriginMs + originToBundlingMs)
        : null,
    packagingPaths: (first('packaging:paths')?.detail as Record<string, unknown> | undefined) ?? null,
    layeredChunks:
      typeof first('split:assign-layers')?.detail?.layeredChunks === 'number'
        ? (first('split:assign-layers')!.detail!.layeredChunks as number)
        : null,
    failedAt: document.exitCode === 0 ? null : (failures.at(-1)?.name ?? null),
    phases,
    unfinishedSpans: spans.filter(({ end }) => end === null).map(({ name }) => name),
    instrumentedSubprocesses: document.instrumentedSubprocesses,
    dependencyInstalls: spans
      .filter(({ name }) => name === 'dependencies:install')
      .map((span) => ({
        decision: typeof span.detail?.decision === 'string' ? span.detail.decision : null,
        packageManager: typeof span.detail?.packageManager === 'string' ? span.detail.packageManager : null,
        ciDetected: typeof span.detail?.ciDetected === 'boolean' ? span.detail.ciDetected : null,
        command: typeof span.detail?.command === 'string' ? span.detail.command : null,
        ms: duration(span)
      })),
    subprocesses: spans
      .filter(({ name }) => name === 'subprocess')
      .map((span) => ({
        executable: String(span.detail?.executable ?? 'unknown'),
        description: typeof span.detail?.description === 'string' ? span.detail.description : null,
        ordinal: typeof span.detail?.ordinal === 'number' ? span.detail.ordinal : null,
        exitCode: typeof span.detail?.exitCode === 'number' ? span.detail.exitCode : null,
        ms: duration(span)
      })),
    droppedSpans: document.droppedSpans
  };
};
