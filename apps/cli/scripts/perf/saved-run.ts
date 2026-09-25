/**
 * Reads what a CLI harness run saved (`harness-config.json`, `outer.json`, `inner-report.json`, `report.json`), each
 * parsed as `unknown`, and narrows the fields a report is rendered from. Anything missing or of another type stops the
 * reading with the file and field named, so nothing is rendered from a malformed run.
 *
 * Only the fields the renderer uses are read. Artifact results are not accepted. They come from the contract code of
 * the run that produced them, and that run's own `report.md` renders them. So a run that saved them is refused rather
 * than having them passed through unchecked.
 */
import type { CliSample } from './cli-sample';
import type { CrossProcessTimes, PhaseName, PhaseSummary, TimingAnalysis } from './cli-timing-analysis';
import type { ClockComparison } from './clock-rate';
import type { HostDockerLatency, ReportInstall, ReportSettingsConfig, SampleRecord, Suite } from './cli-report';
import type { HostEnvironment, SourceIdentity } from './measurement-context';
import { PHASE_NAMES } from './cli-timing-analysis';

type Reader<T> = (value: unknown, where: string) => T;
type Fields = Record<string, unknown>;

const invalid = (where: string, expected: string): never => {
  throw new Error(`The saved run's ${where} is not ${expected}; nothing is rendered.`);
};

const object = (value: unknown, where: string): Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Fields)
    : invalid(where, 'an object');
const string: Reader<string> = (value, where) => (typeof value === 'string' ? value : invalid(where, 'a string'));
const number: Reader<number> = (value, where) =>
  typeof value === 'number' && Number.isFinite(value) ? value : invalid(where, 'a number');
const boolean: Reader<boolean> = (value, where) =>
  typeof value === 'boolean' ? value : invalid(where, 'true or false');
const nullable =
  <T>(read: Reader<T>): Reader<T | null> =>
  (value, where) =>
    value === null ? null : read(value, where);
const optional =
  <T>(read: Reader<T>): Reader<T | undefined> =>
  (value, where) =>
    value === undefined ? undefined : read(value, where);
const arrayOf =
  <T>(read: Reader<T>): Reader<T[]> =>
  (value, where) =>
    Array.isArray(value) ? value.map((item, index) => read(item, `${where}[${index}]`)) : invalid(where, 'an array');
const recordOf =
  <T>(read: Reader<T>): Reader<Record<string, T>> =>
  (value, where) =>
    Object.fromEntries(Object.entries(object(value, where)).map(([key, item]) => [key, read(item, `${where}.${key}`)]));
const oneOf =
  <T extends string>(...allowed: T[]): Reader<T> =>
  (value, where) =>
    typeof value === 'string' && (allowed as string[]).includes(value)
      ? (value as T)
      : invalid(where, `one of ${allowed.join(', ')}`);
/** Reads one field of an object; `where` names the object in errors. */
const field = <T>(fields: Fields, key: string, read: Reader<T>, where: string) => read(fields[key], `${where}.${key}`);

const readSourceIdentity: Reader<SourceIdentity> = (value, where) => {
  const source = object(value, where);
  return {
    available: field(source, 'available', boolean, where),
    reason: field(source, 'reason', nullable(string), where),
    revision: field(source, 'revision', nullable(string), where),
    changesSha256: field(source, 'changesSha256', nullable(string), where),
    changedPaths: field(source, 'changedPaths', arrayOf(string), where),
    scopes: field(source, 'scopes', arrayOf(string), where),
    excluded: field(source, 'excluded', arrayOf(string), where)
  };
};

const readInstall: Reader<ReportInstall> = (value, where) => {
  const install = object(value, where);
  const builtFrom = object(install.builtFrom, `${where}.builtFrom`);
  return {
    name: field(install, 'name', string, where),
    sha256: field(install, 'sha256', string, where),
    bytes: field(install, 'bytes', number, where),
    compileTarget: field(install, 'compileTarget', string, where),
    version: field(install, 'version', string, where),
    builtFrom: {
      before: field(builtFrom, 'before', readSourceIdentity, `${where}.builtFrom`),
      after: field(builtFrom, 'after', readSourceIdentity, `${where}.builtFrom`),
      check: field(builtFrom, 'check', string, `${where}.builtFrom`)
    },
    installBytes: field(install, 'installBytes', number, where),
    helperLambdas: field(
      install,
      'helperLambdas',
      arrayOf((helper, at) => {
        const fields = object(helper, at);
        return {
          path: field(fields, 'path', string, at),
          bytes: field(fields, 'bytes', number, at),
          sha256: field(fields, 'sha256', string, at)
        };
      }),
      where
    )
  };
};

