import { describe, expect, test } from 'bun:test';
import { outputNames } from './stack-output-names';

describe('stack-output-names', () => {
  test('all functions should return consistent values', () => {
    expect(outputNames.deploymentVersion()).toBe(outputNames.deploymentVersion());
    expect(outputNames.stackInfoMap()).toBe(outputNames.stackInfoMap());
  });
});
