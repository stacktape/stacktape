import { describe, expect, it } from 'bun:test';
import { INIT_MCP_SERVER_NAME } from '../../mcp/session-server';
import { buildCodexArgs, combineCodexPrompt, parseCodexStream, tomlString } from './codex-cli';

const args = () =>
  buildCodexArgs({ mcpServer: { command: 'C:\\bin\\stacktape.exe', args: ['init-mcp'], env: { ROOT: 'C:\\repo' } } });

describe('buildCodexArgs', () => {
  it('reads the prompt from stdin', () => {
    // A long prompt passed as one argv entry crashes Codex on Windows.
    expect(args().slice(0, 2)).toEqual(['exec', '-']);
  });

  it('disables the built-ins that can be disabled and sandboxes the rest', () => {
    const joined = args().join(' ');

    expect(joined).toContain('features.shell_tool=false');
    expect(joined).toContain('tools.web_search=false');
    expect(joined).toContain('tools.view_image=false');
    // apply_patch cannot be switched off, so the sandbox and a scratch cwd carry that containment.
    expect(args()[args().indexOf('--sandbox') + 1]).toBe('read-only');
  });

  it('leaves the user global config alone', () => {
    expect(args()).toContain('--ignore-user-config');
  });

  it('pre-approves our MCP server, without which every call is cancelled', () => {
    expect(args().join(' ')).toContain(`mcp_servers.${INIT_MCP_SERVER_NAME}.default_tools_approval_mode="approve"`);
  });

  it('escapes Windows paths as TOML strings', () => {
    expect(tomlString('C:\\bin\\stacktape.exe')).toBe('"C:\\\\bin\\\\stacktape.exe"');
    expect(args().join(' ')).toContain('"C:\\\\bin\\\\stacktape.exe"');
  });
});

describe('combineCodexPrompt', () => {
  it('carries the system prompt in band behind a visible boundary', () => {
    const combined = combineCodexPrompt('You are analysing a repository.', 'Describe it.');

    expect(combined.startsWith('You are analysing a repository.')).toBe(true);
    expect(combined).toContain('=== TASK ===');
    expect(combined.endsWith('Describe it.')).toBe(true);
  });
});

const lines = (...events: unknown[]): string[] => events.map((event) => JSON.stringify(event));

describe('parseCodexStream', () => {
  it('reports a completed turn', () => {
    const parsed = parseCodexStream(lines({ type: 'turn.completed', usage: { input_tokens: 500, output_tokens: 60 } }));

    expect(parsed.stopReason).toBe('complete');
    expect(parsed.sawConclusion).toBe(true);
    expect(parsed.usage).toMatchObject({ inputTokens: 500, outputTokens: 60 });
  });

  it('captures subscription plan usage, which is the real budget signal on a flat plan', () => {
    const parsed = parseCodexStream(
      lines({
        type: 'turn.completed',
        rate_limits: { primary: { used_percent: 12.5 }, secondary: { used_percent: 41 } }
      })
    );

    expect(parsed.usage.planUsedPercent).toBe(41);
  });

  it('reports a failed turn with its message', () => {
    const parsed = parseCodexStream(lines({ type: 'turn.failed', error: { message: 'model unavailable' } }));

    expect(parsed.stopReason).toBe('error');
    expect(parsed.errorMessage).toBe('model unavailable');
  });

  it('reports no conclusion when the stream just stops', () => {
    expect(parseCodexStream(['', 'garbage'])).toMatchObject({ sawConclusion: false, stopReason: 'error' });
  });

  it('normalises tool names to ours', () => {
    const parsed = parseCodexStream(
      lines({ type: 'item.tool_call', name: `mcp__${INIT_MCP_SERVER_NAME}__read_file` }, { type: 'turn.completed' })
    );

    expect(parsed.events).toContainEqual({ type: 'tool-call', name: 'read_file', summary: 'read_file' });
  });
});
