import { arch } from 'node:os';
import { basename, join } from 'node:path';
import {
  COMPLETIONS_SCRIPTS_PATH,
  CONFIG_SCHEMA_PATH,
  DIST_FOLDER_PATH,
  SCRIPTS_ASSETS_PATH,
  SOURCE_MAP_INSTALL_FILE_NAME
} from '@shared/naming/project-fs-paths';
import { buildEsCode } from '@shared/packaging/bundlers/es';
import { getPlatform } from '@shared/utils/bin-executable';
import {
  NIXPACKS_BINARY_FILE_NAMES,
  PACK_BINARY_FILE_NAMES,
  SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES
} from '@shared/utils/constants';
import { downloadFile } from '@shared/utils/download-file';
import { exec } from '@shared/utils/exec';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { archiveItem, extractTgzArchive } from '@shared/utils/zip';
import { chmod, copy, ensureDir, pathExists, readdir, readFile, readJsonSync, remove, writeJson } from 'fs-extra';
import {
  createBashCompletionScript,
  createPowershellCompletionScript,
  createZshCompletionScript
} from '../generate-completions';

// import { generateAllStarterProjects } from './generate-starter-project';

export const ALL_SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  'win',
  'linux',
  'macos',
  'macos-arm',
  'alpine',
  'linux-arm'
];

export const buildEsbuildRegister = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying esbuild-register...');
  const esbuildRegisterDistFolderPath = join(distFolderPath, 'esbuild', 'esbuild-register.js');
  await buildEsCode({
    rawCode: 'require("esbuild-register/dist/node").register();',
    distPath: esbuildRegisterDistFolderPath,
    externals: [],
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    tsConfigPath: localBuildTsConfigPath,
    keepNames: false,
    minify: true,
    nodeTarget: '18',
    cwd: process.cwd()
  });
  logSuccess('esbuild-register copied successfully.');
};

const BINARY_FOLDER_NAMES: { [_platform in SupportedPlatform]: string } = {
  win: 'windows',
  macos: 'macos',
  linux: 'linux',
  'macos-arm': 'macos-arm',
  alpine: 'alpine',
  'linux-arm': 'linux-arm'
};

const ESBUILD_BINARY_PACKAGE_NAMES: { [_platform in SupportedPlatform]: string } = {
  win: '@esbuild/win32-x64',
  macos: '@esbuild/darwin-x64',
  linux: '@esbuild/linux-x64',
  'macos-arm': '@esbuild/darwin-arm64',
  alpine: '@esbuild/linux-x64',
  'linux-arm': '@esbuild/linux-arm64'
};
const ESBUILD_BINARY_FILE_LOCATIONS: { [_platform in SupportedPlatform]: string[] } = {
  win: ['esbuild.exe'],
  macos: ['bin', 'esbuild'],
  linux: ['bin', 'esbuild'],
  'macos-arm': ['bin', 'esbuild'],
  alpine: ['bin', 'esbuild'],
  'linux-arm': ['bin', 'esbuild']
};

// File patterns that should have executable permissions in archives
export const EXECUTABLE_FILE_PATTERNS = [
  'stacktape',
  'stacktape.exe',
  '*/pack',
  '*/pack.exe',
  '*/nixpacks',
  '*/nixpacks.exe',
  '*/smp',
  '*/smp.exe',
  '*/exec',
  '*/exec.exe'
];

export const generateSourceMapInstall = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating source map install file...');
  await buildEsCode({
    rawCode: 'require("source-map-support").install({ environment: "node", handleUncaughtExceptions: false });',
    distPath: join(distFolderPath, SOURCE_MAP_INSTALL_FILE_NAME),
    externals: ['path'],
    excludeDependencies: ['path'],
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    tsConfigPath: localBuildTsConfigPath,
    keepNames: true,
    nodeTarget: '18.18',
    cwd: process.cwd()
  });

  logSuccess('Source map install file generated successfully.');
};

