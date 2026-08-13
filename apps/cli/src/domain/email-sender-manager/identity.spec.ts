import { describe, expect, test } from 'bun:test';
import { canonicalizeEmailIdentity } from './identity';

describe('email identity canonicalization', () => {
  test.each([
    [' Example.COM. ', 'example.com'],
    ['Billing@EXAMPLE.COM.', 'Billing@example.com'],
    ['müller.de', 'xn--mller-kva.de']
  ])('canonicalizes %s', (input, expected) => expect(canonicalizeEmailIdentity(input)).toBe(expected));

  test('preserves email local-part case and distinguishes a domain', () => {
    expect(canonicalizeEmailIdentity('Sales@example.com')).not.toBe(canonicalizeEmailIdentity('sales@example.com'));
    expect(canonicalizeEmailIdentity('sales@example.com')).not.toBe(canonicalizeEmailIdentity('example.com'));
  });

  test.each([
    '',
    '@example.com',
    'a@@example.com',
    'with space@example.com',
    '.leading@example.com',
    'bad-.com',
    'bad_domain.com',
    'localhost',
    'example..com',
    'example.com..'
  ])('rejects %s', (identity) => {
    expect(() => canonicalizeEmailIdentity(identity)).toThrow();
  });
});
