import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandInfoWhoami = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const data = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();

  tuiManager.printWhoami({
    user: data.user,
    organization: data.organization,
    connectedAwsAccounts: data.connectedAwsAccounts,
    projects: data.projects
  });

  return data;
};
