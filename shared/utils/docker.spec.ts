import { describe, expect, test } from 'bun:test';
import { handleDockerError } from './docker';

describe('docker utils', () => {
  test('handleDockerError should handle rate limit error', () => {
    const error = new Error('unauthenticated pull rate limit');
    expect(() => handleDockerError(error)).toThrow();
  });
});
