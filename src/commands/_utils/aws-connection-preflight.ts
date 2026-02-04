import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'fs-extra';
import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  StackStatus
} from '@aws-sdk/client-cloudformation';
import { fromIni, fromEnv } from '@aws-sdk/credential-providers';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { publicApiClient } from '../../../shared/trpc/public';
import { openBrowser } from './browser';

const detectLocalAwsCredentials = async (): Promise<{
  hasCredentials: boolean;
  profile?: string;
  region?: string;
}> => {
  // Check environment variables first
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      hasCredentials: true,
      profile: 'environment',
      region: process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION
    };
  }

  // Check for credentials file
  try {
    const credentialsPath = join(homedir(), '.aws', 'credentials');
    if (existsSync(credentialsPath)) {
      const content = readFileSync(credentialsPath, 'utf-8');
      const hasDefault = content.includes('[default]');
      const profileMatch = content.match(/\[([^\]]+)\]/);

      return {
        hasCredentials: true,
        profile: hasDefault ? 'default' : profileMatch?.[1]
      };
    }
  } catch {
    // Ignore errors
  }

  return { hasCredentials: false };
};

/**
 * Runs AWS connection flow using local credentials.
 * 1. Gets connection parameters from server
 * 2. Deploys CloudFormation stack using local AWS credentials
 * 3. Waits for stack completion (stack's custom resource activates the connection)
 * 4. Polls for connection status
 */
const runAutoAwsConnection = async (
  organizationId: string,
  localCreds: { profile?: string }
): Promise<{ success: boolean; awsAccountId?: string; connectionName?: string; error?: string }> => {
  try {
    // 1. Initialize connection on server, get CF stack parameters
    const { connectionId, stackName, templateUrl, parameters } = await publicApiClient.initAwsConnectionForCli({
      organizationId,
      connectionName: 'aws-account',
      connectionMode: 'PRIVILEGED'
    });

    await eventManager.updateEvent({
      eventType: 'CONNECT_AWS_ACCOUNT',
      additionalMessage: 'Deploying connection stack...'
    });

    // 2. Create CloudFormation client with local credentials
    const credentials =
      localCreds.profile && localCreds.profile !== 'environment' ? fromIni({ profile: localCreds.profile }) : fromEnv();

    // Stack must be deployed in eu-west-1 (where the Stacktape lambdas are)
    const cfClient = new CloudFormationClient({ region: 'eu-west-1', credentials });

    // 3. Deploy the CloudFormation stack
    await cfClient.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateURL: templateUrl,
        Parameters: [
          { ParameterKey: 'StacktapeConnectionId', ParameterValue: parameters.StacktapeConnectionId },
          { ParameterKey: 'StacktapeConnectionMode', ParameterValue: parameters.StacktapeConnectionMode },
          {
            ParameterKey: 'StacktapeReportNotificationLambda',
            ParameterValue: parameters.StacktapeReportNotificationLambda
          },
          {
            ParameterKey: 'StacktapeHandleConnectionLambda',
            ParameterValue: parameters.StacktapeHandleConnectionLambda
          }
        ],
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        OnFailure: 'DELETE'
      })
    );

    // 4. Wait for stack creation (with progress updates)
    const terminalStatuses = new Set([
      StackStatus.CREATE_COMPLETE,
      StackStatus.CREATE_FAILED,
      StackStatus.ROLLBACK_COMPLETE,
      StackStatus.ROLLBACK_FAILED,
      StackStatus.DELETE_COMPLETE,
      StackStatus.DELETE_FAILED
    ]);

    let stackStatus: StackStatus | undefined;
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const { Stacks } = await cfClient.send(new DescribeStacksCommand({ StackName: stackName }));
      stackStatus = Stacks?.[0]?.StackStatus as StackStatus;

      if (i > 0 && i % 5 === 0) {
        const seconds = i * 3;
        await eventManager.updateEvent({
          eventType: 'CONNECT_AWS_ACCOUNT',
          additionalMessage: `Creating connection stack (${seconds}s)...`
        });
      }

      if (stackStatus && terminalStatuses.has(stackStatus as any)) {
        break;
      }
    }

    if (stackStatus !== StackStatus.CREATE_COMPLETE) {
      return {
        success: false,
        error: `Stack creation failed with status: ${stackStatus || 'TIMEOUT'}`
      };
    }

    // 5. Poll for connection activation (custom resource should have activated it)
    await eventManager.updateEvent({
      eventType: 'CONNECT_AWS_ACCOUNT',
      additionalMessage: 'Verifying connection...'
    });

    for (let i = 0; i < 10; i++) {
      const status = await publicApiClient.getAwsConnectionStatus({ connectionId });
      if (status.state === 'ACTIVE') {
        return {
          success: true,
          awsAccountId: status.awsAccountId,
          connectionName: status.name
        };
      }
      if (status.state === 'FAILED') {
        return { success: false, error: 'Connection activation failed' };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { success: false, error: 'Connection verification timed out' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const pollForAwsConnection = async (
  connectionId: string,
  maxAttempts = 90
): Promise<{ connected: boolean; awsAccountId?: string; name?: string }> => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const status = await publicApiClient.getAwsConnectionStatus({ connectionId });

      if (status.state === 'ACTIVE') {
        return {
          connected: true,
          awsAccountId: status.awsAccountId,
          name: status.name
        };
      }

      if (status.state === 'FAILED') {
        return { connected: false };
      }

      // Update event with elapsed time every 10 seconds
      if (i > 0 && i % 5 === 0) {
        const minutes = Math.floor((i * 2) / 60);
        const seconds = (i * 2) % 60;
        await eventManager.updateEvent({
          eventType: 'CONNECT_AWS_ACCOUNT',
          additionalMessage: `Waiting for CloudFormation (${minutes}m ${seconds}s)`
        });
      }
    } catch {
      // Continue polling
    }
  }

  return { connected: false };
};

