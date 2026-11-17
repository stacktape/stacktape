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

  const connection =
    existingConnection ??
    globalStateManager.connectedAwsAccounts?.find(
      (account) => account.awsAccountId === awsAccountId && account.state === 'ACTIVE'
    );
  const existingStacks = connection ? await findStacksOfAccount({ connectionId: connection.id }) : undefined;

  const consoleUrl = stacktapeConsoleUrl('/projects');
  tuiManager.info('Nothing was redeployed or changed.');
  tuiManager.info(`Open your projects: ${tuiManager.colorize('cyan', consoleUrl)}`);
  tuiManager.outro('Connected.');
  return { organizationName: organization.name, awsAccountId, consoleUrl, ...(existingStacks && { existingStacks }) };
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Asks the Console to look for the account's Stacktape stacks now, so the ones deployed without an account since the
 * last connect appear as projects and stages. A new connection already does this when it activates; asking again finds
 * the same stacks and changes nothing. A failure leaves the connection as it is and only says so.
 */
const findStacksOfAccount = async ({ connectionId }: { connectionId: string }) => {
  try {
    const { projects, skippedRegions } = await stacktapeTrpcApiManager.apiClient.findExistingStacksFromCli({
      connectionId
    });
    const stages = projects.flatMap((project) =>
      project.stages.map(({ stage, region }) => ({ projectName: project.name, stage, region }))
    );
    const newProjects = projects.filter((project) => project.created).map((project) => project.name);
    tuiManager.info(
      stages.length === 0
        ? 'No Stacktape stacks found in this account yet.'
        : `Found ${plural(stages.length, 'stage')} of ${plural(projects.length, 'project')} in this account${
            newProjects.length > 0 ? `; ${plural(newProjects.length, 'project')} added to the Console` : ''
          }.`
    );
    if (skippedRegions.length > 0) {
      tuiManager.warn(`Could not read stacks in ${skippedRegions.join(', ')}; stacks there are not listed yet.`);
    }
    return { stages, newProjects, skippedRegions };
  } catch (error) {
    tuiManager.warn(
      `The account is connected, but looking for its existing stacks failed: ${(error as Error).message} ` +
        'An Owner or Admin can run "Find existing stacks" on the AWS accounts page of the Console.'
    );
    return undefined;
  }
};
