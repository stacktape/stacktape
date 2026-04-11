import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandIssuesReopen = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const { issueId } = globalStateManager.args;
  await stacktapeTrpcApiManager.apiClient.reopenIssue({ issueId: issueId! });
  tuiManager.success(`Issue ${tuiManager.makeBold(issueId!)} reopened.`);
};
