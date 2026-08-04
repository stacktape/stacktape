import { describe, expect, test } from 'bun:test';
import { getGloballyUniqueStackHash } from './stack-identity';

describe('getGloballyUniqueStackHash', () => {
  test.each([
    {
      region: 'eu-west-1',
      stackName: 'my-project-production',
      accountId: '123456789012',
      expected: 'de773011'
    },
    {
      region: 'us-east-1',
      stackName: 'project-dev',
      accountId: '000000000000',
      expected: '5ea3305e'
    },
    {
      region: '',
      stackName: '',
      accountId: '',
      expected: '1505'
    }
  ])('preserves the historical hash for $region/$stackName/$accountId', ({ expected, ...input }) => {
    expect(getGloballyUniqueStackHash(input)).toBe(expected);
  });

  test('preserves the separator-free historical input contract', () => {
    expect(
      getGloballyUniqueStackHash({
        region: 'ab',
        stackName: 'c',
        accountId: ''
      })
    ).toBe(
      getGloballyUniqueStackHash({
        region: 'a',
        stackName: 'bc',
        accountId: ''
      })
    );
  });
});
