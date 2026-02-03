import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';

type DevAgentCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

let cachedCredentials: DevAgentCredentials | null = null;
let roleArn: string | null = null;
let externalId: string | null = null;

/**
 * Initialize dev agent credentials by fetching role info from stack outputs/metadata.
 * Call this after stack is loaded but before agent server starts.
 */
export const initDevAgentCredentials = () => {
  const stackInfoMap = deployedStackOverviewManager.stackInfoMap;
  if (!stackInfoMap) {
    tuiManager.warn('Stack info not available - dev agent will use user credentials');
    return false;
  }

  // Get role ARN from custom outputs
  roleArn = stackInfoMap.customOutputs?.DevAgentRoleArn as string;
  if (!roleArn) {
    tuiManager.warn('Dev agent role not found in stack - using user credentials');
    return false;
  }

  // Get external ID from metadata
  externalId = stackInfoMap.metadata?.[stackMetadataNames.devAgentRoleExternalId()]?.value as string;
  if (!externalId) {
    tuiManager.warn('Dev agent role external ID not found - using user credentials');
    return false;
  }

  return true;
};

/**
 * Get credentials for the dev agent role.
 * Assumes the role if not cached or if cached credentials are expired.
 * Falls back to user credentials if role assumption fails.
 */
export const getDevAgentCredentials = async (): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}> => {
  // If no role configured, use user credentials
  if (!roleArn || !externalId) {
    const userCreds = globalStateManager.credentials;
    return {
      accessKeyId: userCreds.accessKeyId,
      secretAccessKey: userCreds.secretAccessKey,
      sessionToken: userCreds.sessionToken
    };
  }

  // Check if cached credentials are still valid (with 5 min buffer)
  if (cachedCredentials) {
    const bufferMs = 5 * 60 * 1000;
    if (cachedCredentials.expiration.getTime() - Date.now() > bufferMs) {
      return cachedCredentials;
    }
  }

  // Assume the dev agent role
  try {
    const stsClient = new STSClient({ region: globalStateManager.region });
    const response = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `dev-agent-${Date.now()}`,
        ExternalId: externalId,
        DurationSeconds: 900 // 15 minutes (minimum, to avoid MaxSessionDuration issues)
      })
    );

    if (!response.Credentials) {
      throw new Error('No credentials returned from AssumeRole');
    }

    cachedCredentials = {
      accessKeyId: response.Credentials.AccessKeyId!,
      secretAccessKey: response.Credentials.SecretAccessKey!,
      sessionToken: response.Credentials.SessionToken!,
      expiration: response.Credentials.Expiration!
    };

    return cachedCredentials;
  } catch (err) {
    tuiManager.warn(`Failed to assume dev agent role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    tuiManager.warn('Falling back to user credentials');

    const userCreds = globalStateManager.credentials;
    return {
      accessKeyId: userCreds.accessKeyId,
      secretAccessKey: userCreds.secretAccessKey,
      sessionToken: userCreds.sessionToken
    };
  }
};

/**
 * Check if the dev agent role is configured and available.
 */
export const isDevAgentRoleAvailable = (): boolean => {
  return Boolean(roleArn && externalId);
};

/**
 * Get the dev agent role ARN (for display purposes).
 */
export const getDevAgentRoleArn = (): string | null => roleArn;
