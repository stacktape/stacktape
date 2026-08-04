import { describe, expect, test } from 'bun:test';
import type { StacktapeArgs } from 'src/config/cli/types';
import { getCliInput, transformToCliArgs } from './cli';

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
      disableDriftDetection: false
    } satisfies StacktapeArgs;

    expect(transformToCliArgs(args)).toEqual(['--stage', 'production', '--region', 'eu-west-1', '--preserveTempFiles']);
  });
});

describe('CLI argument parsing', () => {
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
