import { tuiManager } from '@application-services/tui-manager';
import { ANNOUNCEMENTS_ENDPOINT, IS_DEV } from '@config';
import { jsonFetch } from '@utils/http-client';
import { getLatestStacktapeVersion, getStacktapeVersion } from '@utils/versioning';
import { gt } from 'semver';

type Announcement = { message: string; highlight?: boolean };

export class AnnouncementsManager {
  init = async () => {};

  printAnnouncements = async () => {
    try {
      const announcements: Announcement[] = await jsonFetch(`${ANNOUNCEMENTS_ENDPOINT}/messages.json`);
      announcements.forEach((announcement) => {
        tuiManager.announcement(announcement.message, announcement.highlight || true);
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

    if (isNewerVersionAvailable) {
      tuiManager.info(
        `Update available. Current: ${tuiManager.makeBold(currentVersion)}. Latest: ${tuiManager.makeBold(
          latestVersion
        )}.\nRun: \`${tuiManager.prettyCommand('upgrade')}\``
      );
    }
  };
}

export const announcementsManager = new AnnouncementsManager();
