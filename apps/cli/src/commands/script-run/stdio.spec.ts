import { expect, test } from 'bun:test';
import { resolveScriptStdioMode } from './stdio';

test('scripts capture output unless stdioMode says otherwise', () => {
  for (const [properties, expected] of [
    [{}, 'capture'],
    [{ stdioMode: 'capture' }, 'capture'],
    [{ stdioMode: 'inherit' }, 'inherit'],
    [{ stdioMode: 'ignore' }, 'ignore']
  ] as const)
    expect(resolveScriptStdioMode(properties)).toBe(expected);
});
