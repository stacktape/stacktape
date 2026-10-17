import { afterAll, beforeAll, expect, test } from 'bun:test';
import {
  CreateRoleCommand,
  GetRoleCommand,
  GetRolePolicyCommand,
  IAMClient,
  MalformedPolicyDocumentException,
  ListRolePoliciesCommand,
  NoSuchEntityException,
  PutRolePolicyCommand
} from '@aws-sdk/client-iam';
import {
  DescribeSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  ResourceNotFoundException,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import type { AwsClientContextInput } from '../../src/aws/context';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { synthesizeFixture } from '../characterization/synthesis-fixture';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configManager } from '@domain-services/config-manager';

let ministack: MiniStack;
let directory: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'stacktape-generated-access-'));
  ministack = await startMiniStack({ label: 't02-access' });
}, 120_000);
afterAll(async () => {
  try {
    await ministack?.stop();
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});
const clientContext = () => ministack.clientConfig(ministack.account());
const manager = (config: ReturnType<typeof clientContext>, plugins: AwsClientContextInput['plugins'] = []) => {
  const sdk = new AwsSdkManager();
  sdk.init({ ...config, region: 'eu-west-1', plugins });
  return sdk;
};
// Secrets Manager supports real pagination. IAM on this pin ignores MaxItems; inject truncated IAM pages
// from the real stored metadata to exercise the AWS Marker contract without replacing role mutations.
const smallPages: NonNullable<AwsClientContextInput['plugins']>[number] = {
  applyToStack(stack) {
    stack.add(
      (next, context) => async (args) => {
        if (context.commandName === 'ListSecretsCommand') args.input.MaxResults = 1;
        const result = await next(args);
        if (context.commandName === 'ListRolePoliciesCommand') {
          const names = result.output.PolicyNames as string[];
          const offset = Number(args.input.Marker || 0);
          result.output.PolicyNames = names.slice(offset, offset + 1);
          result.output.Marker = offset + 1 < names.length ? String(offset + 1) : undefined;
          result.output.IsTruncated = Boolean(result.output.Marker);
        }
        return result;
      },
      { step: 'initialize', name: 'smallPages' }
    );
  }
};

const document = (resource: string) => ({
  Version: '2012-10-17',
  Statement: [{ Effect: 'Allow', Action: ['s3:GetObject'], Resource: [resource] }]
});

test('reconciling a role changes retained policies, adds access and removes obsolete access', async () => {
  const config = clientContext();
  const sdk = manager(config, [smallPages]);
  const observer = new IAMClient(config);
  const RoleName = 'deployment-role';
  try {
    await observer.send(
      new CreateRoleCommand({
        RoleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { Service: 'lambda.amazonaws.com' } }]
        })
      })
    );
    await Promise.all(
      ['Keep', 'Remove', 'Obsolete'].map((PolicyName) =>
        observer.send(
          new PutRolePolicyCommand({
            RoleName,
            PolicyName,
            PolicyDocument: JSON.stringify(document('arn:aws:s3:::old/*'))
          })
        )
      )
    );
    expect((await sdk.iam.listInlineRolePolicies({ roleName: RoleName })).sort()).toEqual([
      'Keep',
      'Obsolete',
      'Remove'
    ]);
    const desiredPolicies = [
      { PolicyName: 'Keep', PolicyDocument: document('arn:aws:s3:::current/*') },
      { PolicyName: 'Add', PolicyDocument: document('arn:aws:s3:::added/*') }
    ];
    await sdk.iam.reconcileInlineRolePolicies({ roleName: RoleName, desiredPolicies });
    // Repeat to expose a reconciliation that deletes a retained policy or duplicates its effects.
    await sdk.iam.reconcileInlineRolePolicies({ roleName: RoleName, desiredPolicies });
    expect((await observer.send(new ListRolePoliciesCommand({ RoleName }))).PolicyNames?.sort()).toEqual([
      'Add',
      'Keep'
    ]);
    expect(
      JSON.parse(
        decodeURIComponent(
          (await observer.send(new GetRolePolicyCommand({ RoleName, PolicyName: 'Keep' }))).PolicyDocument!
        )
      )
    ).toEqual(document('arn:aws:s3:::current/*'));
    expect(
      JSON.parse(
        decodeURIComponent(
          (await observer.send(new GetRolePolicyCommand({ RoleName, PolicyName: 'Add' }))).PolicyDocument!
        )
      )
    ).toEqual(document('arn:aws:s3:::added/*'));
    await expect(observer.send(new GetRolePolicyCommand({ RoleName, PolicyName: 'Remove' }))).rejects.toBeInstanceOf(
      NoSuchEntityException
    );
    await sdk.iam.reconcileInlineRolePolicies({ roleName: RoleName, desiredPolicies: [] });
    expect((await observer.send(new ListRolePoliciesCommand({ RoleName }))).PolicyNames).toEqual([]);
  } finally {
    observer.destroy();
  }
}, 30_000);

