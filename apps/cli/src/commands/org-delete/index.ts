import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { captureCommandArgs, initializeControlPlaneOperation } from '../_utils/initialization';

export const commandOrgDelete = async () => {
  const args = captureCommandArgs();
  const agentMode = isAgentMode(args);

  const { apiClient } = await initializeControlPlaneOperation({ args });
  const organizations = await apiClient.listOrganizations();

  if (!organizations.length) {
    throw new ExpectedError('CLI', 'No organizations found for this user.');
  }

  const organizationIdFromArgs = args.organizationId?.trim();
  let organizationId = organizationIdFromArgs;

  if (agentMode) {
    if (!organizationId) {
      throw new ExpectedError(
        'CLI',
        'Missing required flag: --organizationId',
        'Provide --organizationId <organization-id>'
      );
    }
  } else if (!organizationId) {
    organizationId = await tuiManager.promptSelect({
      message: 'Choose organization to delete:',
      options: organizations.map((organization) => ({
        value: organization.id,
        label: `${organization.name}${organization.isCurrent ? ' (current)' : ''}`
      }))
    });
  }

  const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
  if (!selectedOrganization) {
    throw new ExpectedError(
      'CLI',
      `Organization with ID ${organizationId} is not available to this user.`,
      `Available IDs: ${organizations.map((organization) => organization.id).join(', ')}`
    );
  }

  if (!agentMode) {
    const confirmed = await tuiManager.promptConfirm({
      message: `Remove your access to organization ${tuiManager.makeBold(selectedOrganization.name)}?`,
      defaultValue: false
    });
    if (!confirmed) {
      tuiManager.info('Operation cancelled.');
      return null;
    }
  }

  const result = await apiClient.deleteOrganization({ id: selectedOrganization.id });
  tuiManager.success(`Access to organization ${tuiManager.makeBold(selectedOrganization.name)} removed.`);
  return result;
};
