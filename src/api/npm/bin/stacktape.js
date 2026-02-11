#!/usr/bin/env node

/**
 * Stacktape CLI launcher
 * Downloads and caches the platform-specific binary on first run
 */

const { spawnSync, execSync } = require('node:child_process');
const {
  createWriteStream,
  existsSync,
  chmodSync,
  mkdirSync,
  accessSync,
  constants,
  unlinkSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  statSync
} = require('node:fs');
const { get: httpsGet } = require('node:https');
const { platform, arch, homedir } = require('node:os');
const { join } = require('node:path');

const PACKAGE_VERSION = require('../package.json').version;

const GITHUB_REPO = 'stacktape/stacktape';

const PLATFORM_MAP = {
  'win32-x64': { fileName: 'windows.zip', extract: extractZip },
  'linux-x64': { fileName: 'linux.tar.gz', extract: extractTarGz },
  'linux-arm64': { fileName: 'linux-arm.tar.gz', extract: extractTarGz },
  'darwin-x64': { fileName: 'macos.tar.gz', extract: extractTarGz },
  'darwin-arm64': { fileName: 'macos-arm.tar.gz', extract: extractTarGz },
  'linux-x64-musl': { fileName: 'alpine.tar.gz', extract: extractTarGz }
};

const REQUIRED_HELPER_LAMBDA_PREFIXES = [
  'stacktapeServiceLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda',
  'batchJobTriggerLambda'
];

const INSTALL_MARKER_FILE_NAME = '.stacktape-install.json';
const INSTALL_LOCK_DIR_SUFFIX = '.stacktape-install.lock';
const LOCK_WAIT_TIMEOUT_MS = 120000;
const STALE_LOCK_TIMEOUT_MS = 300000;

// ANSI color codes
const colors = {
  reset: '\x1B[0m',
  dim: '\x1B[2m',
  green: '\x1B[32m',
  cyan: '\x1B[36m',
  red: '\x1B[31m',
  bold: '\x1B[1m'
};

const isTTY = process.stdout.isTTY;

const printLogo = () => {
  const { dim, green, reset, bold } = colors;
  console.info(`
${dim}     _____ _             _    _                    ${reset}
${dim}    / ____| |           | |  | |                   ${reset}
${green}   | (___ | |_ __ _  ___| | _| |_ __ _ _ __   ___  ${reset}
${green}    \\___ \\| __/ _\` |/ __| |/ / __/ _\` | '_ \\ / _ \\ ${reset}
${green}    ____) | || (_| | (__|   <| || (_| | |_) |  __/ ${reset}
${green}   |_____/ \\__\\__,_|\\___|_|\\_\\\\__\\__,_| .__/ \\___| ${reset}
${green}                                      | |          ${reset}
${green}                                      |_|          ${reset}

${bold}${green}Stacktape ${PACKAGE_VERSION} installed successfully!${reset}

${dim}To get started, run:${reset}

  stacktape init

${dim}For more information visit ${reset}https://docs.stacktape.com
`);
};

const printProgress = (downloaded, total) => {
  if (!isTTY) return;

  const width = 40;
  const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const bar = `${'#'.repeat(filled)}${'-'.repeat(empty)}`;
  process.stdout.write(`\r${colors.cyan}${bar} ${percent}%${colors.reset}`);
};

function detectPlatform() {
  const currentPlatform = platform();
  const currentArch = arch();

  // Detect Alpine Linux (uses musl instead of glibc)
  if (currentPlatform === 'linux' && currentArch === 'x64') {
    try {
      const ldd = execSync('ldd --version 2>&1 || true', { encoding: 'utf8' });
      if (ldd.includes('musl')) {
        return 'linux-x64-musl';
      }
    } catch {
      // If ldd fails, assume glibc
    }
  }

  const platformKey = `${currentPlatform}-${currentArch}`;

  if (!PLATFORM_MAP[platformKey]) {
    console.error(`${colors.red}Error: Unsupported platform ${currentPlatform}-${currentArch}${colors.reset}`);
    console.error('Stacktape binaries are available for:');
    Object.keys(PLATFORM_MAP).forEach((key) => {
      console.error(`  - ${key}`);
    });
    process.exit(1);
  }

  return platformKey;
}