test('a secret keeps versioned values through an update and disappears from normal reads after deletion', async () => {
  const config = clientContext();
  const sdk = manager(config, [smallPages]);
  const observer = new SecretsManagerClient(config);
  try {
    const first = await sdk.secrets.create({ name: 'application-token', value: 'synthetic-first' });
    const second = await sdk.secrets.update({ secretId: first.ARN!, value: 'synthetic-second' });
    expect((await observer.send(new DescribeSecretCommand({ SecretId: first.ARN }))).Description).toBe(
      'Created by Stacktape'
    );
    expect((await observer.send(new GetSecretValueCommand({ SecretId: first.ARN }))).SecretString).toBe(
      'synthetic-second'
    );
    expect((await sdk.secrets.get({ secretId: first.ARN!, versionId: first.VersionId })).SecretString).toBe(
      'synthetic-first'
    );
    expect((await sdk.secrets.get({ secretId: first.ARN!, versionStage: 'AWSPREVIOUS' })).SecretString).toBe(
      'synthetic-first'
    );
    expect(
      (await sdk.secrets.get({ secretId: first.ARN!, versionId: second.VersionId, versionStage: 'AWSCURRENT' }))
        .SecretString
    ).toBe('synthetic-second');
    await sdk.secrets.create({ name: 'second-token', value: 'synthetic-other' });
    await sdk.secrets.create({ name: 'third-token', value: 'synthetic-other' });
    expect((await observer.send(new ListSecretsCommand({ MaxResults: 1 }))).NextToken).toBeDefined();
    expect((await sdk.secrets.list()).map(({ Name }) => Name).sort()).toEqual([
      'application-token',
      'second-token',
      'third-token'
    ]);
    await sdk.secrets.delete({ secretId: first.ARN! });
    // AWS schedules deletion; the secret still has metadata but is absent from ordinary listing and value reads.
    expect((await observer.send(new DescribeSecretCommand({ SecretId: first.ARN }))).DeletedDate).toBeInstanceOf(Date);
    expect((await sdk.secrets.list()).map(({ Name }) => Name).sort()).toEqual(['second-token', 'third-token']);
    await expect(observer.send(new GetSecretValueCommand({ SecretId: first.ARN }))).rejects.toThrow();
    await expect(observer.send(new DescribeSecretCommand({ SecretId: 'never-created' }))).rejects.toBeInstanceOf(
      ResourceNotFoundException
    );
  } finally {
    observer.destroy();
  }
}, 30_000);

