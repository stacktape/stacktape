import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/params';

// Manually typed interfaces based on actual TRPC router at console-app/server/api/api-key-protected.ts
type RecordStackOperationParams = {
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

type GlobalConfigParams = void;

type GlobalConfigResponse = {
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

type AwsAccountCredentialsParams = {
  awsAccountName: string;
};

type AwsAccountCredentialsResponse = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    expiration: string;
    [key: string]: any;
  };
};

type TemplateParams = {
  templateId: string;
};

type TemplateResponse = {
  id: string;
  organizationId: string;
  [key: string]: any;
};

type CanDeployResponse = {
  canDeploy: boolean;
  message?: string;
};

type DefaultDomainsInfoParams = {
  stackName: string;
  region: string;
  awsAccountId: string;
};

type DefaultDomainsInfoResponse = {
  suffix: string;
  certDomainSuffix: string;
  version: number;
};

type CreateProjectParams = {
  name: string;
  gitUrl?: string | null;
  templateId?: string | null;
  configPath?: string | null;
  region?: string | null;
};

type CreateOrganizationParams = {
  name: string;
};

type OrganizationSummary = {
  id: string;
  name: string;
  role: string;
  isPersonal: boolean;
  createdAt: string | Date;
  connectedAccountsCount: number;
  isCurrent: boolean;
};

type CreateOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    [key: string]: any;
  };
  apiKey: string;
};

type ListOrganizationsResponse = OrganizationSummary[];

type DeleteOrganizationParams = {
  id: string;
};

type DeleteOrganizationResponse = {
  id?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: any;
};

type CreateProjectResponse = {
  id: string;
  name: string;
  gitUrl?: string | null;
  organizationId: string;
  templateId?: string | null;
  configPath?: string | null;
  [key: string]: any;
};

type DeleteUndeployedStageParams = {
  projectName: string;
  stageName: string;
};

type DeleteUndeployedStageResponse = {
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

type ApiKeyTrpcClient = {
  recordStackOperation: {
    mutate: (args: RecordStackOperationParams) => Promise<void>;
  };
  globalConfig: {
    query: (args?: GlobalConfigParams) => Promise<GlobalConfigResponse>;
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

const TRPC_REQUEST_TIMEOUT_MS = 30000; // 30 seconds

const fetchWithTimeout = async (url: any, options: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRPC_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const createTrpcApiKeyProtectedClient = ({ apiKey }: { apiKey: string }): ApiKeyTrpcClient => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: STACKTAPE_TRPC_API_ENDPOINT,
        headers: {
          stp_api_key: apiKey
        },
        fetch: fetchWithTimeout as any
      })
    ]
  }) as unknown as ApiKeyTrpcClient;
};

export class ApiKeyProtectedClient {
  #client: ApiKeyTrpcClient | null = null;

  init = async ({ apiKey }: { apiKey: string }) => {
    this.#client = createTrpcApiKeyProtectedClient({ apiKey });
  };

  recordStackOperation = async (args: RecordStackOperationParams): Promise<void> => {
    return this.#client!.recordStackOperation.mutate(args);
  };

  globalConfig = async (args?: GlobalConfigParams): Promise<GlobalConfigResponse> => {
    return this.#client!.globalConfig.query(args);
  };

  currentUserAndOrgData = async (): Promise<CurrentUserAndOrgDataResponse> => {
    return this.#client!.currentUserAndOrgData.query();
  };

  awsAccountCredentials = async (args: AwsAccountCredentialsParams): Promise<AwsAccountCredentialsResponse> => {
    return this.#client!.awsAccountCredentials.query(args);
  };

  template = async (args: TemplateParams): Promise<TemplateResponse> => {
    return this.#client!.template.query(args);
  };

  canDeploy = async (): Promise<CanDeployResponse> => {
    return this.#client!.canDeploy.query();
  };

  defaultDomainsInfo = async (args: DefaultDomainsInfoParams): Promise<DefaultDomainsInfoResponse> => {
    return this.#client!.defaultDomainsInfo.query(args);
  };

  createProject = async (args: CreateProjectParams): Promise<CreateProjectResponse> => {
    return this.#client!.createProjectFromCli.mutate(args);
  };

  createOrganization = async (args: CreateOrganizationParams): Promise<CreateOrganizationResponse> => {
    return this.#client!.createOrganizationFromCli.mutate(args);
  };

  listOrganizations = async (): Promise<ListOrganizationsResponse> => {
    return this.#client!.listOrganizationsFromCli.query();
  };

  deleteOrganization = async (args: DeleteOrganizationParams): Promise<DeleteOrganizationResponse> => {
    return this.#client!.deleteOrganizationFromCli.mutate(args);
  };

  deleteUndeployedStage = async (args: DeleteUndeployedStageParams): Promise<DeleteUndeployedStageResponse> => {
    return this.#client!.deleteUndeployedStageFromCli.mutate(args);
  };

  projectsWithStages = async (): Promise<ProjectsWithStagesResponse> => {
    return this.#client!.projectsWithStages.query();
  };

  recentStackOperations = async (args: RecentStackOperationsParams): Promise<RecentStackOperationsResponse> => {
    return this.#client!.recentStackOperations.query(args);
  };

  stackDetails = async (args: StackDetailsParams): Promise<StackDetailsResponse> => {
    return this.#client!.stackDetails.query(args);
  };
}
