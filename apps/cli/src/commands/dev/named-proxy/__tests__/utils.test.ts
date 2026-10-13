import { describe, test, expect } from 'bun:test';
import { parseHostname, injectFrameworkFlags, formatUrl } from '../utils';

describe('parseHostname', () => {
  test('appends .localhost when not present', () => {
    expect(parseHostname('myapp.dev')).toBe('myapp.dev.localhost');
  });

  test('keeps .localhost suffix when already present', () => {
    expect(parseHostname('myapp.dev.localhost')).toBe('myapp.dev.localhost');
  });

  test('strips protocol prefix', () => {
    expect(parseHostname('http://myapp.dev')).toBe('myapp.dev.localhost');
    expect(parseHostname('https://myapp.dev')).toBe('myapp.dev.localhost');
  });

  test('strips path after hostname', () => {
    expect(parseHostname('myapp.dev/some/path')).toBe('myapp.dev.localhost');
  });

  test('lowercases the hostname', () => {
    expect(parseHostname('MyApp.DEV')).toBe('myapp.dev.localhost');
  });

  test('trims whitespace', () => {
    expect(parseHostname('  myapp.dev  ')).toBe('myapp.dev.localhost');
  });

  test('throws on empty input', () => {
    expect(() => parseHostname('')).toThrow('Hostname cannot be empty');
  });

  test('throws on bare .localhost', () => {
    expect(() => parseHostname('.localhost')).toThrow('Hostname cannot be empty');
  });

  test('throws on consecutive dots', () => {
    expect(() => parseHostname('my..app.dev')).toThrow('consecutive dots');
  });

  test('throws on invalid characters (uppercase after lowercasing is fine, but special chars are not)', () => {
    expect(() => parseHostname('my_app.dev')).toThrow('must contain only');
  });

  test('throws on hostname starting with hyphen', () => {
    expect(() => parseHostname('-myapp.dev')).toThrow('must contain only');
  });

  test('does not throw on hyphen before dot (valid: myapp-.dev becomes myapp-.dev.localhost)', () => {
    // The segment "myapp-" has a trailing hyphen, but the full name "myapp-.dev" is valid
    // because the regex validates the whole name "myapp-.dev" where the last char is "v"
    expect(parseHostname('myapp-.dev')).toBe('myapp-.dev.localhost');
  });

  test('throws on hostname ending with hyphen (at end of full name)', () => {
    expect(() => parseHostname('myapp-')).toThrow('must contain only');
  });

  test('accepts valid multi-segment hostnames', () => {
    expect(parseHostname('web.staging')).toBe('web.staging.localhost');
  });

  test('accepts hostname with numbers and hyphens', () => {
    expect(parseHostname('app-v2.dev-1')).toBe('app-v2.dev-1.localhost');
  });

  test('accepts single segment', () => {
    expect(parseHostname('myapp')).toBe('myapp.localhost');
  });
});

describe('injectFrameworkFlags', () => {
  test('injects --port and --strictPort for vite', () => {
    const args = ['vite', 'dev'];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual(['vite', 'dev', '--port', '3000', '--strictPort', '--host', '127.0.0.1']);
  });

  test('injects --port and --strictPort for react-router', () => {
    const args = ['react-router', 'dev'];
    injectFrameworkFlags(args, 4000);
    expect(args).toEqual(['react-router', 'dev', '--port', '4000', '--strictPort', '--host', '127.0.0.1']);
  });

  test('injects --port for astro without --strictPort', () => {
    const args = ['astro', 'dev'];
    injectFrameworkFlags(args, 4321);
    expect(args).toEqual(['astro', 'dev', '--port', '4321', '--host', '127.0.0.1']);
  });

  test('injects --port for angular (ng) without --strictPort', () => {
    const args = ['ng', 'serve'];
    injectFrameworkFlags(args, 4200);
    expect(args).toEqual(['ng', 'serve', '--port', '4200', '--host', '127.0.0.1']);
  });

  test('does not inject if --port is already present', () => {
    const args = ['vite', 'dev', '--port', '5000'];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual(['vite', 'dev', '--port', '5000', '--host', '127.0.0.1']);
  });

  test('does not inject if --host is already present', () => {
    const args = ['vite', 'dev', '--host', '0.0.0.0'];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual(['vite', 'dev', '--host', '0.0.0.0', '--port', '3000', '--strictPort']);
  });

  test('does nothing for unknown frameworks', () => {
    const args = ['webpack', 'serve'];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual(['webpack', 'serve']);
  });

  test('does nothing for empty args', () => {
    const args: string[] = [];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual([]);
  });

  test('strips .cmd extension on Windows-style command', () => {
    const args = ['vite.cmd', 'dev'];
    injectFrameworkFlags(args, 3000);
    expect(args).toEqual(['vite.cmd', 'dev', '--port', '3000', '--strictPort', '--host', '127.0.0.1']);
  });

  test('strips .exe extension on Windows-style command', () => {
    const args = ['ng.exe', 'serve'];
    injectFrameworkFlags(args, 4200);
    expect(args).toEqual(['ng.exe', 'serve', '--port', '4200', '--host', '127.0.0.1']);
  });

  test('handles full path to framework binary', () => {
    const args = ['node_modules/.bin/vite', 'dev'];
    injectFrameworkFlags(args, 5173);
    expect(args).toEqual(['node_modules/.bin/vite', 'dev', '--port', '5173', '--strictPort', '--host', '127.0.0.1']);
  });
});

test.each([
  ['app.localhost', 80, false, 'http://app.localhost'],
  ['app.localhost', 443, true, 'https://app.localhost'],
  ['app.localhost', 8443, true, 'https://app.localhost:8443']
] as const)('formats %s with port %s and TLS %s', (hostname, port, tls, expected) => {
  expect(formatUrl(hostname, port, tls)).toBe(expected);
});
