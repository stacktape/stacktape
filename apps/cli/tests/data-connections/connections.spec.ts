import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

let directory: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-data-connections-'));
  await writeFile(join(directory, 'handler.ts'), 'export default async () => ({ statusCode: 200 });\n');
});
afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

const synthesize = async (config: string) => {
  await writeFile(join(directory, 'stacktape.yml'), config);
  return synthesizeFixture({
    configPath: join(directory, 'stacktape.yml'),
    workingDir: directory,
    identity: { projectName: 'data', stage: 'test' }
  });
};

// Narrow the observed CloudFormation boundary; no resource-builder helpers compute the expected values.
type Statement = { Effect: string; Action: string | string[]; Resource: unknown };
const statements = (template: CloudFormationTemplate, role: string): Statement[] => {
  const resource = template.Resources[role] as {
    Properties: { Policies: { PolicyDocument: { Statement: Statement[] } }[] };
  };
  return resource.Properties.Policies.flatMap((policy) => policy.PolicyDocument.Statement);
};

test('a stream consumer mounts its filesystem and gets only its connected data access', async () => {
  const template = await synthesize(`resources:
  events:
    type: kinesis-stream
    properties:
      capacityMode: PROVISIONED
      shardCount: 2
      retentionPeriodHours: 48
  unrelated:
    type: kinesis-stream
  files:
    type: efs-filesystem
  unrelatedFiles:
    type: efs-filesystem
  consumer:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
      connectTo: [events]
      environment:
        - name: STP_EVENTS_NAME
          value: explicit-stream-alias
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: files
            mountPath: /mnt/events
            rootDirectory: /events
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: events
            startingPosition: TRIM_HORIZON
            batchSize: 25
  isolated:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
`);
  expect(template.Resources.EventsStream).toMatchObject({
    Type: 'AWS::Kinesis::Stream',
    Properties: { Name: 'data-test-events', ShardCount: 2, RetentionPeriodHours: 48 }
  });
  const fn = template.Resources.ConsumerFunction as {
    Properties: { Environment: { Variables: Record<string, unknown> }; FileSystemConfigs: unknown; VpcConfig: unknown };
    DependsOn: string[];
  };
  expect(fn.Properties.Environment.Variables).toMatchObject({
    STP_EVENTS_NAME: 'explicit-stream-alias',
    STP_EVENTS_ARN: { 'Fn::GetAtt': ['EventsStream', 'Arn'] }
  });
  expect(template.Resources.ConsumerEvent0EventSourceMapping).toMatchObject({
    Properties: {
      EventSourceArn: { 'Fn::GetAtt': ['EventsStream', 'Arn'] },
      FunctionName: { 'Fn::GetAtt': ['ConsumerFunction', 'Arn'] },
      StartingPosition: 'TRIM_HORIZON',
      BatchSize: 25
    }
  });
  const accessPoint = Object.entries(template.Resources).find(
    ([, resource]) => resource.Type === 'AWS::EFS::AccessPoint'
  );
  expect(accessPoint).toBeDefined();
  expect(accessPoint![1]).toMatchObject({
    Properties: {
      FileSystemId: { Ref: 'FilesFileSystem' },
      RootDirectory: { Path: '/events', CreationInfo: { OwnerUid: '1000', OwnerGid: '1000', Permissions: '0755' } }
    }
  });
  expect(fn.Properties.FileSystemConfigs).toEqual([
    { Arn: { 'Fn::GetAtt': [accessPoint![0], 'Arn'] }, LocalMountPath: '/mnt/events' }
  ]);
  expect(fn.Properties.VpcConfig).toBeDefined();
  const mountTargets = Object.entries(template.Resources)
    .filter(
      ([, resource]) =>
        resource.Type === 'AWS::EFS::MountTarget' &&
        (resource.Properties as { FileSystemId: { Ref: string } }).FileSystemId.Ref === 'FilesFileSystem'
    )
    .map(([id]) => id);
  expect(mountTargets).toHaveLength(2);
  expect(fn.DependsOn).toEqual(expect.arrayContaining(mountTargets));
  expect(template.Resources.FilesSecurityGroup).toMatchObject({
    Properties: {
      SecurityGroupIngress: [
        { SourceSecurityGroupId: { Ref: 'ConsumerSecurityGroup' }, FromPort: 2049, ToPort: 2049, IpProtocol: 'tcp' }
      ]
    }
  });
  const access = statements(template, 'ConsumerRole');
  expect(access.flatMap(({ Action }) => Action)).not.toContain('*');
  expect(access.filter(({ Action }) => [Action].flat().some((action) => action.startsWith('kinesis:')))).toEqual([
    {
      Effect: 'Allow',
      Action: ['kinesis:GetRecords', 'kinesis:GetShardIterator', 'kinesis:DescribeStream', 'kinesis:ListStreams'],
      Resource: [{ 'Fn::GetAtt': ['EventsStream', 'Arn'] }]
    },
    {
      Effect: 'Allow',
      Action: [
        'kinesis:DescribeStream',
        'kinesis:DescribeStreamSummary',
        'kinesis:GetRecords',
        'kinesis:GetShardIterator',
        'kinesis:ListShards',
        'kinesis:ListStreams',
        'kinesis:PutRecord',
        'kinesis:PutRecords'
      ],
      Resource: [{ 'Fn::GetAtt': ['EventsStream', 'Arn'] }]
    }
  ]);
  expect(
    access.filter(({ Action }) => [Action].flat().some((action) => action.startsWith('elasticfilesystem:')))
  ).toEqual([
    {
      Effect: 'Allow',
      Action: [
        'elasticfilesystem:ClientMount',
        'elasticfilesystem:ClientWrite',
        'elasticfilesystem:DescribeMountTargets'
      ],
      Resource: [{ 'Fn::GetAtt': ['FilesFileSystem', 'Arn'] }]
    },
    { Effect: 'Allow', Action: 'elasticfilesystem:DescribeFileSystems', Resource: '*' }
  ]);
  expect(JSON.stringify(access)).not.toContain('Unrelated');
  expect(statements(template, 'IsolatedRole').flatMap(({ Action }) => Action)).not.toContain('*');
  expect(
    statements(template, 'IsolatedRole')
      .flatMap(({ Action }) => Action)
      .some((action) => /^(kinesis|elasticfilesystem):/.test(action))
  ).toBe(false);
});

