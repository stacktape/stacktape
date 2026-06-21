import { describe, expect, test } from 'bun:test';
import { normalizeLogLines } from '../utils';

describe('normalizeLogLines', () => {
  test('strips ANSI and carriage return from log lines', () => {
    expect(normalizeLogLines('\x1B[31mERROR\x1B[0m progress\r')).toEqual(['ERROR progress']);
  });

  test('splits multiline logs into individual lines', () => {
    expect(normalizeLogLines('line one\nline two\n')).toEqual(['line one', 'line two']);
  });

  test('collapses \\r progress-bar overwrites into the final frame', () => {
    expect(normalizeLogLines('progress 10%\rprogress 50%\rprogress 100%')).toEqual(['progress 100%']);
  });

  test('strips OSC sequences and expands tabs', () => {
    expect(normalizeLogLines('\x1B]0;title\x07col1\tcol2')).toEqual(['col1  col2']);
  });
});
