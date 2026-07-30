import type {
  CliConfigGenSession,
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  AnonymousTrpcClient,
  StackPriceEstimationInput,
  StackPriceEstimationResponse,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '@stacktape/console-api/anonymous';
import { STACKTAPE_TRPC_API_ENDPOINT } from 'src/config/params';
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
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  ProductionReadiness,
  ResourcePricingInfo,
  StackPriceEstimationInput,
  StackPriceEstimationResponse,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '@stacktape/console-api/anonymous';

const createAnonymousTrpcClient = () => {
  return createTypedTrpcClient<AnonymousTrpcClient>({ url: STACKTAPE_TRPC_API_ENDPOINT });
};

export class PublicApiClient {
  #client: AnonymousTrpcClient | null = null;

  init = () => {
    this.#client = createAnonymousTrpcClient();
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

  stackPriceEstimation = async (input: StackPriceEstimationInput): Promise<StackPriceEstimationResponse> => {
    return this.#ensureInitialized().stackPriceEstimation.mutate(input);
  };
}

export const publicApiClient = new PublicApiClient();
