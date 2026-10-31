import { describe, expect, test } from 'bun:test';
import {
  assertAwsProfile,
  assertTaskId,
  buildWindowsCommandLine,
  buildWslEnv,
  encodeKeys,
  mergeWindowsPath,
  quoteWindowsArgument,
  selectOwnedProcesses,
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

  test('task paths live under one validated folder', () => {
    expect(windowsTaskPaths({ root: 'C:/stacktape-wsl/', taskId: 'r2at' })).toEqual({
      task: 'C:\\stacktape-wsl\\r2at',
      cli: 'C:\\stacktape-wsl\\r2at\\cli',
      exe: 'C:\\stacktape-wsl\\r2at\\cli\\stacktape.exe',
      projects: 'C:\\stacktape-wsl\\r2at\\projects',
      logs: 'C:\\stacktape-wsl\\r2at\\logs',
      tools: 'C:\\stacktape-wsl\\r2at\\tools'
    });
    for (const root of [
      'C:\\',
      'C:\\R&D',
      'C:\\Users',
      'D:\\stacktape-wsl',
      'C:\\stacktape-wsl\\..\\Users',
      'C:\\stacktape-wsl\\a b',
      'C:\\stacktape-wsl\\x&y',
      'stacktape-wsl',
      '\\\\server\\share'
    ]) {
      expect(() => windowsTaskPaths({ root, taskId: 'r2at' })).toThrow(/plain folder inside it/);
    }
    expect(windowsTaskPaths({ root: 'C:\\stacktape-wsl\\nested', taskId: 'r2at' }).task).toBe(
      'C:\\stacktape-wsl\\nested\\r2at'
    );
    for (const taskId of ['', '..', 'a\\b', 'R2AT', 'a b', 'x'.repeat(33)]) {
      expect(() => assertTaskId(taskId)).toThrow();
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

describe('selectOwnedProcesses', () => {
  const task = 'C:\\stacktape-wsl\\r2at';
  const at = (seconds: number) => new Date(Date.UTC(2026, 9, 31, 14, 0, seconds)).toISOString();
  const process = (pid: number, parentPid: number, name: string, created: number, path: string | null = null) => ({
    pid,
    parentPid,
    name,
    path,
    created: at(created)
  });
  const owned = (processes: ReturnType<typeof process>[], records: { pid: number; created: string }[]) =>
    selectOwnedProcesses({ processes, records, taskDirectory: task }).map(({ pid }) => pid);

  test('owns recorded processes and their descendants, not a shell that only mentions the task folder', () => {
    const processes = [
      process(100, 1, 'pwsh.exe', 0), // the owner's shell, e.g. reading C:\stacktape-wsl\r2at\logs
      process(101, 100, 'notepad.exe', 1),
      process(200, 50, 'cmd.exe', 10),
      process(201, 200, 'PING.EXE', 11)
    ];
    expect(owned(processes, [{ pid: 200, created: at(10) }])).toEqual([200, 201]);
  });

  test('a recorded process that exited still owns the daemon it started', () => {
    // dev --agent: the CLI (300) starts the daemon (301) and exits; the daemon starts the SSM plugin (302).
    const processes = [process(301, 300, 'stacktape.exe', 21), process(302, 301, 'smp.exe', 22)];
    expect(owned(processes, [{ pid: 300, created: at(20) }])).toEqual([301, 302]);
  });

  test('a reused PID does not make the new holder or its children belong to the task', () => {
    const processes = [
      process(300, 1, 'chrome.exe', 40), // PID 300 reused after the recorded CLI exited
      process(310, 300, 'chrome.exe', 41), // child of the new holder
      process(301, 300, 'stacktape.exe', 21) // created by the recorded CLI before the reuse
    ];
    expect(owned(processes, [{ pid: 300, created: at(20) }])).toEqual([301]);
  });

  test('a child older than its supposed parent belongs to an earlier holder of that PID', () => {
    const processes = [process(400, 1, 'cmd.exe', 30), process(401, 400, 'explorer.exe', 5)];
    expect(owned(processes, [{ pid: 400, created: at(30) }])).toEqual([400]);
  });

  test('owns processes whose executable lives in the task folder', () => {
    const processes = [
      process(500, 1, 'smp.exe', 50, 'C:\\stacktape-wsl\\r2at\\cli\\session-manager-plugin\\smp.exe'),
      process(501, 1, 'stacktape.exe', 51, 'C:\\stacktape-wsl\\r2at-other\\cli\\stacktape.exe')
    ];
    expect(owned(processes, [])).toEqual([500]);
  });
});
