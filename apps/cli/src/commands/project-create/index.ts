import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { validateProjectName } from '@utils/validator';
import { isAgentMode } from '../_utils/agent-mode';

export const commandProjectCreate = async () => {
  const args = globalStateManager.args as StacktapeCliArgs;
  let name = args.projectName?.trim();

  if (isAgentMode()) {
    if (!name) {
      throw new ExpectedError('CLI', 'Missing required flag: --projectName', 'Provide --projectName <project-name>');
    }
  } else if (!name) {
    name = (
      await tuiManager.promptText({
        message: 'Project name:',
        description: '(use lowercase letters, numbers, and dashes only)'
      })
    ).trim();
  }

  if (!name) {
    throw new ExpectedError('CLI', 'Project name cannot be empty.');
  }

  validateProjectName(name);

  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const project = await stacktapeTrpcApiManager.apiClient.createProject({
    name,
    region: args.region
  });

  tuiManager.success(`Project ${tuiManager.makeBold(project.name)} created.`);
  tuiManager.info(`Project ID: ${project.id}`);

  return project;
};
