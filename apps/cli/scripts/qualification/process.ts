import { spawn } from 'node:child_process';

type Environment = Record<string, string | undefined>;

export type ProcessResult = {
  command: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  timedOut: boolean;
  interruptedSignal?: NodeJS.Signals;
  forceTerminationRequested: boolean;
};

const maximumCapturedCharacters = 32 * 1024 * 1024;

const appendBounded = (existing: string, chunk: string) => {
  const combined = existing + chunk;
  return combined.length <= maximumCapturedCharacters
    ? { value: combined, truncated: false }
    : { value: combined.slice(-maximumCapturedCharacters), truncated: true };
};

const packageManagerShims = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bunx']);

const commandForPlatform = (command: string, args: string[]) =>
  process.platform === 'win32' && packageManagerShims.has(command.toLowerCase())
    ? { executable: 'cmd.exe', args: ['/d', '/s', '/c', command, ...args] }
    : { executable: command, args };

const terminateProcessTree = async (child: ReturnType<typeof spawn>, force: boolean) => {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', ...(force ? ['/f'] : [])], {
      windowsHide: true,
      stdio: 'ignore'
    });
    await new Promise<void>((resolve) => killer.once('close', () => resolve()));
    return;
  }

  try {
    process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    try {
      child.kill(force ? 'SIGKILL' : 'SIGTERM');
    } catch {}
  }
};

export const redactOutput = (value: string) =>
  value
    .replace(
      /(STACKTAPE_API_KEY|STP_API_KEY|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)\s*[:=]\s*[^\s,;]+/gi,
      '$1=<redacted>'
    )
    .replace(
      /(["']?(?:password|passwd|token|api[_-]?key|secret|authorization)["']?\s*[:=]\s*)["'][^"'\r\n]{8,}["']/gi,
      '$1"<redacted>"'
    )
    .replace(/(Authorization:\s*Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, '$1<redacted>')
    .replace(/(Authorization:\s*Basic\s+)[A-Za-z0-9+/=]+/gi, '$1<redacted>')
    .replace(/([?&](?:access_token|api[_-]?key|token|secret)=)[^&#\s]+/gi, '$1<redacted>')
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,}|sk_(?:live|test)_[A-Za-z0-9._-]{8,})\b/g,
      '<redacted>'
    )
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)[^@\s/]+@/gi, '$1<redacted>@');

export const outputTail = (value: string, maximumCharacters = 8_000) =>
  redactOutput(value).trim().slice(-maximumCharacters);

export const formatCommand = (command: string, args: readonly string[]) =>
  [command, ...args].map((part) => (/^[a-zA-Z0-9_./:=@-]+$/.test(part) ? part : JSON.stringify(part))).join(' ');

export const runProcess = async ({
  command,
  args,
  cwd,
  env = process.env,
  timeoutMs = 30 * 60_000,
  terminationGraceMs = 5_000,
  forwardSignals = true
}: {
  command: string;
  args: string[];
  cwd: string;
  env?: Environment;
  timeoutMs?: number;
  terminationGraceMs?: number;
  forwardSignals?: boolean;
}): Promise<ProcessResult> => {
  const startedAt = Date.now();
  const platformCommand = commandForPlatform(command, args);
  const child = spawn(platformCommand.executable, platformCommand.args, {
    cwd,
    detached: process.platform !== 'win32',
    env: Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  let stdout = '';
  let stderr = '';
  let stdoutTruncated = false;
  let stderrTruncated = false;
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    const appended = appendBounded(stdout, chunk);
    stdout = appended.value;
    stdoutTruncated ||= appended.truncated;
  });
  child.stderr?.on('data', (chunk: string) => {
    const appended = appendBounded(stderr, chunk);
    stderr = appended.value;
    stderrTruncated ||= appended.truncated;
  });

  let timedOut = false;
  let interruptedSignal: NodeJS.Signals | undefined;
  let forceTerminationRequested = false;
  let terminationStarted = false;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  const requestTermination = () => {
    if (terminationStarted) return;
    terminationStarted = true;
    void terminateProcessTree(child, false).then(() => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      forceTimer = setTimeout(() => {
        forceTerminationRequested = true;
        void terminateProcessTree(child, true);
      }, terminationGraceMs);
    });
  };
  const signalHandlers = new Map<NodeJS.Signals, () => void>();
  if (forwardSignals) {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      const handler = () => {
        interruptedSignal ??= signal;
        requestTermination();
      };
      signalHandlers.set(signal, handler);
      process.on(signal, handler);
    }
  }
  const timeout = setTimeout(() => {
    timedOut = true;
    requestTermination();
  }, timeoutMs);

  const { exitCode, signal } = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, childSignal) => resolve({ exitCode: code, signal: childSignal }));
    }
  ).finally(() => {
    clearTimeout(timeout);
    if (forceTimer !== undefined) clearTimeout(forceTimer);
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  });

  return {
    command: formatCommand(command, args),
    exitCode,
    signal,
    durationMs: Date.now() - startedAt,
    stdout,
    stderr,
    stdoutTruncated,
    stderrTruncated,
    timedOut,
    ...(interruptedSignal === undefined ? {} : { interruptedSignal }),
    forceTerminationRequested
  };
};

export const assertProcessSucceeded = (result: ProcessResult) => {
  if (result.interruptedSignal !== undefined) {
    throw new Error(`${result.command} was interrupted by ${result.interruptedSignal}.`);
  }
  if (result.timedOut) throw new Error(`${result.command} timed out after ${result.durationMs}ms.`);
  if (result.exitCode !== 0) {
    const details = outputTail(result.stderr || result.stdout);
    throw new Error(`${result.command} exited with ${String(result.exitCode)}.${details ? `\n${details}` : ''}`);
  }
};
