import { describe, expect, test } from 'bun:test';
import { generateMdxDevMode } from './starters-mdx';

describe('starter project dev guidance', () => {
  test('uses the current resource-selection option for container and function starters', () => {
    const containerGuidance = generateMdxDevMode({
      usedResourceTypes: ['multi-container-workload'],
      usedResources: [
        {
          name: 'api',
          type: 'multi-container-workload',
          containerNames: ['web', 'sidecar']
        }
      ]
    });
    const functionGuidance = generateMdxDevMode({
      usedResourceTypes: ['function'],
      usedResources: [{ name: 'worker', type: 'function', containerNames: [] }]
    });

    expect(containerGuidance).toContain('--resources api');
    expect(functionGuidance).toContain('--resources worker');

    for (const guidance of [containerGuidance, functionGuidance]) {
      expect(guidance).not.toContain('--resourceName');
      expect(guidance).not.toContain('--container');
    }
  });
});
