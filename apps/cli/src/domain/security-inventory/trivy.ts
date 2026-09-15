import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import type { SupportedPlatform } from '@utils/platform';
import { unzip } from '@utils/unzip';
import fsExtra from 'fs-extra';
import { localStatePaths } from 'src/config/local-state-paths';
import * as tar from 'tar';

/**
 * Trivy (Apache-2.0, by Aqua Security) reads lockfiles and container images and lists the packages they contain. The
 * CLI uses it only to produce that inventory; no vulnerability database is downloaded on a developer's machine, the
 * grading happens in the Console. The binary is fetched once per machine and version, from the GitHub release, and is
 * accepted only when its SHA-256 matches the checksum published with that release and pinned below.
 */

export const TRIVY_VERSION = '0.74.0';

export type TrivyAsset = {
  fileName: string;
  sha256: string;
  archive: 'tar.gz' | 'zip';
  binaryName: 'trivy' | 'trivy.exe';
};

export type TrivyRelease = {
  version: string;
  /** Directory URL the asset file names are appended to. */
  baseUrl: string;
  assets: Record<SupportedPlatform, TrivyAsset>;
};

const LINUX_64: TrivyAsset = {
  fileName: `trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz`,
  sha256: '2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a',
  archive: 'tar.gz',
  binaryName: 'trivy'
};

/** Checksums from `trivy_0.74.0_checksums.txt` of the v0.74.0 release (2026-08-14). Trivy's Linux builds are static. */
export const TRIVY_RELEASE: TrivyRelease = {
  version: TRIVY_VERSION,
  baseUrl: `https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}`,
  assets: {
    linux: LINUX_64,
    alpine: LINUX_64,
    'linux-arm': {
      fileName: `trivy_${TRIVY_VERSION}_Linux-ARM64.tar.gz`,
      sha256: 'b94ce1976bbf3c15b514b605ee88be7c6d94a29be2302847ff01cb794d47aad5',
      archive: 'tar.gz',
      binaryName: 'trivy'
    },
    macos: {
      fileName: `trivy_${TRIVY_VERSION}_macOS-64bit.tar.gz`,
      sha256: '472816f6888dda689d075c30254d4210b4d1035acf365aa72332f584c2f60485',
      archive: 'tar.gz',
      binaryName: 'trivy'
    },
    'macos-arm': {
      fileName: `trivy_${TRIVY_VERSION}_macOS-ARM64.tar.gz`,
      sha256: '1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11',
      archive: 'tar.gz',
      binaryName: 'trivy'
    },
    win: {
      fileName: `trivy_${TRIVY_VERSION}_windows-64bit.zip`,
      sha256: '94c40e0696e4b907a74b7b2e1438d5d72ebaca83115817407f568a002d520842',
      archive: 'zip',
      binaryName: 'trivy.exe'
    }
  }
};

/** Roughly what a developer downloads once; shown before the wait so the pause is explained. */
export const TRIVY_DOWNLOAD_SIZE_HINT = 'about 50 MB';

/**
 * Where a ready Trivy binary lives, downloading and verifying it first when this machine has none. `STACKTAPE_TRIVY_PATH`
 * names a binary to use instead, for runner images that ship Trivy and for offline machines.
 */
export const ensureTrivyBinary = async ({
  release = TRIVY_RELEASE,
  platform = getPlatform(),
  toolsDirectory = localStatePaths.toolsDirectory(),
  fetchImpl = fetch,
  onDownloadStart
}: {
  release?: TrivyRelease;
  platform?: SupportedPlatform;
  toolsDirectory?: string;
  fetchImpl?: typeof fetch;
  onDownloadStart?: (details: { version: string; fileName: string }) => void;
} = {}): Promise<{ binaryPath: string; downloaded: boolean }> => {
  const explicitPath = process.env.STACKTAPE_TRIVY_PATH;
  if (explicitPath) return { binaryPath: explicitPath, downloaded: false };

  const asset = release.assets[platform];
  const directory = join(toolsDirectory, 'trivy', release.version);
  const binaryPath = join(directory, asset.binaryName);
  if (await fsExtra.pathExists(binaryPath)) return { binaryPath, downloaded: false };

  onDownloadStart?.({ version: release.version, fileName: asset.fileName });
  await fsExtra.ensureDir(directory);
  // Everything lands in a staging directory first; the binary appears at its final path only after verification.
  const staging = join(directory, `.download-${process.pid}-${Date.now()}`);
  await fsExtra.ensureDir(staging);
  try {
    const archivePath = join(staging, asset.fileName);
    const response = await fetchImpl(`${release.baseUrl}/${asset.fileName}`);
    if (!response.ok) {
      throw new Error(`Downloading ${asset.fileName} failed with HTTP ${response.status}.`);
    }
    await Bun.write(archivePath, response);
    const digest = createHash('sha256')
      .update(new Uint8Array(await Bun.file(archivePath).arrayBuffer()))
      .digest('hex');
    if (digest !== asset.sha256) {
      throw new Error(
        `The downloaded ${asset.fileName} does not match the checksum published for Trivy ${release.version} (expected ${asset.sha256}, got ${digest}). The file was discarded.`
      );
    }
    if (asset.archive === 'zip') {
      await unzip({ zipFilePath: archivePath, outputDir: staging });
    } else {
      await tar.x({
        file: archivePath,
        cwd: staging,
        filter: (path) => path === asset.binaryName || path.endsWith(`/${asset.binaryName}`)
      });
    }
    const extracted = join(staging, asset.binaryName);
    if (!(await fsExtra.pathExists(extracted))) {
      throw new Error(`The Trivy archive ${asset.fileName} does not contain ${asset.binaryName}.`);
    }
    if (platform !== 'win') await fsExtra.chmod(extracted, 0o755);
    await fsExtra.move(extracted, binaryPath, { overwrite: true });
    return { binaryPath, downloaded: true };
  } finally {
    await fsExtra.remove(staging);
  }
};

/** Trivy keeps its own analysis cache; it lives next to the binary so deleting the tool directory removes both. */
export const trivyCacheDirectory = ({
  release = TRIVY_RELEASE,
  toolsDirectory = localStatePaths.toolsDirectory()
}: { release?: TrivyRelease; toolsDirectory?: string } = {}) => join(toolsDirectory, 'trivy', release.version, 'cache');
