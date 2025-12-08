import { DEFAULT_KEEP_PREVIOUS_DEPLOYMENT_ARTIFACTS_COUNT, IS_DEV } from '@config';
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

export const getHotSwapDeployVersionString = () => {
  return buildStringVersion(1, 0);
};

export const getMinimumVersionToKeep = (
  lastVersion: string,
  versionsToKeep = DEFAULT_KEEP_PREVIOUS_DEPLOYMENT_ARTIFACTS_COUNT
) => {
  if (!lastVersion) {
    return V1;
  }
  const numericVersion = getNumericVersion(lastVersion);
  const minimumNumericVersion = numericVersion - versionsToKeep + 1;

  if (minimumNumericVersion <= 1) {
    return V1;
  }
  return buildStringVersion(getDigitsLength(minimumNumericVersion), minimumNumericVersion);
};
export const getStacktapeVersion = (): string => {
  // @ts-expect-error - injected using define
  return IS_DEV ? 'dev' : STACKTAPE_VERSION;
};
export const getLatestStacktapeVersion = async () => {
  const res = await jsonFetch('https://installs.stacktape.com/_data.json');
  return res.latestVersion;
};
