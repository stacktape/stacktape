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
  ExchangeTokenForApiKeyInput,
  ExchangeTokenForApiKeyResponse,
  StackPriceEstimationInput,
  StackPriceEstimationResponse
} from '@stacktape/console-api/anonymous';

export class PublicApiClient {
  #client: AnonymousTrpcClient | null = null;
  readonly #url: string | undefined;

  /** `url` replaces the configured Stacktape API endpoint, for a caller that was handed a different one. */
  constructor({ url }: { url?: string } = {}) {
    this.#url = url;
  }

  init = () => {
    this.#client = createTypedTrpcClient<AnonymousTrpcClient>({ url: this.#url ?? STACKTAPE_TRPC_API_ENDPOINT });
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
