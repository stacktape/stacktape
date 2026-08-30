export const CONSOLE_ROLES = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER', 'MEMBER'] as const;
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

export const PERMISSIONS = [
  'org:delete',
  'org:manage-billing',
  'org:view-billing',
  'org:manage-aws-accounts',
  'org:manage-guardrails',
  'org:manage-integrations',
  'org:manage-alert-channels',
  'org:manage-alarms',
  'org:manage-notifications',
  'org:manage-budgets',
  'org:manage-codebuild-settings',
  'members:invite',
  'members:remove',
  'members:update-role',
  'members:assign-projects',
  'members:view',
  'projects:create',
  'projects:delete',
  'projects:update-settings',
  'projects:view',
  'resources:manage',
  'deployments:deploy',
  'deployments:delete-production',
  'deployments:delete-non-production',
  'deployments:rollback',
  'deployments:run-scripts',
  'gitops:manage-configs',
  'gitops:manage-providers',
  'secrets:manage',
  'secrets:view',
  'ssm-params:manage',
  'ssm-params:view',
  'domains:manage',
  'templates:manage',
  'issues:view',
  'issues:manage',
  'incidents:view',
  'incidents:manage',
  'observability:view',
  'debug:interactive-sessions',
  'api-keys:manage-own',
  'api-keys:view-all',
  'api-keys:revoke-all'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Exclude<ConsoleRole, 'MEMBER'>, ReadonlySet<Permission>> = {
  OWNER: new Set(PERMISSIONS),
  ADMIN: new Set(PERMISSIONS.filter((permission) => permission !== 'org:delete')),
  DEVELOPER: new Set([
    'projects:update-settings',
    'projects:view',
    'resources:manage',
    'deployments:deploy',
    'deployments:delete-non-production',
    'deployments:rollback',
    'deployments:run-scripts',
    'gitops:manage-configs',
    'secrets:manage',
    'secrets:view',
    'ssm-params:manage',
    'ssm-params:view',
    'domains:manage',
    'templates:manage',
    'issues:view',
    'issues:manage',
    'incidents:view',
    'incidents:manage',
    'observability:view',
    'debug:interactive-sessions',
    'api-keys:manage-own'
  ]),
  VIEWER: new Set(['projects:view', 'issues:view', 'incidents:view', 'observability:view', 'members:view'])
};

export const getPermissionsForRole = (role: ConsoleRole): ReadonlySet<Permission> =>
  role === 'MEMBER' ? ROLE_PERMISSIONS.DEVELOPER : ROLE_PERMISSIONS[role];

export const roleHasPermission = (role: ConsoleRole, permission: Permission): boolean =>
  getPermissionsForRole(role).has(permission);

export const UNSCOPED_ROLES = ['OWNER', 'ADMIN'] as const satisfies readonly ConsoleRole[];
const unscopedRoleSet: ReadonlySet<ConsoleRole> = new Set(UNSCOPED_ROLES);

export const isAlwaysUnscopedRole = (role: ConsoleRole): boolean => unscopedRoleSet.has(role);
export const isProjectScopableRole = (role: ConsoleRole): boolean => !isAlwaysUnscopedRole(role) && role !== 'MEMBER';

export const ROLE_HIERARCHY = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'] as const satisfies readonly ConsoleRole[];

export const getRoleLevel = (role: ConsoleRole): number =>
  ROLE_HIERARCHY.indexOf(role === 'MEMBER' ? 'DEVELOPER' : role);

export const ASSIGNABLE_ROLES = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'] as const satisfies readonly ConsoleRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  OWNER: 'Full control. Can delete org, manage billing, transfer ownership.',
  ADMIN: 'Everything except org deletion. Can manage members, AWS accounts, settings.',
  DEVELOPER: 'Can deploy, delete non-production stages, manage secrets and configs.',
  VIEWER: 'Read-only. Can view projects, deployments, logs, and costs.'
};
