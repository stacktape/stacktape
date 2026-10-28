import { expect, test } from 'bun:test';
import {
  CATCH_UP_OVERLAP_MS,
  getLogReadStart,
  labelCatchUpLine,
  mapLambdaTaskPaths,
  MAX_CATCH_UP_MS,
  parseSessionEnd,
  serializeSessionEnd
} from './function-logs';

const now = Date.parse('2026-10-27T17:36:23Z');

// r2cc finding 5: a scheduled run failed 16 s before the restarted session read logs, and the dev log never showed it.
test.each([
  ['the first session of a stage reads from now', undefined, now],
  ['a restart after an older CLI reads from where it ended', { end: now - 16_000 }, now - 16_000],
  [
    'a restart reads the overlap before the end, whose shown events the previous session recorded',
    { end: now - 16_000, shownEvents: {} },
    now - 16_000 - CATCH_UP_OVERLAP_MS
  ],
  [
    'a previous session that ran shorter than the overlap is read back to where it started reading',
    { end: now - 16_000, overlapStart: now - 40_000, shownEvents: {} },
    now - 40_000
  ],
  ['a session that ended long ago is read back only to the cap', { end: now - 3_600_000 }, now - MAX_CATCH_UP_MS],
  ['an end time after now (a clock skew) reads from now', { end: now + 5000, shownEvents: {} }, now]
])('%s', (_, previousSessionEnd, start) => {
  expect(getLogReadStart({ previousSessionEnd, now })).toBe(start);
});

test('the session end file is JSON, and the bare time of an older CLI still reads', () => {
  const sessionEnd = {
    end: now,
    shownEvents: { '/aws/lambda/app-dev-quote': [['3794', now - 500]] as [string, number][] }
  };
  expect(parseSessionEnd(serializeSessionEnd(sessionEnd))).toEqual(sessionEnd);
  expect(parseSessionEnd(`${now}\n`)).toEqual({ end: now });
  expect(parseSessionEnd('')).toBeUndefined();
  expect(parseSessionEnd('{"end":"x"}')).toBeUndefined();
});

// r2cc: `processReceipt`'s error frame named `/var/task/process_receipt.py` instead of `workers/process_receipt.py`.
test("an error frame in /var/task names the function's project file", () => {
  const workingDirectory = '/home/dev/receipts';
  const sourceFiles = [
    '/home/dev/receipts/workers/process_receipt.py',
    '/home/dev/receipts/workers/db/__init__.py',
    '/home/dev/receipts/workers/__init__.py'
  ];
  const message = [
    "[ERROR] KeyError: 'receipt_id'",
    'Traceback (most recent call last):',
    '  File "/var/task/process_receipt.py", line 14, in handler',
    '  File "/var/task/db/__init__.py", line 3, in <module>',
    '  File "/var/task/psycopg/connection.py", line 119, in connect',
    '  File "/var/task/__init__.py", line 1'
  ].join('\n');
  expect(mapLambdaTaskPaths({ message, sourceFiles, workingDirectory })).toBe(
    [
      "[ERROR] KeyError: 'receipt_id'",
      'Traceback (most recent call last):',
      '  File "workers/process_receipt.py", line 14, in handler',
      '  File "workers/db/__init__.py", line 3, in <module>',
      '  File "/var/task/psycopg/connection.py", line 119, in connect',
      '  File "/var/task/__init__.py", line 1'
    ].join('\n')
  );
  expect(
    mapLambdaTaskPaths({
      message: 'at handler (/var/task/functions/stats.ts:12:5)',
      sourceFiles: ['/home/dev/receipts/functions/stats.ts'],
      workingDirectory
    })
  ).toBe('at handler (functions/stats.ts:12:5)');
});

// r2gg: a function invoked while no dev session ran timed out, and the next session showed only "Status: timeout".
test('a timeout between two sessions says that no session was running', () => {
  const timeout = '> 2026-10-28T00:48:55.684+01:00 END (request ID: e329) duration: 20000.00 ms. Status: timeout.';
  expect(labelCatchUpLine({ message: timeout, timestamp: now - 1000, previousSessionEnd: now - 20_000 })).toBe(
    `(before this session was ready) ${timeout} No dev session was running for this stage then, so the local resources it reaches through the dev box did not answer.`
  );
  // In the overlap before the previous session's end, that session was running.
  expect(labelCatchUpLine({ message: timeout, timestamp: now - 30_000, previousSessionEnd: now - 20_000 })).toBe(
    `(before this session was ready) ${timeout}`
  );
  expect(labelCatchUpLine({ message: 'START', timestamp: now - 1000, previousSessionEnd: now - 20_000 })).toBe(
    '(before this session was ready) START'
  );
});
