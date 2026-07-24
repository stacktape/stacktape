import { beforeAll, describe, expect, test } from 'bun:test';
import http from 'node:http';
import https from 'node:https';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { templateManager } from '@domain-services/template-manager';
import { outputNames } from '@shared/naming/stack-output-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import {
  Bucket,
  DynamoDbTable,
  EventBus,
  EventBusIntegration,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  RdsEnginePostgres,
  RelationalDatabase,
  SqsIntegration,
  SqsQueue,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  UserAuthPool,
  WebService,
  defineConfig
} from '../../src/api/npm/ts';

const createDenseConfig = () =>
  defineConfig(() => {
    const apiGateway = new HttpApiGateway({
      cors: { enabled: true }
    });
    const authPool = new UserAuthPool({
      allowEmailAsUserName: true,
      userVerificationType: 'email-code',
      passwordPolicy: { minimumLength: 12 }
    });
    const records = new DynamoDbTable({
      primaryKey: {
        partitionKey: { name: 'tenantId', type: 'string' },
        sortKey: { name: 'recordId', type: 'string' }
      }
    });
    const files = new Bucket({
      cors: { enabled: true }
    });
    const deadLetters = new SqsQueue({
      fifoEnabled: true
    });
    const jobs = new SqsQueue({
      fifoEnabled: true,
      redrivePolicy: {
        targetSqsQueueName: 'deadLetters',
        maxReceiveCount: 4
      }
    });
    const events = new EventBus({});
    const database = new RelationalDatabase({
      credentials: {
        masterUserPassword: 'credential-placeholder'
      },
      engine: new RdsEnginePostgres({
        version: '18.1',
        primaryInstance: {
          instanceSize: 'db.t4g.micro'
        }
      })
    });
    const api = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/api.ts'
      }),
      memory: 512,
      connectTo: [records, files, jobs, events, database],
      events: [
        new HttpApiIntegration({
          httpApiGatewayName: 'apiGateway',
          path: '/records/{proxy+}',
          method: '*',
          authorizer: {
            type: 'cognito',
            properties: { userPoolName: 'authPool' }
          }
        })
      ]
    });
    const worker = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/worker.ts'
      }),
      timeout: 30,
      connectTo: [records, events],
      events: [
        new SqsIntegration({
          sqsQueueName: 'jobs',
          batchSize: 5
        })
      ]
    });
    const audit = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/audit.ts'
      }),
      events: [
        new EventBusIntegration({
          eventBusName: 'events',
          eventPattern: {
            source: ['characterization'],
            'detail-type': ['RecordChanged']
          }
        })
      ]
    });
    const web = new WebService({
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './src/web.ts'
      }),
      resources: {
        cpu: 0.25,
        memory: 512
      },
      connectTo: [database],
      environment: {
        APP_MODE: 'baseline'
      }
    });

    return {
      resources: {
        apiGateway,
        authPool,
        records,
        files,
        deadLetters,
        jobs,
        events,
        database,
        api,
        worker,
        audit,
        web
      },
      stackConfig: {
        outputs: [
          {
            name: 'apiUrl',
            value: "$ResourceParam('apiGateway','url')"
          }
        ],
        tags: [{ name: 'suite', value: 'characterization' }]
      }
    };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

export const synthesizeDenseFixture = async () => {
  return withCredentiallessSynthesisBoundary(async () => {
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    eventManager.reset();
    eventManager.setSilentMode(true);

    await applicationManager.init();
    await globalStateManager.init({
      config: createDenseConfig(),
      commands: ['synth'],
      args: {
        stage: 'baseline',
        region: 'eu-west-1',
        projectName: 'characterization'
      },
      invokedFrom: 'server'
    });
    globalStateManager.targetStack = {
      stackName: 'characterization-baseline',
      globallyUniqueStackHash: 'xxxxxxxx',
      stage: 'baseline',
      projectName: 'characterization',
      projectId: 'characterization-project'
    };
    await eventManager.init();
    await configManager.init({ configRequired: true });
    await ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    });

    deploymentArtifactManager.deploymentBucketName = 'stp-deployment-bucket-xxxxxxxx';
    deploymentArtifactManager.repositoryName = 'xxxxxxxx-stp-container-repository';
    deploymentArtifactManager.repositoryUrl =
      '123456789999.dkr.ecr.eu-west-1.amazonaws.com/xxxxxxxx-stp-container-repository';

    await stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    });

    await Promise.all([templateManager.init({ stackDetails: undefined }), calculatedStackOverviewManager.init()]);
    await calculatedStackOverviewManager.resolveAllResources();
    await templateManager.finalizeTemplate();
    return templateManager.getTemplate();
  });
};

