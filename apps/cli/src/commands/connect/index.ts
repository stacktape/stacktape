import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter } from '@application-services/operation-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { stacktapeConsoleUrl } from 'src/config/params';
import { runAuthFlow } from '../_utils/auth';
import { connectAwsAccount } from '../_utils/aws-connection-preflight';
import { connectionNameFor, earlierAttemptsFor } from './connection-name';

/**
 * Moves a CLI that works without an account to the Console: signs in when needed, then connects the AWS account of the
 * local credentials to the organization. The Console finds the account's existing stacks; nothing is deployed again.
 */
export const commandConnect = async () => {
  tuiManager.intro('Connect to the Stacktape Console');

  const args = globalStateManager.args;
  // Agent mode (`--agent`, as the init wizard runs it) never prompts or opens a browser.
  const agentMode = Boolean(args.agent) || args.agentPort !== undefined || tuiManager.mode === 'jsonl';
  let apiKey = globalStateManager.apiKey;
  if (!apiKey && agentMode) {
    throw new CliError({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_MISSING',
      message: 'Not signed in to Stacktape, so there is no organization to connect the AWS account to.',
      hints: 'Sign in with `stacktape login` first, or set STACKTAPE_API_KEY.'
    });
  }
  if (!apiKey) {
    const authResult = await runAuthFlow({
      command: 'connect',
      openInBrowser: globalStateManager.args.noBrowser !== true
    });
    if (!authResult.success || !authResult.apiKey) {
      throw new CliError({ category: 'LOGIN', code: 'LOGIN_FAILED', message: authResult.error || 'Sign-in failed.' });
    }
    apiKey = authResult.apiKey;
    globalStateManager.apiKey = apiKey;
    await globalStateManager.saveApiKey({ apiKey });
  }
  await stacktapeTrpcApiManager.init({ apiKey });
  const organizationData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
  globalStateManager.setCurrentUserAndOrgData(organizationData);
  const { organization } = organizationData;

  // The account of the local credentials: `--profile`, `AWS_PROFILE` or the standard AWS credential chain.
  const localCredentials = await globalStateManager.prepareLocalAwsCredentials();
  await globalStateManager.resolveLocalAwsAccount();
  const { awsAccountId } = globalStateManager.targetAwsAccount;

  // An earlier attempt may have activated after the CLI stopped waiting for it.
  const earlierAttempts = earlierAttemptsFor({ awsAccountId, connections: organizationData.connectedAwsAccounts });
  const activatedLater = (
    await Promise.all(
      earlierAttempts.map((attempt) =>
        stacktapeTrpcApiManager.apiClient
          .getAwsConnectionStatus({ connectionId: attempt.id })
          .then((status) => (status.state === 'ACTIVE' && status.awsAccountId === awsAccountId ? attempt : undefined))
          .catch(() => undefined)
      )
    )
  ).find(Boolean);
  const existingConnection =
    organizationData.connectedAwsAccounts.find(
      (account) => account.awsAccountId === awsAccountId && account.state === 'ACTIVE'
    ) ?? activatedLater;
  if (existingConnection) {
    tuiManager.info(
      `AWS account ${awsAccountId} is already connected to ${organization.name} as ${existingConnection.name}.`
    );
  } else {
    if (organizationData.isAwsAccountScoped) {
      throw new CliError({
        category: 'API_KEY',
        code: 'AWS_ACCOUNT_CONNECTION_NOT_ALLOWED',
        message: `Your role in ${organization.name} cannot connect AWS accounts.`,
        hints: 'Ask an Owner or Admin of the organization to run `stacktape connect` with credentials for this account.'
      });
    }
    await operationReporter.startEvent({ eventType: 'CONNECT_AWS_ACCOUNT', description: 'Connecting AWS account' });
    await connectAwsAccount({
      organizationId: organization.id,
      organizationName: organization.name,
      localCredentials,
      browserFallback: !agentMode,
      connectionName: connectionNameFor({
        awsAccountId,
        takenNames: organizationData.connectedAwsAccounts.map(({ name }) => name)
      })
    });
  }

  const consoleUrl = stacktapeConsoleUrl('/projects');
  tuiManager.info(
    'The Console adds the Stacktape stacks of this account as projects and stages. Nothing was redeployed or changed.'
  );
  tuiManager.info(`Open your projects: ${tuiManager.colorize('cyan', consoleUrl)}`);
  tuiManager.outro('Connected.');
  return { organizationName: organization.name, awsAccountId, consoleUrl };
};
