import { describe, expect, test } from 'bun:test';
import { getWorkflowDispatchArgs } from './trigger-release';

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
});
