import { expect, test } from 'bun:test';
import { consoleOnlyReason } from './account-mode';

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
