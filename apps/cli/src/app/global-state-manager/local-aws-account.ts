import type { GlobalStateConnectedAwsAccount } from './types';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CliError } from '@utils/errors';
import { getHomeDir } from '@utils/misc';

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

/** One profile's settings from the AWS config file and the credentials file. Either is undefined when absent. */
export type AwsProfileSections = { config?: Record<string, unknown>; credentials?: Record<string, unknown> };

export type LocalAwsAccountSources = {
  readProfile: (profile: string) => Promise<AwsProfileSections>;
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

/**
 * Top-level `key = value` pairs per section. Indented lines are nested settings (for example `s3 =`) and comments
 * start with `#` or `;`. Section names are kept whole: profile names may contain dots.
 */
export const parseAwsIniSections = (content: string) => {
  const sections: Record<string, Record<string, string>> = {};
  let current: Record<string, string> | undefined;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*([#;]|$)/.test(line) || /^\s/.test(line)) continue;
    const header = /^\[\s*(.+?)\s*\]/.exec(line);
    if (header) {
      current = sections[header[1].replace(/\s+/g, ' ')] ??= {};
      continue;
    }
    const separator = line.indexOf('=');
    if (current && separator > 0) current[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return sections;
};

const readAwsIniFile = async (path: string) => {
  const content = await readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  return parseAwsIniSections(content);
};

const awsFilePath = (fromEnvironment: string | undefined, fallback: string) => {
  if (!fromEnvironment) return join(getHomeDir(), '.aws', fallback);
  return fromEnvironment.startsWith('~/') ? join(getHomeDir(), fromEnvironment.slice(2)) : resolve(fromEnvironment);
};

/** A profile's sections, from the same files the AWS SDK reads (`AWS_CONFIG_FILE`, `AWS_SHARED_CREDENTIALS_FILE`). */
export const readAwsProfileSections = async (
  profile: string,
  environment: Environment = process.env
): Promise<AwsProfileSections> => {
  const [config, credentials] = await Promise.all([
    readAwsIniFile(awsFilePath(environment.AWS_CONFIG_FILE, 'config')),
    readAwsIniFile(awsFilePath(environment.AWS_SHARED_CREDENTIALS_FILE, 'credentials'))
  ]);
  return {
    config: config[`profile ${profile}`] ?? (profile === 'default' ? config.default : undefined),
    credentials: credentials[profile]
  };
};

/** The account a profile names without asking AWS: an SSO account, or the account of the role it assumes. */
export const accountIdFromProfileConfig = (section: Record<string, unknown> | undefined) => {
  if (!section) return undefined;
  const ssoAccountId = String(section.sso_account_id ?? '');
  if (ACCOUNT_ID.test(ssoAccountId)) return ssoAccountId;
  const roleAccountId = String(section.role_arn ?? '').split(':')[4] ?? '';
  return ACCOUNT_ID.test(roleAccountId) ? roleAccountId : undefined;
};

const isSsoProfile = (section: Record<string, unknown> | undefined) =>
  Boolean(section?.sso_session || section?.sso_start_url || section?.sso_account_id);

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
  const sections = await sources.readProfile(profile);
  if (!sections.config && !sections.credentials) {
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'LOCAL_AWS_PROFILE_NOT_FOUND',
      message: `AWS profile "${profile}" (${selector.label}) does not exist.`,
      hints: [`Fix the profile name, ${selector.removal}, or pass --awsAccount <name>.`]
    });
  }
  const configured = accountIdFromProfileConfig(sections.config);
  if (configured) return configured;
  try {
    return await withTimeout(sources.profileCallerAccount(profile), timeoutMs);
  } catch (cause) {
    const sso = isSsoProfile(sections.config) || /\bsso\b/i.test(errorText(cause));
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
