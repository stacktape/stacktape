import { coerce, gt, valid } from 'semver';
import { jsonFetch } from './http-client';

const V1 = 'v000001';

export const getNumericVersion = (version: string) => {
  return Number(version.slice(1));
};

const buildStringVersion = (digitsLength: number, numericVersion: number) =>
  `v${'0'.repeat(6 - digitsLength)}${numericVersion}`;

const getDigitsLength = (numericVersion: number) => numericVersion.toString().length;

export const getNextVersionString = (lastVersion: string) => {
  if (lastVersion === null) {
    return V1;
  }
  const nextNumericVersion = getNumericVersion(lastVersion) + 1;
  const digitsLength = getDigitsLength(nextNumericVersion);
  return buildStringVersion(digitsLength, nextNumericVersion);
};

export const getStacktapeVersion = (): string => {
  // @ts-expect-error - injected using define
  return STACKTAPE_VERSION;
};
const STABLE_INSTALLS_URL = 'https://installs.stacktape.com';
const PREVIEW_INSTALLS_URL = 'https://installs-preview.stacktape.com';

/** Each channel's installers default to its newest release, but install any version given in `STACKTAPE_VERSION`. */
export const getInstallsUrl = (version: string) =>
  version.includes('-preview') ? PREVIEW_INSTALLS_URL : STABLE_INSTALLS_URL;

export type StacktapeRelease = { version: string; installsUrl: string };

/**
 * The newest release this build can upgrade to. Preview builds also follow the preview channel, so they get the next
 * preview and still move to a stable release once it is newer.
 */
export const getLatestStacktapeRelease = async (
  options?: { signal?: AbortSignal; timeoutMs?: number },
  currentVersion = getStacktapeVersion()
): Promise<StacktapeRelease> => {
  const channels = currentVersion.includes('-preview')
    ? [STABLE_INSTALLS_URL, PREVIEW_INSTALLS_URL]
    : [STABLE_INSTALLS_URL];
  // A channel that cannot be read leaves the other one; only both failing is an error.
  const results = await Promise.allSettled(
    channels.map(async (installsUrl) => {
      const { latestVersion } = await jsonFetch(`${installsUrl}/_data.json`, options);
      if (!valid(latestVersion)) throw new Error(`${installsUrl}/_data.json has no valid latestVersion.`);
      return { version: latestVersion as string, installsUrl };
    })
  );
  const releases = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  if (!releases.length) throw (results[0] as PromiseRejectedResult).reason;
  return releases.reduce((newest, release) => (gt(release.version, newest.version) ? release : newest));
};

export const getLatestStacktapeVersion = async (options?: { signal?: AbortSignal; timeoutMs?: number }) =>
  (await getLatestStacktapeRelease(options)).version;

/** Development builds carry versions like `dev-4.0.0`; they compare as their release part. */
export const isNewerStacktapeVersion = (latestVersion: string, currentVersion: string) => {
  const comparableVersion = valid(currentVersion) ?? coerce(currentVersion)?.version;
  return Boolean(comparableVersion && gt(latestVersion, comparableVersion));
};
