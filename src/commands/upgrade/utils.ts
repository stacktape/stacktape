import { homedir } from 'node:os';
import { join } from 'node:path';
import { getInstallationScript } from '@shared/utils/bin-executable';
import { pathExists } from 'fs-extra';

export type InstallationType = 'native' | 'npm-global' | 'npm-local' | 'unknown';

export const detectInstallationType = async (): Promise<InstallationType> => {
  const execPath = process.execPath;
  const argv1 = process.argv[1] || '';

  // Check if running from node_modules (npm/bun/pnpm local install)
  if (argv1.includes('node_modules')) {
    // Check if it's in the project's node_modules (local) or global
    const isLocalNodeModules =
      !argv1.includes(join(homedir(), '.npm')) &&
      !argv1.includes(join(homedir(), '.bun')) &&
      !argv1.includes(join(homedir(), '.pnpm')) &&
      !argv1.includes('/usr/lib/node_modules') &&
      !argv1.includes('/usr/local/lib/node_modules');

    return isLocalNodeModules ? 'npm-local' : 'npm-global';
  }

  // Check if running from ~/.stacktape/bin (native install)
  const nativeBinPath = join(homedir(), '.stacktape', 'bin');
  if (argv1.startsWith(nativeBinPath) || execPath.startsWith(nativeBinPath)) {
    return 'native';
  }

  // Check if stacktape binary exists in native location
  const nativeStacktapePath = join(nativeBinPath, process.platform === 'win32' ? 'stacktape.exe' : 'stacktape');
  if (await pathExists(nativeStacktapePath)) {
    return 'native';
  }

  return 'unknown';
};

export const getUpgradeCommand = (installationType: InstallationType): string => {
  const isEc2Runner = process.env.STP_EC2_RUNNER === 'true';

  switch (installationType) {
    case 'native':
      return getInstallationScript({ forCi: isEc2Runner });
    case 'npm-global':
      return detectPackageManager() === 'bun'
        ? 'bun update -g stacktape'
        : detectPackageManager() === 'pnpm'
          ? 'pnpm update -g stacktape'
          : 'npm update -g stacktape';
    case 'npm-local':
      return detectPackageManager() === 'bun'
        ? 'bun update stacktape'
        : detectPackageManager() === 'pnpm'
          ? 'pnpm update stacktape'
          : 'npm update stacktape';
    default:
      return getInstallationScript({ forCi: isEc2Runner });
  }
};

const detectPackageManager = (): 'npm' | 'bun' | 'pnpm' => {
  const execPath = process.execPath;
  const argv1 = process.argv[1] || '';
  const npmExecpath = process.env.npm_execpath || '';

  if (execPath.includes('bun') || argv1.includes('.bun') || npmExecpath.includes('bun')) {
    return 'bun';
  }
  if (argv1.includes('.pnpm') || npmExecpath.includes('pnpm')) {
    return 'pnpm';
  }
  return 'npm';
};
