import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { getInstallationScript } from '@shared/utils/bin-executable';
import { realpath } from 'fs-extra';

export type PackageManager = 'npm' | 'bun' | 'pnpm';

export type InstallationType = 'native' | 'package-global' | 'package-local' | 'unknown';

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
  const nativeBinPath = normalizePath(join(homedir(), '.stacktape', 'bin'));

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

export const getUpgradeCommand = ({ installationType, packageManager }: InstallationDetection): string => {
  const effectivePackageManager = packageManager || 'npm';

  switch (installationType) {
    case 'native':
      return getInstallationScript();
    case 'package-global':
      return effectivePackageManager === 'bun'
        ? 'bun update -g stacktape'
        : effectivePackageManager === 'pnpm'
          ? 'pnpm update -g stacktape'
          : 'npm update -g stacktape';
    case 'package-local':
      return effectivePackageManager === 'bun'
        ? 'bun update stacktape'
        : effectivePackageManager === 'pnpm'
          ? 'pnpm update stacktape'
          : 'npm update stacktape';
    default:
      return getInstallationScript();
  }
};
