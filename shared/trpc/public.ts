import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../src/config/random';
import type {
  CliConfigGenSession,
  StartCliConfigGenInput,
  StartCliConfigGenResponse,
  SubmitFilesInput,
  SubmitFilesResponse
} from '../../src/utils/config-gen/types';

/**
 * Creates a tRPC client for public endpoints (no authentication required).
 */
const createPublicTrpcClient = () => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: `${STACKTAPE_TRPC_API_ENDPOINT}/public`
      })
    ]
  });
};

/**
 * Public API client for endpoints that don't require authentication.
 * Currently used for CLI config generation.
 */
export class PublicApiClient {
  #client: ReturnType<typeof createPublicTrpcClient> | null = null;

  /**
   * Initialize the client. Must be called before using other methods.
   */
  init(): void {
    this.#client = createPublicTrpcClient();
  }

  /**
   * Ensures the client is initialized.
   */
  #ensureInitialized(): ReturnType<typeof createPublicTrpcClient> {
    if (!this.#client) {
      this.init();
    }
    return this.#client!;
  }

  // ============ Config Generation Methods ============

  /**
   * Start a config generation session.
   * Sends the file tree and gets back the session ID and files to read.
   */
  startCliConfigGen = async (input: StartCliConfigGenInput): Promise<StartCliConfigGenResponse> => {
    const client = this.#ensureInitialized();
    return client.startCliConfigGen.mutate(input);
  };

  /**
   * Submit file contents for analysis.
   * The server will analyze the files and generate the config.
   */
  submitCliConfigGenFiles = async (input: SubmitFilesInput): Promise<SubmitFilesResponse> => {
    const client = this.#ensureInitialized();
    return client.submitCliConfigGenFiles.mutate(input);
  };

  /**
   * Get the current state of a config generation session.
   * Use this to poll for progress and the final result.
   */
  getCliConfigGenState = async (sessionId: string): Promise<CliConfigGenSession> => {
    const client = this.#ensureInitialized();
    return client.getCliConfigGenState.query({ sessionId });
  };

  /**
   * Cancel a config generation session.
   */
  cancelCliConfigGen = async (sessionId: string): Promise<{ success: boolean }> => {
    const client = this.#ensureInitialized();
    return client.cancelCliConfigGen.mutate({ sessionId });
  };
}

/**
 * Singleton instance of the public API client.
 */
export const publicApiClient = new PublicApiClient();
