import { PublicApiClient, publicApiClient } from '@stacktape-api/public';

export type ApiKeyResult = { success: boolean; apiKey?: string; error?: string };

/**
 * Turning the Better Auth session from a device-code sign-in into the CLI session key the CLI stores, without asking
 * anyone anything.
 *
 * A user in several organizations has to say which one this machine works in. How that is asked is the caller's
 * business (a select prompt in the terminal, a list in the init wizard), so this returns the options and a way to
 * finish rather than prompting. The session token stays in this closure until the key is issued; the API ends the
 * session when it issues the key.
 */
export type ApiKeyExchange =
  | { status: 'ready'; apiKey: string }
  | {
      status: 'choose-organization';
      /** `id` is the organization's ID, a handle for `complete`. It is safe to show; it is never the API key. */
      options: Array<{ id: string; name: string }>;
      complete: (organizationId: string) => Promise<ApiKeyResult>;
    }
  | { status: 'failed'; error: string };

export const startApiKeyExchange = async (
  sessionToken: string,
  { endpoint }: { endpoint?: string } = {}
): Promise<ApiKeyExchange> => {
  const client = endpoint === undefined ? publicApiClient : new PublicApiClient({ url: endpoint });
  const organizationResult = await client.exchangeTokenForApiKey({ sessionToken, listOrganizationsOnly: true });

  if (!organizationResult.success || !organizationResult.organizations?.length) {
    return { status: 'failed', error: organizationResult.error || 'Authentication failed. No organization found.' };
  }

  const organizations = organizationResult.organizations;
  const complete = async (organizationId: string): Promise<ApiKeyResult> => {
    const exchangeResult = await client.exchangeTokenForApiKey({ sessionToken, organizationId });

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
