import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import { initSessionEnvVars } from '../mcp/session-server';
import type { AgentEvent, SessionRunInput } from './transport';
import { runAgentSession, runAgentSessionWithRetry } from './session-runner';
import type { SpawnResult } from './transports/claude-cli';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stp-session-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const input = (): SessionRunInput => ({
  repositoryRoot: root,
  systemPrompt: 'Describe this repository.',
  userPrompt: 'Go.',
  files: ['package.json'],
  brief: projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION }),
  budget: { maxTurns: 10, wallClockMs: 60_000 }
});

const claudeResult = (extra: Partial<SpawnResult> = {}): SpawnResult => ({
  stdout: JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 2 } }),
  stderr: '',
  exitCode: 0,
  timedOut: false,
  ...extra
});

const collectEvents = () => {
  const events: AgentEvent[] = [];
  return { events, hooks: { onEvent: (event: AgentEvent) => events.push(event) } };
};

const validSubmission = {
  schemaVersion: 1,
  services: [
    {
      name: 'api',
      path: '.',
      language: 'javascript',
      exposesHttp: true,
      executionModel: 'long-running',
      startCommand: 'node index.js',
      evidence: []
    }
  ]
};

describe('runAgentSession', () => {
  it('takes its result from the submitted facts, not from the transcript', async () => {
    const { hooks } = collectEvents();

    const outcome = await runAgentSession(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      // The spawner stands in for the CLI: it writes a submission exactly where the MCP child would.
      spawner: async ({ args }) => {
        const configPath = args[args.indexOf('--mcp-config') + 1]!;
        const config = JSON.parse(await readFile(configPath, 'utf8'));
        const submissionFile = config.mcpServers.stacktape_init.env[initSessionEnvVars.submissionFile];
        await writeFile(submissionFile, JSON.stringify(validSubmission), 'utf8');
        return claudeResult();
      }
    });

    expect(outcome.stopReason).toBe('complete');
    expect(outcome.submission?.services[0]?.name).toBe('api');
  });

  it('reports a session that finished without submitting anything', async () => {
    const { hooks } = collectEvents();

    const outcome = await runAgentSession(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      spawner: async () => claudeResult()
    });

    // A green transcript with no submission is not a success — there is nothing to compose.
    expect(outcome.stopReason).toBe('no-submission');
    expect(outcome.submission).toBeUndefined();
  });

  it('hands the session state to the child as files rather than arguments', async () => {
    const { hooks } = collectEvents();
    let env: Record<string, string> = {};

    await runAgentSession(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      spawner: async ({ args }) => {
        const config = JSON.parse(await readFile(args[args.indexOf('--mcp-config') + 1]!, 'utf8'));
        env = config.mcpServers.stacktape_init.env;
        return claudeResult();
      }
    });

    expect(env[initSessionEnvVars.root]).toBe(root);
    expect(env[initSessionEnvVars.filesFile]).toBeTruthy();
  });

  it('runs Codex in a scratch directory, since its patch tool cannot be removed', async () => {
    const { hooks } = collectEvents();
    let cwd = '';

    await runAgentSession(input(), hooks, {
      provider: 'codex',
      executable: 'codex',
      spawner: async (spawn) => {
        cwd = spawn.cwd;
        return { stdout: JSON.stringify({ type: 'turn.completed' }), stderr: '', exitCode: 0, timedOut: false };
      }
    });

    expect(cwd).not.toBe(root);
    expect(cwd).toContain('scratch');
  });

  it('cleans up its temporary directory even when the provider fails', async () => {
    const { hooks } = collectEvents();
    let sessionDirectory = '';

    const outcome = await runAgentSessionWithRetry(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      retryDelaysMs: [],
      spawner: async ({ args }) => {
        sessionDirectory = args[args.indexOf('--mcp-config') + 1]!;
        return claudeResult({ exitCode: 1, stdout: '', stderr: 'crashed' });
      }
    });

    expect(outcome.stopReason).toBe('error');
    // The scratch directory can hold whatever the agent tried to write, and the session files
    // describe the user's project. Neither should outlive the run.
    expect(
      await readFile(sessionDirectory, 'utf8')
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });

  it('surfaces the transcript as normalised events', async () => {
    const { events, hooks } = collectEvents();

    await runAgentSession(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      spawner: async () =>
        claudeResult({
          stdout: [
            JSON.stringify({
              type: 'assistant',
              message: {
                content: [{ type: 'tool_use', name: 'mcp__stacktape_init__read_file', input: { path: 'package.json' } }]
              }
            }),
            JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 5, output_tokens: 1 } })
          ].join('\n')
        })
    });

    expect(events).toContainEqual({ type: 'tool-call', name: 'read_file', summary: 'package.json' });
  });
});

describe('runAgentSessionWithRetry', () => {
  it('retries a throttled provider and succeeds on a later attempt', async () => {
    const { hooks } = collectEvents();
    let attempts = 0;

    const outcome = await runAgentSessionWithRetry(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      retryDelaysMs: [1, 1],
      spawner: async ({ args }) => {
        attempts += 1;
        if (attempts === 1) {
          return claudeResult({ exitCode: 1, stdout: '', stderr: '429 too many requests' });
        }
        const config = JSON.parse(await readFile(args[args.indexOf('--mcp-config') + 1]!, 'utf8'));
        await writeFile(
          config.mcpServers.stacktape_init.env[initSessionEnvVars.submissionFile],
          JSON.stringify(validSubmission),
          'utf8'
        );
        return claudeResult();
      }
    });

    expect(attempts).toBe(2);
    expect(outcome.stopReason).toBe('complete');
  });

  it('gives up on a failure that is not worth retrying', async () => {
    const { hooks } = collectEvents();
    let attempts = 0;

    const outcome = await runAgentSessionWithRetry(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      retryDelaysMs: [1],
      spawner: async () => {
        attempts += 1;
        return claudeResult({ exitCode: 1, stdout: '', stderr: 'bad flag' });
      }
    });

    expect(attempts).toBe(1);
    expect(outcome.stopReason).toBe('error');
  });
});
