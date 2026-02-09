import { tuiManager } from '@application-services/tui-manager';
import { exec } from '@shared/utils/exec';
import { getLatestStacktapeVersion, getStacktapeVersion } from '@utils/versioning';
import { gt } from 'semver';
import { detectInstallationType, getUpgradeCommand } from './utils';

export const commandUpgrade = async () => {
  const currentVersion = getStacktapeVersion();
  const latestVersion = await getLatestStacktapeVersion();

  const normalizedCurrentVersion = currentVersion.replace('dev-', '').split('.').slice(0, 3).join('.');
  const isNewerVersionAvailable = gt(latestVersion, normalizedCurrentVersion);

  if (!isNewerVersionAvailable) {
    tuiManager.success(`Already on latest Stacktape (${currentVersion}).`);
    return { upgraded: false, currentVersion, latestVersion };
  }

  const installationType = await detectInstallationType();
  const upgradeCommand = getUpgradeCommand(installationType);

  if (installationType.installationType === 'native' || installationType.installationType === 'package-global') {
    tuiManager.info(
      `Current: ${tuiManager.makeBold(currentVersion)}\nLatest: ${tuiManager.makeBold(
        latestVersion
      )}\n\nRunning upgrade command:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`
    );
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
  tuiManager.info(
    `Current: ${tuiManager.makeBold(currentVersion)}\nLatest: ${tuiManager.makeBold(
      latestVersion
    )}\n\n${instructionPrefix}, run:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`
  );
  return { upgraded: false, currentVersion, latestVersion, upgradeCommand };
};
