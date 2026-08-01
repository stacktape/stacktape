import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandInfoOperations = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { currentUserOnly, projectName, stage, limit } = args;

  const activity = await apiClient.organizationActivity({
    currentUserOnly,
    projectName,
    stage,
    pageSize: limit ?? 25
  });

  tuiManager.printOperations({ operations: activity.items });

  return activity;
};
