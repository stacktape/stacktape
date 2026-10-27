import { describe, expect, test } from 'bun:test';
import { parseLambdaLogLine } from './lambda-log-lines';

// Real CloudWatch events, captured on 25 Oct 2026 from throwaway functions in us-west-2 (nodejs22.x, python3.12,
// java21, dotnet8, text and JSON log formats). The r2p dogfood run lost Python errors because they were logged at
// `info`, so `logs {level: "error"}` found nothing.
const REQUEST = '8a2f78ef-6d6d-4606-8ba1-7ef0494f7bed';
const levels: Array<[runtime: string, message: string, level: 'info' | 'warn' | 'error']> = [
  ['node', `2026-10-25T23:46:36.780Z\t${REQUEST}\tINFO\tplain log line\n`, 'info'],
  ['node', `2026-10-25T23:46:36.783Z\t${REQUEST}\tWARN\twarn line\n`, 'warn'],
  ['node', `2026-10-25T23:46:36.783Z\t${REQUEST}\tERROR\terror line\n`, 'error'],
  [
    'node',
    `2026-10-25T23:46:36.783Z\t${REQUEST}\tERROR\tError: logged error object\n    at Runtime.handler (file:///var/task/index.mjs:6:17)\n`,
    'error'
  ],
  [
    'node',
    `2026-10-25T23:46:37.735Z\t${REQUEST}\tERROR\tInvoke Error \t{"errorType":"Error","errorMessage":"node handler threw","stack":["Error: node handler threw","    at Runtime.handler (file:///var/task/index.mjs:7:37)"]}\n`,
    'error'
  ],
  [
    'node',
    `2026-10-25T23:46:38.708Z\t${REQUEST}\tERROR\tUnhandled Promise Rejection \t{"errorType":"Runtime.UnhandledPromiseRejection","errorMessage":"Error: unhandled rejection"}\n`,
    'error'
  ],
  [
    'node json',
    `{"timestamp":"2026-10-25T23:46:44.055Z","level":"WARN","requestId":"${REQUEST}","message":"warn line"}`,
    'warn'
  ],
  [
    'node json',
    `{"timestamp":"2026-10-25T23:46:45.010Z","level":"ERROR","requestId":"${REQUEST}","message":{"errorType":"Error","errorMessage":"node handler threw","stackTrace":["Error: node handler threw"]}}`,
    'error'
  ],
  ['python', 'plain print line\n', 'info'],
  ['python', `[INFO]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging info line\n`, 'info'],
  ['python', `[WARNING]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging warning line\n`, 'warn'],
  ['python', `[ERROR]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging error line\n`, 'error'],
  ['python', `[CRITICAL]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging critical line\n`, 'error'],
  [
    'python',
    `[ERROR]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging exception line\nTraceback (most recent call last):\n  File "/var/task/main.py", line 12, in handler\n    {}['missing']\nKeyError: 'missing'`,
    'error'
  ],
  [
    'python',
    `[ERROR] KeyError: 'requestContext'\nTraceback (most recent call last):\n\u00a0\u00a0File "/var/task/main.py", line 16, in handler\n\u00a0\u00a0\u00a0\u00a0return event['requestContext']['http']['method']`,
    'error'
  ],
  [
    'python',
    '[WARNING]\t2026-10-25T23:47:05.554Z\t\tLAMBDA_WARNING: Unhandled exception. The most likely cause is an issue in the function code.',
    'error'
  ],
  [
    'python',
    `[ERROR] Runtime.UserCodeSyntaxError: Syntax error in module 'broken': '(' was never closed (broken.py, line 1)\nTraceback (most recent call last):\n\u00a0\u00a0File "/var/task/broken.py" Line 1\n\u00a0\u00a0\u00a0\u00a0def handler(event, context:`,
    'error'
  ],
  [
    'python',
    "[ERROR] Runtime.ImportModuleError: Unable to import module 'main': no pq wrapper available.\nAttempts made:\n- couldn't import psycopg 'c' implementation: No module named 'psycopg_c'",
    'error'
  ],
  [
    'python json',
    `{"timestamp": "2026-10-25T23:46:59Z", "level": "WARNING", "message": "logging warning line", "logger": "root", "requestId": "${REQUEST}"}\n`,
    'warn'
  ],
  [
    'python json',
    `{"timestamp": "2026-10-25T23:46:59Z", "log_level": "ERROR", "errorMessage": "'requestContext'", "errorType": "KeyError", "requestId": "${REQUEST}", "stackTrace": ["  File \\"/var/task/main.py\\", line 16, in handler\\n"]}`,
    'error'
  ],
  ['java', 'java stdout line\n', 'info'],
  [
    'java',
    'java handler threw: java.lang.IllegalStateException\njava.lang.IllegalStateException: java handler threw\n\tat example.Handler.handleRequest(Handler.java:8)\n\tat java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(Unknown Source)\n\tat java.base/java.lang.reflect.Method.invoke(Unknown Source)\n',
    'error'
  ],
  [
    'java',
    'Cannot invoke "String.trim()" because "<local3>" is null: java.lang.NullPointerException\njava.lang.NullPointerException: Cannot invoke "String.trim()" because "<local3>" is null\n\tat example.Handler.handleRequest(Handler.java:9)\n',
    'error'
  ],
  [
    'dotnet',
    'Error: .NET binaries for Lambda function are not correctly installed in the /var/task directory of the image when the image was built. The /var/task directory is missing the required .deps.json file.\n',
    'error'
  ],
  // The .NET ILambdaLogger levels (`info`, `warn`, `fail`, `crit`), in the runtime's documented tab format.
  ['dotnet', `2026-10-25T23:47:10.100Z\t${REQUEST}\tinfo\tprocessing order 42\n`, 'info'],
  ['dotnet', `2026-10-25T23:47:10.100Z\t${REQUEST}\twarn\tretrying order 42\n`, 'warn'],
  [
    'dotnet',
    `2026-10-25T23:47:10.100Z\t${REQUEST}\tfail\tSystem.InvalidOperationException: boom\n   at Orders.Function.Handler(Stream input)\n`,
    'error'
  ],
  ['any', `2026-10-25T23:47:10.100Z ${REQUEST} Task timed out after 3.00 seconds\n`, 'error'],
  // pino and bunyan write to stdout directly, with numeric levels (#343 review).
  ['node pino', '{"level":60,"time":1761436030100,"pid":8,"hostname":"169.254.1.1","msg":"cannot start"}\n', 'error'],
  ['node pino', '{"level":50,"time":1761436030100,"pid":8,"hostname":"169.254.1.1","msg":"payment failed"}\n', 'error'],
  ['node pino', '{"level":40,"time":1761436030100,"pid":8,"hostname":"169.254.1.1","msg":"slow query"}\n', 'warn'],
  ['node pino', '{"level":30,"time":1761436030100,"pid":8,"hostname":"169.254.1.1","msg":"order 42"}\n', 'info'],
  [
    'node bunyan',
    '{"name":"orders","hostname":"169.254.1.1","pid":8,"level":50,"msg":"database down","time":"2026-10-25T23:47:10.100Z","v":0}\n',
    'error'
  ],
  // A line the function prints that only mentions an error is not one (#343 review); an error with its stack is.
  ['python', 'Error: payment provider unreachable, retrying in 2 s\n', 'info'],
  ['node', 'Error: config value missing, using the default\n', 'info'],
  [
    'node',
    "TypeError: Cannot read properties of undefined (reading 'id')\n    at handler (/var/task/index.js:3:20)\n",
    'error'
  ]
];

