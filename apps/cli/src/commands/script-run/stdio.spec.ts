import { expect, test } from 'bun:test';
import { resolveScriptStdioMode } from './stdio';

test('scripts capture output unless the explicit mode or the legacy pipeStdio value says otherwise', () => {
  for (const [properties, expected] of [
    [{}, 'capture'],
    [{ pipeStdio: true }, 'capture'],
    [{ pipeStdio: false }, 'ignore'],
    [{ stdioMode: 'inherit', pipeStdio: false }, 'inherit'],
    [{ stdioMode: 'ignore', pipeStdio: true }, 'ignore']
  ] as const)
    expect(resolveScriptStdioMode(properties)).toBe(expected);
});
