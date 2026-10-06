import { describe, expect, test } from 'bun:test';
import { identityFrom } from './stacktape-account';

describe('the identity the wizard shows after signing in', () => {
  test('is read from the result `info:whoami --agent` prints', () => {
    // The shape of a real result event's data, reduced to the fields that matter here.
    const data = {
      result: {
        user: { id: 'user-1', name: 'Jane Doe', email: 'jane@acme.test' },
        organization: { id: 'org-1', name: 'Acme' },
        role: 'Owner',
        connectedAwsAccounts: []
      }
    };

    expect(identityFrom(data)).toEqual({ email: 'jane@acme.test', organization: 'Acme' });
  });

  test.each([
    [undefined],
    [null],
    ['text'],
    [{}],
    [{ result: null }],
    [{ result: { user: 'jane', organization: 7 } }],
    [{ result: { user: { email: '' }, organization: { name: '' } } }],
    // The fields at the top level are not where the CLI puts them.
    [{ user: { email: 'jane@acme.test' }, organization: { name: 'Acme' } }]
  ])('is empty for %j', (data) => {
    expect(identityFrom(data)).toEqual({});
  });
});