describe('Lambda log line levels', () => {
  test.each(levels)('%s: %j', (_runtime, message, level) => {
    const line = parseLambdaLogLine(message);
    expect(line.kind).toBe('entry');
    expect(line.kind === 'entry' && line.level).toBe(level);
  });

  test('Node and Python lines keep their request ID; Node error records are marked for formatting', () => {
    expect(parseLambdaLogLine(`[ERROR]\t2026-10-25T23:46:51.180Z\t${REQUEST}\tlogging error line\n`)).toEqual({
      kind: 'entry',
      level: 'error',
      requestId: REQUEST,
      logType: '[ERROR]',
      content: 'logging error line'
    });
    expect(
      parseLambdaLogLine(`2026-10-25T23:46:37.735Z\t${REQUEST}\tERROR\tInvoke Error \t{"errorMessage":"x"}`)
    ).toMatchObject({ requestId: REQUEST, logType: 'Invoke Error', nodeErrorRecord: true, level: 'error' });
  });

  test('a JVM stack trace is not read as a tab-separated line', () => {
    const line = parseLambdaLogLine(
      'boom: java.lang.IllegalStateException\njava.lang.IllegalStateException: boom\n\tat a.B.c(B.java:1)\n\tat d.E.f(E.java:2)\n\tat g.H.i(H.java:3)'
    );
    expect(line).toMatchObject({ kind: 'entry', level: 'error' });
    expect(line.kind === 'entry' && line.requestId).toBeUndefined();
  });
});

