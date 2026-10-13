import { expect, test } from 'bun:test';
import { modelFlagFor } from './models';

test('only a model from the closed list reaches the vendor command line', () => {
  // The wizard posts a model id from the browser; "default" means passing no --model at all.
  const cases = [
    ['claude-code', 'opus', 'opus'],
    ['claude-code', 'haiku', 'haiku'],
    ['claude-code', 'default', undefined],
    ['claude-code', 'claude-opus-5-5 --dangerously-skip-permissions', undefined],
    ['codex', 'default', undefined],
    ['codex', 'opus', undefined],
    ['copilot', 'sonnet', undefined]
  ] as const;
  for (const [provider, modelId, flag] of cases) {
    expect(modelFlagFor(provider, modelId), `${provider} ${modelId}`).toBe(flag);
  }
});
