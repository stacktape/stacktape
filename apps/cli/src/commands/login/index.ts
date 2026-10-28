import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { aliasPostHogUser, identifyPostHogUser } from '@utils/telemetry';
import { runAuthFlow } from '../_utils/auth';

export const commandLogin = async () => {
  tuiManager.intro('Login to Stacktape');

  let apiKey = globalStateManager.args.apiKey;

  if (!apiKey) {
    // Sign in with the browser (device code), or paste an API key.
    const authResult = await runAuthFlow({
      command: 'login',
      openInBrowser: globalStateManager.args.noBrowser !== true
    });
    if (!authResult.success || !authResult.apiKey) {
      throw new CliError({ category: 'LOGIN', code: 'LOGIN_FAILED', message: authResult.error || 'Login failed.' });
    }
    apiKey = authResult.apiKey;
  }

  const spinner = tuiManager.createSpinner({ text: 'Verifying credentials' });

  try {
    await globalStateManager.saveApiKey({ apiKey });
    await stacktapeTrpcApiManager.init({ apiKey });
    const userData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();

    // Link anonymous systemId to the real user in PostHog
    aliasPostHogUser(userData.user.id, globalStateManager.systemId);
    identifyPostHogUser(userData.user.id, {
      email: userData.user.email,
      name: userData.user.name
    });

    const organizationName = userData.organization.name.endsWith('-personal-org')
      ? 'Personal'
      : userData.organization.name;

    spinner.success({ text: 'Authenticated' });
    tuiManager.info(`User: ${userData.user.name}`);
    tuiManager.info(`Organization: ${organizationName}`);
    tuiManager.info(
      `To create a new organization, run ${tuiManager.prettyCommand('org create --organization-name "Acme org"')}`
    );
    tuiManager.outro('Login successful!');
  } catch (error) {
    spinner.error('Authentication failed');
    // Clear the invalid API key
    await globalStateManager.saveApiKey({ apiKey: null });
    throw error;
  }
};
