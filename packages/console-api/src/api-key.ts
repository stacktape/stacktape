import { z } from 'zod';

/**
 * The Console API's API-key surface: procedures a Stacktape API key authorizes, scoped to the organization
 * the key belongs to.
 *
 * Deployment tokens authenticate against this same surface but reach only the subset of procedures a
 * deployment needs; the server decides that, and it is deliberately not described here.
 */

const EC2_RUNNER_INSTANCE_TYPES = [
  'm6a.large',
  'm6a.xlarge',
  'c7a.xlarge',
  'c7a.2xlarge',
  'c7a.4xlarge',
  'c7a.8xlarge'
] as const;

export const recordStackOperationInputSchema = z.object({
  invocationId: z.string(),
  command: z.string().optional().nullable(),
  stackName: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  awsAccessKeyId: z.string().optional().nullable(),
  awsAccountId: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  startTime: z.number().optional().nullable(),
  endTime: z.number().optional().nullable(),
  gitUrl: z.string().optional().nullable(),
  gitCommit: z.string().optional().nullable(),
  gitBranch: z.string().optional().nullable(),
  success: z.boolean().optional().nullable(),
  description: z.string().optional().nullable(),
  isCodebuildOperation: z.boolean().optional().nullable(),
  codebuildBuildArn: z.string().optional().nullable(),
  /**
   * The CLI's parsed command-line flags, forwarded as they were parsed and stored as JSON. The Console
   * reads `stage` out of it and keeps the rest verbatim, so the values stay unknown here: the CLI owns
   * what a flag means, and its argument parser turns `--stage 2024` into a number as readily as a string.
   */
  commandArgs: z.record(z.string(), z.unknown()).optional().nullable(),
  logStreamName: z.string().optional().nullable(),
  inProgress: z.boolean().optional().nullable(),
  interrupted: z.boolean().optional().nullable(),
  pullRequestNumber: z.string().optional().nullable(),
  stacktapeVersion: z.string().optional().nullable(),
  accountConnectionId: z.string().optional().nullable(),
  ciProvider: z.string().optional().nullable()
});

export const createDeploymentTokenFromCliInputSchema = z.object({
  projectName: z.string(),
  accountConnectionId: z.string(),
  awsAccountId: z.string(),
  invocationId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional().nullable()
});

export const ec2DeployFromCliInputSchema = z.object({
  invocationId: z.string().optional(),
  projectName: z.string(),
  accountConnectionId: z.string(),
  awsAccountId: z.string(),
  region: z.string(),
  stage: z.string(),
  gitUrl: z.string(),
  gitBranch: z.string(),
  gitCommit: z.string(),
  gitCommitMessage: z.string().optional().nullable(),
  gitUsername: z.string().optional().nullable(),
  configPath: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  hotSwap: z.boolean().optional()
});

export const ec2DeployStatusFromCliInputSchema = z.object({
  invocationId: z.string()
});

export const configureEc2RunnerFromCliInputSchema = z.object({
  projectName: z.string(),
  ec2RunnerInstanceType: z.enum(EC2_RUNNER_INSTANCE_TYPES)
});

export const createOrganizationFromCliInputSchema = z.object({
  name: z.string().trim().min(1)
});

export const deleteOrganizationFromCliInputSchema = z.object({
  id: z.string().trim().min(1)
});

export const awsConnectionInputSchema = z.object({
  organizationId: z.string(),
  connectionName: z.string(),
  connectionMode: z.enum(['BASIC', 'PRIVILEGED'])
});

export const getAwsConnectionStatusInputSchema = z.object({
  connectionId: z.string()
});

export const getGitProviderConnectionStatusInputSchema = z.object({
  organizationId: z.string(),
  provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET'])
});

export const createGitDeploymentConfigFromCliInputSchema = z.object({
  organizationId: z.string(),
  projectId: z.string(),
  awsAccountConnectionId: z.string(),
  branch: z.string(),
  owner: z.string(),
  repository: z.string(),
  targetRegion: z.string(),
  stage: z.string(),
  configSource: z.enum(['GIT_REPOSITORY', 'STACKTAPE_DATABASE']),
  deployOnGitEvent: z.enum(['PUSHED_TO_BRANCH', 'PULL_REQUEST_OPENED']),
  configPath: z.string().nullable(),
  templateId: z.string().nullable()
});

