/**
 * Maintainer script: pins the upstream downloads of railpack and the Session Manager plugin, the trust anchor the
 * CLI's resolver (`src/utils/external-tools.ts`) checks every download against.
 *
 * It downloads each platform's asset from its upstream release, compares railpack's with the SHA-256 in its release's
 * `checksums.txt`, extracts the executable with the resolver's own code to prove the recorded path, and writes
 * `src/config/external-tools.json` with each URL, size and SHA-256. Change a version below, run it, and review the diff:
 *
 *   bun scripts/pin-external-tools.ts [--record <file>]
 *
 * `--record` also writes what was downloaded and checked, for evidence.
 */
import type { ExternalTool, ExternalToolAsset, ExternalToolManifest } from 'src/utils/external-tools';
import type { SupportedPlatform } from '@utils/platform';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { extractExecutable } from 'src/utils/external-tools';

/**
 * The Railpack release. `RAILPACK_FRONTEND_IMAGE` in `src/config/railpack.ts` must name the same version: a plan the
 * binary writes is built by the frontend of the same release.
 */
const RAILPACK_VERSION = '0.40.1';
const SESSION_MANAGER_PLUGIN_VERSION = '1.2.707.0';

type Source = Omit<ExternalToolAsset, 'sha256' | 'bytes'>;

const railpack = (target: string): Source => {
  const windows = target.includes('windows');
  return {
    url: `https://github.com/railwayapp/railpack/releases/download/v${RAILPACK_VERSION}/railpack-v${RAILPACK_VERSION}-${target}.${windows ? 'zip' : 'tar.gz'}`,
    archive: windows ? 'zip' : 'tar.gz',
    executable: windows ? 'railpack.exe' : 'railpack'
  };
};

const sessionManagerPlugin = (path: string): Source => ({
  url: `https://s3.amazonaws.com/session-manager-downloads/plugin/${SESSION_MANAGER_PLUGIN_VERSION}/${path}`,
  archive: path.endsWith('.deb') ? 'deb' : 'zip',
  executable: path.endsWith('.deb')
    ? 'usr/local/sessionmanagerplugin/bin/session-manager-plugin'
    : 'sessionmanager-bundle/bin/session-manager-plugin'
});

const SOURCES: Record<ExternalTool, { version: string; assets: Partial<Record<SupportedPlatform, Source>> }> = {
  railpack: {
    version: RAILPACK_VERSION,
    assets: {
      // Railpack publishes static musl builds only, which run on glibc hosts as well.
      linux: railpack('x86_64-unknown-linux-musl'),
      alpine: railpack('x86_64-unknown-linux-musl'),
      'linux-arm': railpack('arm64-unknown-linux-musl'),
      macos: railpack('x86_64-apple-darwin'),
      'macos-arm': railpack('arm64-apple-darwin'),
      win: railpack('x86_64-pc-windows-msvc')
    }
  },
  'session-manager-plugin': {
    version: SESSION_MANAGER_PLUGIN_VERSION,
    assets: {
      // A glibc build: Alpine runs it through gcompat, as it ran the formerly bundled copy.
      linux: sessionManagerPlugin('ubuntu_64bit/session-manager-plugin.deb'),
      alpine: sessionManagerPlugin('ubuntu_64bit/session-manager-plugin.deb'),
      'linux-arm': sessionManagerPlugin('ubuntu_arm64/session-manager-plugin.deb'),
      macos: sessionManagerPlugin('mac/sessionmanager-bundle.zip'),
      'macos-arm': sessionManagerPlugin('mac_arm64/sessionmanager-bundle.zip')
      // Windows: AWS publishes only an installer, so the Windows archive keeps the bundled plugin.
    }
  }
};

const MANIFEST_PATH = resolve(import.meta.dir, '..', 'src', 'config', 'external-tools.json');

const fetchBytes = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
};

/** The SHA-256 railpack publishes in its release's `checksums.txt`; null where the release has none. */
const publishedSha256 = async (url: string) => {
  if (!url.startsWith('https://github.com/railwayapp/railpack/')) return null;
  const assetName = url.slice(url.lastIndexOf('/') + 1);
  const checksums = new TextDecoder().decode(await fetchBytes(`${url.slice(0, url.lastIndexOf('/'))}/checksums.txt`));
  const line = checksums.split('\n').find((entry) => entry.trim().endsWith(assetName));
  return line ? line.trim().split(/\s+/)[0]!.toLowerCase() : null;
};

const main = async () => {
  const recordIndex = process.argv.indexOf('--record');
  const recordPath = recordIndex >= 0 ? resolve(process.argv[recordIndex + 1]!) : undefined;
  const work = await mkdtemp(join(tmpdir(), 'stacktape-pin-external-tools-'));
  const downloaded = new Map<string, { sha256: string; bytes: number; published: string | null }>();
  const record: Record<string, unknown>[] = [];
  const manifest = {} as ExternalToolManifest;
  try {
    for (const [tool, { version, assets }] of Object.entries(SOURCES) as [
      ExternalTool,
      (typeof SOURCES)[ExternalTool]
    ][]) {
      manifest[tool] = { version, assets: {} };
      for (const [platform, source] of Object.entries(assets) as [SupportedPlatform, Source][]) {
        let facts = downloaded.get(source.url);
        if (!facts) {
          const bytes = await fetchBytes(source.url);
          const sha256 = createHash('sha256').update(bytes).digest('hex');
          const published = await publishedSha256(source.url);
          if (published !== null && published !== sha256) {
            throw new Error(`${source.url} has SHA-256 ${sha256}, but its release publishes ${published}.`);
          }
          // The resolver's own extraction proves the recorded executable path.
          const directory = join(work, `${tool}-${platform}`);
          await mkdir(directory, { recursive: true });
          const archivePath = join(directory, 'archive');
          await writeFile(archivePath, bytes);
          const asset = { ...source, sha256, bytes: bytes.length };
          const executable = await extractExecutable({ archivePath, asset, directory });
          record.push({
            tool,
            url: source.url,
            bytes: bytes.length,
            sha256,
            publishedSha256: published,
            executable: source.executable,
            executableBytes: (await stat(executable)).size,
            executableSha256: createHash('sha256')
              .update(await readFile(executable))
              .digest('hex')
          });
          facts = { sha256, bytes: bytes.length, published };
          downloaded.set(source.url, facts);
          console.info(
            `${tool} ${platform}: ${bytes.length} bytes, ${sha256}${published ? ' (matches the release)' : ''}`
          );
        }
        manifest[tool].assets[platform] = { ...source, sha256: facts.sha256, bytes: facts.bytes };
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.info(`Wrote ${MANIFEST_PATH}.`);
  if (recordPath) {
    await writeFile(
      recordPath,
      `${JSON.stringify({ pinnedAt: new Date().toISOString(), downloads: record }, null, 2)}\n`
    );
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
