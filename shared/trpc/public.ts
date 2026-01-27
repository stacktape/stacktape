import type { TRPCUntypedClient } from '@trpc/client';
import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client';
import type { AnyClientTypes } from '@trpc/server/unstable-core-do-not-import';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/random';
import type {
  CliConfigGenSession,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '../../src/utils/config-gen/types';

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

const createPublicTrpcClient = () => {
  return createTRPCUntypedClient({
    links: [
      httpBatchLink({
        url: STACKTAPE_TRPC_API_ENDPOINT,
        fetch: fetchWithTimeout as any
      })
    ]
  });
};

export class PublicApiClient {
  #client: TRPCUntypedClient<AnyClientTypes> | null = null;

  init(): void {
    this.#client = createPublicTrpcClient();
  }

  #ensureInitialized(): TRPCUntypedClient<AnyClientTypes> {
    if (!this.#client) {
      this.init();
    }
    return this.#client!;
  }

  startCliConfigGen = async (input: StartCliConfigGenInput): Promise<StartCliConfigGenResponse> => {
    return this.#ensureInitialized().mutation('startCliConfigGen', input) as Promise<StartCliConfigGenResponse>;
  };

  /**
   * Submit file contents for analysis.
   * The server will analyze the files and generate the config.
   */
  submitCliConfigGenFiles = async (input: SubmitFilesInput): Promise<SubmitFilesResponse> => {
    return this.#ensureInitialized().mutation('submitCliConfigGenFiles', input) as Promise<SubmitFilesResponse>;
  };

  /**
   * Get the current state of a config generation session.
   * Use this to poll for progress and the final result.
   */
  getCliConfigGenState = async (sessionId: string): Promise<CliConfigGenSession> => {
    return this.#ensureInitialized().query('getCliConfigGenState', { sessionId }) as Promise<CliConfigGenSession>;
  };

  /**
   * Cancel a config generation session.
   */
  cancelCliConfigGen = async (sessionId: string): Promise<{ success: boolean }> => {
    return this.#ensureInitialized().mutation('cancelCliConfigGen', { sessionId }) as Promise<{ success: boolean }>;
  };
}

export const publicApiClient = new PublicApiClient();
