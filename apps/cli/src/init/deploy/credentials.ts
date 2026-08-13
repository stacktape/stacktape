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
    }
  | {
      available: false;
      /** Which of the two failure modes this is: nothing configured, or configured and rejected. */
      reason: 'no-credentials' | 'rejected';
      detail: string;
    };

/** The region a deploy would default to, taken from the environment the way every AWS tool does. */
export const defaultRegion = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.AWS_REGION ?? env.AWS_DEFAULT_REGION;

/**
 * Ask AWS who these credentials belong to.
 *
 * The timeout matters more than it looks: an unreachable IMDS endpoint (a laptop with a stale
 * `AWS_EC2_METADATA` setting, a VPN) makes the default provider chain hang for a long time, and the
 * wizard would sit on a spinner with nothing to say.
 */
export const resolveAwsIdentity = async ({
  region = defaultRegion() ?? 'us-east-1',
  timeoutMs = 8_000
}: { region?: string; timeoutMs?: number } = {}): Promise<AwsIdentity> => {
  const client = new STSClient({
    region,
    credentials: fromNodeProviderChain({ timeout: timeoutMs, maxRetries: 1 }),
    // Bun's `node:https` stalls against the AWS SDK; every client in this CLI uses fetch instead.
    requestHandler: createFetchHandler({ requestTimeout: timeoutMs }),
    maxAttempts: 1
  });

  try {
    const identity = await client.send(new GetCallerIdentityCommand({}));
    if (identity.Account === undefined || identity.Arn === undefined) {
      return { available: false, reason: 'rejected', detail: 'AWS answered without an account identity.' };
    }
    return {
      available: true,
      accountId: identity.Account,
      arn: identity.Arn,
      ...(defaultRegion() === undefined ? {} : { region: defaultRegion()! })
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // The provider chain throws its own error when it finds nothing at all, which is a different
    // problem for the user than credentials AWS actively refused.
    const missing = /could not load credentials|credentialsproviderror|no credentials/i.test(detail);
    return { available: false, reason: missing ? 'no-credentials' : 'rejected', detail };
  } finally {
    client.destroy();
  }
};
