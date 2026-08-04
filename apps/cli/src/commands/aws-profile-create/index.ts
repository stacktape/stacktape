import { tuiManager } from '@application-services/tui-manager';
import { fsPaths } from 'src/config/runtime-paths';
import { getIniFileContent } from '@utils/fs-utils';
import { upsertAwsProfile } from '@utils/aws-config';
import { assertAwsProfileDoesNotExist } from '../_utils/aws-profile-input';

export const commandAwsProfileCreate = async () => {
  const profileInput = await tuiManager.promptText({
    message: 'Choose an arbitrary profile name:',
    description: '("default" will be used as default profile value in every command. Leave blank for "default")'
  });
  const profile = profileInput || 'default';

  const [credsFileContent, configFileContent] = await Promise.all([
    getIniFileContent(fsPaths.awsCredentialsFilePath()),
    getIniFileContent(fsPaths.awsConfigFilePath())
  ]);

  assertAwsProfileDoesNotExist({
    profile,
    credentialsProfiles: credsFileContent,
    configProfiles: configFileContent
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
  tuiManager.success(`Saved credentials for AWS profile ${profile}.`);

  return null;
};