async function downloadFile(url, destPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const fileStream = createWriteStream(destPath);

        const handleResponse = (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            httpsGet(response.headers.location, handleResponse).on('error', reject);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          const totalBytes = Number.parseInt(response.headers['content-length'], 10) || 0;
          let downloadedBytes = 0;

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            printProgress(downloadedBytes, totalBytes);
          });

          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            if (isTTY) process.stdout.write('\n');
            resolve();
          });
        };

        httpsGet(url, handleResponse).on('error', reject);
      });

      return; // Success
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.info(`\n${colors.dim}Retrying download (${i + 1}/${retries})...${colors.reset}`);
    }
  }
}

async function extractTarGz(archivePath, destDir) {
  const tar = require('tar');
  await tar.x({
    file: archivePath,
    cwd: destDir
  });
}

async function extractZip(archivePath, destDir) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(destDir, true);
}

function setExecutablePermissions(binDir) {
  if (platform() === 'win32') {
    return;
  }

  const executables = [
    join(binDir, 'stacktape'),
    join(binDir, 'esbuild', 'exec'),
    join(binDir, 'session-manager-plugin', 'smp'),
    join(binDir, 'pack', 'pack'),
    join(binDir, 'nixpacks', 'nixpacks')
  ];

  for (const exe of executables) {
    if (existsSync(exe)) {
      try {
        chmodSync(exe, 0o755);
      } catch {
        // Ignore chmod errors
      }
    }
  }
}

