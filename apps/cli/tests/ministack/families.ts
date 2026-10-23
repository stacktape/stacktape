/**
 * The resource families the offline deploy loop qualifies, one row each: a small config, the meaningful update the
 * second version makes, and the effects the real AWS SDK must observe against MiniStack after create, update and the
 * unchanged redeploy. A row with `knownGap` stays in the table but is skipped with the blocking reason;
 * delete the field once the gap is fixed and re-qualified.
 */
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { ApiGatewayV2Client, GetRoutesCommand, GetStagesCommand } from '@aws-sdk/client-apigatewayv2';
import {
  ApplicationAutoScalingClient,
  DescribeScalableTargetsCommand,
  DescribeScalingPoliciesCommand
} from '@aws-sdk/client-application-auto-scaling';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  type StackResourceSummary,
  UpdateTerminationProtectionCommand
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeTableCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
  DescribeClustersCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  ECSClient
} from '@aws-sdk/client-ecs';
import { DescribeEventBusCommand, EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
  GetFunctionConfigurationCommand,
  GetLayerVersionByArnCommand,
  InvokeCommand,
  LambdaClient
} from '@aws-sdk/client-lambda';
import {
  DeleteObjectCommand,
  GetBucketNotificationConfigurationCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { GetQueueAttributesCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { MiniStack } from '@stacktape/ministack/fixture';
import type { ControlPlaneCall } from '../cli-process/control-plane-fake';
import type { DeployStep } from './harness';
import { splitLambdaFamily } from './split-lambda-family';

export type Version = 1 | 2;

export type EffectClients = {
  cloudFormation: CloudFormationClient;
  s3: S3Client;
  lambda: LambdaClient;
  dynamo: DynamoDBClient;
  sqs: SQSClient;
  sns: SNSClient;
  events: EventBridgeClient;
  logs: CloudWatchLogsClient;
  apiGateway: ApiGatewayV2Client;
  ecs: ECSClient;
  autoScaling: ApplicationAutoScalingClient;
};

export const createEffectClients = (ministack: MiniStack): EffectClients => {
  const config = ministack.clientConfig();
  return {
    cloudFormation: new CloudFormationClient(config),
    s3: new S3Client(config),
    lambda: new LambdaClient(config),
    dynamo: new DynamoDBClient(config),
    sqs: new SQSClient(config),
    sns: new SNSClient(config),
    events: new EventBridgeClient(config),
    logs: new CloudWatchLogsClient(config),
    apiGateway: new ApiGatewayV2Client(config),
    ecs: new ECSClient(config),
    autoScaling: new ApplicationAutoScalingClient(config)
  };
};

export const destroyEffectClients = (clients: EffectClients) => {
  for (const client of Object.values(clients)) client.destroy();
};

export type EffectContext = {
  step: Exclude<DeployStep, 'delete'>;
  /** The config version deployed: 1 after create/rollback; 2 after update, unchanged redeploy and diff. */
  version: Version;
  endpoint: string;
  stackName: string;
  resources: StackResourceSummary[];
  clients: EffectClients;
  /** The physical ID of the stack resource with this logical ID. */
  physical: (logicalId: string) => string;
  /** Physical IDs of every stack resource of this CloudFormation type. */
  physicalOfType: (type: string) => string[];
  /** Every call the control-plane fake received so far, from the CLI and from code running in the stack. */
  controlPlaneCalls: readonly ControlPlaneCall[];
  /** What the effects proved, for the lane report. */
  checks: string[];
};

export type Family = {
  name: string;
  /** Why the row cannot pass yet; include the upstream issue when the emulator blocks it. */
  knownGap?: string;
  /** The Stacktape config at a version; version 2 is the meaningful update. */
  config: (version: Version) => Record<string, unknown>;
  /** Project files besides `stacktape.yml`, by name. */
  files: (version: Version) => Record<string, string>;
  assertEffects: (context: EffectContext) => Promise<void>;
  /** Runs after a successful `delete`, for effects outside the stack. */
  assertDeleted?: (context: Pick<EffectContext, 'stackName' | 'controlPlaneCalls' | 'checks'>) => void;
  /** Runs before `delete`: removes what would stop the stack from deleting (objects in buckets). */
  beforeDelete?: (context: Omit<EffectContext, 'step' | 'version' | 'checks' | 'controlPlaneCalls'>) => Promise<void>;
};

const handlerSource = (version: Version, extra = '') =>
  `export default async (event) => { console.log("ministack-event", JSON.stringify(event)); ${extra}return { statusCode: 200, body: "ministack-v${version}" }; };\n`;

const jsBundleFunction = (version: Version, properties: Record<string, unknown> = {}) => ({
  type: 'function',
  properties: {
    packaging: { type: 'js-bundle', properties: { entryfilePath: 'handler.ts' } },
    memory: version === 1 ? 256 : 512,
    ...properties
  }
});

/** Never pulled: the emulator has no Docker access, so ECS records the services and tasks without running them. */
const CONTAINER_IMAGE = 'public.ecr.aws/docker/library/nginx:alpine';

/** The queue URL on the emulator; CloudFormation reports the AWS-shaped URL of the emulator's own host. */
const queueUrl = (endpoint: string, physicalId: string) => new URL(new URL(physicalId).pathname, endpoint).href;

const awaitLogLine = async (
  { clients, checks }: Pick<EffectContext, 'clients' | 'checks'>,
  functionName: string,
  expected: string,
  what: string
) => {
  for (const deadline = Date.now() + 15_000; ;) {
    const found = (
      await clients.logs
        .send(
          new FilterLogEventsCommand({ logGroupName: `/aws/lambda/${functionName}`, filterPattern: 'ministack-event' })
        )
        .catch(() => ({ events: [] }))
    ).events?.some((event) => event.message?.includes(expected));
    if (found) {
      checks.push(`${what} delivered to ${functionName} (observed in its logs)`);
      return;
    }
    if (Date.now() > deadline) throw new Error(`${what} was not observed in the logs of ${functionName}`);
    await delay(200);
  }
};

type DefaultDomainRecord = { domainName: string; stackName: string; targetInfo: { domainName: string } };

/** The default-domain DNS record calls the service Lambda made for one stack. */
const defaultDomainCalls = (
  { controlPlaneCalls, stackName }: Pick<EffectContext, 'controlPlaneCalls' | 'stackName'>,
  procedure: 'upsertDefaultDomainDnsRecord' | 'deleteDefaultDomainDnsRecord'
) =>
  controlPlaneCalls
    .filter((call) => call.procedure === procedure)
    .map((call) => call.input as DefaultDomainRecord)
    .filter((input) => input.stackName === stackName);

const assertFunctionRuns = async (context: EffectContext, functionName: string) => {
  const configuration = await context.clients.lambda.send(
    new GetFunctionConfigurationCommand({ FunctionName: functionName })
  );
  assert.equal(configuration.MemorySize, context.version === 1 ? 256 : 512, `${functionName} memory`);
  const invoked = await context.clients.lambda.send(
    new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from('{}') })
  );
  assert.equal(invoked.FunctionError, undefined, `${functionName} invocation failed`);
  const payload = JSON.parse(Buffer.from(invoked.Payload!).toString()) as { body?: string };
  assert.equal(payload.body, `ministack-v${context.version}`, `${functionName} runs the deployed source version`);
  context.checks.push(`${functionName} executes version ${context.version} with its memory setting`);
};

