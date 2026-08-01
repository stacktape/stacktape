import { prerelease, valid } from 'semver';

export type ReleaseChannel = 'candidate' | 'preview';

export const validateReleaseInput = ({ channel, version }: { channel: string; version: string }) => {
  if (channel !== 'candidate' && channel !== 'preview') {
    throw new Error(`Release channel must be candidate or preview; received ${channel || '<empty>'}.`);
  }
  if (!valid(version)) {
    throw new Error(`Release version must be valid SemVer; received ${version || '<empty>'}.`);
  }
  if (channel === 'preview') {
    const identifiers = prerelease(version);
    if (!identifiers || !/^\d+\.\d+\.\d+-preview\.(?:0|[1-9]\d*)$/.test(version)) {
      throw new Error('Preview releases must use a version such as 4.0.0-preview.1.');
    }
  }
  return { channel: channel as ReleaseChannel, version };
};

if (import.meta.main) {
  try {
    const channel = process.env.RELEASE_CHANNEL || '';
    const version = process.env.RELEASE_VERSION || '';
    validateReleaseInput({ channel, version });
    console.info(`Validated ${channel} release input ${version}.`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
