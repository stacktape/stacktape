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

const printWhoami = ({
  user,
  organization,
  connectedAwsAccounts,
  projects,
  role,
  isProjectScoped,
  permissions
}: {
  user: { id: string; name?: string; email?: string; [key: string]: any };
  organization: { id: string; name: string; [key: string]: any };
  connectedAwsAccounts: Array<{
    id: string;
    name?: string;
    awsAccountId?: string;
    state?: string;
    [key: string]: any;
  }>;
  projects: Array<{ id: string; name: string; [key: string]: any }>;
  role?: string;
  isProjectScoped?: boolean;
  permissions?: string[];
}) => {
  const lines: string[] = [];

  lines.push(tuiManager.makeBold('User'));
  lines.push(`  Name: ${tuiManager.colorize('cyan', user.name || 'N/A')}`);
  lines.push(`  Email: ${tuiManager.colorize('cyan', user.email || 'N/A')}`);
  lines.push(`  ID: ${tuiManager.colorize('gray', user.id)}`);
  if (role) {
    lines.push(`  Role: ${tuiManager.colorize('yellow', role)}`);
  }
  if (isProjectScoped) {
    lines.push(`  Scope: ${tuiManager.colorize('yellow', 'project-scoped (limited to assigned projects)')}`);
  }
  lines.push('');

  lines.push(tuiManager.makeBold('Organization'));
  lines.push(`  Name: ${tuiManager.colorize('cyan', organization.name)}`);
  lines.push(`  ID: ${tuiManager.colorize('gray', organization.id)}`);
  lines.push('');

  lines.push(tuiManager.makeBold('Connected AWS Accounts'));
  if (connectedAwsAccounts.length === 0) {
    lines.push(`  ${tuiManager.colorize('gray', 'No connected accounts')}`);
  } else {
    for (const acc of connectedAwsAccounts) {
      const stateColor = acc.state === 'ACTIVE' ? 'green' : 'yellow';
      lines.push(
        `  - ${tuiManager.colorize('cyan', acc.name || 'unnamed')} (${acc.awsAccountId || 'N/A'}) - ${tuiManager.colorize(stateColor, acc.state || 'UNKNOWN')}`
      );
    }
  }
  lines.push('');

  lines.push(tuiManager.makeBold('Accessible Projects'));
  if (projects.length === 0) {
    lines.push(`  ${tuiManager.colorize('gray', 'No projects')}`);
  } else {
    for (const project of projects) {
      lines.push(`  - ${tuiManager.colorize('cyan', project.name)}`);
    }
  }

  if (permissions && permissions.length > 0) {
    lines.push('');
    lines.push(tuiManager.makeBold('Permissions'));
    for (const perm of permissions) {
      lines.push(`  - ${tuiManager.colorize('gray', perm)}`);
    }
  }

  tuiManager.printLines(lines);
};

export const commandInfoWhoami = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const data = await stacktapeTrpcApiManager.apiClient.currentUserAndOrgData();

  const extData = data as typeof data & { isProjectScoped?: boolean; permissions?: string[] };
  const role = data.organization.role;
  const roleLabel = ROLE_LABELS[role] || role;

  // In JSONL mode the result event carries all the data; skip the human-readable log to avoid duplicate output
  if (tuiManager.mode !== 'jsonl') {
    printWhoami({
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
