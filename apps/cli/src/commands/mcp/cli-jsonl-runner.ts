import { spawn } from 'node:child_process';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { existsSync, realpathSync } from 'node:fs';
import { getMcpOperationInvocationEnv } from '@application-services/operation-invocation-context';
import killProcessTree from 'tree-kill';
import type {
  JsonlEvent,
  JsonlEventEvent,
  JsonlLogEvent,
  JsonlOutputEvent,
  JsonlResultEvent
} from '@application-services/tui-manager/output/jsonl-types';

type RunStacktapeResult = {
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
  rawTail?: string;
  events: JsonlEventEvent[];
  logEvents: JsonlLogEvent[];
  outputEvents: JsonlOutputEvent[];
  resolvedContext: {
    cwd: string;
    currentWorkingDirectory?: string;
  };
};

const MAX_TAIL_LINES = 80;
const MAX_RETAINED_EVENTS = 200;
const PROCESS_EXIT_GRACE_MS = 3000;

const pushTailLine = (tail: string[], line: string) => {
  const clean = line.trim();
  if (!clean) return;
  tail.push(clean);
  if (tail.length > MAX_TAIL_LINES) {
    tail.shift();
  }
};

const pushBounded = <T>(items: T[], item: T) => {
  items.push(item);
  if (items.length > MAX_RETAINED_EVENTS) items.shift();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseJsonlLine = (line: string): { event?: JsonlEvent; malformedResult: boolean } => {
  try {
    const parsed = JSON.parse(line) as unknown;
    if (!isRecord(parsed) || typeof parsed.type !== 'string') return { malformedResult: false };
    if (parsed.type === 'event') {
      const valid =
        typeof parsed.ts === 'string' &&
        typeof parsed.phase === 'string' &&
        typeof parsed.eventType === 'string' &&
        ['started', 'running', 'completed'].includes(String(parsed.status)) &&
        typeof parsed.message === 'string';
      return { event: valid ? (parsed as JsonlEventEvent) : undefined, malformedResult: false };
    }
    if (parsed.type === 'log') {
      const valid =
        typeof parsed.ts === 'string' &&
        ['info', 'warn', 'error'].includes(String(parsed.level)) &&
        typeof parsed.source === 'string' &&
        typeof parsed.message === 'string';
      return { event: valid ? (parsed as JsonlLogEvent) : undefined, malformedResult: false };
    }
    if (parsed.type === 'output') {
      const valid =
        typeof parsed.ts === 'string' &&
        Array.isArray(parsed.lines) &&
        parsed.lines.every((item) => typeof item === 'string');
      return { event: valid ? (parsed as JsonlOutputEvent) : undefined, malformedResult: false };
    }
    if (parsed.type === 'result') {
      const valid =
        typeof parsed.ts === 'string' &&
        typeof parsed.ok === 'boolean' &&
        typeof parsed.code === 'string' &&
        typeof parsed.message === 'string' &&
        (parsed.data === undefined || isRecord(parsed.data));
      return { event: valid ? (parsed as JsonlResultEvent) : undefined, malformedResult: !valid };
    }
    return { malformedResult: false };
  } catch {
    return { malformedResult: false };
  }
};

const normalizeSpawnCommandPath = (command: string): string => {
  if (process.platform !== 'win32') return command;
  return /^[a-z]:\\/i.test(command) ? command.replace(/\\/g, '/') : command;
};

const inferFailureFromTail = (rawTail?: string): { code: string; message: string } | null => {
  if (!rawTail) return null;
  const lower = rawTail.toLowerCase();
  const hasErrorSignal =
    lower.includes('[x]') ||
    lower.includes(' error') ||
    lower.includes('invalid argument') ||
    lower.includes('failed') ||
    lower.includes('exception');
  if (!hasErrorSignal) return null;

  const lines = rawTail
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const bestLine =
    lines.find((line) => /\[x\]|error|invalid argument|failed|exception/i.test(line)) ||
    lines[lines.length - 1] ||
    'Command failed';

  const codeMatch = rawTail.match(/\(([A-Z_]+)\)\s*$/m);
  const inferredCode = codeMatch?.[1] || 'INTERNAL_ERROR';

  return {
    code: inferredCode,
    message: bestLine
  };
};

const getStacktapeSpawnBase = (): { command: string; prefixArgs: string[]; cwd?: string } => {
  const commandFromEnv = process.env.STACKTAPE_MCP_CLI_COMMAND;
  if (commandFromEnv) {
    return { command: normalizeSpawnCommandPath(commandFromEnv), prefixArgs: [] };
  }

  const scriptArg = process.argv[1] ? resolve(process.argv[1]) : undefined;
  const looksLikeScriptPath = scriptArg ? /\.(mjs|cjs|js|ts)$/.test(scriptArg) : false;

  if (looksLikeScriptPath) {
    return {
      command: normalizeSpawnCommandPath(process.execPath),
      prefixArgs: [scriptArg!],
      cwd: resolve(dirname(scriptArg!), '..')
    };
  }

  const localDevEntrypoint = resolve(process.cwd(), 'scripts', 'dev.ts');
  if (existsSync(localDevEntrypoint)) {
    return {
      command: 'bun',
      prefixArgs: [localDevEntrypoint]
    };
  }

  const execName = basename(process.execPath || '').toLowerCase();
  if (execName === 'bun' || execName === 'bun.exe' || execName === 'node' || execName === 'node.exe') {
    return {
      command: 'stacktape',
      prefixArgs: []
    };
  }

  return {
    command: normalizeSpawnCommandPath(process.execPath),
    prefixArgs: []
  };
};

const normalizeCliArgs = (args: Record<string, unknown> = {}): string[] => {
  const cliArgs: string[] = [];

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;

    const flag = `--${key}`;
    if (typeof value === 'boolean') {
      if (value) cliArgs.push(flag);
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      cliArgs.push(flag, value.map((item) => String(item)).join(','));
      continue;
    }

    if (typeof value === 'object') {
      cliArgs.push(flag, JSON.stringify(value));
      continue;
    }

    cliArgs.push(flag, String(value));
  }

  return cliArgs;
};

