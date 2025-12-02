import { describe, expect, test } from 'bun:test';
import { resourceReferencableParams } from './resource-referencable-params';

describe('resource-referencable-params', () => {
  test('should have redisSharding function', () => {
    expect(typeof resourceReferencableParams.redisSharding).toBe('function');
  });

  test('redisSharding should return correct param name', () => {
    expect(resourceReferencableParams.redisSharding()).toBe('sharding');
  });

  test('redisSharding should return consistent value', () => {
    expect(resourceReferencableParams.redisSharding()).toBe(resourceReferencableParams.redisSharding());
  });
});
