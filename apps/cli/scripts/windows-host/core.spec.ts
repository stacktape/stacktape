import { describe, expect, test } from 'bun:test';
import {
  assertAwsProfile,
  assertTaskId,
  buildWindowsCommandLine,
  buildWslEnv,
  componentsFromRoot,
  encodeKeys,
  mergeWindowsPath,
  quoteWindowsArgument,
  selectPassThroughNames,
  stripTerminalSequences,
  toWindowsPath,
  toWslPath,
  windowsTaskPaths
} from './core';

/**
 * Independent parser for the Microsoft C runtime rules (post-2008 `CommandLineToArgvW` behavior): 2n backslashes +
 * quote -> n backslashes and a quote toggle; 2n+1 backslashes + quote -> n backslashes and a literal quote; `""`
 * inside quotes -> literal quote.
 */
const parseWindowsCommandLine = (commandLine: string): string[] => {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let hasArgument = false;
  for (let index = 0; index < commandLine.length; index++) {
    const character = commandLine[index];
    if (character === '\\') {
      let count = 0;
      while (commandLine[index] === '\\') {
        count++;
        index++;
      }
      if (commandLine[index] === '"') {
        current += '\\'.repeat(Math.floor(count / 2));
        if (count % 2 === 1) {
          current += '"';
        } else {
          index--;
        }
      } else {
        current += '\\'.repeat(count);
        index--;
      }
      hasArgument = true;
    } else if (character === '"') {
      if (inQuotes && commandLine[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      hasArgument = true;
    } else if ((character === ' ' || character === '\t') && !inQuotes) {
      if (hasArgument) {
        args.push(current);
      }
      current = '';
      hasArgument = false;
    } else {
      current += character;
      hasArgument = true;
    }
  }
  if (hasArgument) {
    args.push(current);
  }
  return args;
};

describe('quoteWindowsArgument', () => {
  test.each([
    ['plain', 'plain'],
    ['', '""'],
    ['a b', '"a b"'],
    ['c"d', '"c\\"d"'],
    ['C:\\Program Files\\x\\', '"C:\\Program Files\\x\\\\"'],
    ['e\\', 'e\\'],
    ['f\\"g', '"f\\\\\\"g"'],
    ['%PATH%&x', '%PATH%&x']
  ])('%j -> %j', (argument, expected) => {
    expect(quoteWindowsArgument(argument)).toBe(expected);
  });

  test('round-trips arguments through the C runtime parsing rules', () => {
    const alphabet = ['a', ' ', '\t', '"', '\\', '&', '%', "'", 'é'];
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
    for (let round = 0; round < 2000; round++) {
      const args = Array.from({ length: 1 + (next() % 4) }, () =>
        Array.from({ length: next() % 8 }, () => alphabet[next() % alphabet.length]).join('')
      );
      expect(parseWindowsCommandLine(buildWindowsCommandLine('C:\\x\\stacktape.exe', args))).toEqual([
        'C:\\x\\stacktape.exe',
        ...args
      ]);
    }
  });
});

describe('paths', () => {
  test.each([
    ['C:\\stacktape-wsl\\r2at', '/mnt/c/stacktape-wsl/r2at'],
    ['c:/Users/x/', '/mnt/c/Users/x'],
    ['D:', '/mnt/d']
  ])('toWslPath(%j)', (windowsPath, expected) => {
    expect(toWslPath(windowsPath)).toBe(expected);
  });

  test('toWslPath rejects UNC and relative paths', () => {
    expect(() => toWslPath('\\\\wsl.localhost\\Ubuntu\\tmp')).toThrow();
    expect(() => toWslPath('projects\\x')).toThrow();
  });

  test.each([
    ['/mnt/c/stacktape-wsl/r2at/', 'C:\\stacktape-wsl\\r2at'],
    ['/mnt/d', 'D:\\'],
    ['/home/u/project', '\\\\wsl.localhost\\Ubuntu-24.04\\home\\u\\project']
  ])('toWindowsPath(%j)', (linuxPath, expected) => {
    expect(toWindowsPath(linuxPath, 'Ubuntu-24.04')).toBe(expected);
  });

  test('toWindowsPath needs the distribution for WSL paths', () => {
    expect(() => toWindowsPath('/tmp/x')).toThrow(/distribution/);
  });

  test('task paths live under C:\stacktape-wsl, which cannot be changed', () => {
    expect(windowsTaskPaths('r2at')).toEqual({
      task: 'C:\\stacktape-wsl\\r2at',
      cli: 'C:\\stacktape-wsl\\r2at\\cli',
      exe: 'C:\\stacktape-wsl\\r2at\\cli\\stacktape.exe',
      projects: 'C:\\stacktape-wsl\\r2at\\projects',
      logs: 'C:\\stacktape-wsl\\r2at\\logs',
      tools: 'C:\\stacktape-wsl\\r2at\\tools'
    });
    for (const taskId of ['', '..', 'a\\b', 'R2AT', 'a b', 'a&b', 'x'.repeat(33)]) {
      expect(() => assertTaskId(taskId)).toThrow();
    }
  });

  test('lists every component from the root down, so each can be checked for links', () => {
    expect(componentsFromRoot('C:\\stacktape-wsl\\r2at\\projects\\app')).toEqual([
      'C:\\stacktape-wsl',
      'C:\\stacktape-wsl\\r2at',
      'C:\\stacktape-wsl\\r2at\\projects',
      'C:\\stacktape-wsl\\r2at\\projects\\app'
    ]);
    expect(componentsFromRoot('c:/stacktape-wsl/')).toEqual(['C:\\stacktape-wsl']);
    for (const path of [
      'C:\\R&D',
      'C:\\stacktape-wsl-other\\x',
      'C:\\stacktape-wsl\\r2at\\..\\..\\Users',
      'D:\\stacktape-wsl\\r2at',
      '\\\\server\\share'
    ]) {
      expect(() => componentsFromRoot(path)).toThrow();
    }
  });
});

describe('environment pass-through', () => {
  const environment = {
    AWS_PROFILE: 'stacktape-e2e',
    AWS_REGION: 'eu-north-1',
    STACKTAPE_DEV_NETWORK_SUFFIX: 'r2at',
    STACKTAPE_API_KEY: 'secret-value',
    DOCKER_HOST: 'unix:///var/run/docker.sock',
    PATH: '/usr/bin',
    HOME: '/home/u',
    EXTRA: 'x'
  };

  test('passes AWS profile, region and STACKTAPE_* names, never WSL-side settings', () => {
    expect(selectPassThroughNames({ environment })).toEqual([
      'AWS_PROFILE',
      'AWS_REGION',
      'STACKTAPE_API_KEY',
      'STACKTAPE_DEV_NETWORK_SUFFIX'
    ]);
    expect(selectPassThroughNames({ environment, extraNames: ['EXTRA', 'MISSING'] })).toContain('EXTRA');
    for (const name of ['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_CONTEXT', 'STP_DEV_MODE', 'WSLENV']) {
      expect(() => selectPassThroughNames({ environment, extraNames: [name] })).toThrow(/WSL side/);
    }
    expect(() => selectPassThroughNames({ environment, extraNames: ['A=B'] })).toThrow(/Invalid/);
  });

  test('WSLENV forwards each name one way and drops inherited entries for the same names', () => {
    // An inherited AWS_PROFILE/u would keep AWS_PROFILE from reaching Windows.
    expect(buildWslEnv({ names: ['AWS_PROFILE', 'PATH'], existing: 'AWS_PROFILE/u:GOPATH/l:PATH/l' })).toBe(
      'GOPATH/l:AWS_PROFILE/w:PATH/w'
    );
    expect(buildWslEnv({ names: ['AWS_PROFILE'] })).toBe('AWS_PROFILE/w');
    expect(buildWslEnv({ names: ['AWS_PROFILE', 'AWS_PROFILE'], existing: '::' })).toBe('AWS_PROFILE/w');
  });

  test('requires an allowed AWS profile', () => {
    expect(assertAwsProfile({ AWS_PROFILE: 'stacktape-e2e' }, ['stacktape-e2e'])).toBe('stacktape-e2e');
    expect(() => assertAwsProfile({}, ['stacktape-e2e'])).toThrow(/default profile/);
    expect(() => assertAwsProfile({ AWS_PROFILE: 'default' }, ['stacktape-e2e'])).toThrow(/not allowed/);
  });
});

describe('mergeWindowsPath', () => {
  test('puts the current registry PATH first and keeps entries only the session has', () => {
    expect(
      mergeWindowsPath({
        registry: 'C:\\Windows\\system32;C:\\Users\\u\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;;',
        session: 'C:\\Program Files\\PowerShell\\7;c:\\windows\\System32\;C:\\Users\\u\\scoop\\shims'
      })
    ).toBe(
      'C:\\Windows\\system32;C:\\Users\\u\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;' +
        'C:\\Program Files\\PowerShell\\7;C:\\Users\\u\\scoop\\shims'
    );
  });
});

describe('pseudo console input and output', () => {
  test('encodes keys the way a terminal sends them', () => {
    expect(encodeKeys(['ctrl+c'])).toBe('\u0003');
    expect(encodeKeys(['ctrl+R', 'enter', 'tab', 'esc', 'up'])).toBe('\u0012\r\t\u001b\u001b[A');
    expect(encodeKeys(['hello world', 'enter'])).toBe('hello world\r');
  });

  test('strips escape sequences and keeps text', () => {
    const output =
      '\u001b]0;C:\\stacktape.exe\u0007\u001b[?25l\u001b[2J\u001b[1;1H\u001b[32m✓\u001b[0m query  function\r\n' +
      '\u001bP+q4d73\u001b\\\u001b7line two\u001b8\r';
    expect(stripTerminalSequences(output)).toBe('✓ query  function\nline two\n');
  });
});
