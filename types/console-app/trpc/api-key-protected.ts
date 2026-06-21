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
    notificationTargets: Array<{
      name: string;
      type: string;
      properties: any;
    }>;
  }[];
  guardrails: GuardrailDefinition[];
  deploymentNotifications: DeploymentNotificationDefinition[];
};

export type ReportEventParams = {
  type: string;
  severity?: string;
  project?: string;
  stage?: string;
  region?: string;
  title: string;
  details?: Record<string, unknown>;
  invocationId?: string;
};

export type ListIssuesParams = {
  status?: 'OPEN' | 'RESOLVED' | 'IGNORED';
  project?: string;
  stage?: string;
  limit?: number;
};

export type ListIssuesResponse = Array<{
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  fingerprint: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  errorMessage: string;
  errorType: string;
  firstStackFrame: unknown;
  lastOccurrence: string | Date;
  occurrenceCount: number;
  project: string;
  stage: string;
  region: string | null;
  functionName: string | null;
  organizationId: string;
  resolvedAt: string | Date | null;
  resolvedBy: string | null;
  ignoredAt: string | Date | null;
  ignoredBy: string | null;
}>;

export type IssueActionParams = {
  issueId: string;
};

export type IssueActionResponse = {
  success: boolean;
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

export type Ec2DeployFromCliParams = {
  invocationId?: string;
  projectName: string;
  accountConnectionId: string;
  awsAccountId: string;
  region: string;
  stage: string;
  gitUrl: string;
  gitBranch: string;
  gitCommit: string;
  gitCommitMessage?: string | null;
  gitUsername?: string | null;
  configPath?: string | null;
  templateId?: string | null;
  hotSwap?: boolean;
};

export type Ec2DeployFromCliResponse = {
  invocationId: string;
  ssmCommandId?: string;
};

export type Ec2DeployStatusFromCliParams = {
  invocationId: string;
};

export type Ec2DeployStatusFromCliResponse = {
  id: string;
  projectName?: string | null;
  inProgress?: boolean | null;
  success?: boolean | null;
  description?: string | null;
  ec2InstanceId?: string | null;
  ssmCommandId?: string | null;
  logGroupName?: string | null;
  logStreamName?: string | null;
};

export type ConfigureEc2RunnerFromCliParams = {
  projectName: string;
  ec2RunnerInstanceType: string;
};

export type ConfigureEc2RunnerFromCliResponse = {
  id: string;
  name: string;
  deploymentRunnerType?: string | null;
  ec2RunnerInstanceType?: string | null;
  [key: string]: any;
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

export type InitAwsConnectionForCliInput = {
  organizationId: string;
  connectionName: string;
  connectionMode: 'BASIC' | 'PRIVILEGED';
};

export type InitAwsConnectionForCliResponse = {
  connectionId: string;
  stackName: string;
  templateUrl: string;
  parameters: {
    StacktapeConnectionId: string;
    StacktapeConnectionMode: string;
    StacktapeReportNotificationLambda: string;
    StacktapeHandleConnectionLambda: string;
  };
};

export type CreateAwsConnectionPendingInput = {
  organizationId: string;
  connectionName: string;
  connectionMode: 'BASIC' | 'PRIVILEGED';
};

export type CreateAwsConnectionPendingResponse = {
  connectionId: string;
  quickCreateUrl: string;
};

export type GetAwsConnectionStatusInput = {
  connectionId: string;
};

export type GetAwsConnectionStatusResponse = {
  state: 'PENDING' | 'ACTIVE' | 'FAILED';
  awsAccountId?: string;
  name?: string;
};

export type GetGitProviderConnectionStatusInput = {
  organizationId: string;
  provider: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
};

export type GetGitProviderConnectionStatusResponse = {
  isConnected: boolean;
  installationId?: string;
};

export type CreateGitDeploymentConfigFromCliInput = {
  organizationId: string;
  projectId: string;
  awsAccountConnectionId: string;
  branch: string;
  owner: string;
  repository: string;
  targetRegion: string;
  stage: string;
  configSource: 'GIT_REPOSITORY' | 'STACKTAPE_DATABASE';
  deployOnGitEvent: 'PUSHED_TO_BRANCH' | 'PULL_REQUEST_OPENED';
  configPath: string | null;
  templateId: string | null;
};

export type CreateGitDeploymentConfigFromCliResponse = {
  success: boolean;
  id?: string;
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

export type OrganizationActivityParams = {
  commands?: string[] | null;
  projectName?: string | null;
  stage?: string | null;
  currentUserOnly?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'projectName' | 'command' | 'deploymentTrigger' | 'gitCommit' | 'userName';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type OrganizationActivityResponse = {
  items: Array<{
    id: string;
    startTime: Date | string | null;
    endTime: Date | string | null;
    stackName: string | null;
    githubAvatarUrl: string | null;
    success: boolean | null;
    deploymentTrigger: string;
    createdAt: Date | string;
    projectName: string | null;
    stage: string | null;
    region: string | null;
    command: string | null;
    gitCommit: string | null;
    inProgress: boolean | null;
    description: string | null;
    user: { name: string | null; email: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

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
  ec2DeployFromCli: {
    mutate: (args: Ec2DeployFromCliParams) => Promise<Ec2DeployFromCliResponse>;
  };
  ec2DeployStatusFromCli: {
    query: (args: Ec2DeployStatusFromCliParams) => Promise<Ec2DeployStatusFromCliResponse>;
  };
  configureEc2RunnerFromCli: {
    mutate: (args: ConfigureEc2RunnerFromCliParams) => Promise<ConfigureEc2RunnerFromCliResponse>;
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
  initAwsConnectionForCli: {
    mutate: (args: InitAwsConnectionForCliInput) => Promise<InitAwsConnectionForCliResponse>;
  };
  createAwsConnectionPending: {
    mutate: (args: CreateAwsConnectionPendingInput) => Promise<CreateAwsConnectionPendingResponse>;
  };
  getAwsConnectionStatus: {
    query: (args: GetAwsConnectionStatusInput) => Promise<GetAwsConnectionStatusResponse>;
  };
  getGitProviderConnectionStatus: {
    query: (args: GetGitProviderConnectionStatusInput) => Promise<GetGitProviderConnectionStatusResponse>;
  };
  createGitDeploymentConfigFromCli: {
    mutate: (args: CreateGitDeploymentConfigFromCliInput) => Promise<CreateGitDeploymentConfigFromCliResponse>;
  };
  projectsWithStages: {
    query: () => Promise<ProjectsWithStagesResponse>;
  };
  recentStackOperations: {
    query: (args: RecentStackOperationsParams) => Promise<RecentStackOperationsResponse>;
  };
  organizationActivityFromCli: {
    query: (args: OrganizationActivityParams) => Promise<OrganizationActivityResponse>;
  };
  stackDetails: {
    query: (args: StackDetailsParams) => Promise<StackDetailsResponse>;
  };
  reportEvent: {
    mutate: (args: ReportEventParams) => Promise<string>;
  };
  issuesFromCli: {
    query: (args: ListIssuesParams) => Promise<ListIssuesResponse>;
  };
  resolveIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
  ignoreIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
  reopenIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
};
