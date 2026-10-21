import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as tar from 'tar';
import { ensureTrivyBinary, type TrivyAsset, type TrivyRelease } from './trivy';

/**
 * The download path is the one place a wrong or tampered file could enter the machine, so it is exercised against a
 * real HTTP server and a real tar.gz archive rather than mocked. A fake "trivy" script stands in for the binary.
 */

let server: ReturnType<typeof Bun.serve>;
let archiveBytes: Uint8Array;
let archiveSha256: string;
let toolsDirectory: string;
let sourceDirectory: string;

const FAKE_BINARY = '#!/bin/sh\necho fake-trivy\n';

const releaseFor = ({ sha256, version = '0.0.0-test' }: { sha256: string; version?: string }): TrivyRelease => {
  const asset: TrivyAsset = { fileName: 'trivy_test.tar.gz', sha256, archive: 'tar.gz', binaryName: 'trivy' };
  return {
    version,
    baseUrl: `http://127.0.0.1:${server.port}/download`,
    assets: {
      linux: asset,
      alpine: asset,
      'linux-arm': asset,
      macos: asset,
      'macos-arm': asset,
      win: asset,
      'win-arm': asset
    }
  };
};

beforeAll(async () => {
  sourceDirectory = await mkdtemp(join(tmpdir(), 'stp-trivy-source-'));
  const source = sourceDirectory;
  await writeFile(join(source, 'trivy'), FAKE_BINARY, { mode: 0o755 });
  const archivePath = join(source, 'trivy_test.tar.gz');
  await tar.c({ gzip: true, file: archivePath, cwd: source }, ['trivy']);
  archiveBytes = new Uint8Array(await readFile(archivePath));
  archiveSha256 = createHash('sha256').update(archiveBytes).digest('hex');
  toolsDirectory = await mkdtemp(join(tmpdir(), 'stp-tools-'));
  server = Bun.serve({
    port: 0,
    fetch: (request) =>
      new URL(request.url).pathname === '/download/trivy_test.tar.gz'
        ? new Response(archiveBytes, { headers: { 'content-type': 'application/gzip' } })
        : new Response('not found', { status: 404 })
  });
});

afterAll(async () => {
  server?.stop(true);
  if (toolsDirectory) await rm(toolsDirectory, { recursive: true, force: true });
  if (sourceDirectory) await rm(sourceDirectory, { recursive: true, force: true });
});

describe('ensureTrivyBinary', () => {
  test('downloads, verifies and extracts the binary once, then reuses it', async () => {
    const release = releaseFor({ sha256: archiveSha256 });
    const first = await ensureTrivyBinary({ release, platform: 'linux', toolsDirectory });
    expect(first.downloaded).toBe(true);
    expect(first.binaryPath).toBe(join(toolsDirectory, 'trivy', '0.0.0-test', 'trivy'));
    expect(await readFile(first.binaryPath, 'utf8')).toBe(FAKE_BINARY);
    if (process.platform !== 'win32') expect((await stat(first.binaryPath)).mode & 0o111).toBeGreaterThan(0);

    const second = await ensureTrivyBinary({ release, platform: 'linux', toolsDirectory });
    expect(second).toEqual({ binaryPath: first.binaryPath, downloaded: false });
  });

  test('refuses an archive whose checksum does not match and leaves nothing behind', async () => {
    const release = releaseFor({ sha256: 'f'.repeat(64), version: '0.0.0-tampered' });
    await expect(ensureTrivyBinary({ release, platform: 'linux', toolsDirectory })).rejects.toThrow(
      'does not match the checksum'
    );
    // Neither the binary nor the downloaded archive stays: a retry starts clean and nothing accumulates.
    expect(await readdir(join(toolsDirectory, 'trivy', '0.0.0-tampered'))).toEqual([]);
  });

  test('reports a failed download instead of verifying an error page', async () => {
    const release = releaseFor({ sha256: archiveSha256, version: '0.0.0-missing' });
    release.baseUrl = `http://127.0.0.1:${server.port}/missing`;
    await expect(ensureTrivyBinary({ release, platform: 'linux', toolsDirectory })).rejects.toThrow('HTTP 404');
  });
});
