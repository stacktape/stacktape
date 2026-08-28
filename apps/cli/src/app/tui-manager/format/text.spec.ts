import { describe, expect, test } from 'bun:test';
import { visibleWidth } from './text';
import { wrapText } from './errors';

describe('native terminal width formatting', () => {
  test('ignores ANSI and OSC control sequences and measures emoji graphemes as terminal cells', () => {
    expect(visibleWidth('\x1b[31m👨‍👩‍👧\x1b[0m')).toBe(2);
    expect(visibleWidth('\x1b]8;;https://stacktape.com\x07Stacktape\x1b]8;;\x07')).toBe(9);
  });

  test('wraps wide Unicode words by terminal width rather than UTF-16 length', () => {
    expect(wrapText('ab 你好 cd', 4)).toEqual(['ab', '你好', 'cd']);
  });
});
