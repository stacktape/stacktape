import { expect, test } from 'bun:test';
import { validateStackTags } from './validation';

// `stp:` stack tags are Stacktape's own. A configured `stp:dev-stack` on a deployed stack would let `stacktape dev`
// update it later, so every `stp:` name is refused, whatever its case or surrounding spaces.
test.each(['stp:dev-stack', 'STP:dev-stack', ' stp:stage', 'stp:anything'])('the stack tag %p is refused', (name) => {
  expect(() =>
    validateStackTags({ configManager: { config: { stackConfig: { tags: [{ name, value: 'true' }] } } } as never })
  ).toThrow('reserved');
});

test.each(['team', 'stp', 'stp-dev-stack', 'my:stp:tag'])('the stack tag %p is allowed', (name) => {
  expect(() =>
    validateStackTags({ configManager: { config: { stackConfig: { tags: [{ name, value: 'x' }] } } } as never })
  ).not.toThrow();
  expect(() => validateStackTags({ configManager: { config: {} } as never })).not.toThrow();
});
