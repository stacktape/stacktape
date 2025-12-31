import { tuiManager } from '@application-services/tui-manager';
import { fsPaths } from '@shared/naming/fs-paths';
import { getIniFileContent } from '@shared/utils/fs-utils';
import { upsertAwsProfile } from '@utils/aws-config';
import { ExpectedError } from '@utils/errors';

export const commandAwsProfileCreate = async (): Promise<AwsProfileCreateReturnValue> => {
  const promptResult = await tuiManager.prompt({
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

  const { awsAccessKeyId } = await tuiManager.prompt({
    type: 'text',
    name: 'awsAccessKeyId',
    message: 'AWS_ACCESS_KEY_ID: '
  });

  const { awsSecretAccessKey } = await tuiManager.prompt({
    type: 'password',
    name: 'awsSecretAccessKey',
    message: 'AWS_SECRET_ACCESS_KEY: '
  });

  await upsertAwsProfile(profile, awsAccessKeyId, awsSecretAccessKey);
  tuiManager.success(`Saved credentials for AWS profile ${profile}.`);

  return null;
};
