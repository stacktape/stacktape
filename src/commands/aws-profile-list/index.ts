import { globalStateManager } from '@application-services/global-state-manager';
import { listAwsProfiles } from '@utils/aws-config';
import { tuiManager } from '@utils/tui';

export const commandAwsProfileList = async (): Promise<AwsProfileListReturnValue> => {
  const availableAwsProfiles = await listAwsProfiles();

  const header = ['Profile', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const rows = availableAwsProfiles.map((profile) => [
    tuiManager.colorize('cyan', profile.profile),
    profile.AWS_ACCESS_KEY_ID,
    profile.AWS_SECRET_ACCESS_KEY
  ]);

  if (globalStateManager.invokedFrom === 'cli') {
    if (!rows.length) {
      tuiManager.warn(
        `No AWS profiles are set on this system.\n       You can create a new AWS profile using '${tuiManager.colorize(
          'yellow',
          'stacktape aws-profile:create'
        )}' command.`
      );
    } else {
      tuiManager.printTable({
        header,
        rows: rows.map((row) => [...row.slice(0, -1), '*'.repeat(36) + row[2].slice(36)])
      });
    }
  }

  return rows.map((row) => ({
    profile: row[0],
    AWS_ACCESS_KEY_ID: row[1],
    AWS_SECRET_ACCESS_KEY: row[2]
  }));
};
