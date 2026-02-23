// GENERATED FILE - DO NOT EDIT
// Source: console-app/scripts/generate-stacktape-console-types.ts

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
  | 'DynamoDB'
  | 'MongoDB'
  | 'S3'
  | 'SQS'
  | 'SNS';

export type CliConfigGenDeployableUnitType =
  | 'static-website'
  | 'web-service'
  | 'worker-service'
  | 'lambda-function'
  | 'next-js-app'
  | 'astro-app'
  | 'nuxt-app'
  | 'sveltekit-app'
  | 'solidstart-app'
  | 'tanstack-app'
  | 'remix-app';

export type CliConfigGenDeployableUnit = {
  name: string;
  type: CliConfigGenDeployableUnitType;
  framework: string;
  language: string;
  dependencyFilePath: string;
  dockerfilePath: string | null;
  entryfilePath: string | null;
  rootPath: string;
  distPath: string | null;
  startCommand: string | null;
  buildCommand: string | null;
  reason: string;
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

export type ProductionReadiness = 'low-cost' | 'standard' | 'production';

export type StartCliConfigGenInput = {
  fileTree: string;
  allFiles: string[];
  productionReadiness?: ProductionReadiness;
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

export type ExchangeTokenForApiKeyInput = {
  idToken: string;
};

export type ExchangeTokenForApiKeyResponse = {
  success: boolean;
  apiKeys: {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastUsed: string;
    name: string;
    userId: string;
    organizationId: string;
    organizationName: string;
  }[];
  error?: string;
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

export type StackPriceEstimationInput = {
  stackConfig: string;
  region?: string;
};

export type CostBreakdownItem = {
  name: string;
  description: string;
  priceModel: 'flat' | 'pay-per-use';
  pricePerUnit?: number;
  unit?: string;
  adjustedPrice?: number;
  pricePerMonth?: number | false;
  pricePerMonthUpper?: number | false;
  multiplier?: number;
  upperThresholdMultiplier?: number;
  unsupportedProduct?: boolean;
};

export type ResourcePricingInfo = {
  priceInfo: {
    totalMonthlyFlat: number;
    costBreakdown: CostBreakdownItem[];
  };
  relatedAwsPricingDocs?: Record<string, string>;
  underTheHoodLink?: string;
  customComment?: string;
};

export type StackPriceEstimationResponse = {
  success: boolean;
  costs: {
    flatMonthlyCost: number;
    resourcesBreakdown: Record<string, ResourcePricingInfo>;
  } | null;
};

export type PublicTrpcClient = {
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
  exchangeTokenForApiKey: {
    mutate: (input: ExchangeTokenForApiKeyInput) => Promise<ExchangeTokenForApiKeyResponse>;
  };
  initAwsConnectionForCli: {
    mutate: (input: InitAwsConnectionForCliInput) => Promise<InitAwsConnectionForCliResponse>;
  };
  createAwsConnectionPending: {
    mutate: (input: CreateAwsConnectionPendingInput) => Promise<CreateAwsConnectionPendingResponse>;
  };
  getAwsConnectionStatus: {
    query: (input: GetAwsConnectionStatusInput) => Promise<GetAwsConnectionStatusResponse>;
  };
  getGitProviderConnectionStatus: {
    query: (input: GetGitProviderConnectionStatusInput) => Promise<GetGitProviderConnectionStatusResponse>;
  };
  createGitDeploymentConfigFromCli: {
    mutate: (input: CreateGitDeploymentConfigFromCliInput) => Promise<CreateGitDeploymentConfigFromCliResponse>;
  };
  stackPriceEstimation: {
    mutate: (input: StackPriceEstimationInput) => Promise<StackPriceEstimationResponse>;
  };
};
