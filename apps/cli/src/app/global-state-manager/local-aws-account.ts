import type { GlobalStateConnectedAwsAccount } from './types';
import type { AwsCredentialIdentity, Pluggable } from '@aws-sdk/types';
import { CliError } from '@utils/errors';
import { createFetchHandler } from 'src/aws/fetch-handler';

/**
 * Stack commands deploy into a connected AWS account. When the user has selected local AWS credentials (`--profile`,
 * `AWS_PROFILE` or `AWS_ACCESS_KEY_ID`) and did not pass `--awsAccount`, the account those credentials belong to
 * decides the target, the way every other AWS tool treats them. Anything that cannot be resolved or matched fails
 * before the command changes anything; it never falls back to another account.
 */

type Environment = Record<string, string | undefined>;
type ConnectedAccount = Pick<GlobalStateConnectedAwsAccount, 'name' | 'awsAccountId'>;

export type LocalAwsSelector = {
  /** As the user set it: `--profile dev`, `AWS_PROFILE=dev` or `AWS_ACCESS_KEY_ID`. */
  label: string;
  /** How to stop using it, phrased to follow a comma. */
  removal: string;
  profile?: string;
};

export type LocalAwsSelectors = {
  profile?: LocalAwsSelector & { profile: string };
  environmentKeys?: LocalAwsSelector;
};

export type LocalAwsAccount = { accountId: string; selector: LocalAwsSelector };

/** A profile's settings as the AWS SDK merges them: the credentials file overrides the config file key by key. */
export type AwsProfileData = Record<string, string | undefined>;

export type LocalAwsAccountSources = {
  /** Undefined when neither file defines the profile. */
  readProfile: (profile: string) => Promise<AwsProfileData | undefined>;
  /** STS GetCallerIdentity with the profile's credentials. */
  profileCallerAccount: (profile: string) => Promise<string>;
  /** STS GetCallerIdentity with the credentials in the environment. */
  environmentCallerAccount: () => Promise<string>;
};

const ACCOUNT_ID = /^\d{12}$/;
export const LOCAL_AWS_ACCOUNT_TIMEOUT_MS = 10_000;

/** `--profile` wins over `AWS_PROFILE`, as in the AWS SDK and CLI. Environment keys are reported separately. */
export const detectLocalAwsSelectors = ({
  requestedProfile,
  environment
}: {
  requestedProfile?: string;
  environment: Environment;
}): LocalAwsSelectors => {
  const environmentProfile = environment.AWS_PROFILE;
  return {
    profile: requestedProfile
      ? { label: `--profile ${requestedProfile}`, removal: 'drop --profile', profile: requestedProfile }
      : environmentProfile
        ? { label: `AWS_PROFILE=${environmentProfile}`, removal: 'unset AWS_PROFILE', profile: environmentProfile }
        : undefined,
    environmentKeys: environment.AWS_ACCESS_KEY_ID
      ? { label: 'AWS_ACCESS_KEY_ID', removal: 'unset AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY' }
      : undefined
  };
};

/** Reads a profile through the SDK's own loader, so files, precedence and section names match `fromIni`. */
export const readAwsProfile = async (
  profile: string,
  environment: Environment = process.env
): Promise<AwsProfileData | undefined> => {
  const { parseKnownFiles } = await import('@smithy/core/config');
  const profiles = await parseKnownFiles({
    profile,
    filepath: environment.AWS_SHARED_CREDENTIALS_FILE,
    configFilepath: environment.AWS_CONFIG_FILE,
    ignoreCache: true
  });
  return profiles[profile];
};

type ProfileCredentialsOptions = {
  profile: string;
  environment?: Environment;
  region?: string;
  clientPlugins?: Pluggable<any, any>[];
};

/** Like the default chain, temporary credentials are renewed five minutes before they expire. */
const expiresSoon = (credentials: AwsCredentialIdentity) =>
  credentials.expiration !== undefined && credentials.expiration.getTime() - Date.now() < 300_000;

/**
 * A provider of exactly this profile's credentials, shared by every client and renewed before they expire. `fromIni`
 * handles SSO, `credential_process` and role chains, and fails when the profile fails. The default chain would fall
 * through to container, instance or environment credentials instead, and their account would then be reported as the
 * profile's.
 */
export const createProfileCredentialsProvider = async ({
  profile,
  environment = process.env,
  region,
  clientPlugins
}: ProfileCredentialsOptions): Promise<() => Promise<AwsCredentialIdentity>> => {
  const [{ fromIni }, { memoize }] = await Promise.all([
    import('@aws-sdk/credential-providers'),
    import('@smithy/core/config')
  ]);
  const provider = fromIni({
    profile,
    filepath: environment.AWS_SHARED_CREDENTIALS_FILE,
    configFilepath: environment.AWS_CONFIG_FILE,
    ignoreCache: true,
    // Credential-provider STS calls need the same bounded transport as service calls.
    clientConfig: { ...(region ? { region } : {}), requestHandler: createFetchHandler() },
    ...(clientPlugins ? { clientPlugins } : {})
  });
  return memoize(
    () => provider(),
    expiresSoon,
    (credentials) => credentials.expiration !== undefined
  );
};