export const reportEventInputSchema = z.object({
  type: z.string(),
  severity: z.string().default('INFO'),
  project: z.string().optional(),
  stage: z.string().optional(),
  region: z.string().optional(),
  title: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  invocationId: z.string().optional()
});

export const awsAccountCredentialsInputSchema = z.object({
  awsAccountName: z.string()
});

export const templateInputSchema = z.object({
  templateId: z.string()
});

export const defaultDomainsInfoInputSchema = z.object({
  stackName: z.string(),
  region: z.string(),
  awsAccountId: z.string()
});

export const createProjectFromCliInputSchema = z.object({
  name: z.string().trim().min(1),
  gitUrl: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  configPath: z.string().optional().nullable(),
  region: z.string().optional().nullable()
});

export const deleteUndeployedStageFromCliInputSchema = z.object({
  projectName: z.string(),
  stageName: z.string()
});

export const recentStackOperationsInputSchema = z.object({
  projectName: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const organizationActivityFromCliInputSchema = z.object({
  commands: z.string().array().optional().nullable(),
  projectName: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  currentUserOnly: z.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['createdAt', 'projectName', 'command', 'deploymentTrigger', 'gitCommit', 'userName']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().positive().max(200).optional()
});

export const stackDetailsInputSchema = z.object({
  stackName: z.string(),
  region: z.string(),
  awsAccountName: z.string().optional()
});

export const listIssuesInputSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'IGNORED']).optional(),
  project: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const issueActionInputSchema = z.object({ issueId: z.string() });

export type RecordStackOperationParams = z.input<typeof recordStackOperationInputSchema>;
export type CreateDeploymentTokenFromCliParams = z.input<typeof createDeploymentTokenFromCliInputSchema>;
export type Ec2DeployFromCliParams = z.input<typeof ec2DeployFromCliInputSchema>;
export type Ec2DeployStatusFromCliParams = z.input<typeof ec2DeployStatusFromCliInputSchema>;
export type ConfigureEc2RunnerFromCliParams = z.input<typeof configureEc2RunnerFromCliInputSchema>;
export type CreateOrganizationParams = z.input<typeof createOrganizationFromCliInputSchema>;
export type DeleteOrganizationParams = z.input<typeof deleteOrganizationFromCliInputSchema>;
export type CreateAwsConnectionPendingInput = z.input<typeof awsConnectionInputSchema>;
export type InitAwsConnectionForCliInput = z.input<typeof awsConnectionInputSchema>;
export type GetAwsConnectionStatusInput = z.input<typeof getAwsConnectionStatusInputSchema>;
export type GetGitProviderConnectionStatusInput = z.input<typeof getGitProviderConnectionStatusInputSchema>;
export type CreateGitDeploymentConfigFromCliInput = z.input<typeof createGitDeploymentConfigFromCliInputSchema>;
export type ReportEventParams = z.input<typeof reportEventInputSchema>;
export type AwsAccountCredentialsParams = z.input<typeof awsAccountCredentialsInputSchema>;
export type TemplateParams = z.input<typeof templateInputSchema>;
export type DefaultDomainsInfoParams = z.input<typeof defaultDomainsInfoInputSchema>;
export type CreateProjectParams = z.input<typeof createProjectFromCliInputSchema>;
export type DeleteUndeployedStageParams = z.input<typeof deleteUndeployedStageFromCliInputSchema>;
export type RecentStackOperationsParams = z.input<typeof recentStackOperationsInputSchema>;
export type OrganizationActivityParams = z.input<typeof organizationActivityFromCliInputSchema>;
export type StackDetailsParams = z.input<typeof stackDetailsInputSchema>;
export type ListIssuesParams = z.input<typeof listIssuesInputSchema>;
export type IssueActionParams = z.input<typeof issueActionInputSchema>;

/**
 * Organization-wide configuration a deployment has to honour.
 *
 * `guardrails` and `deploymentNotifications` are Stacktape configuration objects: the CLI's config schema
 * defines their shape, and the Console stores and returns them unchanged. Describing them again here would
 * mean maintaining a second copy of that schema, so they cross the wire as opaque values and the CLI reads
 * them with the types it already owns.
 */
