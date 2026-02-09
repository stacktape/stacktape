import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { identifyUserInMixpanel } from '../../../shared/utils/telemetry';
import { runAuthFlow } from '../_utils/auth';

export const commandLogin = async () => {
  tuiManager.intro('Login to Stacktape');

  let apiKey = globalStateManager.args.apiKey;

  if (!apiKey) {
    // Run interactive auth flow (Google, email signup, email login, or manual API key)
    const authResult = await runAuthFlow();
    if (!authResult.success || !authResult.apiKey) {
      tuiManager.outro('Login cancelled.');
      return;
    }
    apiKey = authResult.apiKey;
  }

  const spinner = tuiManager.createSpinner({ text: 'Verifying credentials' });

  try {
    await globalStateManager.saveApiKey({ apiKey });
    await stacktapeTrpcApiManager.init({ apiKey });
    const userData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
    await identifyUserInMixpanel({
      userId: userData.user.id,
      systemId: globalStateManager.systemId
    });

    const organizationName = userData.organization.name.endsWith('-personal-org')
      ? 'Personal'
      : userData.organization.name;

    spinner.success({ text: 'Authenticated' });
    tuiManager.info(`User: ${userData.user.name}`);
    tuiManager.info(`Organization: ${organizationName}`);
    tuiManager.info(
      `To create a new organization, run ${tuiManager.prettyCommand('org:create --organizationName "Acme org"')}`
    );
    tuiManager.outro('Login successful!');
  } catch (error) {
    spinner.error('Authentication failed');
    // Clear the invalid API key
    await globalStateManager.saveApiKey({ apiKey: null });
    throw error;
  }
};
