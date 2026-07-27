import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';

export const commandOrgCreate = async () => {
  const args = globalStateManager.args as StacktapeCliArgs;
  let organizationName = args.organizationName?.trim();

  if (isAgentMode()) {
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

  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const result = await stacktapeTrpcApiManager.apiClient.createOrganization({ name: organizationName });

  tuiManager.success(`Organization ${tuiManager.makeBold(result.organization.name)} created.`);
  tuiManager.info(`Organization ID: ${result.organization.id}`);
  tuiManager.info(`Organization API key: ${result.apiKey}`);

  return result;
};
