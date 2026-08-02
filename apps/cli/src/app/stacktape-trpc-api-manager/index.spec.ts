import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { TRPCClientError } from '@trpc/client';
import { CliError } from '@utils/errors';

const debug = mock((_message: string) => {});
const warn = mock((_message: string) => {});

mock.module('@application-services/tui-manager', () => ({
  tuiManager: { debug, warn }
}));

mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: {}
}));

mock.module('@application-services/operation-invocation-context', () => ({
  withStacktapeOperationInvocationContext: (args: unknown) => args
}));

mock.module('../../utils/git-info-manager', () => ({
  gitInfoManager: { gitInfo: Promise.resolve({ branch: null, commit: null, gitUrl: null }) }
}));

mock.module('../../utils/versioning', () => ({
  getStacktapeVersion: () => 'test'
}));

const originalFetch = globalThis.fetch;
const requests: Array<{ headers: Headers; url: string }> = [];

const successfulTrpcResponse = () =>
  new Response(JSON.stringify([{ result: { data: { canDeploy: true } } }]), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

const unauthorizedTrpcResponse = () =>
  new Response(
    JSON.stringify([
      {
        error: {
          code: -32_001,
          message: 'API key has expired',
          data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'canDeploy' }
        }
      }
    ]),
    { status: 401, headers: { 'content-type': 'application/json' } }
  );

let createResponse = successfulTrpcResponse;

beforeEach(() => {
  debug.mockClear();
  warn.mockClear();
  requests.length = 0;
  createResponse = successfulTrpcResponse;
  globalThis.fetch = Object.assign(
    async (...[input, init]: Parameters<typeof fetch>) => {
      requests.push({ headers: new Headers(init?.headers), url: String(input) });
      return createResponse();
    },
    { preconnect: originalFetch.preconnect }
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const trpcError = (code: 'FORBIDDEN' | 'UNAUTHORIZED', message: string) =>
  TRPCClientError.from({
    error: {
      code: code === 'FORBIDDEN' ? -32_003 : -32_001,
      message,
      data: {
        code,
        httpStatus: code === 'FORBIDDEN' ? 403 : 401,
        path: 'canDeploy'
      }
    }
  });

describe('StacktapeTrpcApiManager request boundary', () => {
  test('reinitialization keeps one instrumentation layer and uses wire procedure names with the newest key', async () => {
    const { StacktapeTrpcApiManager } = await import('./index');
    const manager = new StacktapeTrpcApiManager();

    await manager.init({ apiKey: 'stp_old_test_secret' });
    await manager.init({ apiKey: 'stp_new_test_secret' });
    await manager.apiClient.canDeploy();
    await manager.apiClient.recordStackOperation({ invocationId: 'test-invocation' });

    expect(requests).toHaveLength(2);
    expect(requests[0].headers.get('stp_api_key')).toBe('stp_new_test_secret');
    expect(requests[1].headers.get('stp_api_key')).toBe('stp_new_test_secret');
    expect(requests[0].url).toContain('canDeploy');
    expect(requests[1].url).toContain('recordStackOperation');

    const messages = debug.mock.calls.map(([message]) => message);
    expect(messages).toHaveLength(4);
    expect(messages[0]).toBe('TRPC canDeploy: start.');
    expect(messages[1]).toMatch(/^TRPC canDeploy: \d+ms\.$/);
    expect(messages[2]).toBe('TRPC recordStackOperation: start.');
    expect(messages[3]).toMatch(/^TRPC recordStackOperation: \d+ms\.$/);
  });

  test('translates a failing request and still emits one completion timing', async () => {
    const { StacktapeTrpcApiManager } = await import('./index');
    const manager = new StacktapeTrpcApiManager();
    createResponse = unauthorizedTrpcResponse;

    await manager.init({ apiKey: 'stp_expired_test_secret' });
    await expect(manager.apiClient.canDeploy()).rejects.toMatchObject({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'API key has expired.'
    });

    const messages = debug.mock.calls.map(([message]) => message);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe('TRPC canDeploy: start.');
    expect(messages[1]).toMatch(/^TRPC canDeploy: \d+ms\.$/);
  });
});

describe('Stacktape API error translation', () => {
  test.each([
    {
      source: trpcError('UNAUTHORIZED', 'API key has been revoked'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_REVOKED',
      message: 'API key has been revoked.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'API key has expired'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'API key has expired.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'Unauthorized'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_INVALID',
      message: 'Invalid API key.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'Unauthorized'),
      hasApiKey: false,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_MISSING',
      message: 'No Stacktape API key was specified.'
    },
    {
      source: trpcError('FORBIDDEN', 'Organization role cannot deploy'),
      hasApiKey: true,
      category: 'API_SERVER',
      code: 'STACKTAPE_API_PERMISSION_DENIED',
      message: 'Permission denied: Organization role cannot deploy'
    }
  ])('maps $code and preserves its tRPC cause', async ({ source, hasApiKey, category, code, message }) => {
    const { translateStacktapeApiError } = await import('./index');
    const translated = translateStacktapeApiError({ error: source, hasApiKey });

    expect(translated.category).toBe(category);
    expect(translated.code).toBe(code);
    expect(translated.message).toBe(message);
    expect(translated.cause).toBe(source);
  });

  test('retains a transport error message and cause', async () => {
    const { translateStacktapeApiError } = await import('./index');
    const source = new Error('Stacktape API request timed out');
    const translated = translateStacktapeApiError({ error: source, hasApiKey: true });

    expect(translated.code).toBe('STACKTAPE_API_REQUEST_FAILED');
    expect(translated.message).toBe(source.message);
    expect(translated.cause).toBe(source);
  });

  test('returns an existing CliError unchanged', async () => {
    const { translateStacktapeApiError } = await import('./index');
    const source = new CliError({
      category: 'API_SERVER',
      code: 'EXISTING_API_ERROR',
      message: 'Already translated'
    });

    expect(translateStacktapeApiError({ error: source, hasApiKey: true })).toBe(source);
  });
});