test('container secrets synthesize scoped runtime selectors and rotation changes metadata without exposing values', async () => {
  const config = clientContext();
  const sdk = manager(config);
  const firstSecret = await sdk.secrets.create({
    name: 'application-token',
    value: JSON.stringify({ token: 'synthetic-private-first' })
  });
  const plainSecret = await sdk.secrets.create({ name: 'whole-token', value: 'synthetic-private-whole' });
  await sdk.parameterStore.put({ name: '/application/token', value: 'synthetic-ssm-first', encrypted: true });
  await writeFile(
    join(directory, 'stacktape.yml'),
    `resources:
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
          secrets:
            - name: TOKEN
              valueFrom: $Secret('application-token.token')
            - name: PARAMETER
              valueFrom: $SsmParam('/application/token')
        - name: secretOnly
          packaging:
            type: prebuilt-image
            properties:
              image: example.invalid/image:tag
          secrets:
            - name: WHOLE_TOKEN
              valueFrom: $Secret('whole-token')
  job:
    type: batch-job
    properties:
      resources: { cpu: 1, memory: 2048 }
      container:
        packaging:
          type: prebuilt-image
          properties:
            image: example.invalid/image:tag
        secrets:
          - name: TOKEN
            valueFrom: $Secret('application-token.token')
          - name: PARAMETER
            valueFrom: $SsmParam('/application/token')
`
  );
  const synthesize = () =>
    synthesizeFixture({
      configPath: join(directory, 'stacktape.yml'),
      workingDir: directory,
      identity: { accountId: config.credentials.accessKeyId },
      localAws: config
    });
  await expect(
    synthesizeFixture({
      configPath: join(directory, 'stacktape.yml'),
      workingDir: directory,
      localAws: { ...config, endpoint: 'https://sts.amazonaws.com' }
    })
  ).rejects.toThrow('is not a loopback emulator');
  const first = await synthesize();
  const secondSecret = await sdk.secrets.update({
    secretId: firstSecret.ARN!,
    value: JSON.stringify({ token: 'synthetic-private-second' })
  });
  await sdk.parameterStore.put({ name: '/application/token', value: 'synthetic-ssm-second', encrypted: true });
  const second = await synthesize();
  type Container = { Secrets: unknown; DockerLabels: Record<string, string>; Environment: unknown };
  const containers = (template: typeof first) =>
    (template.Resources.AppTaskDefinition as { Properties: { ContainerDefinitions: Container[] } }).Properties
      .ContainerDefinitions;
  expect(containers(first)[0].Secrets).toEqual([
    { Name: 'TOKEN', ValueFrom: `${firstSecret.ARN}:token::${firstSecret.VersionId}` },
    {
      Name: 'PARAMETER',
      ValueFrom: { 'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/application/token' }
    }
  ]);
  expect(containers(second)[0].Secrets).toContainEqual({
    Name: 'TOKEN',
    ValueFrom: `${firstSecret.ARN}:token::${secondSecret.VersionId}`
  });
  expect(containers(first)[1].Secrets).toEqual([
    { Name: 'WHOLE_TOKEN', ValueFrom: `${plainSecret.ARN}:::${plainSecret.VersionId}` }
  ]);
  for (const template of [first, second]) {
    expect(
      Object.keys(containers(template)[1].DockerLabels || {}).filter((key) =>
        key.startsWith('stacktape.ssm-secret-version.')
      )
    ).toEqual([]);
    expect(
      Object.keys(containers(template)[0].DockerLabels).filter((key) => key.startsWith('stacktape.ssm-secret-version.'))
    ).toEqual(['stacktape.ssm-secret-version.0']);
  }
  const batch = (template: typeof first) =>
    (
      template.Resources.JobJobDefinition as {
        Properties: {
          Parameters: Record<string, string>;
          ContainerProperties: { Secrets: unknown; ExecutionRoleArn: unknown };
        };
      }
    ).Properties;
  expect(batch(first).ContainerProperties.Secrets).toEqual(containers(first)[0].Secrets);
  expect(batch(second).ContainerProperties.Secrets).toEqual(containers(second)[0].Secrets);
  expect(batch(first).Parameters).toEqual({ 'stacktape.ssm-secret-version.0': '1' });
  expect(batch(second).Parameters).toEqual({ 'stacktape.ssm-secret-version.0': '2' });
  expect(batch(second).ContainerProperties.ExecutionRoleArn).toEqual({ 'Fn::GetAtt': ['JobRole', 'Arn'] });
  const batchRole = second.Resources.JobRole as {
    Properties: {
      Policies: { PolicyDocument: { Statement: { Effect: string; Action: string | string[]; Resource: unknown }[] } }[];
    };
  };
  const batchAccess = batchRole.Properties.Policies.flatMap(({ PolicyDocument }) => PolicyDocument.Statement);
  expect(batchAccess.flatMap(({ Action }) => Action)).not.toContain('*');
  expect(
    batchAccess.filter(({ Action }) => [Action].flat().some((action) => /^(ssm|secretsmanager):/.test(action)))
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['secretsmanager:GetSecretValue'],
      Resource: [
        {
          'Fn::Sub': [
            'arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*',
            { SecretName: 'application-token' }
          ]
        }
      ]
    },
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameters'],
      Resource: [
        { 'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/application/token' }
      ]
    }
  ]);
  expect(containers(first)[0].DockerLabels['stacktape.ssm-secret-version.0']).toBe('1');
  expect(containers(second)[0].DockerLabels['stacktape.ssm-secret-version.0']).toBe('2');
  const execution = second.Resources.StpEcsExecutionRole as {
    Properties: {
      Policies: { PolicyDocument: { Statement: { Effect: string; Action: string[]; Resource: unknown }[] } }[];
    };
  };
  const access = execution.Properties.Policies.flatMap(({ PolicyDocument }) => PolicyDocument.Statement);
  expect(access.flatMap(({ Action }) => Action)).not.toContain('*');
  expect(
    access
      .filter(({ Action }) => [Action].flat().some((action) => /^(ssm|secretsmanager):/.test(action)))
      .map(({ Effect }) => Effect)
  ).toEqual(['Allow', 'Allow']);
  expect(
    access
      .filter(({ Action }) => [Action].flat().some((action) => action.startsWith('secretsmanager:')))
      .map(({ Resource }) => Resource)
  ).toEqual([
    [
      {
        'Fn::Sub': [
          'arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*',
          { SecretName: 'application-token' }
        ]
      },
      {
        'Fn::Sub': [
          'arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*',
          { SecretName: 'whole-token' }
        ]
      }
    ]
  ]);
  expect(
    access
      .filter(({ Action }) => [Action].flat().some((action) => action.startsWith('ssm:')))
      .map(({ Resource }) => Resource)
  ).toEqual([
    [{ 'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/application/token' }]
  ]);
  expect(
    access
      .flatMap(({ Action }) => Action)
      .filter((action) => /^(ssm|secretsmanager):/.test(action))
      .sort()
  ).toEqual(['secretsmanager:GetSecretValue', 'ssm:GetParameters']);
  const printable = JSON.stringify({ first, second, config: configManager.config });
  for (const secret of [
    'synthetic-private-whole',
    'synthetic-private-first',
    'synthetic-private-second',
    'synthetic-ssm-first',
    'synthetic-ssm-second'
  ])
    expect(printable).not.toContain(secret);
  await sdk.parameterStore.put({ name: '/application/token', value: 'synthetic-ssm-plain', encrypted: false });
  await expect(synthesize()).rejects.toMatchObject({ code: 'CONFIG_CONTAINER_SECRET_SSM_TYPE_INVALID' });
  await sdk.parameterStore.put({ name: '/application/token', value: 'synthetic-ssm-third', encrypted: true });
  await sdk.secrets.update({ secretId: firstSecret.ARN!, value: 'synthetic-private-invalid-json' });
  try {
    await synthesize();
    throw new Error('Expected invalid JSON to fail');
  } catch (error) {
    expect(error).toMatchObject({ code: 'DIRECTIVE_SECRET_JSON_INVALID' });
    expect((error as Error).message).not.toContain('synthetic-private-invalid-json');
  }
}, 30_000);

