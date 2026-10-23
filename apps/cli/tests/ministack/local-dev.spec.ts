import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { CreateRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import {
  CreateFunctionCommand,
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand
} from '@aws-sdk/client-lambda';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { globalStateManager } from '@application-services/global-state-manager';
import { applicationManager } from '@application-services/application-manager';
import { configManager } from '@domain-services/config-manager';
import type { ValidatedAwsCredentials } from '../../src/aws/credentials';
import { getAgentTokenFile, startAgentServer, stopAgentServer } from '../../src/commands/dev/agent-server';
import {
  detectLambdasNeedingTunnels,
  registerLambdaEnvCleanupHook,
  updateLambdaEnvVarsWithTunnels
} from '../../src/commands/dev/lambda-env-manager';

let ministack: MiniStack;
let lambda: LambdaClient;
let iam: IAMClient;
let directory: string;
const originals = {
  KEEP: 'untouched',
  STP_DB_CONNECTION_STRING: 'postgresql://deployed:5432/production',
  STP_DB_HOST: 'deployed',
  STP_DB_PORT: '5432'
};
const functionName = 'localdev-test-api';

beforeAll(async () => {
  ministack = await startMiniStack({ label: 't07-dev' });
  const account = ministack.account();
  Object.assign(process.env, ministack.childEnvironment(account), { AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'false' });
  delete process.env.AWS_SESSION_TOKEN;
  const clientConfig = ministack.clientConfig(account);
  lambda = new LambdaClient(clientConfig);
  iam = new IAMClient(clientConfig);
  directory = await mkdtemp(join(tmpdir(), 'stacktape-local-dev-'));
  globalStateManager.rawArgs = { stage: 'test', region: 'eu-west-1' };
  globalStateManager.targetStack = {
    stackName: 'localdev-test',
    stage: 'test',
    projectName: 'localdev',
    globallyUniqueStackHash: 'test'
  };
  globalStateManager.credentials = {
    ...clientConfig.credentials,
    identity: { account: account.accountId, arn: `arn:aws:iam::${account.accountId}:user/test` }
  } as ValidatedAwsCredentials;
  const role = await iam.send(
    new CreateRoleCommand({
      RoleName: 'dev-lambda',
      AssumeRolePolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      })
    })
  );
  const code = new AdmZip();
  code.addFile('index.js', Buffer.from('exports.handler = async () => "ok";'));
  await lambda.send(
    new CreateFunctionCommand({
      FunctionName: functionName,
      Role: role.Role!.Arn!,
      Runtime: 'nodejs22.x',
      Handler: 'index.handler',
      Code: { ZipFile: code.toBuffer() },
      Environment: { Variables: originals }
    })
  );
}, 120_000);

afterAll(async () => {
  stopAgentServer();
  lambda?.destroy();
  iam?.destroy();
  if (directory) await rm(directory, { recursive: true, force: true });
  await ministack?.stop();
});

test.each(['postgresql://deployed:5432/production', 'postgresql://olduser:oldpass@localhost:5432/oldDb'])(
  'dev switches a function from %s to local tunnel params and restores it',
  async (originalConnection) => {
    const original = { ...originals, STP_DB_CONNECTION_STRING: originalConnection };
    await lambda.send(
      new UpdateFunctionConfigurationCommand({ FunctionName: functionName, Environment: { Variables: original } })
    );
    // Seed authored function selection; discovery and AWS reads/updates remain production code.
    configManager.setStackContext({
      accountId: globalStateManager.credentials.identity.account,
      command: 'dev',
      globallyUniqueStackHash: 'test',
      invocationId: 'test',
      projectName: 'localdev',
      region: 'eu-west-1',
      stackName: 'localdev-test',
      stage: 'test',
      workingDir: directory
    });
    configManager.config = {
      resources: {
        api: {
          type: 'function',
          properties: {
            packaging: { type: 'custom-artifact', properties: { packagePath: 'unused.zip', handler: 'index:handler' } },
            connectTo: ['db']
          }
        }
      }
    };
    const { lambdasNeedingTunnels, skippedLambdas } = await detectLambdasNeedingTunnels(['db']);
    expect(skippedLambdas).toEqual([]);
    expect(lambdasNeedingTunnels).toEqual([{ name: 'api', functionName, referencedLocalResources: ['db'] }]);
    const localConnection = 'postgresql://localuser:localpass@127.0.0.1:15432/localdb';
    registerLambdaEnvCleanupHook();
    try {
      const result = await updateLambdaEnvVarsWithTunnels({
        lambdas: lambdasNeedingTunnels,
        // This scenario observes Lambda configuration. Relay reachability is qualified by the live dev lane.
        tunnels: [
          {
            resourceName: 'db',
            localPort: 15432,
            publicHost: 'relay.example',
            publicPort: 25432,
            process: {
              kill() {},
              killed: false,
              exitCode: null,
              on() {
                return this;
              }
            }
          }
        ],
        localResources: [
          {
            name: 'db',
            type: 'postgres',
            version: '16.4',
            port: 15432,
            actualPort: 15432,
            dataDir: directory,
            containerName: 'unused',
            host: '127.0.0.1',
            connectionString: localConnection,
            referencableParams: {
              connectionString: localConnection,
              host: '127.0.0.1',
              port: '15432',
              dbName: 'localdb'
            }
          }
        ]
      });
      expect(result).toEqual({ updated: ['api'], failed: [] });
      const active = (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName })))
        .Environment?.Variables;
      expect(active).toEqual({
        KEEP: 'untouched',
        STP_DB_CONNECTION_STRING: 'postgresql://localuser:localpass@relay.example:25432/localdb',
        STP_DB_HOST: 'relay.example',
        STP_DB_PORT: '25432',
        STP_DB_DB_NAME: 'localdb'
      });
    } finally {
      await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));
    }
    expect(
      (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))).Environment?.Variables
    ).toEqual(original);
  },
  45_000
);

