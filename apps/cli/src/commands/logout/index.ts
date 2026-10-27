import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { ApiKeyProtectedClient } from '@stacktape-api/api-key-protected';
import { TRPCClientError } from '@trpc/client';

// Logout must not hang on an unreachable API: the key is removed from this machine either way.
const REVOKE_TIMEOUT_MS = 10_000;

type RevocationOutcome = 'revoked' | 'not-a-cli-session' | 'already-invalid' | 'unreachable';

const revokeOnServer = async (apiKey: string): Promise<RevocationOutcome> => {
  const client = new ApiKeyProtectedClient();
  await client.init({ apiKey, timeoutMs: REVOKE_TIMEOUT_MS });
  try {
    const { revoked } = await client.revokeCurrentCliSession();
    return revoked ? 'revoked' : 'not-a-cli-session';
  } catch (error) {
    // The server no longer accepts the key (revoked, expired or unknown): there is nothing left to revoke.
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      return 'already-invalid';
    }
    return 'unreachable';
  }
};

export const commandLogout = async () => {
  tuiManager.intro('Logout from Stacktape');

  const apiKey = await globalStateManager.loadStoredApiKey();
  if (!apiKey) {
    tuiManager.outro('You are not logged in on this machine.');
    return;
  }

  const outcome = await revokeOnServer(apiKey);
  await globalStateManager.saveApiKey({ apiKey: null });

  if (outcome === 'revoked') {
    tuiManager.outro('Logged out. The CLI session was revoked and removed from this machine.');
    return;
  }
  if (outcome === 'not-a-cli-session') {
    tuiManager.info(
      'The stored key is an API key, not a CLI login session, so it stays valid. Manage it in the Stacktape Console.'
    );
    tuiManager.outro('Logged out. The API key was removed from this machine.');
    return;
  }
  if (outcome === 'unreachable') {
    tuiManager.warn(
      'Stacktape could not be reached, so the CLI session was not revoked. It stays valid until it expires or is revoked in the Stacktape Console.'
    );
  }
  tuiManager.outro('Logged out. The CLI session was removed from this machine.');
};
