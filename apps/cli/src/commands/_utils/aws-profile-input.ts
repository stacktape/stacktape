import { CliError } from '@utils/errors';

export const assertAwsProfilesConfigured = (profiles: string[]) => {
  if (profiles.length === 0) {
    throw new CliError({
      category: 'CREDENTIALS',
      code: 'AWS_PROFILE_NOT_CONFIGURED',
      message: 'No AWS profile is configured in the shared AWS credentials or config files.',
      hints: 'Create a profile with `stacktape aws-profile:create`.'
    });
  }
};

export const assertAwsProfileDoesNotExist = ({
  configProfiles,
  credentialsProfiles,
  profile
}: {
  configProfiles: Record<string, unknown> | undefined;
  credentialsProfiles: Record<string, unknown> | undefined;
  profile: string;
}) => {
  if (credentialsProfiles?.[profile]) {
    throw new CliError({
      category: 'CREDENTIALS',
      code: 'AWS_PROFILE_ALREADY_EXISTS',
      message: `Credentials for profile \`${profile}\` are already set in the shared AWS credentials file.`
    });
  }
  if (configProfiles?.[profile]) {
    throw new CliError({
      category: 'CREDENTIALS',
      code: 'AWS_PROFILE_ALREADY_EXISTS',
      message: `Profile \`${profile}\` is already set in the shared AWS config file.`
    });
  }
};
