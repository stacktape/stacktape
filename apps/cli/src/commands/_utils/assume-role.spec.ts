import { expect, test } from 'bun:test';
import { judgeAssumeRoleDenial } from './assume-role';

// STS answers the same while a new trust propagates and when the developer's own policy lacks sts:AssumeRole (measured
// on 25 Oct 2026). Only the second never passes, so it must fail fast with the permission to add instead of after 300 s.
const stsDenial =
  'User: arn:aws:sts::123456789012:assumed-role/dev/me is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::123456789012:role/app-dev-api';

test.each([
  ['a fresh trust is waited for', { message: stsDenial, trustSettled: false, waitedMs: 60_000 }, 'wait'],
  ['a fresh trust gives up after 300 s', { message: stsDenial, trustSettled: false, waitedMs: 301_000 }, 'timeout'],
  ['a settled trust is waited for briefly', { message: stsDenial, trustSettled: true, waitedMs: 10_000 }, 'wait'],
  [
    'a denial past 30 s with a settled trust',
    { message: stsDenial, trustSettled: true, waitedMs: 30_000 },
    'permissions'
  ],
  [
    'a settled trust with policies the simulator allows keeps waiting',
    { message: stsDenial, trustSettled: true, waitedMs: 60_000, simulation: 'allowed' as const },
    'wait'
  ],
  [
    'the simulator finding no allowing statement',
    { message: stsDenial, trustSettled: false, waitedMs: 0, simulation: 'implicitDeny' as const },
    'permissions'
  ],
  [
    'a reason in the message',
    {
      message: `${stsDenial} because no identity-based policy allows the sts:AssumeRole action`,
      trustSettled: false,
      waitedMs: 0
    },
    'permissions'
  ],
  [
    'an explicit deny in an organization policy',
    { message: `${stsDenial} with an explicit deny in a service control policy`, trustSettled: false, waitedMs: 0 },
    'permissions'
  ]
])('%s', (_name, input, verdict) => {
  expect(judgeAssumeRoleDenial(input).verdict).toBe(verdict as 'wait');
});