const assertBucketKeepsData = async (context: EffectContext, bucket: string, synced = false) => {
  if (!synced && context.step === 'create') {
    await context.clients.s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: 'probe-state', Body: 'survives-update' })
    );
  }
  const object = await context.clients.s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'probe-state' }));
  assert.equal(await object.Body?.transformToString(), 'survives-update', 'bucket data was lost');
  context.checks.push('bucket data preserved across update');
};

const removeProbeObjects = async (
  { clients, physical }: Pick<EffectContext, 'clients' | 'physical'>,
  keys: string[]
) => {
  for (const key of keys) {
    await clients.s3
      .send(new DeleteObjectCommand({ Bucket: physical('BucketBucket'), Key: key }))
      .catch(() => undefined);
  }
};

export const families: Family[] = [
  splitLambdaFamily,
  {
    name: 'lambda-http-api',
    config: (version) => ({
      resources: {
        gateway: { type: 'http-api-gateway' },
        handler: jsBundleFunction(version, {
          events: [
            { type: 'http-api-gateway', properties: { httpApiGatewayName: 'gateway', method: 'GET', path: '/' } }
          ]
        })
      }
    }),
    files: (version) => ({ 'handler.ts': handlerSource(version) }),
    assertEffects: async (context) => {
      const functionName = context.physical('HandlerFunction');
      await assertFunctionRuns(context, functionName);
      const [apiId] = context.physicalOfType('AWS::ApiGatewayV2::Api');
      assert.ok(apiId, 'the stack has no HTTP API');
      const routes = (await context.clients.apiGateway.send(new GetRoutesCommand({ ApiId: apiId }))).Items ?? [];
      assert.ok(
        routes.some((route) => route.RouteKey === 'GET /'),
        `the HTTP API has no GET / route (${routes.map((route) => route.RouteKey).join(', ')})`
      );
      const stages = (await context.clients.apiGateway.send(new GetStagesCommand({ ApiId: apiId }))).Items ?? [];
      assert.equal(stages.length, 1, 'the HTTP API must have one deployed stage');
      const stageName = stages[0].StageName;
      assert.ok(stageName, 'the HTTP API stage has no name');
      const response = await fetch(`${context.endpoint}/_aws/execute-api/${apiId}/${stageName}/`);
      assert.equal(response.status, 200, `GET through the HTTP API answered ${response.status}`);
      assert.equal(await response.text(), `ministack-v${context.version}`, 'the HTTP API did not reach the function');
      context.checks.push(`GET / through the HTTP API returns version ${context.version}`);
      // The default-domain custom resource runs in Stacktape's service Lambda inside the emulator and registers the
      // API's domain with the control plane once; updates that do not touch the domain do not call it again.
      const upserts = defaultDomainCalls(context, 'upsertDefaultDomainDnsRecord');
      assert.equal(upserts.length, 1, `default-domain registrations: ${JSON.stringify(upserts)}`);
      assert.match(upserts[0].domainName, /-00000000\.stacktape-app\.com$/, 'the registered default domain');
      assert.ok(upserts[0].targetInfo.domainName, 'the registration has no API Gateway target domain');
      context.checks.push(`the service Lambda registered ${upserts[0].domainName} with the control plane once`);
    },
    assertDeleted: (context) => {
      const [upsert] = defaultDomainCalls(context, 'upsertDefaultDomainDnsRecord');
      const deletions = defaultDomainCalls(context, 'deleteDefaultDomainDnsRecord');
      assert.deepEqual(
        deletions.map(({ domainName }) => domainName),
        [upsert?.domainName],
        'delete must remove the registered default domain once'
      );
      context.checks.push(`the service Lambda removed ${upsert?.domainName} from the control plane`);
    }
  },
  {
    name: 'bucket-queue-table-function',
    config: (version) => ({
      resources: {
        bucket: {
          type: 'bucket',
          properties: { versioning: true, directoryUpload: { directoryPath: 'sync-content' } }
        },
        queue: { type: 'sqs-queue', properties: { visibilityTimeoutSeconds: version === 1 ? 60 : 90 } },
        table: {
          type: 'dynamo-db-table',
          properties: { primaryKey: { partitionKey: { name: 'id', type: 'string' } } }
        },
        handler: jsBundleFunction(version, {
          connectTo: ['bucket', 'queue', 'table'],
          events: [{ type: 'sqs', properties: { sqsQueueName: 'queue' } }]
        })
      }
    }),
    files: (version) => ({ 'handler.ts': handlerSource(version), 'sync-content/probe-state': 'survives-update' }),
    assertEffects: async (context) => {
      const functionName = context.physical('HandlerFunction');
      await assertFunctionRuns(context, functionName);
      // The stack also holds Stacktape's deployment bucket; only the configured bucket is the customer's.
      const bucket = context.physical('BucketBucket');
      await assertBucketKeepsData(context, bucket, true);
      const [queue] = context.physicalOfType('AWS::SQS::Queue');
      assert.ok(queue, 'the stack has no queue');
      const url = queueUrl(context.endpoint, queue);
      const attributes = await context.clients.sqs.send(
        new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['VisibilityTimeout'] })
      );
      assert.equal(attributes.Attributes?.VisibilityTimeout, context.version === 1 ? '60' : '90', 'queue visibility');
      context.checks.push(`queue visibility timeout matches version ${context.version}`);
      const [table] = context.physicalOfType('AWS::DynamoDB::GlobalTable');
      assert.ok(table, 'the stack has no table');
      if (context.step === 'create') {
        await context.clients.dynamo.send(
          new PutItemCommand({ TableName: table, Item: { id: { S: 'probe-state' }, marker: { S: 'survives-update' } } })
        );
      }
      const item = await context.clients.dynamo.send(
        new GetItemCommand({ TableName: table, Key: { id: { S: 'probe-state' } } })
      );
      assert.equal(item.Item?.marker?.S, 'survives-update', 'table data was lost');
      context.checks.push('table data preserved across update');
      const marker = `queue-${context.step}-${context.version}`;
      await context.clients.sqs.send(new SendMessageCommand({ QueueUrl: url, MessageBody: marker }));
      await awaitLogLine(context, functionName, marker, 'an SQS message');
    }
  },
  {
    name: 'sns-fan-out',
    config: (version) => ({
      // One previous version is kept, and the update turns termination protection on.
      deploymentConfig: { previousVersionsToKeep: 1, terminationProtection: version === 2 },
      resources: {
        topic: { type: 'sns-topic' },
        first: jsBundleFunction(version, { events: [{ type: 'sns', properties: { snsTopicName: 'topic' } }] }),
        second: jsBundleFunction(version, { events: [{ type: 'sns', properties: { snsTopicName: 'topic' } }] })
      }
    }),
    files: (version) => ({ 'handler.ts': handlerSource(version) }),
    assertEffects: async (context) => {
      const functions = [context.physical('FirstFunction'), context.physical('SecondFunction')];
      for (const functionName of functions) await assertFunctionRuns(context, functionName);
      const [topic] = context.physicalOfType('AWS::SNS::Topic');
      assert.ok(topic, 'the stack has no topic');
      const marker = `topic-${context.step}-${context.version}`;
      await context.clients.sns.send(new PublishCommand({ TopicArn: topic, Message: marker }));
      for (const functionName of functions) await awaitLogLine(context, functionName, marker, 'a published message');
      const [stack] =
        (await context.clients.cloudFormation.send(new DescribeStacksCommand({ StackName: context.stackName })))
          .Stacks ?? [];
      assert.equal(stack?.EnableTerminationProtection, context.version === 2, 'termination protection');
      context.checks.push(`termination protection is ${context.version === 2 ? 'on' : 'off'} as configured`);
      if (context.step === 'unchanged') {
        // The unchanged redeploy created no release, so the current release and the one before it remain.
        const templates = (
          (
            await context.clients.s3.send(
              new ListObjectsV2Command({ Bucket: context.physical('StpDeploymentBucket'), Prefix: 'cf-template/' })
            )
          ).Contents ?? []
        )
          .map(({ Key }) => Key)
          .toSorted();
        assert.deepEqual(templates, ['cf-template/v000001.yml', 'cf-template/v000002.yml'], 'retained templates');
        context.checks.push('previousVersionsToKeep: 1 keeps the current and one previous template');
      }
    },
    // Termination protection must be off before the stack can be deleted; customers turn it off by redeploying.
    beforeDelete: async ({ clients, stackName }) => {
      await clients.cloudFormation.send(
        new UpdateTerminationProtectionCommand({ StackName: stackName, EnableTerminationProtection: false })
      );
    }
  },
  {
    name: 's3-notification-custom-resource',
    config: (version) => ({
      resources: {
        bucket: { type: 'bucket' },
        handler: jsBundleFunction(version, {
          events: [
            {
              type: 's3',
              properties: {
                bucketArn: '$ResourceParam("bucket", "arn")',
                s3EventType: version === 1 ? 's3:ObjectCreated:*' : 's3:ObjectCreated:Put'
              }
            }
          ]
        })
      }
    }),
    files: (version) => ({ 'handler.ts': handlerSource(version) }),
    assertEffects: async (context) => {
      const handler = context.physical('HandlerFunction');
      await assertFunctionRuns(context, handler);
      // The stack also holds Stacktape's deployment bucket; only the configured bucket is the customer's.
      const bucket = context.physical('BucketBucket');
      await assertBucketKeepsData(context, bucket);
      const notifications = await context.clients.s3.send(
        new GetBucketNotificationConfigurationCommand({ Bucket: bucket })
      );
      const expectedEvent = context.version === 1 ? 's3:ObjectCreated:*' : 's3:ObjectCreated:Put';
      assert.ok(
        notifications.LambdaFunctionConfigurations?.some(
          (configuration) =>
            configuration.LambdaFunctionArn?.endsWith(`:${handler}`) && configuration.Events?.includes(expectedEvent)
        ),
        `the bucket does not notify ${handler} on ${expectedEvent}: ${JSON.stringify(notifications.LambdaFunctionConfigurations)}`
      );
      context.checks.push(
        `Stacktape's service Lambda installed the ${expectedEvent} notification through its custom resource`
      );
      const key = `probe-event-${context.step}-${context.version}`;
      await context.clients.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: key }));
      await awaitLogLine(context, handler, key, 'an S3 object-created event');
      await context.clients.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    beforeDelete: (context) => removeProbeObjects(context, ['probe-state'])
  },
  {
    name: 'event-bus-function',
    config: (version) => ({
      resources: {
        bus: { type: 'event-bus' },
        handler: jsBundleFunction(version, {
          events: [
            { type: 'event-bus', properties: { eventBusName: 'bus', eventPattern: { source: ['ministack.probe'] } } }
          ]
        })
      }
    }),
    files: (version) => ({ 'handler.ts': handlerSource(version) }),
    assertEffects: async (context) => {
      const handler = context.physical('HandlerFunction');
      await assertFunctionRuns(context, handler);
      const [bus] = context.physicalOfType('AWS::Events::EventBus');
      assert.ok(bus, 'the stack has no event bus');
      await context.clients.events.send(new DescribeEventBusCommand({ Name: bus }));
      const probe = `bus-event-${context.step}-v${context.version}`;
      const published = await context.clients.events.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: bus,
              Source: 'ministack.probe',
              DetailType: 'deploy-probe',
              Detail: JSON.stringify({ probe })
            }
          ]
        })
      );
      assert.equal(published.FailedEntryCount, 0, 'the event bus rejected the probe event');
      assert.ok(published.Entries?.[0]?.EventId, 'the event bus returned no event ID');
      await awaitLogLine(context, handler, probe, 'a bus event');
    }
  },
  {
    name: 'container-workloads',
    config: (version) => {
      const container = (properties: Record<string, unknown> = {}) => ({
        packaging: { type: 'prebuilt-image', properties: { image: CONTAINER_IMAGE } },
        ...properties
      });
      // The update doubles memory and moves the scaling range; Application Auto Scaling then raises every service's
      // desired count to the new minimum, since Stacktape's template leaves the count to it.
      const properties = {
        resources: { cpu: 0.25, memory: version === 1 ? 512 : 1024 },
        scaling:
          version === 1
            ? { minInstances: 1, maxInstances: 2 }
            : { minInstances: 2, maxInstances: 4, scalingPolicy: { keepAvgCpuUtilizationUnder: 60 } }
      };
      return {
        resources: {
          // The default HTTP API load balancing copies a drain image from public.ecr.aws, which no offline test reaches.
          web: {
            type: 'web-service',
            properties: {
              ...container({ port: 80, loadBalancing: { type: 'application-load-balancer' } }),
              ...properties
            }
          },
          worker: { type: 'worker-service', properties: { ...container(), ...properties } },
          batch: {
            type: 'multi-container-workload',
            properties: { containers: [{ name: 'app', ...container() }], ...properties }
          }
        }
      };
    },
    files: () => ({}),
    assertEffects: async (context) => {
      const expected =
        context.version === 1
          ? { min: 1, max: 2, memory: '512', cpuTarget: 80 }
          : { min: 2, max: 4, memory: '1024', cpuTarget: 60 };
      const services = context.resources.filter(({ ResourceType }) => ResourceType === 'AWS::ECS::Service');
      assert.deepEqual(
        services.map(({ LogicalResourceId }) => LogicalResourceId).toSorted(),
        ['BatchService', 'WebService', 'WorkerService'],
        'the stack must hold one ECS service per workload'
      );
      for (const workload of ['Batch', 'Web', 'Worker']) {
        const cluster = context.physical(`${workload}Cluster`);
        const serviceArn = context.physical(`${workload}Service`);
        const [service] =
          (await context.clients.ecs.send(new DescribeServicesCommand({ cluster, services: [serviceArn] }))).services ??
          [];
        assert.equal(service?.status, 'ACTIVE', `${workload} service status`);
        assert.equal(
          service.taskDefinition,
          context.physical(`${workload}TaskDefinition`),
          `${workload} service runs the stack's task definition`
        );
        const { taskDefinition } = await context.clients.ecs.send(
          new DescribeTaskDefinitionCommand({ taskDefinition: service.taskDefinition })
        );
        assert.equal(taskDefinition?.memory, expected.memory, `${workload} task memory`);
        assert.equal(taskDefinition?.cpu, '256', `${workload} task CPU`);
        assert.ok(
          taskDefinition?.containerDefinitions?.some(({ image }) => image === CONTAINER_IMAGE),
          `${workload} task does not run ${CONTAINER_IMAGE}`
        );
        const resourceId = `service/${cluster}/${service.serviceName}`;
        const [target] =
          (
            await context.clients.autoScaling.send(
              new DescribeScalableTargetsCommand({ ServiceNamespace: 'ecs', ResourceIds: [resourceId] })
            )
          ).ScalableTargets ?? [];
        assert.deepEqual(
          [target?.MinCapacity, target?.MaxCapacity],
          [expected.min, expected.max],
          `${workload} scaling range`
        );
        assert.equal(service.desiredCount, expected.min, `${workload} desired count follows the scaling minimum`);
        const policies =
          (
            await context.clients.autoScaling.send(
              new DescribeScalingPoliciesCommand({ ServiceNamespace: 'ecs', ResourceId: resourceId })
            )
          ).ScalingPolicies ?? [];
        const targets = Object.fromEntries(
          policies.map((policy) => [
            policy.TargetTrackingScalingPolicyConfiguration?.PredefinedMetricSpecification?.PredefinedMetricType,
            policy.TargetTrackingScalingPolicyConfiguration?.TargetValue
          ])
        );
        assert.deepEqual(
          targets,
          { ECSServiceAverageCPUUtilization: expected.cpuTarget, ECSServiceAverageMemoryUtilization: 80 },
          `${workload} target-tracking policies`
        );
      }
      context.checks.push(
        `three ECS services run ${expected.memory} MB tasks with scaling ${expected.min}-${expected.max}, desired count ${expected.min} and a ${expected.cpuTarget}% CPU target`
      );
    }
  }
];

