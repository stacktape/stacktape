import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PersistedState } from './types';
import { type CredentialStore, getSystemCredentialStore, loadApiKey, storeApiKey } from './credential-store';
import { savePersistedState } from './utils';

const productionEndpoint = 'https://api.stacktape.com';
const customEndpoint = 'http://127.0.0.1:4321/stacktape-api';

const state = (overrides: Partial<PersistedState> = {}): PersistedState => ({
  systemId: 'system-id',
  cliArgsDefaults: { region: 'eu-west-1' },
  otherDefaults: {},
  ...overrides
});

/** An operating-system store that works, kept in memory. */
const workingStore = () => {
  const entries = new Map<string, string>();
  const key = ({ service, name }: { service: string; name: string }) => `${service}|${name}`;
  const store: CredentialStore = {
    get: async (entry) => entries.get(key(entry)) ?? null,
    set: async (entry) => {
      entries.set(key(entry), entry.value);
    },
    delete: async (entry) => entries.delete(key(entry))
  };
  return { store, entries };
};

/** What `Bun.secrets` does where no Secret Service exists (WSL, containers): every call throws at once. */
const unavailableStore: CredentialStore = {
  get: async () => {
    throw Object.assign(new Error('libsecret not available'), { code: 'ERR_SECRETS_PLATFORM_ERROR' });
  },
  set: async () => {
    throw Object.assign(new Error('libsecret not available'), { code: 'ERR_SECRETS_PLATFORM_ERROR' });
  },
  delete: async () => {
    throw Object.assign(new Error('libsecret not available'), { code: 'ERR_SECRETS_PLATFORM_ERROR' });
  }
};

const restoreStoreSetting = (previous: string | undefined) => {
  if (previous === undefined) delete process.env.STACKTAPE_CREDENTIAL_STORE;
  else process.env.STACKTAPE_CREDENTIAL_STORE = previous;
};

// Reading an absent entry is harmless where a store works; where it does not, every call throws at once.
const isRealStoreUnavailable = () =>
  Bun.secrets
    .get({ service: 'stacktape-test-probe', name: 'absent' })
    .then(() => false)
    .catch(() => true);