/** Credentials of exactly this profile, loaded once; see `createProfileCredentialsProvider`. */
export const loadProfileCredentials = async (options: ProfileCredentialsOptions): Promise<AwsCredentialIdentity> =>
  (await createProfileCredentialsProvider(options))();

const isString = (value: unknown): value is string => typeof value === 'string';
const isOptionalString = (value: unknown) => value === undefined || isString(value);
const accountOf = (value: unknown) => {
  const accountId = isString(value) ? value : '';
  return ACCOUNT_ID.test(accountId) ? accountId : undefined;
};

/**
 * The account a profile's credentials belong to, when the profile alone decides it. Follows `fromIni`'s order for the
 * selected profile: an assume-role profile gets the role's account, static keys and `credential_process` need STS, a
 * web-identity profile gets the role's account, and an SSO profile gets `sso_account_id`.
 */
export const accountIdFromProfile = (data: AwsProfileData | undefined) => {
  if (!data) return undefined;
  const assumesRole =
    isString(data.role_arn) &&
    isOptionalString(data.role_session_name) &&
    isOptionalString(data.external_id) &&
    isOptionalString(data.mfa_serial) &&
    ((isString(data.source_profile) && data.credential_source === undefined) ||
      (isString(data.credential_source) && data.source_profile === undefined));
  if (assumesRole) return accountOf(data.role_arn?.split(':')[4]);
  const hasStaticKeys =
    isString(data.aws_access_key_id) &&
    isString(data.aws_secret_access_key) &&
    isOptionalString(data.aws_session_token) &&
    isOptionalString(data.aws_account_id);
  if (hasStaticKeys) return undefined;
  if (isString(data.web_identity_token_file) && isString(data.role_arn) && isOptionalString(data.role_session_name)) {
    return accountOf(data.role_arn.split(':')[4]);
  }
  if (isString(data.credential_process)) return undefined;
  return accountOf(data.sso_account_id);
};

const isSsoProfile = (data: AwsProfileData | undefined) =>
  Boolean(data?.sso_session || data?.sso_start_url || data?.sso_account_id);

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/\.$/, '');

const withTimeout = async <T>(work: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`AWS did not answer within ${timeoutMs / 1000} seconds`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const unresolved = ({ selector, cause, hint }: { selector: LocalAwsSelector; cause: unknown; hint: string }) =>
  new CliError({
    category: 'AWS_ACCOUNT',
    code: 'LOCAL_AWS_ACCOUNT_UNRESOLVED',
    message: `Could not find the AWS account of ${selector.label}: ${errorText(cause)}.`,
    hints: [hint],
    cause
  });

const localCredentialsLabel = (profile: string | undefined) =>
  profile ? `AWS profile "${profile}"` : 'the standard AWS credential chain';

/** The reason an AWS request failed, without the request description `createAwsErrorHandler` puts first. */
const awsErrorText = (error: unknown) =>
  errorText(error instanceof CliError && error.code === 'AWS_REQUEST_FAILED' ? error.cause : error);

/** Local credentials that could not be loaded when an AWS client first needed them. */
export const localAwsCredentialsUnavailable = ({ profile, cause }: { profile: string | undefined; cause: unknown }) =>
  cause instanceof CliError && cause.category === 'CREDENTIALS'
    ? cause
    : new CliError({
        category: 'CREDENTIALS',
        code: 'LOCAL_AWS_CREDENTIALS_UNAVAILABLE',
        message: `Could not load AWS credentials from ${localCredentialsLabel(profile)}: ${errorText(cause)}.`,
        hints: [
          profile
            ? `Check profile "${profile}" in your AWS config, or log in again ("aws sso login --profile ${profile}" for SSO).`
            : 'Set AWS_PROFILE or pass --profile, or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.'
        ],
        cause
      });

/** The account of local credentials could not be looked up with STS. */
export const localAwsAccountUnresolved = ({ profile, cause }: { profile: string | undefined; cause: unknown }) =>
  cause instanceof CliError && (cause.category === 'CREDENTIALS' || cause.category === 'AWS_ACCOUNT')
    ? cause
    : new CliError({
        category: 'AWS_ACCOUNT',
        code: 'LOCAL_AWS_ACCOUNT_UNRESOLVED',
        message: `Could not find the AWS account of ${localCredentialsLabel(profile)}: ${awsErrorText(cause)}.`,
        hints: [
          profile
            ? `Check the credentials of profile "${profile}".`
            : 'Check the AWS credentials in your environment or AWS config.'
        ],
        cause
      });

const resolveProfileAccountId = async ({
  selector,
  sources,
  timeoutMs
}: {
  selector: LocalAwsSelector & { profile: string };
  sources: LocalAwsAccountSources;
  timeoutMs: number;
}) => {
  const { profile } = selector;
  const data = await sources.readProfile(profile);
  if (!data) {
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'LOCAL_AWS_PROFILE_NOT_FOUND',
      message: `AWS profile "${profile}" (${selector.label}) does not exist.`,
      hints: [`Fix the profile name, ${selector.removal}, or pass --awsAccount <name>.`]
    });
  }
  const configured = accountIdFromProfile(data);
  if (configured) return configured;
  try {
    return await withTimeout(sources.profileCallerAccount(profile), timeoutMs);
  } catch (cause) {
    const sso = isSsoProfile(data) || /\bsso\b/i.test(errorText(cause));
    throw unresolved({
      selector,
      cause,
      hint: sso
        ? `Run "aws sso login --profile ${profile}", or pass --awsAccount <name>.`
        : `Check the credentials of profile "${profile}", ${selector.removal}, or pass --awsAccount <name>.`
    });
  }
};

