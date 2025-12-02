import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('./yaml', () => ({
  parseYaml: mock((yamlStr) => {
    if (yamlStr.includes('serviceName')) {
      return {
        serviceName: 'my-api',
        resources: {
          mainFunction: {
            type: 'function',
            properties: {
              memory: 1024
            }
          }
        }
      };
    }
    return {};
  })
}));

describe('stacktape-config', () => {
  describe('getTypescriptConfig', () => {
    test('should convert YAML to TypeScript config', async () => {
      const { getTypescriptConfig } = await import('./stacktape-config');

      const yamlConfig = `
serviceName: my-api
resources:
  mainFunction:
    type: function
    properties:
      memory: 1024
`;

      const result = getTypescriptConfig(yamlConfig);

      expect(result).toContain('GetConfigFunction');
      expect(result).toContain('@stacktape/sdk');
      expect(result).toContain('export const getConfig');
    });

    test('should remove quotes from property names', async () => {
      const { getTypescriptConfig } = await import('./stacktape-config');

      const yamlConfig = 'serviceName: test';
      const result = getTypescriptConfig(yamlConfig);

      expect(result).not.toContain('"serviceName"');
      expect(result).toContain('serviceName');
    });

    test('should indent object properly', async () => {
      const { getTypescriptConfig } = await import('./stacktape-config');

      const yamlConfig = 'test: value';
      const result = getTypescriptConfig(yamlConfig);

      expect(result).toContain('  return {');
      expect(result).toContain('  };');
    });

    test('should create valid TypeScript', async () => {
      const { getTypescriptConfig } = await import('./stacktape-config');

      const yamlConfig = 'serviceName: my-service';
      const result = getTypescriptConfig(yamlConfig);

      expect(result).toMatch(/import type \{ GetConfigFunction \}/);
      expect(result).toMatch(/export const getConfig: GetConfigFunction/);
      expect(result).toContain('return {');
    });
  });
});
