import { expect, test } from 'bun:test';
import { consoleOnlyReason, localSessionUserId } from './account-mode';

test.each([
  ['deploy', {}, undefined],
  ['delete', {}, undefined],
  ['logs', {}, undefined],
  ['secret:get', {}, undefined],
  ['dev', {}, undefined],
  ['deploy', { runner: 'ec2' }, 'remote runners run in the Stacktape Console'],
  ['org:list', {}, 'organizations are kept in the Stacktape Console'],
  ['info:whoami', {}, 'it shows your Stacktape Console user and organization'],
  ['incidents', {}, 'incidents are kept in the Stacktape Console']
] as const)('%s %p', (command, args, expected) => {
  expect(consoleOnlyReason({ command, args })).toBe(expected);
});

test.each([
  [{ userId: 'user-123', installId: '0b9c1c3e-8f5d-4a52-9d55-3b0b6f4b2a10' }, 'user-123'],
  [{ installId: '0b9c1c3e-8f5d-4a52-9d55-3b0b6f4b2a10' }, 'install-0b9c1c3e-8f5d-4a52-9d55-3b0b6f4b2a10']
])('a session without a Console user still has a valid AWS role session name: %p', (input, expected) => {
  const id = localSessionUserId(input);
  expect(id).toBe(expected);
  // AWS role session names: 2 to 64 characters of [\w+=,.@-].
  expect(`local-assume-by-${id}`).toMatch(/^[\w+=,.@-]{2,64}$/);
});
