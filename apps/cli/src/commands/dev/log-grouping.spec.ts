import { expect, test } from 'bun:test';
import { createLogLineGrouper, detectLogLevel, isFrontendServerFailure } from './log-grouping';

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
  ['Traceback (most recent call last): level=info', 'stderr', 'error'],
  ['⨯ Error: orders service is down', 'stderr', 'error'],
  ['⚠ Invalid next.config.mjs options detected', 'stderr', 'warn'],
  [' GET /orders 500 in 280ms (next.js: 153ms, application-code: 127ms)', 'stdout', 'error'],
  [' GET /orders 404 in 12ms', 'stdout', 'warn'],
  [' GET /orders 200 in 12ms', 'stdout', 'info'],
  ['\u001b[1;31m[500] GET /\u001b[0m', 'stderr', 'error'],
  // r2gg finding 10: gunicorn writes every line to standard error after a bracketed timestamp and process ID.
  ['[2026-10-28 00:17:51 +0000] [1] [INFO] Starting gunicorn 23.0.0', 'stderr', 'info'],
  ['[2026-10-28 00:17:51 +0000] [7] [INFO] Booting worker with pid: 7', 'stderr', 'info'],
  ['[2026-10-28 00:17:51 +0000] [1] [ERROR] Worker (pid:7) exited with code 3', 'stderr', 'error'],
  ['[2026-10-28 00:17:51 +0000] [1] [WARNING] Worker with pid 7 was terminated due to signal 9', 'stderr', 'warn'],
  ['$ astro dev', 'stderr', 'info']
] as const)('%s on %s is %s', (line, stream, level) => {
  expect(detectLogLevel(line, stream)).toBe(level);
});

// r2cc finding 4: frontend dev servers' output reached the dev log one line per entry at `info`, so `logs {level:
// "error"}` never showed a server error. These are a SvelteKit 2 (Vite 6) and a Next.js 16 server error as their dev
// servers print them, with the colors dev mode asks for (FORCE_COLOR).
const esc = '\u001b';
test('a SvelteKit server error becomes error entries with the request it failed', async () => {
  const stderr = [
    '',
    `${esc}[1;31m[500] GET /${esc}[0m`,
    'TypeError: fetch failed',
    'stats unavailable: Error: connect ECONNREFUSED 127.0.0.1:2',
    `${esc}[90m    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1705:16)${esc}[39m {`,
    `  errno: ${esc}[33m-111${esc}[39m,`,
    `  code: ${esc}[32m'ECONNREFUSED'${esc}[39m,`,
    `  port: ${esc}[33m2${esc}[39m`,
    '}'
  ];
  const entries = await collect('stderr', stderr);
  expect(entries.map(({ level }) => level)).toEqual(['error', 'error']);
  expect(entries[0]!.message).toBe(stderr.slice(1, 3).join('\n'));
  expect(entries[1]!.message).toBe(stderr.slice(3).join('\n'));
});

test('a Next.js server error keeps its stack, code frame and digest in one error entry', async () => {
  const stderr = [
    `${esc}[31m${esc}[1m⨯${esc}[22m${esc}[39m Error: orders service is down`,
    '    at Page (app/page.tsx:7:19)',
    `  ${esc}[90m 6 |${esc}[0m   });`,
    `${esc}[31m${esc}[1m>${esc}[0m ${esc}[90m 7 |${esc}[0m   if (!res) throw new Error('orders service is down');`,
    `  ${esc}[90m   |${esc}[0m                   ${esc}[31m${esc}[1m^${esc}[0m`,
    `  ${esc}[90m 8 |${esc}[0m   return <main>ok</main>;`,
    `  ${esc}[90m 9 |${esc}[0m }`,
    `  ${esc}[90m10 |${esc}[0m {`,
    `  digest: ${esc}[32m'2333882437'${esc}[39m`,
    '}',
    `${esc}[33m${esc}[1m⚠${esc}[22m${esc}[39m Slow filesystem detected.`
  ];
  expect(await collect('stderr', stderr)).toEqual([
    { message: stderr.slice(0, -1).join('\n'), level: 'error' },
    { message: stderr.at(-1)!, level: 'warn' }
  ]);
  // Its access log lines on standard output are separate entries, also when they arrive together.
  const stdout = [`${esc}[32m${esc}[1m✓${esc}[22m${esc}[39m Ready in 333ms`, ` GET / ${esc}[31m500${esc}[39m in 280ms`];
  expect((await collect('stdout', stdout)).map(({ level }) => level)).toEqual(['info', 'error']);
});

