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
import type { ValidatedAwsCredentials } from '../../src/aws/credentials';
import { getAgentTokenFile, startAgentServer, stopAgentServer } from '../../src/commands/dev/agent-server';
import { initDevAgentCredentials } from '../../src/commands/dev/dev-agent-credentials';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { createDevNetworkAws } from '@domain-services/dev-network';
import { ensureLeases, releaseStackLeases } from '@domain-services/dev-network/leases';
import { getDevNetworkLeaseParameterPrefix } from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';

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
  // The agent server below keeps its session token here instead of in the user's state directory.
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'dev-agent-tokens');
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

test('dev network leases persist in Parameter Store and are released with their stage', async () => {
  awsSdkManager.init({ ...ministack.clientConfig(ministack.account()), region: 'eu-west-1', plugins: [] });
  const store = createDevNetworkAws().leases;
  const networkName = 'stacktape-dev-network-ministack';
  const first = await ensureLeases({ store, networkName, stackName: 'localdev-test', resourceNames: ['db', 'cache'] });
  expect(new Set(first.values()).size).toBe(2);
  // The next session of the same stage reads the same ports, so its deployed environment stays valid.
  expect(
    await ensureLeases({ store, networkName, stackName: 'localdev-test', resourceNames: ['db', 'cache'] })
  ).toEqual(first);
  // Creating a lease that exists (another session was first) keeps the stored port.
  const dbLease = `${getDevNetworkLeaseParameterPrefix(networkName)}/localdev-test/db`;
  await store.create(dbLease, '29999');
  expect(
    (await store.list(getDevNetworkLeaseParameterPrefix(networkName))).find(({ name }) => name === dbLease)?.value
  ).toBe(String(first.get('db')));
  expect(await releaseStackLeases({ store, networkName, stackName: 'localdev-test' })).toBe(2);
  expect(await store.list(getDevNetworkLeaseParameterPrefix(networkName))).toEqual([]);
}, 30_000);

test('the dev agent exposes reviewed reads with redacted values and refuses mutations and secret reads', async () => {
  // The agent reads AWS only through the dev stack's dev agent role, assumed with the selected credentials.
  const account = ministack.account();
  awsSdkManager.init({ ...ministack.clientConfig(account), region: 'eu-west-1', plugins: [] });
  const agentRole = await iam.send(
    new CreateRoleCommand({
      RoleName: 'localdev-test-dev-agent',
      AssumeRolePolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: `arn:aws:iam::${account.accountId}:root` },
            Action: 'sts:AssumeRole',
            Condition: { StringEquals: { 'sts:ExternalId': 'test' } }
          }
        ]
      })
    })
  );
  Object.defineProperty(deployedStackOverviewManager, 'stackInfoMap', {
    configurable: true,
    value: {
      customOutputs: { DevAgentRoleArn: agentRole.Role!.Arn },
      metadata: { [stackMetadataNames.devAgentRoleExternalId()]: { value: 'test' } }
    }
  });
  expect(initDevAgentCredentials()).toBe(true);
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
