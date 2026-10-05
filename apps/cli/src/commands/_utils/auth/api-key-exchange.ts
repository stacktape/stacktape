import { publicApiClient } from '@stacktape-api/public';

export type ApiKeyResult = { success: boolean; apiKey?: string; error?: string };

/**
 * Turning a Cognito ID token into the API key the CLI stores, without asking anyone anything.
 *
 * A user in several organizations has to say which one this machine works in. How that is asked is
 * the caller's business — a select prompt in the terminal, a list in the init wizard — so this
 * returns the options and a way to finish rather than prompting.
 */
export type ApiKeyExchange =
  | { status: 'ready'; apiKey: string }
  | {
      status: 'choose-organization';
      /** `id` is only a handle for `complete`. It is safe to show; it is never the API key. */
      options: Array<{ id: string; name: string }>;
      complete: (optionId: string) => Promise<ApiKeyResult>;
    }
  | { status: 'failed'; error: string };

export const startApiKeyExchange = async (idToken: string): Promise<ApiKeyExchange> => {
  const organizationResult = await publicApiClient.exchangeTokenForApiKey({ idToken, listOrganizationsOnly: true });

  // Compatibility with Console versions that ignore listOrganizationsOnly and
  // return the legacy one-key-per-organization response immediately.
  if (organizationResult.success && organizationResult.apiKeys?.length && !organizationResult.organizations?.length) {
    const apiKeys = organizationResult.apiKeys;
    if (apiKeys.length === 1) {
      return { status: 'ready', apiKey: apiKeys[0]!.id };
    }
    return {
      status: 'choose-organization',
      // A key's id is the key itself, so the options are numbered instead of identified by it.
      options: apiKeys.map((key, index) => ({ id: String(index), name: key.organizationName })),
      complete: async (optionId) => {
        const chosen = apiKeys[Number(optionId)];
        return chosen === undefined
          ? { success: false, error: 'Authentication failed. No API key found.' }
          : { success: true, apiKey: chosen.id };
      }
    };
  }

  if (!organizationResult.success || !organizationResult.organizations?.length) {
    return { status: 'failed', error: organizationResult.error || 'Authentication failed. No organization found.' };
  }

  const organizations = organizationResult.organizations;
  const complete = async (organizationId: string): Promise<ApiKeyResult> => {
    const exchangeResult = await publicApiClient.exchangeTokenForApiKey({ idToken, organizationId });

    if (!exchangeResult.success || !exchangeResult.apiKeys?.[0]) {
      return { success: false, error: exchangeResult.error || 'Authentication failed. No API key found.' };
    }

    return { success: true, apiKey: exchangeResult.apiKeys[0].id };
  };

  if (organizations.length === 1) {
    const only = await complete(organizations[0]!.id);
    return only.success && only.apiKey
      ? { status: 'ready', apiKey: only.apiKey }
      : { status: 'failed', error: only.error || 'Authentication failed. No API key found.' };
  }

  return {
    status: 'choose-organization',
    options: organizations.map(({ id, name }) => ({ id, name })),
    complete
  };
};
