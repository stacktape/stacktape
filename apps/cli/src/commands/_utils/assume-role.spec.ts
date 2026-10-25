import { expect, test } from 'bun:test';
import { judgeAssumeRoleDenial } from './assume-role';

// STS answers the same while a new trust propagates and when the developer's own policy lacks sts:AssumeRole (measured
// on 25 Oct 2026). Only the second never passes, so it must fail fast with the permission to add instead of after 300 s,
// and nothing else may fail fast: a start that waiting would let succeed must keep waiting.
const stsDenial =
  'User: arn:aws:sts::123456789012:assumed-role/dev/me is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::123456789012:role/app-dev-api';
const denied = { decision: 'implicitDeny' as const, missingContextValues: [] };
const deniedWithoutMfa = { decision: 'explicitDeny' as const, missingContextValues: ['aws:MultiFactorAuthPresent'] };
const allowed = { decision: 'allowed' as const, missingContextValues: [] };

test.each([
  // The dev stack's trust in the account, with the developer in a condition.
  ['a fresh trust is waited for', { trust: 'account', trustSettled: false, waitedMs: 60_000 }, 'wait'],
  ['a fresh trust gives up after 300 s', { trust: 'account', trustSettled: false, waitedMs: 301_000 }, 'timeout'],
  [
    'a simulator denial before the trust settled is waited out',
    { trust: 'account', trustSettled: false, waitedMs: 0, simulation: denied },
    'wait'
  ],
  ['a settled trust is waited for briefly', { trust: 'account', trustSettled: true, waitedMs: 10_000 }, 'wait'],
  [
    'a denial past 30 s with a settled trust',
    { trust: 'account', trustSettled: true, waitedMs: 30_000 },
    'permissions'
  ],
  [
    'a simulator denial with a settled trust and complete context',
    { trust: 'account', trustSettled: true, waitedMs: 0, simulation: denied },
    'permissions'
  ],
  [
    'a simulator denial that lacked the MFA context is not decisive',
    { trust: 'account', trustSettled: true, waitedMs: 0, simulation: deniedWithoutMfa },
    'wait'
  ],
  [
    'policies the simulator allows keep a settled trust waiting',
    { trust: 'account', trustSettled: true, waitedMs: 60_000, simulation: allowed },
    'wait'
  ],
  // `script:run` names the caller in the trust, which allows the call without an identity policy.
  [
    'a simulator denial with a trust that names the caller',
    { trust: 'principal', trustSettled: true, waitedMs: 0, simulation: denied },
    'wait'
  ],
  [
    'a lasting denial with a trust that names the caller',
    { trust: 'principal', trustSettled: true, waitedMs: 60_000 },
    'wait'
  ],
  // A reason that AWS names is its own evaluation.
  [
    'a reason in the message',
    {
      trust: 'account',
      message: `${stsDenial} because no identity-based policy allows the sts:AssumeRole action`,
      trustSettled: false,
      waitedMs: 0
    },
    'permissions'
  ],
  [
    'an explicit deny in an organization policy',
    {
      trust: 'principal',
      message: `${stsDenial} with an explicit deny in a service control policy`,
      trustSettled: false,
      waitedMs: 0
    },
    'permissions'
  ]
] as const)('%s', (_name, input, verdict) => {
  expect(judgeAssumeRoleDenial({ message: stsDenial, ...input }).verdict).toBe(verdict);
});
