import { tuiManager } from '@application-services/tui-manager';
import { fsPaths } from 'src/config/runtime-paths';
import { getIniFileContent } from '@utils/fs-utils';
import { deleteAwsProfile } from '@utils/aws-config';
import uniq from 'lodash/uniq';
import { assertAwsProfilesConfigured } from '../_utils/aws-profile-input';

export const commandAwsProfileDelete = async () => {
  const [credsFileContent, configFileContent] = await Promise.all([
    getIniFileContent(fsPaths.awsCredentialsFilePath()),
    getIniFileContent(fsPaths.awsConfigFilePath())
  ]);

  const profiles = uniq([
    ...Object.keys(configFileContent || {}).map((profile) => profile.replace('profile ', '')),
    ...Object.keys(credsFileContent || {})
  ]);

  assertAwsProfilesConfigured(profiles);

  const profile = await tuiManager.promptSelect({
    message: 'Choose a profile to delete:',
    options: profiles.map((prof) => ({ label: prof, value: prof }))
  });

  await deleteAwsProfile(profile);
  tuiManager.success(`Deleted credentials for AWS profile ${profile}.`);

  return null;
};
