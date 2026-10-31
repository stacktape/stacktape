import { expect, test } from 'bun:test';
import { stage } from '../config/cli/options';
import { getCliInput } from './cli';
import { validateArgs, validateProjectName, validateStackName } from './validator';

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
test('the stage help states the rules validation enforces: no 12-character maximum, a 128-character stack name', () => {
  const help = stage.description!;
  expect(help).not.toMatch(/maximum length is \d+/i);
  expect(help).toContain('lowercase letters, numbers and dashes, with at least 2 characters');
  expect(help).toContain('CloudFormation stack name, which can have at most 128 characters');
  const options = parse('deploy', '--stage', 'r2an-production', '--projectName', 'shop', '--region', 'eu-west-1');
  expect(() => validateArgs({ command: 'deploy', rawArgs: options, defaults: {}, fromEnv: {} })).not.toThrow();
  for (const invalid of ['Prod', 'prod_1']) {
    const rejected = parse('deploy', '--stage', invalid, '--projectName', 'shop', '--region', 'eu-west-1');
    expect(() => validateArgs({ command: 'deploy', rawArgs: rejected, defaults: {}, fromEnv: {} })).toThrow(
      'Stage must contain only lowercase letters, numbers, and dashes.'
    );
  }
});

// PR #419 review: project `shop` with a 124-character stage passed validation, and CloudFormation then rejected the
// 129-character stack name.
test('a project and stage whose stack name exceeds 128 characters are rejected with the stage limit for that project', () => {
  expect(validateStackName({ projectName: 'shop', stage: 'a'.repeat(123) })).toHaveLength(128);
  expect(() => validateStackName({ projectName: 'shop', stage: 'a'.repeat(124) })).toThrow(
    'has 129 characters. CloudFormation allows at most 128.'
  );
  try {
    validateStackName({ projectName: 'shop', stage: 'a'.repeat(124) });
  } catch (error) {
    expect(error).toMatchObject({
      code: 'CONFIG_VALIDATION_STACK_NAME_TOO_LONG',
      hints: ['Use a stage name of at most 123 characters for project `shop`, or a shorter project name.']
    });
  }
});
