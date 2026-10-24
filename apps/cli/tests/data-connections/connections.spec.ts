import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { AURORA_DSQL_REGIONS } from '@stacktape/config/dsql-databases';
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
const functionSecurityGroup = (template: CloudFormationTemplate, functionLogicalName: string) => {
  const { SecurityGroupIds } = (
    template.Resources[functionLogicalName] as { Properties: { VpcConfig: { SecurityGroupIds: { Ref: string }[] } } }
  ).Properties.VpcConfig;
  expect(SecurityGroupIds).toHaveLength(1);
  return SecurityGroupIds[0].Ref;
};
const ingressSources = (template: CloudFormationTemplate, securityGroup: string) =>
  (
    template.Resources[securityGroup] as {
      Properties: { SecurityGroupIngress?: { SourceSecurityGroupId?: { Ref: string }; FromPort: number }[] };
    }
  ).Properties.SecurityGroupIngress?.map(({ SourceSecurityGroupId, FromPort }) => ({
    source: SourceSecurityGroupId?.Ref,
    port: FromPort
  }));
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
  expect(ingressSources(template, 'FilesSecurityGroup')).toEqual([
    { source: functionSecurityGroup(template, 'ConsumerFunction'), port: 2049 }
  ]);
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

test('a scoped database admits only its connected workloads on the engine port', async () => {
  const template = await synthesize(`resources:
  orders:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: synthetic-password
      engine:
        type: mysql
        properties:
          version: '8.4.3'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
      connectTo: [orders]
  unrelated:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
`);
  const database = Object.values(template.Resources).find(({ Type }) => Type === 'AWS::RDS::DBInstance') as {
    Properties: { VPCSecurityGroups: { Ref: string }[] };
  };
  expect(database.Properties.VPCSecurityGroups).toHaveLength(1);
  expect(template.Resources[database.Properties.VPCSecurityGroups[0].Ref]).toMatchObject({
    Properties: {
      SecurityGroupIngress: [
        {
          SourceSecurityGroupId: { Ref: functionSecurityGroup(template, 'ApiFunction') },
          FromPort: 3306,
          ToPort: 3306,
          IpProtocol: 'tcp'
        }
      ]
    }
  });
  expect(functionSecurityGroup(template, 'UnrelatedFunction')).not.toBe(functionSecurityGroup(template, 'ApiFunction'));
  expect(
    (template.Resources.ApiFunction as { Properties: { Environment: { Variables: Record<string, unknown> } } })
      .Properties.Environment.Variables.STP_ORDERS_CONNECTION_STRING
  ).toBeDefined();
});

test('VPC functions share a security group only with functions that reach the same resources', async () => {
  const vpcFunction = (properties: string) => `
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true${properties}`;
  const template = await synthesize(`resources:
  orders:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: synthetic-password
      engine:
        type: postgres
        properties:
          version: '16.9'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  cache:
    type: redis-cluster
    properties:
      instanceSize: cache.t4g.micro
      defaultUserPassword: synthetic-redis-password
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  files:
    type: efs-filesystem
  events:
    type: kinesis-stream
  api:${vpcFunction(`
      connectTo: [orders, events]`)}
  worker:${vpcFunction(`
      connectTo: [orders]`)}
  cacheReader:${vpcFunction(`
      connectTo: [orders, cache]`)}
  uploader:${vpcFunction(`
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: files
            mountPath: /mnt/files`)}
  cron:${vpcFunction(`
      connectTo: [events]`)}
  webhook:${vpcFunction('')}
`);
  const group = (name: string) => functionSecurityGroup(template, `${name[0].toUpperCase()}${name.slice(1)}Function`);
  // IAM-only connections (the stream) do not split groups; network-scoped ones do.
  expect(group('api')).toBe(group('worker'));
  expect(group('cron')).toBe(group('webhook'));
  const groups = new Set(['api', 'cacheReader', 'uploader', 'cron'].map(group));
  expect(groups.size).toBe(4);
  expect(
    Object.entries(template.Resources)
      .filter(([, { Type }]) => Type === 'AWS::EC2::SecurityGroup')
      .map(([id]) => id)
      .filter((id) => !['OrdersSecurityGroup', 'CacheSecurityGroup', 'FilesSecurityGroup'].includes(id))
      .filter((id) => !id.startsWith('Stp') || id.startsWith('StpVpcFunctions'))
      .sort()
  ).toEqual([...groups].sort());

  const databaseGroup = (
    Object.values(template.Resources).find(({ Type }) => Type === 'AWS::RDS::DBInstance') as {
      Properties: { VPCSecurityGroups: { Ref: string }[] };
    }
  ).Properties.VPCSecurityGroups[0].Ref;
  const redisGroup = (
    Object.values(template.Resources).find(({ Type }) => Type === 'AWS::ElastiCache::ReplicationGroup') as {
      Properties: { SecurityGroupIds: { Ref: string }[] };
    }
  ).Properties.SecurityGroupIds[0].Ref;
  // One rule per admitted group; the shared group of functions without scoped connections is admitted nowhere.
  expect(ingressSources(template, databaseGroup)).toEqual([
    { source: group('api'), port: 5432 },
    { source: group('cacheReader'), port: 5432 }
  ]);
  expect(ingressSources(template, redisGroup)).toEqual([{ source: group('cacheReader'), port: 6379 }]);
  expect(ingressSources(template, 'FilesSecurityGroup')).toEqual([{ source: group('uploader'), port: 2049 }]);
});

