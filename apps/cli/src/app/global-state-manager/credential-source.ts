type CredentialEnvironment = Record<string, string | undefined>;

const hasEnvironmentCredentialSource = (environment: CredentialEnvironment) =>
  Boolean(environment.AWS_ACCESS_KEY_ID && environment.AWS_SECRET_ACCESS_KEY) ||
  Boolean(environment.AWS_WEB_IDENTITY_TOKEN_FILE) ||
  Boolean(environment.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) ||
  Boolean(environment.AWS_CONTAINER_CREDENTIALS_FULL_URI);

export const selectAwsCredentialProfile = ({
  requestedProfile,
  environmentProfile,
  persistedProfile,
  environment
}: {
  requestedProfile?: string;
  environmentProfile?: string;
  persistedProfile?: string;
  environment: CredentialEnvironment;
}) => {
  if (requestedProfile) return requestedProfile;
  if (environmentProfile) return environmentProfile;
  return hasEnvironmentCredentialSource(environment) ? undefined : persistedProfile;
};
