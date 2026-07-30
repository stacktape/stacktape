import path from 'node:path';
import fsExtra from 'fs-extra';

const isWindows = /^win/i.test(process.platform);

/**
 * Sometimes, people want to look for local executable files
 * which are specified with either relative or absolute file path.
 */
const isFilepath = (cmd: string): string | undefined => {
  return cmd.includes(path.sep) ? path.resolve(cmd) : undefined;
};

/**
 * In Windows OS, there are aliases to executable files, like ".sh", ".bash" or ".py".
 */
const getApplicableExtensions = (): string[] => {
  return isWindows ? (process.env.PATHEXT || '').split(path.delimiter) : [''];
};

/**
 * Resolves if the given file is executable or not, regarding "PATHEXT" to be applied.
 * Resolves the absolute file path just checked, or undefined.
 */
const isExecutable = (absolutePath: string): string => {
  return getApplicableExtensions()
    .map((ext) => {
      const p = absolutePath.toLocaleLowerCase().endsWith(ext.toLocaleLowerCase()) ? absolutePath : absolutePath + ext;
      try {
        fsExtra.accessSync(p);
        return p;
      } catch {
        return '';
      }
    })
    .filter(Boolean)[0];
};

/**
 * Returns all executable files which have the same name with the target command.
 */
const findExecutableUnderDir = (cmd: string, dir: string): string[] => {
  let files = [];
  try {
    files = fsExtra.readdirSync(dir);
  } catch {
    // do nothing
  }
  const matches = files.filter((f) => path.basename(f).split('.')[0] === cmd);
  return matches.map((f) => isExecutable(path.join(dir, f)));
};

/**
 * Returns a list of directories on which the target command should be looked for.
 */
const getDirsToWalkThrough = (additionalPaths: string[] = []): string[] => {
  const envName = isWindows ? 'Path' : 'PATH';
  return (process.env[envName] || '').split(path.delimiter).concat(additionalPaths);
};

/**
 * Returns async promise with absolute file path of given command,
 * and resolves with undefined if the command not found.
 * Resolves absolute file path, or undefined if not found.
 */
export const checkExecutableInPath = (command: string): string => {
  const dirPath = isFilepath(command);
  if (dirPath) {
    return isExecutable(dirPath);
  }
  const dirs = getDirsToWalkThrough([]);
  const matched = dirs.map((dir) => findExecutableUnderDir(command, dir));
  return matched.flat().filter(Boolean)[0];
};

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
  if (platform === 'win32' && arch === 'x64') {
    return 'win';
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

export const getInstallationScript = () => {
  const installationScripts: { [_platform in SupportedPlatform]: string } = {
    win: 'iwr https://installs.stacktape.com/windows.ps1 -useb | iex',
    linux: 'curl -L https://installs.stacktape.com/linux.sh | sh',
    'linux-arm': 'curl -L https://installs.stacktape.com/linux-arm.sh | sh',
    alpine: 'curl -L https://installs.stacktape.com/alpine.sh | sh',
    macos: 'curl -L https://installs.stacktape.com/macos.sh | sh',
    'macos-arm': 'curl -L https://installs.stacktape.com/macos-arm.sh | sh'
  };
  return installationScripts[getPlatform()];
};
