import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import {
  answerWithEnvironments,
  environmentValue,
  startLoopbackAwsEndpoint
} from '@stacktape/aws-read-only/fixtures/loopback-aws-endpoint';
import type { ValidatedAwsCredentials } from 'src/aws/credentials';
import { startAgentServer, stopAgentServer } from './agent-server';

let endpoint: Awaited<ReturnType<typeof startLoopbackAwsEndpoint>>;
let logDirectory: string;
let agentUrl: string;

const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolvePort(port));
    });
  });

beforeAll(async () => {
  endpoint = await startLoopbackAwsEndpoint();
  // Without a deployed dev agent role, the endpoint signs with the user's own credentials, as a local session does.
  globalStateManager.credentials = {
    ...globalStateManager.credentials,
    accessKeyId: 'loopback-test',
    secretAccessKey: 'loopback-test'
  } as ValidatedAwsCredentials;
  logDirectory = await mkdtemp(join(tmpdir(), 'stacktape-agent-aws-sdk-'));
  const port = await findFreePort();
  await startAgentServer(port, logDirectory);
  agentUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  stopAgentServer();
  await endpoint.close();
  await rm(logDirectory, { recursive: true, force: true });
});

beforeEach(() => {
  endpoint.requests.length = 0;
  endpoint.respondWith(undefined);
});

const callAws = async (body: Record<string, unknown>) => {
  const response = await fetch(`${agentUrl}/aws/sdk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region: 'eu-west-1', ...body })
  });
  return (await response.json()) as { ok: boolean; message: string; data?: Record<string, unknown> };
};

describe('dev agent AWS SDK endpoint', () => {
  test('refuses mutating and secret-value operations before anything reaches AWS', async () => {
    for (const body of [
      { service: 'lambda', command: 'DeleteFunction', input: { FunctionName: 'orders' } },
      { service: 'dynamodb', command: 'PutItem', input: { TableName: 'orders', Item: { id: { S: '1' } } } },
      { service: 'secretsmanager', command: 'GetSecretValue', input: { SecretId: 'db' } }
    ]) {
      const response = await callAws(body);
      expect(response.ok).toBe(false);
      expect(response.message).toContain('is not an accepted read-only operation');
    }

    expect(endpoint.requests).toEqual([]);
  });

  test('returns a function configuration with environment values redacted', async () => {
    endpoint.respondWith(answerWithEnvironments);
    const response = await fetch(`${agentUrl}/aws/sdk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        region: 'eu-west-1',
        service: 'lambda',
        command: 'GetFunctionConfiguration',
        input: { FunctionName: 'orders' }
      })
    });
    const body = await response.text();

    expect(body).not.toContain(environmentValue);
    expect(JSON.parse(body)).toMatchObject({
      ok: true,
      data: { data: { FunctionName: 'orders', Environment: { Variables: { DATABASE_URL: '[redacted]' } } } }
    });
  });

  test('still sends a reviewed read', async () => {
    expect(await callAws({ service: 'lambda', command: 'ListFunctions' })).toMatchObject({
      ok: true,
      data: { data: { Functions: [] } }
    });
    expect(endpoint.requests).toHaveLength(1);
  });
});