test('a secret referenced by ARN and a parameter named without a slash get matching selectors and grants', async () => {
  const config = clientContext();
  const sdk = manager(config);
  const secret = await sdk.secrets.create({ name: 'arn-token', value: 'synthetic-private-arn' });
  await sdk.parameterStore.put({ name: 'service-token', value: 'synthetic-ssm-service', encrypted: true });
  await writeFile(
    join(directory, 'stacktape.yml'),
    `resources:
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
          secrets:
            - name: TOKEN
              valueFrom: $Secret('${secret.ARN}')
            - name: SERVICE
              valueFrom: $SsmParam('service-token')
`
  );
  const template = await synthesizeFixture({
    configPath: join(directory, 'stacktape.yml'),
    workingDir: directory,
    identity: { accountId: config.credentials.accessKeyId },
    localAws: config
  });
  const parameterArn = {
    'Fn::Sub': 'arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter/service-token'
  };
  expect(
    (template.Resources.AppTaskDefinition as { Properties: { ContainerDefinitions: { Secrets: unknown }[] } })
      .Properties.ContainerDefinitions[0].Secrets
  ).toEqual([
    { Name: 'TOKEN', ValueFrom: `${secret.ARN}:::${secret.VersionId}` },
    { Name: 'SERVICE', ValueFrom: parameterArn }
  ]);
  const execution = template.Resources.StpEcsExecutionRole as {
    Properties: {
      Policies: { PolicyDocument: { Statement: { Effect: string; Action: string[]; Resource: unknown }[] } }[];
    };
  };
  expect(
    execution.Properties.Policies.flatMap(({ PolicyDocument }) => PolicyDocument.Statement).filter(({ Action }) =>
      Action.some((action) => /^(ssm|secretsmanager):/.test(action))
    )
  ).toEqual([
    { Effect: 'Allow', Action: ['secretsmanager:GetSecretValue'], Resource: [secret.ARN] },
    { Effect: 'Allow', Action: ['ssm:GetParameters'], Resource: [parameterArn] }
  ]);
}, 30_000);

