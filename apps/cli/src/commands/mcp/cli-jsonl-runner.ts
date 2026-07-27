import { spawn } from 'node:child_process';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { getMcpOperationInvocationEnv } from '@shared/utils/operation-invocation-context';

type JsonlEventEvent = {
  type: 'event';
  phase: string;
  eventType: string;
  status: 'started' | 'running' | 'completed';
  message: string;
  ts?: string;
  instanceId?: string;
  detail?: { kind: string; [key: string]: unknown };
};

type JsonlLogEvent = {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  ts?: string;
  data?: Record<string, unknown>;
};

type JsonlOutputEvent = {
  type: 'output';
  eventType?: string;
  instanceId?: string;
  lines: string[];
  ts?: string;
};

type JsonlResultEvent = {
  ts?: string;
  type: 'result';
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

type JsonlEvent = JsonlEventEvent | JsonlLogEvent | JsonlOutputEvent | JsonlResultEvent;

type RunStacktapeResult = {
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
  rawTail?: string;
  events: JsonlEventEvent[];
  logEvents: JsonlLogEvent[];
  outputEvents: JsonlOutputEvent[];
};

const MAX_TAIL_LINES = 80;

const pushTailLine = (tail: string[], line: string) => {
  const clean = line.trim();
  if (!clean) return;
  tail.push(clean);
  if (tail.length > MAX_TAIL_LINES) {
    tail.shift();
  }
};

const parseJsonlLine = (line: string): JsonlEvent | undefined => {
  try {
    const parsed = JSON.parse(line) as { type?: unknown };
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') return undefined;
    if (parsed.type === 'event') return parsed as JsonlEventEvent;
    if (parsed.type === 'log') return parsed as JsonlLogEvent;
    if (parsed.type === 'output') return parsed as JsonlOutputEvent;
    if (parsed.type === 'result') return parsed as JsonlResultEvent;
    return undefined;
  } catch {
    return undefined;
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
  spawnCwd
}: {
  args: Record<string, unknown>;
  spawnCwd?: string;
}): Record<string, unknown> => {
  if (!spawnCwd || spawnCwd === process.cwd()) return args;
  const currentWorkingDirectory = args.currentWorkingDirectory;
  if (typeof currentWorkingDirectory !== 'string') return args;
  if (isAbsolute(currentWorkingDirectory)) return args;

  return {
    ...args,
    currentWorkingDirectory: resolve(process.cwd(), currentWorkingDirectory)
  };
};

export const runStacktapeCommandJsonl = async ({
  command,
  args,
  timeoutMs = 10 * 60 * 1000
}: {
  command: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<RunStacktapeResult> => {
  const { command: spawnCommand, prefixArgs, cwd: spawnCwd } = getStacktapeSpawnBase();
  const resolvedArgs = resolveUserProjectArgs({ args: args || {}, spawnCwd });
  const cliArgs = normalizeCliArgs(resolvedArgs);
  const spawnArgs = [...prefixArgs, command, '--agent', ...cliArgs];
  const operationInvocationEnv = getMcpOperationInvocationEnv({
    client: process.env.STACKTAPE_MCP_CLIENT_NAME || process.env.STACKTAPE_MCP_CLIENT,
    tool: 'stacktape_cli'
  });

  const child = spawn(spawnCommand, spawnArgs, {
    cwd: spawnCwd || process.cwd(),
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

  const stdoutRl = createInterface({ input: child.stdout! });
  const stderrRl = createInterface({ input: child.stderr! });

  stdoutRl.on('line', (line) => {
    pushTailLine(tailLines, line);
    const parsed = parseJsonlLine(line);
    if (!parsed) return;
    if (parsed.type === 'event') {
      events.push(parsed);
      return;
    }
    if (parsed.type === 'log') {
      logEvents.push(parsed);
      return;
    }
    if (parsed.type === 'output') {
      outputEvents.push(parsed);
      return;
    }
    if (parsed.type === 'result') {
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

  const errorPromise = new Promise<{ spawnError: Error }>((resolveError) => {
    child.on('error', (error) => {
      resolveError({ spawnError: error });
    });
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // noop
      }
      reject(new Error(`Command timed out after ${timeoutMs}ms: stacktape ${command}`));
    }, timeoutMs);

    closePromise.finally(() => {
      clearTimeout(timer);
    });
  });

  const closeOrError = await Promise.race([closePromise, timeoutPromise, errorPromise]);

  if ('spawnError' in closeOrError) {
    const message = closeOrError.spawnError.message || `Failed to start Stacktape CLI subprocess for ${command}.`;
    return {
      ok: false,
      code: 'SPAWN_FAILED',
      message,
      rawTail: message,
      events,
      logEvents,
      outputEvents
    };
  }

  const { exitCode, signal } = closeOrError;

  if (resultEvent) {
    return {
      ok: resultEvent.ok,
      code: resultEvent.code,
      message: resultEvent.message,
      data: resultEvent.data,
      rawTail: tailLines.length > 0 ? tailLines.join('\n') : undefined,
      events,
      logEvents,
      outputEvents
    };
  }

  const finalCode = exitCode === 0 ? 'OK' : 'INTERNAL_ERROR';
  const rawTail = tailLines.length > 0 ? tailLines.join('\n') : undefined;
  const inferredFailure = inferFailureFromTail(rawTail);

  if (inferredFailure) {
    return {
      ok: false,
      code: inferredFailure.code,
      message: inferredFailure.message,
      rawTail,
      events,
      logEvents,
      outputEvents
    };
  }

  return {
    ok: exitCode === 0,
    code: finalCode,
    message:
      exitCode === 0
        ? 'Command finished without JSONL result event'
        : `Command failed without JSONL result event (exit=${exitCode}, signal=${signal || 'none'})`,
    rawTail,
    events,
    logEvents,
    outputEvents
  };
};

export type { JsonlEventEvent, JsonlLogEvent, JsonlOutputEvent, JsonlResultEvent, RunStacktapeResult };
