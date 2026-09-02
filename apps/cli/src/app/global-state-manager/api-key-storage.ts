import type { PersistedState } from './types';
import { STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT, STACKTAPE_TRPC_API_ENDPOINT } from '../../config/params';

const normalizeEndpoint = (endpoint: string) => {
  try {
    return new URL(endpoint).toString().replace(/\/$/, '');
  } catch {
    return endpoint.trim().replace(/\/$/, '');
  }
};

export const getPersistedApiKey = ({
  persistedState,
  endpoint = STACKTAPE_TRPC_API_ENDPOINT
}: {
  persistedState: PersistedState;
  endpoint?: string;
}) => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const endpointKey = persistedState.authentication?.apiKeysByEndpoint?.[normalizedEndpoint];
  if (endpointKey) {
    return endpointKey;
  }

  // Existing Stacktape versions stored the production key as a configurable default. Keep reading
  // that slot for production so upgrades do not log users out. It must never be reused for dev or
  // custom control planes, whose API keys are issued by a different backend.
  if (normalizedEndpoint === normalizeEndpoint(STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT)) {
    return persistedState.otherDefaults?.apiKey;
  }

  return undefined;
};

export const withPersistedApiKey = ({
  persistedState,
  apiKey,
  endpoint = STACKTAPE_TRPC_API_ENDPOINT
}: {
  persistedState: PersistedState;
  apiKey: string | null;
  endpoint?: string;
}): PersistedState => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const apiKeysByEndpoint = { ...persistedState.authentication?.apiKeysByEndpoint };

  if (apiKey) {
    apiKeysByEndpoint[normalizedEndpoint] = apiKey;
  } else {
    delete apiKeysByEndpoint[normalizedEndpoint];
  }

  const isProductionEndpoint = normalizedEndpoint === normalizeEndpoint(STACKTAPE_PRODUCTION_TRPC_API_ENDPOINT);
  return {
    ...persistedState,
    otherDefaults: {
      ...persistedState.otherDefaults,
      // Retain the legacy production slot while released CLI versions still read it. Dev and
      // custom-endpoint logins deliberately leave it untouched.
      ...(isProductionEndpoint ? { apiKey } : {})
    },
    authentication: { ...persistedState.authentication, apiKeysByEndpoint }
  };
};
