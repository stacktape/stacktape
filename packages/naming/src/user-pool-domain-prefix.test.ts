import { describe, expect, test } from 'bun:test';
import {
  getDefaultUserPoolDomainPrefix,
  getUserPoolDomainPrefix,
  getUserPoolDomainPrefixProblem
} from './domain-names';

describe('Cognito hosted UI domain prefix', () => {
  test.each([
    ['my-app-auth', undefined],
    ['a', undefined],
    ['x'.repeat(63), undefined],
    ['x'.repeat(64), 'lowercase letters'],
    ['My-App', 'lowercase letters'],
    ['-my-app', 'lowercase letters'],
    ['my-app-', 'lowercase letters'],
    ['my_app', 'lowercase letters'],
    ['my-cognito-app', '"cognito"'],
    ['myamazonapp', '"amazon"'],
    ['laws-app', '"aws"']
  ])('%s: %p', (prefix, problem) => {
    const result = getUserPoolDomainPrefixProblem(prefix);
    if (problem === undefined) expect(result).toBeUndefined();
    else expect(result).toContain(problem);
  });

  test('a default prefix that Cognito accepts stays the original one', () => {
    expect(getDefaultUserPoolDomainPrefix('My-Project-Dev', 'Customers')).toBe(
      getUserPoolDomainPrefix('My-Project-Dev', 'Customers')
    );
  });

  test.each([
    ['r2ao-cognito-dev', 'userPool'],
    ['shop-dev', 'awsCognitoPool'],
    ['aawsws-dev', 'auth'],
    ['cognito', 'aws'],
    [`${'long-project-name-'.repeat(4)}production`, 'customerAuthenticationPool']
  ])('a default prefix that Cognito rejects is replaced: %s-%s', (stackName, poolName) => {
    const prefix = getDefaultUserPoolDomainPrefix(stackName, poolName);
    expect(getUserPoolDomainPrefixProblem(prefix)).toBeUndefined();
    expect(getDefaultUserPoolDomainPrefix(stackName, poolName)).toBe(prefix);
  });

  test('replaced prefixes keep what Cognito accepts and stay distinct', () => {
    expect(getDefaultUserPoolDomainPrefix('r2ao-cognito-dev', 'userPool')).toMatch(/^r2ao-dev-userpool-[0-9a-f]{8}$/);
    expect(getDefaultUserPoolDomainPrefix('app-aws-dev', 'pool')).not.toBe(
      getDefaultUserPoolDomainPrefix('app-amazon-dev', 'pool')
    );
  });
});
