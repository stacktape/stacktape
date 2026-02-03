import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';

type DebugAgentCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

let cachedCredentials: DebugAgentCredentials | null = null;
let roleArn: string | null = null;
let externalId: string | null = null;

/**
 * Initialize debug agent credentials by fetching role info from stack outputs/metadata.
 * Call this after stack is loaded but before running debug commands.
 */
export const initDebugAgentCredentials = () => {
  const stackInfoMap = deployedStackOverviewManager.stackInfoMap;
  if (!stackInfoMap) {
    tuiManager.warn('Stack info not available - debug commands will use user credentials');
    return false;
  }

  roleArn = stackInfoMap.customOutputs?.DebugAgentRoleArn as string;
  if (!roleArn) {
    tuiManager.warn('Debug agent role not found in stack - using user credentials');
    return false;
  }

  externalId = stackInfoMap.metadata?.[stackMetadataNames.debugAgentRoleExternalId()]?.value as string;
  if (!externalId) {
    tuiManager.warn('Debug agent role external ID not found - using user credentials');
    return false;
  }

  return true;
};

/**
 * Get credentials for the debug agent role.
 * Assumes the role if not cached or if cached credentials are expired.
 * Falls back to user credentials if role assumption fails.
 */
export const getDebugAgentCredentials = async (): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}> => {
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

  try {
    const stsClient = new STSClient({ region: globalStateManager.region });
    const response = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `debug-agent-${Date.now()}`,
        ExternalId: externalId,
        DurationSeconds: 900
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
    tuiManager.warn(`Failed to assume debug agent role: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
 * Check if the debug agent role is configured and available.
 */
export const isDebugAgentRoleAvailable = (): boolean => {
  return Boolean(roleArn && externalId);
};

/**
 * Get the debug agent role ARN (for display purposes).
 */
export const getDebugAgentRoleArn = (): string | null => roleArn;
