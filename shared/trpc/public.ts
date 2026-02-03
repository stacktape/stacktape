import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/params';

export type CliConfigGenSessionState = 'WAITING_FOR_FILES' | 'ANALYZING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';

export type CliConfigGenPhase =
  | 'FILE_SELECTION'
  | 'WAITING_FOR_FILE_CONTENTS'
  | 'ANALYZING_DEPLOYMENTS'
  | 'GENERATING_CONFIG'
  | 'ADJUSTING_ENV_VARS';

export type CliConfigGenNonComputeResource =
  | 'Postgres'
  | 'MySQL'
  | 'SQL-database'
  | 'Redis'
  | 'ElasticSearch'
  | 'DynamoDB';

export type CliConfigGenDeployableUnitType =
  | 'static-frontend'
  | 'frontend-requiring-build'
  | 'web-service'
  | 'worker-service'
  | 'lambda-function'
  | 'next-js-app';

export type CliConfigGenStaticContentType = 'static-website' | 'single-page-app';

export type CliConfigGenDeployableUnit = {
  name: string;
  type: CliConfigGenDeployableUnitType;
  dependencyFilePath: string;
  dockerfilePath: string | null;
  entryfilePath: string | null;
  rootPath: string;
  distPath: string | null;
  startCommand: string | null;
  buildCommand: string | null;
  reason: string;
  staticContentType: CliConfigGenStaticContentType | null;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno';
  envVars?: Array<{ name: string; value: string }>;
  requiredResources?: CliConfigGenNonComputeResource[];
};

export type CliConfigGenRequiredResource = {
  type: CliConfigGenNonComputeResource;
  reason: string;
  deployableUnitDependencyFilePaths: string[];
  requiredByDeployableUnits: string[];
};

export type CliConfigGenSessionData = {
  config?: StacktapeConfig;
  deployableUnits?: CliConfigGenDeployableUnit[];
  requiredResources?: CliConfigGenRequiredResource[];
  error?: { message: string; stack?: string };
  filesToRead?: string[];
  allFiles?: string[];
  fileTree?: string;
};

export type CliConfigGenSession = {
  state: CliConfigGenSessionState;
  phase: CliConfigGenPhase;
  data: CliConfigGenSessionData;
  createdAt: number;
};

export type StartCliConfigGenInput = {
  fileTree: string;
  allFiles: string[];
};

export type StartCliConfigGenResponse = {
  sessionId: string;
  filesToRead: string[];
};

export type SubmitFilesInput = {
  sessionId: string;
  files: Array<{ path: string; content: string }>;
};

export type SubmitFilesResponse = {
  success: boolean;
};

// ============ CLI Auth Types ============

export type ExchangeTokenForApiKeyInput = {
  idToken: string;
};

export type ExchangeTokenForApiKeyResponse = {
  success: boolean;
  apiKey?: string;
  error?: string;
};

// ============ AWS Connection Types ============

export type CreateAwsConnectionWithLocalCredsInput = {
  organizationId: string;
  connectionName: string;
  profile?: string;
  connectionMode: 'BASIC' | 'PRIVILEGED';
};

export type CreateAwsConnectionWithLocalCredsResponse = {
  success: boolean;
  awsAccountId?: string;
  connectionName?: string;
  error?: string;
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

// ============ Git Provider Types ============

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

type PublicTrpcClient = {
  // Config generation
  startCliConfigGen: {
    mutate: (input: StartCliConfigGenInput) => Promise<StartCliConfigGenResponse>;
  };
  submitCliConfigGenFiles: {
    mutate: (input: SubmitFilesInput) => Promise<SubmitFilesResponse>;
  };
  getCliConfigGenState: {
    query: (input: { sessionId: string }) => Promise<CliConfigGenSession>;
  };
  cancelCliConfigGen: {
    mutate: (input: { sessionId: string }) => Promise<{ success: boolean }>;
  };
  // CLI Auth
  exchangeTokenForApiKey: {
    mutate: (input: ExchangeTokenForApiKeyInput) => Promise<ExchangeTokenForApiKeyResponse>;
  };
  // AWS Connection
  createAwsConnectionWithLocalCreds: {
    mutate: (input: CreateAwsConnectionWithLocalCredsInput) => Promise<CreateAwsConnectionWithLocalCredsResponse>;
  };
  createAwsConnectionPending: {
    mutate: (input: CreateAwsConnectionPendingInput) => Promise<CreateAwsConnectionPendingResponse>;
  };
  getAwsConnectionStatus: {
    query: (input: GetAwsConnectionStatusInput) => Promise<GetAwsConnectionStatusResponse>;
  };
  // Git Provider
  getGitProviderConnectionStatus: {
    query: (input: GetGitProviderConnectionStatusInput) => Promise<GetGitProviderConnectionStatusResponse>;
  };
  createGitDeploymentConfigFromCli: {
    mutate: (input: CreateGitDeploymentConfigFromCliInput) => Promise<CreateGitDeploymentConfigFromCliResponse>;
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

const createPublicTrpcClient = (): PublicTrpcClient => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: STACKTAPE_TRPC_API_ENDPOINT,
        fetch: fetchWithTimeout as any
      })
    ]
  }) as unknown as PublicTrpcClient;
};

