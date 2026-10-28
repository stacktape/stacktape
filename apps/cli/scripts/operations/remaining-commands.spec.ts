import { DynamoDBClient, CreateTableCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import stripAnsi from 'strip-ansi';
import { parse } from 'yaml';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';
import { validateConfigWithZod } from '../../src/domain/config-manager/utils/zod-validator';
import { ConsoleProcedureError } from './loopback-console';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});
const xml = (operation: string, body: unknown) => ({ kind: 'xml' as const, operation, result: toQueryXml(body) });
const noUnexpected = (fixture: Awaited<ReturnType<typeof createOperationsFixture>>) => {
  expect(fixture.aws.unexpected).toEqual([]);
  expect(fixture.api.unexpected).toEqual([]);
};
const messages = (stdout: string, command: string) =>
  parseCliJsonl(stdout, command)
    .events.filter((event) => event.type === 'log')
    .map((event) => event.message);

test('aws:call returns actual SDK data, rejects mutations before sending them, and reports service denial', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    await seedDeployedStack(fixture);
    const dynamo = new DynamoDBClient(fixture.clientConfig());
    try {
      await dynamo.send(
        new CreateTableCommand({
          TableName: 'j9-records',
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          BillingMode: 'PAY_PER_REQUEST'
        })
      );
      await dynamo.send(new PutItemCommand({ TableName: 'j9-records', Item: { id: { S: 'first' } } }));
      const args = ['aws:call', '--service', 'dynamodb', ...targetArgs, '--agent'];
      const read = await fixture.run([...args, '--command', 'Scan', '--input', '{"TableName":"j9-records","Limit":1}']);
      expect(read.exitCode, read.stdout).toBe(0);
      const result = messages(read.stdout, 'aws:call').find(
        (message) => typeof message === 'string' && message.startsWith('{')
      );
      expect(JSON.parse(result as string)).toMatchObject({
        ok: true,
        data: { Items: [{ id: { S: 'first' } }], Count: 1 }
      });
      const mutation = await fixture.run([...args, '--command', 'PutItem', '--input', '{"TableName":"j9-records"}']);
      expect(mutation.exitCode).toBe(1);
      expect(parseCliJsonl(mutation.stdout, 'aws:call').result.code).toBe('CLI_AWS_CALL_COMMAND_NOT_ALLOWED');
      expect(fixture.aws.callsTo('dynamodb.PutItem')).toHaveLength(0);
      fixture.aws.on('dynamodb.Scan', () => ({
        kind: 'error',
        code: 'AccessDeniedException',
        message: 'j9 read denied',
        status: 403
      }));
      const denied = await fixture.run([...args, '--command', 'Scan']);
      expect(denied.exitCode).toBe(1);
      expect(parseCliJsonl(denied.stdout, 'aws:call').result.code).toBe('CLI_AWS_CALL_FAILED');
      expect(denied.stdout).toContain('j9 read denied');
      expect((await dynamo.send(new ScanCommand({ TableName: 'j9-records' }))).Items).toEqual([{ id: { S: 'first' } }]);
      // Reads go through the stack's read-only debug role, assumed with its external ID.
      expect(fixture.aws.callsTo('sts.AssumeRole')[0]?.input).toMatchObject({
        RoleArn: `arn:aws:iam::${fixture.accountId}:role/j9-operations-test-debug-agent`,
        ExternalId: 'j9-debug-agent-external-id'
      });
      // A role that cannot be assumed stops the read instead of falling back to the user's broader credentials.
      const scansBefore = fixture.aws.callsTo('dynamodb.Scan').length;
      fixture.aws.on('sts.AssumeRole', () => ({
        kind: 'error',
        code: 'AccessDenied',
        message: 'j9 role denied',
        status: 403
      }));
      const refused = await fixture.run([...args, '--command', 'Scan', '--input', '{"TableName":"j9-records"}']);
      expect(refused.exitCode).toBe(1);
      expect(parseCliJsonl(refused.stdout, 'aws:call').result.code).toBe('CLI_DEBUG_AGENT_ROLE_ASSUME_FAILED');
      expect(fixture.aws.callsTo('dynamodb.Scan')).toHaveLength(scansBefore);
      // So does a stack without the role.
      await seedDeployedStack(fixture, {}, undefined, { debugAgentRole: false });
      const missing = await fixture.run([...args, '--command', 'Scan', '--input', '{"TableName":"j9-records"}']);
      expect(missing.exitCode).toBe(1);
      expect(parseCliJsonl(missing.stdout, 'aws:call').result.code).toBe('CLI_DEBUG_AGENT_ROLE_MISSING');
      expect(fixture.aws.callsTo('dynamodb.Scan')).toHaveLength(scansBefore);
      noUnexpected(fixture);
    } finally {
      dynamo.destroy();
    }
  } finally {
    await fixture.close();
  }
}, 60_000);