test('a deployed function keeps its own security group admitted for the deploy that moves it to a shared one', async () => {
  const config = `resources:
  orders:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: synthetic-password
      engine:
        type: postgres
        properties:
          version: '16.9'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
      connectTo: [orders]
  webhook:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
`;
  await writeFile(join(directory, 'stacktape.yml'), config);
  const synthesizeOver = (deployedTemplate: CloudFormationTemplate) =>
    synthesizeFixture({
      configPath: join(directory, 'stacktape.yml'),
      workingDir: directory,
      identity: { projectName: 'data', stage: 'test' },
      deployedTemplate
    });
  // What a stack deployed before groups were shared contains: one group per function, referenced by the function.
  const ownGroup = (name: string) => ({
    Type: 'AWS::EC2::SecurityGroup',
    Properties: { VpcId: { Ref: 'StpVpc' }, GroupName: `data-test-${name}-sg`, GroupDescription: `deployed ${name}` }
  });
  const deployedFunction = (group: string) => ({
    Type: 'AWS::Lambda::Function',
    Properties: { VpcConfig: { SecurityGroupIds: [{ Ref: group }], SubnetIds: [] } }
  });
  const databaseGroup = (template: CloudFormationTemplate) =>
    (
      Object.values(template.Resources).find(({ Type }) => Type === 'AWS::RDS::DBInstance') as {
        Properties: { VPCSecurityGroups: { Ref: string }[] };
      }
    ).Properties.VPCSecurityGroups[0].Ref;
  const databaseIngressSources = (template: CloudFormationTemplate) =>
    ingressSources(template, databaseGroup(template))?.map(({ source }) => source);
  const deployedDatabaseGroup = {
    Type: 'AWS::EC2::SecurityGroup',
    Properties: {
      SecurityGroupIngress: [
        { SourceSecurityGroupId: { Ref: 'ApiSecurityGroup' }, FromPort: 5432, ToPort: 5432, IpProtocol: 'tcp' }
      ]
    }
  };
  const databaseGroupName = databaseGroup(await synthesizeOver({ Resources: {} } as unknown as CloudFormationTemplate));

  const moving = await synthesizeOver({
    Resources: {
      [databaseGroupName]: deployedDatabaseGroup,
      ApiSecurityGroup: ownGroup('api'),
      ApiFunction: deployedFunction('ApiSecurityGroup'),
      WebhookSecurityGroup: ownGroup('webhook'),
      WebhookFunction: deployedFunction('WebhookSecurityGroup')
    }
  } as unknown as CloudFormationTemplate);
  const apiGroup = functionSecurityGroup(moving, 'ApiFunction');
  expect(apiGroup).not.toBe('ApiSecurityGroup');
  expect(databaseIngressSources(moving)).toEqual([apiGroup, 'ApiSecurityGroup']);
  expect(moving.Resources.ApiSecurityGroup).toEqual(ownGroup('api'));
  // Every moving function keeps its old group for this deploy; the next one deletes it once Lambda has let go of it.
  expect(moving.Resources.WebhookSecurityGroup).toEqual(ownGroup('webhook'));
  expect(JSON.stringify(moving.Resources)).not.toContain('"SourceSecurityGroupId":{"Ref":"WebhookSecurityGroup"}');

  const moved = await synthesizeOver(moving);
  expect(databaseIngressSources(moved)).toEqual([apiGroup]);
  expect(moved.Resources.ApiSecurityGroup).toBeUndefined();
});