export class PublicApiClient {
  #client: ReturnType<typeof createPublicTrpcClient> | null = null;

  init(): void {
    this.#client = createPublicTrpcClient();
  }

  #ensureInitialized(): ReturnType<typeof createPublicTrpcClient> {
    if (!this.#client) {
      this.init();
    }
    return this.#client!;
  }

  startCliConfigGen = async (input: StartCliConfigGenInput): Promise<StartCliConfigGenResponse> => {
    return this.#ensureInitialized().startCliConfigGen.mutate(input);
  };

  /**
   * Submit file contents for analysis.
   * The server will analyze the files and generate the config.
   */
  submitCliConfigGenFiles = async (input: SubmitFilesInput): Promise<SubmitFilesResponse> => {
    return this.#ensureInitialized().submitCliConfigGenFiles.mutate(input);
  };

  /**
   * Get the current state of a config generation session.
   * Use this to poll for progress and the final result.
   */
  getCliConfigGenState = async (sessionId: string): Promise<CliConfigGenSession> => {
    return this.#ensureInitialized().getCliConfigGenState.query({ sessionId });
  };

  /**
   * Cancel a config generation session.
   */
  cancelCliConfigGen = async (sessionId: string): Promise<{ success: boolean }> => {
    return this.#ensureInitialized().cancelCliConfigGen.mutate({ sessionId });
  };

  // ============ CLI Auth Methods ============

  /**
   * Exchange a Cognito ID token for a Stacktape API key.
   * This is the recommended way for CLI authentication.
   */
  exchangeTokenForApiKey = async (input: ExchangeTokenForApiKeyInput): Promise<ExchangeTokenForApiKeyResponse> => {
    return this.#ensureInitialized().exchangeTokenForApiKey.mutate(input);
  };

  // ============ AWS Connection Methods ============

  /**
   * Create AWS connection using local credentials.
   * This will deploy the CloudFormation stack using the user's local AWS credentials.
   */
  createAwsConnectionWithLocalCreds = async (
    input: CreateAwsConnectionWithLocalCredsInput
  ): Promise<CreateAwsConnectionWithLocalCredsResponse> => {
    return this.#ensureInitialized().createAwsConnectionWithLocalCreds.mutate(input);
  };

  /**
   * Create a pending AWS connection and get the quick-create URL.
   */
  createAwsConnectionPending = async (
    input: CreateAwsConnectionPendingInput
  ): Promise<CreateAwsConnectionPendingResponse> => {
    return this.#ensureInitialized().createAwsConnectionPending.mutate(input);
  };

  /**
   * Get the status of an AWS connection.
   */
  getAwsConnectionStatus = async (input: GetAwsConnectionStatusInput): Promise<GetAwsConnectionStatusResponse> => {
    return this.#ensureInitialized().getAwsConnectionStatus.query(input);
  };

  // ============ Git Provider Methods ============

  /**
   * Check if a git provider is connected for an organization.
   */
  getGitProviderConnectionStatus = async (
    input: GetGitProviderConnectionStatusInput
  ): Promise<GetGitProviderConnectionStatusResponse> => {
    return this.#ensureInitialized().getGitProviderConnectionStatus.query(input);
  };

  /**
   * Create a git deployment configuration from CLI.
   */
  createGitDeploymentConfigFromCli = async (
    input: CreateGitDeploymentConfigFromCliInput
  ): Promise<CreateGitDeploymentConfigFromCliResponse> => {
    return this.#ensureInitialized().createGitDeploymentConfigFromCli.mutate(input);
  };
}

export const publicApiClient = new PublicApiClient();