export const buildBinaryFile = async ({
  distFolderPath,
  debug,
  platform,
  version
}: {
  distFolderPath?: string;
  debug?: boolean;
  platform: SupportedPlatform;
  version?: string;
}) => {
  const binFolderName = BINARY_FOLDER_NAMES[platform];
  const outputFolderPath = join(distFolderPath, binFolderName);

  logInfo(`Building binary for platform ${platform} using Bun... ${debug ? '[DEBUG mode]' : ''}`);

  // Ensure output directory exists
  await ensureDir(outputFolderPath);

  // Map platform to Bun compile target
  const compileTarget = (() => {
    switch (platform) {
      case 'macos':
        return 'bun-darwin-x64';
      case 'macos-arm':
        return 'bun-darwin-arm64';
      case 'linux':
        return 'bun-linux-x64';
      case 'linux-arm':
        return 'bun-linux-arm64';
      case 'win':
        return 'bun-windows-x64';
      case 'alpine':
        return 'bun-linux-x64-baseline';
      default:
        return 'bun';
    }
  })();

  const entrypoint = join(process.cwd(), 'src', 'api', 'cli', 'index.ts');
  const outputFileName = platform === 'win' ? 'stacktape.exe' : 'stacktape';
  const outputPath = join(outputFolderPath, outputFileName);

  const buildArgs = [
    'build',
    '--compile',
    `--target=${compileTarget}`,
    entrypoint,
    `--outfile=${outputPath}`,
    '--sourcemap=inline',
    `--define=STACKTAPE_VERSION="${version || 'dev'}"`
  ];

  if (!debug) {
    buildArgs.push('--minify');
    // buildArgs.push('--bytecode');
  }

  try {
    await exec('bun', buildArgs, {
      cwd: process.cwd(),
      disableStdout: true
    });
  } catch (error) {
    throw new Error(
      `Failed to build binary for platform ${platform}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (platform !== 'win') {
    await chmod(outputPath, 0o755);
  }

  logSuccess(`Binary for platform ${platform} generated successfully.`);

  return outputFolderPath;
};

export const copyPackBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  const binFileName = PACK_BINARY_FILE_NAMES[platform];
  const sourcePath = join(SCRIPTS_ASSETS_PATH, 'pack', binFileName);
  const distPath = join(
    distFolderPath,
    BINARY_FOLDER_NAMES[platform],
    'pack',
    platform !== 'win' ? 'pack' : 'pack.exe'
  );
  return await copy(sourcePath, distPath);
};

export const copyNixpacksBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  const binFileName = NIXPACKS_BINARY_FILE_NAMES[platform];
  const sourcePath = join(SCRIPTS_ASSETS_PATH, 'nixpacks', binFileName);
  const distPath = join(
    distFolderPath,
    BINARY_FOLDER_NAMES[platform],
    'nixpacks',
    platform !== 'win' ? 'nixpacks' : 'nixpacks.exe'
  );
  return await copy(sourcePath, distPath);
};

export const copySessionsManagerPluginBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  const binFileName = SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES[platform];
  const sourcePath = join(SCRIPTS_ASSETS_PATH, 'session-manager-plugin', binFileName);
  const distPath = join(
    distFolderPath,
    BINARY_FOLDER_NAMES[platform],
    'session-manager-plugin',
    platform === 'win' ? 'smp.exe' : 'smp'
  );
  return await copy(sourcePath, distPath);
};

export const copyEsbuildBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  const { dependencies } = readJsonSync(join(process.cwd(), 'package.json'));
  const version = dependencies.esbuild.replace('^', '').replace('~', '');
  const esbuildPackageName = ESBUILD_BINARY_PACKAGE_NAMES[platform];
  const esbuildSubPackageName = esbuildPackageName.replace('@esbuild/', '');
  const downloadUrl = `https://registry.yarnpkg.com/${esbuildPackageName}/-/${esbuildSubPackageName}-${version}.tgz`;
  const downloadDir = join(distFolderPath, 'downloaded');
  await downloadFile({ url: downloadUrl, downloadTo: downloadDir });
  const downloadedFilePath = join(downloadDir, `${esbuildSubPackageName}-${version}.tgz`);
  const extractedPath = await extractTgzArchive({
    sourcePath: downloadedFilePath,
    distDirPath: downloadDir
  });
  const esbuildBinFileLocations = ESBUILD_BINARY_FILE_LOCATIONS[platform];
  const binaryDist = join(distFolderPath, BINARY_FOLDER_NAMES[platform]);
  const esbuildExecutableSourcePath = join(extractedPath, ...esbuildBinFileLocations);
  const esbuildExecutableDistPath = join(
    binaryDist,
    'esbuild',
    esbuildBinFileLocations[esbuildBinFileLocations.length - 1].replace('esbuild', 'exec')
  );
  if (platform !== 'win') {
    await chmod(esbuildExecutableSourcePath, '755');
  }
  await copy(esbuildExecutableSourcePath, esbuildExecutableDistPath);
  if (platform !== 'win') {
    await chmod(esbuildExecutableDistPath, '755');
  }
  await Promise.all([remove(extractedPath), remove(downloadedFilePath)]);
};

export const generateAutocompletionsScripts = async ({
  distFolderPath
  // platform
}: {
  distFolderPath?: string;
  // platform: SupportedPlatform;
}) => {
  const completionScriptPath = await readdir(COMPLETIONS_SCRIPTS_PATH);
  await ensureDir(join(distFolderPath, 'completions'));

  await Promise.all(
    completionScriptPath.map(async (entry) => {
      const scriptContent = await readFile(join(COMPLETIONS_SCRIPTS_PATH, entry), {
        encoding: 'utf8'
      });

      switch (entry) {
        case 'zsh.sh':
          await createZshCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        case 'bash.sh':
          await createBashCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        case 'powershell.ps1':
          await createPowershellCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        default:
          logInfo(`Skipping '${entry}' - unknown completion script`);
          return;
      }
      logSuccess(`Completion script '${entry}' prepared successfully.`);
    })
  );
};

export const copyConfigSchema = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying config schema...');
  await copy(CONFIG_SCHEMA_PATH, join(distFolderPath, basename(CONFIG_SCHEMA_PATH)));
  logSuccess('Config schema copied successfully.');
};

export const copyHelperLambdas = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying helper lambdas...');
  const sourcePath = join(DIST_FOLDER_PATH, 'helper-lambdas');
  const destPath = join(distFolderPath, 'helper-lambdas');
  await copy(sourcePath, destPath);
  logSuccess('Helper lambdas copied successfully.');
};

