import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { validateProjectName } from '@utils/validator';
import { isAgentMode } from '../_utils/agent-mode';
import { captureCommandArgs, initializeControlPlaneOperation } from '../_utils/initialization';

export const commandProjectCreate = async () => {
  const args = captureCommandArgs();
  const agentMode = isAgentMode(args);
  let name = args.projectName?.trim();

  if (agentMode) {
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

  const { apiClient } = await initializeControlPlaneOperation({ args });
  const project = await apiClient.createProject({
    name,
    region: args.region
  });

  tuiManager.success(`Project ${tuiManager.makeBold(project.name)} created.`);
  tuiManager.info(`Project ID: ${project.id}`);

  return project;
};
