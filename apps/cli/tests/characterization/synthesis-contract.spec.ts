import type {
  CloudFormationTemplate,
  KnownCloudFormationResource,
  KnownCloudFormationResourceType
} from '@stacktape/cloudformation/resource';
import { isIntrinsic, type CloudFormationValue } from '@stacktape/cloudformation/intrinsics';
import { beforeAll, describe, expect, test } from 'bun:test';
import http from 'node:http';
import https from 'node:https';
import { join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import {
  calculatedStackOverviewManager,
  settleResourceResolvers
} from '@domain-services/calculated-stack-overview-manager';
import type { StackContext } from '@domain-services/stack-context';
import {
  hasEnabledCdn,
  type ResourceWithPresentCdn
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/cdn';
import { configManager } from '@domain-services/config-manager';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import { stackManager } from '@domain-services/cloudformation-stack-manager';

import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getStackCfTemplateDescription } from '@stacktape/naming/stacks';
import type { ResourceOverrides } from '@stacktape/config/shared';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { getConfigManagerContext } from '../../src/commands/_utils/initialization';
import {
  ApplicationLoadBalancer,
  ApplicationLoadBalancerIntegration,
  AppSyncApi,
  AppSyncApiIntegration,
  Bucket,
  CloudwatchLogIntegration,
  DynamoDbTable,
  DsqlDatabase,
  EventBus,
  EventBusIntegration,
  HttpApiGateway,
  HttpApiIntegration,
  KafkaCluster,
  KafkaTopicIntegration,
  LambdaFunction,
  RdsEnginePostgres,
  RelationalDatabase,
  SqsIntegration,
  SqsQueue,
  SqsQueueEventBusIntegration,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  UserAuthPool,
  WebSocketApiGateway,
  WebSocketApiIntegration,
  WebService,
  defineConfig
} from '@stacktape/config-authoring';

const createDenseConfig = ({
  includeAppsync = false,
  includeDsql = false,
  includeWebsocket = false,
  includeKafka = false,
  kafkaConnectTo = true,
  kafkaRemoteInDev = false,
  infrequentAccessWorkerLogs = false,
  subscribeToWorkerLogs = false
}: {
  includeAppsync?: boolean;
  includeDsql?: boolean;
  includeWebsocket?: boolean;
  includeKafka?: boolean;
  kafkaConnectTo?: boolean;
  kafkaRemoteInDev?: boolean;
  infrequentAccessWorkerLogs?: boolean;
  subscribeToWorkerLogs?: boolean;
} = {}) =>
  defineConfig(() => {
    const apiGateway = new HttpApiGateway({
      cors: { enabled: true }
    });
    const authPool = new UserAuthPool({
      allowEmailAsUserName: true,
      userVerificationType: 'email-code',
      passwordPolicy: { minimumLength: 12 }
    });
    const graphql = new AppSyncApi({
      authentication: {
        type: 'user-auth-pool',
        properties: { userAuthPoolName: authPool }
      },
      schemaFilePath: 'schema.graphql'
    });
    const records = new DynamoDbTable({
      primaryKey: {
        partitionKey: { name: 'tenantId', type: 'string' },
        sortKey: { name: 'recordId', type: 'string' }
      }
    });
    const files = new Bucket({
      cors: { enabled: true },
      transforms: {
        bucket: (properties) => ({
          ...properties,
          VersioningConfiguration: { Status: 'Enabled' }
        })
      }
    });
    const deadLetters = new SqsQueue({
      fifoEnabled: true
    });
    const jobs = new SqsQueue({
      fifoEnabled: true,
      redrivePolicy: {
        targetSqsQueueName: 'deadLetters',
        maxReceiveCount: 4
      },
      events: [
        new SqsQueueEventBusIntegration({
          eventBusName: 'events',
          eventPattern: { source: ['queued.jobs'] },
          input: { source: 'event-bus' },
          messageGroupId: 'job-events',
          onDeliveryFailure: { sqsQueueName: 'deadLetters' }
        })
      ]
    });
    const events = new EventBus({});
    // Authors no listeners, so synthesis has to supply the defaulted HTTP-redirect/HTTPS pair. The CDN rewrite omits
    // routeTo and therefore has to reuse this load balancer as its origin.
    const edge = new ApplicationLoadBalancer({
      cdn: {
        enabled: true,
        originDomainName: 'edge.internal.example.com',
        defaultRoutePrefix: '/service',
        routeRewrites: [{ path: '/same-origin/*' }]
      }
    });
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
    const dsqlDatabase = new DsqlDatabase({
      deletionProtection: true,
      kmsKeyArn: 'arn:aws:kms:eu-west-1:123456789999:key/dsql-key'
    });
    const kafkaCluster = new KafkaCluster(kafkaRemoteInDev ? { dev: { remote: true } } : {});
    const api = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/api.ts'
      }),
      memory: 512,
      connectTo: [
        records,
        files,
        jobs,
        events,
        database,
        ...(includeDsql ? [dsqlDatabase] : []),
        ...(includeKafka && kafkaConnectTo ? [kafkaCluster] : [])
      ],
      ...(includeKafka
        ? {
            ...(kafkaConnectTo ? { joinDefaultVpc: true } : {}),
            events: [
              new KafkaTopicIntegration({
                kafkaClusterName: kafkaCluster,
                topicName: 'orders',
                startFrom: 'latest'
              })
            ]
          }
        : {
            events: [
              new HttpApiIntegration({
                httpApiGatewayName: 'apiGateway',
                path: '/records/{proxy+}',
                method: '*',
                authorizer: {
                  type: 'cognito',
                  properties: { userPoolName: 'authPool' }
                }
              }),
              new ApplicationLoadBalancerIntegration({
                loadBalancerName: 'edge',
                priority: 1,
                paths: ['/*']
              })
            ]
          })
    });
    const worker = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/worker.ts'
      }),
      timeout: 30,
      ...(infrequentAccessWorkerLogs ? { logging: { logClass: 'infrequent-access' as const } } : {}),
      connectTo: [records, events],
      events: [
        new SqsIntegration({
          sqsQueueName: 'jobs',
          batchSize: 5
        })
      ]
    });
    const graphqlHandler = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/api.ts'
      }),
      connectTo: [graphql],
      events: [
        new AppSyncApiIntegration({
          appsyncApiName: graphql,
          field: 'Query.user'
        })
      ]
    });
    const logObserver = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/audit.ts'
      }),
      events: [
        new CloudwatchLogIntegration({
          logGroupArn: worker.logGroupArn
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
    const realtime = new WebSocketApiGateway({});
    const realtimeHandler = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './src/api.ts'
      }),
      timeout: 10,
      events: [
        new WebSocketApiIntegration({
          websocketApiGatewayName: realtime,
          routeKey: '$connect',
          authorizer: { type: 'lambda', properties: { functionName: audit } }
        }),
        new WebSocketApiIntegration({
          websocketApiGatewayName: realtime,
          routeKey: 'sendMessage',
          returnResponse: true
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
        ...(includeAppsync ? { graphql, graphqlHandler } : {}),
        edge,
        records,
        files,
        deadLetters,
        jobs,
        events,
        database,
        ...(includeDsql ? { dsqlDatabase } : {}),
        ...(includeKafka ? { kafkaCluster } : {}),
        api,
        worker,
        ...(subscribeToWorkerLogs ? { logObserver } : {}),
        audit,
        web,
        ...(includeWebsocket ? { realtime, realtimeHandler } : {})
      },
      stackConfig: {
        outputs: [
          {
            name: 'apiUrl',
            value: "$ResourceParam('apiGateway','url')",
            export: true
          }
        ],
        tags: [{ name: 'suite', value: 'characterization' }]
      },
      finalTransform: (template) => ({
        ...template,
        Metadata: { ...template.Metadata, ConfigAuthoringFinalTransform: true }
      })
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

export const synthesizeDenseFixture = async ({
  synthesisContext,
  beforeFinalize,
  command = 'synth',
  includeWebsocket,
  includeAppsync,
  includeDsql,
  includeKafka,
  kafkaConnectTo,
  kafkaRemoteInDev,
  infrequentAccessWorkerLogs,
  subscribeToWorkerLogs,
  remoteResources
}: {
  synthesisContext?: Partial<StackContext>;
  beforeFinalize?: () => void;
  command?: 'dev' | 'synth';
  includeWebsocket?: boolean;
  includeAppsync?: boolean;
  includeDsql?: boolean;
  includeKafka?: boolean;
  kafkaConnectTo?: boolean;
  kafkaRemoteInDev?: boolean;
  infrequentAccessWorkerLogs?: boolean;
  subscribeToWorkerLogs?: boolean;
  remoteResources?: string[];
} = {}) => {
  return withCredentiallessSynthesisBoundary(async () => {
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    eventManager.reset();
    eventManager.setSilentMode(true);

    await applicationManager.init();
    const helperLambda = {
      digest: 'characterization',
      artifactPath: 'characterization-helper.zip',
      handler: 'index.default',
      size: 10
    };
    globalStateManager.operationStart = new Date();
    globalStateManager.rawCommands = [command];
    globalStateManager.rawArgs = {
      stage: 'baseline',
      region: 'eu-west-1',
      projectName: 'characterization',
      currentWorkingDirectory: join(import.meta.dir, 'fixtures', 'dense-application'),
      ...(remoteResources ? { remoteResources } : {})
    };
    globalStateManager.additionalArgs = {};
    const compiledConfig = createDenseConfig({
      includeAppsync,
      includeDsql,
      includeKafka,
      kafkaConnectTo,
      kafkaRemoteInDev,
      includeWebsocket,
      infrequentAccessWorkerLogs,
      subscribeToWorkerLogs
    });
    globalStateManager.presetConfig = compiledConfig.config;
    globalStateManager.persistedState = {
      systemId: 'characterization-system',
      cliArgsDefaults: {},
      otherDefaults: {}
    };
    globalStateManager.systemId = globalStateManager.persistedState.systemId;
    globalStateManager.awsConfigFileContent = {};
    globalStateManager.availableAwsProfiles = [];
    globalStateManager.helperLambdaDetails = {
      batchJobTriggerLambda: helperLambda,
      stacktapeServiceLambda: helperLambda,
      cdnOriginRequestLambda: helperLambda,
      cdnOriginResponseLambda: helperLambda
    };
    globalStateManager.localTargetAwsAccount = {
      id: 'characterization-account',
      organizationId: 'characterization-organization',
      awsAccountId: '123456789999',
      connectionMode: 'BASIC',
      name: 'characterization',
      state: 'ACTIVE',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1'
    };
    globalStateManager.initializedDomainServices = [];
    globalStateManager.isInitialized = true;
    globalStateManager.targetStack = {
      stackName: 'characterization-baseline',
      globallyUniqueStackHash: 'xxxxxxxx',
      stage: 'baseline',
      projectName: 'characterization',
      projectId: 'characterization-project'
    };
    const stackContext: StackContext = {
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      command: globalStateManager.command,
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      invocationId: globalStateManager.invocationId,
      projectName: globalStateManager.targetStack.projectName,
      region: globalStateManager.region,
      stackName: globalStateManager.targetStack.stackName,
      stage: globalStateManager.targetStack.stage,
      workingDir: globalStateManager.workingDir,
      ...synthesisContext
    };
    await eventManager.init();
    await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });
    configManager.transforms = compiledConfig.transforms;
    configManager.finalTransform = compiledConfig.finalTransform;
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

    await Promise.all([
      templateManager.init({ stackDetails: undefined, stackName: stackContext.stackName }),
      calculatedStackOverviewManager.init({
        context: stackContext
      })
    ]);
    await calculatedStackOverviewManager.resolveAllResources();
    beforeFinalize?.();
    await finalizeTemplate();
    return templateManager.getTemplate();
  });
};

const setDatabaseOverrides = (overrides: ResourceOverrides) => {
  (configManager.config.resources.database as { overrides?: ResourceOverrides }).overrides = overrides;
};

const setWebServiceOverrides = (overrides: ResourceOverrides) => {
  (configManager.config.resources.web as { overrides?: ResourceOverrides }).overrides = overrides;
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
  if (!awsSdkManager.isInitialized) {
    awsSdkManager.init({
      credentials: { accessKeyId: 'characterization-forbidden', secretAccessKey: 'characterization-forbidden' },
      region: 'eu-west-1'
    });
  }
  const cloudFormation = awsSdkManager.cloudFormation;
  const originalEnvironment = Object.fromEntries(
    protectedAwsEnvironment.map((name) => [name, process.env[name]])
  ) as Record<(typeof protectedAwsEnvironment)[number], string | undefined>;
  const originalFetch = globalThis.fetch;
  const originalHttpRequest = http.request;
  const originalHttpGet = http.get;
  const originalHttpsRequest = https.request;
  const originalHttpsGet = https.get;
  const originalGetStackDetails = cloudFormation.getDetails;
  const originalGetStackResources = cloudFormation.getResources;

  process.env.AWS_ACCESS_KEY_ID = 'characterization-forbidden';
  process.env.AWS_SECRET_ACCESS_KEY = 'characterization-forbidden';
  process.env.AWS_SESSION_TOKEN = 'characterization-forbidden';
  process.env.AWS_PROFILE = '__stacktape_characterization_forbidden__';
  process.env.AWS_SHARED_CREDENTIALS_FILE = '__stacktape_characterization_missing_credentials__';
  process.env.AWS_CONFIG_FILE = '__stacktape_characterization_missing_config__';
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      const destination = input instanceof Request ? input.url : String(input);
      throw new Error(`Unclassified network request during credential-free synthesis: ${destination}`);
    },
    {
      preconnect: (input: Parameters<typeof fetch.preconnect>[0]) => {
        throw new Error(`Unclassified network preconnect during credential-free synthesis: ${String(input)}`);
      }
    }
  );
  const rejectNodeRequest = ((input: unknown) => {
    const destination = input instanceof URL ? input.href : typeof input === 'string' ? input : JSON.stringify(input);
    throw new Error(`Unclassified Node HTTP request during credential-free synthesis: ${destination}`);
  }) as typeof http.request;
  http.request = rejectNodeRequest;
  http.get = rejectNodeRequest as typeof http.get;
  https.request = rejectNodeRequest as typeof https.request;
  https.get = rejectNodeRequest as typeof https.get;
  cloudFormation.getDetails = async () => null;
  cloudFormation.getResources = async () => [];

  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    http.request = originalHttpRequest;
    http.get = originalHttpGet;
    https.request = originalHttpsRequest;
    https.get = originalHttpsGet;
    cloudFormation.getDetails = originalGetStackDetails;
    cloudFormation.getResources = originalGetStackResources;
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

