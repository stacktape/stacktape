import { describe, expect, test } from 'bun:test';
import { chooseConsoleHint, consoleHintsAllowed } from './console-hints';

const interactive = { environment: {}, stdoutIsTty: true, outputMode: 'tty', agent: false, quiet: false };

describe('consoleHintsAllowed', () => {
  test.each([
    ['an interactive terminal', interactive, true],
    ['a pipe', { ...interactive, stdoutIsTty: false }, false],
    ['plain output', { ...interactive, outputMode: 'plain' }, false],
    ['JSON output', { ...interactive, outputMode: 'jsonl' }, false],
    ['CI', { ...interactive, environment: { CI: 'true' } }, false],
    ['CI=false', { ...interactive, environment: { CI: 'false' } }, true],
    ['STP_NO_HINTS=1', { ...interactive, environment: { STP_NO_HINTS: '1' } }, false],
    ['agent mode', { ...interactive, agent: true }, false],
    ['--quiet', { ...interactive, quiet: true }, false]
  ] as const)('%s', (_name, input, expected) => {
    expect(consoleHintsAllowed(input)).toBe(expected);
  });
});

describe('chooseConsoleHint', () => {
  test('the first deploy of a project gets the history hint once', () => {
    expect(chooseConsoleHint({ shown: {}, projectName: 'shop', waitedForAnotherMachine: false })).toBe('firstDeploy');
    expect(
      chooseConsoleHint({ shown: { firstDeploy: ['shop'] }, projectName: 'shop', waitedForAnotherMachine: false })
    ).toBeUndefined();
    expect(
      chooseConsoleHint({ shown: { firstDeploy: ['shop'] }, projectName: 'blog', waitedForAnotherMachine: false })
    ).toBe('firstDeploy');
  });

  test("waiting for another machine's lock gets its own hint first, once per project", () => {
    expect(chooseConsoleHint({ shown: {}, projectName: 'shop', waitedForAnotherMachine: true })).toBe(
      'stackLockOfAnotherMachine'
    );
    expect(
      chooseConsoleHint({
        shown: { firstDeploy: ['shop'], stackLockOfAnotherMachine: ['shop'] },
        projectName: 'shop',
        waitedForAnotherMachine: true
      })
    ).toBeUndefined();
  });
});
