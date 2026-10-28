import { describe, expect, it } from 'bun:test';
import { isOpenableSignInAddress, organizationLabel } from './sign-in';

describe('organizationLabel', () => {
  it('names the generated personal organization the way stacktape login does', () => {
    expect(organizationLabel('jane-doe-personal-org')).toBe('Personal');
    expect(organizationLabel('Acme')).toBe('Acme');
    expect(organizationLabel('personal-org-fans')).toBe('personal-org-fans');
  });
});

describe('isOpenableSignInAddress', () => {
  const cases: Array<[string, boolean]> = [
    ['https://console.stacktape.com/device?user_code=WDJB-MJHT', true],
    ['http://127.0.0.1:4000/device?user_code=WDJB-MJHT', true],
    ['http://localhost:4000/device', true],
    ['http://console.stacktape.com/device', false],
    ['javascript:alert(1)', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['/device', false],
    ['', false]
  ];

  for (const [address, expected] of cases) {
    it(`${expected ? 'opens' : 'refuses'} ${address || 'an empty address'}`, () => {
      expect(isOpenableSignInAddress(address)).toBe(expected);
    });
  }
});
