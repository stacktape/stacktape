import { expect, test } from 'bun:test';
import { normalizeLogLines } from '../utils';

test('dev log lines drop terminal controls, split lines, keep the final progress frame and expand tabs', () => {
  for (const [input, expected] of [
    ['\x1B[31mERROR\x1B[0m progress\r', ['ERROR progress']],
    ['line one\nline two\n', ['line one', 'line two']],
    ['progress 10%\rprogress 50%\rprogress 100%', ['progress 100%']],
    ['\x1B]0;title\x07col1\tcol2', ['col1  col2']]
  ] as const)
    expect(normalizeLogLines(input)).toEqual([...expected]);
});
