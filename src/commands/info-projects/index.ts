import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandInfoProjects = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const projects = await stacktapeTrpcApiManager.apiClient.projectsWithStages();

  tuiManager.printProjects({ projects });

  return projects;
};