const resolveUserProjectArgs = ({
  args,
  cwd
}: {
  args: Record<string, unknown>;
  cwd: string;
}): { args: Record<string, unknown>; currentWorkingDirectory?: string } => {
  const currentWorkingDirectory = args.currentWorkingDirectory;
  if (typeof currentWorkingDirectory !== 'string') return { args };
  const resolvedCurrentWorkingDirectory = isAbsolute(currentWorkingDirectory)
    ? resolve(currentWorkingDirectory)
    : resolve(cwd, currentWorkingDirectory);

  return {
    args: {
      ...args,
      currentWorkingDirectory: resolvedCurrentWorkingDirectory
    },
    currentWorkingDirectory: resolvedCurrentWorkingDirectory
  };
};

const killTree = async (pid: number, signal: NodeJS.Signals): Promise<void> =>
  new Promise((resolveKill) => {
    killProcessTree(pid, signal, () => resolveKill());
  });

const waitForClose = async (
  closePromise: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>,
  timeoutMs: number
): Promise<boolean> =>
  Promise.race([
    closePromise.then(() => true),
    new Promise<boolean>((resolveWait) => {
      const timer = setTimeout(() => resolveWait(false), timeoutMs);
      timer.unref?.();
    })
  ]);

const terminateProcessTree = async ({
  pid,
  closePromise
}: {
  pid?: number;
  closePromise: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>;
}) => {
  if (!pid) return;
  await killTree(pid, 'SIGTERM');
  if (await waitForClose(closePromise, PROCESS_EXIT_GRACE_MS)) return;
  await killTree(pid, 'SIGKILL');
  await waitForClose(closePromise, PROCESS_EXIT_GRACE_MS);
};