describe('Lambda platform lines', () => {
  test.each([
    [
      `REPORT RequestId: ${REQUEST}\tDuration: 6.96 ms\tBilled Duration: 147 ms\tMemory Size: 512 MB\tMax Memory Used: 71 MB\tInit Duration: 139.24 ms\t\n`,
      {
        kind: 'report',
        requestId: REQUEST,
        duration: '6.96 ms',
        memoryUsed: '71 MB',
        initDuration: '139.24 ms',
        level: 'info'
      }
    ],
    [
      `REPORT RequestId: ${REQUEST}\tDuration: 18.34 ms\tBilled Duration: 19 ms\tMemory Size: 512 MB\tMax Memory Used: 72 MB\tStatus: error\tError Type: Runtime.ExitError\n`,
      { kind: 'report', status: 'error', errorType: 'Runtime.ExitError', level: 'error' }
    ],
    [
      `REPORT RequestId: ${REQUEST}\tDuration: 3000.00 ms\tBilled Duration: 3000 ms\tMemory Size: 512 MB\tMax Memory Used: 72 MB\tStatus: timeout\n`,
      { kind: 'report', status: 'timeout', level: 'error' }
    ],
    [
      'INIT_REPORT Init Duration: 158.11 ms\tPhase: init\tStatus: error\tError Type: Runtime.UserCodeSyntaxError\n',
      {
        kind: 'init-report',
        initDuration: '158.11 ms',
        status: 'error',
        errorType: 'Runtime.UserCodeSyntaxError',
        level: 'error'
      }
    ],
    [
      `{"time":"2026-10-25T23:46:50.058Z","type":"platform.report","record":{"requestId":"${REQUEST}","metrics":{"durationMs":3000.0,"billedDurationMs":3000,"memorySizeMB":512,"maxMemoryUsedMB":72},"status":"timeout"}}`,
      { kind: 'report', requestId: REQUEST, status: 'timeout', level: 'error' }
    ],
    [`START RequestId: ${REQUEST} Version: $LATEST\n`, { kind: 'start', requestId: REQUEST }],
    [`END RequestId: ${REQUEST}\n`, { kind: 'end', requestId: REQUEST }],
    [
      'INIT_START Runtime Version: python:3.12.mainlinev2.v43\tRuntime Version ARN: arn:aws:lambda:us-west-2::runtime:36ae\n',
      { kind: 'skip' }
    ],
    [
      `{"time":"2026-10-25T23:46:45.009Z","type":"platform.start","record":{"requestId":"${REQUEST}","version":"$LATEST"}}`,
      { kind: 'start', requestId: REQUEST }
    ]
  ])('%j', (message, expected) => {
    expect(parseLambdaLogLine(message)).toMatchObject(expected);
  });
});
