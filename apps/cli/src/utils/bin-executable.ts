import type { SupportedPlatform } from '@utils/platform';
import fsExtra from 'fs-extra';

export const checkExecutableInPath = (command: string): string | undefined =>
  Bun.which(command, {
    // Bun.env is a startup snapshot. Pass the live value because tests and child-tool discovery update PATH at runtime.
    PATH: (process.platform === 'win32' ? process.env.Path || process.env.PATH : process.env.PATH) || '',
    cwd: process.cwd()
  }) || undefined;

export const isStacktapeInstalledOnSystem = () => {
  const execPath = checkExecutableInPath('stacktape');
  return Boolean(execPath);
};

export const resolveSupportedPlatform = ({
  platform,
  arch,
  isAlpine = false
}: {
  platform: NodeJS.Platform;
  arch: string;
  isAlpine?: boolean;
}): SupportedPlatform => {
  if (platform === 'win32') {
    if (arch === 'x64') {
      return 'win';
    }
    if (arch === 'arm64') {
      return 'win-arm';
    }
  }
  if (platform === 'linux') {
    if (isAlpine) {
      if (arch === 'x64') {
        return 'alpine';
      }
      throw new Error(`Unsupported Alpine architecture: ${arch}.`);
    }
    if (arch === 'x64') {
      return 'linux';
    }
    if (arch === 'arm64') {
      return 'linux-arm';
    }
  }
  if (platform === 'darwin') {
    if (arch === 'x64') {
      return 'macos';
    }
    if (arch === 'arm64') {
      return 'macos-arm';
    }
  }
  throw new Error(`Unsupported platform: ${platform}, arch: ${arch}.`);
};

export const getPlatform = (): SupportedPlatform => {
  return resolveSupportedPlatform({
    platform: process.platform,
    arch: process.arch,
    isAlpine: process.platform === 'linux' && fsExtra.existsSync('/etc/alpine-release')
  });
};

export const configureNativeRuntimeForPlatform = (platform = getPlatform()) => {
  if (platform === 'alpine') {
    process.env.OPENTUI_LIBC = 'musl';
  }
};
