import { fsPaths } from '@shared/naming/fs-paths';
import { getIniFileContent } from '@shared/utils/fs-utils';
import { userPrompt } from '@shared/utils/user-prompt';
import { deleteAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';
import { tuiManager } from '@utils/tui';
import uniq from 'lodash/uniq';

export const commandAwsProfileDelete = async (): Promise<AwsProfileDeleteReturnValue> => {
  const [credsFileContent, configFileContent] = await Promise.all([
    getIniFileContent(fsPaths.awsCredentialsFilePath()),
    getIniFileContent(fsPaths.awsConfigFilePath())
  ]);

  const profiles = uniq([
    ...Object.keys(configFileContent || {}).map((profile) => profile.replace('profile ', '')),
    ...Object.keys(credsFileContent || {})
  ]);

  if (!profiles.length) {
    throw new ExpectedError('CREDENTIALS', 'No profile set in global AWS credentials file.');
  }

  const { profile } = await userPrompt({
    type: 'select',
    choices: profiles.map((prof) => ({ title: prof, value: prof })),
    name: 'profile',
    message: 'Choose a profile to delete:'
  });

  await deleteAwsProfile(profile);
  tuiManager.success(`Successfully deleted credentials for profile ${profile}.`);

  return null;
};
