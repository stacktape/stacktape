import { setTimeout as delay } from 'node:timers/promises';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';

type DevAgentCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

let cachedCredentials: DevAgentCredentials | null = null;
let role: { arn: string; externalId: string } | null = null;
/** Set once a refusal outlasted the retries: IAM had time to propagate the role, so later calls fail at once. */
let refusalConfirmed = false;

/**
 * Reads the dev agent role of the dev stack from its outputs and metadata. Every stack deploys the role; call this after
 * the dev stack is deployed and before the agent server starts.
 */
export const initDevAgentCredentials = () => {
  cachedCredentials = null;
  role = null;
  refusalConfirmed = false;
  const stackInfoMap = deployedStackOverviewManager.stackInfoMap;
  const arn = stackInfoMap?.customOutputs?.DevAgentRoleArn as string | undefined;
  const externalId = stackInfoMap?.metadata?.[stackMetadataNames.devAgentRoleExternalId()]?.value as string | undefined;
  if (!arn || !externalId) {
    tuiManager.warn(
      'The dev stack has no dev agent role, so the agent cannot read AWS for this session. Restart dev mode to update the dev stack.'
    );
    return false;
  }
  role = { arn, externalId };
  return true;
};

const isAccessDenied = (error: Error) => /AccessDenied|not authorized/i.test(`${error.name} ${error.message}`);

/**
 * Credentials of the dev agent role, which is limited to this dev stack. The role is assumed with the credentials this
 * CLI selected (the profile or the Console-connected account), never the ambient AWS credential chain. Right after the
 * dev stack created the role, IAM may refuse it for a few seconds, so a refusal is retried for `retryForMs`, once per
 * session. When the role cannot be assumed, this rejects instead of handing out the developer's own, broader
 * credentials.
 */
export const getDevAgentCredentials = async ({ retryForMs = 30_000 }: { retryForMs?: number } = {}): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}> => {
  if (!role) {
    throw new Error(
      'The dev stack has no dev agent role, so the agent does not read AWS. Restart dev mode to update the dev stack.'
    );
  }
  // Valid for at least 5 more minutes.
  if (cachedCredentials && cachedCredentials.expiration.getTime() - Date.now() > 5 * 60 * 1000) {
    return cachedCredentials;
  }
  const { arn, externalId } = role;
  const deadline = Date.now() + (refusalConfirmed ? 0 : retryForMs);
  const assume = async (
    attempt: number
  ): Promise<Awaited<ReturnType<typeof awsSdkManager.sts.assumeRoleCredentials>>> => {
    try {
      return await awsSdkManager.sts.assumeRoleCredentials({
        roleArn: arn,
        roleSessionName: `dev-agent-${Date.now()}`,
        externalId,
        // The minimum, so the role's maximum session duration never refuses it.
        durationSeconds: 900
      });
    } catch (error) {
      const cause = ((error as { cause?: unknown }).cause ?? error) as Error;
      const wait = Math.min(500 * 2 ** attempt, 5000);
      if (!isAccessDenied(cause) || Date.now() + wait > deadline) throw error;
      await delay(wait);
      return assume(attempt + 1);
    }
  };
  try {
    const credentials = await assume(0);
    cachedCredentials = {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken!,
      expiration: credentials.expiration!
    };
    return cachedCredentials;
  } catch (err) {
    const cause = ((err as { cause?: unknown }).cause ?? err) as Error;
    if (isAccessDenied(cause)) refusalConfirmed = true;
    throw new Error(
      `The agent could not assume the dev agent role ${arn}, so it does not read AWS: ${cause.message}. ` +
        'It does not fall back to your own AWS credentials. Restart dev mode to update the dev stack and its role.'
    );
  }
};
