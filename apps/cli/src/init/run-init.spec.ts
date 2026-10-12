import { describe, expect, it } from 'bun:test';
import type { DetectedAgent } from './agent/detect';
import { canOpenBrowser, chooseAgent } from './run-init';

const agent = (id: DetectedAgent['id'], executable = id): DetectedAgent => ({
  id,
  executable,
  version: '1.0.0',
  capabilities: {
    canDisableBuiltInTools: true,
    enforcesTurnLimit: true,
    acceptsSystemPrompt: true,
    emitsStructuredTranscript: true,
    isolatedMcpConfig: true
  }
});

describe('chooseAgent', () => {
  it('takes the best drivable agent, in detection order', () => {
    expect(chooseAgent([agent('claude-code'), agent('codex')])?.id).toBe('claude-code');
    expect(chooseAgent([agent('codex')])?.id).toBe('codex');
  });

  it('does not pick an agent we cannot yet drive as a session', () => {
    // Copilot is detected so we can tell the user it exists, but choosing it because it happens to
    // be installed would be worse than not offering it.
    expect(chooseAgent([agent('copilot')])).toBeUndefined();
  });

  it('returns nothing when none are installed', () => {
    expect(chooseAgent([])).toBeUndefined();
  });

  it('honours an explicit request over the ranking', () => {
    expect(chooseAgent([agent('claude-code'), agent('codex')], 'codex')?.id).toBe('codex');
  });

  it('returns nothing when the requested agent is absent, rather than substituting', () => {
    // runInit turns this into an error. Quietly using a different agent, and charging someone's
    // subscription for it, is worse than stopping.
    expect(chooseAgent([agent('claude-code')], 'codex')).toBeUndefined();
  });

  it('returns nothing when the agent is declined', () => {
    expect(chooseAgent([agent('claude-code')], 'none')).toBeUndefined();
  });
});

describe('canOpenBrowser', () => {
  it('refuses in CI, where nobody is looking at a screen', () => {
    expect(canOpenBrowser({ CI: 'true' } as NodeJS.ProcessEnv)).toBe(false);
    expect(canOpenBrowser({ GITHUB_ACTIONS: 'true' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('allows a normal desktop session', () => {
    const env = (process.platform === 'linux' ? { DISPLAY: ':0' } : {}) as NodeJS.ProcessEnv;
    expect(canOpenBrowser(env)).toBe(true);
  });
});
