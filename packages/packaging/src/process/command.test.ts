import { describe, expect, test } from 'bun:test';
import { parseCommand, shellInvocation } from './command';

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

describe('shell invocation', () => {
  test('runs a chained build command through the platform shell', async () => {
    const [command, args] = shellInvocation('echo first && echo second');
    const { stdout } = Bun.spawnSync([command, ...args]);
    // cmd.exe echoes the space before `&&`; the lines are compared trimmed.
    expect(
      stdout
        .toString()
        .trim()
        .split(/\r?\n/)
        .map((line) => line.trim())
    ).toEqual(['first', 'second']);
    expect(() => shellInvocation('  ')).toThrow('cannot be empty');
  });
});
