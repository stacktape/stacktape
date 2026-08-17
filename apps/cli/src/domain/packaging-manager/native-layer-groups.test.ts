import { describe, expect, test } from 'bun:test';
import { groupCompatibleNativeDependencies } from './native-layer-groups';

const dependency = (name: string, version: string) => ({ name, version, hasBinary: true });

describe('split Lambda native dependency layers', () => {
  test('isolates divergent nested dependency versions while sharing compatible requirements', () => {
    expect(
      groupCompatibleNativeDependencies([
        { lambdaName: 'a-v1', dependencies: [dependency('fake-native', '1.0.0')] },
        { lambdaName: 'b-v2', dependencies: [dependency('fake-native', '2.0.0')] },
        { lambdaName: 'c-v1-plus', dependencies: [dependency('fake-native', '1.0.0'), dependency('sharp', '1.2.3')] }
      ])
    ).toEqual([
      {
        lambdaNames: ['a-v1', 'c-v1-plus'],
        dependencies: [dependency('fake-native', '1.0.0'), dependency('sharp', '1.2.3')]
      },
      { lambdaNames: ['b-v2'], dependencies: [dependency('fake-native', '2.0.0')] }
    ]);
  });

  test('fails rather than silently choosing a version when one Lambda needs both', () => {
    expect(() =>
      groupCompatibleNativeDependencies([
        {
          lambdaName: 'conflicted',
          dependencies: [dependency('fake-native', '1.0.0'), dependency('fake-native', '2.0.0')]
        }
      ])
    ).toThrow('requires incompatible versions');
  });
});