export type SavedConfig = ReportSettingsConfig & { installs: ReportInstall[] };

export const readConfig = (value: unknown): SavedConfig => {
  const where = 'harness-config.json';
  const config = object(value, where);
  return {
    installs: field(config, 'installs', arrayOf(readInstall), where),
    suites: field(config, 'suites', arrayOf(oneOf<Suite>('startup', 'active-startup', 'package')), where),
    startupSamples: field(config, 'startupSamples', number, where),
    activeStartupSamples: field(config, 'activeStartupSamples', number, where),
    packageSamples: field(config, 'packageSamples', number, where),
    functions: field(config, 'functions', arrayOf(number), where),
    packageInstall: field(config, 'packageInstall', nullable(string), where),
    timeoutMs: field(config, 'timeoutMs', number, where),
    inspectArtifacts: field(config, 'inspectArtifacts', optional(boolean), where)
  };
};

const readClock: Reader<ClockComparison> = (value, where) => {
  const clock = object(value, where);
  return {
    elapsedMonotonicMs: field(clock, 'elapsedMonotonicMs', number, where),
    elapsedRealtimeMs: field(clock, 'elapsedRealtimeMs', number, where),
    elapsedHostMs: field(clock, 'elapsedHostMs', nullable(number), where),
    monotonicPerHost: field(clock, 'monotonicPerHost', nullable(number), where),
    monotonicPerRealtime: field(clock, 'monotonicPerRealtime', number, where)
  };
};

const readHost: Reader<HostEnvironment> = (value, where) => {
  const host = object(value, where);
  return {
    bun: field(host, 'bun', string, where),
    platform: field(host, 'platform', string, where),
    arch: field(host, 'arch', string, where),
    osRelease: field(host, 'osRelease', string, where),
    cpuModel: field(host, 'cpuModel', string, where),
    logicalCpus: field(host, 'logicalCpus', number, where),
    totalMemoryBytes: field(host, 'totalMemoryBytes', number, where)
  };
};

export type SavedOuter = {
  passed: boolean;
  checks: { check: string; passed: boolean; detail: string }[];
  clock: ClockComparison;
  safetyCheckDirectory: string | null;
  hostDockerLatency: HostDockerLatency | null;
  host: HostEnvironment | null;
  buildSourceBefore: SourceIdentity | null;
  buildSourceAfter: SourceIdentity | null;
  loadBefore: number | null;
  loadAfter: number | null;
};

export const readOuter = (value: unknown): SavedOuter => {
  const where = 'outer.json';
  const outer = object(value, where);
  const safetyCheck = outer.safetyCheck === undefined ? null : object(outer.safetyCheck, `${where}.safetyCheck`);
  return {
    passed: field(outer, 'passed', boolean, where),
    checks: field(
      outer,
      'checks',
      arrayOf((check, at) => {
        const fields = object(check, at);
        return {
          check: field(fields, 'check', string, at),
          passed: field(fields, 'passed', boolean, at),
          detail: field(fields, 'detail', string, at)
        };
      }),
      where
    ),
    clock: field(outer, 'clock', readClock, where),
    safetyCheckDirectory: safetyCheck ? field(safetyCheck, 'directory', string, `${where}.safetyCheck`) : null,
    hostDockerLatency:
      field(
        outer,
        'hostDockerLatency',
        optional(
          recordOf(
            arrayOf((run, at) => {
              const fields = object(run, at);
              return {
                round: field(fields, 'round', number, at),
                wallMs: field(fields, 'wallMs', number, at),
                exitCode: field(fields, 'exitCode', nullable(number), at)
              };
            })
          )
        ),
        where
      ) ?? null,
    host: field(outer, 'host', optional(readHost), where) ?? null,
    buildSourceBefore: field(outer, 'buildSourceBefore', optional(readSourceIdentity), where) ?? null,
    buildSourceAfter: field(outer, 'buildSourceAfter', optional(readSourceIdentity), where) ?? null,
    loadBefore: field(outer, 'loadBefore', optional(number), where) ?? null,
    loadAfter: field(outer, 'loadAfter', optional(number), where) ?? null
  };
};

/** The tool versions the harness read inside the sandbox, or null for a run that predates them. */
export const readToolVersions = (value: unknown): Record<string, string> | null => {
  const where = 'inner-report.json';
  const inner = object(value, where);
  if (inner.toolVersions === undefined || inner.toolVersions === null) return null;
  return field(
    object(inner.toolVersions, `${where}.toolVersions`),
    'versions',
    recordOf(string),
    `${where}.toolVersions`
  );
};

