import { posix, win32 } from 'node:path';

export const resolveEc2RunnerConfigPath = ({
  configPath,
  repositoryRoot
}: {
  configPath: string;
  repositoryRoot: string;
}) => {
  const pathApi = win32.isAbsolute(configPath) || win32.isAbsolute(repositoryRoot) ? win32 : posix;
  const relativeConfigPath = pathApi.relative(pathApi.resolve(repositoryRoot), pathApi.resolve(configPath));
  const firstSegment = relativeConfigPath.split(pathApi.sep)[0];

  if (!relativeConfigPath || pathApi.isAbsolute(relativeConfigPath) || firstSegment === '..') {
    throw new Error('The Stacktape config file is outside the Git repository.');
  }

  return relativeConfigPath.replaceAll('\\', '/');
};
