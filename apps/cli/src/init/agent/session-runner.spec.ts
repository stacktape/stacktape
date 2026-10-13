import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import { initSessionEnvVars } from '../mcp/session-server';
import type { AgentEvent, SessionRunInput } from './transport';
import { runAgentSessionWithRetry } from './session-runner';
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

  it('stops after the configured retries when the provider stays throttled', async () => {
    const { hooks } = collectEvents();
    let attempts = 0;

    const outcome = await runAgentSessionWithRetry(input(), hooks, {
      provider: 'claude-code',
      executable: 'claude',
      retryDelaysMs: [1, 1],
      spawner: async () => {
        attempts += 1;
        return claudeResult({ exitCode: 1, stdout: '', stderr: '429 too many requests' });
      }
    });

    // Each attempt spends the user's subscription, so the retry list is a hard ceiling.
    expect(attempts).toBe(3);
    expect(outcome).toMatchObject({ stopReason: 'error', errorMessage: 'Claude Code was rate limited.' });
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
