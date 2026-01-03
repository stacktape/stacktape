import { tuiManager } from '@application-services/tui-manager';
import { getAvailableAwsProfiles, upsertAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';

export const commandAwsProfileUpdate = async (): Promise<AwsProfileUpdateReturnValue> => {
  const availableProfiles = await getAvailableAwsProfiles();

  if (!availableProfiles.length) {
    throw new ExpectedError('CREDENTIALS', 'No profile set in global AWS credentials file.');
  }

  const profile = await tuiManager.promptSelect({
    message: 'Choose a profile to update:',
    options: availableProfiles.map((prof) => ({ label: prof, value: prof }))
  });
  const awsAccessKeyId = await tuiManager.promptText({
    message: 'AWS_ACCESS_KEY_ID:',
    description: '(from your AWS IAM user security credentials)'
  });
  const awsSecretAccessKey = await tuiManager.promptText({
    message: 'AWS_SECRET_ACCESS_KEY:',
    description: '(keep this secret - it will be stored locally)',
    isPassword: true
  });

  await upsertAwsProfile(profile, awsAccessKeyId, awsSecretAccessKey);
  tuiManager.success(`Updated credentials for AWS profile ${profile}.`);

  // @todo-return-value
  return null;
};