// r2gg finding 10: Bun's uncaught error arrived as five `warn` entries of its code frame and then the `error` entry.
test("Bun's code frame, error, stack and version line become one error entry", async () => {
  const lines = [
    '82 | // Warming the price cache takes a few seconds; the API listens only after it.',
    '83 | const warmupMs = Number(process.env.WARMUP_MS ?? 12000);',
    '84 | await migrate();',
    `87 | const cache = JSON.parse(process.env.PRICE_CACHE_SEED ?? '{"version":');`,
    '                        ^',
    'SyntaxError: JSON Parse error: Unexpected EOF',
    '      at /app/dist/apps/api/src/index.ts:87:20',
    '',
    'Bun v1.3.4 (Linux x64)'
  ];
  const entries = await collect('stderr', ['warming the price cache for 12000 ms', ...lines, 'next start']);
  expect(entries).toEqual([
    { message: 'warming the price cache for 12000 ms', level: 'warn' },
    { message: lines.filter((line) => line).join('\n'), level: 'error' },
    { message: 'next start', level: 'warn' }
  ]);
  const thrown = [
    "error: Access denied for user 'stacktape'@'%' to database 'shelf'",
    '       code: "ER_DBACCESS_DENIED_ERROR"'
  ];
  expect(
    await collect('stderr', [...thrown, '      at migrate (/app/dist/db.ts:28:44)', 'Bun v1.3.4 (Linux x64)'])
  ).toEqual([
    {
      message: [...thrown, '      at migrate (/app/dist/db.ts:28:44)', 'Bun v1.3.4 (Linux x64)'].join('\n'),
      level: 'error'
    }
  ]);
});

// r2cc finding 4 and r2gg finding 10: Astro's page code logged `console.error('creating an item failed: …')`, which a
// frontend's dev server logs as `error`; its other standard error stays `warn`.
test.each([
  ['creating an item failed: 500 {"error":"internal error"}', true],
  ['quote for sku-1 failed with 502', true],
  ['could not reach the API: connect ECONNREFUSED 127.0.0.1:3000', true],
  ['\u001b[33mwatching for file changes...\u001b[0m', false],
  ['  ➜  Local:   http://localhost:4321/', false],
  // #380 review: summaries that count no failures are no failure.
  ['Found 0 errors. Watching for file changes.', false],
  ['[types] no type errors', false],
  ['Tests: 12 passed, 0 failed', false],
  ['errors: 0, warnings: 2', false],
  ['Found 2 errors. Watching for file changes.', true],
  ['0 tests ran, then the build failed: missing entry', true]
] as const)('frontend standard error %s is a failure: %s', (line, failure) => {
  expect(isFrontendServerFailure(line)).toBe(failure);
});

// #380 review: the level pattern's optional prefixes tried every split point of a long line without separators, which
// took 1.6 s on the main thread for a 100 000-character line that starts with `[`.
test.each([
  ['an unclosed bracket', `[${'1'.repeat(100_000)}`],
  ['brackets and digits', `[${'a1'.repeat(50_000)}`],
  ['no spaces', '1:00'.repeat(25_000)],
  ['many bracketed numbers', `${'[1] '.repeat(25_000)}x`]
])('a 100 000-character line with %s gets its level in linear time', (_, line) => {
  const started = performance.now();
  for (const stream of ['stdout', 'stderr'] as const) detectLogLevel(line, stream);
  isFrontendServerFailure(line);
  expect(performance.now() - started).toBeLessThan(50);
});
