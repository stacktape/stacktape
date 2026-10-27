import { expect, test } from 'bun:test';
import { getLogReadStart, mapLambdaTaskPaths, MAX_CATCH_UP_MS } from './function-logs';

const now = Date.parse('2026-10-27T17:36:23Z');

// r2cc finding 5: a scheduled run failed 16 s before the restarted session read logs, and the dev log never showed it.
test.each([
  ['the first session of a stage reads from now', undefined, now],
  ['a restart reads from where the previous session ended', now - 16_000, now - 16_000],
  ['a session that ended long ago is read back only to the cap', now - 3_600_000, now - MAX_CATCH_UP_MS],
  ['an end time after now (a clock skew) reads from now', now + 5000, now]
])('%s', (_, previousSessionEnd, start) => {
  expect(getLogReadStart({ previousSessionEnd, now })).toBe(start);
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