async function ensureBinary() {
  const platformKey = detectPlatform();
  const platformInfo = PLATFORM_MAP[platformKey];
  const version = PACKAGE_VERSION;

  const binaryName = platform() === 'win32' ? 'stacktape.exe' : 'stacktape';

  const localCacheDir = join(__dirname, '..', 'bin');

  let cacheDir;
  try {
    mkdirSync(localCacheDir, { recursive: true });
    accessSync(localCacheDir, constants.W_OK);
    cacheDir = localCacheDir;
  } catch {
    cacheDir = join(homedir(), '.stacktape', 'bin', version);
  }

  const binaryPath = join(cacheDir, binaryName);
  const preserveLauncherScript = cacheDir === localCacheDir;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const lockDirPath = `${cacheDir}${INSTALL_LOCK_DIR_SUFFIX}`;

  const isHelperLambdasCacheComplete = () => {
    const helperLambdasDir = join(cacheDir, 'helper-lambdas');
    if (!existsSync(helperLambdasDir)) {
      return false;
    }

    try {
      const files = readdirSync(helperLambdasDir);
      return REQUIRED_HELPER_LAMBDA_PREFIXES.every((prefix) =>
        files.some((fileName) => fileName.startsWith(`${prefix}-`) && fileName.endsWith('.zip'))
      );
    } catch {
      return false;
    }
  };

  const isCacheValid = () => {
    if (!existsSync(binaryPath)) {
      return false;
    }

    if (!isHelperLambdasCacheComplete()) {
      return false;
    }

    const markerPath = join(cacheDir, INSTALL_MARKER_FILE_NAME);
    if (!existsSync(markerPath)) {
      return false;
    }

    try {
      const parsedMarker = JSON.parse(readFileSync(markerPath, 'utf8'));
      return parsedMarker.version === version && parsedMarker.platformKey === platformKey;
    } catch {
      return false;
    }
  };

  const writeInstallMarker = () => {
    const markerPath = join(cacheDir, INSTALL_MARKER_FILE_NAME);
    writeFileSync(
      markerPath,
      JSON.stringify(
        {
          version,
          platformKey,
          helperLambdas: REQUIRED_HELPER_LAMBDA_PREFIXES,
          installedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
  };

  const cleanupExtractedCache = () => {
    if (!existsSync(cacheDir)) {
      return;
    }

    try {
      const entries = readdirSync(cacheDir);
      for (const entry of entries) {
        if (preserveLauncherScript && entry === 'stacktape.js') {
          continue;
        }
        rmSync(join(cacheDir, entry), { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors and try reinstall anyway
    }
  };

  const acquireInstallLock = async () => {
    const start = Date.now();
    while (true) {
      try {
        mkdirSync(lockDirPath);
        return;
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }

        try {
          const lockStats = statSync(lockDirPath);
          const lockAge = Date.now() - lockStats.mtimeMs;
          if (lockAge > STALE_LOCK_TIMEOUT_MS) {
            rmSync(lockDirPath, { recursive: true, force: true });
            continue;
          }
        } catch {
          // Lock directory disappeared between checks
        }

        if (Date.now() - start > LOCK_WAIT_TIMEOUT_MS) {
          throw new Error('Timed out waiting for Stacktape binary installation lock');
        }

        await sleep(200);
      }
    }
  };

  const releaseInstallLock = () => {
    try {
      rmSync(lockDirPath, { recursive: true, force: true });
    } catch {
      // Ignore release lock errors
    }
  };

  const installBinary = async () => {
    console.info(`${colors.dim}Installing Stacktape ${version} for ${platformKey}...${colors.reset}`);

    mkdirSync(cacheDir, { recursive: true });

    const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${platformInfo.fileName}`;
    const archivePath = join(cacheDir, `.download-${Date.now()}-${platformInfo.fileName}`);

    try {
      console.info(`${colors.dim}Downloading from GitHub releases...${colors.reset}`);
      await downloadFile(downloadUrl, archivePath);

      console.info(`${colors.dim}Extracting...${colors.reset}`);
      await platformInfo.extract(archivePath, cacheDir);

      setExecutablePermissions(cacheDir);

      unlinkSync(archivePath);

      if (!existsSync(binaryPath)) {
        throw new Error(`Binary not found after extraction: ${binaryPath}`);
      }

      if (!isHelperLambdasCacheComplete()) {
        throw new Error('Incomplete installation: helper lambdas were not extracted correctly');
      }

      writeInstallMarker();
      printLogo();

      return binaryPath;
    } catch (error) {
      try {
        if (existsSync(archivePath)) {
          unlinkSync(archivePath);
        }
      } catch {
        // Ignore archive cleanup errors
      }
      throw error;
    }
  };

  if (isCacheValid()) {
    return binaryPath;
  }

  await acquireInstallLock();

  try {
    if (isCacheValid()) {
      return binaryPath;
    }

    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        cleanupExtractedCache();
        return await installBinary();
      } catch (error) {
        lastError = error;
        cleanupExtractedCache();
        if (attempt < 2) {
          console.info(`\n${colors.dim}Retrying installation (${attempt + 1}/2)...${colors.reset}`);
        }
      }
    }

    throw lastError;
  } finally {
    releaseInstallLock();
  }
}

function getManualInstallCommand(platformKey) {
  const commands = {
    'win32-x64': 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex',
    'linux-x64': 'curl -L https://installs.stacktape.com/linux.sh | sh',
    'linux-arm64': 'curl -L https://installs.stacktape.com/linux-arm.sh | sh',
    'linux-x64-musl': 'curl -L https://installs.stacktape.com/alpine.sh | sh',
    'darwin-x64': 'curl -L https://installs.stacktape.com/macos.sh | sh',
    'darwin-arm64': 'curl -L https://installs.stacktape.com/macos-arm.sh | sh'
  };
  return commands[platformKey] || 'See https://docs.stacktape.com for installation instructions';
}

function getGlobalBinaryPathIfVersionMatches() {
  const binaryName = platform() === 'win32' ? 'stacktape.exe' : 'stacktape';
  const globalDir = join(homedir(), '.stacktape', 'bin');
  const globalBinaryPath = join(globalDir, binaryName);
  const releaseDataPath = join(globalDir, 'release-data.json');
  const globalHelperLambdasDir = join(globalDir, 'helper-lambdas');

  if (!existsSync(globalBinaryPath) || !existsSync(releaseDataPath)) {
    return null;
  }

  try {
    const { version } = JSON.parse(readFileSync(releaseDataPath, 'utf8'));
    if (version !== PACKAGE_VERSION) {
      return null;
    }

    const files = readdirSync(globalHelperLambdasDir);
    const hasAllHelperLambdas = REQUIRED_HELPER_LAMBDA_PREFIXES.every((prefix) =>
      files.some((fileName) => fileName.startsWith(`${prefix}-`) && fileName.endsWith('.zip'))
    );
    if (!hasAllHelperLambdas) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    accessSync(globalBinaryPath, constants.X_OK);
    return globalBinaryPath;
  } catch {
    return globalBinaryPath;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);

    const globalBinaryPath = getGlobalBinaryPathIfVersionMatches();
    if (globalBinaryPath) {
      const result = spawnSync(globalBinaryPath, args, {
        stdio: 'inherit',
        env: process.env
      });
      process.exit(result.status || 0);
    }

    const binaryPath = await ensureBinary();

    const result = spawnSync(binaryPath, args, {
      stdio: 'inherit',
      env: process.env
    });

    if (result.error) {
      console.error(`${colors.red}Error executing Stacktape binary: ${result.error.message}${colors.reset}`);
      process.exit(1);
    }

    process.exit(result.status || 0);
  } catch (error) {
    console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
