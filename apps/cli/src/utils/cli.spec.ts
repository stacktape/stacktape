import { describe, expect, test } from 'bun:test';
import type { StacktapeArgs } from 'src/config/cli/types';
import { transformToCliArgs } from './cli';

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
