import type { DeploymentPhase, ProgressReporter as ProgressLogger } from '@application-services/operation-manager';
import type { ExecaReturnValue } from 'execa';
import { getLockFileData } from '@stacktape/packaging/bundlers/es/utils';
import ci from 'ci-info';
import { pathExists, readFile, remove, stat, writeFile } from 'fs-extra';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import readPkgUp from 'read-pkg-up';
import { checkExecutableInPath } from '@utils/bin-executable';
import { getProjectDependencyInstallScript } from './es-install-scripts';
import { exec } from '@utils/exec';
import { CliError } from '@utils/errors';
import { findProjectRoot } from '@stacktape/packaging/es/project-root';
import { localStatePaths } from 'src/config/local-state-paths';

const wait = async ({ ms }: { ms: number }) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const computeLockfileHash = async ({
  installDir,
  lockfilePath
}: {
  installDir: string;
  lockfilePath: string | null;
}) => {
  const hashTarget = lockfilePath || join(installDir, 'package.json');
  try {
    const content = await readFile(hashTarget);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
};

const isDepsInstallNeeded = async ({
  installDir,
  lockfilePath
}: {
  installDir: string;
  lockfilePath: string | null;
}) => {
  if (!(await pathExists(join(installDir, 'node_modules')))) return true;
  const currentHash = await computeLockfileHash({ installDir, lockfilePath });
  if (!currentHash) return true;
  try {
    const storedHash = (
      await readFile(localStatePaths.dependencyInstallHashFile({ installDirectory: installDir }), 'utf-8')
    ).trim();
    return storedHash !== currentHash;
  } catch {
    return true;
  }
};

const saveInstallHash = async ({ installDir, lockfilePath }: { installDir: string; lockfilePath: string | null }) => {
  const hash = await computeLockfileHash({ installDir, lockfilePath });
  if (hash) {
    await writeFile(localStatePaths.dependencyInstallHashFile({ installDirectory: installDir }), hash).catch(() => {});
  }
};

/**
 * Acquires a filesystem-level lock, then runs `installFn` only if deps are still needed.
 * This prevents redundant installs when multiple Stacktape processes target the same directory:
 * process B waits for A's lock, then re-checks the hash — if A already installed, B skips.
 */
const withInstallLock = async ({
  installDir,
  lockfilePath,
  installFn
}: {
  installDir: string;
  lockfilePath: string | null;
  installFn: () => Promise<ExecaReturnValue<string>>;
}): Promise<ExecaReturnValue<string> | null> => {
  const lockPath = localStatePaths.dependencyInstallLockFile({ installDirectory: installDir });
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
        throw new CliError({
          category: 'PACKAGING',
          code: 'PACKAGING_INSTALL_LOCK_TIMEOUT',
          message: `Timed out waiting for the dependency install lock in \`${installDir}\`.`,
          hints: 'Another Stacktape process may be stuck. Remove `.stacktape-install.lock` and retry.'
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
    // Re-check after acquiring lock — another process may have already installed
    if (!(await isDepsInstallNeeded({ installDir, lockfilePath }))) {
      return null;
    }
    const result = await installFn();
    await saveInstallHash({ installDir, lockfilePath });
    return result;
  } finally {
    await remove(lockPath).catch(() => {});
  }
};

class DependencyInstaller {
  pendingInstalls: Record<string, Promise<ExecaReturnValue<string> | void>> = {};

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

    // Skip install if lockfile/package.json hasn't changed since last install
    if (!(await isDepsInstallNeeded({ installDir, lockfilePath: lockFileInfo.lockfilePath }))) {
      this.pendingInstalls[installKey] = Promise.resolve();
      return;
    }

    const isNodeInstalled = checkExecutableInPath('node') || checkExecutableInPath('nodejs');
    if (!isNodeInstalled) {
      throw new CliError({
        category: 'PACKAGING',
        code: 'PACKAGING_NODE_MISSING',
        message:
          'NodeJS missing: This project seems to be using NodeJS (node), but it is not installed on your system.',
        hints: 'Install Node.js by following https://nodejs.org/en/download/package-manager.'
      });
    }

    const packageManagerDeclaration =
      readPkgResult && 'packageJson' in readPkgResult ? readPkgResult.packageJson.packageManager : undefined;
    const lockfile = lockFileInfo.lockfilePath ? await readFile(lockFileInfo.lockfilePath, 'utf8') : undefined;
    const installScript = getProjectDependencyInstallScript({
      packageManager,
      installType: useCiInstall ? 'CI' : 'normal',
      ...(typeof packageManagerDeclaration === 'string' ? { packageManagerDeclaration } : {}),
      ...(lockfile === undefined ? {} : { lockfile })
    });
    this.pendingInstalls[installKey] = (async () => {
      await progressLogger.startEvent({
        eventType: 'INSTALL_DEPENDENCIES',
        description: 'Installing dependencies',
        phase
      });

      try {
        await withInstallLock({
          installDir,
          lockfilePath: lockFileInfo.lockfilePath,
          installFn: async () =>
            exec(installScript[0], installScript.slice(1), {
              inheritEnvVarsExcept: [],
              disableStderr: true,
              disableStdout: true,
              cwd: installDir
            })
        });
      } catch (err) {
        throw new CliError({
          category: 'PACKAGING',
          code: 'PACKAGING_DEPENDENCY_INSTALL_FAILED',
          message: `Failed to install dependencies.\n${err.message}`,
          cause: err
        });
      }

      await progressLogger.finishEvent({ eventType: 'INSTALL_DEPENDENCIES', phase });
    })();

    return this.pendingInstalls[installKey];
  };
}

export const dependencyInstaller = new DependencyInstaller();
