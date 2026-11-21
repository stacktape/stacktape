/**
 * Whether this machine can deploy, and to where.
 *
 * Asked *before* the deploy button rather than discovered inside a failing deployment, because
 * "which account am I about to create things in" is the one question nobody should have to answer
 * by reading a stack trace. A person who has never used AWS from a terminal will not recognise
 * `Could not load credentials from any providers` as "run `aws configure`".
 *
 * Deliberately small: it asks STS who we are and reports the answer. It does not touch the CLI's own
 * credential machinery, which resolves profiles, SSO, assumed roles and Stacktape-managed access as
 * part of a command that is already running.
 */

import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { createFetchHandler } from 'src/aws/fetch-handler';

export type AwsIdentity =
  | {
      available: true;
      accountId: string;
      /** The IAM principal, so a user with several profiles can see which one this is. */
      arn: string;
      /** Where the region came from, or undefined when nothing on this machine names one. */
      region?: string;
      /** The AWS profile the credentials came from; absent when they came from environment variables. */
      profile?: string;
      /** The account's IAM alias, the name people know it by, when these credentials may read it. */
      accountAlias?: string;
    }
  | {
      available: false;
      /** Which of the two failure modes this is: nothing configured, or configured and rejected. */
      reason: 'no-credentials' | 'rejected';
      detail: string;
      profile?: string;
    };

/** The region the environment names, for callers that do not resolve the CLI's region themselves. */
const environmentRegion = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.AWS_DEFAULT_REGION || env.AWS_REGION || undefined;

/**
 * Ask AWS who these credentials belong to.
 *
 * The timeout matters more than it looks: an unreachable IMDS endpoint (a laptop with a stale
 * `AWS_EC2_METADATA` setting, a VPN) makes the default provider chain hang for a long time, and the
 * wizard would sit on a spinner with nothing to say.
 */
export const resolveAwsIdentity = async ({
  region = environmentRegion(),
  profile,
  timeoutMs = 8_000,
  env = process.env
}: {
  /** The region this machine deploys to, reported with the identity. `init` passes the one the CLI resolved. */
  region?: string;
  /**
   * The profile a deploy on this machine would use (`AWS_PROFILE`, else the `stacktape defaults` profile), as the
   * CLI selects it. Absent: the AWS SDK's own default chain.
   */
  profile?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<AwsIdentity> => {
  // The SDK's chain reads access keys in the environment before any profile, so those win, as they do for a deploy.
  const fromEnvironment = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
  const source = fromEnvironment ? {} : { profile: profile ?? env.AWS_PROFILE ?? 'default' };
  const credentials = fromNodeProviderChain({
    ...(profile === undefined ? {} : { profile }),
    timeout: timeoutMs,
    maxRetries: 1
  });
  const client = new STSClient({
    region: region ?? 'us-east-1',
    credentials,
    // Bun's `node:https` stalls against the AWS SDK; every client in this CLI uses fetch instead.
    requestHandler: createFetchHandler({ requestTimeout: timeoutMs }),
    maxAttempts: 1
  });

  try {
    const identity = await client.send(new GetCallerIdentityCommand({}));
    if (identity.Account === undefined || identity.Arn === undefined) {
      return { available: false, reason: 'rejected', detail: 'AWS answered without an account identity.', ...source };
    }
    const accountAlias = await readAccountAlias(credentials);
    return {
      available: true,
      accountId: identity.Account,
      arn: identity.Arn,
      ...(region === undefined ? {} : { region }),
      ...(accountAlias === undefined ? {} : { accountAlias }),
      ...source
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // The provider chain throws its own error when it finds nothing at all, which is a different
    // problem for the user than credentials AWS actively refused.
    const missing = /could not load credentials|credentialsproviderror|no credentials/i.test(detail);
    return { available: false, reason: missing ? 'no-credentials' : 'rejected', detail, ...source };
  } finally {
    client.destroy();
  }
};

/**
 * The account's IAM alias ("acme-production"), the name people recognise an account by. Best effort and quick: many
 * deploy roles may not call `iam:ListAccountAliases`, and the wizard then shows the account ID alone.
 */
const readAccountAlias = async (
  credentials: ReturnType<typeof fromNodeProviderChain>,
  timeoutMs = 3_000
): Promise<string | undefined> => {
  const client = new IAMClient({
    region: 'us-east-1',
    credentials,
    requestHandler: createFetchHandler({ requestTimeout: timeoutMs }),
    maxAttempts: 1
  });
  try {
    const { AccountAliases } = await client.send(new ListAccountAliasesCommand({}));
    return AccountAliases?.[0];
  } catch {
    return undefined;
  } finally {
    client.destroy();
  }
};
