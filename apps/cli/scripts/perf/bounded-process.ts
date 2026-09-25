/**
 * Runs one measured command so that it can never outlive its bounds.
 *
 * The command starts in a new process group. When `timeoutMs` passes, the whole group gets SIGTERM and, after a short
 * grace period, SIGKILL, so the command's own children (Docker, a package manager, a ZIP tool) stop with it. Whatever
 * is still in the group when the command exits is killed and counted. A process that leaves the group, for example
 * with `setsid`, is beyond this: the network sandbox's PID namespace is the boundary that ends it.
 *
 * Output is read as it arrives, up to `maxOutputBytes` per stream, and read to the end after that so a full pipe never
 * blocks the command; if a stream is still open `drainTimeoutMs` after the exit, reading stops. With `outputFiles`,
 * each kept chunk is also appended to a file as it arrives, so the output survives even if this process is killed. A
 * timed-out run returns the output and resource use it got, marked `timedOut`, rather than throwing, so the caller can
 * keep it as failure evidence.
 *
 * Every timer is cleared as soon as the race it guards is decided, whichever way and even on an error, so a finished
 * command never keeps the calling process alive until a deadline it no longer needs.
 */
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readMonotonicNs } from './monotonic-clock';

export type BoundedProcessResult = {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  /** Even SIGKILL did not end the command within its bound, so it was left running and reported. */
  abandoned: boolean;
  /** An output stream stayed open after the exit, typically held by a leftover process, and was abandoned. */
  drainTimedOut: boolean;
  /** Processes still in the command's group when it exited; they were killed. */
  leftoverProcesses: number;
  /** From spawn to exit, on this process's monotonic clock. */
  wallMs: number;
  /**
   * Linux `CLOCK_MONOTONIC`, shared by every process, read immediately before the spawn and immediately after the exit
   * was seen, as decimal nanoseconds; null where the clock cannot be read. A child's own anchors on the same clock place
   * its timeline between these two.
   */
  spawnMonotonicNs: string | null;
  exitMonotonicNs: string | null;
  /**
   * `Date.now()` just before the spawn and just after the exit, for comparing with a child's own wall-clock times such as
   * its `performance.timeOrigin`. A monotonic-derived epoch is not comparable across processes where the monotonic
   * clock runs at a different rate from the wall clock and the wall clock is stepped back into line.
   */
  spawnRealtimeMs: number;
  exitRealtimeMs: number;
  /** The wall clock was stepped during the run, so `spawnRealtimeMs` and `exitRealtimeMs` do not bracket it reliably. */
  realtimeStepped: boolean;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  /**
   * The kernel's peak resident set of the command or its largest reaped descendant. Linux carries the spawning
   * process's own peak into a child that `Bun.spawn` creates with vfork, so this is never below this process's own
   * peak (`VmHWM`) at the spawn: only a value above that is the command's own.
   */
  maxRssBytes: number | null;
  userCpuMs: number | null;
  systemCpuMs: number | null;
};

const TERMINATION_GRACE_MS = 3000;
/** How long after SIGKILL an exit is still awaited, for a process stuck in the kernel. */
const ABANDON_AFTER_KILL_MS = 10_000;

const collectStream = (stream: ReadableStream<Uint8Array>, maxBytes: number, file?: string) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  /** Set only when bytes were actually discarded, not when the output ends exactly at the limit. */
  let truncated = false;
  const done = (async () => {
    while (true) {
      const { done: finished, value } = await reader.read();
      if (finished) return;
      const kept = value.subarray(0, Math.max(0, maxBytes - bytes));
      if (kept.length > 0) {
        chunks.push(kept);
        bytes += kept.length;
        if (file) appendFileSync(file, kept);
      }
      if (kept.length < value.length) truncated = true;
    }
  })().catch(() => {});
  return {
    done,
    cancel: () => reader.cancel().catch(() => {}),
    text: () => Buffer.concat(chunks).toString('utf8'),
    get truncated() {
      return truncated;
    }
  };
};

/** Live processes whose process group is `groupId`, from `/proc`; zombies are already gone and not counted. */
export const countProcessGroupMembers = (groupId: number) => {
  let count = 0;
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
      // Fields after the command name, which is parenthesized and may itself contain spaces or parentheses.
      const [state, , group] = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      if (Number(group) === groupId && state !== 'Z') count += 1;
    } catch {
      // The process exited while the directory was being read.
    }
  }
  return count;
};

const killGroup = (groupId: number, signal: NodeJS.Signals) => {
  try {
    process.kill(-groupId, signal);
  } catch {
    // The group is already gone.
  }
};