export const runStacktapeCommandJsonl = async ({
  command,
  args,
  cwd,
  timeoutMs = 10 * 60 * 1000,
  signal,
  tool = 'stacktape_cli',
  clientName,
  onProgress
}: {
  command: string;
  args?: Record<string, unknown>;
  cwd?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  tool?: 'stacktape_cli' | 'stacktape_dev';
  clientName?: string;
  onProgress?: (event: JsonlEventEvent) => void | Promise<void>;
}): Promise<RunStacktapeResult> => {
  const { command: spawnCommand, prefixArgs, cwd: spawnCwd } = getStacktapeSpawnBase();
  // macOS exposes /tmp through /private/tmp. Use the filesystem's canonical path so the
  // context reported to callers is exactly the directory observed by the child process.
  const resolvedCwd = realpathSync(resolve(cwd || process.cwd()));
  const resolvedProjectArgs = resolveUserProjectArgs({ args: args || {}, cwd: resolvedCwd });
  const resolvedArgs = resolvedProjectArgs.args;
  const cliArgs = normalizeCliArgs(resolvedArgs);
  const spawnArgs = [...prefixArgs, command, '--agent', ...cliArgs];
  const operationInvocationEnv = getMcpOperationInvocationEnv({
    client: clientName || process.env.STACKTAPE_MCP_CLIENT_NAME || process.env.STACKTAPE_MCP_CLIENT,
    tool
  });
  const resolvedContext = {
    cwd: spawnCwd || resolvedCwd,
    ...(resolvedProjectArgs.currentWorkingDirectory
      ? { currentWorkingDirectory: resolvedProjectArgs.currentWorkingDirectory }
      : {})
  };

  const child = spawn(spawnCommand, spawnArgs, {
    cwd: resolvedCwd,
    env: {
      ...process.env,
      ...operationInvocationEnv
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    ...(process.platform === 'win32' && spawnCommand === 'stacktape' ? { shell: true } : {})
  });

  const tailLines: string[] = [];
  const events: JsonlEventEvent[] = [];
  const logEvents: JsonlLogEvent[] = [];
  const outputEvents: JsonlOutputEvent[] = [];
  let resultEvent: JsonlResultEvent | undefined;
  let resultEventCount = 0;
  let malformedResult = false;

  const stdoutRl = createInterface({ input: child.stdout! });
  const stderrRl = createInterface({ input: child.stderr! });

  stdoutRl.on('line', (line) => {
    pushTailLine(tailLines, line);
    const parsedLine = parseJsonlLine(line);
    malformedResult ||= parsedLine.malformedResult;
    const parsed = parsedLine.event;
    if (!parsed) return;
    if (parsed.type === 'event') {
      pushBounded(events, parsed);
      if (onProgress) {
        void Promise.resolve(onProgress(parsed)).catch(() => {
          // Progress reporting must never change the command outcome.
        });
      }
      return;
    }
    if (parsed.type === 'log') {
      pushBounded(logEvents, parsed);
      return;
    }
    if (parsed.type === 'output') {
      pushBounded(outputEvents, parsed);
      return;
    }
    if (parsed.type === 'result') {
      resultEventCount += 1;
      resultEvent = parsed;
    }
  });

  stderrRl.on('line', (line) => {
    pushTailLine(tailLines, `[stderr] ${line}`);
  });

  const closePromise = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolveClose) => {
    child.on('close', (exitCode, signal) => {
      resolveClose({ exitCode, signal });
    });
  });

  const errorPromise = new Promise<{ kind: 'spawn-error'; error: Error }>((resolveError) => {
    child.on('error', (error) => {
      resolveError({ kind: 'spawn-error', error });
    });
  });

  let timeout: NodeJS.Timeout | undefined;
  let removeAbortListener = () => {};
  const interruptedPromise = new Promise<{ kind: 'timeout' | 'cancelled' }>((resolveInterrupted) => {
    timeout = setTimeout(() => resolveInterrupted({ kind: 'timeout' }), timeoutMs);
    timeout.unref?.();

    if (signal) {
      const onAbort = () => resolveInterrupted({ kind: 'cancelled' });
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
        removeAbortListener = () => signal.removeEventListener('abort', onAbort);
      }
    }
  });

  const closeOutcome = closePromise.then((value) => ({ kind: 'close' as const, ...value }));
  const outcome = await Promise.race([closeOutcome, interruptedPromise, errorPromise]);
  if (timeout) clearTimeout(timeout);
  removeAbortListener();

  if (outcome.kind === 'timeout' || outcome.kind === 'cancelled') {
    await terminateProcessTree({ pid: child.pid, closePromise });
    stdoutRl.close();
    stderrRl.close();
    const rawTail = tailLines.length > 0 ? tailLines.join('\n') : undefined;
    return {
      ok: false,
      code: outcome.kind === 'timeout' ? 'TIMEOUT' : 'CANCELLED',
      message:
        outcome.kind === 'timeout'
          ? `Stacktape command timed out after ${timeoutMs}ms: ${command}.`
          : `Stacktape command was cancelled: ${command}.`,
      rawTail,
      events,
      logEvents,
      outputEvents,
      resolvedContext
    };
  }

  if (outcome.kind === 'spawn-error') {
    const message = outcome.error.message || `Failed to start Stacktape CLI subprocess for ${command}.`;
    return {
      ok: false,
      code: 'SPAWN_FAILED',
      message,
      rawTail: message,
      events,
      logEvents,
      outputEvents,
      resolvedContext
    };
  }

  if (outcome.kind !== 'close') {
    throw new Error(`Unexpected Stacktape CLI process outcome: ${outcome.kind}`);
  }

  const { exitCode, signal: exitSignal } = outcome;

  if (malformedResult || resultEventCount > 1) {
    return {
      ok: false,
      code: 'AGENT_PROTOCOL_ERROR',
      message: malformedResult
        ? 'Stacktape CLI emitted a malformed final agent result.'
        : 'Stacktape CLI emitted more than one final agent result.',
      rawTail: tailLines.length > 0 ? tailLines.join('\n') : undefined,
      events,
      logEvents,
      outputEvents,
      resolvedContext
    };
  }

  if (resultEvent) {
    return {
      ok: resultEvent.ok,
      code: resultEvent.code,
      message: resultEvent.message,
      data: resultEvent.data,
      rawTail: tailLines.length > 0 ? tailLines.join('\n') : undefined,
      events,
      logEvents,
      outputEvents,
      resolvedContext
    };
  }

  const rawTail = tailLines.length > 0 ? tailLines.join('\n') : undefined;
  const inferredFailure = inferFailureFromTail(rawTail);
  return {
    ok: false,
    code: 'AGENT_RESULT_MISSING',
    message: inferredFailure
      ? `Stacktape CLI exited without its required final agent result: ${inferredFailure.message}`
      : `Stacktape CLI exited without its required final agent result (exit=${exitCode}, signal=${exitSignal || 'none'}).`,
    rawTail,
    events,
    logEvents,
    outputEvents,
    resolvedContext
  };
};

export type { JsonlEventEvent, JsonlLogEvent, JsonlOutputEvent, JsonlResultEvent, RunStacktapeResult };
