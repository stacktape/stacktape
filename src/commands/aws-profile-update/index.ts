import { userPrompt } from '@shared/utils/user-prompt';
import { getAvailableAwsProfiles, upsertAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';
import { tuiManager } from '@utils/tui';

export const commandAwsProfileUpdate = async (): Promise<AwsProfileUpdateReturnValue> => {
  const availableProfiles = await getAvailableAwsProfiles();

  if (!availableProfiles.length) {
    throw new ExpectedError('CREDENTIALS', 'No profile set in global AWS credentials file.');
  }

  const { awsAccessKeyId } = await userPrompt({
    type: 'select',
    choices: availableProfiles.map((profile) => ({ title: profile, value: profile })),
    name: 'profile',
    message: 'Choose a profile to update:'
  });
  const { awsSecretAccessKey } = await userPrompt({
    type: 'text',
    name: 'awsAccessKeyId',
    message: 'AWS_ACCESS_KEY_ID: '
  });
  const { profile } = await userPrompt({
    type: 'password',
    name: 'awsSecretAccessKey',
    message: 'AWS_SECRET_ACCESS_KEY: '
  });

  await upsertAwsProfile(profile, awsAccessKeyId, awsSecretAccessKey);
  tuiManager.success(`Successfully updated credentials for profile ${profile}.`);

  // @todo-return-value
  return null;
};
