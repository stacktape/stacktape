/**
 * Posts a finished command's telemetry report after the CLI has exited, so no command waits for the network.
 *
 * The CLI hands the prepared PostHog request to a detached, unreferenced child of its own executable, started with
 * `TELEMETRY_SENDER_ARGUMENT` and the request in `TELEMETRY_REQUEST_ENV`. The child makes one attempt, bounded by
 * `SEND_TIMEOUT_MS`, and exits. It never reads the project, never reports telemetry itself and writes nothing: its
 * output streams are closed and `STP_TIMINGS_FILE` is removed from its environment.
 *
 * Imports nothing but Node built-ins, because the CLI entry loads it before anything else.
 */
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

/** The sender's only argument; the perf harness recognizes the process by it (`scripts/perf/cli-sample.ts`). */
const TELEMETRY_SENDER_ARGUMENT = '__telemetry-sender';
const TELEMETRY_REQUEST_ENV = 'STP_TELEMETRY_REQUEST';
const SEND_TIMEOUT_MS = 5000;

export type TelemetryRequest = { url: string; headers: Record<string, string>; body: string };

/** Whether this process was started as the telemetry sender. */
export const isTelemetrySender = () => process.argv[2] === TELEMETRY_SENDER_ARGUMENT;

/**
 * Only a compiled executable can start itself as the sender. Run from source, the runtime's entry script may be the
 * development wrapper, which rebuilds the CLI, so reports are sent in-process there.
 */
export const canHandOffTelemetry = () => !/[\\/]bun(\.exe)?$/i.test(process.execPath);

/** Starts the sender for one request and returns without waiting for it. A sender that cannot start loses the report. */
export const handOffTelemetryRequest = (request: TelemetryRequest) => {
  const { STP_TIMINGS_FILE: _timingsFile, ...env } = process.env;
  const child = spawn(process.execPath, [TELEMETRY_SENDER_ARGUMENT], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    // Not the project directory: a running process would keep it from being deleted on Windows.
    cwd: tmpdir(),
    env: { ...env, [TELEMETRY_REQUEST_ENV]: JSON.stringify(request) }
  });
  child.on('error', () => {});
  child.unref();
};

/** The sender's whole work: one POST of the request it was handed; nobody waits for the answer. */
export const sendHandedOffTelemetryRequest = async () => {
  try {
    const { url, headers, body } = JSON.parse(process.env[TELEMETRY_REQUEST_ENV] ?? '') as TelemetryRequest;
    if (!/^https?:\/\//.test(url) || typeof body !== 'string') return;
    await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
  } catch {
    // A report the sender cannot deliver is dropped.
  }
};
