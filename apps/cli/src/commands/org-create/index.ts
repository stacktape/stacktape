import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { captureCommandArgs, initializeControlPlaneOperation } from '../_utils/initialization';

export const commandOrgCreate = async () => {
  const args = captureCommandArgs();
  const agentMode = isAgentMode(args);
  let organizationName = args.organizationName?.trim();

  if (agentMode) {
    if (!organizationName) {
      throw new ExpectedError(
        'CLI',
        'Missing required flag: --organizationName',
        'Provide --organizationName <organization-name>'
      );
    }
  } else if (!organizationName) {
    organizationName = (
      await tuiManager.promptText({
        message: 'Organization name:',
        description: '(name of the organization to create)'
      })
    ).trim();
  }

  if (!organizationName) {
    throw new ExpectedError('CLI', 'Organization name cannot be empty.');
  }

  const { apiClient } = await initializeControlPlaneOperation({ args });
  const result = await apiClient.createOrganization({ name: organizationName });

  tuiManager.success(`Organization ${tuiManager.makeBold(result.organization.name)} created.`);
  tuiManager.info(`Organization ID: ${result.organization.id}`);
  tuiManager.info(`Organization API key: ${result.apiKey}`);

  return result;
};
