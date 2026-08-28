import type { SupportedEsPackageManager } from '@stacktape/packaging/runtime-contracts';

const installScripts: { [_pm in SupportedEsPackageManager]: { ciInstall: string[]; normalInstall: string[] } } = {
  npm: {
    ciInstall: ['npm', 'ci'],
    normalInstall: ['npm', 'install']
  },
  yarn: {
    ciInstall: ['yarn', 'install', '--frozen-lockfile', '--ignore-platform', '--ignore-engines'],
    normalInstall: ['yarn', 'install']
  },
  pnpm: {
    ciInstall: ['pnpm', 'install', '--frozen-lockfile'],
    normalInstall: ['pnpm', 'install']
  },
  bun: {
    ciInstall: ['bun', 'install', '--frozen-lockfile'],
    normalInstall: ['bun', 'install']
  },
  deno: {
    ciInstall: ['deno', 'install', '--frozen'],
    normalInstall: ['deno', 'install']
  }
};

export const getEsInstallScript = (packageManager: SupportedEsPackageManager, installType: 'normal' | 'CI') => {
  return installScripts[packageManager][installType === 'CI' ? 'ciInstall' : 'normalInstall'];
};

const pnpmVersionForLockfile = (lockfile: string | undefined) => {
  const version = lockfile?.match(/^lockfileVersion:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1];
  if (version === '6.0' || version === '6') return '8.15.9';
  if (version === '5.4') return '7.33.7';
  return undefined;
};

const declaredPnpmVersion = (packageManagerDeclaration: string | undefined) => {
  const match = packageManagerDeclaration?.match(/^pnpm@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\+.*)?$/);
  return match?.[1];
};

export const getProjectDependencyInstallScript = ({
  packageManager,
  installType,
  packageManagerDeclaration,
  lockfile
}: {
  packageManager: SupportedEsPackageManager;
  installType: 'normal' | 'CI';
  packageManagerDeclaration?: string;
  lockfile?: string;
}) => {
  const installScript = getEsInstallScript(packageManager, installType);
  if (packageManager !== 'pnpm') return installScript;

  const version = declaredPnpmVersion(packageManagerDeclaration) ?? pnpmVersionForLockfile(lockfile);
  return version === undefined ? installScript : ['pnpm', 'dlx', `pnpm@${version}`, ...installScript.slice(1)];
};
