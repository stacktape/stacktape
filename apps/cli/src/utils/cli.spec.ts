import { describe, expect, test } from 'bun:test';
import type { StacktapeArgs } from 'src/config/cli/types';
import { getCliInput, transformToCliArgs } from './cli';
import { validateArgs } from './validator';

const parseCliInput = (...args: string[]) => {
  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];

  try {
    return getCliInput();
  } finally {
    process.argv = originalArgv;
  }
};

describe('CLI argument serialization', () => {
  test('preserves argument order, emits true flags, and skips false flags', () => {
    const args = {
      stage: 'production',
      region: 'eu-west-1',
      preserveTempFiles: true,
      noCache: false
    } satisfies StacktapeArgs;

    expect(transformToCliArgs(args)).toEqual(['--stage', 'production', '--region', 'eu-west-1', '--preserveTempFiles']);
  });
});

describe('CLI argument parsing', () => {
  test.each(['--hotSwap', '--hs', '--hotSwap true', '--hotSwap=false', '--disableDriftDetection', '--ddd true'])(
    'accepts the Stacktape 3 deploy flag %s, ignores it and warns',
    (flag) => {
      const { commands, options, warnings } = parseCliInput(
        'deploy',
        '--stage',
        'dev',
        '--region',
        'eu-west-1',
        ...flag.split(' ')
      );
      expect(commands).toEqual(['deploy']);
      expect(options).toEqual({ stage: 'dev', region: 'eu-west-1' });
      expect(warnings).toEqual([expect.stringContaining('is ignored')]);
      expect(() => validateArgs({ rawArgs: options, command: 'deploy', defaults: {}, fromEnv: {} })).not.toThrow();
    }
  );

  test.each([
    [['--disableAutoRollback'], false],
    [['--dar'], false],
    [['--disableAutoRollback', 'true'], false],
    [['--dar=false'], true]
  ] as const)('reads %p as --auto-rollback=%p', (flag, autoRollback) => {
    const { options, warnings } = parseCliInput('deploy', '--stage', 'dev', ...flag);
    expect(options).toEqual({ stage: 'dev', autoRollback });
    expect(warnings).toEqual([expect.stringContaining('--auto-rollback=false')]);
  });

  test('a boolean value as the next word is a positional for commands that take one', () => {
    expect(parseCliInput('secret', 'set', '--force-update', 'false', '--value', 'x')).toMatchObject({
      commands: ['secret:set'],
      options: { forceUpdate: true, secretName: 'false', secretValue: 'x' }
    });
  });

  test('--agent false keeps agent mode off, before or after the command', () => {
    expect(parseCliInput('deploy', '--stage', 'dev', '--agent', 'false').options.agent).toBe(false);
    expect(parseCliInput('--agent', 'false', 'deploy', '--stage', 'dev').options.agent).toBe(false);
    expect(parseCliInput('--agent', 'true', 'compile-template', '--stage', 'dev')).toMatchObject({
      commands: ['synth'],
      options: { agent: true, stage: 'dev' }
    });
  });

  test('a Stacktape 3 boolean may carry its value as the next word', () => {
    expect(
      parseCliInput('deploy', '--stage', 'dev', '--autoConfirmOperation', 'true', '--noCache', 'false')
    ).toMatchObject({
      commands: ['deploy'],
      options: { stage: 'dev', autoConfirmOperation: true, noCache: false },
      warnings: []
    });
  });

  test.each(['--templateId', '--ti'])('refuses %s, whose Console templates v4 removed, with what to do', (flag) => {
    expect(() => parseCliInput('deploy', '--stage', 'dev', flag, 'cm-template')).toThrow(
      'Commit your configuration file to the repository'
    );
  });

  test('a renamed Stacktape 3 command runs the v4 command and warns', () => {
    expect(parseCliInput('compile-template', '--stage', 'dev')).toEqual({
      commands: ['synth'],
      options: { stage: 'dev' },
      additionalArgs: {},
      warnings: [
        '`compile-template` is the Stacktape 3 name of `stacktape synth`, which ran instead. Use the new name.'
      ]
    });
    // v4 synth reads local AWS credentials, not a connected account, so dropping the flag would change the account.
    expect(() => parseCliInput('compile-template', '--stage', 'dev', '--awsAccount', 'production')).toThrow(
      'Remove `--awsAccount`'
    );
    expect(parseCliInput('debug:logs', 'api', '--stage', 'dev')).toMatchObject({
      commands: ['logs'],
      options: { resourceName: 'api', stage: 'dev' }
    });
    expect(parseCliInput('preview-changes', '--help')).toMatchObject({
      commands: ['help'],
      options: { command: 'diff' }
    });
  });

  test('a removed Stacktape 3 command fails with its replacement', () => {
    expect(() => parseCliInput('codebuild:deploy', '--stage', 'dev')).toThrow(
      'no longer deploys through AWS CodeBuild'
    );
  });

  test('a flag v4 still defines is never read as its Stacktape 3 meaning', () => {
    expect(parseCliInput('deploy', '--stage', 'dev', '--aa', 'production', '--auto-rollback')).toMatchObject({
      options: { stage: 'dev', awsAccount: 'production', autoRollback: true },
      warnings: []
    });
  });

  test('parses repeated package workload selections as an array', () => {
    expect(parseCliInput('package', '--onlyWorkloads', 'api', '--onlyWorkloads', 'worker')).toMatchObject({
      commands: ['package'],
      options: { onlyWorkloads: ['api', 'worker'] }
    });
  });

  test('splits comma-delimited workload selections and discards blank values', () => {
    expect(parseCliInput('package', '--onlyWorkloads', ' api, worker, , ', '--onlyWorkloads', 'jobs,')).toMatchObject({
      commands: ['package'],
      options: { onlyWorkloads: ['api', 'worker', 'jobs'] }
    });
  });
});
