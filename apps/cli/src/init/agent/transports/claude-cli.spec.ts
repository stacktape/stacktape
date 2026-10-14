import { describe, expect, it } from 'bun:test';
import { INIT_MCP_SERVER_NAME } from '../../mcp/session-server';
import { buildClaudeArgs, buildClaudeStdin, interpretClaudeRun, parseClaudeStream, summariseArgs } from './claude-cli';

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
});

describe('interpretClaudeRun', () => {
  const conclude = JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 1, output_tokens: 1 } });

  it('accepts a concluded session that exited non-zero, even when the model discussed rate limits', () => {
    // The CLI exits non-zero after max-turns and error results too, so the exit code alone would
    // throw away a session that actually finished. stdout is the model talking; only stderr is the
    // CLI's own voice.
    const stdout = `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'beware rate limit 429' }] } })}\n${conclude}`;
    const outcome = interpretClaudeRun({ stdout, stderr: '', exitCode: 1, timedOut: false });

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

// The provider can exit before its MCP helper closes inherited pipes. Exercise real process groups,
// including a helper that ignores graceful termination, rather than substituting the spawner.
describe.skipIf(process.platform === 'win32')('provider process termination', () => {
  it.each([
    ['timeout', 'inherit'],
    ['abort', 'inherit'],
    ['abort', 'ignore']
  ] as const)(
    'stops an exited provider and its unresponsive helper on %s with %s pipes',
    async (mode, stderrMode) => {
      const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const { spawnSync } = await import('node:child_process');
      const { spawnProcess } = await import('./claude-cli');
      const root = await mkdtemp(join(tmpdir(), 'stp-provider-group-'));
      const leaderFile = join(root, 'leader.pid');
      const helperFile = join(root, 'helper.pid');
      const script = join(root, 'provider.cjs');
      const helper = `require('node:fs').writeFileSync(${JSON.stringify(helperFile)}, String(process.pid)); process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000);`;
      await writeFile(
        script,
        `const { spawn } = require('node:child_process'); require('node:fs').writeFileSync(${JSON.stringify(leaderFile)}, String(process.pid)); const helper = spawn(process.execPath, ['-e', ${JSON.stringify(helper)}], { stdio: ['ignore', 'pipe', ${JSON.stringify(stderrMode)}] }); helper.stdout.once('data', () => process.exit(0));`
      );
      const controller = new AbortController();
      const run = spawnProcess({
        command: 'node',
        args: [script],
        cwd: root,
        stdin: '',
        timeoutMs: mode === 'timeout' ? 300 : 60_000,
        signal: controller.signal
      });
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const readyBy = Date.now() + 2_000;
        while (Date.now() < readyBy) {
          const leader = Number(await readFile(leaderFile, 'utf8').catch(() => '0'));
          let leaderAlive = true;
          if (leader) {
            try {
              process.kill(leader, 0);
            } catch {
              leaderAlive = false;
            }
          }
          if (!leaderAlive && (await readFile(helperFile, 'utf8').catch(() => undefined))) break;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        expect(await readFile(helperFile, 'utf8')).toMatch(/^\d+$/);
        if (mode === 'abort') controller.abort();
        const result = await Promise.race([
          run,
          new Promise<never>((_resolve, reject) => {
            deadline = setTimeout(() => reject(new Error('Provider pipes remained open after termination.')), 2_500);
          })
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.timedOut).toBe(mode === 'timeout');
        const helperPid = Number(await readFile(helperFile, 'utf8'));
        const state = spawnSync('ps', ['-o', 'stat=', '-p', String(helperPid)], { encoding: 'utf8' }).stdout.trim();
        // A reparented zombie has stopped; its reaping belongs to the host's PID 1.
        expect(state === '' || state.startsWith('Z'), `Helper ${helperPid} is still running (${state}).`).toBe(true);
      } finally {
        if (deadline) clearTimeout(deadline);
        const leader = Number(await readFile(leaderFile, 'utf8').catch(() => '0'));
        if (leader) {
          try {
            process.kill(-leader, 'SIGKILL');
          } catch {}
        }
        await run;
        await rm(root, { recursive: true, force: true });
      }
    },
    10_000
  );
});
