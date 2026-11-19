import { describe, expect, it } from 'bun:test';
import { changedLines } from './line-diff';

describe('the lines a change touched', () => {
  it.each([
    ['nothing', 'a\nb\nc', 'a\nb\nc', []],
    ['one value', 'a\nsize: small\nc', 'a\nsize: medium\nc', [2]],
    ['an inserted block', 'a\nb\nc', 'a\nb\nx\ny\nc', [3, 4]],
    ['a removed line only', 'a\nb\nc', 'a\nc', []],
    ['two separate places', 'a\nsize: 1\nb\nc\nd\nsize: 1\ne', 'a\nsize: 2\nb\nc\nd\nsize: 2\ne', [2, 6]]
  ])('%s', (_name, before, after, expected) => {
    expect(changedLines(before, after)).toEqual(expected);
  });
});