export const createReleaseDataFile = async ({
  distFolderPath,
  version
}: {
  distFolderPath?: string;
  version?: string;
}) => {
  logInfo('Creating release data file...');
  await writeJson(join(distFolderPath, 'release-data.json'), { version: version || 'dev' });
  logSuccess('Release data file created successfully.');
};

export const getPlatformsToBuildFor = ({
  presetPlatforms
}: {
  presetPlatforms?: (SupportedPlatform | 'current-arch' | 'all' | 'current')[];
}): SupportedPlatform[] => {
  const platforms = presetPlatforms;
  if (platforms[0] === 'current-arch') {
    const currentCpuArchitecture = arch();
    if (currentCpuArchitecture === 'x64') {
      return ALL_SUPPORTED_PLATFORMS.filter((platform) => !platform.includes('arm'));
    }
    return ALL_SUPPORTED_PLATFORMS.filter((platform) => platform.includes('arm'));
  }
  if (platforms[0] === 'all') {
    return ALL_SUPPORTED_PLATFORMS;
  }
  if (platforms[0] === 'current') {
    return [getPlatform()];
  }
  return Array.isArray(platforms) ? (platforms as SupportedPlatform[]) : [platforms as SupportedPlatform];
};

export const archiveCliBinaries = async ({
  distFolderPath,
  platforms
}: {
  distFolderPath: string;
  platforms: SupportedPlatform[];
}) => {
  logInfo(`Archiving binaries for ${platforms.length} platform(s)...`);

  for (const platform of platforms) {
    const binFolderName = BINARY_FOLDER_NAMES[platform];
    const platformDistFolderPath = join(distFolderPath, binFolderName);

    if (await pathExists(platformDistFolderPath)) {
      await archiveItem({
        absoluteSourcePath: platformDistFolderPath,
        format: platform === 'win' ? 'zip' : 'tgz',
        executablePatterns: EXECUTABLE_FILE_PATTERNS,
        useNativeZip: platform === 'win' // Native zip for Windows archives
      });
      logSuccess(`Archived binary for platform: ${platform}`);
    } else {
      logInfo(`Platform directory not found, skipping: ${platform}`);
    }
  }

  logSuccess('All binaries archived successfully');
};
