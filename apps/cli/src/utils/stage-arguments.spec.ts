import { expect, test } from 'bun:test';
import { stage } from '../config/cli/options';
import { getCliInput } from './cli';
import { validateArgs, validateProjectName } from './validator';

const parse = (...args: string[]) => {
  const original = process.argv;
  process.argv = [original[0], original[1], ...args];
  try {
    return getCliInput().options;
  } finally {
    process.argv = original;
  }
};

test.each([
  ['--stage', '--projectName'],
  ['-s', '--prj']
])('keeps numeric-looking deployment names as strings with %s and %s', (stageFlag, projectFlag) => {
  const options = parse('deploy', stageFlag, '2024', projectFlag, '123', '--region', 'eu-west-1');
  expect(options).toMatchObject({ stage: '2024', projectName: '123' });
  expect(() => validateArgs({ command: 'deploy', rawArgs: options, defaults: {}, fromEnv: {} })).not.toThrow();
  expect(() => validateProjectName(options.projectName!)).not.toThrow();
});

test.each(['--stage', '-s'])('rejects %s without a value even when a default stage is saved', (flag) => {
  const options = parse('deploy', flag, '--region', 'eu-west-1');
  expect(() =>
    validateArgs({ command: 'deploy', rawArgs: options, defaults: { stage: 'production' }, fromEnv: {} })
  ).toThrow('Stage must be at least two characters long');
});

// r2an: the stage help claimed a 12-character maximum, but a 15-character stage validates and deploys.
test('the stage help states the rules validation enforces, without a maximum length', () => {
  const help = stage.description!;
  expect(help).not.toMatch(/maximum length is \d+/i);
  expect(help).toContain('lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum');
  const options = parse('deploy', '--stage', 'r2an-production', '--projectName', 'shop', '--region', 'eu-west-1');
  expect(() => validateArgs({ command: 'deploy', rawArgs: options, defaults: {}, fromEnv: {} })).not.toThrow();
  for (const invalid of ['Prod', 'prod_1']) {
    const rejected = parse('deploy', '--stage', invalid, '--projectName', 'shop', '--region', 'eu-west-1');
    expect(() => validateArgs({ command: 'deploy', rawArgs: rejected, defaults: {}, fromEnv: {} })).toThrow(
      'Stage must contain only lowercase letters, numbers, and dashes.'
    );
  }
});
