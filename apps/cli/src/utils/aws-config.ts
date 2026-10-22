import { fsPaths } from 'src/config/runtime-paths';
import uniq from 'lodash/uniq';
import { adjustIniFileContent, getIniFileContent } from '@utils/fs-utils';

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

export const loadAwsConfigFileContent = () => {
  return getIniFileContent(fsPaths.awsConfigFilePath());
};

/**
 * The region of a profile in a parsed AWS config file. The config file names a profile's section `[profile name]` and
 * the default one `[default]`; a bare `[name]` section is accepted too, as the AWS CLI does for the credentials file.
 */
export const profileRegionFromConfig = (content: unknown, profile: string): string | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  const sections = content as Record<string, unknown>;
  for (const sectionName of profile === 'default' ? ['default'] : [`profile ${profile}`, profile]) {
    const section = sections[sectionName];
    const region = section && typeof section === 'object' ? (section as Record<string, unknown>).region : undefined;
    if (typeof region === 'string' && region) return region;
  }
  return undefined;
};

export const listAwsProfiles = async (credentialsFilePath = fsPaths.awsCredentialsFilePath()) => {
  const credsFileContent = (await getIniFileContent(credentialsFilePath)) || {};

  return Object.entries(credsFileContent).flatMap(([profile, data]) => {
    if (
      typeof data !== 'object' ||
      data === null ||
      !('aws_access_key_id' in data) ||
      !('aws_secret_access_key' in data) ||
      typeof data.aws_access_key_id !== 'string' ||
      typeof data.aws_secret_access_key !== 'string'
    ) {
      return [];
    }
    const { aws_access_key_id, aws_secret_access_key } = data;
    return [
      {
        profile,
        AWS_ACCESS_KEY_ID: aws_access_key_id,
        AWS_SECRET_ACCESS_KEY: aws_secret_access_key
      }
    ];
  });
};
