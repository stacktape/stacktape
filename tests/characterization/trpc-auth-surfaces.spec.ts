import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ApiKeyProtectedClient } from '../../shared/trpc/api-key-protected';
import { AwsIdentityProtectedClient } from '../../shared/trpc/aws-identity-protected';
import { PublicApiClient } from '../../shared/trpc/public';

type CapturedRequest = {
  url: string;
  headers: Headers;
};

const originalFetch = globalThis.fetch;
let requests: CapturedRequest[] = [];

const trpcResponse = (data: unknown) =>
  new Response(JSON.stringify([{ result: { data } }]), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

beforeEach(() => {
  requests = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers)
    });
    return trpcResponse(true);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Console tRPC authentication surfaces', () => {
  test('public operations initialize lazily and send no privileged identity header', async () => {
    const client = new PublicApiClient();
    await client.stackPriceEstimation({
      region: 'eu-west-1',
      stack: {} as any
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('stackPriceEstimation');
    expect(requests[0].headers.has('stp_api_key')).toBe(false);
    expect(requests[0].headers.has('aws_identity')).toBe(false);
  });

  test('API-key operations fail closed before initialization', async () => {
    const client = new ApiKeyProtectedClient();

    await expect(client.canDeploy()).rejects.toThrow('ApiKeyProtectedClient not initialized');
    expect(requests).toHaveLength(0);
  });

  test('API-key operations use only the dedicated Stacktape credential header', async () => {
    const client = new ApiKeyProtectedClient();
    await client.init({ apiKey: 'stp_live_characterization_secret' });
    await client.canDeploy();

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('canDeploy');
    expect(requests[0].headers.get('stp_api_key')).toBe('stp_live_characterization_secret');
    expect(requests[0].headers.has('authorization')).toBe(false);
    expect(requests[0].headers.has('aws_identity')).toBe(false);
  });

  test('AWS-identity operations use a signed STS request instead of an API key', async () => {
    const client = new AwsIdentityProtectedClient();
    await client.init({
      credentials: {
        accessKeyId: 'STACKTAPE_TEST_KEY',
        secretAccessKey: 'stacktape-test-secret-that-is-not-an-aws-credential',
        sessionToken: 'characterization-session'
      },
      region: 'eu-west-1',
      apiUrl: 'https://example.test'
    });
    await client.validateCertificate.mutate({} as any);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('validateCertificate');
    expect(requests[0].headers.has('stp_api_key')).toBe(false);

    const encodedIdentity = requests[0].headers.get('aws_identity');
    expect(encodedIdentity).toBeTruthy();
    const signedRequest = JSON.parse(Buffer.from(encodedIdentity!, 'base64').toString('utf8'));
    expect(signedRequest.hostname).toBe('sts.eu-west-1.amazonaws.com');
    expect(signedRequest.headers.authorization).toContain('AWS4-HMAC-SHA256');
    expect(signedRequest.headers['x-amz-security-token']).toBe('characterization-session');
  });
});
