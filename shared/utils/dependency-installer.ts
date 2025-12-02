import type { ExecaReturnValue } from 'execa';
import { getLockFileData } from '@shared/packaging/bundlers/es/utils';
import ci from 'ci-info';
import readPkgUp from 'read-pkg-up';
import { checkExecutableInPath } from './bin-executable';
import { getEsInstallScript } from './es-install-scripts';
import { exec } from './exec';
import { raiseError } from './misc';
import { findProjectRoot } from './monorepo';

class DependencyInstaller {
  pendingInstalls: {
    [_pm in SupportedEsPackageManager]: Promise<ExecaReturnValue<string>>;
  } = {} as { [_pm in SupportedEsPackageManager]: Promise<ExecaReturnValue<string>> };

  install = async ({
    rootProjectDirPath,
    progressLogger
  }: {
    rootProjectDirPath: string;
    progressLogger: ProgressLogger;
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

    if (this.pendingInstalls[packageManager]) {
      return this.pendingInstalls[packageManager];
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
    this.pendingInstalls[packageManager] = (async () => {
      await progressLogger.startEvent({ eventType: 'INSTALL_DEPENDENCIES', description: 'Installing dependencies' });
      let result: ExecaReturnValue<string>;
      try {
        result = await exec(installScript[0], installScript.slice(1), {
          inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH'],
          disableStderr: true,
          disableStdout: true,
          cwd: installDir
        });
      } catch (err) {
        raiseError({
          type: 'PACKAGING',
          message: `Failed to install dependencies. Error:\n${err.message}`
        });
      }

      await progressLogger.finishEvent({ eventType: 'INSTALL_DEPENDENCIES' });
      return result;
    })();

    return this.pendingInstalls[packageManager];
  };
}

export const dependencyInstaller = new DependencyInstaller();
