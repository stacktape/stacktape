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
  return installScripts?.[packageManager]?.[installType === 'CI' ? 'ciInstall' : 'normalInstall'] || null;
};
