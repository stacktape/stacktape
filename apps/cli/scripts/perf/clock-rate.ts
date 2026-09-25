/**
 * How fast this machine's monotonic clock runs compared with a reference, for reading absolute durations.
 *
 * Every duration the measurement tools report comes from the monotonic clock (`performance.now()`). On a virtual
 * machine that clock can run at a different rate from real time while a time service keeps the wall clock right by
 * stepping it. On WSL the Windows host's clock is the reference: it is read through `cmd.exe`, a local process with no
 * network access, and bracketed by two readings of ours. Elsewhere only the local wall clock is compared, which a
 * stepping time service makes a coarse check.
 */
import { existsSync } from 'node:fs';

const WINDOWS_COMMAND = '/mnt/c/Windows/System32/cmd.exe';

export type ClockReading = {
  monotonicMs: number;
  realtimeMs: number;
  /** Milliseconds since local midnight on the Windows host, or null when there is no host to read. */
  hostMs: number | null;
  /** How long reading the host clock took; the host reading is placed at its midpoint. */
  hostReadMs: number | null;
};

const readWindowsTimeOfDay = () => {
  const result = Bun.spawnSync({
    cmd: [WINDOWS_COMMAND, '/c', 'echo %TIME%'],
    stdout: 'pipe',
    stderr: 'ignore',
    timeout: 10_000
  });
  const match = result.stdout
    .toString()
    .trim()
    .match(/^\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{2})/);
  if (!match) return null;
  const [, hours, minutes, seconds, centiseconds] = match.map(Number);
  return ((hours! * 60 + minutes!) * 60 + seconds!) * 1000 + centiseconds! * 10;
};

export const readClocks = (): ClockReading => {
  if (!existsSync(WINDOWS_COMMAND)) {
    return { monotonicMs: performance.now(), realtimeMs: Date.now(), hostMs: null, hostReadMs: null };
  }
  const monotonicBefore = performance.now();
  const realtimeBefore = Date.now();
  const hostMs = readWindowsTimeOfDay();
  const monotonicAfter = performance.now();
  const realtimeAfter = Date.now();
  return {
    monotonicMs: (monotonicBefore + monotonicAfter) / 2,
    realtimeMs: (realtimeBefore + realtimeAfter) / 2,
    hostMs,
    hostReadMs: Math.round(monotonicAfter - monotonicBefore)
  };
};

export type ClockComparison = {
  elapsedMonotonicMs: number;
  elapsedRealtimeMs: number;
  elapsedHostMs: number | null;
  /** Monotonic milliseconds per host millisecond; above 1 means reported durations are longer than real. */
  monotonicPerHost: number | null;
  monotonicPerRealtime: number;
};

export const compareClocks = (start: ClockReading, end: ClockReading): ClockComparison => {
  const elapsedMonotonicMs = end.monotonicMs - start.monotonicMs;
  const elapsedRealtimeMs = end.realtimeMs - start.realtimeMs;
  const elapsedHostMs =
    start.hostMs === null || end.hostMs === null
      ? null
      : // Across local midnight the time of day starts again from zero.
        (end.hostMs - start.hostMs + 86_400_000) % 86_400_000;
  const ratio = (value: number, reference: number) => Math.round((value / reference) * 10_000) / 10_000;
  return {
    elapsedMonotonicMs: Math.round(elapsedMonotonicMs),
    elapsedRealtimeMs: Math.round(elapsedRealtimeMs),
    elapsedHostMs,
    monotonicPerHost: elapsedHostMs ? ratio(elapsedMonotonicMs, elapsedHostMs) : null,
    monotonicPerRealtime: ratio(elapsedMonotonicMs, elapsedRealtimeMs)
  };
};
