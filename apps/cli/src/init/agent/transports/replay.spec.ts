import { describe, expect, it } from 'bun:test';
import { agentSubmissionSchema } from '@stacktape/config-inference/facts/agent-submission';
import type { AgentEvent } from '../transport';
import { createReplayRunner, recordSession, recordedSessionSchema } from './replay';

// Parsed rather than written literally, so the fixture is exactly what a real session would deliver
// — defaults filled in and all.
const submission = agentSubmissionSchema.parse({
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
});

const input = {} as never;

describe('createReplayRunner', () => {
  it('replays the recorded timeline through the same hook a live transport uses', async () => {
    const seen: AgentEvent[] = [];
    const recording = recordedSessionSchema.parse({
      label: 'express + postgres',
      provider: 'claude-code',
      events: [
        { type: 'tool-call', name: 'get_project_brief', summary: 'get_project_brief' },
        { type: 'tool-call', name: 'read_file', summary: 'package.json' }
      ],
      submission,
      stopReason: 'complete',
      usage: { inputTokens: 18, outputTokens: 4200, costUsd: 0.31 }
    });

    const outcome = await createReplayRunner(recording)(input, { onEvent: (event) => seen.push(event) });

    expect(seen.map((event) => event.type)).toEqual(['tool-call', 'tool-call']);
    expect(outcome.stopReason).toBe('complete');
    expect(outcome.submission?.services[0]?.name).toBe('api');
    expect(outcome.usage.costUsd).toBe(0.31);
  });

  it('gives the same answer every time, which is the entire point', async () => {
    const recording = recordedSessionSchema.parse({
      label: 'stable',
      provider: 'claude-code',
      submission,
      stopReason: 'complete'
    });
    const runner = createReplayRunner(recording);

    const first = await runner(input, { onEvent: () => {} });
    const second = await runner(input, { onEvent: () => {} });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('can replay a failure, so the degraded path is testable too', async () => {
    const recording = recordedSessionSchema.parse({
      label: 'agent crashed',
      provider: 'codex',
      stopReason: 'error',
      errorMessage: 'codex exited 1'
    });

    const outcome = await createReplayRunner(recording)(input, { onEvent: () => {} });

    expect(outcome).toMatchObject({ stopReason: 'error', errorMessage: 'codex exited 1' });
    expect(outcome.submission).toBeUndefined();
  });

  it('rejects a recording whose submission would not be accepted live', async () => {
    // A fixture that could never have come from a real session would test nothing.
    expect(
      recordedSessionSchema.safeParse({
        label: 'bad',
        provider: 'claude-code',
        submission: {
          schemaVersion: 1,
          services: [
            { name: 'x', path: '../escape', language: 'js', exposesHttp: true, executionModel: 'long-running' }
          ]
        },
        stopReason: 'complete'
      }).success
    ).toBe(false);
  });
});

describe('recordSession', () => {
  it('captures a live outcome so a paid-for run becomes a fixture', () => {
    const recorded = recordSession({
      label: 'live express run',
      provider: 'claude-code',
      events: [{ type: 'tool-call', name: 'grep', summary: 'listen\\(' }],
      outcome: { submission, usage: { inputTokens: 18, outputTokens: 13208, costUsd: 0.52 }, stopReason: 'complete' }
    });

    expect(recorded.label).toBe('live express run');
    expect(recorded.usage.outputTokens).toBe(13208);
    expect(recordedSessionSchema.safeParse(recorded).success).toBe(true);
  });
});
