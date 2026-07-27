import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
  MEMBER: 'Developer'
};

export const commandInfoWhoami = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const data = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();

  const extData = data as typeof data & { isProjectScoped?: boolean; permissions?: string[] };
  const role = data.organization.role;
  const roleLabel = ROLE_LABELS[role] || role;

  // In JSONL mode the result event carries all the data; skip the human-readable log to avoid duplicate output
  if (tuiManager.mode !== 'jsonl') {
    tuiManager.printWhoami({
      user: data.user,
      organization: data.organization,
      connectedAwsAccounts: data.connectedAwsAccounts,
      projects: data.projects,
      role: roleLabel,
      isProjectScoped: extData.isProjectScoped,
      permissions: extData.permissions
    });
  }

  return {
    user: { id: data.user.id, name: data.user.name, email: data.user.email },
    organization: { id: data.organization.id, name: data.organization.name },
    role: roleLabel,
    isProjectScoped: extData.isProjectScoped,
    connectedAwsAccounts: data.connectedAwsAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      awsAccountId: acc.awsAccountId,
      state: acc.state
    })),
    projects: data.projects.map((p) => ({ id: p.id, name: p.name })),
    permissions: extData.permissions
  };
};
