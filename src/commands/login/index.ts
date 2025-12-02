import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { userPrompt } from '@shared/utils/user-prompt';
import { printer } from '@utils/printer';
import { identifyUserInMixpanel } from '../../../shared/utils/telemetry';

export const commandLogin = async () => {
  let apiKey = globalStateManager.args.apiKey;
  if (!apiKey) {
    const res = await userPrompt({
      type: 'password',
      name: 'apiKey',
      message: `Your Stacktape API key (available in the ${printer.getLink('apiKeys', 'console')}`
    });
    apiKey = res.apiKey;
  }

  await globalStateManager.saveApiKey({ apiKey });
  await stacktapeTrpcApiManager.init({ apiKey });
  const userData = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();
  await identifyUserInMixpanel({
    userId: userData.user.id,
    systemId: globalStateManager.systemId
  });
  printer.success(
    `Successfully logged in and saved API Key.
User name: ${userData.user.name}. Organization: ${userData.organization.name}.`
  );
};