test('an update accepted by Lambda but reported failed is still restored during dev cleanup', async () => {
  await lambda.send(
    new UpdateFunctionConfigurationCommand({ FunctionName: functionName, Environment: { Variables: originals } })
  );
  registerLambdaEnvCleanupHook();
  const transport = globalThis.fetch;
  let accepted = false;
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
      const response = await transport(input, options);
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (url.origin === ministack.endpoint && url.pathname.endsWith('/configuration')) {
        const method = options?.method ?? (input instanceof Request ? input.method : 'GET');
        if (method === 'PUT' && response.ok) accepted = true;
        if (accepted && method === 'GET' && response.ok) {
          const body = (await response.json()) as Record<string, unknown>;
          // Deliberate fault injection after the real SDK update has changed MiniStack state.
          return new Response(
            JSON.stringify({ ...body, LastUpdateStatus: 'Failed', LastUpdateStatusReason: 'injected update failure' }),
            { status: 200, headers: response.headers }
          );
        }
      }
      return response;
    },
    transport
  );
  try {
    const result = await updateLambdaEnvVarsWithTunnels({
      lambdas: [{ name: 'api', functionName, referencedLocalResources: ['db'] }],
      tunnels: [
        {
          resourceName: 'db',
          localPort: 15432,
          publicHost: 'relay.example',
          publicPort: 25432,
          process: {
            kill() {},
            killed: false,
            exitCode: null,
            on() {
              return this;
            }
          }
        }
      ],
      localResources: [
        {
          name: 'db',
          type: 'postgres',
          version: '16.4',
          port: 15432,
          actualPort: 15432,
          dataDir: directory,
          containerName: 'unused',
          host: '127.0.0.1',
          connectionString: 'postgresql://localhost:15432/localdb',
          referencableParams: { connectionString: 'postgresql://localhost:15432/localdb' }
        }
      ]
    });
    expect(accepted).toBeTrue();
    expect(result).toEqual({ updated: [], failed: ['api'] });
  } finally {
    globalThis.fetch = transport;
    await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));
  }
  expect(
    (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))).Environment?.Variables
  ).toEqual(originals);
}, 30_000);

test('the dev agent exposes reviewed reads with redacted values and refuses mutations and secret reads', async () => {
  await lambda.send(
    new UpdateFunctionConfigurationCommand({ FunctionName: functionName, Environment: { Variables: originals } })
  );
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  await startAgentServer(port, directory);
  const token = await readFile(getAgentTokenFile()!, 'utf8');
  const call = async (
    command: string,
    service = 'lambda',
    input: Record<string, unknown> = { FunctionName: functionName }
  ) => {
    const response = await fetch(`http://127.0.0.1:${port}/aws/sdk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ service, command, input, region: 'eu-west-1' })
    });
    return (await response.json()) as { ok: boolean; message: string; data?: { data?: Record<string, unknown> } };
  };
  try {
    expect(await call('GetFunctionConfiguration')).toMatchObject({
      ok: true,
      data: {
        data: {
          FunctionName: functionName,
          Environment: { Variables: { KEEP: '[redacted]', STP_DB_CONNECTION_STRING: '[redacted]' } }
        }
      }
    });
    for (const [service, command, input] of [
      ['lambda', 'DeleteFunction', { FunctionName: functionName }],
      ['secretsmanager', 'GetSecretValue', { SecretId: 'db' }]
    ] as const) {
      const result = await call(command, service, input);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('is not an accepted read-only operation');
    }
    // An independent SDK still finds the function and its untouched values after the denied mutation.
    expect(
      (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))).Environment?.Variables
    ).toEqual(originals);
  } finally {
    stopAgentServer();
  }
}, 30_000);
