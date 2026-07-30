import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { configureNativeRuntimeForPlatform, resolveSupportedPlatform } from '@utils/bin-executable';

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

  test('selects OpenTUI musl before the CLI dynamically imports application code', async () => {
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

    const cliEntry = await readFile(join(import.meta.dir, '..', 'src', 'api', 'cli', 'index.ts'), 'utf8');
    expect(cliEntry.indexOf('configureNativeRuntimeForPlatform();')).toBeLessThan(
      cliEntry.indexOf("await import('@application-services/tui-manager/output-mode')")
    );
  });
});
