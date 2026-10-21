import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as tar from 'tar';
import { generateReleaseChecksums } from '../../checksums';
import { EXPECTED_RELEASE_ARCHIVES } from '../../verify-candidate-assets';

const ARCHIVE_NAME =
  process.platform === 'darwin'
    ? process.arch === 'arm64'
      ? 'macos-arm.tar.gz'
      : 'macos.tar.gz'
    : process.arch === 'arm64'
      ? 'linux-arm.tar.gz'
      : 'linux.tar.gz';
const HELPER_LAMBDAS = [
  'stacktapeServiceLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda',
  'batchJobTriggerLambda'
];

/** An npm package directory holding the real launcher, its dependencies and `version` in package.json. */
const launcherPackage = async (root: string, version: string) => {
  const packageDir = join(root, 'package');
  await mkdir(join(packageDir, 'bin'), { recursive: true });
  await writeFile(join(packageDir, 'package.json'), JSON.stringify({ version }));
  await copyFile(join(import.meta.dir, 'stacktape.js'), join(packageDir, 'bin', 'stacktape.js'));
  await symlink(resolve(import.meta.dir, '../../../../node_modules'), join(packageDir, 'node_modules'));
  return packageDir;
};

/** Runs the launcher as a Node process with `preload` substituting its external boundaries. */
const launch = async ({
  preload,
  packageDir,
  home,
  args = ['--version'],
  env = {}
}: {
  preload: string;
  packageDir: string;
  home: string;
  args?: string[];
  env?: Record<string, string>;
}) => {
  const child = Bun.spawn({
    cmd: ['node', '--require', preload, join(packageDir, 'bin', 'stacktape.js'), ...args],
    // HOME and USERPROFILE both point at the fixture, so no real curl installation is ever consulted.
    env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home, NODE_PATH: '', STP_DISABLE_TELEMETRY: '1', ...env },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const deadline = setTimeout(() => child.kill('SIGKILL'), 15_000);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    return { stdout, stderr, exitCode };
  } finally {
    clearTimeout(deadline);
  }
};

/** Routes the launcher's GitHub download to a loopback server; every other network use fails. */
const downloadPreload = (port: number) => `
const http = require('node:http');
const https = require('node:https');
const original = http.get;
http.request = () => { throw new Error('Unexpected HTTP request'); };
https.request = () => { throw new Error('Unexpected HTTPS request'); };
https.get = (url, callback) => {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://github.com') throw new Error('Unexpected download origin');
  return original('http://127.0.0.1:${port}' + parsed.pathname, callback);
};
globalThis.fetch = () => { throw new Error('Unexpected fetch'); };
`;

// Windows native execution is qualified with the real supplied candidate, rather than a shell-script stand-in.
test.skipIf(process.platform === 'win32')(
  'npm launcher refuses invalid integrity, ignores an older global install, installs, upgrades and runs offline',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-launcher-install-'));
    const home = join(root, 'home');
    const versions = ['4.0.0-preview.17', '4.0.0-preview.18'];
    let server: ReturnType<typeof Bun.serve> | undefined;
    try {
      await mkdir(home);
      const packageDir = await launcherPackage(root, versions[0]);
      const bin = join(packageDir, 'bin');
      // One release per version: the executable reports its version, and `--fail` exits 7.
      for (const version of versions) {
        const payload = join(root, version, 'payload');
        await mkdir(join(payload, 'helper-lambdas'), { recursive: true });
        await writeFile(
          join(payload, 'stacktape'),
          `#!/bin/sh\n[ "$1" != "--fail" ] || exit 7\necho "Stacktape version: ${version}."\n`
        );
        for (const name of HELPER_LAMBDAS) {
          await writeFile(join(payload, 'helper-lambdas', `${name}-fixture.zip`), 'helper fixture');
        }
        await tar.c({ file: join(root, version, ARCHIVE_NAME), gzip: true, cwd: payload }, [
          'stacktape',
          'helper-lambdas'
        ]);
        await writeFile(join(root, version, 'release notes.txt'), 'Adjacent release notes are not archive payloads.');
        await generateReleaseChecksums({ directory: join(root, version) });
      }
      const manifest = await readFile(join(root, versions[0], 'SHA256SUMS'), 'utf8');
      // A curl-installed CLI of another version in the home directory: the launcher must not run it.
      const globalBin = join(home, '.stacktape', 'bin');
      await mkdir(join(globalBin, 'helper-lambdas'), { recursive: true });
      await writeFile(join(globalBin, 'stacktape'), '#!/bin/sh\necho "global installation: $*"\n', { mode: 0o755 });
      await writeFile(join(globalBin, 'release-data.json'), JSON.stringify({ version: '3.9.0' }));
      for (const name of HELPER_LAMBDAS) await writeFile(join(globalBin, 'helper-lambdas', `${name}-1.zip`), 'x');

      let downloads = 0;
      server = Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        fetch: async (request) => {
          const match = /^\/stacktape\/stacktape\/releases\/download\/([^/]+)\/([^/]+)$/.exec(
            new URL(request.url).pathname
          );
          const archive = match && versions.includes(match[1]) ? join(root, match[1], match[2]) : undefined;
          if (!archive || !existsSync(archive)) return new Response('not found', { status: 404 });
          downloads++;
          return new Response(await readFile(archive));
        }
      });
      const preload = join(root, 'download-fixture.cjs');
      await writeFile(preload, downloadPreload(server.port));
      const run = (args?: string[]) => launch({ preload, packageDir, home, args });

      for (const invalid of [
        undefined,
        `${'0'.repeat(64)}  ${ARCHIVE_NAME}\n`,
        'malformed checksum\n',
        manifest + manifest
      ]) {
        if (invalid === undefined) await rm(join(packageDir, 'SHA256SUMS'), { force: true });
        else await writeFile(join(packageDir, 'SHA256SUMS'), invalid);
        const rejected = await run();
        expect(rejected.exitCode).not.toBe(0);
        expect(rejected.stderr).toMatch(
          /missing SHA256SUMS|Checksum verification failed|Invalid release checksum line|Duplicate release checksum entry/
        );
        expect(existsSync(join(bin, 'stacktape'))).toBe(false);
        expect(existsSync(join(bin, '.stacktape-install.json'))).toBe(false);
      }
      await writeFile(join(packageDir, 'SHA256SUMS'), manifest);
      // Rejected manifests still downloaded their archive; count from the healthy install on.
      downloads = 0;
      const installed = await run();
      expect(installed.exitCode, installed.stderr).toBe(0);
      expect(installed.stdout).toContain(`Stacktape version: ${versions[0]}.`);
      expect(JSON.parse(await readFile(join(bin, '.stacktape-install.json'), 'utf8')).version).toBe(versions[0]);
      expect(downloads).toBe(1);

      // The same version installed by curl is reused without a download; another version never is.
      await writeFile(join(globalBin, 'release-data.json'), JSON.stringify({ version: versions[0] }));
      const global = await run(['deploy']);
      expect(global.exitCode, global.stderr).toBe(0);
      expect(global.stdout).toBe('global installation: deploy\n');
      await rm(join(home, '.stacktape'), { recursive: true });

      // `npm update` changes package.json and SHA256SUMS; the next run must install the new release.
      await writeFile(join(packageDir, 'package.json'), JSON.stringify({ version: versions[1] }));
      await copyFile(join(root, versions[1], 'SHA256SUMS'), join(packageDir, 'SHA256SUMS'));
      const upgraded = await run();
      expect(upgraded.exitCode, upgraded.stderr).toBe(0);
      expect(upgraded.stdout).toContain(`Stacktape version: ${versions[1]}.`);
      expect(JSON.parse(await readFile(join(bin, '.stacktape-install.json'), 'utf8')).version).toBe(versions[1]);
      expect(downloads).toBe(2);

      server.stop(true);
      const cached = await run();
      expect(cached.exitCode, cached.stderr).toBe(0);
      expect(cached.stdout).toBe(`Stacktape version: ${versions[1]}.\n`);
      expect(downloads).toBe(2);
      expect((await run(['--fail'])).exitCode).toBe(7);
    } finally {
      server?.stop(true);
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);

