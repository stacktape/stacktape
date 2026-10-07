/**
 * A recorded stand-in for the Claude Code CLI, for driving `stacktape init` end to end without a model.
 *
 * The init flow treats the vendor CLI as an external process: it finds `claude` on PATH, spawns it with a
 * generated MCP config, and reads a stream-json transcript back. This stand-in sits exactly at that boundary.
 * Everything else is real: it starts the MCP server the CLI configured, speaks the stdio protocol era Claude Code
 * negotiates, and replays a fixed list of tool calls against it. The tool *results* therefore come from the real
 * init tools and the real filesystem policy, and the submission reaches the parent through the real hand-off.
 *
 * Inputs (environment, inherited from the CLI that spawns it):
 * - `STACKTAPE_TEST_AGENT_SCRIPT`: JSON {@link AgentScript}.
 * - `STACKTAPE_TEST_AGENT_LOG`: JSONL file this process appends to: the invocation, every tool result, the exit.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

export type ScriptedToolCall = { tool: string; arguments: Record<string, unknown> };

export type AgentScript =
  | {
      behavior: 'run';
      calls: ScriptedToolCall[];
      /** Claude Code's final result event. `success` is a completed session. */
      result?: { subtype: 'success' | 'error_max_turns' | 'error_during_execution'; message?: string };
      usage?: { inputTokens: number; outputTokens: number; costUsd?: number };
    }
  /** Connects to the MCP server, then waits until it is killed: a session the user cancels mid-analysis. */
  | { behavior: 'hang' }
  /** Exits without a transcript, as a crashed or throttled CLI does. */
  | { behavior: 'fail'; exitCode: number; stderr: string };

export type AgentLogEntry =
  | { type: 'invocation'; pid: number; argv: string[]; cwd: string; prompt: string; mcpServerPid?: number }
  | { type: 'tools'; names: string[] }
  | { type: 'tool-result'; tool: string; arguments: Record<string, unknown>; result: unknown }
  | { type: 'exit'; code: number };

const MCP_SERVER_NAME = 'stacktape_init';
/** The protocol era Claude Code negotiates over stdio. */
const CLAUDE_CODE_PROTOCOL_VERSION = '2025-06-18';

const logPath = process.env.STACKTAPE_TEST_AGENT_LOG;
const log = (entry: AgentLogEntry) => {
  if (logPath) appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
};

const flagValue = (argv: readonly string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
};

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

/** Newline-delimited JSON-RPC over the server's stdio, as the stdio transport specifies. */
const connectMcp = (server: ChildProcess) => {
  let nextId = 1;
  let buffer = '';
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  server.stdout!.setEncoding('utf8');
  server.stdout!.on('data', (chunk: string) => {
    buffer += chunk;
    for (let newline = buffer.indexOf('\n'); newline !== -1; newline = buffer.indexOf('\n')) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line === '') continue;
      const message = JSON.parse(line) as { id?: number; result?: unknown; error?: { message: string } };
      if (message.id === undefined) continue;
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(message.error.message));
      else waiter?.resolve(message.result);
    }
  });
  server.once('exit', (code) => {
    for (const waiter of pending.values()) waiter.reject(new Error(`MCP server exited with ${code}.`));
    pending.clear();
  });
  const send = (message: Record<string, unknown>) => server.stdin!.write(`${JSON.stringify(message)}\n`);
  return {
    request: (method: string, params: Record<string, unknown>) =>
      new Promise<unknown>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        send({ jsonrpc: '2.0', id, method, params });
      }),
    notify: (method: string) => send({ jsonrpc: '2.0', method })
  };
};

const emit = (event: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(event)}\n`);

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  if (argv[0] === '--version') {
    process.stdout.write('2.1.0 (Claude Code)\n');
    return 0;
  }

  const script = JSON.parse(readFileSync(process.env.STACKTAPE_TEST_AGENT_SCRIPT!, 'utf8')) as AgentScript;
  const prompt = await readStdin();

  if (script.behavior === 'fail') {
    log({ type: 'invocation', pid: process.pid, argv, cwd: process.cwd(), prompt });
    process.stderr.write(script.stderr);
    return script.exitCode;
  }

  const mcpConfigPath = flagValue(argv, '--mcp-config');
  if (mcpConfigPath === undefined) throw new Error('Claude Code stand-in started without --mcp-config.');
  const serverConfig = (
    JSON.parse(readFileSync(mcpConfigPath, 'utf8')) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    }
  ).mcpServers[MCP_SERVER_NAME];
  if (serverConfig === undefined) throw new Error(`The MCP config does not define "${MCP_SERVER_NAME}".`);

  const server = spawn(serverConfig.command, serverConfig.args, {
    env: { ...process.env, ...serverConfig.env },
    stdio: ['pipe', 'pipe', 'inherit']
  });
  log({ type: 'invocation', pid: process.pid, argv, cwd: process.cwd(), prompt, mcpServerPid: server.pid });

  const mcp = connectMcp(server);
  await mcp.request('initialize', {
    protocolVersion: CLAUDE_CODE_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'claude-code', version: '2.1.0' }
  });
  mcp.notify('notifications/initialized');
  const listed = (await mcp.request('tools/list', {})) as { tools: Array<{ name: string }> };
  log({ type: 'tools', names: listed.tools.map((tool) => tool.name) });

  if (script.behavior === 'hang') {
    // Killed by whoever owns the session. Nothing else ends this process.
    await new Promise<void>(() => {
      setInterval(() => {}, 60_000);
    });
    return 0;
  }

  emit({ type: 'system', subtype: 'init', tools: listed.tools.map((tool) => `mcp__${MCP_SERVER_NAME}__${tool.name}`) });
  for (const call of script.calls) {
    emit({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', name: `mcp__${MCP_SERVER_NAME}__${call.tool}`, input: call.arguments }]
      }
    });
    const response = (await mcp.request('tools/call', { name: call.tool, arguments: call.arguments })) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = response.content.find((part) => part.type === 'text')?.text ?? 'null';
    log({ type: 'tool-result', tool: call.tool, arguments: call.arguments, result: JSON.parse(text) });
  }

  server.stdin!.end();
  await new Promise<void>((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once('exit', () => resolve());
    setTimeout(resolve, 5_000).unref();
  });

  const result = script.result ?? { subtype: 'success' };
  const usage = script.usage ?? { inputTokens: 1_200, outputTokens: 300 };
  emit({
    type: 'result',
    subtype: result.subtype,
    is_error: result.subtype !== 'success',
    ...(result.message === undefined ? {} : { result: result.message }),
    usage: { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens },
    ...(usage.costUsd === undefined ? {} : { total_cost_usd: usage.costUsd })
  });
  return result.subtype === 'success' ? 0 : 1;
};

main().then(
  (code) => {
    log({ type: 'exit', code });
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`Claude Code stand-in failed: ${error instanceof Error ? error.message : String(error)}\n`);
    log({ type: 'exit', code: 70 });
    process.exitCode = 70;
  }
);