export type GlobalConfigResponse = {
  alarms: {
    name: string;
    forServices: string[];
    forStages: string[];
    evaluation: unknown;
    trigger: unknown;
    notificationTargets: Array<{
      name: string;
      type: string;
      properties: unknown;
    }>;
  }[];
  guardrails: unknown[];
  deploymentNotifications: unknown[];
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
  project: string | null;
  stage: string | null;
  region: string | null;
  functionName: string | null;
  organizationId: string;
  resolvedAt: string | Date | null;
  resolvedBy: string | null;
  ignoredAt: string | Date | null;
  ignoredBy: string | null;
}>;

export type IssueActionResponse = {
  success: boolean;
};

/**
 * Everything a CLI session needs to know about who it is acting as. The named properties are the ones
 * clients read; the index signatures leave room for the Console to add fields without a breaking change.
 */
export type CurrentUserAndOrgDataResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    [otherProperties: string]: unknown;
  };
  organization: {
    id: string;
    name: string;
    role: string;
    [otherProperties: string]: unknown;
  };
  connectedAwsAccounts: Array<{
    id: string;
    organizationId: string;
    name: string;
    awsAccountId: string | null;
    state: string;
    primaryRegions: string[];
    defaultRegion: string | null;
    deleted?: boolean | null;
    [otherProperties: string]: unknown;
  }>;
  projects: Array<{
    id: string;
    organizationId: string;
    name: string;
    configPath: string | null;
    templateId: string | null;
    defaultRegion: string | null;
    [otherProperties: string]: unknown;
  }>;
  permissions: string[];
  isProjectScoped: boolean;
};

export type Ec2DeployFromCliResponse = {
  invocationId: string;
  ssmCommandId?: string;
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

export type ConfigureEc2RunnerFromCliResponse = {
  id: string;
  name: string;
  deploymentRunnerType?: string | null;
  ec2RunnerInstanceType?: string | null;
  [otherProperties: string]: unknown;
};

export type CreateDeploymentTokenFromCliResponse = {
  apiKey: string;
};

export type AwsAccountCredentialsResponse = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    accountId?: string;
    /** Absent when the Console hands back credentials that do not expire on their own. */
    expiration?: string;
    [otherProperties: string]: unknown;
  };
};

export type TemplateResponse = {
  id: string;
  name: string;
  /** The stored Stacktape configuration, as it was uploaded. */
  content: string;
  /** Null for the templates Stacktape itself publishes, which belong to no organization. */
  organizationId: string | null;
  [otherProperties: string]: unknown;
};

export type CanDeployResponse = {
  canDeploy: boolean;
  message?: string;
};

export type DefaultDomainsInfoResponse = {
  /** Both suffixes are absent for domain scheme versions that no longer publish a default domain. */
  suffix?: string;
  certDomainSuffix?: string;
  version: number;
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
    [otherProperties: string]: unknown;
  };
  apiKey: string;
};

export type ListOrganizationsResponse = OrganizationSummary[];

export type DeleteOrganizationResponse = {
  id?: string;
  userId?: string;
  organizationId?: string;
  [otherProperties: string]: unknown;
};

export type CreateProjectResponse = {
  id: string;
  name: string;
  gitUrl?: string | null;
  organizationId: string;
  templateId?: string | null;
  configPath?: string | null;
  [otherProperties: string]: unknown;
};

export type DeleteUndeployedStageResponse = {
  id?: string;
  name?: string;
  projectId?: string;
  success?: boolean;
  message?: string;
  [otherProperties: string]: unknown;
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

export type CreateAwsConnectionPendingResponse = {
  connectionId: string;
  quickCreateUrl: string;
};

export type GetAwsConnectionStatusResponse = {
  state: 'PENDING' | 'ACTIVE' | 'FAILED';
  awsAccountId?: string;
  name?: string;
};

export type GetGitProviderConnectionStatusResponse = {
  isConnected: boolean;
  installationId?: string;
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
    [otherProperties: string]: unknown;
  }>;
  [otherProperties: string]: unknown;
}>;

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

export type StackDetailsResponse = {
  stackOutput?: {
    [outputName: string]: string;
  };
  stackInfoMap?: unknown;
  resources?: unknown[];
  description?: string | null;
};

/** The procedures a Stacktape API key may call, and nothing else. */
export type ApiKeyTrpcClient = {
  recordStackOperation: {
    /** Responds with the stored operation. Clients record and move on, so the shape is not part of the contract. */
    mutate: (args: RecordStackOperationParams) => Promise<unknown>;
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
  createDeploymentTokenFromCli: {
    mutate: (args: CreateDeploymentTokenFromCliParams) => Promise<CreateDeploymentTokenFromCliResponse>;
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
