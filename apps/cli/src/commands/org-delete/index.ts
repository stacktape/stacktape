import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { captureCommandArgs, initializeControlPlaneOperation } from '../_utils/initialization';

export const commandOrgDelete = async () => {
  const args = captureCommandArgs();
  const agentMode = isAgentMode(args);

  const { apiClient } = await initializeControlPlaneOperation({ args });
  const organizations = await apiClient.listOrganizations();
  // An API key acts in one organization, and the Console deletes only that one.
  const currentOrganization = organizations.find((organization) => organization.isCurrent);
  if (!currentOrganization) {
    throw new ExpectedError('CLI', 'The organization of your API key was not found.');
  }

  const organizationIdFromArgs = args.organizationId?.trim();
  if (agentMode && !organizationIdFromArgs) {
    throw new ExpectedError(
      'CLI',
      'Missing required flag: --organization-id',
      `Provide --organization-id ${currentOrganization.id} to delete ${currentOrganization.name}.`
    );
  }
  if (organizationIdFromArgs && organizationIdFromArgs !== currentOrganization.id) {
    throw new ExpectedError(
      'CLI',
      `Only the organization of your API key, ${currentOrganization.name} (${currentOrganization.id}), can be deleted.`,
      `To delete organization ${organizationIdFromArgs}, log in with an API key of that organization, then run this command again.`
    );
  }

  if (!agentMode) {
    const confirmed = await tuiManager.promptConfirm({
      message: `Delete organization ${tuiManager.makeBold(currentOrganization.name)}? Its API keys stop working.`,
      defaultValue: false
    });
    if (!confirmed) {
      tuiManager.info('Operation cancelled.');
      return null;
    }
  }

  const result = await apiClient.deleteOrganization({ id: currentOrganization.id });
  tuiManager.success(`Organization ${tuiManager.makeBold(currentOrganization.name)} deleted.`);
  tuiManager.hint('Log in with an API key of another organization to keep using Stacktape.');
  return result;
};
