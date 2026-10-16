/**
 * Maintainer script: pins the upstream downloads of railpack and the Session Manager plugin, the trust anchor the
 * CLI's resolver (`src/utils/external-tools.ts`) checks every download against, and Railpack's BuildKit frontend image.
 *
 * It downloads each platform's asset from its upstream release, compares railpack's with the SHA-256 in its release's
 * `checksums.txt`, extracts the executable with the resolver's own code to prove the recorded path, and writes
 * `src/config/external-tools.json` with each URL, size and SHA-256, and the frontend image's index digest. Change a version below, run it, and review the diff:
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
 * The Railpack release. The binary writes a plan and the frontend image of the same release builds it, so both are
 * pinned here: the frontend by the digest of its multi-platform index.
 */
const RAILPACK_VERSION = '0.40.1';
const RAILPACK_FRONTEND_REPOSITORY = 'railwayapp/railpack-frontend';
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
      win: railpack('x86_64-pc-windows-msvc'),
      'win-arm': railpack('arm64-pc-windows-msvc')
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
      // Windows: AWS publishes only an installer, so the Windows archives keep the bundled plugin.
    }
  }
};

const MANIFEST_PATH = resolve(import.meta.dir, '..', 'src', 'config', 'external-tools.json');

/** `ghcr.io/<repository>:<tag>@<digest>`, the digest of the image index the tag points to now. */
const pinGhcrImage = async (repository: string, tag: string) => {
  const tokenResponse = await fetch(`https://ghcr.io/token?scope=repository:${repository}:pull`);
  if (!tokenResponse.ok)
    throw new Error(`ghcr.io refused a pull token for ${repository}: HTTP ${tokenResponse.status}.`);
  const { token } = (await tokenResponse.json()) as { token: string };
  const response = await fetch(`https://ghcr.io/v2/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'
    }
  });
  const digest = response.headers.get('docker-content-digest');
  const mediaType = response.headers.get('content-type') ?? '';
  if (!response.ok || !digest?.startsWith('sha256:')) {
    throw new Error(`ghcr.io/${repository}:${tag} answered HTTP ${response.status} without a digest.`);
  }
  // Both architectures the CLI builds for must resolve through the pin.
  if (!mediaType.includes('index') && !mediaType.includes('manifest.list')) {
    throw new Error(`ghcr.io/${repository}:${tag} is ${mediaType}, not a multi-platform index.`);
  }
  return `ghcr.io/${repository}:${tag}@${digest}`;
};

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
  manifest.railpack.image = await pinGhcrImage(RAILPACK_FRONTEND_REPOSITORY, `v${RAILPACK_VERSION}`);
  console.info(`railpack frontend: ${manifest.railpack.image}`);
  record.push({ tool: 'railpack', image: manifest.railpack.image });
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
