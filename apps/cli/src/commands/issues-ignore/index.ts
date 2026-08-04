import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIssuesIgnore = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { issueId } = args;
  await apiClient.ignoreIssue({ issueId: issueId! });
  tuiManager.success(`Issue ${tuiManager.makeBold(issueId!)} ignored.`);
};
