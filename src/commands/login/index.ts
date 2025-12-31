import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { identifyUserInMixpanel } from '../../../shared/utils/telemetry';

export const commandLogin = async () => {
  let apiKey = globalStateManager.args.apiKey;
  if (!apiKey) {
    const res = await tuiManager.prompt({
      type: 'password',
      name: 'apiKey',
      message: `Your Stacktape API key (available in the ${tuiManager.getLink('apiKeys', 'console')})`
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
  tuiManager.success(`Logged in. API key saved.\nUser: ${userData.user.name}. Org: ${userData.organization.name}.`);
};
