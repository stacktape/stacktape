import { expect, test } from 'bun:test';
import { getArgInfo, validateCommandArgs } from '../../src/config/cli/utils';

test('CLI option schemas reject wrong scalar, enum and array inputs', () => {
  for (const [command, args, valid] of [
    ['deploy', { stage: 'test', region: 'eu-west-1', runner: 'ec2', dockerArgs: ['--build-arg', 'MODE=test'] }, true],
    ['deploy', { runner: 'unknown-runner' }, false],
    ['deploy', { dockerArgs: '--no-cache' }, false],
    ['dev', { outputFormat: 'xml' }, false],
    ['deploy', { ui: 'dashboard' }, true],
    ['deploy', { ui: 'split-footer' }, false],
    ['validate', { stage: 'test', region: 'eu-west-1', outFile: '/tmp/template.yaml' }, true]
  ] as const)
    expect(validateCommandArgs(command, args).success).toBe(valid);
});

test('documented aliases and output-mode values remain compatible', () => {
  expect(getArgInfo('deploy', 'configPath').alias).toContain('cp');
  expect(getArgInfo('deploy', 'region').alias).toContain('r');
  expect(getArgInfo('deploy', 'stage').alias).toContain('s');
  expect(getArgInfo('deploy', 'outputFormat').allowedValues).toEqual(['jsonl', 'plain', 'tty']);
  expect(getArgInfo('deploy', 'ui').allowedValues).toEqual(['auto', 'stream', 'dashboard']);
});
