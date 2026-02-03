import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandInfoOperations = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });

  const { projectName, stage, limit } = globalStateManager.args;

  const operations = await stacktapeTrpcApiManager.apiClient.recentStackOperations({
    projectName,
    stage,
    limit: limit ?? 25
  });

  tuiManager.printOperations({ operations });

  return operations;
};
