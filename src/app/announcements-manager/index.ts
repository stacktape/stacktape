import { ANNOUNCEMENTS_ENDPOINT, IS_DEV } from '@config';
import { getInstallationScript } from '@shared/utils/bin-executable';
import { jsonFetch } from '@utils/http-client';
import { printer } from '@utils/printer';
import { getLatestStacktapeVersion, getStacktapeVersion } from '@utils/versioning';
import { gt } from 'semver';

type Announcement = { message: string; highlight?: boolean };

export class AnnouncementsManager {
  init = async () => {};

  printAnnouncements = async () => {
    try {
      const announcements: Announcement[] = await jsonFetch(`${ANNOUNCEMENTS_ENDPOINT}/messages.json`);
      announcements.forEach((announcement) => {
        printer.announcement(announcement.message, announcement.highlight || true);
      });
    } catch {}
  };

  checkForUpdates = async () => {
    if (IS_DEV) {
      return;
    }
    const currentVersion = getStacktapeVersion();
    if (currentVersion.includes('beta') || currentVersion.includes('alpha')) {
      return;
    }
    const latestVersion = await getLatestStacktapeVersion();
    const normalizedCurrentVersion = currentVersion.replace('dev-', '').split('.').slice(0, 3).join('.');
    const isNewerVersionAvailable = gt(latestVersion, normalizedCurrentVersion);
    const installCommand = getInstallationScript();
    const [cmd, ...restArgs] = installCommand.split(' ');

    if (isNewerVersionAvailable) {
      const hint = `To upgrade Stacktape to the latest version, run command:\n\n ${printer.makeBold(
        printer.colorize('yellow', cmd)
      )} ${printer.makeBold(restArgs.join(' '))}`;
      printer.info(
        `You are currently using Stacktape version ${printer.makeBold(
          currentVersion
        )}, but a newer version (${printer.makeBold(latestVersion)}) is available.\n${hint}`
      );
    }
  };
}

export const announcementsManager = new AnnouncementsManager();