const protectedAwsEnvironment = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_PROFILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'AWS_CONFIG_FILE',
  'AWS_EC2_METADATA_DISABLED'
] as const;

export const withCredentiallessSynthesisBoundary = async <Result>(operation: () => Promise<Result>) => {
  const originalEnvironment = Object.fromEntries(
    protectedAwsEnvironment.map((name) => [name, process.env[name]])
  ) as Record<(typeof protectedAwsEnvironment)[number], string | undefined>;
  const originalFetch = globalThis.fetch;
  const originalHttpRequest = http.request;
  const originalHttpGet = http.get;
  const originalHttpsRequest = https.request;
  const originalHttpsGet = https.get;
  const originalGetStackDetails = awsSdkManager.getStackDetails;
  const originalGetStackResources = awsSdkManager.getStackResources;

  process.env.AWS_ACCESS_KEY_ID = 'characterization-forbidden';
  process.env.AWS_SECRET_ACCESS_KEY = 'characterization-forbidden';
  process.env.AWS_SESSION_TOKEN = 'characterization-forbidden';
  process.env.AWS_PROFILE = '__stacktape_characterization_forbidden__';
  process.env.AWS_SHARED_CREDENTIALS_FILE = '__stacktape_characterization_missing_credentials__';
  process.env.AWS_CONFIG_FILE = '__stacktape_characterization_missing_config__';
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
  globalThis.fetch = (async (input) => {
    const destination = input instanceof Request ? input.url : String(input);
    throw new Error(`Unclassified network request during credential-free synthesis: ${destination}`);
  }) as typeof fetch;
  const rejectNodeRequest = ((input: unknown) => {
    const destination = input instanceof URL ? input.href : typeof input === 'string' ? input : JSON.stringify(input);
    throw new Error(`Unclassified Node HTTP request during credential-free synthesis: ${destination}`);
  }) as typeof http.request;
  http.request = rejectNodeRequest;
  http.get = rejectNodeRequest as typeof http.get;
  https.request = rejectNodeRequest as typeof https.request;
  https.get = rejectNodeRequest as typeof https.get;
  awsSdkManager.getStackDetails = async () => null;
  awsSdkManager.getStackResources = async () => [];

  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    http.request = originalHttpRequest;
    http.get = originalHttpGet;
    https.request = originalHttpsRequest;
    https.get = originalHttpsGet;
    awsSdkManager.getStackDetails = originalGetStackDetails;
    awsSdkManager.getStackResources = originalGetStackResources;
    for (const name of protectedAwsEnvironment) {
      const value = originalEnvironment[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
};

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)])
    );
  }
  return value;
};

