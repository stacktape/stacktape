import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIssuesReopen = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { issueId } = args;
  await apiClient.reopenIssue({ issueId: issueId! });
  tuiManager.success(`Issue ${tuiManager.makeBold(issueId!)} reopened.`);
};
