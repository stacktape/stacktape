import { describe, expect, test } from 'bun:test';
import { __issueProcessorTestUtils as issueProcessor } from './index';

const event = (id: string, message: string, timestamp = 1) => ({ id, message, timestamp });

describe('issue processor parsing', () => {
  test('keeps adjacent TypeScript container errors separate while extracting stack frames', () => {
    const events = [
      event('1', 'Error: Container uncaught error from TypeScript'),
      event('2', '    at Array.<anonymous> (/_test-stacks/issues-e2e/src/ts-container/server.ts:9:9)'),
      event('3', '    at Hono2.#dispatch (/node_modules/hono/dist/hono-base.js:288:36)'),
      event('4', "TypeError: Cannot read properties of null (reading 'nonExistent')"),
      event('5', '    at Array.<anonymous> (/_test-stacks/issues-e2e/src/ts-container/server.ts:14:7)'),
      event('6', '    at Hono2.#dispatch (/node_modules/hono/dist/hono-base.js:288:36)')
    ];

    const first = issueProcessor.parseLogEventForErrors(events[0], events, 0);
    const second = issueProcessor.parseLogEventForErrors(events[3], events, 3);

    expect(first?.stackTrace[0]).toEqual({
      function: 'Array.<anonymous>',
      file: '/_test-stacks/issues-e2e/src/ts-container/server.ts',
      line: 9,
      column: 9
    });
    expect(second?.stackTrace[0]).toEqual({
      function: 'Array.<anonymous>',
      file: '/_test-stacks/issues-e2e/src/ts-container/server.ts',
      line: 14,
      column: 7
    });
    expect(second?.rawLog).not.toContain('Container uncaught error');
  });

  test('extracts Python frames that appear before the final error line', () => {
    const events = [
      event('1', 'Traceback (most recent call last):'),
      event('2', '  File "/app/app.py", line 14, in error'),
      event('3', '    raise ValueError("Python container ValueError with traceback")'),
      event('4', 'ValueError: Python container ValueError with traceback')
    ];

    const parsed = issueProcessor.parseLogEventForErrors(events[3], events, 3);

    expect(parsed?.errorMessage).toBe('ValueError: Python container ValueError with traceback');
    expect(parsed?.stackTrace[0]).toEqual({ function: 'error', file: '/app/app.py', line: 14, column: 0 });
  });

  test('parses Lambda runtime JSON stack traces', () => {
    const parsed = issueProcessor.parseLogMessageForError(
      '2026-04-24T12:00:00.000Z\tabc\tERROR\tInvoke Error\t{"errorType":"TypeError","errorMessage":"bad things","stack":["TypeError: bad things","    at handler (/var/task/index.js:4:3)"]}'
    );

    expect(parsed?.errorMessage).toBe('TypeError: bad things');
    expect(parsed?.errorType).toBe('uncaught');
    expect(parsed?.stackTrace[0]).toEqual({ function: 'handler', file: '/var/task/index.js', line: 4, column: 3 });
  });

  test('parses Go panic stack frames', () => {
    const parsed = issueProcessor.parseLogMessageForError(
      [
        'http: panic serving 10.0.0.1:12345: Go container panic with stack trace',
        'goroutine 12 [running]:',
        'main.handler({0x123, 0x456}, 0xc000)',
        '\t/app/main.go:12 +0x65'
      ].join('\n')
    );

    expect(parsed?.errorMessage).toContain('panic serving');
    expect(parsed?.stackTrace[0]).toEqual({ function: 'main.handler', file: '/app/main.go', line: 12, column: 0 });
  });

  test('keeps Go function/file pairs while extracting surrounding context', () => {
    const lines = [
      '2026/04/24 14:30:43 http: panic serving 10.0.0.1:12345: Go container panic with stack trace',
      'goroutine 20 [running]:',
      'net/http.(*conn).serve.func1()',
      '\t/usr/local/go/src/net/http/server.go:1907 +0xbd',
      'panic({0x69e380?, 0x720550?})',
      '\t/usr/local/go/src/runtime/panic.go:860 +0x13a',
      'main.handler({0x724d90?, 0xc000?}, 0xc000?)',
      '\t/dist/main.go:11 +0xca'
    ];

    const context = issueProcessor.extractRelevantContextLines(
      lines,
      'panic serving 10.0.0.1:12345: Go container panic with stack trace',
      0
    );
    const frames = issueProcessor.parseStackTraceMultiLang(context);

    expect(context).toHaveLength(lines.length);
    expect(frames.map((frame) => frame.function)).toContain('main.handler');
    expect(frames.map((frame) => frame.function)).toContain('net/http.(*conn).serve.func1');
  });

  test('treats PHP fatal line with trailing stack trace marker as incomplete context', () => {
    const parsed = issueProcessor.parseLogMessageForError(
      'Fatal error: Uncaught RuntimeException: PHP container RuntimeException with stack trace in /app/server.php:13 Stack trace:'
    );

    expect(parsed?.stackTrace).toHaveLength(1);
    expect(parsed && issueProcessor.shouldFetchLogContext(parsed)).toBe(true);
  });

  test('keeps PHP numbered stack lines while extracting surrounding context', () => {
    const lines = [
      'Fatal error: Uncaught RuntimeException: PHP container RuntimeException with stack trace in /app/server.php:13',
      'Stack trace:',
      '#0 {main}',
      '  thrown in /app/server.php on line 13'
    ];

    const context = issueProcessor.extractRelevantContextLines(
      lines,
      'Exception: PHP container RuntimeException with stack trace in /app/server.php:13',
      0
    );

    expect(context).toEqual(lines);
    expect(issueProcessor.parseStackTraceMultiLang(context)).toEqual([
      {
        function: '<main>',
        file: '/app/server.php',
        line: 13,
        column: 0
      }
    ]);
  });
});
