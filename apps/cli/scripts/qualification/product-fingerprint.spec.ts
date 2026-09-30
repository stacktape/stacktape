import { describe, expect, test } from 'bun:test';
import { fingerprintProductState } from './product-fingerprint';

const state = (untrackedFiles: { path: string; contents: string }[], trackedDiff = '') =>
  fingerprintProductState({
    commit: '0123abcd',
    trackedDiff,
    untrackedFiles: untrackedFiles.map(({ path, contents }) => ({ path, contents: Buffer.from(contents) }))
  });

describe('product fingerprint', () => {
  test('a path and its contents are not interchangeable with another path and contents', () => {
    expect(state([{ path: 'a.ts', contents: 'x// fixture\n' }])).not.toBe(
      state([{ path: 'a.tsx', contents: '// fixture\n' }])
    );
    // The tracked diff cannot absorb an untracked file either.
    expect(state([{ path: 'a', contents: 'b' }], 'diff')).not.toBe(state([], 'diffab'));
  });

  test('is independent of listing order and changes with any untracked content', () => {
    const files = [
      { path: 'b.ts', contents: 'two' },
      { path: 'a.ts', contents: 'one' }
    ];
    expect(state(files)).toBe(state(files.toReversed()));
    expect(state(files)).not.toBe(state([files[0]!, { path: 'a.ts', contents: 'changed' }]));
    expect(state(files)).not.toBe(state([files[0]!]));
  });
});
