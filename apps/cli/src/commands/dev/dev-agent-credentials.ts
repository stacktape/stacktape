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

/**
 * Reads the dev agent role of the dev stack from its outputs and metadata. Every stack deploys the role; call this after
 * the dev stack is deployed and before the agent server starts.
 */
export const initDevAgentCredentials = () => {
  cachedCredentials = null;
  role = null;
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

/**
 * Credentials of the dev agent role, which is limited to this dev stack. The role is assumed with the credentials this
 * CLI selected (the profile or the Console-connected account), never the ambient AWS credential chain. When the role
 * cannot be assumed, this rejects instead of handing out the developer's own, broader credentials.
 */
export const getDevAgentCredentials = async (): Promise<{
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
  try {
    const credentials = await awsSdkManager.sts.assumeRoleCredentials({
      roleArn: role.arn,
      roleSessionName: `dev-agent-${Date.now()}`,
      externalId: role.externalId,
      // The minimum, so the role's maximum session duration never refuses it.
      durationSeconds: 900
    });
    cachedCredentials = {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken!,
      expiration: credentials.expiration!
    };
    return cachedCredentials;
  } catch (err) {
    const cause = ((err as { cause?: unknown }).cause ?? err) as Error;
    throw new Error(
      `The agent could not assume the dev agent role ${role.arn}, so it does not read AWS: ${cause.message}. ` +
        'It does not fall back to your own AWS credentials. Restart dev mode to update the dev stack and its role.'
    );
  }
};
