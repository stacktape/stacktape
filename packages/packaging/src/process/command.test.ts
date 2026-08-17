import { describe, expect, test } from 'bun:test';
import { parseCommand } from './command';

describe('build command parsing', () => {
  test('preserves quotes, JSON arguments, and escaped spaces without a shell', () => {
    expect(parseCommand('tool --mode "production preview" --define=NAME="Stack Tape"')).toEqual([
      'tool',
      '--mode',
      'production preview',
      '--define=NAME=Stack Tape'
    ]);
    expect(parseCommand(`tool --json '{"label":"two words"}' path\\ with\\ spaces`)).toEqual([
      'tool',
      '--json',
      '{"label":"two words"}',
      'path with spaces'
    ]);
  });

  test('rejects empty commands and unterminated quotes', () => {
    expect(() => parseCommand('   ')).toThrow('cannot be empty');
    expect(() => parseCommand('tool "unfinished')).toThrow('unterminated quote');
  });
});
