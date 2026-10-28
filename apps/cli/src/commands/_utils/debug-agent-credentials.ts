import { awsSdkManager } from '@utils/aws-sdk-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { CliError } from '@utils/errors';

type DebugAgentCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

let cachedCredentials: DebugAgentCredentials | null = null;
let role: { arn: string; externalId: string } | null = null;

const getAssumeRoleFailureHint = ({ errorMessage }: { errorMessage: string }) => {
  if (errorMessage.includes('AccessDenied')) {
    return 'AssumeRole denied. Verify caller credentials can assume the stack debug role and redeploy to refresh trust policy if needed.';
  }

  if (errorMessage.includes('ExternalId')) {
    return 'ExternalId mismatch. This stack metadata may be stale. Redeploy the stack and retry.';
  }

  if (errorMessage.includes('NoSuchEntity') || errorMessage.includes('cannot be assumed')) {
    return 'Debug role missing or not assumable. Redeploy stack to recreate debug role outputs.';
  }

  if (errorMessage.includes('ExpiredToken') || errorMessage.includes('InvalidClientTokenId')) {
    return 'Base AWS credentials are invalid/expired. Refresh credentials and retry.';
  }

  return 'Check AWS credentials, stack deployment state, and debug role trust policy.';
};

/**
 * Reads the stack's read-only debug agent role from its outputs and metadata. Every stack deploys the role; call this
 * after the stack is loaded and before running debug commands.
 */
export const initDebugAgentCredentials = () => {
  cachedCredentials = null;
  role = null;
  const stackInfoMap = deployedStackOverviewManager.stackInfoMap;
  const arn = stackInfoMap?.customOutputs?.DebugAgentRoleArn as string | undefined;
  const externalId = stackInfoMap?.metadata?.[stackMetadataNames.debugAgentRoleExternalId()]?.value as
    | string
    | undefined;
  if (!arn || !externalId) return false;
  role = { arn, externalId };
  return true;
};

/**
 * Credentials of the stack's debug agent role, which can only read this stack. The role is assumed with the credentials
 * this CLI selected, never the ambient AWS credential chain. When the stack has no such role or it cannot be assumed,
 * this throws instead of handing out the user's own, broader credentials.
 */
export const getDebugAgentCredentials = async (): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}> => {
  if (!role) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEBUG_AGENT_ROLE_MISSING',
      message:
        'This stack has no read-only debug agent role, so the command does not read AWS. It does not fall back to your own AWS credentials.',
      hints: 'Redeploy the stack to create the debug agent role, then retry.'
    });
  }

  // Valid for at least 5 more minutes.
  if (cachedCredentials && cachedCredentials.expiration.getTime() - Date.now() > 5 * 60 * 1000) {
    return cachedCredentials;
  }

  try {
    const credentials = await awsSdkManager.sts.assumeRoleCredentials({
      roleArn: role.arn,
      roleSessionName: `debug-agent-${Date.now()}`,
      externalId: role.externalId,
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
    const errorMessage = cause instanceof Error ? cause.message : 'Unknown error';
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEBUG_AGENT_ROLE_ASSUME_FAILED',
      message: `Could not assume the read-only debug agent role ${role.arn}, so the command does not read AWS: ${errorMessage}. It does not fall back to your own AWS credentials.`,
      hints: getAssumeRoleFailureHint({ errorMessage: `${cause.name ?? ''} ${errorMessage}` })
    });
  }
};