const resolveEnvironmentAccountId = async ({
  selector,
  sources,
  timeoutMs
}: {
  selector: LocalAwsSelector;
  sources: LocalAwsAccountSources;
  timeoutMs: number;
}) => {
  try {
    return await withTimeout(sources.environmentCallerAccount(), timeoutMs);
  } catch (cause) {
    throw unresolved({
      selector,
      cause,
      hint: `Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or ${selector.removal}.`
    });
  }
};

/**
 * The AWS account local credentials point to, or undefined when none are selected. A profile and environment keys
 * that belong to different accounts are ambiguous: the AWS SDK picks the profile, the AWS CLI the keys, and the CLI
 * deploys with the keys when they are set.
 */
export const resolveLocalAwsAccount = async ({
  selectors,
  sources,
  timeoutMs = LOCAL_AWS_ACCOUNT_TIMEOUT_MS
}: {
  selectors: LocalAwsSelectors;
  sources: LocalAwsAccountSources;
  timeoutMs?: number;
}): Promise<LocalAwsAccount | undefined> => {
  const { profile, environmentKeys } = selectors;
  if (!profile && !environmentKeys) return undefined;
  const [profileAccountId, environmentAccountId] = await Promise.all([
    profile ? resolveProfileAccountId({ selector: profile, sources, timeoutMs }) : undefined,
    environmentKeys ? resolveEnvironmentAccountId({ selector: environmentKeys, sources, timeoutMs }) : undefined
  ]);
  if (profile && environmentKeys && profileAccountId !== environmentAccountId) {
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'LOCAL_AWS_CREDENTIALS_CONFLICT',
      message: `${profile.label} belongs to AWS account ${profileAccountId}, but ${environmentKeys.label} belongs to ${environmentAccountId}.`,
      hints: [`Use one of them: ${profile.removal}, or ${environmentKeys.removal}.`]
    });
  }
  return profile
    ? { accountId: profileAccountId!, selector: profile }
    : { accountId: environmentAccountId!, selector: environmentKeys! };
};

export const describeAccounts = (accounts: ConnectedAccount[]) =>
  accounts.map(({ name, awsAccountId }) => `${name} (${awsAccountId || 'no account ID'})`).join(', ') || 'none';

/** The one connected account with the local credentials' account ID. */
export const matchConnectedAwsAccount = <Account extends ConnectedAccount>({
  localAccount,
  connectedAwsAccounts,
  organizationName
}: {
  localAccount: LocalAwsAccount;
  connectedAwsAccounts: Account[];
  organizationName: string;
}): Account => {
  const { accountId, selector } = localAccount;
  const matches = connectedAwsAccounts.filter(({ awsAccountId }) => awsAccountId === accountId);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'LOCAL_AWS_ACCOUNT_AMBIGUOUS',
      message: `AWS account ${accountId} (from ${selector.label}) is connected more than once: ${matches.map(({ name }) => name).join(', ')}.`,
      hints: ['Pass --awsAccount <name>.']
    });
  }
  // Keys in the environment are still used to deploy when they are set, so only removing them helps.
  const fixes = selector.profile
    ? `${selector.removal}, pass --awsAccount <name>, or connect account ${accountId} in the Stacktape Console.`
    : `${selector.removal}, or connect account ${accountId} in the Stacktape Console.`;
  throw new CliError({
    category: 'AWS_ACCOUNT',
    code: 'LOCAL_AWS_ACCOUNT_NOT_CONNECTED',
    message: `${selector.label} belongs to AWS account ${accountId}, which is not connected to organization "${organizationName}".`,
    hints: [`Connected accounts: ${describeAccounts(connectedAwsAccounts)}.`, `To fix it, ${fixes}`]
  });
};

/**
 * The line shown when `--awsAccount` overrides a selected profile. A profile still supplies the credentials of an
 * account connected without Stacktape-managed access when no keys are in the environment; it is not ignored then.
 */
export const ignoredProfileNotice = ({
  selectors,
  account
}: {
  selectors: LocalAwsSelectors;
  account: Pick<GlobalStateConnectedAwsAccount, 'name' | 'awsAccountId' | 'connectionMode'>;
}) => {
  const { profile, environmentKeys } = selectors;
  if (!profile) return undefined;
  if (account.connectionMode !== 'PRIVILEGED' && !environmentKeys) return undefined;
  return `${profile.label} is ignored: --awsAccount selects "${account.name}" (${account.awsAccountId}).`;
};