const captureRejectedError = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the operation to reject.');
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

const getPhysicalNames = ({ properties }: { properties: object | undefined }) =>
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

export const createSynthesisIdentityManifest = (template: CloudFormationTemplate) => {
  const logicalIds = new Set(Object.keys(template.Resources));
  const ignoredOutputNames = new Set([outputNames.deploymentVersion(), outputNames.stackInfoMap()]);

  return {
    description: template.Description,
    resources: Object.fromEntries(
      Object.entries(template.Resources)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([logicalId, resource]) => {
          const physicalNames = getPhysicalNames({ properties: resource.Properties });
          const updateReplacePolicy =
            'UpdateReplacePolicy' in resource && typeof resource.UpdateReplacePolicy === 'string'
              ? resource.UpdateReplacePolicy
              : undefined;
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
              ...(updateReplacePolicy && { updateReplacePolicy }),
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

let synthesizedTemplate: CloudFormationTemplate;

beforeAll(async () => {
  synthesizedTemplate = await synthesizeDenseFixture();
  const outputPath = process.env.STACKTAPE_SYNTHESIS_TEMPLATE_OUTPUT;
  if (outputPath) {
    await Bun.write(outputPath, JSON.stringify(synthesizedTemplate, null, 2));
  }
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

export const createNormalizedIamManifest = (template: CloudFormationTemplate) => {
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
  test('waits for every started resource resolver before returning the first observed failure', async () => {
    let rejectEarlierInList: (reason: unknown) => void;
    const earlierInList = new Promise((_, reject) => {
      rejectEarlierInList = reject;
    });
    let rejectFirstInTime: (reason: unknown) => void;
    const firstInTime = new Promise((_, reject) => {
      rejectFirstInTime = reject;
    });
    let finishLateResolver: () => void;
    const lateResolver = new Promise<void>((resolve) => {
      finishLateResolver = resolve;
    });
    const firstError = new Error('first resolver failure');
    const laterError = new Error('later resolver failure');
    const resolution = settleResourceResolvers([() => earlierInList, () => firstInTime, () => lateResolver]);
    let returned = false;
    void resolution.catch(() => {
      returned = true;
    });

    rejectFirstInTime(firstError);
    await Promise.resolve();
    rejectEarlierInList(laterError);
    await Promise.resolve();
    expect(returned).toBe(false);

    finishLateResolver();
    await expect(resolution).rejects.toBe(firstError);
    expect(returned).toBe(true);
  });

  test('settles earlier resolver work before propagating a later synchronous failure', async () => {
    let rejectStartedResolver: (reason: unknown) => void;
    const startedResolver = new Promise((_, reject) => {
      rejectStartedResolver = reject;
    });
    const synchronousError = new Error('synchronous resolver failure');
    const asynchronousError = new Error('asynchronous resolver failure');
    let startedAfterFailure = false;
    const resolution = settleResourceResolvers([
      () => startedResolver,
      () => {
        throw synchronousError;
      },
      () => {
        startedAfterFailure = true;
      }
    ]);
    let returned = false;
    void resolution.catch(() => {
      returned = true;
    });

    await Promise.resolve();
    expect(returned).toBe(false);
    expect(startedAfterFailure).toBe(false);
    rejectStartedResolver(asynchronousError);

    await expect(resolution).rejects.toBe(synchronousError);
    expect(returned).toBe(true);
  });

  test('resource resolvers use the immutable synthesis context instead of mutable CLI state', async () => {
    const template = await synthesizeDenseFixture({
      synthesisContext: {
        accountId: '987654321000',
        globallyUniqueStackHash: 'yyyyyyyy',
        projectName: 'context-project',
        region: 'us-west-2',
        stackName: 'context-owned-stack',
        stage: 'context-stage'
      }
    });
    const resources = template.Resources as Record<string, any>;

    expect(globalStateManager.targetStack.stackName).toBe('characterization-baseline');
    expect(globalStateManager.region).toBe('eu-west-1');
    expect(Object.isFrozen(calculatedStackOverviewManager.context)).toBe(true);
    expect(resources.ApiFunction.Properties.FunctionName).toBe('context-owned-stack-api');
    expect(resources.JobsQueue.Properties.QueueName).toBe('context-owned-stack-jobs.fifo');
    expect(resources.RecordsGlobalTable.Properties.TableName).toBe('context-owned-stack-records-yyyyyyyy');
    expect(template.Description).toBe(getStackCfTemplateDescription('context-project', 'context-stage', 'yyyyyyyy'));
  });

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
      'AWS::Events::Rule',
      'AWS::Lambda::Function'
    ]) {
      expect(resourceTypes).toContain(expectedType);
    }
  });

  test('synthesizes Infrequent Access on a managed log group and omits subscription-filter features', async () => {
    const template = await synthesizeDenseFixture({ infrequentAccessWorkerLogs: true });
    const workerLogGroupLogicalId = cfLogicalNames.lambdaLogGroup('worker');
    const workerLogGroup = template.Resources[workerLogGroupLogicalId];

    expect(workerLogGroup).toMatchObject({
      Type: 'AWS::Logs::LogGroup',
      Properties: { LogGroupClass: 'INFREQUENT_ACCESS' }
    });
    expect(template.Resources[cfLogicalNames.issueDetectionSubscriptionFilter('worker')]).toBeUndefined();
  });

  test('rejects a function subscription to a same-stack Infrequent Access log group', async () => {
    await expect(
      synthesizeDenseFixture({ infrequentAccessWorkerLogs: true, subscribeToWorkerLogs: true })
    ).rejects.toMatchObject({ code: 'CONFIG_LOG_CLASS_SUBSCRIPTION_UNSUPPORTED' });
  });

  test('synthesizes DSQL with connection metadata, scoped admin access, and deletion protection', async () => {
    const template = await synthesizeDenseFixture({ includeDsql: true });
    const resources = template.Resources as Record<string, any>;

    expect(resources.DsqlDatabaseDsqlCluster).toMatchObject({
      Type: 'AWS::DSQL::Cluster',
      Properties: {
        DeletionProtectionEnabled: true,
        KmsEncryptionKey: 'arn:aws:kms:eu-west-1:123456789999:key/dsql-key'
      }
    });
    expect(resources.DsqlDatabaseDsqlCluster.Properties.Tags).toContainEqual({
      Key: 'stp:stack-name',
      Value: 'characterization-baseline'
    });

    const apiStatements = resources.ApiRole.Properties.Policies.flatMap(
      ({ PolicyDocument }: { PolicyDocument: { Statement: any[] } }) => PolicyDocument.Statement
    );
    expect(apiStatements).toContainEqual({
      Effect: 'Allow',
      Action: ['dsql:DbConnectAdmin'],
      Resource: [{ 'Fn::GetAtt': ['DsqlDatabaseDsqlCluster', 'ResourceArn'] }]
    });

    const apiEnvironment = resources.ApiFunction.Properties.Environment.Variables as Record<string, unknown>;
    expect(apiEnvironment).toMatchObject({
      STP_DSQL_DATABASE_DATABASE_NAME: 'postgres',
      STP_DSQL_DATABASE_ENDPOINT: { 'Fn::GetAtt': ['DsqlDatabaseDsqlCluster', 'Endpoint'] },
      STP_DSQL_DATABASE_PORT: '5432',
      STP_DSQL_DATABASE_USERNAME: 'admin'
    });

    expect(configManager.cfLogicalNamesToBeProtected).toContain('DsqlDatabaseDsqlCluster');
    expect(calculatedStackOverviewManager.stackInfoMap.resources.dsqlDatabase).toMatchObject({
      resourceType: 'dsql-database',
      cloudformationChildResources: {
        DsqlDatabaseDsqlCluster: { cloudformationResourceType: 'AWS::DSQL::Cluster' }
      },
      referencableParams: {
        databaseName: { value: 'postgres' },
        port: { value: 5432 },
        username: { value: 'admin' }
      }
    });
  });

  test('synthesizes the complete AppSync Lambda-resolver and connectTo contract', async () => {
    const template = await synthesizeDenseFixture({ includeAppsync: true });
    const resources = template.Resources as Record<string, any>;
    const apiLogicalName = cfLogicalNames.appsyncApi('graphql');
    const schemaLogicalName = cfLogicalNames.appsyncApiSchema('graphql');
    const logRoleLogicalName = cfLogicalNames.appsyncApiLogRole('graphql');
    const logGroupLogicalName = cfLogicalNames.appsyncApiLogGroup('graphql');
    const dataSourceLogicalName = cfLogicalNames.appsyncApiDataSource({
      stpAppsyncApiName: 'graphql',
      stpLambdaFunctionName: 'graphqlHandler'
    });
    const dataSourceRoleLogicalName = cfLogicalNames.appsyncApiDataSourceRole({
      stpAppsyncApiName: 'graphql',
      stpLambdaFunctionName: 'graphqlHandler'
    });
    const resolverLogicalName = cfLogicalNames.appsyncApiResolver({
      fieldName: 'user',
      stpAppsyncApiName: 'graphql',
      typeName: 'Query'
    });
    const handlerLogicalName = cfLogicalNames.lambda('graphqlHandler');

    expect(resources[apiLogicalName]).toMatchObject({
      Type: 'AWS::AppSync::GraphQLApi',
      Properties: {
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
        IntrospectionConfig: 'ENABLED',
        QueryDepthLimit: 10,
        ResolverCountLimit: 1000,
        UserPoolConfig: {
          AppIdClientRegex: { Ref: cfLogicalNames.userPoolClient('authPool') },
          AwsRegion: { Ref: 'AWS::Region' },
          DefaultAction: 'ALLOW',
          UserPoolId: { Ref: cfLogicalNames.userPool('authPool') }
        },
        LogConfig: {
          CloudWatchLogsRoleArn: { 'Fn::GetAtt': [logRoleLogicalName, 'Arn'] },
          ExcludeVerboseContent: true,
          FieldLogLevel: 'ERROR'
        }
      }
    });
    expect(resources[schemaLogicalName]).toMatchObject({
      Type: 'AWS::AppSync::GraphQLSchema',
      Properties: { ApiId: { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] } }
    });
    expect(resources[schemaLogicalName].Properties.Definition).toContain('user(id: ID!): User');
    expect(resources[logGroupLogicalName]).toMatchObject({
      Type: 'AWS::Logs::LogGroup',
      Properties: { RetentionInDays: 30 }
    });
    expect(resources[dataSourceRoleLogicalName]).toMatchObject({
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Statement: [{ Action: 'sts:AssumeRole', Effect: 'Allow', Principal: { Service: 'appsync.amazonaws.com' } }]
        }
      }
    });
    expect(resources[dataSourceRoleLogicalName].Properties.Policies[0].PolicyDocument.Statement).toEqual([
      {
        Action: ['lambda:InvokeFunction'],
        Effect: 'Allow',
        Resource: [{ 'Fn::GetAtt': [handlerLogicalName, 'Arn'] }]
      }
    ]);
    expect(resources[dataSourceLogicalName]).toMatchObject({
      Type: 'AWS::AppSync::DataSource',
      DependsOn: [dataSourceRoleLogicalName],
      Properties: {
        ApiId: { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] },
        LambdaConfig: { LambdaFunctionArn: { 'Fn::GetAtt': [handlerLogicalName, 'Arn'] } },
        ServiceRoleArn: { 'Fn::GetAtt': [dataSourceRoleLogicalName, 'Arn'] },
        Type: 'AWS_LAMBDA'
      }
    });
    expect(resources[resolverLogicalName]).toMatchObject({
      Type: 'AWS::AppSync::Resolver',
      DependsOn: [schemaLogicalName, dataSourceLogicalName],
      Properties: {
        ApiId: { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] },
        FieldName: 'user',
        TypeName: 'Query'
      }
    });

    const handlerEnvironment = resources[handlerLogicalName].Properties.Environment.Variables;
    expect(handlerEnvironment).toMatchObject({
      STP_GRAPHQL_API_ID: { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] },
      STP_GRAPHQL_ARN: { 'Fn::GetAtt': [apiLogicalName, 'Arn'] },
      STP_GRAPHQL_URL: { 'Fn::GetAtt': [apiLogicalName, 'GraphQLUrl'] }
    });
    const handlerStatements = resources[cfLogicalNames.lambdaRole('graphqlHandler')].Properties.Policies.flatMap(
      ({ PolicyDocument }: any) => PolicyDocument.Statement
    );
    expect(handlerStatements).toContainEqual({
      Effect: 'Allow',
      Action: ['appsync:GraphQL'],
      Resource: [
        {
          'Fn::Join': [
            '',
            [
              'arn:aws:appsync:eu-west-1:123456789999:apis/',
              { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] },
              '/types/*/fields/*'
            ]
          ]
        }
      ]
    });
    expect(calculatedStackOverviewManager.stackInfoMap.resources.graphql).toMatchObject({
      resourceType: 'appsync-api',
      cloudformationChildResources: {
        [apiLogicalName]: { cloudformationResourceType: 'AWS::AppSync::GraphQLApi' },
        [schemaLogicalName]: { cloudformationResourceType: 'AWS::AppSync::GraphQLSchema' },
        [dataSourceLogicalName]: { cloudformationResourceType: 'AWS::AppSync::DataSource' },
        [resolverLogicalName]: { cloudformationResourceType: 'AWS::AppSync::Resolver' }
      },
      referencableParams: {
        apiId: { value: { 'Fn::GetAtt': [apiLogicalName, 'ApiId'] } },
        arn: { value: { 'Fn::GetAtt': [apiLogicalName, 'Arn'] } },
        url: { value: { 'Fn::GetAtt': [apiLogicalName, 'GraphQLUrl'] } },
        realtimeUrl: { value: { 'Fn::GetAtt': [apiLogicalName, 'RealtimeUrl'] } }
      }
    });
  });

  test('synthesizes MSK Serverless with IAM networking, scoped Lambda access, and on-demand endpoints', async () => {
    const template = await synthesizeDenseFixture({ includeKafka: true });
    const resources = template.Resources as Record<string, any>;
    const cluster = Object.values(resources).find(({ Type }: any) => Type === 'AWS::MSK::ServerlessCluster') as any;
    const mapping = Object.values(resources).find(
      ({ Type, Properties }: any) => Type === 'AWS::Lambda::EventSourceMapping' && Properties.Topics?.[0] === 'orders'
    ) as any;
    const endpoints = Object.values(resources).filter(
      ({ Type, Properties }: any) => Type === 'AWS::EC2::VPCEndpoint' && Properties.VpcEndpointType === 'Interface'
    ) as any[];

    expect(cluster.Properties.ClientAuthentication).toEqual({ Sasl: { Iam: { Enabled: true } } });
    expect(cluster.Properties.VpcConfigs[0].SecurityGroups).toHaveLength(1);
    expect(mapping.Properties).toMatchObject({
      EventSourceArn: { Ref: expect.any(String) },
      StartingPosition: 'LATEST',
      Topics: ['orders']
    });
    expect(mapping.DependsOn).toEqual([
      cfLogicalNames.kafkaOnDemandVpcEndpoint('lambda'),
      cfLogicalNames.kafkaOnDemandVpcEndpoint('sts')
    ]);
    expect(endpoints.map(({ Properties }) => Properties.ServiceName).sort()).toEqual([
      'com.amazonaws.eu-west-1.lambda',
      'com.amazonaws.eu-west-1.sts'
    ]);
    expect(endpoints.every(({ Properties }) => Properties.PrivateDnsEnabled === true)).toBe(true);
    expect(endpoints.every(({ Properties }) => Properties.PolicyDocument === undefined)).toBe(true);
    const endpointSecurityGroup = Object.values(resources).find(
      ({ Type, Properties }: any) =>
        Type === 'AWS::EC2::SecurityGroup' &&
        Properties.GroupDescription === 'PrivateLink endpoints used by Lambda on-demand Kafka event-source mappings'
    ) as any;
    expect(endpointSecurityGroup.Properties.SecurityGroupIngress).toEqual([
      { CidrIp: '172.16.0.0/16', FromPort: 443, ToPort: 443, IpProtocol: 'tcp' }
    ]);

    const apiRole = resources.ApiRole;
    const statements = apiRole.Properties.Policies.flatMap(({ PolicyDocument }: any) => PolicyDocument.Statement);
    expect(statements.some(({ Action }: any) => Action?.includes?.('kafka:GetBootstrapBrokers'))).toBe(true);
    expect(statements.some(({ Action }: any) => Action?.includes?.('kafka-cluster:ReadData'))).toBe(true);
    expect(statements.some(({ Action }: any) => Action?.includes?.('kafka-cluster:DeleteTopic'))).toBe(false);
  });

  test('grants Kafka event-source permissions without requiring connectTo or function VPC attachment', async () => {
    const template = await synthesizeDenseFixture({ includeKafka: true, kafkaConnectTo: false });
    const resources = template.Resources as Record<string, any>;
    const apiFunction = resources[cfLogicalNames.lambda('api')];
    const statements = resources[cfLogicalNames.lambdaRole('api')].Properties.Policies.flatMap(
      ({ PolicyDocument }: any) => PolicyDocument.Statement
    );

    expect(apiFunction.Properties.VpcConfig).toBeUndefined();
    expect(JSON.stringify(apiFunction.Properties.Environment.Variables)).not.toContain('STP_KAFKA_CLUSTER');
    for (const action of [
      'kafka:DescribeClusterV2',
      'kafka:GetBootstrapBrokers',
      'kafka-cluster:Connect',
      'kafka-cluster:DescribeTopic',
      'kafka-cluster:ReadData',
      'kafka-cluster:DescribeGroup',
      'kafka-cluster:AlterGroup',
      'ec2:CreateNetworkInterface',
      'ec2:DescribeNetworkInterfaces',
      'ec2:DeleteNetworkInterface'
    ]) {
      expect(statements.some(({ Action }: any) => Action?.includes?.(action))).toBe(true);
    }
    expect(statements.some(({ Action }: any) => Action?.includes?.('kafka-cluster:CreateTopic'))).toBe(false);
    expect(statements.some(({ Action }: any) => Action?.includes?.('kafka-cluster:WriteData'))).toBe(false);
  });

  test('keeps costly Kafka resources out of dev unless remote use is explicit', async () => {
    const localTemplate = await synthesizeDenseFixture({ includeKafka: true, command: 'dev' });
    expect(Object.values(localTemplate.Resources).some(({ Type }) => Type === 'AWS::MSK::ServerlessCluster')).toBe(
      false
    );
    expect(
      Object.values(localTemplate.Resources).some(
        ({ Type, Properties }: any) => Type === 'AWS::Lambda::EventSourceMapping' && Properties.Topics?.[0] === 'orders'
      )
    ).toBe(false);
    expect(JSON.stringify(localTemplate)).not.toContain('kafka:GetBootstrapBrokers');

    const remoteTemplate = await synthesizeDenseFixture({
      includeKafka: true,
      command: 'dev',
      remoteResources: ['kafkaCluster']
    });
    expect(Object.values(remoteTemplate.Resources).some(({ Type }) => Type === 'AWS::MSK::ServerlessCluster')).toBe(
      true
    );
    expect(JSON.stringify(remoteTemplate)).not.toMatch(/WorkloadSecurityGroup[^"}]*Ref/);

    const configOptInTemplate = await synthesizeDenseFixture({
      includeKafka: true,
      kafkaRemoteInDev: true,
      command: 'dev'
    });
    expect(
      Object.values(configOptInTemplate.Resources).some(({ Type }) => Type === 'AWS::MSK::ServerlessCluster')
    ).toBe(true);
  });

  test('synthesizes a complete WebSocket API with automatic handler access', async () => {
    const template = await synthesizeDenseFixture({ includeWebsocket: true });
    const resources = template.Resources as Record<string, any>;
    const apiLogicalName = cfLogicalNames.websocketApi('realtime');
    const stageLogicalName = cfLogicalNames.websocketApiStage('realtime');
    const connectRouteLogicalName = cfLogicalNames.websocketApiRoute({
      routeKey: '$connect',
      stpResourceName: 'realtime'
    });
    const messageRouteLogicalName = cfLogicalNames.websocketApiRoute({
      routeKey: 'sendMessage',
      stpResourceName: 'realtime'
    });
    const messageRouteResponseLogicalName = cfLogicalNames.websocketApiRouteResponse({
      routeKey: 'sendMessage',
      stpResourceName: 'realtime'
    });

    expect(resources[apiLogicalName]).toMatchObject({
      Type: 'AWS::ApiGatewayV2::Api',
      Properties: { ProtocolType: 'WEBSOCKET', RouteSelectionExpression: '$request.body.action' }
    });
    expect(resources[stageLogicalName]).toMatchObject({
      Type: 'AWS::ApiGatewayV2::Stage',
      DependsOn: [connectRouteLogicalName, messageRouteLogicalName, messageRouteResponseLogicalName],
      Properties: { AutoDeploy: true, StageName: 'default' }
    });
    expect(resources[connectRouteLogicalName].Properties).toMatchObject({
      AuthorizationType: 'CUSTOM',
      AuthorizerId: { Ref: cfLogicalNames.websocketApiAuthorizer('realtime') },
      RouteKey: '$connect'
    });
    expect(resources[messageRouteLogicalName].Properties).toMatchObject({
      AuthorizationType: 'NONE',
      RouteKey: 'sendMessage',
      RouteResponseSelectionExpression: '$default'
    });
    expect(Object.values(resources).some(({ Type }) => Type === 'AWS::ApiGatewayV2::Deployment')).toBe(false);
    expect(resources[messageRouteResponseLogicalName]).toEqual({
      Type: 'AWS::ApiGatewayV2::RouteResponse',
      DependsOn: [],
      Properties: {
        ApiId: { Ref: apiLogicalName },
        RouteId: { Ref: messageRouteLogicalName },
        RouteResponseKey: '$default'
      }
    });
    expect(resources[cfLogicalNames.websocketApiAuthorizer('realtime')]).toMatchObject({
      Type: 'AWS::ApiGatewayV2::Authorizer',
      Properties: {
        AuthorizerType: 'REQUEST',
        IdentitySource: ['route.request.header.Authorization']
      }
    });
    expect(resources[cfLogicalNames.websocketApiAuthorizer('realtime')].Properties).not.toHaveProperty(
      'AuthorizerPayloadFormatVersion'
    );

    const handler = resources[cfLogicalNames.lambda('realtimeHandler')];
    expect(handler.Properties.Environment.Variables).toMatchObject({
      STP_REALTIME_API_ID: { Ref: apiLogicalName },
      STP_REALTIME_MANAGEMENT_ENDPOINT: expect.any(Object),
      STP_REALTIME_URL: expect.any(Object)
    });
    const role = resources[cfLogicalNames.lambdaRole('realtimeHandler')];
    expect(JSON.stringify(role)).toContain('execute-api:ManageConnections');
    expect(JSON.stringify(role)).toContain('/default/POST/@connections');
  });

  test('applies resource and final transforms during real template finalization', () => {
    const resources = synthesizedTemplate.Resources as Record<string, any>;

    expect(resources.FilesBucket.Properties.VersioningConfiguration).toEqual({ Status: 'Enabled' });
    expect(synthesizedTemplate.Metadata).toMatchObject({ ConfigAuthoringFinalTransform: true });
  });

  test('reports a resource transform failure with its logical resource and original cause', async () => {
    const authoredError = new Error('Bucket encryption transform failed');
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.transforms.FilesBucket = () => {
            throw authoredError;
          };
        }
      })
    );

    expect(error).toBeInstanceOf(CliError);
    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_RESOURCE_TRANSFORM_FAILED',
      message:
        'Resource transform for CloudFormation resource `FilesBucket` failed: Bucket encryption transform failed',
      userStackTrace: expect.stringContaining('synthesis-contract.spec.ts')
    });
    expect((error as Error).cause).toBe(authoredError);
  });

  test('reports a final transform failure with its original cause', async () => {
    const authoredError = new Error('Final policy transform failed');
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.finalTransform = () => {
            throw authoredError;
          };
        }
      })
    );

    expect(error).toBeInstanceOf(CliError);
    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_FINAL_TRANSFORM_FAILED',
      message: 'Final template transform failed: Final policy transform failed',
      userStackTrace: expect.stringContaining('synthesis-contract.spec.ts')
    });
    expect((error as Error).cause).toBe(authoredError);
  });

  test('does not wrap a semantic error thrown by an authored transform', async () => {
    const authoredError = new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AUTHORED_TRANSFORM_REJECTED',
      message: 'The authored transform rejected this configuration.'
    });
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.finalTransform = () => {
            throw authoredError;
          };
        }
      })
    );

    expect(error).toBe(authoredError);
  });

  test('rejects a resource transform that returns invalid CloudFormation properties', async () => {
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.transforms.FilesBucket = (() =>
            undefined) as unknown as (typeof configManager.transforms)[string];
        }
      })
    );

    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_RESOURCE_TRANSFORM_FAILED',
      message:
        'Resource transform for CloudFormation resource `FilesBucket` failed: Resource transforms must return a CloudFormation properties object, but this transform returned undefined.'
    });
    expect((error as Error).cause).toBeInstanceOf(TypeError);
  });

  test('rejects an accidental asynchronous resource transform', async () => {
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.transforms.FilesBucket = (async (properties) => properties) as unknown as (
            properties: Record<string, unknown>
          ) => Record<string, unknown>;
        }
      })
    );

    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_RESOURCE_TRANSFORM_FAILED',
      message:
        'Resource transform for CloudFormation resource `FilesBucket` failed: Resource transforms must return a CloudFormation properties object, but this transform returned a Promise.'
    });
    expect((error as Error).cause).toBeInstanceOf(TypeError);
  });

  test('rejects an accidental asynchronous final transform', async () => {
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.finalTransform = (async () => ({ Resources: {} })) as unknown as NonNullable<
            typeof configManager.finalTransform
          >;
        }
      })
    );

    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_FINAL_TRANSFORM_FAILED',
      message:
        'Final template transform failed: Final template transforms must return a CloudFormation template with a Resources object, but this transform returned a Promise.'
    });
    expect((error as Error).cause).toBeInstanceOf(TypeError);
  });

  test('preserves a primitive value thrown by an authored transform', async () => {
    const authoredError = 'plain authored transform failure';
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.finalTransform = () => {
            throw authoredError;
          };
        }
      })
    );

    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_FINAL_TRANSFORM_FAILED',
      message: 'Final template transform failed: plain authored transform failure',
      userStackTrace: undefined
    });
    expect((error as Error).cause).toBe(authoredError);
  });

  test('reports a transform whose CloudFormation target was not synthesized', async () => {
    const error = await captureRejectedError(() =>
      synthesizeDenseFixture({
        beforeFinalize: () => {
          configManager.transforms.MissingResource = (properties) => properties;
        }
      })
    );

    expect(error).toMatchObject({
      category: 'SOURCE_CODE',
      code: 'CONFIG_RESOURCE_TRANSFORM_TARGET_MISSING',
      message: 'Resource transform target `MissingResource` does not exist in the synthesized CloudFormation template.',
      hints: ['Check that the transform targets a resource synthesized by this command and configuration.']
    });
  });

  test('rejects a resource override that targets an unrelated CloudFormation resource', async () => {
    await expect(
      synthesizeDenseFixture({
        beforeFinalize: () => {
          (configManager.config.resources.files as any).overrides = {
            NotAChildResource: { BucketName: 'invalid-override-target' }
          };
        }
      })
    ).rejects.toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RESOURCE_OVERRIDE_TARGET_INVALID',
      message: 'CloudFormation resource `NotAChildResource` is not a child of Stacktape resource `files`.',
      hints: [expect.stringContaining('`FilesBucket`')]
    });
  });

  test('ignores overrides for a database intentionally kept local in dev mode', async () => {
    const template = await synthesizeDenseFixture({
      command: 'dev',
      beforeFinalize: () => {
        setDatabaseOverrides({ DatabaseDbInstance: { DeletionProtection: true } });
      }
    });

    expect(template.Resources.DatabaseDbInstance).toBeUndefined();
  });

  test('applies the same database override during ordinary synthesis', async () => {
    const template = await synthesizeDenseFixture({
      beforeFinalize: () => {
        setDatabaseOverrides({ DatabaseDbInstance: { DeletionProtection: true } });
      }
    });

    expect(template.Resources.DatabaseDbInstance?.Properties).toMatchObject({ DeletionProtection: true });
  });

  test('applies overrides when the same dev database is selected as remote', async () => {
    const template = await synthesizeDenseFixture({
      command: 'dev',
      remoteResources: ['database'],
      beforeFinalize: () => {
        setDatabaseOverrides({ DatabaseDbInstance: { DeletionProtection: true } });
      }
    });

    expect(template.Resources.DatabaseDbInstance?.Properties).toMatchObject({ DeletionProtection: true });
  });

  test('ignores remote-service overrides when a web service runs locally in dev mode', async () => {
    const template = await synthesizeDenseFixture({
      command: 'dev',
      beforeFinalize: () => {
        setWebServiceOverrides({ WebService: { DesiredCount: 2 } });
      }
    });

    expect(template.Resources.WebService).toBeUndefined();
    expect(template.Resources.WebRole).toBeDefined();
  });

  test('still rejects an unrelated override target for a remote dev database', async () => {
    await expect(
      synthesizeDenseFixture({
        command: 'dev',
        remoteResources: ['database'],
        beforeFinalize: () => {
          setDatabaseOverrides({ NotADatabaseChild: { DeletionProtection: true } });
        }
      })
    ).rejects.toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RESOURCE_OVERRIDE_TARGET_INVALID',
      message: 'CloudFormation resource `NotADatabaseChild` is not a child of Stacktape resource `database`.'
    });
  });

  test('names exported outputs from the explicitly initialized stack context', () => {
    expect((synthesizedTemplate.Outputs.apiUrl as { Export: { Name: string } }).Export.Name).toBe(
      'CharacterizationBaselineApiUrl'
    );
  });

  test('preserves resource identities, physical names, and dependency edges', async () => {
    const expectedManifest = await Bun.file(
      new URL('./fixtures/dense-application.identity.json', import.meta.url)
    ).json();

    expect(createSynthesisIdentityManifest(synthesizedTemplate)).toEqual(expectedManifest);
  });

  test('applies the shared EventBridge target contract to an SQS queue', () => {
    const rule = (synthesizedTemplate.Resources as Record<string, any>).JobsEvent0Rule;

    expect(rule.Properties.Targets).toEqual([
      expect.objectContaining({
        Arn: { 'Fn::GetAtt': ['JobsQueue', 'Arn'] },
        DeadLetterConfig: { Arn: { 'Fn::GetAtt': ['DeadLettersQueue', 'Arn'] } },
        Id: 'jobs-event-bus-target-0',
        Input: { 'Fn::Sub': '{"source":"event-bus"}' },
        SqsParameters: { MessageGroupId: 'job-events' }
      })
    ]);
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
    const devAgentSqsActions = resources.StpDevAgentRole.Properties.Policies.find(
      ({ PolicyName }: { PolicyName: string }) => PolicyName === 'sqs-access'
    ).PolicyDocument.Statement[0].Action;
    expect(devAgentSqsActions).toContain('sqs:SendMessage');
    expect(devAgentSqsActions).toContain('sqs:DeleteMessage');
    expect(devAgentSqsActions).not.toContain('sqs:SendMessageBatch');
    expect(devAgentSqsActions).not.toContain('sqs:DeleteMessageBatch');
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

describe('load balancer and CDN synthesis contract', () => {
  const literalValue = <Value>(value: CloudFormationValue<Value>, description: string): Value => {
    if (isIntrinsic(value)) {
      throw new Error(`Expected a literal ${description}, received a CloudFormation intrinsic.`);
    }
    return value as Value;
  };

  const resourcesOfType = <Type extends KnownCloudFormationResourceType>(type: Type) =>
    Object.values(synthesizedTemplate.Resources).filter(
      (resource): resource is KnownCloudFormationResource<Type> => resource.Type === type
    );

  test('supplies the defaulted listener pair for a load balancer that authored none', () => {
    const listenerPorts = resourcesOfType('AWS::ElasticLoadBalancingV2::Listener')
      .map((listener) => literalValue(listener.Properties.Port, 'listener port'))
      .sort((left, right) => left - right);

    expect(listenerPorts).toEqual([80, 443]);
  });

  test('redirects the plain HTTP listener and terminates TLS on the HTTPS one', () => {
    const byPort = new Map(
      resourcesOfType('AWS::ElasticLoadBalancingV2::Listener').map((listener) => [
        literalValue(listener.Properties.Port, 'listener port'),
        listener.Properties
      ])
    );

    expect(byPort.get(80).Protocol).toBe('HTTP');
    expect(byPort.get(80).DefaultActions[0]).toMatchObject({
      Type: 'redirect',
      RedirectConfig: { Protocol: 'HTTPS', StatusCode: 'HTTP_301' }
    });
    expect(byPort.get(443).Protocol).toBe('HTTPS');
  });

  test('routes the integrated Lambda through a target group on the HTTPS listener', () => {
    const [rule] = resourcesOfType('AWS::ElasticLoadBalancingV2::ListenerRule');

    expect(rule.Properties.Priority).toBe(1);
    expect(rule.Properties.Conditions).toContainEqual({
      Field: 'path-pattern',
      PathPatternConfig: { Values: ['/*'] }
    });
    expect(rule.Properties.Actions[0].Type).toBe('forward');
    expect(resourcesOfType('AWS::ElasticLoadBalancingV2::TargetGroup')[0].Properties.TargetType).toBe('lambda');
  });

  test('attaches a CloudFront distribution whose default origin is the load balancer', () => {
    const distributions = resourcesOfType('AWS::CloudFront::Distribution');
    const [distribution] = distributions;
    const distributionConfig = literalValue(
      distribution.Properties.DistributionConfig,
      'CloudFront distribution configuration'
    );
    const origins = distributionConfig.Origins;

    // One enabled CDN on one load balancer synthesizes exactly one distribution: the guard the resolvers branch on
    // decides both whether any distribution is built and how many, so the count is part of what it contracts for.
    expect(distributions).toHaveLength(1);
    expect(distributionConfig.Enabled).toBe(true);
    expect(origins).toHaveLength(2);
    expect(origins[0].Id).toBe('edge0');
    expect(origins[0].DomainName).toBe('edge.internal.example.com');
    expect(origins[0].OriginPath).toBe('/service');
    expect(origins[0].OriginCustomHeaders).toContainEqual({
      HeaderName: 'X-Stp-Origin-Request-Origin-Type',
      HeaderValue: 'application-load-balancer'
    });
    expect(origins[0].CustomOriginConfig).toMatchObject({ OriginProtocolPolicy: 'https-only', HTTPSPort: 443 });
  });

  test('routes an omitted-target CDN rewrite back to the load balancer origin', () => {
    const [distribution] = resourcesOfType('AWS::CloudFront::Distribution');
    const { CacheBehaviors: cacheBehaviors, Origins: origins } = literalValue(
      distribution.Properties.DistributionConfig,
      'CloudFront distribution configuration'
    );

    expect(origins[1]).toMatchObject({
      Id: 'edge1',
      DomainName: 'edge.internal.example.com',
      OriginPath: '/service',
      CustomOriginConfig: { OriginProtocolPolicy: 'https-only', HTTPSPort: 443 }
    });
    expect(cacheBehaviors[0]).toMatchObject({
      PathPattern: '/same-origin/*',
      TargetOriginId: 'edge1'
    });
  });
});

describe('enabled-CDN predicate', () => {
  // `hasEnabledCdn` is the branch the resolvers above already took, written so that it also narrows the resource for
  // the CloudFront helpers it guards. These pin the three configurations it has to tell apart.

  const bucketWith = (cdn?: StpBucket['cdn']): StpBucket => ({
    name: 'assets',
    type: 'bucket',
    nameChain: ['assets'],
    configParentResourceType: 'bucket',
    ...(cdn ? { cdn } : {})
  });

  test('rejects a resource that authored no CDN block at all', () => {
    expect(hasEnabledCdn(bucketWith())).toBe(false);
  });

  test('rejects a CDN block that is present but switched off', () => {
    // A disabled block is authored, so absence alone is not the question the resolvers ask.
    expect(hasEnabledCdn(bucketWith({ enabled: false }))).toBe(false);
  });

  test('accepts a CDN block that is switched on', () => {
    expect(hasEnabledCdn(bucketWith({ enabled: true }))).toBe(true);
  });

  test('narrows the resource so a guarded caller can read the CDN block', () => {
    const bucket = bucketWith({ enabled: true, errorDocument: 'oops.html' });

    if (!hasEnabledCdn(bucket)) throw new Error('expected the enabled CDN fixture to pass the predicate');

    // Reachable only because the predicate narrowed `bucket`; before the guard `cdn` is optional.
    expect(bucket.cdn.errorDocument).toBe('oops.html');
  });

  /**
   * The narrowing itself, checked through the optionality modifier rather than by reading a property: this project's
   * test typecheck runs with `strictNullChecks` off, where an optional property is freely assignable to a required
   * one, so a plain read would prove nothing. The production proof is stronger and lives in the resolvers — the five
   * CloudFront helpers now demand `ResourceWithPresentCdn`, and the six-project typecheck only passes because every
   * call site sits inside one of these guards.
   */
  const cdnIsOptionalBeforeTheGuard: {} extends Pick<StpBucket, 'cdn'> ? false : true = false;
  const cdnIsRequiredAfterTheGuard: {} extends Pick<ResourceWithPresentCdn<StpBucket>, 'cdn'> ? false : true = true;

  test('treats the CDN block as optional before the guard and present after it', () => {
    expect(cdnIsOptionalBeforeTheGuard).toBe(false);
    expect(cdnIsRequiredAfterTheGuard).toBe(true);
  });
});
