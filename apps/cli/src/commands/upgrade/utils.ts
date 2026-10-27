import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import { CliError } from '@utils/errors';
import { exec } from '@utils/exec';
import type { SupportedPlatform } from '@utils/platform';
import { realpath } from 'fs-extra';
import { localStatePaths } from 'src/config/local-state-paths';

type PackageManager = 'npm' | 'bun' | 'pnpm';

type InstallationType = 'native' | 'package-global' | 'package-local' | 'unknown';

export type InstallationDetection = {
  installationType: InstallationType;
  packageManager?: PackageManager;
};

const normalizePath = (pathValue: string) => pathValue.replace(/\\/g, '/').toLowerCase();

const getCandidatePaths = async (): Promise<string[]> => {
  const candidates = [process.argv[1], process.execPath].filter(Boolean).map((pathValue) => resolve(pathValue));
  const realPaths = await Promise.all(
    candidates.map(async (pathValue) => {
      try {
        return await realpath(pathValue);
      } catch {
        return pathValue;
      }
    })
  );
  return [...new Set([...candidates, ...realPaths].map(normalizePath))];
};

const inferPackageManager = ({ candidatePaths }: { candidatePaths: string[] }): PackageManager => {
  const npmExecpath = (process.env.npm_execpath || '').toLowerCase();
  const npmUserAgent = (process.env.npm_config_user_agent || '').toLowerCase();
  const context = [npmExecpath, npmUserAgent, ...candidatePaths].join(' ');

  if (context.includes('pnpm')) {
    return 'pnpm';
  }
  if (context.includes('bun')) {
    return 'bun';
  }
  return 'npm';
};

export const detectInstallationType = async (): Promise<InstallationDetection> => {
  const candidatePaths = await getCandidatePaths();
  const currentWorkingDir = `${normalizePath(process.cwd())}/`;
  const nativeBinPath = normalizePath(localStatePaths.nativeInstallBinDirectory());

  const isNativeInstallation = candidatePaths.some((candidatePath) => candidatePath.includes(nativeBinPath));
  if (isNativeInstallation) {
    return { installationType: 'native' };
  }

  const nodeModulesCandidatePaths = candidatePaths.filter((candidatePath) => candidatePath.includes('/node_modules/'));
  if (!nodeModulesCandidatePaths.length) {
    return { installationType: 'unknown' };
  }

  const globalNodeModulesPatterns = [
    '/usr/local/lib/node_modules/',
    '/usr/lib/node_modules/',
    '/opt/homebrew/lib/node_modules/',
    '/appdata/roaming/npm/node_modules/',
    '/.bun/install/global/node_modules/',
    '/.pnpm-global/',
    '/pnpm/global/'
  ];

  const isGlobalInstallation =
    nodeModulesCandidatePaths.some((candidatePath) =>
      globalNodeModulesPatterns.some((pattern) => candidatePath.includes(pattern))
    ) || nodeModulesCandidatePaths.every((candidatePath) => !`${candidatePath}/`.startsWith(currentWorkingDir));

  return {
    installationType: isGlobalInstallation ? 'package-global' : 'package-local',
    packageManager: inferPackageManager({ candidatePaths })
  };
};

const INSTALLER_SCRIPT_NAMES: { [_platform in SupportedPlatform]: string } = {
  win: 'windows.ps1',
  'win-arm': 'windows-arm.ps1',
  linux: 'linux.sh',
  'linux-arm': 'linux-arm.sh',
  alpine: 'alpine.sh',
  macos: 'macos.sh',
  'macos-arm': 'macos-arm.sh'
};

export const getInstallerUrl = (installsUrl: string, platform: SupportedPlatform = getPlatform()) =>
  `${installsUrl}/${INSTALLER_SCRIPT_NAMES[platform]}`;

/** The command a person runs to install. The upgrade itself runs the same installer from a file instead. */
export const getInstallCommand = ({ installerUrl, version }: { installerUrl: string; version: string }) =>
  installerUrl.endsWith('.ps1')
    ? `$env:STACKTAPE_VERSION='${version}'; irm ${installerUrl} | iex`
    : `curl -fsSL ${installerUrl} | STACKTAPE_VERSION=${version} sh`;

// An exact version also crosses a major release or the preview tag, which `npm update` would not.
export const getUpgradeCommand = (
  { installationType, packageManager = 'npm' }: InstallationDetection,
  { installerUrl, version }: { installerUrl: string; version: string }
): string => {
  const addCommand = packageManager === 'npm' ? 'npm install' : `${packageManager} add`;
  switch (installationType) {
    case 'package-global':
      return `${addCommand} -g stacktape@${version}`;
    case 'package-local':
      return `${addCommand} stacktape@${version}`;
    default:
      return getInstallCommand({ installerUrl, version });
  }
};

/**
 * Runs the installer as a file with `STACKTAPE_VERSION` set. Windows Defender blocks a `powershell.exe` whose command
 * line downloads and runs a script (`iwr … | iex`), so the CLI downloads it itself.
 */
export const runNativeInstaller = async ({ installerUrl, version }: { installerUrl: string; version: string }) => {
  const response = await fetch(installerUrl, { signal: AbortSignal.timeout(30000) }).catch((cause) => {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_UPGRADE_DOWNLOAD_FAILED',
      message: `Could not download the Stacktape installer from ${installerUrl}.`,
      hints: 'Check your internet connection and run `stacktape upgrade` again.',
      cause
    });
  });
  if (!response.ok) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_UPGRADE_DOWNLOAD_FAILED',
      message: `Could not download the Stacktape installer from ${installerUrl} (HTTP ${response.status}).`,
      hints: 'Run `stacktape upgrade` again later.'
    });
  }
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-upgrade-'));
  try {
    const isPowerShell = installerUrl.endsWith('.ps1');
    const scriptPath = join(directory, isPowerShell ? 'install.ps1' : 'install.sh');
    await writeFile(scriptPath, await response.text());
    const [command, args] = isPowerShell
      ? ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]]
      : ['sh', [scriptPath]];
    // The installer already printed why it failed, so the error does not repeat its output.
    await exec(command, args, { disableStdout: false, env: { STACKTAPE_VERSION: version } }).catch((error) => {
      throw new CliError({
        category: 'CLI',
        code: 'CLI_UPGRADE_INSTALLER_FAILED',
        message: `The Stacktape installer failed${error?.exitCode ? ` with exit code ${error.exitCode}` : ''}.`,
        // `-ExecutionPolicy Bypass` cannot override a policy set by Group Policy; the printed command is not affected.
        hints: `${isPowerShell ? 'If PowerShell refused to run the script, run' : 'Run'} the installer yourself: ${getInstallCommand({ installerUrl, version })}`
      });
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
