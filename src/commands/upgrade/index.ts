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

  if (installationType === 'native') {
    tuiManager.info(
      `Current: ${tuiManager.makeBold(currentVersion)}\nLatest: ${tuiManager.makeBold(
        latestVersion
      )}\n\nRunning native installer...`
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
    `Current: ${tuiManager.makeBold(currentVersion)}\nLatest: ${tuiManager.makeBold(
      latestVersion
    )}\n\n${instructionPrefix}, run:\n  ${tuiManager.colorize('yellow', upgradeCommand)}`
  );
  return { upgraded: false, currentVersion, latestVersion, upgradeCommand };
};