export const findReferencedLogicalIds = (value: unknown, logicalIds: Set<string>) => {
  const references = new Set<string>();
  const visit = (child: unknown) => {
    if (Array.isArray(child)) {
      child.forEach(visit);
      return;
    }
    if (!child || typeof child !== 'object') {
      return;
    }

    const object = child as Record<string, unknown>;
    if (typeof object.Ref === 'string' && logicalIds.has(object.Ref)) {
      references.add(object.Ref);
    }
    if (Array.isArray(object['Fn::GetAtt']) && typeof object['Fn::GetAtt'][0] === 'string') {
      const logicalId = object['Fn::GetAtt'][0];
      if (logicalIds.has(logicalId)) references.add(logicalId);
    }
    if (typeof object['Fn::GetAtt'] === 'string') {
      const logicalId = object['Fn::GetAtt'].split('.')[0];
      if (logicalIds.has(logicalId)) references.add(logicalId);
    }
    const substitution = object['Fn::Sub'];
    const substitutionTemplate =
      typeof substitution === 'string'
        ? substitution
        : Array.isArray(substitution) && typeof substitution[0] === 'string'
          ? substitution[0]
          : undefined;
    if (substitutionTemplate) {
      for (const match of substitutionTemplate.matchAll(/\${([A-Za-z0-9]+)(?:\.[^}]*)?}/g)) {
        if (logicalIds.has(match[1])) references.add(match[1]);
      }
    }
    Object.values(object).forEach(visit);
  };

  visit(value);
  return [...references].sort();
};

const physicalNameKeys = new Set([
  'ApiName',
  'BucketName',
  'DBClusterIdentifier',
  'DBInstanceIdentifier',
  'DomainName',
  'EventBusName',
  'Family',
  'FunctionName',
  'LogGroupName',
  'QueueName',
  'RepositoryName',
  'RoleName',
  'TableName',
  'UserPoolName'
]);

const getPhysicalNames = ({ properties }: { properties: Record<string, unknown> | undefined }) =>
  Object.fromEntries(
    Object.entries(properties ?? {})
      .filter(([key]) => physicalNameKeys.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        key === 'DomainName' && typeof value === 'string' && value.endsWith('.stacktape-app.com')
          ? '<server-compiler-default-domain>'
          : sortValue(value)
      ])
  );

export const createSynthesisIdentityManifest = (template: CloudformationTemplate) => {
  const logicalIds = new Set(Object.keys(template.Resources));
  const ignoredOutputNames = new Set([outputNames.deploymentVersion(), outputNames.stackInfoMap()]);

  return {
    description: template.Description,
    resources: Object.fromEntries(
      Object.entries(template.Resources)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([logicalId, resource]) => {
          const physicalNames = getPhysicalNames({ properties: resource.Properties });
          const explicitDependencies = Array.isArray(resource.DependsOn)
            ? [...resource.DependsOn].sort()
            : resource.DependsOn
              ? [resource.DependsOn]
              : [];
          return [
            logicalId,
            {
              type: resource.Type,
              ...(resource.DeletionPolicy && { deletionPolicy: resource.DeletionPolicy }),
              ...(resource.UpdateReplacePolicy && { updateReplacePolicy: resource.UpdateReplacePolicy }),
              ...(Object.keys(physicalNames).length && { physicalNames }),
              dependencies: [...new Set([...explicitDependencies, ...findReferencedLogicalIds(resource, logicalIds)])]
                .filter((dependency) => dependency !== logicalId)
                .sort()
            }
          ];
        })
    ),
    outputs: Object.fromEntries(
      Object.entries(template.Outputs)
        .filter(([name]) => !ignoredOutputNames.has(name))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, output]) => [
          name,
          {
            dependencies: findReferencedLogicalIds(output, logicalIds)
          }
        ])
    )
  };
};

let synthesizedTemplate: CloudformationTemplate;

beforeAll(async () => {
  synthesizedTemplate = await synthesizeDenseFixture();
});

const normalizeIamSequence = (value: unknown) =>
  (Array.isArray(value) ? value : [value])
    .map(sortValue)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

const normalizePrincipal = (value: unknown) => {
  const principal = sortValue(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(principal).map(([key, child]) => [
      key,
      Array.isArray(child) ? [...child].sort((left, right) => String(left).localeCompare(String(right))) : child
    ])
  );
};