const readPhase: Reader<PhaseSummary> = (value, where) => {
  const phase = object(value, where);
  return field(phase, 'visited', boolean, where)
    ? {
        visited: true,
        spans: field(phase, 'spans', number, where),
        unionMs: field(phase, 'unionMs', number, where),
        sumMs: field(phase, 'sumMs', number, where)
      }
    : { visited: false };
};

const readCrossProcess: Reader<CrossProcessTimes> = (value, where) => {
  const times = object(value, where);
  return field(times, 'measured', boolean, where)
    ? {
        measured: true,
        beforeOriginMs: field(times, 'beforeOriginMs', number, where),
        afterExitHandlerMs: field(times, 'afterExitHandlerMs', number, where),
        rate: field(times, 'rate', number, where),
        conservationResidualMs: field(times, 'conservationResidualMs', number, where)
      }
    : { measured: false, problems: field(times, 'problems', arrayOf(string), where) };
};

const readAnalysis: Reader<TimingAnalysis> = (value, where) => {
  const analysis = object(value, where);
  const milliseconds = (key: string) => field(analysis, key, nullable(number), where);
  const phases = object(analysis.phases, `${where}.phases`);
  return {
    wallMs: field(analysis, 'wallMs', number, where),
    beforeOriginMs: milliseconds('beforeOriginMs'),
    toEntryMs: milliseconds('toEntryMs'),
    moduleLoadMs: milliseconds('moduleLoadMs'),
    readArgumentsMs: milliseconds('readArgumentsMs'),
    commandMs: milliseconds('commandMs'),
    shutdownMs: milliseconds('shutdownMs'),
    afterExitHandlerMs: milliseconds('afterExitHandlerMs'),
    crossProcess: field(analysis, 'crossProcess', readCrossProcess, where),
    originToBundlingMs: milliseconds('originToBundlingMs'),
    spawnToBundlingMs: milliseconds('spawnToBundlingMs'),
    packagingPaths: field(analysis, 'packagingPaths', nullable(object), where),
    // Absent before Run16; the report does not use it.
    layeredChunks: field(analysis, 'layeredChunks', optional(nullable(number)), where) ?? null,
    failedAt: field(analysis, 'failedAt', nullable(string), where),
    phases: Object.fromEntries(
      PHASE_NAMES.map((phase) => [phase, field(phases, phase, readPhase, `${where}.phases`)])
    ) as Record<PhaseName, PhaseSummary>,
    unfinishedSpans: field(analysis, 'unfinishedSpans', arrayOf(string), where),
    instrumentedSubprocesses: field(analysis, 'instrumentedSubprocesses', number, where),
    // Absent before Run17; the report does not use it.
    dependencyInstalls:
      field(
        analysis,
        'dependencyInstalls',
        optional(
          arrayOf((install, at) => {
            const fields = object(install, at);
            return {
              decision: field(fields, 'decision', nullable(string), at),
              packageManager: field(fields, 'packageManager', nullable(string), at),
              ciDetected: field(fields, 'ciDetected', nullable(boolean), at),
              command: field(fields, 'command', nullable(string), at),
              ms: field(fields, 'ms', nullable(number), at)
            };
          })
        ),
        where
      ) ?? [],
    subprocesses: field(
      analysis,
      'subprocesses',
      arrayOf((subprocess, at) => {
        const fields = object(subprocess, at);
        return {
          executable: field(fields, 'executable', string, at),
          description: field(fields, 'description', nullable(string), at),
          ordinal: field(fields, 'ordinal', nullable(number), at),
          exitCode: field(fields, 'exitCode', nullable(number), at),
          ms: field(fields, 'ms', nullable(number), at)
        };
      }),
      where
    ),
    droppedSpans: field(analysis, 'droppedSpans', number, where)
  };
};

const readClockAnchor = nullable((value, where) => {
  const anchor = object(value, where);
  return {
    monotonicNs: field(anchor, 'monotonicNs', string, where),
    performanceMs: field(anchor, 'performanceMs', number, where)
  };
});

const readFixtureRequest: Reader<CliSample['fixtureRequests'][number]> = (value, where) => {
  const request = object(value, where);
  const note = field(request, 'note', optional(string), where);
  return {
    kind: field(
      request,
      'kind',
      oneOf('aws', 'telemetry', 'tunnel', 'proxy-http', 'proxy-incomplete', 'unknown'),
      where
    ),
    target: field(request, 'target', string, where),
    status: field(request, 'status', number, where),
    allowed: field(request, 'allowed', boolean, where),
    bytesIn: field(request, 'bytesIn', number, where),
    bytesOut: field(request, 'bytesOut', number, where),
    startMs: field(request, 'startMs', number, where),
    endMs: field(request, 'endMs', number, where),
    ...(note !== undefined && { note })
  };
};

