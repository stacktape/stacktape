import { fsPaths } from '@shared/naming/fs-paths';
import { getIniFileContent } from '@shared/utils/fs-utils';
import { userPrompt } from '@shared/utils/user-prompt';
import { upsertAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';
import { printer } from '@utils/printer';

export const commandAwsProfileCreate = async (): Promise<AwsProfileCreateReturnValue> => {
  const promptResult = await userPrompt({
    type: 'text',
    name: 'profile',
    message:
      'Choose an arbitrary profile name. ("default" will be used as default profile value in every command. Leave blank for "default"):'
  });
  const profile = promptResult.profile || 'default';

  const [credsFileContent, configFileContent] = await Promise.all([
    getIniFileContent(fsPaths.awsCredentialsFilePath()),
    getIniFileContent(fsPaths.awsConfigFilePath())
  ]);

  if (credsFileContent && credsFileContent[profile]) {
    throw new ExpectedError('CREDENTIALS', `Credentials for profile ${profile} are already set in credentials file.`);
  }
  if (configFileContent && configFileContent[profile]) {
    throw new ExpectedError('CREDENTIALS', `Credentials for profile ${profile} are already set in config file.`);
  }

  const { awsAccessKeyId } = await userPrompt({
    type: 'text',
    name: 'awsAccessKeyId',
    message: 'AWS_ACCESS_KEY_ID: '
  });

  const { awsSecretAccessKey } = await userPrompt({
    type: 'password',
    name: 'awsSecretAccessKey',
    message: 'AWS_SECRET_ACCESS_KEY: '
  });

  await upsertAwsProfile(profile, awsAccessKeyId, awsSecretAccessKey);
  printer.success(`Successfully saved credentials for profile ${profile}.`);

  return null;
};
