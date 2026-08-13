/**
 * Claude Code as a session transport.
 *
 * The reference implementation, because it is the only CLI that can be made fully inert: `--tools ""`
 * removes every built-in, `--strict-mcp-config` means ours is the only server it can see, and
 * `--max-turns` enforces a budget we would otherwise have to approximate with a stopwatch.
 *
 * Everything below that looks fussy is load-bearing, and each note says why. The arg building and
 * the stream parsing are pure functions so they can be tested without spawning anything; the spawn
 * itself stays as thin as it can be.
 */

import { spawn } from 'node:child_process';
import { INIT_MCP_SERVER_NAME } from '../../mcp/session-server';
import { terminateChild } from '../../terminate-child';
import { looksRateLimited, TransportError, type AgentEvent, type TokenUsage } from '../transport';

export type ClaudeArgsInput = {
  systemPrompt: string;
  maxTurns: number;
  /** Path to a JSON file describing our MCP server. */
  mcpConfigPath: string;
  model?: string;
};

export const buildClaudeArgs = (input: ClaudeArgsInput): string[] => [
  '-p',
  '--output-format',
  'stream-json',
  // The prompt goes over stdin, not argv. With this flag an argv prompt is ignored outright — the
  // run exits silently with no result event — and stdin also sidesteps the Windows argument-length
  // limits that a long brief would otherwise hit.
  '--input-format',
  'stream-json',
  '--verbose',
  // Every built-in off. This is what makes "our tools are the only door" true rather than aspirational.
  '--tools',
  '',
  '--strict-mcp-config',
  // A headless run has nobody to approve a tool call, and without this every call comes back as a
  // permission error. Allowing the whole server is safe precisely because built-ins are off and
  // strict-mcp-config means ours is the only one.
  '--allowedTools',
  `mcp__${INIT_MCP_SERVER_NAME}`,
  '--mcp-config',
  input.mcpConfigPath,
  '--max-turns',
  String(input.maxTurns),
  '--system-prompt',
  input.systemPrompt,
  ...(input.model === undefined ? [] : ['--model', input.model])
];

/** Claude reads user messages from stdin as newline-delimited JSON when `--input-format` is set. */
export const buildClaudeStdin = (prompt: string): string =>
  `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: prompt }] } })}\n`;

export const buildMcpConfig = (server: {
  command: string;
  args: readonly string[];
  env: Record<string, string>;
}): string =>
  JSON.stringify({
    mcpServers: {
      [INIT_MCP_SERVER_NAME]: { type: 'stdio', command: server.command, args: [...server.args], env: server.env }
    }
  });

/** Tools reach the model as `mcp__<server>__<tool>`; transcripts keep our own names. */
const canonicalToolName = (name: string): string => /^mcp__.+?__(.+)$/.exec(name)?.[1] ?? name;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type ClaudeStreamResult = {
  events: AgentEvent[];
  usage: TokenUsage;
  stopReason: 'complete' | 'max-turns' | 'error';
  errorMessage?: string;
  /**
   * Whether the stream reached a `result` event.
   *
   * The CLI exits non-zero for max-turns and error results as well as for genuine crashes, so the
   * exit code alone cannot distinguish "the session concluded and we should read it" from "the
   * process died". This can.
   */
  sawResult: boolean;
};

export const parseClaudeStream = (lines: readonly string[]): ClaudeStreamResult => {
  const events: AgentEvent[] = [];
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let stopReason: ClaudeStreamResult['stopReason'] = 'error';
  let errorMessage: string | undefined = 'Claude Code produced no result.';
  let sawResult = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    let event: unknown;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(event)) continue;

    if (event.type === 'assistant' && isRecord(event.message) && Array.isArray(event.message.content)) {
      for (const part of event.message.content) {
        if (!isRecord(part)) continue;
        if (part.type === 'text' && typeof part.text === 'string') {
          events.push({ type: 'text', text: part.text });
        } else if (part.type === 'tool_use' && typeof part.name === 'string') {
          const name = canonicalToolName(part.name);
          events.push({ type: 'tool-call', name, summary: summariseArgs(name, part.input) });
        }
      }
      continue;
    }

    if (event.type === 'result') {
      sawResult = true;
      const costUsd = typeof event.total_cost_usd === 'number' ? event.total_cost_usd : undefined;
      if (isRecord(event.usage)) {
        usage = {
          inputTokens: typeof event.usage.input_tokens === 'number' ? event.usage.input_tokens : 0,
          outputTokens: typeof event.usage.output_tokens === 'number' ? event.usage.output_tokens : 0,
          ...(costUsd === undefined ? {} : { costUsd })
        };
      } else if (costUsd !== undefined) {
        usage = { ...usage, costUsd };
      }
      events.push({ type: 'usage', usage });

      const subtype = typeof event.subtype === 'string' ? event.subtype : '';
      if (subtype === 'success' && event.is_error !== true) {
        stopReason = 'complete';
        errorMessage = undefined;
      } else if (subtype.includes('max_turns')) {
        stopReason = 'max-turns';
        errorMessage = undefined;
      } else {
        stopReason = 'error';
        errorMessage =
          typeof event.result === 'string' ? event.result : `Claude Code reported ${subtype || 'an error'}.`;
      }
    }
  }

  return { events, usage, stopReason, errorMessage, sawResult };
};

/** A short human-readable description of a tool call, for the wizard's timeline. */
export const summariseArgs = (toolName: string, args: unknown): string => {
  if (!isRecord(args)) return toolName;
  if (typeof args.path === 'string') return args.path;
  if (typeof args.pattern === 'string') return args.pattern;
  return toolName;
};

export type SpawnResult = { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean };

/** Injected so the transport's behaviour can be tested without a real Claude installation. */
export type Spawner = (input: {
  command: string;
  args: readonly string[];
  cwd: string;
  stdin: string;
  timeoutMs: number;
  signal?: AbortSignal;
}) => Promise<SpawnResult>;

export const spawnProcess: Spawner = async ({ command, args, cwd, stdin, timeoutMs, signal }) =>
  new Promise((resolveSpawn, rejectSpawn) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Agent CLIs install as `.cmd` shims on Windows, which `spawn` will not resolve without this.
      ...(process.platform === 'win32' ? { shell: true } : {})
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      terminateChild(child);
    }, timeoutMs);
    timer.unref?.();

    const onAbort = () => terminateChild(child);
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      rejectSpawn(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolveSpawn({ stdout, stderr, exitCode, timedOut });
    });

    // Written and closed immediately: a CLI reading stdin will otherwise wait forever for input that
    // is never coming, and the run hangs until the timeout instead of starting.
    child.stdin?.end(stdin);
  });

/** Turn a finished process into a verdict, applying the exit-code and rate-limit rules. */
export const interpretClaudeRun = (
  result: SpawnResult
): { parsed: ClaudeStreamResult } | { failure: TransportError } => {
  if (result.timedOut) {
    return { failure: new TransportError({ message: 'Claude Code timed out.', retryable: true }) };
  }
  // Only a failed process can be rate limited, and only stderr is the CLI's own voice — stdout is
  // model output, which may discuss rate limits perfectly innocently.
  if (result.exitCode !== 0 && looksRateLimited(result.stderr)) {
    return { failure: new TransportError({ message: 'Claude Code was rate limited.', rateLimited: true }) };
  }

  const parsed = parseClaudeStream(result.stdout.split(/\r?\n/));
  if (result.exitCode !== 0 && !parsed.sawResult) {
    return {
      failure: new TransportError({
        message: `Claude Code exited with ${result.exitCode}: ${result.stderr.slice(0, 400)}`
      })
    };
  }
  return { parsed };
};
