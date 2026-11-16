import { tuiManager } from '@application-services/tui-manager';
import { listAwsProfiles } from '@utils/aws-config';

/** Only the last 4 characters of a secret access key are shown, enough to tell keys apart. */
const maskSecretAccessKey = (secretAccessKey: string) => `${'*'.repeat(36)}${secretAccessKey.slice(36)}`;

export const commandAwsProfileList = async () => {
  const profiles = (await listAwsProfiles()).map((profile) => ({
    profile: profile.profile,
    AWS_ACCESS_KEY_ID: profile.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: maskSecretAccessKey(profile.AWS_SECRET_ACCESS_KEY)
  }));

  if (!profiles.length) {
    tuiManager.warn(
      `No AWS profiles found. Create one with \`${tuiManager.colorize('yellow', 'stacktape aws-profile create')}\`.`
    );
  } else {
    tuiManager.printTable({
      header: ['Profile', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      rows: profiles.map((profile) => [
        tuiManager.colorize('cyan', profile.profile),
        profile.AWS_ACCESS_KEY_ID,
        profile.AWS_SECRET_ACCESS_KEY
      ])
    });
  }

  return profiles;
};
