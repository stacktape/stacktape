import { describe, expect, test } from 'bun:test';
import type { PersistedState } from './types';
import { getPersistedApiKey, withPersistedApiKey } from './api-key-storage';

const productionEndpoint = 'https://api.stacktape.com';
const developmentEndpoint = 'https://dev-api.stacktape.com';

const state = (productionApiKey: string | null = 'production-key'): PersistedState => ({
  systemId: 'system-id',
  cliArgsDefaults: {},
  otherDefaults: { apiKey: productionApiKey }
});

describe('endpoint-scoped API key storage', () => {
  test('keeps reading the legacy key for the production API', () => {
    expect(getPersistedApiKey({ persistedState: state(), endpoint: `${productionEndpoint}/` })).toBe('production-key');
  });

  test('never sends the legacy production key to the development API', () => {
    expect(getPersistedApiKey({ persistedState: state(), endpoint: developmentEndpoint })).toBeUndefined();
  });

  test('stores a development key without replacing the production key', () => {
    const updated = withPersistedApiKey({
      persistedState: state(),
      endpoint: developmentEndpoint,
      apiKey: 'development-key'
    });

    expect(updated.otherDefaults.apiKey).toBe('production-key');
    expect(getPersistedApiKey({ persistedState: updated, endpoint: productionEndpoint })).toBe('production-key');
    expect(getPersistedApiKey({ persistedState: updated, endpoint: developmentEndpoint })).toBe('development-key');
  });

  test('keeps the legacy production slot in sync for released CLI versions', () => {
    const updated = withPersistedApiKey({
      persistedState: state('old-production-key'),
      endpoint: productionEndpoint,
      apiKey: 'new-production-key'
    });

    expect(updated.otherDefaults.apiKey).toBe('new-production-key');
    expect(updated.authentication?.apiKeysByEndpoint?.[productionEndpoint]).toBe('new-production-key');
  });

  test('logging out of development leaves production authenticated', () => {
    const withBothKeys = withPersistedApiKey({
      persistedState: state(),
      endpoint: developmentEndpoint,
      apiKey: 'development-key'
    });
    const updated = withPersistedApiKey({
      persistedState: withBothKeys,
      endpoint: developmentEndpoint,
      apiKey: null
    });

    expect(getPersistedApiKey({ persistedState: updated, endpoint: developmentEndpoint })).toBeUndefined();
    expect(getPersistedApiKey({ persistedState: updated, endpoint: productionEndpoint })).toBe('production-key');
  });
});
