import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIssuesResolve = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { issueId } = args;
  await apiClient.resolveIssue({ issueId: issueId! });
  tuiManager.success(`Issue ${tuiManager.makeBold(issueId!)} resolved.`);
};
