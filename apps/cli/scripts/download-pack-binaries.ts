/**
 * Downloads latest pack binaries from GitHub releases to scripts/assets/pack/
 * Run with: bun scripts/download-pack-binaries.ts
 */

import { mkdir, writeFile, chmod, rename, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { unzip } from '@shared/utils/unzip';
import { logInfo, logSuccess } from '@shared/utils/logging';

const GITHUB_API_URL = 'https://api.github.com/repos/buildpacks/pack/releases/latest';
const ASSETS_DIR = join(process.cwd(), 'scripts/assets/pack');

type PackBinary = {
  name: string;
  assetSuffix: string;
  isZip: boolean;
  extractedName: string;
};

const PACK_BINARIES: PackBinary[] = [
  {
    name: 'pack-win.exe',
    assetSuffix: 'windows.zip',
    isZip: true,
    extractedName: 'pack.exe'
  },
  {
    name: 'pack-macos',
    assetSuffix: 'macos.tgz',
    isZip: false,
    extractedName: 'pack'
  },
  {
    name: 'pack-macos-arm',
    assetSuffix: 'macos-arm64.tgz',
    isZip: false,
    extractedName: 'pack'
  },
  {
    name: 'pack-linux',
    assetSuffix: 'linux.tgz',
    isZip: false,
    extractedName: 'pack'
  },
  {
    name: 'pack-linux-arm',
    assetSuffix: 'linux-arm64.tgz',
    isZip: false,
    extractedName: 'pack'
  }
];

const getLatestRelease = async () => {
  const response = await fetch(GITHUB_API_URL, {
    headers: { Accept: 'application/vnd.github.v3+json' }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.statusText}`);
  }
  return response.json() as Promise<{ tag_name: string; assets: { name: string; browser_download_url: string }[] }>;
};

const downloadBinary = async ({ binary, downloadUrl }: { binary: PackBinary; downloadUrl: string }) => {
  logInfo(`Downloading ${binary.name}...`);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${binary.name}: ${response.statusText}`);
  }

  const tempDir = join(ASSETS_DIR, `_temp_${binary.name}`);
  await mkdir(tempDir, { recursive: true });

  const archivePath = join(tempDir, binary.isZip ? 'archive.zip' : 'archive.tgz');
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(archivePath, Buffer.from(arrayBuffer));

  if (binary.isZip) {
    await unzip({ zipFilePath: archivePath, outputDir: tempDir });
  } else if (process.platform === 'win32') {
    execSync(`powershell -command "cd '${tempDir}'; tar -xzf 'archive.tgz'"`, { stdio: 'ignore' });
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${tempDir}"`, { stdio: 'ignore' });
  }

  const extractedPath = join(tempDir, binary.extractedName);
  const finalPath = join(ASSETS_DIR, binary.name);

  await rename(extractedPath, finalPath);

  if (!binary.name.endsWith('.exe')) {
    await chmod(finalPath, 0o755);
  }

  await rm(tempDir, { recursive: true, force: true });

  logSuccess(`Done ${binary.name}`);
};

const main = async () => {
  logInfo('Fetching latest pack release info...');
  const release = await getLatestRelease();
  const version = release.tag_name;

  logSuccess(`Latest pack version: ${version}`);

  await mkdir(ASSETS_DIR, { recursive: true });

  for (const binary of PACK_BINARIES) {
    const expectedAssetName = `pack-${version}-${binary.assetSuffix}`;
    const asset = release.assets.find((a) => a.name === expectedAssetName);

    if (!asset) {
      throw new Error(`Asset not found: ${expectedAssetName}`);
    }

    await downloadBinary({ binary, downloadUrl: asset.browser_download_url });
  }

  logSuccess(`All pack ${version} binaries downloaded to ${ASSETS_DIR}`);
};

if (import.meta.main) {
  main();
}