// MiniStack stores IAM metadata but does not validate deleted AWS principals. Inject only that provider failure.
test('a rejected deleted principal is removed while the requested principal is committed once', async () => {
  const config = clientContext();
  const observer = new IAMClient(config);
  const invalid = `arn:aws:iam::${config.credentials.accessKeyId}:user/deleted`;
  const requested = `arn:aws:iam::${config.credentials.accessKeyId}:user/current`;
  const rejectDeletedPrincipal: NonNullable<AwsClientContextInput['plugins']>[number] = {
    applyToStack(stack) {
      stack.add(
        (next, context) => async (args) => {
          if (
            context.commandName === 'UpdateAssumeRolePolicyCommand' &&
            String(args.input.PolicyDocument).includes(invalid)
          ) {
            throw new MalformedPolicyDocumentException({
              $metadata: {},
              message: `Invalid principal in policy: ${invalid}`
            });
          }
          return next(args);
        },
        { step: 'initialize', name: 'rejectDeletedPrincipal' }
      );
    }
  };
  const sdk = manager(config, [rejectDeletedPrincipal]);
  try {
    await observer.send(
      new CreateRoleCommand({
        RoleName: 'deployment-role',
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            { Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { AWS: invalid } },
            { Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { Service: 'lambda.amazonaws.com' } }
          ]
        })
      })
    );
    await sdk.iam.addUserToRolePrincipals({ roleName: 'deployment-role', userArn: requested });
    await sdk.iam.addUserToRolePrincipals({ roleName: 'deployment-role', userArn: requested });
    const role = await observer.send(new GetRoleCommand({ RoleName: 'deployment-role' }));
    expect(JSON.parse(decodeURIComponent(role.Role!.AssumeRolePolicyDocument!))).toEqual({
      Version: '2012-10-17',
      Statement: [
        { Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { Service: 'lambda.amazonaws.com' } },
        { Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { AWS: requested } }
      ]
    });
  } finally {
    observer.destroy();
  }
}, 30_000);