/** A timeout that can be cancelled, so a race it loses never keeps the process alive. */
const startTimer = (ms: number) => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const elapsed = new Promise<'elapsed'>((resolveTimer) => {
    handle = setTimeout(() => resolveTimer('elapsed'), ms);
  });
  return { elapsed, cancel: () => clearTimeout(handle) };
};

export const runBoundedProcess = async ({
  cmd,
  cwd,
  env,
  timeoutMs,
  drainTimeoutMs = 5000,
  maxOutputBytes = 8 * 1024 * 1024,
  outputFiles
}: {
  cmd: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  drainTimeoutMs?: number;
  maxOutputBytes?: number;
  /** New files the kept output is appended to as it arrives. */
  outputFiles?: { stdout: string; stderr: string } | undefined;
}): Promise<BoundedProcessResult> => {
  if (outputFiles) {
    // Created before the command starts, so an existing file refuses the run instead of stranding a process.
    writeFileSync(outputFiles.stdout, '', { flag: 'wx' });
    writeFileSync(outputFiles.stderr, '', { flag: 'wx' });
  }
  const spawnRealtimeMs = Date.now();
  const startedAt = performance.now();
  const spawnMonotonicNs = readMonotonicNs?.() ?? null;
  const child = Bun.spawn({ cmd, cwd, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', detached: true });
  const stdout = collectStream(child.stdout, maxOutputBytes, outputFiles?.stdout);
  const stderr = collectStream(child.stderr, maxOutputBytes, outputFiles?.stderr);
  let timedOut = false;
  let escalation: ReturnType<typeof setTimeout> | undefined;
  const deadline = setTimeout(() => {
    timedOut = true;
    killGroup(child.pid, 'SIGTERM');
    escalation = setTimeout(() => killGroup(child.pid, 'SIGKILL'), TERMINATION_GRACE_MS);
  }, timeoutMs);
  const abandonment = startTimer(timeoutMs + TERMINATION_GRACE_MS + ABANDON_AFTER_KILL_MS);
  let exited: boolean;
  let exitMonotonicNs: bigint | null = null;
  try {
    exited = (await Promise.race([child.exited.then(() => 'exited' as const), abandonment.elapsed])) === 'exited';
    exitMonotonicNs = readMonotonicNs?.() ?? null;
  } finally {
    abandonment.cancel();
    clearTimeout(deadline);
    clearTimeout(escalation);
  }
  const exitCode = exited ? await child.exited : null;
  const exitedAt = performance.now();
  const exitRealtimeMs = Date.now();
  if (!exited) {
    // Still running after SIGKILL: report it, and let this process exit without waiting for it.
    child.unref();
  }

  const leftoverProcesses = countProcessGroupMembers(child.pid);
  if (leftoverProcesses > 0) killGroup(child.pid, 'SIGKILL');
  const drainWait = startTimer(drainTimeoutMs);
  let drained: boolean;
  try {
    drained =
      (await Promise.race([
        Promise.all([stdout.done, stderr.done]).then(() => 'drained' as const),
        drainWait.elapsed
      ])) === 'drained';
  } finally {
    drainWait.cancel();
  }
  if (!drained) {
    await Promise.all([stdout.cancel(), stderr.cancel()]);
  }

  const usage = exited ? child.resourceUsage() : undefined;
  const toMs = (microseconds: bigint | number | undefined) =>
    microseconds === undefined ? null : Math.round(Number(microseconds) / 100) / 10;
  return {
    exitCode: child.signalCode ? null : exitCode,
    signal: child.signalCode ?? null,
    timedOut,
    abandoned: !exited,
    drainTimedOut: !drained,
    leftoverProcesses,
    wallMs: Math.round((exitedAt - startedAt) * 1000) / 1000,
    spawnMonotonicNs: spawnMonotonicNs?.toString() ?? null,
    exitMonotonicNs: exitMonotonicNs?.toString() ?? null,
    spawnRealtimeMs,
    exitRealtimeMs,
    // Between steps both clocks advance together; a step makes them disagree by far more than the millisecond grain.
    realtimeStepped: Math.abs(exitRealtimeMs - spawnRealtimeMs - (exitedAt - startedAt)) > 20,
    stdout: stdout.text(),
    stderr: stderr.text(),
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    maxRssBytes: usage ? Number(usage.maxRSS) : null,
    userCpuMs: toMs(usage?.cpuTime.user),
    systemCpuMs: toMs(usage?.cpuTime.system)
  };
};
