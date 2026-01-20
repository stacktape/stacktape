/**
 * Downloads bore binaries for all supported platforms to scripts/assets/bore/
 * Run with: bun scripts/download-bore-binaries.ts
 */

import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const BORE_VERSION = 'v0.6.0';

const BORE_BINARIES = [
  {
    name: 'bore-win.exe',
    url: `https://github.com/ekzhang/bore/releases/download/${BORE_VERSION}/bore-${BORE_VERSION}-x86_64-pc-windows-msvc.zip`,
    isZip: true,
    extractedName: 'bore.exe'
  },
  {
    name: 'bore-macos',
    url: `https://github.com/ekzhang/bore/releases/download/${BORE_VERSION}/bore-${BORE_VERSION}-x86_64-apple-darwin.tar.gz`,
    isZip: false,
    extractedName: 'bore'
  },
  {
    name: 'bore-macos-arm',
    url: `https://github.com/ekzhang/bore/releases/download/${BORE_VERSION}/bore-${BORE_VERSION}-aarch64-apple-darwin.tar.gz`,
    isZip: false,
    extractedName: 'bore'
  },
  {
    name: 'bore-linux',
    url: `https://github.com/ekzhang/bore/releases/download/${BORE_VERSION}/bore-${BORE_VERSION}-x86_64-unknown-linux-musl.tar.gz`,
    isZip: false,
    extractedName: 'bore'
  },
  {
    name: 'bore-linux-arm',
    url: `https://github.com/ekzhang/bore/releases/download/${BORE_VERSION}/bore-${BORE_VERSION}-aarch64-unknown-linux-musl.tar.gz`,
    isZip: false,
    extractedName: 'bore'
  }
];

const ASSETS_DIR = join(process.cwd(), 'scripts/assets/bore');

const downloadBinary = async (binary: (typeof BORE_BINARIES)[0]) => {
  console.log(`Downloading ${binary.name}...`);

  const response = await fetch(binary.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${binary.name}: ${response.statusText}`);
  }

  const tempDir = join(ASSETS_DIR, `_temp_${binary.name}`);
  await mkdir(tempDir, { recursive: true });

  const archivePath = join(tempDir, binary.isZip ? 'archive.zip' : 'archive.tar.gz');
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(archivePath, Buffer.from(arrayBuffer));

  // Extract - use PowerShell on Windows to handle paths correctly
  if (process.platform === 'win32') {
    if (binary.isZip) {
      execSync(`powershell -command "Expand-Archive -Force '${archivePath}' '${tempDir}'"`, { stdio: 'ignore' });
    } else {
      // Use PowerShell to cd and extract
      execSync(`powershell -command "cd '${tempDir}'; tar -xzf 'archive.tar.gz'"`, { stdio: 'ignore' });
    }
  } else {
    if (binary.isZip) {
      execSync(`unzip -o "${archivePath}" -d "${tempDir}"`, { stdio: 'ignore' });
    } else {
      execSync(`tar -xzf "${archivePath}" -C "${tempDir}"`, { stdio: 'ignore' });
    }
  }

  // Move the binary to final location
  const extractedPath = join(tempDir, binary.extractedName);
  const finalPath = join(ASSETS_DIR, binary.name);

  // Use rename via fs
  const { rename } = await import('node:fs/promises');
  await rename(extractedPath, finalPath);

  // Make executable on Unix
  if (!binary.name.endsWith('.exe')) {
    await chmod(finalPath, 0o755);
  }

  // Cleanup temp dir
  const { rm } = await import('node:fs/promises');
  await rm(tempDir, { recursive: true, force: true });

  console.log(`✓ ${binary.name}`);
};

const main = async () => {
  await mkdir(ASSETS_DIR, { recursive: true });

  console.log(`Downloading bore ${BORE_VERSION} binaries to ${ASSETS_DIR}\n`);

  for (const binary of BORE_BINARIES) {
    await downloadBinary(binary);
  }

  console.log('\nAll bore binaries downloaded!');
};

main().catch(console.error);
