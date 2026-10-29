import { describe, expect, test } from 'bun:test';
import { describeFunctionNotInSession, formatFunctionsNotInSessionNotice } from './functions-not-in-session';

const storedObjects = [
  { Key: 'worker/v000004-abcdef0123456789.zip', LastModified: new Date('2026-10-28T11:30:15Z') },
  { Key: 'worker/v000002-abcdef0123456789.zip', LastModified: new Date('2026-10-28T09:05:40Z') },
  { Key: 'worker/v000003-ffff.zip', LastModified: new Date('2026-10-27T08:00:00Z') },
  { Key: 'api/v000001-abcdef0123456789.zip', LastModified: new Date('2026-10-20T08:00:00Z') }
];

describe('status of a function the session leaves out', () => {
  test('names the artifact it runs and when the bucket first stored it', () => {
    expect(describeFunctionNotInSession({ name: 'worker', artifactDigest: 'abcdef0123456789', storedObjects })).toEqual(
      {
        name: 'worker',
        artifactDigest: 'abcdef0123456789',
        codeDeployedAt: '2026-10-28T09:05:40.000Z',
        message:
          'not in this session; runs the code deployed at 2026-10-28T09:05Z (artifact abcdef012345), which may differ from your current source'
      }
    );
  });

  test.each([
    ['its object is gone', 'deadbeef', /deployed earlier \(artifact deadbeef\)/],
    ['it has no digest tag', undefined, /runs the code deployed earlier, which may differ/],
    ['an update of its code was interrupted', 'updating', /did not finish/]
  ])('never claims a time when %s', (_case, artifactDigest, message) => {
    const status = describeFunctionNotInSession({ name: 'worker', artifactDigest, storedObjects });
    expect(status.codeDeployedAt).toBeUndefined();
    expect(status.message).toMatch(message);
  });

  test('one notice names every such function', () => {
    expect(formatFunctionsNotInSessionNotice([])).toBeUndefined();
    expect(
      formatFunctionsNotInSessionNotice([
        describeFunctionNotInSession({ name: 'worker', artifactDigest: 'abcdef0123456789', storedObjects }),
        describeFunctionNotInSession({ name: 'mailer', artifactDigest: undefined, storedObjects })
      ])
    ).toBe(
      'Functions not in this session keep running their deployed code, and changes to their source are not deployed: `worker` runs the code deployed at 2026-10-28T09:05Z (artifact abcdef012345), which may differ from your current source; `mailer` runs the code deployed earlier, which may differ from your current source. Start the session with a function selected to run your current source.'
    );
  });
});
