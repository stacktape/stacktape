import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandInfoOperations = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });

  const { currentUserOnly, projectName, stage, limit } = globalStateManager.args;

  const activity = await stacktapeTrpcApiManager.apiClient.organizationActivity({
    currentUserOnly,
    projectName,
    stage,
    pageSize: limit ?? 25
  });

  tuiManager.printOperations({ operations: activity.items });

  return activity;
};
