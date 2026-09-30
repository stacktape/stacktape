/**
 * One measured CLI process and the evidence that belongs to it.
 *
 * The process runs bounded (`runBoundedProcess`), with `STP_TIMINGS_FILE` set to a path that must not exist yet when
 * timings are requested. A sample is invalid, with every reason listed, when the process timed out, could not be ended,
 * left an output stream or a process behind, or, with timings requested, did not write a readable timing document
 * whose exit code matches the process's. Requests the fixture saw, Docker commands the guard saw and names the DNS
 * recorder saw between the start and the end are attached; anything they saw before the start is attached separately
 * as stale, never counted for this sample.
 *
 * The CLI hands its completion report to a detached child of its own executable, started with
 * `TELEMETRY_SENDER_ARGUMENT`, which posts it after the CLI has exited. The end of a sample is therefore the end of
 * that sender: while the only processes left are senders, they are waited for, up to `telemetrySenderWaitMs`, and their
 * report is part of the sample. A sender still running then, or any other process left, is an escape.
 */
import type { BoundedProcessResult } from './bounded-process';
import type { DockerGuard, DockerGuardRecord } from './docker-guard';
import type { ExternalServiceFixture, FixtureRequest } from './external-service-fixture';
import type { DnsQuery } from './network-sandbox';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { runBoundedProcess } from './bounded-process';
import { readMonotonicNs } from './monotonic-clock';

/** The argument of the CLI's telemetry sender process (`src/utils/telemetry-sender.ts` in the CLI). */
export const TELEMETRY_SENDER_ARGUMENT = '__telemetry-sender';
/** Twice the sender's own bound on its one request (`SEND_TIMEOUT_MS`), so only a sender that hangs is an escape. */
const DEFAULT_TELEMETRY_SENDER_WAIT_MS = 10_000;

export type TimingSpan = {
  name: string;
  start: number;
  end: number | null;
  detail?: Record<string, string | number | boolean | null>;
};

/** A reading of Linux `CLOCK_MONOTONIC` (decimal nanoseconds) and `performance.now()`, taken back to back. */
export type ClockAnchor = { monotonicNs: string; performanceMs: number };

export type TimingDocument = {
  schema: number;
  kind: string;
  /** Wall-clock metadata; never used to relate two processes. */
  timeOrigin: number;
  /** Absent before schema 3; each anchor is null where the shared clock could not be read. */
  clockAnchors?: { init: ClockAnchor | null; exit: ClockAnchor | null };
  pid: number;
  exitCode: number;
  exitAt: number;
  /** Subprocesses started through `utils/exec`; other spawns are not counted. */
  instrumentedSubprocesses: number;
  droppedSpans: number;
  spans: TimingSpan[];
};

