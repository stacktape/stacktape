import { describe, expect, it } from 'bun:test';
import { INIT_MCP_SERVER_NAME } from '../../mcp/session-server';
import { TransportError } from '../transport';
import {
  buildClaudeArgs,
  buildClaudeStdin,
  buildMcpConfig,
  interpretClaudeRun,
  parseClaudeStream,
  summariseArgs
} from './claude-cli';

const args = () =>
  buildClaudeArgs({ systemPrompt: 'Describe this repository.', maxTurns: 12, mcpConfigPath: '/tmp/mcp.json' });

describe('buildClaudeArgs', () => {
  it('switches every built-in tool off', () => {
    const built = args();
    const toolsIndex = built.indexOf('--tools');

    expect(toolsIndex).toBeGreaterThan(-1);
    expect(built[toolsIndex + 1]).toBe('');
  });

  it('makes ours the only reachable MCP server and pre-approves it', () => {
    const built = args();

    expect(built).toContain('--strict-mcp-config');
    // Without an explicit allow, a headless run has nobody to approve a call and every tool errors.
    expect(built[built.indexOf('--allowedTools') + 1]).toBe(`mcp__${INIT_MCP_SERVER_NAME}`);
  });

  it('asks the CLI to enforce the turn budget', () => {
    expect(args()[args().indexOf('--max-turns') + 1]).toBe('12');
  });

  it('carries the system prompt out of band and leaves no slot for the user prompt', () => {
    const built = args();

    // The system prompt is a flag; the user prompt is not accepted here at all, because with
    // --input-format stream-json an argv prompt is ignored and the run exits silently with no
    // result. Sending it over stdin also sidesteps Windows argument-length limits.
    expect(built[built.indexOf('--system-prompt') + 1]).toBe('Describe this repository.');
    expect(built).toContain('--input-format');
    expect(built).toContain('stream-json');
  });

  it('omits the model flag when no model is pinned', () => {
    expect(args()).not.toContain('--model');
  });
});

describe('buildClaudeStdin', () => {
  it('emits one newline-delimited user message', () => {
    const line = buildClaudeStdin('hello');

    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line.trim())).toEqual({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: 'hello' }] }
    });
  });
});

describe('buildMcpConfig', () => {
  it('describes exactly one stdio server', () => {
    const config = JSON.parse(buildMcpConfig({ command: 'node', args: ['server.js'], env: { A: '1' } }));

    expect(Object.keys(config.mcpServers)).toEqual([INIT_MCP_SERVER_NAME]);
    expect(config.mcpServers[INIT_MCP_SERVER_NAME]).toMatchObject({ type: 'stdio', command: 'node' });
  });
});

const streamLines = (...events: unknown[]): string[] => events.map((event) => JSON.stringify(event));

describe('parseClaudeStream', () => {
  it('reports a successful session with its vendor-authoritative cost', () => {
    const parsed = parseClaudeStream(
      streamLines(
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Looking at the manifest.' }] } },
        {
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: `mcp__${INIT_MCP_SERVER_NAME}__read_file`, input: { path: 'package.json' } }
            ]
          }
        },
        { type: 'result', subtype: 'success', total_cost_usd: 0.0123, usage: { input_tokens: 900, output_tokens: 120 } }
      )
    );

    expect(parsed.stopReason).toBe('complete');
    expect(parsed.sawResult).toBe(true);
    expect(parsed.usage).toMatchObject({ inputTokens: 900, outputTokens: 120, costUsd: 0.0123 });
    // Transcripts keep our tool names, not the transport-prefixed ones.
    expect(parsed.events).toContainEqual({ type: 'tool-call', name: 'read_file', summary: 'package.json' });
  });

  it('treats hitting the turn ceiling as a conclusion, not a crash', () => {
    const parsed = parseClaudeStream(streamLines({ type: 'result', subtype: 'error_max_turns' }));

    expect(parsed.stopReason).toBe('max-turns');
    expect(parsed.sawResult).toBe(true);
    expect(parsed.errorMessage).toBeUndefined();
  });

  it('reports no result when the stream never concluded', () => {
    expect(parseClaudeStream(['', 'not json', '{"type":"assistant"}'])).toMatchObject({
      sawResult: false,
      stopReason: 'error'
    });
  });
});

describe('interpretClaudeRun', () => {
  const conclude = JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 1, output_tokens: 1 } });

  it('accepts a concluded session even when the process exited non-zero', () => {
    // The CLI exits non-zero after max-turns and error results too, so the exit code alone would
    // throw away a session that actually finished.
    const outcome = interpretClaudeRun({ stdout: conclude, stderr: '', exitCode: 1, timedOut: false });

    expect('parsed' in outcome).toBe(true);
  });

  it('fails when the process died before concluding', () => {
    const outcome = interpretClaudeRun({ stdout: '', stderr: 'boom', exitCode: 1, timedOut: false });

    expect('failure' in outcome && outcome.failure.retryable).toBe(false);
  });

  it('marks throttling retryable, from stderr only', () => {
    const outcome = interpretClaudeRun({ stdout: '', stderr: '429 too many requests', exitCode: 1, timedOut: false });

    expect('failure' in outcome && outcome.failure).toBeInstanceOf(TransportError);
    expect('failure' in outcome && outcome.failure.rateLimited).toBe(true);
  });

  it('does not treat model output discussing rate limits as throttling', () => {
    // stdout is the model talking; only stderr is the CLI's own voice.
    const stdout = `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'beware rate limit 429' }] } })}\n${conclude}`;
    const outcome = interpretClaudeRun({ stdout, stderr: '', exitCode: 0, timedOut: false });

    expect('parsed' in outcome).toBe(true);
  });

  it('marks a timeout retryable', () => {
    const outcome = interpretClaudeRun({ stdout: '', stderr: '', exitCode: null, timedOut: true });

    expect('failure' in outcome && outcome.failure.retryable).toBe(true);
  });
});

describe('summariseArgs', () => {
  it('prefers the most identifying argument', () => {
    expect(summariseArgs('read_file', { path: 'src/index.ts' })).toBe('src/index.ts');
    expect(summariseArgs('grep', { pattern: 'listen\\(' })).toBe('listen\\(');
    expect(summariseArgs('get_project_brief', {})).toBe('get_project_brief');
  });
});
