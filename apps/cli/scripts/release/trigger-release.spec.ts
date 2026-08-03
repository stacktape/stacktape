import { describe, expect, test } from 'bun:test';
import { getWorkflowDispatchArgs, parseReleaseArgs } from './trigger-release';

describe('release workflow dispatcher', () => {
  test('binds the selected channel, immutable version and source ref to the v4 workflow', () => {
    expect(getWorkflowDispatchArgs({ channel: 'preview', ref: 'v4/integration', version: '4.0.0-preview.7' })).toEqual([
      'workflow',
      'run',
      'release.yml',
      '--repo',
      'stacktape/stacktape',
      '--ref',
      'v4/integration',
      '-f',
      'channel=preview',
      '-f',
      'version=4.0.0-preview.7'
    ]);
  });

  test('accepts the ergonomic positional version used by root release scripts', () => {
    expect(parseReleaseArgs(['--channel', 'preview', '4.0.0-preview.7'])).toEqual({
      channel: 'preview',
      version: '4.0.0-preview.7',
      ref: undefined
    });
  });

  test('retains explicit version and ref options for direct use', () => {
    expect(parseReleaseArgs(['--channel', 'stable', '--version', '4.0.0', '--ref', 'main'])).toEqual({
      channel: 'stable',
      version: '4.0.0',
      ref: 'main'
    });
  });

  test('rejects ambiguous duplicate version arguments', () => {
    expect(() => parseReleaseArgs(['--channel', 'stable', '--version', '4.0.0', '4.0.1'])).toThrow(
      'Pass the release version once'
    );
  });
});
