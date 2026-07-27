import { fsPaths } from '@shared/naming/fs-paths';
import fsExtra from 'fs-extra';
import uniq from 'lodash/uniq';
import { adjustIniFileContent, getIniFileContent } from '../../shared/utils/fs-utils';

export const upsertAwsProfile = async (profile: string, awsAccessKeyId: string, awsSecretAccessKey: string) => {
  return adjustIniFileContent(fsPaths.awsCredentialsFilePath(), (content) => ({
    ...content,
    [profile]: {
      ...(content[profile] || {}),
      aws_access_key_id: awsAccessKeyId,
      aws_secret_access_key: awsSecretAccessKey
    }
  }));
};

export const deleteAwsProfile = (profile: string) => {
  return Promise.all([
    adjustIniFileContent(fsPaths.awsCredentialsFilePath(), (content) => {
      delete content[profile];
      return content;
    }),
    adjustIniFileContent(fsPaths.awsConfigFilePath(), (content) => {
      delete content[profile];
      delete content[`profile ${profile}`];
      return content;
    })
  ]);
};

export const getAvailableAwsProfiles = async () => {
  const [credsFileContent, configFileContent] = await Promise.all([
    getIniFileContent(fsPaths.awsCredentialsFilePath()),
    getIniFileContent(fsPaths.awsConfigFilePath())
  ]);

  return uniq([
    ...Object.keys(configFileContent || {}).map((profile) => profile.replace('profile ', '')),
    ...Object.keys(credsFileContent || {})
  ]);
};

export const ensureGlobalAwsConfigFiles = () => {
  return Promise.all([
    fsExtra.ensureFile(fsPaths.awsConfigFilePath()),
    fsExtra.ensureFile(fsPaths.awsCredentialsFilePath())
  ]);
};

export const loadAwsConfigFileContent = () => {
  return getIniFileContent(fsPaths.awsConfigFilePath());
};

export const loadAwsCredentialsFileContent = async (): Promise<{
  [key: string]: { secretAccessKey: string; accessKeyId: string };
}> => {
  const creds = await getIniFileContent(fsPaths.awsCredentialsFilePath());
  const res = {};
  for (const profile in creds) {
    res[profile] = {
      secretAccessKey: creds[profile].aws_secret_access_key,
      accessKeyId: creds[profile].aws_access_key_id
    };
  }
  return res;
};

export const listAwsProfiles = async () => {
  const credsFileContent = (await getIniFileContent(fsPaths.awsCredentialsFilePath())) || [];

  return Object.entries(credsFileContent || {}).map(([profile, data]) => {
    const { aws_access_key_id, aws_secret_access_key } = data;
    return {
      profile,
      AWS_ACCESS_KEY_ID: aws_access_key_id,
      AWS_SECRET_ACCESS_KEY: aws_secret_access_key
    };
  });
};
