import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { ANNOUNCEMENTS_ENDPOINT, IS_DEV } from '@config';
import { jsonFetch } from '@utils/http-client';
import { startTiming } from '@utils/timings';
import { getLatestStacktapeVersion, getStacktapeVersion } from '@utils/versioning';
import { gt } from 'semver';
import { localStatePaths } from 'src/config/local-state-paths';

type Announcement = { message: string; highlight?: boolean };
type Fetched<Value> = { value: Value; fetchedAt: number };
/** Each part keeps its own fetch time: a part that failed to refresh is retried without refetching the other. */
type Notices = { latestVersion?: Fetched<string>; announcements?: Fetched<Announcement[]> };

/** Cached notices younger than this are shown without contacting the network. */
const NOTICES_MAX_AGE_MS = 60 * 60 * 1000;
/** A background refresh is abandoned after this long, or earlier when the command finishes. */
const NOTICES_REFRESH_TIMEOUT_MS = 5000;

const isAnnouncementList = (value: unknown): value is Announcement[] =>
  Array.isArray(value) && value.every((item) => typeof item?.message === 'string');

const isVersion = (value: unknown): value is string => typeof value === 'string';

const isFresh = (part: Fetched<unknown> | undefined) => {
  const age = part ? Date.now() - part.fetchedAt : Number.POSITIVE_INFINITY;
  return age >= 0 && age < NOTICES_MAX_AGE_MS;
};

// Development, beta and alpha builds are never told to upgrade.
const checksForUpdates = () => {
  const currentVersion = getStacktapeVersion();
  return !IS_DEV && !currentVersion.includes('beta') && !currentVersion.includes('alpha');
};

const cachedPart = <Value>(part: unknown, isValue: (value: unknown) => value is Value): Fetched<Value> | undefined => {
  const candidate = part as Partial<Fetched<unknown>> | null | undefined;
  return typeof candidate?.fetchedAt === 'number' && isValue(candidate.value)
    ? { value: candidate.value, fetchedAt: candidate.fetchedAt }
    : undefined;
};

const readCachedNotices = async (): Promise<Notices> => {
  try {
    const cached = JSON.parse(await readFile(localStatePaths.noticesCacheFile(), 'utf8')) as
      | {
          [part in keyof Notices]?: unknown;
        }
      | null;
    return {
      latestVersion: cachedPart(cached?.latestVersion, isVersion),
      announcements: cachedPart(cached?.announcements, isAnnouncementList)
    };
  } catch {
    return {};
  }
};

const writeCachedNotices = async (notices: Notices) => {
  try {
    const cacheFile = localStatePaths.noticesCacheFile();
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(notices));
  } catch {
    // An unwritable home only means that the next command refreshes again.
  }
};

/**
 * Update notices and announcements never delay a command. `init` loads the cached notices and, when they are missing or
 * stale, refreshes them in the background while the command runs. `printNotices` shows the newest notices already
 * known, and `stop` abandons a refresh that has not finished, so no request outlives the command.
 */
export class AnnouncementsManager {
  #notices: Notices = {};
  #refresh = new AbortController();
  #cacheWrites = Promise.resolve();

  init = async ({ enabled }: { enabled: boolean }) => {
    if (!enabled) return;
    this.#notices = await readCachedNotices();
    const request = { signal: this.#refresh.signal, timeoutMs: NOTICES_REFRESH_TIMEOUT_MS };
    if (checksForUpdates() && !isFresh(this.#notices.latestVersion)) {
      this.#refreshPart('latestVersion', getLatestStacktapeVersion(request), isVersion);
    }
    if (!isFresh(this.#notices.announcements)) {
      this.#refreshPart(
        'announcements',
        jsonFetch(`${ANNOUNCEMENTS_ENDPOINT}/messages.json`, request),
        isAnnouncementList
      );
    }
  };

  // A part that arrives replaces its cached value at once. A part that fails (offline, refused, malformed or
  // abandoned) keeps its old value and stays stale, so the next command retries it.
  #refreshPart = <Part extends keyof Notices>(
    part: Part,
    response: Promise<unknown>,
    isValue: (value: unknown) => value is NonNullable<Notices[Part]>['value']
  ) => {
    const endTiming = startTiming('notices:refresh', { part });
    void response.then(
      (value) => {
        if (!isValue(value)) {
          endTiming({ outcome: 'error' });
          return;
        }
        this.#notices = { ...this.#notices, [part]: { value, fetchedAt: Date.now() } };
        endTiming({ outcome: 'ok' });
        const notices = this.#notices;
        this.#cacheWrites = this.#cacheWrites.then(() => writeCachedNotices(notices));
      },
      () => endTiming({ outcome: this.#refresh.signal.aborted ? 'abandoned' : 'error' })
    );
  };

  printNotices = () => {
    const notices = this.#notices;
    if (!notices.latestVersion && !notices.announcements) return;
    const endTiming = startTiming('notices:print');
    const currentVersion = getStacktapeVersion();
    try {
      const normalizedCurrentVersion = currentVersion.replace('dev-', '').split('.').slice(0, 3).join('.');
      const latestVersion = notices.latestVersion?.value;
      if (latestVersion && checksForUpdates() && gt(latestVersion, normalizedCurrentVersion)) {
        tuiManager.info(
          `Update available. Current: ${tuiManager.makeBold(currentVersion)}. Latest: ${tuiManager.makeBold(
            latestVersion
          )}.\nRun: \`${tuiManager.prettyCommand('upgrade')}\``
        );
      }
    } catch {
      // An unparsable version never blocks command completion.
    }
    notices.announcements?.value.forEach((announcement) => {
      tuiManager.announcement(announcement.message, announcement.highlight || true);
    });
    endTiming();
  };

  stop = () => {
    this.#refresh.abort();
  };
}

export const announcementsManager = new AnnouncementsManager();