/** Which deleted resources the loop can prove absent, by CloudFormation type. */
export const absenceProbes: Record<string, (clients: EffectClients, endpoint: string, id: string) => Promise<unknown>> =
  {
    'AWS::S3::Bucket': (clients, _endpoint, id) => clients.s3.send(new HeadBucketCommand({ Bucket: id })),
    'AWS::DynamoDB::GlobalTable': (clients, _endpoint, id) =>
      clients.dynamo.send(new DescribeTableCommand({ TableName: id })),
    'AWS::Lambda::LayerVersion': (clients, _endpoint, id) =>
      clients.lambda.send(new GetLayerVersionByArnCommand({ Arn: id })),
    'AWS::Lambda::Function': (clients, _endpoint, id) =>
      clients.lambda.send(new GetFunctionConfigurationCommand({ FunctionName: id })),
    'AWS::Events::EventBus': (clients, _endpoint, id) => clients.events.send(new DescribeEventBusCommand({ Name: id })),
    'AWS::SQS::Queue': (clients, endpoint, id) =>
      clients.sqs.send(
        new GetQueueAttributesCommand({ QueueUrl: queueUrl(endpoint, id), AttributeNames: ['QueueArn'] })
      ),
    'AWS::ApiGatewayV2::Api': (clients, _endpoint, id) => clients.apiGateway.send(new GetRoutesCommand({ ApiId: id })),
    // ECS keeps deleted clusters and services as INACTIVE, and Application Auto Scaling answers an empty list.
    'AWS::ECS::Cluster': async (clients, _endpoint, id) => {
      const [cluster] = (await clients.ecs.send(new DescribeClustersCommand({ clusters: [id] }))).clusters ?? [];
      if (!cluster || cluster.status === 'INACTIVE') throw new Error(`cluster ${id} does not exist`);
    },
    'AWS::ECS::Service': async (clients, _endpoint, id) => {
      const cluster = id.split('/').at(-2);
      const [service] =
        (await clients.ecs.send(new DescribeServicesCommand({ cluster, services: [id] }))).services ?? [];
      if (!service || service.status === 'INACTIVE') throw new Error(`service ${id} does not exist`);
    },
    'AWS::ApplicationAutoScaling::ScalableTarget': async (clients, _endpoint, id) => {
      const [resourceId, dimension, namespace] = id.split('|');
      const { ScalableTargets } = await clients.autoScaling.send(
        new DescribeScalableTargetsCommand({
          ServiceNamespace: namespace as 'ecs',
          ResourceIds: [resourceId],
          ScalableDimension: dimension as 'ecs:service:DesiredCount'
        })
      );
      if (!ScalableTargets?.length) throw new Error(`scalable target ${id} does not exist`);
    }
  };
