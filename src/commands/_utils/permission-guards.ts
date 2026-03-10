import { getError } from '@shared/utils/misc';

type GuardContext = {
  role?: string;
  permissions?: string[];
  projects?: Array<{ name: string }>;
};

export const isProductionStage = (stage?: string) => {
  const normalizedStage = (stage || '').trim().toLowerCase();
  return normalizedStage === 'prod' || normalizedStage === 'production';
};

export const getRequiredDeletePermission = ({ stage }: { stage?: string }) => {
  return isProductionStage(stage) ? 'deployments:delete-production' : 'deployments:delete-non-production';
};

export const assertPermission = ({
  permission,
  reason,
  permissions,
  role
}: {
  permission: string;
  reason: string;
  permissions?: string[];
  role?: string;
}) => {
  if (permissions?.includes(permission)) return;
  throw getError({
    type: 'CLI',
    message: `Permission denied: ${reason}`,
    hint: `Required permission: ${permission}. Current role: ${role || 'UNKNOWN'}. Run 'stacktape info:whoami' to inspect effective access.`
  });
};

export const assertScopedProjectAccess = ({
  role,
  projectName,
  projects
}: {
  role?: string;
  projectName?: string;
  projects?: Array<{ name: string }>;
}) => {
  if (!role || role === 'OWNER' || role === 'ADMIN') return;
  if (!projectName) return;
  const hasAccess = (projects || []).some(({ name }) => name === projectName);
  if (hasAccess) return;
  throw getError({
    type: 'CLI',
    message: `Permission denied: You do not have access to project "${projectName}".`,
    hint: `Run 'stacktape info:whoami' to view accessible projects for role ${role}.`
  });
};

export const assertCommandPermissions = ({
  command,
  stage,
  projectName,
  role,
  permissions,
  projects
}: {
  command: string;
  stage?: string;
  projectName?: string;
} & GuardContext) => {
  if (command === 'deploy' || command === 'codebuild:deploy') {
    assertPermission({
      permission: 'deployments:deploy',
      reason: 'deploy operation is not allowed for your role.',
      role,
      permissions
    });
    assertScopedProjectAccess({ role, projectName, projects });
    return;
  }

  if (command !== 'delete') return;
  const requiredPermission = getRequiredDeletePermission({ stage });
  assertPermission({
    permission: requiredPermission,
    reason: `delete operation for stage "${stage}" is not allowed for your role.`,
    role,
    permissions
  });
  assertScopedProjectAccess({ role, projectName, projects });
};
