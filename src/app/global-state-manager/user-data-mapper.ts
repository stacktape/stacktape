type CurrentUserAndOrgData = {
  user: any;
  organization: any;
  connectedAwsAccounts?: any[];
  projects?: any[];
  permissions?: string[];
  isProjectScoped?: boolean;
};

export const normalizeCurrentUserAndOrgData = (data: CurrentUserAndOrgData) => {
  return {
    userData: data.user,
    organizationData: data.organization,
    connectedAwsAccounts: data.connectedAwsAccounts || [],
    projects: data.projects || [],
    permissions: data.permissions || [],
    isProjectScoped: Boolean(data.isProjectScoped)
  };
};