export const readTimingDocument = async (
  path: string
): Promise<{ document: TimingDocument | null; error: string | null }> => {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch {
    return { document: null, error: 'missing' };
  }
  try {
    const document = JSON.parse(content) as TimingDocument;
    if (document.kind !== 'stacktape-cli-timings' || !Array.isArray(document.spans)) {
      return { document: null, error: 'not a Stacktape timing document' };
    }
    return { document, error: null };
  } catch (error) {
    return { document: null, error: `unreadable: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export type CliSample = {
  process: BoundedProcessResult;
  timings: TimingDocument | null;
  /** Why the sample cannot be used as a measurement; empty when it can. */
  invalidReasons: string[];
  fixtureRequests: FixtureRequest[];
  staleFixtureRequests: FixtureRequest[];
  dockerOperations: DockerGuardRecord[] | null;
  dnsQueries: DnsQuery[] | null;
  staleDnsQueries: DnsQuery[] | null;
  /** Processes the command left running outside its process group, found by `findEscapedProcesses`; they were killed. */
  escapedProcesses: { pid: number; command: string }[];
  /** How long telemetry senders were waited for after the exit; null when none was left. */
  telemetrySenderWaitMs: number | null;
  /** The exit on the fixture's clock, where its requests' `startMs` and `endMs` are; null without a fixture or clock. */
  exitFixtureMs: number | null;
};

type ProcessListing = { pid: number; command: string }[];

/** A listing can outlive its process; Linux also keeps exited processes as zombies until they are reaped. */
const processStatus = (pid: number): 'sender' | 'other' | 'ended' => {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const state = stat.slice(stat.lastIndexOf(')') + 2)[0];
    if (state === 'Z' || state === 'X') return 'ended';
    const args = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
    if (args.includes(TELEMETRY_SENDER_ARGUMENT)) return 'sender';
    // It may have exited between the stat and cmdline reads.
    if (args.every((argument) => !argument)) {
      const latest = readFileSync(`/proc/${pid}/stat`, 'utf8');
      if (['Z', 'X'].includes(latest.slice(latest.lastIndexOf(')') + 2)[0]!)) return 'ended';
    }
    return 'other';
  } catch {
    return existsSync(`/proc/${pid}`) ? 'other' : 'ended';
  }
};

/** What is left once every telemetry sender has ended or `waitMs` has passed; any other process ends the wait at once. */
const waitForTelemetrySenders = async (find: () => ProcessListing, waitMs: number) => {
  const startedAt = performance.now();
  const findLive = () =>
    find()
      .map((process) => ({ process, status: processStatus(process.pid) }))
      .filter(({ status }) => status !== 'ended');
  let found = findLive();
  let sawSender = false;
  while (found.length > 0 && found.every(({ status }) => status === 'sender')) {
    sawSender = true;
    if (performance.now() - startedAt >= waitMs) break;
    await Bun.sleep(10);
    found = findLive();
  }
  return {
    escaped: found.map(({ process }) => process),
    waitedMs: sawSender ? Math.round(performance.now() - startedAt) : null
  };
};

/** The fixture's clock now, less the time since the exit was seen on the shared monotonic clock. */
const exitOnFixtureClock = (fixture: ExternalServiceFixture, processResult: BoundedProcessResult) => {
  const nowNs = readMonotonicNs?.();
  if (nowNs === undefined || processResult.exitMonotonicNs === null) return null;
  const sinceExitMs = Number(nowNs - BigInt(processResult.exitMonotonicNs)) / 1e6;
  return Math.round((fixture.elapsedMs() - sinceExitMs) * 1000) / 1000;
};

export const runCliSample = async ({
  cmd,
  cwd,
  env,
  timeoutMs,
  timingsFile,
  fixture,
  dockerGuard,
  dnsRecorder,
  outputFiles,
  findEscapedProcesses,
  telemetrySenderWaitMs = DEFAULT_TELEMETRY_SENDER_WAIT_MS
}: {
  cmd: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  /**
   * Where the CLI must write its timing document; the sample is invalid without it. Omitted for an inactive or
   * uninstrumented run, which then gets no `STP_TIMINGS_FILE` at all.
   */
  timingsFile?: string | undefined;
  fixture?: ExternalServiceFixture | undefined;
  dockerGuard?: DockerGuard | undefined;
  dnsRecorder?: { takeQueries: () => DnsQuery[] } | undefined;
  /** New files the output is appended to as it arrives, so it survives if the measuring process is killed. */
  outputFiles?: { stdout: string; stderr: string } | undefined;
  /**
   * Lists processes that should not exist once the command has ended, such as every other process in the network
   * sandbox's PID namespace. Anything found is killed and makes the sample invalid.
   */
  findEscapedProcesses?: (() => ProcessListing) | undefined;
  /** How long a telemetry sender may outlive the command; only the tests shorten it. */
  telemetrySenderWaitMs?: number | undefined;
}): Promise<CliSample> => {
  if (timingsFile && existsSync(timingsFile)) {
    throw new Error(`The timing file ${timingsFile} already exists; every sample needs a new path.`);
  }
  if (env.STP_TIMINGS_FILE) {
    throw new Error('Pass the timing file as `timingsFile`, not in the environment.');
  }
  const staleFixtureRequests = fixture?.takeRequests() ?? [];
  const staleDnsQueries = dnsRecorder?.takeQueries() ?? null;
  const guardRecordsBefore = dockerGuard ? (await dockerGuard.readLog()).length : 0;

  const processResult = await runBoundedProcess({
    cmd,
    cwd,
    env: timingsFile ? { ...env, STP_TIMINGS_FILE: timingsFile } : env,
    timeoutMs,
    outputFiles
  });
  const exitFixtureMs = fixture ? exitOnFixtureClock(fixture, processResult) : null;
  const { escaped: escapedProcesses, waitedMs } = findEscapedProcesses
    ? await waitForTelemetrySenders(findEscapedProcesses, telemetrySenderWaitMs)
    : { escaped: [], waitedMs: null };
  for (const { pid } of escapedProcesses) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone.
    }
  }

  const { document, error } = timingsFile ? await readTimingDocument(timingsFile) : { document: null, error: null };
  const invalidReasons: string[] = [];
  if (processResult.timedOut) invalidReasons.push(`timed out after ${timeoutMs} ms`);
  if (processResult.abandoned) invalidReasons.push('still running after SIGKILL');
  if (processResult.drainTimedOut) invalidReasons.push('an output stream stayed open after the exit');
  if (processResult.leftoverProcesses > 0) {
    invalidReasons.push(`${processResult.leftoverProcesses} process(es) left in the process group`);
  }
  if (escapedProcesses.length > 0) {
    invalidReasons.push(`${escapedProcesses.length} process(es) left running outside the process group`);
  }
  if (timingsFile && !document) {
    invalidReasons.push(`timing file ${error}`);
  } else if (document && document.exitCode !== processResult.exitCode) {
    invalidReasons.push(
      `timing file exit code ${document.exitCode} differs from the process's ${processResult.exitCode}`
    );
  }

  return {
    process: processResult,
    timings: document,
    invalidReasons,
    fixtureRequests: fixture?.takeRequests() ?? [],
    staleFixtureRequests,
    dockerOperations: dockerGuard ? (await dockerGuard.readLog()).slice(guardRecordsBefore) : null,
    dnsQueries: dnsRecorder?.takeQueries() ?? null,
    staleDnsQueries,
    escapedProcesses,
    telemetrySenderWaitMs: waitedMs,
    exitFixtureMs
  };
};

/** Spans with a given name, for the checks and reports that read a sample. */
export const findSpans = (sample: CliSample, name: string) =>
  sample.timings?.spans.filter((span) => span.name === name) ?? [];
