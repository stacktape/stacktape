import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { identifyUserInMixpanel } from '../../../shared/utils/telemetry';

export const commandLogin = async () => {
  tuiManager.intro('Login to Stacktape');

  let apiKey = globalStateManager.args.apiKey;
  if (!apiKey) {
    apiKey = await tuiManager.promptText({
      message: `Your Stacktape API key (available in the ${tuiManager.getLink('apiKeys', 'console')}):`,
      isPassword: true
    });
  }

  const spinner = tuiManager.createSpinner({ text: 'Authenticating' });

  try {
    await globalStateManager.saveApiKey({ apiKey });
    await stacktapeTrpcApiManager.init({ apiKey });
    const userData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
    await identifyUserInMixpanel({
      userId: userData.user.id,
      systemId: globalStateManager.systemId
    });

    spinner.success({ text: 'Authenticated' });
    tuiManager.info(`User: ${userData.user.name}`);
    tuiManager.info(`Organization: ${userData.organization.name}`);
    tuiManager.outro('Login successful!');
  } catch (error) {
    spinner.error('Authentication failed');
    throw error;
  }
};
