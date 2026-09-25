import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configureNativeRuntimeForPlatform, resolveSupportedPlatform } from '@utils/bin-executable';

/**
 * Opens the real CLI entry's interactive launcher as a process on a Linux host presented as `host`, and returns the
 * OpenTUI native package it selects (`fixtures/opentui-native-selection.ts`).
 */
const selectOpenTuiNativePackage = async (host: 'alpine' | 'linux') => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-platform-runtime-'));
  try {
    const record = join(directory, 'native-package');
    const child = Bun.spawnSync({
      cmd: [
        process.execPath,
        '--preload',
        join(import.meta.dir, 'fixtures', 'opentui-native-selection.ts'),
        join(import.meta.dir, '..', 'src', 'entrypoints', 'cli.ts')
      ],
      cwd: join(import.meta.dir, '..'),
      // A customer's shell: no CI variables, which would disable the launcher, and no libc override.
      env: {
        PATH: process.env.PATH,
        HOME: directory,
        FORCE_TTY: '1',
        STP_DISABLE_TELEMETRY: '1',
        PLATFORM_RUNTIME_RECORD: record,
        PLATFORM_RUNTIME_HOST: host
      },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000
    });
    if (child.exitCode !== 0) {
      throw new Error(`The CLI entry exited ${child.exitCode}: ${child.stdout.toString()}${child.stderr.toString()}`);
    }
    return await readFile(record, 'utf8');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe('release platform runtime', () => {
  test('selects the matching release archive for every supported host', () => {
    expect(resolveSupportedPlatform({ platform: 'win32', arch: 'x64' })).toBe('win');
    expect(resolveSupportedPlatform({ platform: 'darwin', arch: 'x64' })).toBe('macos');
    expect(resolveSupportedPlatform({ platform: 'darwin', arch: 'arm64' })).toBe('macos-arm');
    expect(resolveSupportedPlatform({ platform: 'linux', arch: 'x64' })).toBe('linux');
    expect(resolveSupportedPlatform({ platform: 'linux', arch: 'arm64' })).toBe('linux-arm');
    expect(resolveSupportedPlatform({ platform: 'linux', arch: 'x64', isAlpine: true })).toBe('alpine');
  });

  test('refuses architectures without a release artifact', () => {
    expect(() => resolveSupportedPlatform({ platform: 'linux', arch: 'arm64', isAlpine: true })).toThrow(
      'Unsupported Alpine architecture'
    );
    expect(() => resolveSupportedPlatform({ platform: 'win32', arch: 'arm64' })).toThrow('Unsupported platform');
    expect(() => resolveSupportedPlatform({ platform: 'darwin', arch: 'ia32' })).toThrow('Unsupported platform');
  });

  test('selects OpenTUI musl on Alpine only', () => {
    const originalLibc = process.env.OPENTUI_LIBC;
    try {
      process.env.OPENTUI_LIBC = 'glibc';
      configureNativeRuntimeForPlatform('alpine');
      expect(process.env.OPENTUI_LIBC).toBe('musl');

      process.env.OPENTUI_LIBC = 'custom';
      configureNativeRuntimeForPlatform('linux');
      expect(process.env.OPENTUI_LIBC).toBe('custom');
    } finally {
      if (originalLibc === undefined) {
        delete process.env.OPENTUI_LIBC;
      } else {
        process.env.OPENTUI_LIBC = originalLibc;
      }
    }
  });

  // OpenTUI reads its libc choice once, when the launcher first imports it, so the entry must configure it earlier.
  test.skipIf(process.platform !== 'linux')(
    "the CLI launcher loads OpenTUI's musl library on Alpine and its glibc library elsewhere",
    async () => {
      expect(await selectOpenTuiNativePackage('alpine')).toBe(`@opentui/core-linux-${process.arch}-musl`);
      expect(await selectOpenTuiNativePackage('linux')).toBe(`@opentui/core-linux-${process.arch}`);
    },
    90_000
  );
});
