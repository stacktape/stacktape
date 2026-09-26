import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import {
  answerWithEnvironments,
  environmentValue,
  startLoopbackAwsEndpoint
} from './__fixtures__/loopback-aws-endpoint';
import { executeAwsSdkCommand } from './executor';

let endpoint: Awaited<ReturnType<typeof startLoopbackAwsEndpoint>>;
const context = {
  region: 'eu-west-1',
  credentials: { accessKeyId: 'loopback-test', secretAccessKey: 'loopback-test' }
};

beforeAll(async () => {
  endpoint = await startLoopbackAwsEndpoint();
});

afterAll(async () => {
  await endpoint.close();
});

beforeEach(() => {
  endpoint.requests.length = 0;
  endpoint.respondWith(undefined);
});

describe('AWS SDK executor', () => {
  test('sends reviewed reads, including secret and parameter metadata', async () => {
    expect(await executeAwsSdkCommand('lambda', 'ListFunctions', {}, context)).toEqual({
      ok: true,
      data: { Functions: [] }
    });
    expect((await executeAwsSdkCommand('secretsmanager', 'DescribeSecret', { SecretId: 'db' }, context)).ok).toBe(true);
    expect((await executeAwsSdkCommand('ssm', 'DescribeParameters', {}, context)).ok).toBe(true);

    expect(endpoint.requests.map(({ method, target }) => target ?? method)).toEqual([
      'GET',
      'secretsmanager.DescribeSecret',
      'AmazonSSM.DescribeParameters'
    ]);
  });

  test('never sends an operation outside the reviewed list, whoever calls it and however it is spelled', async () => {
    const stateMachineArn = 'arn:aws:states:eu-west-1:123456789012:stateMachine:orders';
    const refused = [
      ['lambda', 'DeleteFunction', { FunctionName: 'orders' }],
      ['lambda', 'DeleteFunctionCommand', { FunctionName: 'orders' }],
      ['LAMBDA', 'UpdateFunctionConfiguration', { FunctionName: 'orders', Timeout: 1 }],
      ['dynamodb', 'PutItem', { TableName: 'orders', Item: { id: { S: '1' } } }],
      ['stepfunctions', 'StartExecution', { stateMachineArn }],
      ['secretsmanager', 'GetSecretValue', { SecretId: 'db' }],
      ['ssm', 'GetParameter', { Name: '/app/db-password', WithDecryption: true }],
      ['ssm', 'GetParameters', { Names: ['/app/db-password'], WithDecryption: true }],
      ['ssm', 'GetParametersByPath', { Path: '/app', WithDecryption: true }],
      ['ssm', 'GetParameterHistory', { Name: '/app/db-password', WithDecryption: true }]
    ] as const;
    const results = await Promise.all(
      refused.map(([service, command, input]) => executeAwsSdkCommand(service, command, input, context))
    );
    results.forEach((result, index) => {
      const [service, command] = refused[index]!;
      expect('error' in result ? result.error : `${service}.${command} was sent`).toContain(
        'is not an accepted read-only operation'
      );
    });

    expect(endpoint.requests).toEqual([]);
  });

  test('returns Lambda and ECS environment variable names and metadata, never their values', async () => {
    endpoint.respondWith(answerWithEnvironments);

    const results = [
      await executeAwsSdkCommand('lambda', 'GetFunctionConfiguration', { FunctionName: 'orders' }, context),
      await executeAwsSdkCommand('lambda', 'GetFunction', { FunctionName: 'orders' }, context),
      await executeAwsSdkCommand('lambda', 'ListFunctions', {}, context),
      await executeAwsSdkCommand('ecs', 'DescribeTaskDefinition', { taskDefinition: 'orders' }, context)
    ];

    expect(endpoint.requests).toHaveLength(4);
    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(JSON.stringify(result)).not.toContain(environmentValue);
    }
    const redactedConfiguration = {
      FunctionName: 'orders',
      MemorySize: 512,
      Environment: { Variables: { DATABASE_URL: '[redacted]', STAGE: '[redacted]' } }
    };
    expect(results[0]).toMatchObject({ data: redactedConfiguration });
    expect(results[1]).toMatchObject({
      data: { Configuration: redactedConfiguration, Code: { RepositoryType: 'S3' } }
    });
    expect(results[2]).toMatchObject({ data: { Functions: [redactedConfiguration] } });
    expect(results[3]).toMatchObject({
      data: {
        taskDefinition: {
          family: 'orders',
          containerDefinitions: [
            {
              image: 'orders:42',
              environment: [{ name: 'API_TOKEN', value: '[redacted]' }],
              secrets: [{ name: 'DB_PASSWORD', valueFrom: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:db' }]
            }
          ]
        }
      }
    });
  });
});
