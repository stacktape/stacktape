import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ApiKeyProtectedClient } from '../../src/api/console/api-key-protected';
import { AwsIdentityProtectedClient } from '../../src/api/console/aws-identity-protected';
import { PublicApiClient } from '../../src/api/console/public';

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
  globalThis.fetch = Object.assign(
    async (...[input, init]: Parameters<typeof fetch>) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers)
      });
      return trpcResponse(true);
    },
    { preconnect: originalFetch.preconnect }
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Console tRPC authentication surfaces', () => {
  test('public operations initialize lazily and send no privileged identity header', async () => {
    const client = new PublicApiClient();
    await client.stackPriceEstimation({
      region: 'eu-west-1',
      stackConfig: '{}'
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

/**
 * The CLI reaches the Console through `@stacktape/console-api`, which is the only description of that API
 * outside the private repository. Both sides are read back out of source here, because the property worth
 * protecting is which wire procedures the CLI calls — its own wrapper methods are named for readability
 * (`listOrganizations` calls `listOrganizationsFromCli`) and are free to differ.
 */
const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const contractProcedureNames = (surface: string, clientType: string) => {
  const source = readSource(`../../../../packages/console-api/src/${surface}.ts`);
  const body = source.slice(source.indexOf(`export type ${clientType} = {`));
  return [...body.matchAll(/^ {2}([A-Za-z0-9_]+): \{$/gm)].map((match) => match[1]).sort();
};

const calledProcedureNames = (clientModule: string) => {
  const source = readSource(`../../src/api/console/${clientModule}.ts`);
  return [...new Set([...source.matchAll(/\.([A-Za-z0-9_]+)\.(?:mutate|query)\(/g)].map((match) => match[1]))].sort();
};

describe('Console tRPC contract coverage', () => {
  test('the API-key client calls exactly the procedures the contract publishes', () => {
    expect(calledProcedureNames('api-key-protected')).toEqual(contractProcedureNames('api-key', 'ApiKeyTrpcClient'));
  });

  test('the AWS-identity client calls exactly the procedures the contract publishes', () => {
    expect(calledProcedureNames('aws-identity-protected')).toEqual(
      contractProcedureNames('aws-identity', 'AwsIdentityTrpcClient')
    );
  });

  test('the anonymous client stays within the anonymous contract', () => {
    const published = contractProcedureNames('anonymous', 'AnonymousTrpcClient');

    for (const procedure of calledProcedureNames('public')) {
      expect(published).toContain(procedure);
    }
  });
});
