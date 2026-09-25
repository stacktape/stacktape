import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Opt-in phase timings for performance measurement.
 *
 * With `STP_TIMINGS_FILE` set to a path that does not exist yet, the CLI writes one JSON document there as the process
 * exits: when each recorded phase started and ended, in `performance.now()` milliseconds since the process's time
 * origin, with a few details such as an exit code, a count or the packaging path chosen. The variable is removed from
 * the environment when this module loads, so no child process, including a nested Stacktape invocation, writes to the
 * same file.
 *
 * Nothing goes to stdout or stderr, so machine-readable output is unchanged. Details are numbers, booleans and short
 * identifiers chosen at each call site: never request or response bodies, credentials, command arguments or URLs. At
 * most `MAX_SPANS` phases are kept; later ones are only counted.
 *
 * The document also carries two clock anchors, one when this module loads and one at exit. Each pairs Linux's
 * `CLOCK_MONOTONIC`, which every process on the machine shares, with `performance.now()`, so a measuring parent that
 * reads the same clock around the spawn and the exit can place this process's timeline in its own. Bun's
 * `process.hrtime` counts from the process's own start, so the clock is read through libc instead. Where that is not
 * possible the anchors are null, and nothing is inferred from wall-clock time.
 *
 * Without the variable every function returns at once and nothing is recorded or written.
 */

export type TimingDetail = Record<string, string | number | boolean | null | undefined>;

type Span = { name: string; start: number; end: number | null; detail?: TimingDetail };

const MAX_SPANS = 5000;
const MAX_TEXT_LENGTH = 120;

const outputPath = (() => {
  const value = process.env.STP_TIMINGS_FILE;
  delete process.env.STP_TIMINGS_FILE;
  return value ? resolve(value) : undefined;
})();

const spans: Span[] = [];
let droppedSpans = 0;
let subprocessCount = 0;

const round = (milliseconds: number) => Math.round(milliseconds * 1000) / 1000;

type ClockAnchor = { monotonicNs: string; performanceMs: number };

/** Linux `CLOCK_MONOTONIC` in nanoseconds through libc, or null where it cannot be read. Loaded only for timing. */
const createMonotonicReader = (): (() => bigint) | null => {
  try {
    const { dlopen, ptr } = require('bun:ffi') as typeof import('bun:ffi');
    const libc = dlopen('libc.so.6', { clock_gettime: { args: ['i32', 'ptr'], returns: 'i32' } });
    const buffer = new BigInt64Array(2);
    const pointer = ptr(buffer);
    const CLOCK_MONOTONIC = 1;
    const NANOSECONDS_PER_SECOND = BigInt(1_000_000_000);
    return () => {
      if (libc.symbols.clock_gettime(CLOCK_MONOTONIC, pointer) !== 0) throw new Error('clock_gettime failed');
      return buffer[0]! * NANOSECONDS_PER_SECOND + buffer[1]!;
    };
  } catch {
    return null;
  }
};

const readMonotonic = outputPath ? createMonotonicReader() : null;

/** The shared monotonic clock and `performance.now()`, read back to back. */
const readClockAnchor = (): ClockAnchor | null => {
  if (!readMonotonic) return null;
  try {
    const monotonicNs = readMonotonic();
    return { monotonicNs: monotonicNs.toString(), performanceMs: round(performance.now()) };
  } catch {
    return null;
  }
};

const initAnchor = outputPath ? readClockAnchor() : null;

const cleanDetail = (detail: TimingDetail): TimingDetail =>
  Object.fromEntries(
    Object.entries(detail)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, MAX_TEXT_LENGTH) : value])
  );

const noop = () => {};

export const isTimingEnabled = () => outputPath !== undefined;

/** Starts a phase and returns the function that ends it. Details given when it ends are added to the start's. */
export const startTiming = (name: string, detail?: TimingDetail): ((endDetail?: TimingDetail) => void) => {
  if (!outputPath) return noop;
  if (spans.length >= MAX_SPANS) {
    droppedSpans += 1;
    return noop;
  }
  const span: Span = {
    name,
    start: round(performance.now()),
    end: null,
    ...(detail && { detail: cleanDetail(detail) })
  };
  spans.push(span);
  return (endDetail) => {
    if (span.end !== null) return;
    span.end = round(performance.now());
    if (endDetail) span.detail = cleanDetail({ ...span.detail, ...endDetail });
  };
};

/**
 * Records `run` as one phase that ends when its promise settles, with `outcome` `ok` or `error`. Without the variable
 * it returns `run()` itself, so the caller awaits exactly what it awaited before.
 */
export const timeAsync = <T>(name: string, run: () => Promise<T>, detail?: TimingDetail): Promise<T> => {
  if (!outputPath) return run();
  const end = startTiming(name, detail);
  let pending: Promise<T>;
  try {
    pending = run();
  } catch (error) {
    end({ outcome: 'error' });
    throw error;
  }
  return pending.then(
    (value) => {
      end({ outcome: 'ok' });
      return value;
    },
    (error) => {
      end({ outcome: 'error' });
      throw error;
    }
  );
};

/** A moment rather than a phase, such as reaching the entrypoint or choosing a packaging path. */
export const markTiming = (name: string, detail?: TimingDetail) => startTiming(name, detail)();

/**
 * Numbers the child processes started through `utils/exec`, so a report can see their order. Other spawns, such as the
 * ZIP tool probes or Git, are not counted: an ordinal is a position among instrumented subprocesses only.
 */
export const nextSubprocessOrdinal = () => {
  if (!outputPath) return 0;
  subprocessCount += 1;
  return subprocessCount;
};

const writeTimings = (exitCode: number) => {
  try {
    const exitAnchor = readClockAnchor();
    const document = {
      schema: 3,
      kind: 'stacktape-cli-timings',
      clock: 'performance.now() milliseconds since performance.timeOrigin',
      // Wall-clock metadata only: the monotonic anchors are what relate this timeline to another process's.
      timeOrigin: performance.timeOrigin,
      clockAnchors: { init: initAnchor, exit: exitAnchor },
      pid: process.pid,
      exitCode,
      exitAt: exitAnchor?.performanceMs ?? round(performance.now()),
      instrumentedSubprocesses: subprocessCount,
      droppedSpans,
      spans
    };
    // Never replaces an existing file: a mistyped path must not destroy anything.
    writeFileSync(outputPath!, `${JSON.stringify(document)}\n`, { flag: 'wx' });
  } catch {
    // Measurement must never change how the CLI exits.
  }
};

if (outputPath) {
  process.once('exit', writeTimings);
}