const normalizeIamStatement = (statement: Record<string, unknown>) => ({
  effect: statement.Effect,
  actions: normalizeIamSequence(statement.Action),
  ...(statement.Resource !== undefined && {
    resources: normalizeIamSequence(statement.Resource)
  }),
  ...(statement.Principal !== undefined && {
    principal:
      statement.Principal && typeof statement.Principal === 'object'
        ? normalizePrincipal(statement.Principal)
        : statement.Principal
  }),
  ...(statement.Condition !== undefined && { condition: sortValue(statement.Condition) })
});

const normalizeRoleTrust = (role: any) => role.Properties.AssumeRolePolicyDocument.Statement.map(normalizeIamStatement);

const normalizeRolePolicies = (role: any) =>
  (role.Properties.Policies ?? []).flatMap(({ PolicyDocument, PolicyName }: any) =>
    PolicyDocument.Statement.map((statement: Record<string, unknown>) => ({
      policyName: PolicyName,
      ...normalizeIamStatement(statement)
    }))
  );

const selectedIamRoleNames = ['ApiRole', 'WorkerRole', 'WebRole', 'StpEcsExecutionRole'] as const;

export const createNormalizedIamManifest = (template: CloudformationTemplate) => {
  const resources = template.Resources as Record<string, any>;

  return Object.fromEntries(
    selectedIamRoleNames.map((roleName) => {
      const role = resources[roleName];
      return [
        roleName,
        {
          ...(role.Properties.ManagedPolicyArns && {
            managedPolicyArns: normalizeIamSequence(role.Properties.ManagedPolicyArns)
          }),
          trust: normalizeRoleTrust(role),
          policies: normalizeRolePolicies(role).sort((left, right) =>
            JSON.stringify(left).localeCompare(JSON.stringify(right))
          )
        }
      ];
    })
  );
};

