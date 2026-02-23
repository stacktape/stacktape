// GENERATED FILE - DO NOT EDIT
// Source: console-app/scripts/generate-stacktape-console-types.ts

export type RecordStackOperationParams = {
  invocationId: string;
  command?: string | null;
  stackName?: string | null;
  serviceName?: string | null;
  awsAccessKeyId?: string | null;
  awsAccountId?: string | null;
  region?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  gitUrl?: string | null;
  gitCommit?: string | null;
  gitBranch?: string | null;
  success?: boolean | null;
  description?: string | null;
  isCodebuildOperation?: boolean | null;
  codebuildBuildArn?: string | null;
  commandArgs?: any;
  logStreamName?: string | null;
  inProgress?: boolean | null;
  interrupted?: boolean | null;
  pullRequestNumber?: string | null;
  stacktapeVersion?: string | null;
  accountConnectionId?: string | null;
};

export type GlobalConfigResponse = {
  alarms: {
    name: string;
    forServices: any;
    forStages: any;
    evaluation: any;
    trigger: any;
    integration: {
      name: string;
      definition: any;
    };
  }[];
  guardrails: GuardrailDefinition[];
  deploymentNotifications: DeploymentNotificationDefinition[];
};

export type CurrentUserAndOrgDataResponse = {
  user: {
    id: string;
    [key: string]: any;
  };
  organization: {
    id: string;
    name: string;
    [key: string]: any;
  };
  connectedAwsAccounts: Array<{
    id: string;
    organizationId: string;
    deleted?: boolean;
    [key: string]: any;
  }>;
  projects: Array<{
    id: string;
    organizationId: string;
    name: string;
    [key: string]: any;
  }>;
};

export type AwsAccountCredentialsParams = {
  awsAccountName: string;
};

export type AwsAccountCredentialsResponse = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    expiration: string;
    [key: string]: any;
  };
};

export type TemplateParams = {
  templateId: string;
};

export type TemplateResponse = {
  id: string;
  organizationId: string;
  [key: string]: any;
};

export type CanDeployResponse = {
  canDeploy: boolean;
  message?: string;
};

export type DefaultDomainsInfoParams = {
  stackName: string;
  region: string;
  awsAccountId: string;
};

export type DefaultDomainsInfoResponse = {
  suffix: string;
  certDomainSuffix: string;
  version: number;
};

export type CreateProjectParams = {
  name: string;
  gitUrl?: string | null;
  templateId?: string | null;
  configPath?: string | null;
  region?: string | null;
};

export type CreateOrganizationParams = {
  name: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  role: string;
  isPersonal: boolean;
  createdAt: string | Date;
  connectedAccountsCount: number;
  isCurrent: boolean;
};

export type CreateOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    [key: string]: any;
  };
  apiKey: string;
};

export type ListOrganizationsResponse = OrganizationSummary[];

export type DeleteOrganizationParams = {
  id: string;
};

export type DeleteOrganizationResponse = {
  id?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: any;
};

export type CreateProjectResponse = {
  id: string;
  name: string;
  gitUrl?: string | null;
  organizationId: string;
  templateId?: string | null;
  configPath?: string | null;
  [key: string]: any;
};

export type DeleteUndeployedStageParams = {
  projectName: string;
  stageName: string;
};

export type DeleteUndeployedStageResponse = {
  id?: string;
  name?: string;
  projectId?: string;
  success?: boolean;
  message?: string;
  [key: string]: any;
};

export type ProjectsWithStagesResponse = Array<{
  id: string;
  name: string;
  stages: Array<{
    stage: string;
    status: string;
    deploymentIsInProgress: boolean;
    isErrored: boolean;
    lastUpdateTime: number;
    thisMonthCosts: {
      currencyCode: string;
      total: number;
    };
    previousMonthCosts: {
      currencyCode: string;
      total: number;
    };
  }>;
  undeployedStages: Array<{
    id?: string;
    name?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}>;

export type RecentStackOperationsParams = {
  projectName?: string;
  stage?: string;
  limit?: number;
};

export type RecentStackOperationsResponse = Array<{
  id: string;
  command?: string | null;
  projectName?: string | null;
  stackName?: string | null;
  stage?: string | null;
  region?: string | null;
  createdAt?: Date | string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  success?: boolean | null;
  inProgress?: boolean | null;
  description?: string | null;
}>;

export type StackDetailsParams = {
  stackName: string;
  region: string;
  awsAccountName?: string;
};

export type StackDetailsResponse = {
  stackOutput?: {
    [key: string]: string;
  };
  stackInfoMap?: any;
  resources?: any[];
  description?: string | null;
};

export type ApiKeyTrpcClient = {
  recordStackOperation: {
    mutate: (args: RecordStackOperationParams) => Promise<void>;
  };
  globalConfig: {
    query: (args?: void) => Promise<GlobalConfigResponse>;
  };
  currentUserAndOrgData: {
    query: () => Promise<CurrentUserAndOrgDataResponse>;
  };
  awsAccountCredentials: {
    query: (args: AwsAccountCredentialsParams) => Promise<AwsAccountCredentialsResponse>;
  };
  template: {
    query: (args: TemplateParams) => Promise<TemplateResponse>;
  };
  canDeploy: {
    query: () => Promise<CanDeployResponse>;
  };
  defaultDomainsInfo: {
    query: (args: DefaultDomainsInfoParams) => Promise<DefaultDomainsInfoResponse>;
  };
  createProjectFromCli: {
    mutate: (args: CreateProjectParams) => Promise<CreateProjectResponse>;
  };
  createOrganizationFromCli: {
    mutate: (args: CreateOrganizationParams) => Promise<CreateOrganizationResponse>;
  };
  listOrganizationsFromCli: {
    query: () => Promise<ListOrganizationsResponse>;
  };
  deleteOrganizationFromCli: {
    mutate: (args: DeleteOrganizationParams) => Promise<DeleteOrganizationResponse>;
  };
  deleteUndeployedStageFromCli: {
    mutate: (args: DeleteUndeployedStageParams) => Promise<DeleteUndeployedStageResponse>;
  };
  projectsWithStages: {
    query: () => Promise<ProjectsWithStagesResponse>;
  };
  recentStackOperations: {
    query: (args: RecentStackOperationsParams) => Promise<RecentStackOperationsResponse>;
  };
  stackDetails: {
    query: (args: StackDetailsParams) => Promise<StackDetailsResponse>;
  };
};
