import { describe, expect, test } from 'bun:test';
import { describeFunctionNotInSession, formatFunctionsNotInSessionNotice } from './functions-not-in-session';

describe('status of a function the session leaves out', () => {
  test('names the artifact it runs and when its code was deployed to the function', () => {
    expect(
      describeFunctionNotInSession({
        name: 'worker',
        artifactDigest: 'abcdef0123456789',
        lastModified: '2026-10-28T09:05:40.123+0000'
      })
    ).toEqual({
      name: 'worker',
      artifactDigest: 'abcdef0123456789',
      codeDeployedAt: '2026-10-28T09:05:40.123Z',
      message:
        'not in this session; runs the code deployed at 2026-10-28T09:05Z (artifact abcdef012345), which may differ from your current source'
    });
  });

  test.each([
    ['the function could not be read', 'deadbeef', undefined, /deployed earlier \(artifact deadbeef\)/],
    ['it has no digest tag', undefined, undefined, /runs the code deployed earlier, which may differ/],
    ['an update of its code was interrupted', 'updating', '2026-10-28T09:05:40.123+0000', /did not finish/]
  ])('never claims a time when %s', (_case, artifactDigest, lastModified, message) => {
    const status = describeFunctionNotInSession({ name: 'worker', artifactDigest, lastModified });
    expect(status.codeDeployedAt).toBeUndefined();
    expect(status.message).toMatch(message);
  });

  test('one notice names every such function', () => {
    expect(formatFunctionsNotInSessionNotice([])).toBeUndefined();
    expect(
      formatFunctionsNotInSessionNotice([
        describeFunctionNotInSession({
          name: 'worker',
          artifactDigest: 'abcdef0123456789',
          lastModified: '2026-10-28T09:05:40.123+0000'
        }),
        describeFunctionNotInSession({ name: 'mailer', artifactDigest: undefined, lastModified: undefined })
      ])
    ).toBe(
      'Functions not in this session keep running their deployed code, and changes to their source are not deployed: `worker` runs the code deployed at 2026-10-28T09:05Z (artifact abcdef012345), which may differ from your current source; `mailer` runs the code deployed earlier, which may differ from your current source. Start the session with a function selected to run your current source.'
    );
  });
});
