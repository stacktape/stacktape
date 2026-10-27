import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliError } from '@utils/errors';
import { getLatestStacktapeRelease, isNewerStacktapeVersion } from '@utils/versioning';
import { getInstallerUrl, getUpgradeCommand, runNativeInstaller } from './utils';

const originalFetch = globalThis.fetch;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  globalThis.fetch = originalFetch;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const serveChannels = (latestVersions: Record<string, string>) => {
  const requested: string[] = [];
  globalThis.fetch = (async (url: string) => {
    requested.push(url);
    const host = new URL(url).host;
    return Response.json({ latestVersion: latestVersions[host] });
  }) as unknown as typeof fetch;
  return requested;
};

describe('stacktape upgrade', () => {
  test('compares preview, stable and development versions', () => {
    expect(isNewerStacktapeVersion('4.0.0-preview.11', '4.0.0-preview.10')).toBe(true);
    expect(isNewerStacktapeVersion('4.0.0-preview.10', '4.0.0-preview.10')).toBe(false);
    expect(isNewerStacktapeVersion('4.0.0', '4.0.0-preview.11')).toBe(true);
    expect(isNewerStacktapeVersion('3.7.1', '4.0.0-preview.10')).toBe(false);
    expect(isNewerStacktapeVersion('4.0.1', 'dev-4.0.0')).toBe(true);
    expect(isNewerStacktapeVersion('4.0.0', 'dev')).toBe(false);
  });

  test('preview builds follow the preview channel until a newer stable release exists', async () => {
    const requested = serveChannels({
      'installs.stacktape.com': '3.7.1',
      'installs-preview.stacktape.com': '4.0.0-preview.11'
    });
    expect(await getLatestStacktapeRelease(undefined, '4.0.0-preview.10')).toEqual({
      version: '4.0.0-preview.11',
      installsUrl: 'https://installs-preview.stacktape.com'
    });
    expect(requested).toHaveLength(2);

    serveChannels({ 'installs.stacktape.com': '4.0.0', 'installs-preview.stacktape.com': '4.0.0-preview.11' });
    expect(await getLatestStacktapeRelease(undefined, '4.0.0-preview.11')).toEqual({
      version: '4.0.0',
      installsUrl: 'https://installs.stacktape.com'
    });

    const stableRequests = serveChannels({ 'installs.stacktape.com': '4.0.1' });
    expect((await getLatestStacktapeRelease(undefined, '4.0.0')).version).toBe('4.0.1');
    expect(stableRequests).toEqual(['https://installs.stacktape.com/_data.json']);
  });

  test('prints exact-version commands, so a major release or a preview is not skipped', () => {
    const target = {
      installerUrl: getInstallerUrl('https://installs-preview.stacktape.com', 'macos-arm'),
      version: '4.0.0-preview.11'
    };
    expect(getUpgradeCommand({ installationType: 'unknown' }, target)).toBe(
      'curl -fsSL https://installs-preview.stacktape.com/macos-arm.sh | sh'
    );
    expect(
      getUpgradeCommand({ installationType: 'unknown' }, { ...target, installerUrl: getInstallerUrl('x', 'win') })
    ).toBe('irm x/windows.ps1 | iex');
    expect(getUpgradeCommand({ installationType: 'package-global' }, target)).toBe(
      'npm install -g stacktape@4.0.0-preview.11'
    );
    expect(getUpgradeCommand({ installationType: 'package-local', packageManager: 'pnpm' }, target)).toBe(
      'pnpm add stacktape@4.0.0-preview.11'
    );
  });

  test.skipIf(process.platform === 'win32')('runs the downloaded installer as a file with the version', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-upgrade-spec-'));
    temporaryDirectories.push(directory);
    const output = join(directory, 'ran');
    const server = Bun.serve({
      port: 0,
      fetch: (request) =>
        new URL(request.url).pathname === '/linux.sh'
          ? new Response(`#!/bin/sh\nprintf '%s %s' "$0" "$STACKTAPE_VERSION" > '${output}'\n`)
          : new URL(request.url).pathname === '/broken.sh'
            ? new Response('exit 3\n')
            : new Response('not found', { status: 404 })
    });
    try {
      await runNativeInstaller({ installerUrl: `${server.url}linux.sh`, version: '4.0.0-preview.11' });
      const [scriptPath, version] = (await readFile(output, 'utf8')).split(' ');
      expect(version).toBe('4.0.0-preview.11');
      expect(scriptPath).toEndWith('install.sh');
      expect(await Bun.file(scriptPath!).exists()).toBe(false);

      const failure = await runNativeInstaller({ installerUrl: `${server.url}missing.sh`, version: '4.0.0' }).catch(
        (error) => error
      );
      expect(failure).toBeInstanceOf(CliError);
      expect(failure.message).toContain('(HTTP 404)');

      const installerFailure = await runNativeInstaller({
        installerUrl: `${server.url}broken.sh`,
        version: '4.0.0'
      }).catch((error) => error);
      expect(installerFailure.code).toBe('CLI_UPGRADE_INSTALLER_FAILED');
      expect(installerFailure.message).toContain('exit code 3');
    } finally {
      server.stop(true);
    }
  });
});
