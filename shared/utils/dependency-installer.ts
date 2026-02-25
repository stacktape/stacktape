import type { ExecaReturnValue } from 'execa';
import { getLockFileData } from '@shared/packaging/bundlers/es/utils';
import ci from 'ci-info';
import { remove, stat, writeFile } from 'fs-extra';
import { join } from 'node:path';
import readPkgUp from 'read-pkg-up';
import { checkExecutableInPath } from './bin-executable';
import { getEsInstallScript } from './es-install-scripts';
import { exec } from './exec';
import { raiseError } from './misc';
import { findProjectRoot } from './monorepo';

const wait = async ({ ms }: { ms: number }) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const withInstallLock = async <T>({
  installDir,
  installFn
}: {
  installDir: string;
  installFn: () => Promise<T>;
}): Promise<T> => {
  const lockPath = join(installDir, '.stacktape-install.lock');
  const startedAt = Date.now();
  const staleLockAfterMs = 5 * 60 * 1000;
  const maxWaitMs = 10 * 60 * 1000;

  while (true) {
    try {
      await writeFile(lockPath, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), {
        flag: 'wx'
      });
      break;
    } catch (err) {
      const error = err as { code?: string };
      if (error.code !== 'EEXIST') {
        throw err;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        raiseError({
          type: 'PACKAGING',
          message: `Timed out waiting for dependency install lock in ${installDir}`,
          hint: 'Another Stacktape process may be stuck. Remove .stacktape-install.lock and retry.'
        });
      }

      try {
        const lockFileStat = await stat(lockPath);
        if (Date.now() - lockFileStat.mtimeMs > staleLockAfterMs) {
          await remove(lockPath);
          continue;
        }
      } catch {
        // Lock can disappear between stat/remove attempts.
      }

      await wait({ ms: 300 });
    }
  }

  try {
    return await installFn();
  } finally {
    await remove(lockPath).catch(() => {});
  }
};

class DependencyInstaller {
  pendingInstalls: Record<string, Promise<ExecaReturnValue<string>>> = {};

  install = async ({
    rootProjectDirPath,
    progressLogger,
    phase = 'BUILD_AND_PACKAGE'
  }: {
    rootProjectDirPath: string;
    progressLogger: ProgressLogger;
    phase?: DeploymentPhase;
  }) => {
    const readPkgResult = await readPkgUp({ cwd: rootProjectDirPath }).catch(() => ({ path: null }));
    const packagePath = readPkgResult?.path || null;
    if (!packagePath) {
      return;
    }

    // Determine the actual directory where we should install dependencies
    const installDir = await findProjectRoot(packagePath);

    const lockFileInfo = await getLockFileData(installDir);
    const packageManager = lockFileInfo.packageManager || 'npm';
    const useCiInstall = !!(ci.isCI && lockFileInfo.lockfilePath);
    const installKey = `${installDir}:${packageManager}`;

    if (this.pendingInstalls[installKey]) {
      return this.pendingInstalls[installKey];
    }

    const isNodeInstalled = checkExecutableInPath('node') || checkExecutableInPath('nodejs');
    if (!isNodeInstalled) {
      raiseError({
        type: 'PACKAGING',
        message:
          'NodeJS missing: This project seems to be using NodeJS (node), but it is not installed on your system.',
        hint: 'To see how to install NodeJS, refer to NodeJS official website: https://nodejs.dev/en/learn/how-to-install-nodejs/.'
      });
    }

    const installScript = getEsInstallScript(packageManager, useCiInstall ? 'CI' : 'normal');
    this.pendingInstalls[installKey] = (async () => {
      await progressLogger.startEvent({
        eventType: 'INSTALL_DEPENDENCIES',
        description: 'Installing dependencies',
        phase
      });
      let result: ExecaReturnValue<string>;
      try {
        result = await withInstallLock({
          installDir,
          installFn: async () =>
            exec(installScript[0], installScript.slice(1), {
              inheritEnvVarsExcept: [],
              disableStderr: true,
              disableStdout: true,
              cwd: installDir
            })
        });
      } catch (err) {
        raiseError({
          type: 'PACKAGING',
          message: `Failed to install dependencies. Error:\n${err.message}`
        });
      }

      await progressLogger.finishEvent({ eventType: 'INSTALL_DEPENDENCIES', phase });
      return result;
    })();

    return this.pendingInstalls[installKey];
  };
}

export const dependencyInstaller = new DependencyInstaller();
