import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/random';

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

const createTrpcApiKeyProtectedClient = ({ apiKey }: { apiKey: string }) => {
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
  });
};

export class ApiKeyProtectedClient {
  #client: any;

  init = async ({ apiKey }: { apiKey: string }) => {
    this.#client = createTrpcApiKeyProtectedClient({ apiKey });
  };

  recordStackOperation = async (args: RecordStackOperationParams): Promise<void> => {
    return this.#client.recordStackOperation.mutate(args);
  };

  globalConfig = async (args?: GlobalConfigParams): Promise<GlobalConfigResponse> => {
    return this.#client.globalConfig.query(args);
  };

  currentUserAndOrgData = async (): Promise<CurrentUserAndOrgDataResponse> => {
    return this.#client.currentUserAndOrgData.query();
  };

  awsAccountCredentials = async (args: AwsAccountCredentialsParams): Promise<AwsAccountCredentialsResponse> => {
    return this.#client.awsAccountCredentials.query(args);
  };

  template = async (args: TemplateParams): Promise<TemplateResponse> => {
    return this.#client.template.query(args);
  };

  canDeploy = async (): Promise<CanDeployResponse> => {
    return this.#client.canDeploy.query();
  };

  defaultDomainsInfo = async (args: DefaultDomainsInfoParams): Promise<DefaultDomainsInfoResponse> => {
    return this.#client.defaultDomainsInfo.query(args);
  };

  createProject = async (args: CreateProjectParams): Promise<CreateProjectResponse> => {
    return this.#client.createProjectFromCli.mutate(args);
  };

  deleteUndeployedStage = async (args: DeleteUndeployedStageParams): Promise<DeleteUndeployedStageResponse> => {
    return this.#client.deleteUndeployedStageFromCli.mutate(args);
  };
}
