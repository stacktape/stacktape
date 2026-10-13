import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as tar from 'tar';
import { generateReleaseChecksums } from '../../checksums';

// Windows native execution is qualified with the real supplied candidate, rather than a shell-script stand-in.
test.skipIf(process.platform === 'win32')(
  'npm launcher refuses invalid integrity, installs, and runs its cache offline',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-launcher-install-'));
    const payload = join(root, 'payload');
    const packageDir = join(root, 'package');
    const bin = join(packageDir, 'bin');
    const archiveName =
      process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? 'macos-arm.tar.gz'
          : 'macos.tar.gz'
        : process.arch === 'arm64'
          ? 'linux-arm.tar.gz'
          : 'linux.tar.gz';
    let server: ReturnType<typeof Bun.serve> | undefined;
    try {
      await mkdir(join(payload, 'helper-lambdas'), { recursive: true });
      await mkdir(bin, { recursive: true });
      await mkdir(join(root, 'home'));
      await writeFile(join(packageDir, 'package.json'), JSON.stringify({ version: '4.0.0-preview.17' }));
      await copyFile(join(import.meta.dir, 'stacktape.js'), join(bin, 'stacktape.js'));
      await symlink(resolve(import.meta.dir, '../../../../node_modules'), join(packageDir, 'node_modules'));
      await writeFile(
        join(payload, 'stacktape'),
        '#!/bin/sh\n[ "$1" != "--fail" ] || exit 7\necho "Stacktape version: 4.0.0-preview.17."\n'
      );
      for (const name of [
        'stacktapeServiceLambda',
        'cdnOriginRequestLambda',
        'cdnOriginResponseLambda',
        'batchJobTriggerLambda'
      ]) {
        await writeFile(join(payload, 'helper-lambdas', `${name}-fixture.zip`), 'helper fixture');
      }
      const archive = join(root, archiveName);
      await tar.c({ file: archive, gzip: true, cwd: payload }, ['stacktape', 'helper-lambdas']);
      const manifestPath = await generateReleaseChecksums({ directory: root });
      const manifest = await readFile(manifestPath, 'utf8');
      let downloads = 0;
      server = Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        fetch: async (request) => {
          expect(new URL(request.url).pathname).toBe(
            `/stacktape/stacktape/releases/download/4.0.0-preview.17/${archiveName}`
          );
          downloads++;
          return new Response(await readFile(archive));
        }
      });
      const preload = join(root, 'download-fixture.cjs');
      await writeFile(
        preload,
        `
const http = require('node:http');
const https = require('node:https');
const original = http.get;
http.request = () => { throw new Error('Unexpected HTTP request'); };
https.request = () => { throw new Error('Unexpected HTTPS request'); };
https.get = (url, callback) => {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://github.com') throw new Error('Unexpected download origin');
  return original('http://127.0.0.1:${server.port}' + parsed.pathname, callback);
};
globalThis.fetch = () => { throw new Error('Unexpected fetch'); };
`
      );
      const run = async (args = ['--version']) => {
        const child = Bun.spawn({
          cmd: ['node', '--require', preload, join(bin, 'stacktape.js'), ...args],
          env: { PATH: process.env.PATH, HOME: join(root, 'home'), NODE_PATH: '', STP_DISABLE_TELEMETRY: '1' },
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
      for (const invalid of [
        undefined,
        `${'0'.repeat(64)}  ${archiveName}\n`,
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
      const installed = await run();
      expect(installed.exitCode, installed.stderr).toBe(0);
      expect(installed.stdout).toContain('Stacktape version: 4.0.0-preview.17.');
      expect(JSON.parse(await readFile(join(bin, '.stacktape-install.json'), 'utf8')).version).toBe('4.0.0-preview.17');
      const countAfterInstall = downloads;
      server.stop(true);
      const cached = await run();
      expect(cached.exitCode, cached.stderr).toBe(0);
      expect(cached.stdout).toBe('Stacktape version: 4.0.0-preview.17.\n');
      expect(downloads).toBe(countAfterInstall);
      expect((await run(['--fail'])).exitCode).toBe(7);
    } finally {
      server?.stop(true);
      await rm(root, { recursive: true, force: true });
    }
  },
  60_000
);
