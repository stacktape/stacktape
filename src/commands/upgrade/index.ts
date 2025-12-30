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
    tuiManager.success(`You are already using the latest version of Stacktape (${currentVersion}).`);
    return { upgraded: false, currentVersion, latestVersion };
  }

  const installationType = await detectInstallationType();
  const upgradeCommand = getUpgradeCommand(installationType);

  if (installationType === 'native') {
    tuiManager.info(
      `Current version: ${tuiManager.makeBold(currentVersion)}\nLatest version: ${tuiManager.makeBold(latestVersion)}\n\nUpgrading Stacktape using native installer...`
    );
    if (process.platform === 'win32') {
      await exec('powershell', ['-Command', upgradeCommand], { disableStdout: false });
    } else {
      await exec('sh', ['-c', upgradeCommand], { disableStdout: false });
    }
    return { upgraded: true, currentVersion, latestVersion };
  }

  const instructionPrefix =
    installationType === 'npm-local' ? 'To upgrade Stacktape in your project' : 'To upgrade Stacktape';
  tuiManager.info(
    `Current version: ${tuiManager.makeBold(currentVersion)}\nLatest version: ${tuiManager.makeBold(latestVersion)}\n\n${instructionPrefix}, run:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`
  );
  return { upgraded: false, currentVersion, latestVersion, upgradeCommand };
};
