import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
  MEMBER: 'Developer'
};

export const commandOrgList = async () => {
  const { apiClient } = await initializeControlPlaneOperation();
  const organizations = await apiClient.listOrganizations();

  if (!organizations.length) {
    tuiManager.warn('No organizations found for this user.');
    return organizations;
  }

  tuiManager.printTable({
    header: ['Organization', 'Role', 'Connected AWS', 'Current', 'ID'],
    rows: organizations.map((organization) => [
      organization.name,
      ROLE_LABELS[organization.role] || organization.role,
      `${organization.connectedAccountsCount}`,
      organization.isCurrent ? tuiManager.colorize('green', 'yes') : 'no',
      organization.id
    ])
  });

  return organizations;
};