describe('CLI session storage', () => {
  test('a working credential store holds the key and the state file keeps no plaintext copy', async () => {
    const { store, entries } = workingStore();
    const saved = await storeApiKey({
      persistedState: state(),
      apiKey: 'stp_live_session',
      endpoint: `${customEndpoint}/`,
      store
    });

    expect(JSON.stringify(saved)).not.toContain('stp_live_session');
    expect(saved.cliArgsDefaults).toEqual({ region: 'eu-west-1' });
    expect([...entries]).toEqual([[`stacktape|${customEndpoint}`, 'stp_live_session']]);
    expect(await loadApiKey({ persistedState: saved, endpoint: customEndpoint, store })).toEqual({
      apiKey: 'stp_live_session',
      persistedState: saved
    });
    // Another endpoint's control plane issued none of this machine's keys.
    expect((await loadApiKey({ persistedState: saved, endpoint: 'http://127.0.0.1:1', store })).apiKey).toBeUndefined();

    const removed = await storeApiKey({ persistedState: saved, apiKey: null, endpoint: customEndpoint, store });
    expect(entries.size).toBe(0);
    expect((await loadApiKey({ persistedState: removed, endpoint: customEndpoint, store })).apiKey).toBeUndefined();
  });

  test('a key in the state file moves into a working store, including the legacy production slot', async () => {
    const { store, entries } = workingStore();
    const old = state({
      otherDefaults: { apiKey: 'stp_live_legacy' },
      authentication: { apiKeysByEndpoint: { [customEndpoint]: 'stp_live_custom' } }
    });

    const production = await loadApiKey({ persistedState: old, endpoint: productionEndpoint, store });
    expect(production.apiKey).toBe('stp_live_legacy');
    expect(production.persistedState.otherDefaults.apiKey).toBeNull();
    expect(entries.get(`stacktape|${productionEndpoint}`)).toBe('stp_live_legacy');

    const custom = await loadApiKey({ persistedState: production.persistedState, endpoint: customEndpoint, store });
    expect(custom.apiKey).toBe('stp_live_custom');
    expect(JSON.stringify(custom.persistedState)).not.toContain('stp_live_');
    expect(custom.persistedState.cliArgsDefaults).toEqual({ region: 'eu-west-1' });

    // Once moved, reading changes nothing.
    const again = await loadApiKey({ persistedState: custom.persistedState, endpoint: customEndpoint, store });
    expect(again).toEqual({ apiKey: 'stp_live_custom', persistedState: custom.persistedState });
  });

  test('an unavailable store leaves the key in the state file', async () => {
    const saved = await storeApiKey({
      persistedState: state(),
      apiKey: 'stp_live_file',
      endpoint: customEndpoint,
      store: unavailableStore
    });
    expect(saved.authentication?.apiKeysByEndpoint?.[customEndpoint]).toBe('stp_live_file');
    expect(await loadApiKey({ persistedState: saved, endpoint: customEndpoint, store: unavailableStore })).toEqual({
      apiKey: 'stp_live_file',
      persistedState: saved
    });
    const removed = await storeApiKey({
      persistedState: saved,
      apiKey: null,
      endpoint: customEndpoint,
      store: unavailableStore
    });
    expect(removed.authentication?.apiKeysByEndpoint?.[customEndpoint]).toBeUndefined();
  });

  test("falls back to the state file where this machine's Bun.secrets is unavailable", async () => {
    // This test never writes to a working store; the substitute above covers that path.
    if (!(await isRealStoreUnavailable())) return;
    const previous = process.env.STACKTAPE_CREDENTIAL_STORE;
    delete process.env.STACKTAPE_CREDENTIAL_STORE;
    try {
      expect(getSystemCredentialStore()).toBe(Bun.secrets);
      const saved = await storeApiKey({ persistedState: state(), apiKey: 'stp_live_real', endpoint: customEndpoint });
      expect(saved.authentication?.apiKeysByEndpoint?.[customEndpoint]).toBe('stp_live_real');
      expect((await loadApiKey({ persistedState: saved, endpoint: customEndpoint })).apiKey).toBe('stp_live_real');
    } finally {
      restoreStoreSetting(previous);
    }
  });

  test('STACKTAPE_CREDENTIAL_STORE=file forces the state file', () => {
    const previous = process.env.STACKTAPE_CREDENTIAL_STORE;
    try {
      process.env.STACKTAPE_CREDENTIAL_STORE = 'file';
      expect(getSystemCredentialStore()).toBeUndefined();
      delete process.env.STACKTAPE_CREDENTIAL_STORE;
      expect(getSystemCredentialStore()).toBe(Bun.secrets);
    } finally {
      restoreStoreSetting(previous);
    }
  });
});

describe.skipIf(process.platform === 'win32')('state file permissions', () => {
  const homes: string[] = [];
  const previousHome = process.env.HOME;
  afterEach(async () => {
    process.env.HOME = previousHome;
    for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true });
  });

  test('the state file is readable only by the user, also when an older version created it at 0644', async () => {
    const home = await mkdtemp(join(tmpdir(), 'stacktape-state-mode-'));
    homes.push(home);
    process.env.HOME = home;
    const file = join(home, '.stacktape', 'persisted-state.json');
    await mkdir(join(home, '.stacktape'));
    await writeFile(file, '{}', { mode: 0o644 });
    expect((await stat(file)).mode & 0o777).toBe(0o644);

    await savePersistedState(state({ authentication: { apiKeysByEndpoint: { [customEndpoint]: 'stp_live_file' } } }));
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(file, 'utf8')).authentication.apiKeysByEndpoint[customEndpoint]).toBe(
      'stp_live_file'
    );

    await rm(file);
    await savePersistedState(state());
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });
});
