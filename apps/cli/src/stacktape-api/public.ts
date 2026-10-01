import type {
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  AnonymousTrpcClient,
  StackPriceEstimationInput,
  StackPriceEstimationResponse
} from '@stacktape/console-api/anonymous';
import { STACKTAPE_TRPC_API_ENDPOINT } from 'src/config/params';
import { createTypedTrpcClient } from './client';

export type {
  CostBreakdownItem,
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  ResourcePricingInfo,
  StackPriceEstimationInput,
  StackPriceEstimationResponse
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

  exchangeTokenForApiKey = async (input: ExchangeTokenForApiKeyInput): Promise<ExchangeTokenForApiKeyResponse> => {
    return this.#ensureInitialized().exchangeTokenForApiKey.mutate(input);
  };

  stackPriceEstimation = async (input: StackPriceEstimationInput): Promise<StackPriceEstimationResponse> => {
    return this.#ensureInitialized().stackPriceEstimation.mutate(input);
  };
}

export const publicApiClient = new PublicApiClient();
