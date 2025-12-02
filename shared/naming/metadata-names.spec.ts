import { describe, expect, test } from 'bun:test';
import { stackMetadataNames } from './metadata-names';

describe('metadata-names', () => {
  test('all metadata name functions should return consistent strings', () => {
    expect(stackMetadataNames.imageCount()).toBe('imageCount');
    expect(stackMetadataNames.functionCount()).toBe('functionCount');
    expect(stackMetadataNames.deploymentBucket()).toBe('deploymentBucket');
    expect(stackMetadataNames.budgetName()).toBe('budgetName');
    expect(stackMetadataNames.cloudformationRoleArn()).toBe('cloudformationRoleArn');
    expect(stackMetadataNames.stackConsole()).toBe('stackConsole');
    expect(stackMetadataNames.name()).toBe('name');
    expect(stackMetadataNames.createdTime()).toBe('createdTime');
    expect(stackMetadataNames.lastUpdatedTime()).toBe('lastUpdatedTime');
    expect(stackMetadataNames.monthToDateSpend()).toBe('monthToDateSpend');
    expect(stackMetadataNames.monthForecastedSpend()).toBe('monthForecastedSpend');
    expect(stackMetadataNames.natPublicIps()).toBe('natPublicIps');
  });

  test('should have stable metadata keys for backward compatibility', () => {
    expect(stackMetadataNames.atlasMongoPrivateTypesMajorVersionUsed()).toBe('mongoDbModuleMajorVersion');
    expect(stackMetadataNames.upstashRedisPrivateTypesMajorVersionUsed()).toBe('upstashRedisModuleMajorVersion');
  });

  test('all functions should return strings', () => {
    const allNames = [
      stackMetadataNames.imageCount(),
      stackMetadataNames.functionCount(),
      stackMetadataNames.deploymentBucket(),
      stackMetadataNames.budgetName()
    ];

    allNames.forEach((name) => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });
});
