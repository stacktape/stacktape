import { spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';

type JsonlEventEvent = {
  protocol?: 'stacktape-jsonl';
  version?: 1;
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
  protocol?: 'stacktape-jsonl';
  version?: 1;
  type: 'log';
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  ts?: string;
  data?: Record<string, unknown>;
};

type JsonlOutputEvent = {
  protocol?: 'stacktape-jsonl';
  version?: 1;
  type: 'output';
  eventType?: string;
  instanceId?: string;
  lines: string[];
  ts?: string;
};

type JsonlResultEvent = {
  protocol?: 'stacktape-jsonl';
  version?: 1;
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
    const parsed = JSON.parse(line) as { type?: unknown; protocol?: unknown; version?: unknown };
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') return undefined;
    if (parsed.protocol !== undefined && parsed.protocol !== 'stacktape-jsonl') return undefined;
    if (parsed.version !== undefined && parsed.version !== 1) return undefined;
    if (parsed.type === 'event') return parsed as JsonlEventEvent;
    if (parsed.type === 'log') return parsed as JsonlLogEvent;
    if (parsed.type === 'output') return parsed as JsonlOutputEvent;
    if (parsed.type === 'result') return parsed as JsonlResultEvent;
    return undefined;
  } catch {
    return undefined;
  }
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

const getStacktapeSpawnBase = (): { command: string; prefixArgs: string[] } => {
  const commandFromEnv = process.env.STACKTAPE_MCP_CLI_COMMAND;
  if (commandFromEnv) {
    return { command: commandFromEnv, prefixArgs: [] };
  }

  const scriptArg = process.argv[1] ? resolve(process.argv[1]) : undefined;
  const looksLikeScriptPath = scriptArg ? /\.(mjs|cjs|js|ts)$/.test(scriptArg) : false;

  if (looksLikeScriptPath) {
    return {
      command: process.execPath,
      prefixArgs: [scriptArg!]
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
    command: process.execPath,
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

export const runStacktapeCommandJsonl = async ({
  command,
  args,
  timeoutMs = 10 * 60 * 1000
}: {
  command: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<RunStacktapeResult> => {
  const { command: spawnCommand, prefixArgs } = getStacktapeSpawnBase();
  const cliArgs = normalizeCliArgs(args || {});
  const spawnArgs = [...prefixArgs, command, '--agent', ...cliArgs];

  const child = spawn(spawnCommand, spawnArgs, {
    cwd: process.cwd(),
    env: process.env,
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

  const errorPromise = new Promise<never>((_, reject) => {
    child.on('error', (error) => {
      reject(error);
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

  const { exitCode, signal } = await Promise.race([closePromise, timeoutPromise, errorPromise]);

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
