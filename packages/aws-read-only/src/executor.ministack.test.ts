import { afterAll, beforeAll, expect, test } from 'bun:test';
import { CloudFormationClient, CreateStackCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { ECSClient, RegisterTaskDefinitionCommand } from '@aws-sdk/client-ecs';
import { CreateSecretCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { executeAwsSdkCommand } from './executor';

let ministack: MiniStack;
let previousEnvironment: NodeJS.ProcessEnv;
const secretValue = 'incident-fixture-value-that-must-not-leave';

beforeAll(async () => {
  previousEnvironment = { ...process.env };
  ministack = await startMiniStack({ label: 'read-only-executor' });
  Object.assign(process.env, ministack.childEnvironment());
  const cfn = new CloudFormationClient(ministack.clientConfig());
  const secrets = new SecretsManagerClient(ministack.clientConfig());
  const ssm = new SSMClient(ministack.clientConfig());
  const ecs = new ECSClient(ministack.clientConfig());
  try {
    await secrets.send(new CreateSecretCommand({ Name: 'db', SecretString: secretValue }));
    await ssm.send(new PutParameterCommand({ Name: '/app/db-password', Type: 'SecureString', Value: secretValue }));
    await ecs.send(
      new RegisterTaskDefinitionCommand({
        family: 'orders',
        containerDefinitions: [
          {
            name: 'api',
            image: 'orders:42',
            memory: 128,
            environment: [{ name: 'API_TOKEN', value: secretValue }],
            secrets: [{ name: 'DB_PASSWORD', valueFrom: 'arn:aws:secretsmanager:eu-west-1:000000000000:secret:db' }]
          }
        ]
      })
    );
    await cfn.send(
      new CreateStackCommand({
        StackName: 'orders',
        TemplateBody: JSON.stringify({
          Resources: {
            Function: {
              Type: 'AWS::Lambda::Function',
              Properties: {
                FunctionName: 'orders',
                Runtime: 'nodejs22.x',
                Handler: 'index.handler',
                MemorySize: 512,
                Role: 'arn:aws:iam::000000000000:role/fixture',
                Code: { ZipFile: 'exports.handler = async () => ({ statusCode: 200 });' },
                Environment: { Variables: { DATABASE_URL: secretValue, STAGE: secretValue } }
              }
            }
          }
        })
      })
    );
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      // oxlint-disable-next-line no-await-in-loop -- wait for this stack's terminal state.
      const stack = (await cfn.send(new DescribeStacksCommand({ StackName: 'orders' }))).Stacks?.[0];
      if (stack?.StackStatus === 'CREATE_COMPLETE') return;
      if (stack?.StackStatus?.includes('FAILED') || stack?.StackStatus?.includes('ROLLBACK'))
        throw new Error(`Fixture stack failed: ${stack.StackStatusReason}`);
      // oxlint-disable-next-line no-await-in-loop -- readiness polling.
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Fixture stack did not become ready.');
  } finally {
    for (const client of [cfn, secrets, ssm, ecs]) client.destroy();
  }
}, 120_000);

afterAll(async () => {
  process.env = previousEnvironment;
  await ministack?.stop();
});

const call = (service: string, operation: string, input: Record<string, unknown> = {}) =>
  executeAwsSdkCommand(service, operation, input, ministack.clientConfig());

test('an investigation reads real metadata and receives environment names with every value masked', async () => {
  expect(await call('secretsmanager', 'DescribeSecret', { SecretId: 'db' })).toMatchObject({
    ok: true,
    data: { Name: 'db' }
  });
  expect(await call('ssm', 'DescribeParameters')).toMatchObject({
    ok: true,
    data: { Parameters: [expect.objectContaining({ Name: '/app/db-password', Type: 'SecureString' })] }
  });
  for (const [operation, input] of [
    ['GetFunctionConfiguration', { FunctionName: 'orders' }],
    ['GetFunction', { FunctionName: 'orders' }],
    ['ListFunctions', {}],
    ['ListVersionsByFunction', { FunctionName: 'orders' }]
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop -- each operation must return masked data.
    const result = await call('lambda', operation, input);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(secretValue);
    expect(JSON.stringify(result)).toContain('DATABASE_URL');
    expect(JSON.stringify(result)).toContain('[redacted]');
  }
  expect(await call('ecs', 'DescribeTaskDefinition', { taskDefinition: 'orders' })).toMatchObject({
    ok: true,
    data: {
      taskDefinition: {
        containerDefinitions: [
          expect.objectContaining({
            image: 'orders:42',
            environment: [{ name: 'API_TOKEN', value: '[redacted]' }],
            secrets: [expect.objectContaining({ name: 'DB_PASSWORD' })]
          })
        ]
      }
    }
  });
}, 30_000);

test('refused writes and plaintext reads leave the actual parameter intact and disclose no stored value', async () => {
  for (const [service, operation, input] of [
    ['ssm', 'GetParameter', { Name: '/app/db-password', WithDecryption: true }],
    ['ssm', 'GetParameters', { Names: ['/app/db-password'], WithDecryption: true }],
    ['ssm', 'GetParametersByPath', { Path: '/app', WithDecryption: true }],
    ['ssm', 'GetParameterHistory', { Name: '/app/db-password', WithDecryption: true }],
    ['ssm', 'DeleteParameterCommand', { Name: '/app/db-password' }],
    ['secretsmanager', 'GetSecretValue', { SecretId: 'db' }],
    ['LAMBDA', 'DeleteFunctionCommand', { FunctionName: 'orders' }]
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop -- assert each refusal independently.
    const result = await call(service, operation, input);
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('is not an accepted read-only operation')
    });
    expect(JSON.stringify(result)).not.toContain(secretValue);
  }
  const client = new SSMClient(ministack.clientConfig());
  try {
    expect(
      (await client.send(new GetParameterCommand({ Name: '/app/db-password', WithDecryption: true }))).Parameter?.Value
    ).toBe(secretValue);
  } finally {
    client.destroy();
  }
  expect((await call('lambda', 'GetFunctionConfiguration', { FunctionName: 'orders' })).ok).toBe(true);
}, 30_000);
