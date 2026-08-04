import { resolve } from 'node:path';

const activeBuilds = new Map<string, Promise<void>>();

const getBuildKey = (workingDirectory: string): string => {
  const absolutePath = resolve(workingDirectory);
  return process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath;
};

/**
 * Framework CLIs write to fixed directories inside the application (`.next`, `.open-next`, `dist`, and similar).
 * Resources backed by the same application must therefore finish copying their output before another build starts.
 * Applications in different directories remain fully parallel.
 */
export const runWebBuildExclusive = async <T>({
  build,
  workingDirectory
}: {
  build: () => Promise<T>;
  workingDirectory: string;
}): Promise<T> => {
  const key = getBuildKey(workingDirectory);
  const previousBuild = activeBuilds.get(key) ?? Promise.resolve();
  let release!: () => void;
  const currentBuild = new Promise<void>((resolveBuild) => {
    release = resolveBuild;
  });
  const tail = previousBuild.catch(() => {}).then(() => currentBuild);
  activeBuilds.set(key, tail);

  await previousBuild.catch(() => {});
  try {
    return await build();
  } finally {
    release();
    if (activeBuilds.get(key) === tail) {
      activeBuilds.delete(key);
    }
  }
};