/**
 * Ensures an AWS account is connected before deploy can proceed.
 * This handles the case where user has no connected AWS accounts.
 *
 * Called during deploy initialization, before loadUserCredentials tries to access targetAwsAccount.
 * This function initializes stacktapeTrpcApiManager and loads user data into globalStateManager.
 */
export const ensureAwsAccountConnected = async (): Promise<void> => {
  // Initialize API and load user data
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const { user, organization, connectedAwsAccounts, projects } =
    await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();

  // Store user data in globalStateManager (so loadUserCredentials doesn't need to fetch again)
  globalStateManager.userData = user;
  globalStateManager.organizationData = organization;
  globalStateManager.connectedAwsAccounts = connectedAwsAccounts || [];
  globalStateManager.projects = projects || [];

  // If user has connected accounts, we're good - let normal flow handle account selection
  if (connectedAwsAccounts && connectedAwsAccounts.length > 0) {
    // If multiple accounts and no --awsAccount specified, prompt to select
    if (connectedAwsAccounts.length > 1 && !globalStateManager.args.awsAccount) {
      if (!process.stdout.isTTY) {
        throw stpErrors.e67({
          organizationName: organization.name,
          connectedAwsAccounts
        });
      }

      const selectedAccount = await tuiManager.promptSelect({
        message: 'Select AWS account to use:',
        options: connectedAwsAccounts.map((acc) => ({
          label: acc.name || 'Unnamed',
          value: acc.name,
          description: acc.awsAccountId ? `Account ID: ${acc.awsAccountId}` : undefined
        }))
      });

      // Set the selected account so targetAwsAccount resolves correctly
      globalStateManager.rawArgs.awsAccount = selectedAccount;
    }
    return;
  }

  // No connected accounts - need to connect one
  if (!process.stdout.isTTY) {
    throw stpErrors.e66({ organizationName: organization.name });
  }

  await eventManager.startEvent({
    eventType: 'CONNECT_AWS_ACCOUNT',
    description: 'Connecting AWS account'
  });

  // Check for local AWS credentials
  const localCreds = await detectLocalAwsCredentials();

  let connectionMethod: 'auto' | 'browser' = 'browser';

  if (localCreds.hasCredentials) {
    await eventManager.updateEvent({
      eventType: 'CONNECT_AWS_ACCOUNT',
      additionalMessage: `Found local credentials (${localCreds.profile || 'default'})`
    });

    connectionMethod = (await tuiManager.promptSelect({
      message: 'How would you like to connect AWS?',
      options: [
        {
          label: 'Use detected credentials (Recommended)',
          value: 'auto',
          description: 'Automatically set up connection using your local credentials'
        },
        {
          label: 'Connect via browser',
          value: 'browser',
          description: 'Opens AWS console for guided setup'
        }
      ]
    })) as 'auto' | 'browser';
  }

  if (connectionMethod === 'auto') {
    await eventManager.updateEvent({
      eventType: 'CONNECT_AWS_ACCOUNT',
      additionalMessage: 'Setting up connection using local credentials'
    });

    const result = await runAutoAwsConnection(organization.id, localCreds);

    if (result.success) {
      await eventManager.finishEvent({
        eventType: 'CONNECT_AWS_ACCOUNT',
        finalMessage: `AWS account connected (${result.awsAccountId})`
      });

      // Refresh user data to get the new account and update globalStateManager
      const refreshedData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
      globalStateManager.connectedAwsAccounts = refreshedData.connectedAwsAccounts || [];
      return;
    }

    // Auto-connection failed, fall back to browser
    tuiManager.warn(`Auto-connection failed: ${result.error}`);
    tuiManager.info('Falling back to browser-based connection...');
  }

  // Browser-based connection flow
  await eventManager.updateEvent({
    eventType: 'CONNECT_AWS_ACCOUNT',
    additionalMessage: 'Opening browser for AWS connection'
  });

  const { connectionId, quickCreateUrl } = await publicApiClient.createAwsConnectionPending({
    organizationId: organization.id,
    connectionName: 'aws-account',
    connectionMode: 'PRIVILEGED'
  });

  // Open browser
  try {
    await openBrowser(quickCreateUrl);
  } catch {
    // Browser may not open in some environments
  }

  tuiManager.info('');
  tuiManager.info(`Browser opened. If it didn't open automatically, visit:`);
  tuiManager.info(tuiManager.colorize('cyan', quickCreateUrl));
  tuiManager.info('');
  tuiManager.info('Complete the CloudFormation stack creation in AWS, then return here.');

  await eventManager.updateEvent({
    eventType: 'CONNECT_AWS_ACCOUNT',
    additionalMessage: 'Waiting for CloudFormation stack creation'
  });

  // Poll for connection completion
  const pollResult = await pollForAwsConnection(connectionId);

  if (pollResult.connected) {
    await eventManager.finishEvent({
      eventType: 'CONNECT_AWS_ACCOUNT',
      finalMessage: `AWS account connected (${pollResult.awsAccountId})`
    });

    // Refresh user data to get the new account and update globalStateManager
    const refreshedData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
    globalStateManager.connectedAwsAccounts = refreshedData.connectedAwsAccounts || [];
    return;
  }

  await eventManager.finishEvent({
    eventType: 'CONNECT_AWS_ACCOUNT',
    status: 'error',
    finalMessage: 'AWS connection timed out or was cancelled'
  });

  throw stpErrors.e66({ organizationName: organization.name });
};