test('alarms:export produces pasteable YAML with notification channels and scope, handles empty and denied configuration', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    const alarm = {
      name: 'j9-errors',
      evaluation: { period: 60, breachedPeriods: 1, evaluationPeriods: 1 },
      trigger: {
        type: 'lambda-error-rate',
        properties: { thresholdPercent: 0 }
      },
      forServices: ['api'],
      forStages: ['production'],
      notificationTargets: [{ name: 'oncall', type: 'email', properties: {} }]
    };
    fixture.api.on('globalConfig', () => ({ alarms: [alarm], guardrails: [], deploymentNotifications: [] }));
    const exported = await fixture.run(['alarms:export', '--agent']);
    expect(exported.exitCode).toBe(0);
    const yaml = messages(exported.stdout, 'alarms:export').find(
      (message) => typeof message === 'string' && message.includes('# applies to')
    ) as string;
    expect(yaml).toContain('projects: api · stages: production');
    expect(yaml).toContain('j9-errors');
    const qualification = validateConfigWithZod({
      configPath: 'j9-export.ts',
      config: {
        resources: {
          api: {
            type: 'function',
            properties: {
              runtime: 'nodejs22.x',
              packaging: {
                type: 'custom-artifact',
                properties: { packagePath: './index.zip', handler: 'index.js:handler' }
              },
              alarms: parse(yaml)
            }
          }
        }
      }
    });
    expect(qualification).toEqual({ valid: true });
    const {
      name: _name,
      forServices: _projects,
      forStages: _stages,
      notificationTargets: _targets,
      ...configFields
    } = alarm;
    expect(parse(yaml)).toEqual([
      { ...configFields, notificationChannels: [{ type: 'console-channel', properties: { channelName: 'oncall' } }] }
    ]);
    fixture.api.on('globalConfig', () => ({ alarms: [], guardrails: [], deploymentNotifications: [] }));
    const empty = await fixture.run(['alarms:export', '--agent']);
    expect(empty.exitCode).toBe(0);
    expect(empty.stdout).toContain('Nothing to export');
    fixture.api.on('globalConfig', () => {
      throw new ConsoleProcedureError('FORBIDDEN', 'j9 export denied');
    });
    const denied = await fixture.run(['alarms:export', '--agent']);
    expect(denied.exitCode).toBe(1);
    expect(denied.stdout).toContain('j9 export denied');
    noUnexpected(fixture);
  } finally {
    await fixture.close();
  }
}, 60_000);

test.skipIf(process.platform === 'win32')(
  'cf-module:update selects the requested module and publishes the newest compatible version as default',
  async () => {
    const fixture = await createOperationsFixture(cli.path);
    try {
      fixture.aws.on('s3.*', ({ method }) => {
        expect(method).toBe('GET');
        return {
          kind: 'raw',
          status: 200,
          contentType: 'application/xml',
          body: '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated><Contents><Key>upstashRedis/V1/0000014/upstash-databasesv1-database.zip</Key></Contents><Contents><Key>upstashRedis/V1/0000020/upstash-databasesv1-database.zip</Key></Contents></ListBucketResult>'
        };
      });
      fixture.aws.on('cloudformation.ListTypes', () => xml('ListTypes', { TypeSummaries: [] }));
      fixture.aws.on('cloudformation.RegisterType', () => xml('RegisterType', { RegistrationToken: 'j9-register' }));
      const versionArn =
        'arn:aws:cloudformation:eu-west-1:111122223333:type/resource/Upstash-DatabasesV1-Database/00000002';
      fixture.aws.on('cloudformation.DescribeTypeRegistration', () =>
        xml('DescribeTypeRegistration', { ProgressStatus: 'COMPLETE', TypeVersionArn: versionArn })
      );
      fixture.aws.on('cloudformation.SetTypeDefaultVersion', () => xml('SetTypeDefaultVersion', {}));
      const child = fixture.start(['cf-module:update', '--region', 'eu-west-1'], { tty: true });
      await child.waitFor('Choose a module');
      child.write('\x1b[B\r');
      const done = await child.finished;
      expect(done.exitCode, done.stdout).toBe(0);
      expect(stripAnsi(done.stdout)).toContain('Module upstashRedis updated');
      expect(fixture.aws.callsTo('cloudformation.RegisterType')[0].input).toMatchObject({
        TypeName: 'Upstash::DatabasesV1::Database',
        Type: 'RESOURCE'
      });
      expect(String(fixture.aws.callsTo('cloudformation.RegisterType')[0].input.SchemaHandlerPackage)).toEndWith(
        '/upstashRedis/V1/0000020/upstash-databasesv1-database.zip'
      );
      expect(fixture.aws.callsTo('cloudformation.SetTypeDefaultVersion')[0].input.Arn).toBe(versionArn);
      fixture.aws.on('cloudformation.RegisterType', () => ({
        kind: 'error',
        code: 'AccessDenied',
        message: 'j9 registry denied',
        status: 403
      }));
      const denied = fixture.start(['cf-module:update', '--region', 'eu-west-1'], { tty: true });
      await denied.waitFor('Choose a module');
      denied.write('\x1b[B\r');
      const rejected = await denied.finished;
      expect(rejected.exitCode).toBe(1);
      expect(stripAnsi(rejected.stdout)).toContain('j9 registry denied');
      expect(fixture.aws.callsTo('cloudformation.SetTypeDefaultVersion')).toHaveLength(1);
      noUnexpected(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);
