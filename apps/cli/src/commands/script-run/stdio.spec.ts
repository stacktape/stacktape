import { describe, expect, test } from 'bun:test';
import { resolveScriptStdioMode } from './stdio';

describe('resolveScriptStdioMode', () => {
  test('captures output by default and for the legacy true value', () => {
    expect(resolveScriptStdioMode({})).toBe('capture');
    expect(resolveScriptStdioMode({ pipeStdio: true })).toBe('capture');
  });

  test('maps the legacy false value to ignored stdio', () => {
    expect(resolveScriptStdioMode({ pipeStdio: false })).toBe('ignore');
  });

  test('lets the explicit mode override the legacy setting', () => {
    expect(resolveScriptStdioMode({ stdioMode: 'inherit', pipeStdio: false })).toBe('inherit');
    expect(resolveScriptStdioMode({ stdioMode: 'ignore', pipeStdio: true })).toBe('ignore');
  });
});