test('DSQL defaults and advanced settings reach the cluster and its connection metadata', async () => {
  const template = await synthesize(`resources:
  primary:
    type: dsql-database
  secured:
    type: dsql-database
    properties:
      deletionProtection: true
      kmsKeyArn: arn:aws:kms:eu-west-1:123456789999:key/example
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      connectTo: [primary]
`);
  expect(template.Resources.PrimaryDsqlCluster).toMatchObject({
    Type: 'AWS::DSQL::Cluster',
    Properties: { DeletionProtectionEnabled: false }
  });
  expect(template.Resources.SecuredDsqlCluster).toMatchObject({
    Properties: { DeletionProtectionEnabled: true, KmsEncryptionKey: 'arn:aws:kms:eu-west-1:123456789999:key/example' }
  });
  expect(template.Resources.ApiFunction).toMatchObject({
    Properties: {
      Environment: {
        Variables: {
          STP_PRIMARY_ENDPOINT: { 'Fn::GetAtt': ['PrimaryDsqlCluster', 'Endpoint'] },
          STP_PRIMARY_PORT: '5432',
          STP_PRIMARY_DATABASE_NAME: 'postgres',
          STP_PRIMARY_USERNAME: 'admin'
        }
      }
    }
  });
  expect(
    statements(template, 'ApiRole').filter(({ Action }) => [Action].flat().some((action) => action.startsWith('dsql:')))
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['dsql:DbConnectAdmin'],
      Resource: [{ 'Fn::GetAtt': ['PrimaryDsqlCluster', 'ResourceArn'] }]
    }
  ]);
});
