import { describe, expect, test } from 'bun:test';

describe('sdk-manager/utils', () => {
  describe('defaultGetErrorFunction', () => {
    test('should throw the error passed to it', async () => {
      const { defaultGetErrorFunction } = await import('./utils');

      const errorHandler = defaultGetErrorFunction('Test message');
      const testError = new Error('Test error');

      expect(() => errorHandler(testError)).toThrow(testError);
    });
  });

  describe('transformToCliArgs', () => {
    test('should convert boolean true to flag', async () => {
      const { transformToCliArgs } = await import('./utils');

      const result = transformToCliArgs({ verbose: true } as any);

      expect(result).toContain('--verbose');
    });

    test('should skip boolean false', async () => {
      const { transformToCliArgs } = await import('./utils');

      const result = transformToCliArgs({ verbose: false } as any);

      expect(result).not.toContain('--verbose');
    });

    test('should convert string values', async () => {
      const { transformToCliArgs } = await import('./utils');

      const result = transformToCliArgs({ stage: 'dev' } as any);

      expect(result).toContain('--stage');
      expect(result).toContain('dev');
    });

    test('should handle multiple args', async () => {
      const { transformToCliArgs } = await import('./utils');

      const result = transformToCliArgs({
        stage: 'prod',
        region: 'us-east-1',
        verbose: true
      } as any);

      expect(result).toContain('--stage');
      expect(result).toContain('prod');
      expect(result).toContain('--region');
      expect(result).toContain('us-east-1');
      expect(result).toContain('--verbose');
    });

    test('should preserve arg order', async () => {
      const { transformToCliArgs } = await import('./utils');

      const result = transformToCliArgs({ first: '1', second: '2' } as any);

      const firstIndex = result.indexOf('--first');
      const secondIndex = result.indexOf('--second');

      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });
});
