import type { PersistedState } from './types';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../config/params';
import { getPersistedApiKey, normalizeEndpoint, withPersistedApiKey } from './api-key-storage';

/**
 * The CLI keeps its Stacktape API key in the operating system's credential store (Windows Credential Manager, Linux
 * Secret Service), one entry per API endpoint. On macOS, and where that store is unavailable (common in WSL, SSH
 * sessions and containers, where every call throws) the key stays in the state file, which only the user can read.
 * `STACKTAPE_CREDENTIAL_STORE=file` forces the file, for tests and for machines whose store prompts.
 */

const CREDENTIAL_STORE_SERVICE = 'stacktape';

/** The part of `Bun.secrets` the CLI uses; tests substitute it. */
export type CredentialStore = {
  get: (options: { service: string; name: string }) => Promise<string | null>;
  set: (options: { service: string; name: string; value: string }) => Promise<void>;
  delete: (options: { service: string; name: string }) => Promise<boolean>;
};

export const getSystemCredentialStore = (): CredentialStore | undefined => {
  // macOS ties a Keychain item to the code signature of the binary that created it. Released CLI binaries are not
  // signed with a stable identity, so every update would ask the user to allow access again and block unattended runs
  // (the MCP server, `stacktape dev`) until someone answers. The file is used there until the binaries are signed.
  if (
    process.env.STACKTAPE_CREDENTIAL_STORE === 'file' ||
    typeof Bun === 'undefined' ||
    process.platform === 'darwin'
  ) {
    return undefined;
  }
  return Bun.secrets;
};

const entryFor = (endpoint: string) => ({ service: CREDENTIAL_STORE_SERVICE, name: normalizeEndpoint(endpoint) });

/**
 * Returns the API key for the endpoint and the state to persist. A key found in the state file moves into the
 * credential store when the store works, and is then removed from the file (including the legacy production slot), so
 * no plaintext copy stays behind. The returned state is the same object when nothing changed.
 */
export const loadApiKey = async ({
  persistedState,
  endpoint = STACKTAPE_TRPC_API_ENDPOINT,
  store = getSystemCredentialStore()
}: {
  persistedState: PersistedState;
  endpoint?: string;
  store?: CredentialStore;
}): Promise<{ apiKey: string | undefined; persistedState: PersistedState }> => {
  const fileApiKey = getPersistedApiKey({ persistedState, endpoint }) || undefined;
  if (!store) {
    return { apiKey: fileApiKey, persistedState };
  }
  try {
    if (fileApiKey) {
      // A key in the file was written later than the stored one: by an older CLI or with the file forced.
      await store.set({ ...entryFor(endpoint), value: fileApiKey });
      return { apiKey: fileApiKey, persistedState: withPersistedApiKey({ persistedState, apiKey: null, endpoint }) };
    }
    return { apiKey: (await store.get(entryFor(endpoint))) || undefined, persistedState };
  } catch {
    return { apiKey: fileApiKey, persistedState };
  }
};

/** Saves (or, with null, removes) the API key for the endpoint and returns the state to persist. */
export const storeApiKey = async ({
  persistedState,
  apiKey,
  endpoint = STACKTAPE_TRPC_API_ENDPOINT,
  store = getSystemCredentialStore()
}: {
  persistedState: PersistedState;
  apiKey: string | null;
  endpoint?: string;
  store?: CredentialStore;
}): Promise<PersistedState> => {
  if (store) {
    try {
      if (apiKey) {
        await store.set({ ...entryFor(endpoint), value: apiKey });
      } else {
        await store.delete(entryFor(endpoint));
      }
      return withPersistedApiKey({ persistedState, apiKey: null, endpoint });
    } catch {
      // The store is unavailable: the state file holds the key instead.
    }
  }
  return withPersistedApiKey({ persistedState, apiKey, endpoint });
};
