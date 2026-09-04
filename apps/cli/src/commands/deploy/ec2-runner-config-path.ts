import { posix, win32 } from 'node:path';

export const resolveEc2RunnerConfigPath = ({
  configPath,
  repositoryRoot
}: {
  configPath: string;
  repositoryRoot: string;
}) => {
  const looksWindowsAbsolute = (path: string) => /^[a-z]:[\\/]/i.test(path) || path.startsWith('\\\\');
  const pathApi = looksWindowsAbsolute(configPath) || looksWindowsAbsolute(repositoryRoot) ? win32 : posix;
  const relativeConfigPath = pathApi.relative(pathApi.resolve(repositoryRoot), pathApi.resolve(configPath));

  if (
    !relativeConfigPath ||
    pathApi.isAbsolute(relativeConfigPath) ||
    relativeConfigPath === '..' ||
    relativeConfigPath.startsWith(`..${pathApi.sep}`)
  ) {
    throw new Error('The Stacktape config file is outside the Git repository.');
  }

  return relativeConfigPath.replaceAll('\\', '/');
};
