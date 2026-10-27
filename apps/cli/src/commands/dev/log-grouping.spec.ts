import { expect, test } from 'bun:test';
import { createLogLineGrouper, detectLogLevel } from './log-grouping';

const collect = async (stream: 'stdout' | 'stderr', lines: string[]) => {
  const entries: { message: string; level: string }[] = [];
  const grouper = createLogLineGrouper({ stream, onEntry: (message, level) => entries.push({ message, level }) });
  for (const line of lines) grouper.push(line);
  grouper.flush();
  return entries;
};

// One AWS SDK error printed by `console.error(error)` in a local container, as the r2l dogfood run recorded it: it
// became 26 `warn` entries, and `logs {level: "warn", limit: 5}` returned five fragments of it.
const sdkError = [
  'AccessDeniedException: User: arn:aws:sts::123456789012:assumed-role/app-dev-api/local is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-2:123456789012:table/events',
  '    at ProtocolLib.getErrorSchemaOrThrowBaseException (file:///app/dist/index.js:41020:61)',
  '    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)',
  '    at async file:///app/dist/index.js:66653:3 {',
  "  '$fault': 'client',",
  "  '$metadata': {",
  '    httpStatusCode: 400,',
  '    attempts: 1',
  '  },',
  "  __type: 'com.amazon.coral.service#AccessDeniedException'",
  '}'
];

test('a multi-line error becomes one error entry, and the next message its own', async () => {
  const entries = await collect('stderr', [...sdkError, ...sdkError, 'api listening on 3000']);
  expect(entries).toEqual([
    { message: sdkError.join('\n'), level: 'error' },
    { message: sdkError.join('\n'), level: 'error' },
    { message: 'api listening on 3000', level: 'warn' }
  ]);
});

test('a Python traceback ends with its unindented exception line', async () => {
  const traceback = [
    'Traceback (most recent call last):',
    '  File "/app/main.py", line 3, in <module>',
    '    import missing',
    "ModuleNotFoundError: No module named 'missing'"
  ];
  expect(await collect('stderr', [...traceback, 'INFO:     Started server process [1]'])).toEqual([
    { message: traceback.join('\n'), level: 'error' },
    { message: 'INFO:     Started server process [1]', level: 'info' }
  ]);
});

test("Node's uncaught error keeps the source line with its caret and the stack together", async () => {
  const crash = [
    '/app/dist/index.js:10',
    "    throw new Error('boom');",
    '    ^',
    '',
    'Error: boom',
    '    at main (/app/dist/index.js:10:11)'
  ];
  expect(await collect('stderr', crash)).toEqual([{ message: crash.filter(Boolean).join('\n'), level: 'error' }]);
});

// r2y review: a Go crash is one error entry, including its unindented `goroutine` lines; `log.Panic` logs its message
// before the panic.
test('a Go panic and its goroutine dump become one error entry', async () => {
  const crash = [
    'panic: runtime error: index out of range [3] with length 3',
    '',
    'goroutine 1 [running]:',
    'main.main()',
    '\t/app/main.go:12 +0x1d',
    'exit status 2'
  ];
  expect(await collect('stderr', crash)).toEqual([{ message: crash.filter(Boolean).join('\n'), level: 'error' }]);
  const logPanic = ['2026/10/27 13:18:28 config missing', 'panic: config missing', '', 'goroutine 1 [running]:'];
  expect(await collect('stderr', logPanic)).toEqual([{ message: logPanic.filter(Boolean).join('\n'), level: 'error' }]);
});

test('lines that arrive after a pause start a new entry', async () => {
  const entries: string[] = [];
  const grouper = createLogLineGrouper({ stream: 'stdout', onEntry: (message) => entries.push(message), quietMs: 10 });
  grouper.push('Error: first');
  await new Promise((resolve) => setTimeout(resolve, 40));
  expect(entries).toEqual(['Error: first']);
  grouper.push('  indented, but much later');
  grouper.flush();
  expect(entries).toEqual(['Error: first', '  indented, but much later']);
});

test.each([
  ['{"level":50,"msg":"db down"}', 'stdout', 'error'],
  ['{"level":"warn","msg":"slow"}', 'stdout', 'warn'],
  ['{"level":30,"msg":"ok"}', 'stderr', 'info'],
  ['ERROR:root:payment failed', 'stderr', 'error'],
  ['[warn] deprecated option', 'stdout', 'warn'],
  ['12:00:01 INFO request handled', 'stderr', 'info'],
  ['2026-10-25T10:00:00.000Z ERROR request failed', 'stdout', 'error'],
  ['TypeError: x is not a function', 'stdout', 'error'],
  ['(node:1) DeprecationWarning: Buffer() is deprecated', 'stderr', 'warn'],
  ['Unhandled promise rejection', 'stdout', 'error'],
  ['errorHandler registered', 'stdout', 'info'],
  ['GET /notes 200 3 ms', 'stdout', 'info'],
  ['npm notice New version available', 'stderr', 'warn'],
  ['2026/10/27 13:18:28 ERROR scan orders: AccessDeniedException', 'stderr', 'error'],
  ['2026/10/27 13:18:28.123456 WARN slow scan', 'stderr', 'warn'],
  ['2026/10/27 13:18:28 main.go:42: ERROR scan orders', 'stderr', 'error'],
  ['2026/10/27 13:18:28 order created: 42', 'stderr', 'info'],
  ['2026/10/27 13:18:28.123456 listening on :8080', 'stderr', 'info'],
  ['time=2026-10-27T13:18:28.123+01:00 level=ERROR msg="scan orders" err="AccessDeniedException"', 'stderr', 'error'],
  ['time=2026-10-27T13:18:28.123+01:00 level=WARN msg="slow scan"', 'stderr', 'warn'],
  ['time=2026-10-27T13:18:28.123+01:00 level=INFO msg="order created"', 'stderr', 'info'],
  ['time="2026-10-27T13:18:28+01:00" level=error msg="scan orders"', 'stdout', 'error'],
  ['panic: runtime error: index out of range', 'stderr', 'error'],
  ['fatal error: concurrent map writes', 'stderr', 'error'],
  ['2026/10/27 13:18:28 http: panic serving 127.0.0.1:52144: runtime error: invalid memory address', 'stderr', 'error'],
  ['2026/10/27 13:18:28 failed to open config.yaml: no such file or directory', 'stderr', 'error'],
  ['2026/10/27 13:18:28 main.go:31: could not connect to redis: connection refused', 'stderr', 'error'],
  ['2026/10/27 13:18:28 [error] 29#29: *1 connect() failed (111: Connection refused)', 'stderr', 'error'],
  ['2026/10/27 13:18:28 [crit] 29#29: *1 open() "/var/cache/nginx" failed (13: Permission denied)', 'stderr', 'error'],
  ['2026/10/27 13:18:28 [emerg] 1#1: bind() to 0.0.0.0:80 failed (98: Address already in use)', 'stderr', 'error'],
  ['2026/10/27 13:18:28 [alert] 1#1: worker process 30 exited on signal 9', 'stderr', 'error'],
  ['2026/10/27 13:18:28 [notice] 1#1: start worker processes', 'stderr', 'info'],
  ['TypeError: cannot read properties of undefined level="debug"', 'stdout', 'error'],
  ['Traceback (most recent call last): level=info', 'stderr', 'error']
] as const)('%s on %s is %s', (line, stream, level) => {
  expect(detectLogLevel(line, stream)).toBe(level);
});
