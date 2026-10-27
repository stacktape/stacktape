import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { exec } from '@utils/exec';
import {
  getInstallsUrl,
  getLatestStacktapeRelease,
  getStacktapeVersion,
  isNewerStacktapeVersion
} from '@utils/versioning';
import { valid } from 'semver';
import { detectInstallationType, getInstallerUrl, getUpgradeCommand, runNativeInstaller } from './utils';

export const commandUpgrade = async () => {
  const currentVersion = getStacktapeVersion();
  const requestedVersion = globalStateManager.args.newVersion?.replace(/^v/, '');
  if (requestedVersion !== undefined && !valid(requestedVersion)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_UPGRADE_INVALID_VERSION',
      message: `"${requestedVersion}" is not a Stacktape version.`,
      hints: 'Pass a version such as `4.0.1`, or leave it out to install the latest version.'
    });
  }
  const { version: latestVersion, installsUrl } = requestedVersion
    ? { version: requestedVersion, installsUrl: getInstallsUrl(requestedVersion) }
    : await getLatestStacktapeRelease();

  if (requestedVersion === currentVersion) {
    tuiManager.success(`Stacktape ${currentVersion} is already installed.`);
    return { upgraded: false, currentVersion, latestVersion };
  }
  if (!requestedVersion && !isNewerStacktapeVersion(latestVersion, currentVersion)) {
    tuiManager.success(`Already on latest Stacktape (${currentVersion}).`);
    return { upgraded: false, currentVersion, latestVersion };
  }

  const installationType = await detectInstallationType();
  const installerUrl = getInstallerUrl(installsUrl);
  const upgradeCommand = getUpgradeCommand(installationType, { installerUrl, version: latestVersion });
  const versions = `Current: ${tuiManager.makeBold(currentVersion)}\n${requestedVersion ? 'Requested' : 'Latest'}: ${tuiManager.makeBold(latestVersion)}`;

  if (installationType.installationType === 'native') {
    tuiManager.info(`${versions}\n\nRunning the installer from ${installerUrl}`);
    await runNativeInstaller({ installerUrl, version: latestVersion });
    tuiManager.success(`Stacktape upgraded to ${tuiManager.makeBold(latestVersion)}.`);
    return { upgraded: true, currentVersion, latestVersion };
  }

  if (installationType.installationType === 'package-global') {
    tuiManager.info(`${versions}\n\nRunning upgrade command:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`);
    if (process.platform === 'win32') {
      await exec('powershell', ['-Command', upgradeCommand], { disableStdout: false });
    } else {
      await exec('sh', ['-c', upgradeCommand], { disableStdout: false });
    }
    tuiManager.success(`Stacktape upgraded to ${tuiManager.makeBold(latestVersion)}.`);
    return { upgraded: true, currentVersion, latestVersion };
  }

  const instructionPrefix =
    installationType.installationType === 'package-local'
      ? 'To upgrade Stacktape in your project'
      : 'Could not detect your installation method automatically. To upgrade Stacktape';
  tuiManager.info(`${versions}\n\n${instructionPrefix}, run:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`);
  return { upgraded: false, currentVersion, latestVersion, upgradeCommand };
};
