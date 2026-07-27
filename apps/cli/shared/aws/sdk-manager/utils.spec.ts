import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('@shared/utils/misc', () => ({
  getRandomNumberFromInterval: mock(() => 2.0),
  wait: mock(async () => {}),
  stringMatchesGlob: mock(() => false)
}));

mock.module('change-case', () => ({
  pascalCase: mock((str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()))
}));

describe('sdk-manager/utils', () => {
  describe('isBucketNativelySupportedHeader', () => {
    test('should return true for ContentDisposition', async () => {
      const { isBucketNativelySupportedHeader } = await import('./utils');

      expect(isBucketNativelySupportedHeader('ContentDisposition')).toBe(true);
    });

    test('should return true for ContentEncoding', async () => {
      const { isBucketNativelySupportedHeader } = await import('./utils');

      expect(isBucketNativelySupportedHeader('ContentEncoding')).toBe(true);
    });

    test('should return true for ContentLanguage', async () => {
      const { isBucketNativelySupportedHeader } = await import('./utils');

      expect(isBucketNativelySupportedHeader('ContentLanguage')).toBe(true);
    });

    test('should return true for Expires', async () => {
      const { isBucketNativelySupportedHeader } = await import('./utils');

      expect(isBucketNativelySupportedHeader('Expires')).toBe(true);
    });

    test('should return false for unsupported headers', async () => {
      const { isBucketNativelySupportedHeader } = await import('./utils');

      expect(isBucketNativelySupportedHeader('Authorization')).toBe(false);
      expect(isBucketNativelySupportedHeader('Custom-Header')).toBe(false);
    });
  });

  describe('automaticUploadFilterPresets', () => {
    test('should have gatsby-static-website preset', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      expect(automaticUploadFilterPresets['gatsby-static-website']).toBeDefined();
      expect(Array.isArray(automaticUploadFilterPresets['gatsby-static-website'])).toBe(true);
    });

    test('should have static-website preset', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      expect(automaticUploadFilterPresets['static-website']).toBeDefined();
    });

    test('should have single-page-app preset', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      expect(automaticUploadFilterPresets['single-page-app']).toBeDefined();
    });

    test('gatsby preset should have HTML cache-control rules', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      const gatsbyPreset = automaticUploadFilterPresets['gatsby-static-website'];
      const htmlRule = gatsbyPreset.find((r) => r.includePattern === '**/*.html');

      expect(htmlRule).toBeDefined();
      expect(htmlRule.headers).toBeDefined();
      expect(htmlRule.headers.some((h) => h.key === 'cache-control')).toBe(true);
    });

    test('gatsby preset should have immutable cache for static files', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      const gatsbyPreset = automaticUploadFilterPresets['gatsby-static-website'];
      const staticRule = gatsbyPreset.find((r) => r.includePattern === 'static/**/*');

      expect(staticRule).toBeDefined();
      expect(staticRule.headers.some((h) => h.value.includes('immutable'))).toBe(true);
    });

    test('static-website preset should have wildcard pattern', async () => {
      const { automaticUploadFilterPresets } = await import('./utils');

      const staticPreset = automaticUploadFilterPresets['static-website'];

      expect(staticPreset.some((r) => r.includePattern === '**/*')).toBe(true);
    });
  });

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

  describe('retryPlugin', () => {
    test('should have applyToStack method', async () => {
      const { retryPlugin } = await import('./utils');

      expect(retryPlugin.applyToStack).toBeDefined();
      expect(typeof retryPlugin.applyToStack).toBe('function');
    });
  });

  describe('redirectPlugin', () => {
    test('should have applyToStack method', async () => {
      const { redirectPlugin } = await import('./utils');

      expect(redirectPlugin.applyToStack).toBeDefined();
      expect(typeof redirectPlugin.applyToStack).toBe('function');
    });
  });
});
