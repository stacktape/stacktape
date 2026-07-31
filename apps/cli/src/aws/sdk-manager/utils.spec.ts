import { describe, expect, test } from 'bun:test';

describe('defaultGetErrorFunction', () => {
  test('throws the error passed to it', async () => {
    const { defaultGetErrorFunction } = await import('./utils');
    const testError = new Error('Test error');

    expect(() => defaultGetErrorFunction('Test message')(testError)).toThrow(testError);
  });
});
