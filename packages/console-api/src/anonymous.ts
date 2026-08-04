import { z } from 'zod';

/**
 * The Console API's anonymous surface: procedures that accept a request with no credentials at all.
 *
 * Everything here is reachable by anyone on the internet, so the contract is deliberately narrow — it
 * describes only the procedures a Stacktape client is expected to call. The Console's own unauthenticated
 * procedures that no public client uses are not part of it.
 */

const COGNITO_ID_TOKEN_MAX_LENGTH = 8192;

export const startCliConfigGenInputSchema = z.object({
  fileTree: z.string(),
  allFiles: z.array(z.string()),
  productionReadiness: z.enum(['low-cost', 'standard', 'production']).optional()
});

export const submitCliConfigGenFilesInputSchema = z.object({
  sessionId: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string()
    })
  )
});

export const cliConfigGenSessionInputSchema = z.object({
  sessionId: z.string()
});

export const exchangeTokenForApiKeyInputSchema = z.object({
  idToken: z.string().max(COGNITO_ID_TOKEN_MAX_LENGTH),
  organizationId: z.string().optional(),
  listOrganizationsOnly: z.boolean().optional()
});

export const stackPriceEstimationInputSchema = z.object({
  stackConfig: z.string(),
  region: z.string().optional()
});

export type ProductionReadiness = 'low-cost' | 'standard' | 'production';

export type StartCliConfigGenInput = z.input<typeof startCliConfigGenInputSchema>;
export type SubmitFilesInput = z.input<typeof submitCliConfigGenFilesInputSchema>;
export type CliConfigGenSessionInput = z.input<typeof cliConfigGenSessionInputSchema>;
export type ExchangeTokenForApiKeyInput = z.input<typeof exchangeTokenForApiKeyInputSchema>;
export type StackPriceEstimationInput = z.input<typeof stackPriceEstimationInputSchema>;

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
  | 'SNS'
  | 'HttpApiGateway'
  | 'UserAuthPool'
  | 'EventBus'
  | 'BatchJob'
  | 'MultiContainerWorkload'
  | 'ApplicationLoadBalancer'
  | 'StateMachine';

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
  config?: unknown;
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

export type StartCliConfigGenResponse = {
  sessionId: string;
  filesToRead: string[];
};

export type SubmitFilesResponse = {
  success: boolean;
};

export type ExchangeTokenForApiKeyResponse = {
  success: boolean;
  /** Absent when the exchange failed, and empty when only the organization list was requested. */
  apiKeys?: {
    id: string;
    createdAt: string;
    updatedAt: string;
    /** Null until the key is first used. */
    lastUsed: string | null;
    name: string;
    userId: string;
    organizationId: string | null;
    organizationName: string;
  }[];
  organizations?: {
    id: string;
    name: string;
  }[];
  error?: string;
};

export type CostBreakdownItem = {
  name: string;
  description: string;
  /** `flat` or `pay-per-use` today; new estimator entries may add further models. */
  priceModel: string;
  pricePerUnit?: number;
  unit?: string;
  adjustedPrice?: number;
  pricePerMonth?: number | false;
  pricePerMonthUpper?: number | false;
  multiplier?: number;
  upperThresholdMultiplier?: number;
  unsupportedProduct?: boolean;
  [otherProperties: string]: unknown;
};

export type ResourcePricingInfo = {
  priceInfo: {
    /** Absent for resources whose price the estimator could not total. */
    totalMonthlyFlat?: number;
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

/** The procedures an anonymous Stacktape client may call, and nothing else. */
export type AnonymousTrpcClient = {
  startCliConfigGen: {
    mutate: (input: StartCliConfigGenInput) => Promise<StartCliConfigGenResponse>;
  };
  submitCliConfigGenFiles: {
    mutate: (input: SubmitFilesInput) => Promise<SubmitFilesResponse>;
  };
  getCliConfigGenState: {
    query: (input: CliConfigGenSessionInput) => Promise<CliConfigGenSession>;
  };
  cancelCliConfigGen: {
    mutate: (input: CliConfigGenSessionInput) => Promise<{ success: boolean }>;
  };
  exchangeTokenForApiKey: {
    mutate: (input: ExchangeTokenForApiKeyInput) => Promise<ExchangeTokenForApiKeyResponse>;
  };
  stackPriceEstimation: {
    mutate: (input: StackPriceEstimationInput) => Promise<StackPriceEstimationResponse>;
  };
};
