import type {
  CliConfigGenSession,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
  CreateGitDeploymentConfigFromCliInput,
  CreateGitDeploymentConfigFromCliResponse,
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  GetAwsConnectionStatusInput,
  GetAwsConnectionStatusResponse,
  GetGitProviderConnectionStatusInput,
  GetGitProviderConnectionStatusResponse,
  InitAwsConnectionForCliInput,
  InitAwsConnectionForCliResponse,
  PublicTrpcClient,
  StackPriceEstimationInput,
  StackPriceEstimationResponse,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '../../types/console-app/trpc/public';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/params';
import { createTypedTrpcClient } from './client';

export type {
  CliConfigGenDeployableUnit,
  CliConfigGenDeployableUnitType,
  CliConfigGenNonComputeResource,
  CliConfigGenPhase,
  CliConfigGenRequiredResource,
  CliConfigGenSession,
  CliConfigGenSessionData,
  CliConfigGenSessionState,
  CostBreakdownItem,
  CreateAwsConnectionPendingInput,
  CreateAwsConnectionPendingResponse,
  CreateGitDeploymentConfigFromCliInput,
  CreateGitDeploymentConfigFromCliResponse,
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  GetAwsConnectionStatusInput,
  GetAwsConnectionStatusResponse,
  GetGitProviderConnectionStatusInput,
  GetGitProviderConnectionStatusResponse,
  InitAwsConnectionForCliInput,
  InitAwsConnectionForCliResponse,
  ProductionReadiness,
  ResourcePricingInfo,
  StackPriceEstimationInput,
  StackPriceEstimationResponse,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '../../types/console-app/trpc/public';

const createPublicTrpcClient = () => {
  return createTypedTrpcClient<PublicTrpcClient>({ url: STACKTAPE_TRPC_API_ENDPOINT });
};

export class PublicApiClient {
  #client: PublicTrpcClient | null = null;

  init = () => {
    this.#client = createPublicTrpcClient();
  };

  #ensureInitialized = () => {
    if (!this.#client) {
      this.init();
    }

    return this.#client!;
  };

  startCliConfigGen = async (input: StartCliConfigGenInput): Promise<StartCliConfigGenResponse> => {
    return this.#ensureInitialized().startCliConfigGen.mutate(input);
  };

  submitCliConfigGenFiles = async (input: SubmitFilesInput): Promise<SubmitFilesResponse> => {
    return this.#ensureInitialized().submitCliConfigGenFiles.mutate(input);
  };

  getCliConfigGenState = async (sessionId: string): Promise<CliConfigGenSession> => {
    return this.#ensureInitialized().getCliConfigGenState.query({ sessionId });
  };

  cancelCliConfigGen = async (sessionId: string): Promise<{ success: boolean }> => {
    return this.#ensureInitialized().cancelCliConfigGen.mutate({ sessionId });
  };

  exchangeTokenForApiKey = async (input: ExchangeTokenForApiKeyInput): Promise<ExchangeTokenForApiKeyResponse> => {
    return this.#ensureInitialized().exchangeTokenForApiKey.mutate(input);
  };

  initAwsConnectionForCli = async (input: InitAwsConnectionForCliInput): Promise<InitAwsConnectionForCliResponse> => {
    return this.#ensureInitialized().initAwsConnectionForCli.mutate(input);
  };

  createAwsConnectionPending = async (
    input: CreateAwsConnectionPendingInput
  ): Promise<CreateAwsConnectionPendingResponse> => {
    return this.#ensureInitialized().createAwsConnectionPending.mutate(input);
  };

  getAwsConnectionStatus = async (input: GetAwsConnectionStatusInput): Promise<GetAwsConnectionStatusResponse> => {
    return this.#ensureInitialized().getAwsConnectionStatus.query(input);
  };

  getGitProviderConnectionStatus = async (
    input: GetGitProviderConnectionStatusInput
  ): Promise<GetGitProviderConnectionStatusResponse> => {
    return this.#ensureInitialized().getGitProviderConnectionStatus.query(input);
  };

  createGitDeploymentConfigFromCli = async (
    input: CreateGitDeploymentConfigFromCliInput
  ): Promise<CreateGitDeploymentConfigFromCliResponse> => {
    return this.#ensureInitialized().createGitDeploymentConfigFromCli.mutate(input);
  };

  stackPriceEstimation = async (input: StackPriceEstimationInput): Promise<StackPriceEstimationResponse> => {
    return this.#ensureInitialized().stackPriceEstimation.mutate(input);
  };
}

export const publicApiClient = new PublicApiClient();
