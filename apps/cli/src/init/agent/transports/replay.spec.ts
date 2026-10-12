import { describe, expect, it } from 'bun:test';
import { agentSubmissionSchema } from '@stacktape/config-inference/facts/agent-submission';
import { recordSession, recordedSessionSchema } from './replay';

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

describe('recordedSessionSchema', () => {
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
