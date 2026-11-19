import { describe, expect, test } from 'bun:test';
import { connectionNameFor, earlierAttemptsFor } from './connection-name';

describe('connectionNameFor', () => {
  test.each([
    [[], 'aws-111122223333'],
    [['aws-account', 'aws-444455556666'], 'aws-111122223333'],
    [['aws-111122223333'], 'aws-111122223333-2'],
    [['aws-111122223333', 'aws-111122223333-2'], 'aws-111122223333-3']
  ])('taken %p gives %s', (takenNames, expected) => {
    expect(connectionNameFor({ awsAccountId: '111122223333', takenNames })).toBe(expected);
  });
});

describe('earlierAttemptsFor', () => {
  test("lists this account's attempts that were not active, and no other connection", () => {
    const connections = [
      { id: 'a', name: 'aws-111122223333', state: 'PENDING' },
      { id: 'b', name: 'aws-111122223333-2', state: 'FAILED' },
      { id: 'c', name: 'aws-111122223333-3', state: 'ACTIVE', awsAccountId: '111122223333' },
      { id: 'd', name: 'aws-1111222233334', state: 'PENDING' },
      { id: 'e', name: 'aws-account', state: 'PENDING' }
    ];
    expect(earlierAttemptsFor({ awsAccountId: '111122223333', connections }).map(({ id }) => id)).toEqual(['a', 'b']);
  });
});