// The operating system, architecture and libc are substituted; archive selection is the launcher's.
test('npm launcher downloads the release archive of each supported host', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-launcher-hosts-'));
  const requested: string[] = [];
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: (request) => {
      requested.push(new URL(request.url).pathname);
      return new Response('not found', { status: 404 });
    }
  });
  try {
    const version = '4.0.0-preview.17';
    const packageDir = await launcherPackage(root, version);
    const home = join(root, 'home');
    await mkdir(home);
    const preload = join(root, 'host-fixture.cjs');
    await writeFile(
      preload,
      `${downloadPreload(server.port)}
const os = require('node:os');
os.platform = () => process.env.HOST_PLATFORM;
os.arch = () => process.env.HOST_ARCH;
const childProcess = require('node:child_process');
childProcess.execSync = (command) => {
  if (!command.startsWith('ldd --version')) throw new Error('Unexpected command: ' + command);
  return process.env.HOST_LDD;
};
`
    );
    const hosts = [
      { platform: 'linux', arch: 'x64', ldd: 'ldd (GNU libc) 2.39', archive: 'linux.tar.gz' },
      { platform: 'linux', arch: 'x64', ldd: 'musl libc (x86_64)\nVersion 1.2.5', archive: 'alpine.tar.gz' },
      { platform: 'linux', arch: 'arm64', ldd: 'ldd (GNU libc) 2.39', archive: 'linux-arm.tar.gz' },
      { platform: 'darwin', arch: 'x64', ldd: '', archive: 'macos.tar.gz' },
      { platform: 'darwin', arch: 'arm64', ldd: '', archive: 'macos-arm.tar.gz' },
      { platform: 'win32', arch: 'x64', ldd: '', archive: 'windows.zip' },
      { platform: 'win32', arch: 'arm64', ldd: '', archive: 'windows-arm.zip' }
    ];
    for (const host of hosts) {
      requested.length = 0;
      const result = await launch({
        preload,
        packageDir,
        home,
        env: { HOST_PLATFORM: host.platform, HOST_ARCH: host.arch, HOST_LDD: host.ldd }
      });
      expect(result.exitCode, result.stderr).not.toBe(0);
      expect(result.stderr).toContain('Failed to download: 404');
      expect(new Set(requested), `${host.platform}-${host.arch} ${host.ldd}`).toEqual(
        new Set([`/stacktape/stacktape/releases/download/${version}/${host.archive}`])
      );
    }
    // Every host maps to a published archive, and every published archive has a host.
    expect(hosts.map(({ archive }) => archive).sort()).toEqual([...EXPECTED_RELEASE_ARCHIVES]);
  } finally {
    server.stop(true);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
