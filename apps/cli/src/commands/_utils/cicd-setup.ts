import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { openBrowser } from './browser';
import { detectGitInfo, type GitProvider } from '../init/utils/git-detection';

/** Non-null git provider type for internal use */
type NonNullGitProvider = Exclude<GitProvider, null>;
type GitProviderConnection = { installationId: string; providerRepositoryId: string };

/**
 * Checks if git provider is connected to Stacktape
 */
const findGitProviderConnection = async ({
  provider,
  owner,
  repository
}: {
  provider: NonNullGitProvider;
  owner: string;
  repository: string;
}): Promise<GitProviderConnection | undefined> => {
  try {
    const status = await stacktapeTrpcApiManager.apiClient.getGitProviderConnectionStatus({
      organizationId: globalStateManager.organizationData!.id,
      provider: provider.toUpperCase() as 'GITHUB' | 'GITLAB' | 'BITBUCKET',
      owner,
      repository
    });
    return status.isConnected && status.installationId && status.providerRepositoryId
      ? { installationId: status.installationId, providerRepositoryId: status.providerRepositoryId }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Initiates git provider connection flow by directing user to console
 */
const connectGitProvider = async ({
  provider,
  owner,
  repository
}: {
  provider: NonNullGitProvider;
  owner: string;
  repository: string;
}): Promise<GitProviderConnection | undefined> => {
  const consoleUrl = process.env.STACKTAPE_CONSOLE_URL || 'https://console.stacktape.com';
  const connectionUrl = new URL('/git-integrations', consoleUrl);
  connectionUrl.searchParams.set('org', globalStateManager.organizationData!.id);
  connectionUrl.searchParams.set('connect', provider);

  // Open browser
  try {
    await openBrowser(connectionUrl.toString());
  } catch {
    // Browser may not open in some environments
  }

  const providerName = { github: 'GitHub', gitlab: 'GitLab', bitbucket: 'Bitbucket' }[provider];

  tuiManager.info('');
  tuiManager.info(`Browser opened. If it didn't open, visit:`);
  tuiManager.info(tuiManager.colorize('cyan', connectionUrl.toString()));
  tuiManager.info('');
  tuiManager.info(`Please connect your ${providerName} account in the browser, then return here.`);

  // Wait for user to complete connection
  const confirmed = await tuiManager.promptConfirm({
    message: `Have you completed the ${providerName} connection?`,
    defaultValue: true
  });

  if (!confirmed) {
    return undefined;
  }

  // Verify connection
  return findGitProviderConnection({ provider, owner, repository });
};

/**
 * Prompts user to set up CI/CD after a successful deploy.
 * Only runs if:
 * - TTY is available
 * - Git info is detected
 * - CI/CD is not already configured for this project/stage
 */
export const promptCiCdSetupAfterDeploy = async (): Promise<void> => {
  // Skip if not TTY
  if (!process.stdout.isTTY) {
    return;
  }

  // Detect git info
  const gitInfo = detectGitInfo(globalStateManager.workingDir);

  // Skip if no git provider detected
  if (!gitInfo.provider || !gitInfo.branch || !gitInfo.owner || !gitInfo.repository) {
    return;
  }

  const providerName = { github: 'GitHub', gitlab: 'GitLab', bitbucket: 'Bitbucket' }[gitInfo.provider];

  // Ask user if they want to set up CI/CD
  tuiManager.info('');
  const setupCiCd = await tuiManager.promptConfirm({
    message: `Set up automatic deployments on push to '${gitInfo.branch}'?`,
    defaultValue: true
  });

  if (!setupCiCd) {
    tuiManager.hint('You can set up CI/CD later in the Stacktape console.');
    return;
  }

  await operationReporter.startEvent({
    eventType: 'SETUP_CICD',
    description: 'Setting up CI/CD'
  });

  try {
    // Check if git provider is connected
    let gitProviderConnection = await findGitProviderConnection({
      provider: gitInfo.provider,
      owner: gitInfo.owner,
      repository: gitInfo.repository
    });

    if (!gitProviderConnection) {
      await operationReporter.updateEvent({
        eventType: 'SETUP_CICD',
        additionalMessage: `${providerName} not connected`
      });

      tuiManager.info(`To enable CI/CD, you need to connect your ${providerName} account.`);

      const connectNow = await tuiManager.promptConfirm({
        message: `Open browser to connect ${providerName}?`,
        defaultValue: true
      });

      if (connectNow) {
        gitProviderConnection = await connectGitProvider({
          provider: gitInfo.provider,
          owner: gitInfo.owner,
          repository: gitInfo.repository
        });
        if (!gitProviderConnection) {
          await operationReporter.finishEvent({
            eventType: 'SETUP_CICD',
            status: 'warning',
            finalMessage: `${providerName} connection not completed`
          });
          tuiManager.hint('You can set up CI/CD later in the Stacktape console.');
          return;
        }
      } else {
        await operationReporter.finishEvent({
          eventType: 'SETUP_CICD',
          status: 'warning',
          finalMessage: 'Skipped - provider not connected'
        });
        tuiManager.hint('You can set up CI/CD later in the Stacktape console.');
        return;
      }
    }

    await operationReporter.updateEvent({
      eventType: 'SETUP_CICD',
      additionalMessage: 'Creating deployment configuration'
    });

    // Find AWS account connection ID
    const awsAccount = globalStateManager.connectedAwsAccounts?.find(
      (acc) => acc.awsAccountId === globalStateManager.targetAwsAccount.awsAccountId
    );

    if (!awsAccount) {
      await operationReporter.finishEvent({
        eventType: 'SETUP_CICD',
        status: 'error',
        finalMessage: 'AWS account not found'
      });
      return;
    }

    // Create the git deployment configuration
    await stacktapeTrpcApiManager.apiClient.createGitDeploymentConfigFromCli({
      organizationId: globalStateManager.organizationData!.id,
      projectId: globalStateManager.targetStack.projectId,
      gitProviderInstallationId: gitProviderConnection.installationId,
      gitProviderRepositoryId: gitProviderConnection.providerRepositoryId,
      awsAccountConnectionId: awsAccount.id,
      branch: gitInfo.branch,
      targetRegion: globalStateManager.region,
      stage: globalStateManager.targetStack.stage,
      configSource: 'GIT_REPOSITORY',
      deployOnGitEvent: 'PUSHED_TO_BRANCH',
      configPath: null,
      templateId: null
    });

    await operationReporter.finishEvent({
      eventType: 'SETUP_CICD',
      finalMessage: `CI/CD configured - pushes to '${gitInfo.branch}' will auto-deploy`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await operationReporter.finishEvent({
      eventType: 'SETUP_CICD',
      status: 'error',
      finalMessage: `CI/CD setup failed: ${message}`
    });
    tuiManager.hint('You can set up CI/CD later in the Stacktape console.');
  }
};