const readSample: Reader<SampleRecord> = (value, where) => {
  const sample = object(value, where);
  const clock = object(sample.clock, `${where}.clock`);
  const anchors = field(
    clock,
    'childAnchors',
    nullable((anchorsValue, at) => {
      const fields = object(anchorsValue, at);
      return { init: field(fields, 'init', readClockAnchor, at), exit: field(fields, 'exit', readClockAnchor, at) };
    }),
    `${where}.clock`
  );
  return {
    id: field(sample, 'id', string, where),
    suite: field(sample, 'suite', oneOf<Suite>('startup', 'active-startup', 'package'), where),
    scenario: field(sample, 'scenario', string, where),
    install: field(sample, 'install', string, where),
    round: field(sample, 'round', number, where),
    warmUp: field(sample, 'warmUp', boolean, where),
    timings: field(sample, 'timings', boolean, where),
    exitCode: field(sample, 'exitCode', nullable(number), where),
    signal: field(sample, 'signal', nullable(string), where),
    wallMs: field(sample, 'wallMs', number, where),
    maxRssBytes: field(sample, 'maxRssBytes', nullable(number), where),
    harnessPeakRssBytes: field(sample, 'harnessPeakRssBytes', optional(nullable(number)), where),
    userCpuMs: field(sample, 'userCpuMs', nullable(number), where),
    systemCpuMs: field(sample, 'systemCpuMs', nullable(number), where),
    invalidReasons: field(sample, 'invalidReasons', arrayOf(string), where),
    loadBefore: field(sample, 'loadBefore', number, where),
    loadAfter: field(sample, 'loadAfter', number, where),
    homeState: field(sample, 'homeState', optional(nullable(string)), where),
    harnessSource: field(sample, 'harnessSource', string, where),
    analysis: field(sample, 'analysis', nullable(readAnalysis), where),
    clock: {
      spawnMonotonicNs: field(clock, 'spawnMonotonicNs', nullable(string), `${where}.clock`),
      exitMonotonicNs: field(clock, 'exitMonotonicNs', nullable(string), `${where}.clock`),
      childAnchors: anchors
    },
    dockerOperations: field(
      sample,
      'dockerOperations',
      nullable(
        arrayOf((operation, at) => {
          const fields = object(operation, at);
          return {
            decision: field(fields, 'decision', oneOf('simulated', 'denied'), at),
            operation: field(fields, 'operation', string, at),
            reason: field(fields, 'reason', string, at),
            exitCode: field(fields, 'exitCode', number, at),
            privileged: field(fields, 'privileged', boolean, at),
            binfmt: field(fields, 'binfmt', boolean, at)
          };
        })
      ),
      where
    ),
    fixtureRequests: field(sample, 'fixtureRequests', arrayOf(readFixtureRequest), where),
    staleFixtureRequests: field(sample, 'staleFixtureRequests', arrayOf(readFixtureRequest), where),
    dnsQueries: field(
      sample,
      'dnsQueries',
      nullable(
        arrayOf((query, at) => {
          const fields = object(query, at);
          return {
            name: field(fields, 'name', string, at),
            type: field(fields, 'type', number, at),
            atMs: field(fields, 'atMs', number, at)
          };
        })
      ),
      where
    ),
    escapedProcesses: field(
      sample,
      'escapedProcesses',
      arrayOf((escaped, at) => {
        const fields = object(escaped, at);
        return { pid: field(fields, 'pid', number, at), command: field(fields, 'command', string, at) };
      }),
      where
    )
  };
};

export type SavedReport = {
  samples: SampleRecord[];
  /** What the run computed, kept unread: the caller compares its own recomputation with it. */
  savedSummaries: unknown;
  savedPaired: unknown;
};

export const readReport = (value: unknown): SavedReport => {
  const where = 'report.json';
  const report = object(value, where);
  if (report.artifacts !== undefined) {
    throw new Error(
      "The saved run has artifact results; their run's own report.md renders them, and nothing is rendered again here."
    );
  }
  if (report.summaries === undefined) invalid(`${where}.summaries`, 'present');
  if (report.paired === undefined) invalid(`${where}.paired`, 'present');
  return {
    samples: field(report, 'samples', arrayOf(readSample), where),
    savedSummaries: report.summaries,
    savedPaired: report.paired
  };
};