test('a function that changes its connections keeps the old ones working and gives nobody new access', async () => {
  const vpcFunction = (connectTo: string) => `
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: handler.ts
      joinDefaultVpc: true
      connectTo: [${connectTo}]`;
  const synthesizeWith = async (apiConnectTo: string, deployedTemplate?: CloudFormationTemplate) => {
    await writeFile(
      join(directory, 'stacktape.yml'),
      `resources:
  orders:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: synthetic-password
      engine:
        type: postgres
        properties:
          version: '16.9'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  cache:
    type: redis-cluster
    properties:
      instanceSize: cache.t4g.micro
      defaultUserPassword: synthetic-redis-password
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  api:${vpcFunction(apiConnectTo)}
  reports:${vpcFunction('orders, cache')}
`
    );
    return synthesizeFixture({
      configPath: join(directory, 'stacktape.yml'),
      workingDir: directory,
      identity: { projectName: 'data', stage: 'test' },
      deployedTemplate
    });
  };
  const admitted = (template: CloudFormationTemplate, type: string, property: string) => {
    const resource = Object.values(template.Resources).find(({ Type }) => Type === type) as {
      Properties: Record<string, { Ref: string }[]>;
    };
    return ingressSources(template, resource.Properties[property][0].Ref)?.map(({ source }) => source);
  };

  // api connects to orders alone; reports to orders and cache, so they are in different groups.
  const before = await synthesizeWith('orders');
  const ordersOnly = functionSecurityGroup(before, 'ApiFunction');
  const ordersAndCache = functionSecurityGroup(before, 'ReportsFunction');
  // api also connects to the cache now and joins reports' group, leaving its old group empty.
  const moving = await synthesizeWith('orders, cache', before);
  expect(functionSecurityGroup(moving, 'ApiFunction')).toBe(ordersAndCache);
  expect(moving.Resources[ordersOnly]).toEqual(before.Resources[ordersOnly]);
  // The database keeps admitting the old group while api moves; the cache, which never admitted it, does not.
  expect(admitted(moving, 'AWS::RDS::DBInstance', 'VPCSecurityGroups')).toEqual([ordersAndCache, ordersOnly]);
  expect(admitted(moving, 'AWS::ElastiCache::ReplicationGroup', 'SecurityGroupIds')).toEqual([ordersAndCache]);

  const moved = await synthesizeWith('orders, cache', moving);
  expect(moved.Resources[ordersOnly]).toBeUndefined();
  expect(admitted(moved, 'AWS::RDS::DBInstance', 'VPCSecurityGroups')).toEqual([ordersAndCache]);
});

test('DSQL in a region without Aurora DSQL fails before synthesis with the supported regions', async () => {
  const config = `resources:
  primary:
    type: dsql-database
`;
  await writeFile(join(directory, 'stacktape.yml'), config);
  const result = synthesizeFixture({
    configPath: join(directory, 'stacktape.yml'),
    workingDir: directory,
    identity: { projectName: 'data', stage: 'test', region: 'eu-south-1' }
  });
  await expect(result).rejects.toMatchObject({
    code: 'CONFIG_DSQL_REGION_UNSUPPORTED',
    message: 'Amazon Aurora DSQL is not available in region `eu-south-1`.',
    hints: [`Choose one of: ${AURORA_DSQL_REGIONS.join(', ')}.`]
  });
});

test('container secret sources that would inject the wrong value are rejected before any AWS read', async () => {
  const workload = (secret: string, environment = '') => `resources:
  app:
    type: multi-container-workload
    properties:
      resources: { cpu: 0.25, memory: 512 }
      containers:
        - name: api
          packaging:
            type: prebuilt-image
            properties:
              image: example.invalid/image:tag
${environment}          secrets:
            - name: TOKEN
              valueFrom: ${secret}
`;
  for (const source of [
    "$Secret('app-secret').token",
    "prefix-$SsmParam('/app/token')",
    "$ResourceParam('db', 'host')"
  ]) {
    await expect(synthesize(workload(`"${source}"`))).rejects.toMatchObject({
      code: 'CONFIG_CONTAINER_SECRET_SOURCE_INVALID'
    });
  }
  await expect(
    synthesize(
      workload(
        "$Secret('app-secret.token')",
        `          environment:
            - name: TOKEN
              value: plain
`
      )
    )
  ).rejects.toMatchObject({ code: 'CONFIG_CONTAINER_SECRET_ENVIRONMENT_CONFLICT' });
});
