import { tuiManager } from '@application-services/tui-manager';
import { getAvailableAwsProfiles, upsertAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';

export const commandAwsProfileUpdate = async (): Promise<AwsProfileUpdateReturnValue> => {
  const availableProfiles = await getAvailableAwsProfiles();

  if (!availableProfiles.length) {
    throw new ExpectedError('CREDENTIALS', 'No profile set in global AWS credentials file.');
  }

  const { awsSecretAccessKey } = await tuiManager.prompt({
    type: 'select',
    choices: availableProfiles.map((profile) => ({ title: profile, value: profile })),
    name: 'awsSecretAccessKey',
    message: 'Choose a profile to update:'
  });
  const { awsAccessKeyId } = await tuiManager.prompt({
    type: 'text',
    name: 'awsAccessKeyId',
    message: 'AWS_ACCESS_KEY_ID: '
  });
  const { profile } = await tuiManager.prompt({
    type: 'password',
    name: 'profile',
    message: 'AWS_SECRET_ACCESS_KEY: '
  });

  await upsertAwsProfile(profile, awsAccessKeyId, awsSecretAccessKey);
  tuiManager.success(`Updated credentials for AWS profile ${profile}.`);

  // @todo-return-value
  return null;
};
