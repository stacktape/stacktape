import { describe, expect, it } from 'bun:test';
import { checkCredentials, digitsOfCode, organizationLabel, passwordResetUrl } from './sign-in';

describe('checkCredentials', () => {
  const cases: Array<{
    name: string;
    input: Parameters<typeof checkCredentials>[0];
    expected: ReturnType<typeof checkCredentials>;
  }> = [
    {
      name: 'accepts a new account with an eight-character password and nothing else required of it',
      input: { intent: 'sign-up', email: 'dev@example.com', password: 'abcdefgh' },
      expected: {}
    },
    {
      name: 'refuses a new password shorter than the pool allows',
      input: { intent: 'sign-up', email: 'dev@example.com', password: 'abcdefg' },
      expected: { password: 'Use at least 8 characters.' }
    },
    {
      name: 'does not judge the length of an existing password',
      input: { intent: 'sign-in', email: 'dev@example.com', password: 'short' },
      expected: {}
    },
    {
      name: 'asks for both fields when both are empty',
      input: { intent: 'sign-in', email: '  ', password: '' },
      expected: { email: 'Enter your email address.', password: 'Enter your password.' }
    },
    {
      name: 'refuses an address with no domain',
      input: { intent: 'sign-up', email: 'dev@example', password: '' },
      expected: { email: 'That does not look like an email address.', password: 'Choose a password.' }
    },
    {
      name: 'ignores spaces around the address',
      input: { intent: 'sign-in', email: ' dev@example.com ', password: 'x' },
      expected: {}
    }
  ];

  for (const { name, input, expected } of cases) {
    it(name, () => {
      expect(checkCredentials(input)).toEqual(expected);
    });
  }
});

describe('digitsOfCode', () => {
  it('keeps six digits however the code was typed or pasted', () => {
    expect(digitsOfCode('482913')).toBe('482913');
    expect(digitsOfCode('482 913')).toBe('482913');
    expect(digitsOfCode(' 482-913\n')).toBe('482913');
    expect(digitsOfCode('code: 4829137')).toBe('482913');
    expect(digitsOfCode('abc')).toBe('');
  });
});

describe('organizationLabel', () => {
  it('names the generated personal organization the way stacktape login does', () => {
    expect(organizationLabel('jane-doe-personal-org')).toBe('Personal');
    expect(organizationLabel('Acme')).toBe('Acme');
    expect(organizationLabel('personal-org-fans')).toBe('personal-org-fans');
  });
});

describe('passwordResetUrl', () => {
  it('carries the typed address, encoded, and works without one', () => {
    expect(passwordResetUrl(' jane+test@example.com ')).toBe(
      'https://console.stacktape.com/reset-password?email=jane%2Btest%40example.com'
    );
    expect(passwordResetUrl('')).toBe('https://console.stacktape.com/reset-password');
  });
});