describe('full synthesis contract', () => {
  test('fails closed if credential-free synthesis attempts an unclassified network request', async () => {
    await expect(
      withCredentiallessSynthesisBoundary(async () => {
        expect(process.env.AWS_EC2_METADATA_DISABLED).toBe('true');
        expect(process.env.AWS_PROFILE).toBe('__stacktape_characterization_forbidden__');
        for (const request of [
          () => http.request('http://169.254.169.254/latest/meta-data'),
          () => http.get('http://169.254.169.254/latest/meta-data'),
          () => https.request('https://sts.amazonaws.com'),
          () => https.get('https://sts.amazonaws.com')
        ]) {
          expect(request).toThrow('Unclassified Node HTTP request during credential-free synthesis');
        }
        await fetch('https://sts.amazonaws.com');
      })
    ).rejects.toThrow('Unclassified network request during credential-free synthesis: https://sts.amazonaws.com');
  });

  test('discovers dependencies in both forms of Fn::Sub', () => {
    const logicalIds = new Set(['DirectResource', 'MappedResource']);
    expect(
      findReferencedLogicalIds(
        {
          'Fn::Sub': [
            // This string is CloudFormation syntax, not a JavaScript interpolation.
            // eslint-disable-next-line no-template-curly-in-string
            '${DirectResource.Arn}/${Alias}',
            {
              Alias: { Ref: 'MappedResource' }
            }
          ]
        },
        logicalIds
      )
    ).toEqual(['DirectResource', 'MappedResource']);
  });

  test('synthesizes a dense application without AWS credentials', async () => {
    const resourceTypes = Object.values(synthesizedTemplate.Resources).map(({ Type }) => Type);

    expect(Object.keys(synthesizedTemplate.Resources).length).toBeGreaterThan(20);
    for (const expectedType of [
      'AWS::ApiGatewayV2::Api',
      'AWS::Cognito::UserPool',
      'AWS::DynamoDB::GlobalTable',
      'AWS::S3::Bucket',
      'AWS::SQS::Queue',
      'AWS::Events::EventBus',
      'AWS::Lambda::Function'
    ]) {
      expect(resourceTypes).toContain(expectedType);
    }
  });

  test('preserves resource identities, physical names, and dependency edges', async () => {
    const expectedManifest = await Bun.file(
      new URL('./fixtures/dense-application.identity.json', import.meta.url)
    ).json();

    expect(createSynthesisIdentityManifest(synthesizedTemplate)).toEqual(expectedManifest);
  });

  test('preserves IAM principals, effects, actions, resources, and conditions', async () => {
    const resources = synthesizedTemplate.Resources as Record<string, any>;
    const expectedIamManifest = await Bun.file(
      new URL('./fixtures/dense-application.iam.json', import.meta.url)
    ).json();

    expect(createNormalizedIamManifest(synthesizedTemplate)).toEqual(expectedIamManifest);

    expect(resources.StpDeploymentBucketPolicy.Properties.PolicyDocument.Statement.map(normalizeIamStatement)).toEqual([
      {
        effect: 'Deny',
        actions: ['s3:*'],
        principal: '*',
        condition: {
          Bool: {
            'aws:SecureTransport': false
          }
        },
        resources: [
          {
            'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':s3:::', { Ref: 'StpDeploymentBucket' }, '/*']]
          }
        ]
      }
    ]);
  });

  test('characterizes selected encryption and public/network access controls', () => {
    const resources = synthesizedTemplate.Resources as Record<string, any>;

    expect(resources.StpDeploymentBucket.Properties.BucketEncryption).toEqual({
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }
      ]
    });
    expect(resources.FilesBucket.Properties.PublicAccessBlockConfiguration).toEqual({
      BlockPublicAcls: false,
      BlockPublicPolicy: false,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: false
    });
    expect(resources.DatabaseDbInstance.Properties).toMatchObject({
      PubliclyAccessible: true,
      StorageEncrypted: true,
      VPCSecurityGroups: [{ Ref: 'DatabaseSecurityGroup' }]
    });
    expect(resources.DatabaseSecurityGroup.Properties.SecurityGroupIngress).toEqual([
      {
        CidrIp: '0.0.0.0/0',
        FromPort: 5432,
        IpProtocol: 'tcp',
        ToPort: 5432
      }
    ]);
    expect(resources.WebSecurityGroup.Properties.SecurityGroupIngress).toEqual([
      {
        Description: 'from http api gateway web.httpApiGateway to 3000',
        FromPort: 3000,
        IpProtocol: 'tcp',
        SourceSecurityGroupId: { Ref: 'WebVpcLinkSecurityGroup' },
        ToPort: 3000
      }
    ]);
    expect(resources.WebService.Properties.NetworkConfiguration).toEqual({
      AwsvpcConfiguration: {
        AssignPublicIp: 'ENABLED',
        SecurityGroups: [{ Ref: 'WebSecurityGroup' }],
        Subnets: [{ Ref: 'StpPublicSubnet0' }, { Ref: 'StpPublicSubnet1' }, { Ref: 'StpPublicSubnet2' }]
      }
    });
  });

  test('preserves explicit infrastructure behavior across synthesis', () => {
    const resources = synthesizedTemplate.Resources as Record<string, any>;

    expect(resources.ApiFunction.Properties).toMatchObject({
      FunctionName: 'characterization-baseline-api',
      MemorySize: 512,
      Role: { 'Fn::GetAtt': ['ApiRole', 'Arn'] }
    });
    expect(resources.WorkerFunction.Properties).toMatchObject({
      FunctionName: 'characterization-baseline-worker',
      Timeout: 30
    });
    expect(resources.WorkerEvent0EventSourceMapping.Properties).toMatchObject({
      BatchSize: 5,
      EventSourceArn: { 'Fn::GetAtt': ['JobsQueue', 'Arn'] },
      FunctionName: { 'Fn::GetAtt': ['WorkerFunction', 'Arn'] }
    });
    expect(resources.JobsQueue.Properties).toMatchObject({
      FifoQueue: true,
      QueueName: 'characterization-baseline-jobs.fifo',
      RedrivePolicy: {
        maxReceiveCount: 4,
        deadLetterTargetArn: { 'Fn::GetAtt': ['DeadLettersQueue', 'Arn'] }
      }
    });
    expect(resources.RecordsGlobalTable.Properties).toMatchObject({
      BillingMode: 'PAY_PER_REQUEST',
      TableName: 'characterization-baseline-records-xxxxxxxx',
      KeySchema: [
        { AttributeName: 'tenantId', KeyType: 'HASH' },
        { AttributeName: 'recordId', KeyType: 'RANGE' }
      ]
    });
    expect(resources.StpApiGatewayAnyRecordsProxyAuthorizer.Properties).toMatchObject({
      AuthorizerType: 'JWT',
      ApiId: { Ref: 'ApiGatewayApi' },
      JwtConfiguration: {
        Audience: [{ Ref: 'AuthPoolUserPoolClient' }]
      }
    });
    expect(resources.AuditEvent0Rule.Properties).toMatchObject({
      State: 'ENABLED',
      EventPattern: {
        source: ['characterization'],
        'detail-type': ['RecordChanged']
      },
      EventBusName: { 'Fn::GetAtt': ['EventsEventBus', 'Arn'] }
    });

    const apiPolicyStatements = resources.ApiRole.Properties.Policies.flatMap(
      ({ PolicyDocument }: { PolicyDocument: { Statement: any[] } }) => PolicyDocument.Statement
    );
    const apiActions = apiPolicyStatements.flatMap(({ Action }: { Action: string | string[] }) => Action);
    for (const action of ['dynamodb:PutItem', 's3:ListBucket', 'sqs:SendMessage', 'events:PutEvents']) {
      expect(apiActions).toContain(action);
    }
    for (const method of ['GET', 'PUT', 'POST', 'DELETE']) {
      expect(resources.FilesBucket.Properties.CorsConfiguration.CorsRules[0].AllowedMethods).toContain(method);
    }
    expect(resources.ApiFunction.Properties.Tags).toContainEqual({
      Key: 'suite',
      Value: 'characterization'
    });
    expect(resources.ApiFunction.Properties.Tags).toContainEqual({
      Key: 'stp:stack-name',
      Value: 'characterization-baseline'
    });
    expect(resources.DatabaseDbInstance.Properties).toMatchObject({
      DBInstanceIdentifier: 'characterization-baseline-database',
      DBInstanceClass: 'db.t4g.micro',
      Engine: 'postgres',
      EngineVersion: '18.1',
      StorageEncrypted: true,
      DBSubnetGroupName: { Ref: 'DatabaseDbSubnetGroup' },
      VPCSecurityGroups: [{ Ref: 'DatabaseSecurityGroup' }]
    });
    expect(resources.StpVpc.Properties).toMatchObject({
      CidrBlock: '172.16.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true
    });
    expect(resources.WebTaskDefinition.Properties).toMatchObject({
      Family: 'characterization-baseline-web-task-definition',
      NetworkMode: 'awsvpc',
      Cpu: '256',
      Memory: '512',
      RequiresCompatibilities: ['FARGATE'],
      ExecutionRoleArn: { 'Fn::GetAtt': ['StpEcsExecutionRole', 'Arn'] },
      TaskRoleArn: { 'Fn::GetAtt': ['WebRole', 'Arn'] }
    });
    expect(resources.WebTaskDefinition.Properties.ContainerDefinitions[0]).toMatchObject({
      Name: 'service-container',
      PortMappings: [{ HostPort: 3000, ContainerPort: 3000, Protocol: 'tcp', Name: 'port-3000' }]
    });
    expect(resources.WebTaskDefinition.Properties.ContainerDefinitions[0].Environment).toContainEqual({
      Name: 'APP_MODE',
      Value: 'baseline'
    });
    expect(resources.WebService.Properties).toMatchObject({
      LaunchType: 'FARGATE',
      Cluster: { Ref: 'WebCluster' },
      TaskDefinition: { Ref: 'WebTaskDefinition' },
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          AssignPublicIp: 'ENABLED',
          SecurityGroups: [{ Ref: 'WebSecurityGroup' }]
        }
      }
    });
  });
});
