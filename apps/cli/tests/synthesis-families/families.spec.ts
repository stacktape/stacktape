/**
 * Resource families synthesize into valid, connected templates (J2.4).
 *
 * Each family that had no synthesis coverage gets one representative configuration through the real synthesis path
 * (`synthesizeFixture`, credential-free). The assertions state the connections a customer relies on: references
 * between the family's CloudFormation resources, the IAM permissions a workload receives, and the routing a request
 * takes. With `STACKTAPE_SYNTHESIS_FAMILY_TEMPLATE_OUTPUT_DIR` set, every synthesized template is written there so
 * `run-with-cfn-lint.ts` can validate it with cfn-lint.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, spyOn, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ECSClient, UpdateServiceCommand, type UpdateServiceCommandInput } from '@aws-sdk/client-ecs';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { operationReporter } from '@application-services/operation-manager';
import { updateEcsService } from '../../src/commands/_utils/cw-deployment';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime,
  AwsCdkConstruct,
  Bucket,
  Convex,
  CustomResourceDefinition,
  CustomResourceInstance,
  DockerfilePackaging,
  JsBundleImagePackaging,
  JsBundleLambdaPackaging,
  LambdaFunction,
  PrivateService,
  WebService,
  WorkerService,
  defineConfig
} from '@stacktape/config-authoring';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const fixturesDir = join(import.meta.dir, 'fixtures');
const templateOutputDirectory = process.env.STACKTAPE_SYNTHESIS_FAMILY_TEMPLATE_OUTPUT_DIR;

type Resource = { Type: string; Properties?: Record<string, any>; DependsOn?: string[] };

const authoringParams: Parameters<ReturnType<typeof defineConfig>>[0] = {
  projectName: 'characterization',
  stage: 'baseline',
  region: 'eu-west-1',
  cliArgs: {} as never,
  command: 'synth',
  awsProfile: '',
  user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
};

const synthesizeFamily = async (family: string, definedConfig: ReturnType<typeof defineConfig>) => {
  const template = await synthesizeFixture({ compiledConfig: definedConfig(authoringParams), workingDir: fixturesDir });
  if (templateOutputDirectory) {
    await mkdir(templateOutputDirectory, { recursive: true });
    await writeFile(join(templateOutputDirectory, `${family}.json`), `${JSON.stringify(template, null, 2)}\n`);
  }
  return template;
};

const resourcesOfType = (template: CloudFormationTemplate, type: string) =>
  Object.entries(template.Resources as Record<string, Resource>).filter(([, resource]) => resource.Type === type);

const onlyResourceOfType = (template: CloudFormationTemplate, type: string) => {
  const matches = resourcesOfType(template, type);
  expect(matches.map(([logicalId]) => logicalId)).toHaveLength(1);
  return { logicalId: matches[0][0], resource: matches[0][1] };
};

const json = (value: unknown) => JSON.stringify(value);

/**
 * Every `Ref` and `Fn::GetAtt` target must exist as a resource or a parameter, and every `DependsOn` entry as a
 * resource. cfn-lint also checks it; this keeps the failure readable.
 */
const expectReferencesResolve = (template: CloudFormationTemplate) => {
  const resources = template.Resources as Record<string, Resource>;
  const known = new Set([...Object.keys(resources), ...Object.keys(template.Parameters ?? {})]);
  const pseudo = (name: string) => name.startsWith('AWS::');
  const missing = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.Ref === 'string' && !pseudo(record.Ref) && !known.has(record.Ref)) missing.add(record.Ref);
    const getAtt = record['Fn::GetAtt'];
    if (Array.isArray(getAtt) && typeof getAtt[0] === 'string' && !known.has(getAtt[0])) missing.add(getAtt[0]);
    Object.values(record).forEach(walk);
  };
  walk(template.Resources);
  walk(template.Outputs);
  Object.entries(resources).forEach(([logicalId, resource]) =>
    [resource.DependsOn ?? []]
      .flat()
      .filter((dependency) => !(dependency in resources))
      .forEach((dependency) => missing.add(`${logicalId} DependsOn ${dependency}`))
  );
  expect([...missing]).toEqual([]);
};

/** Flattened IAM statements of a role, so a permission can be asserted regardless of policy grouping. */
const roleStatements = (template: CloudFormationTemplate, roleLogicalId: string) => {
  const role = template.Resources[roleLogicalId] as Resource;
  expect(role?.Type).toBe('AWS::IAM::Role');
  return (role.Properties?.Policies ?? []).flatMap(
    (policy: { PolicyDocument: { Statement: { Action: string | string[]; Resource: unknown }[] } }) =>
      policy.PolicyDocument.Statement.map((statement) => ({
        actions: [statement.Action].flat(),
        resource: json(statement.Resource)
      }))
  ) as { actions: string[]; resource: string }[];
};

describe('AgentCore family', () => {
  const config = () =>
    defineConfig(() => {
      const tools = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/tool.ts' })
      });
      const agentMemory = new AgentCoreMemory({ expirationDays: 30 });
      const agentGateway = new AgentCoreGateway({
        searchType: 'SEMANTIC',
        tools: [
          {
            name: 'lookupOrder',
            function: 'tools',
            toolSchema: [
              {
                name: 'lookupOrder',
                description: 'Looks up an order',
                inputSchema: {
                  type: 'object',
                  properties: { orderId: { type: 'string' }, priority: { type: 'string', enum: ['low', 'high'] } },
                  required: ['orderId'],
                  additionalProperties: false
                }
              }
            ]
          }
        ]
      });
      const recordings = new Bucket({});
      const agentBrowser = new AgentCoreBrowser({
        recording: { enabled: true, bucketName: "$ResourceParam('recordings', 'name')", prefix: 'sessions/' }
      });
      const agentInterpreter = new AgentCoreCodeInterpreter({});
      const supportAgent = new AgentCoreRuntime({
        packaging: new DockerfilePackaging({ buildContextPath: './agent' }),
        protocol: 'HTTP',
        useMemory: 'agentMemory',
        useGateway: 'agentGateway',
        useBrowser: 'agentBrowser',
        useCodeInterpreter: 'agentInterpreter',
        // A moving endpoint plus a pinned `default` one, listed second so the default is chosen by name, not position.
        endpoints: ['chat', { name: 'default', runtimeVersion: '1' }],
        environment: { MODEL: 'anthropic.claude' },
        lifecycle: { maxLifetime: 7200, idleRuntimeSessionTimeout: 300 }
      });
      return {
        resources: { tools, agentMemory, agentGateway, recordings, agentBrowser, agentInterpreter, supportAgent }
      };
    });

  test('runtime references memory, gateway, browser and code interpreter and may use them', async () => {
    const template = await synthesizeFamily('agentcore', config());
    expectReferencesResolve(template);

    const memory = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Memory');
    const gateway = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Gateway');
    const browser = onlyResourceOfType(template, 'AWS::BedrockAgentCore::BrowserCustom');
    const interpreter = onlyResourceOfType(template, 'AWS::BedrockAgentCore::CodeInterpreterCustom');
    const runtime = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Runtime');
    const target = onlyResourceOfType(template, 'AWS::BedrockAgentCore::GatewayTarget');

    // The `chat` endpoint follows the runtime's current version; `default` stays pinned to version 1 and is the
    // endpoint other resources reference, although it was listed second.
    const chatEndpointId = cfLogicalNames.agentCoreRuntimeEndpoint('supportAgent', 'chat');
    const defaultEndpointId = cfLogicalNames.agentCoreRuntimeEndpoint('supportAgent', 'default');
    expect(
      resourcesOfType(template, 'AWS::BedrockAgentCore::RuntimeEndpoint')
        .map(([id]) => id)
        .sort()
    ).toEqual([chatEndpointId, defaultEndpointId].sort());
    const endpoint = { logicalId: chatEndpointId, resource: template.Resources[chatEndpointId] as Resource };
    expect(endpoint.resource.Properties?.AgentRuntimeVersion).toEqual({
      'Fn::GetAtt': [runtime.logicalId, 'AgentRuntimeVersion']
    });
    expect((template.Resources[defaultEndpointId] as Resource).Properties?.AgentRuntimeVersion).toBe('1');
    expect(
      calculatedStackOverviewManager.stackInfoMap.resources.supportAgent.referencableParams.endpointArn.value
    ).toEqual({
      Ref: defaultEndpointId
    });

    // The gateway exposes the tool with its schema in AgentCore's capitalized shape; enum and additionalProperties
    // have no AgentCore equivalent and are dropped.
    expect(gateway.resource.Properties).toMatchObject({
      AuthorizerType: 'NONE',
      ProtocolType: 'MCP',
      ProtocolConfiguration: { Mcp: { SearchType: 'SEMANTIC' } }
    });
    expect(target.resource.Properties?.TargetConfiguration.Mcp.Lambda.ToolSchema.InlinePayload).toEqual([
      {
        Name: 'lookupOrder',
        Description: 'Looks up an order',
        InputSchema: {
          Type: 'object',
          Properties: { orderId: { Type: 'string' }, priority: { Type: 'string' } },
          Required: ['orderId']
        }
      }
    ]);

    // Browser sessions record into the stack's own bucket, and the browser role may write exactly that prefix.
    const recordingsBucket = resourcesOfType(template, 'AWS::S3::Bucket').find(([id]) => id.startsWith('Recordings'));
    expect(recordingsBucket).toBeDefined();
    const bucketName = { Ref: recordingsBucket![0] };
    expect(browser.resource.Properties?.RecordingConfig).toEqual({
      Enabled: true,
      S3Location: { Bucket: bucketName, Prefix: 'sessions/' }
    });
    const browserStatements = roleStatements(template, browser.resource.Properties?.ExecutionRoleArn['Fn::GetAtt'][0]);
    expect(browserStatements.find(({ actions }) => actions.includes('s3:ListBucket'))?.resource).toBe(
      json([{ 'Fn::Join': ['', ['arn:aws:s3:::', bucketName]] }])
    );
    expect(browserStatements.find(({ actions }) => actions.includes('s3:PutObject'))?.resource).toBe(
      json([{ 'Fn::Join': ['', ['arn:aws:s3:::', bucketName, '/', 'sessions/', '*']] }])
    );

    // The runtime learns the IDs and URL of what it uses through its environment.
    const environment = json(runtime.resource.Properties?.EnvironmentVariables);
    expect(environment).toContain(json({ 'Fn::GetAtt': [memory.logicalId, 'MemoryId'] }));
    expect(environment).toContain(json({ 'Fn::GetAtt': [gateway.logicalId, 'GatewayUrl'] }));
    expect(environment).toContain(json({ 'Fn::GetAtt': [browser.logicalId, 'BrowserId'] }));
    expect(environment).toContain(json({ 'Fn::GetAtt': [interpreter.logicalId, 'CodeInterpreterId'] }));
    expect(environment).toContain('"MODEL"');
    expect(runtime.resource.Properties?.ProtocolConfiguration).toBe('HTTP');
    expect(runtime.resource.Properties?.LifecycleConfiguration).toMatchObject({
      MaxLifetime: 7200,
      IdleRuntimeSessionTimeout: 300
    });

    // The endpoint serves this runtime; the gateway target invokes the tools function.
    expect(json(endpoint.resource.Properties?.AgentRuntimeId)).toContain(runtime.logicalId);
    expect(json(target.resource.Properties?.GatewayIdentifier)).toContain(gateway.logicalId);
    const toolsFunction = resourcesOfType(template, 'AWS::Lambda::Function').find(([logicalId]) =>
      logicalId.startsWith('Tools')
    );
    expect(toolsFunction).toBeDefined();
    expect(json(target.resource.Properties?.TargetConfiguration)).toContain(toolsFunction![0]);

    // The runtime role may use memory, the gateway, the browser and the code interpreter.
    const roleLogicalId = runtime.resource.Properties?.RoleArn['Fn::GetAtt'][0] as string;
    const statements = roleStatements(template, roleLogicalId);
    const allActions = statements.flatMap(({ actions }) => actions);
    expect(allActions.some((action) => /^bedrock-agentcore:.*Memory|bedrock-agentcore:\*/.test(action))).toBe(true);
    expect(allActions.some((action) => /^bedrock-agentcore:.*Gateway|bedrock-agentcore:\*/.test(action))).toBe(true);
    expect(allActions.some((action) => /^bedrock-agentcore:.*Browser|bedrock-agentcore:\*/.test(action))).toBe(true);
    expect(allActions.some((action) => /CodeInterpreter|bedrock-agentcore:\*/.test(action))).toBe(true);
  });

  test('a runtime without a `default` endpoint references its first configured endpoint', async () => {
    const template = await synthesizeFamily(
      'agentcore-no-default-endpoint',
      defineConfig(() => ({
        resources: {
          reviewAgent: new AgentCoreRuntime({
            packaging: new DockerfilePackaging({ buildContextPath: './agent' }),
            endpoints: ['preview', 'stable']
          })
        }
      }))
    );
    expectReferencesResolve(template);
    const previewId = cfLogicalNames.agentCoreRuntimeEndpoint('reviewAgent', 'preview');
    expect(
      resourcesOfType(template, 'AWS::BedrockAgentCore::RuntimeEndpoint')
        .map(([id]) => id)
        .sort()
    ).toEqual([previewId, cfLogicalNames.agentCoreRuntimeEndpoint('reviewAgent', 'stable')].sort());
    expect(
      calculatedStackOverviewManager.stackInfoMap.resources.reviewAgent.referencableParams.endpointArn.value
    ).toEqual({ Ref: previewId });
  });
});

describe('Convex family', () => {
  const config = () =>
    defineConfig(() => {
      const backend = new Convex({ appDirectory: './convex' });
      return { resources: { backend } };
    });

  test('load balancer routes to the backend and site origins, database and buckets are private to them', async () => {
    const template = await synthesizeFamily('convex', config());
    expectReferencesResolve(template);

    const listenerRules = resourcesOfType(template, 'AWS::ElasticLoadBalancingV2::ListenerRule');
    const targetGroups = resourcesOfType(template, 'AWS::ElasticLoadBalancingV2::TargetGroup');
    // Convex cloud API (3210), site/HTTP actions (3211) and the dashboard enabled by default (6791).
    expect(targetGroups.map(([, resource]) => resource.Properties?.Port).sort()).toEqual([3210, 3211, 6791]);
    expect(listenerRules.length).toBeGreaterThanOrEqual(3);
    for (const [, targetGroup] of targetGroups.filter(([, resource]) => resource.Properties?.Port !== 6791)) {
      expect(targetGroup.Properties?.HealthCheckPath).toBe('/');
    }

    // The database defaults to `scoping-workloads-in-vpc`: only security groups of workloads in the VPC may reach it.
    const database = onlyResourceOfType(template, 'AWS::RDS::DBInstance');
    expect(database.resource.Properties?.Engine).toBe('postgres');
    const databaseSecurityGroupIds = (database.resource.Properties?.VPCSecurityGroups as { Ref: string }[]).map(
      ({ Ref }) => Ref
    );
    expect(databaseSecurityGroupIds.length).toBeGreaterThan(0);
    for (const securityGroupId of databaseSecurityGroupIds) {
      const ingress = (template.Resources[securityGroupId] as Resource).Properties?.SecurityGroupIngress as {
        CidrIp?: string;
        SourceSecurityGroupId?: unknown;
      }[];
      expect(ingress.length).toBeGreaterThan(0);
      expect(ingress.every((rule) => rule.SourceSecurityGroupId !== undefined && rule.CidrIp === undefined)).toBe(true);
    }
    // The five Convex buckets; a new stack's deployment bucket is created by the CLI outside the template.
    expect(resourcesOfType(template, 'AWS::S3::Bucket').length).toBeGreaterThanOrEqual(5);
    const browserBuckets = resourcesOfType(template, 'AWS::S3::Bucket').filter(([id]) => id.startsWith('Backend'));
    expect(browserBuckets).toHaveLength(5);
    for (const [, bucket] of browserBuckets) {
      expect(bucket.Properties?.CorsConfiguration).toEqual({
        CorsRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*']
          }
        ]
      });
    }

    // Two ECS services: the backend (cloud API + site origins) and the dashboard.
    const services = resourcesOfType(template, 'AWS::ECS::Service');
    expect(services).toHaveLength(2);
    const backendService = services.find(([logicalId]) => !logicalId.includes('Dashboard'));
    expect(backendService).toBeDefined();
    const backendTargetGroups = targetGroups.filter(([, resource]) => resource.Properties?.Port !== 6791);
    for (const [targetGroupId] of backendTargetGroups) {
      expect(json(backendService![1].Properties?.LoadBalancers)).toContain(targetGroupId);
    }
    const taskDefinitionId = (backendService![1].Properties?.TaskDefinition as { Ref: string }).Ref;
    const taskDefinition = template.Resources[taskDefinitionId] as Resource;
    const containers = taskDefinition.Properties?.ContainerDefinitions as { Name: string; Secrets?: unknown }[];
    expect(containers.map(({ Name }) => Name)).toEqual(['convex-backend']);
    expect(json(containers[0].Secrets)).toContain('POSTGRES_URL');
  });
});

describe('AWS CDK construct family', () => {
  const config = ({ connectToConstruct = false }: { connectToConstruct?: boolean } = {}) =>
    defineConfig(() => {
      const notifications = new AwsCdkConstruct({ entryfilePath: './cdk/notification-topic.ts' });
      const api = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/handler.ts' }),
        ...(connectToConstruct ? { connectTo: ['notifications'] } : {})
      });
      return { resources: { notifications, api } };
    });

  /*
   * Synthesizing a construct loads the construct file and with it aws-cdk-lib. That first load took over 200 s on the
   * Windows CI runner (a pnpm store on another drive, scanned on read), which is far past bun's 5 s default; the
   * second construct test then ran in under a second. The construct tests get the time the first load needs.
   */
  const CDK_FIRST_LOAD_TIMEOUT_MS = 300_000;

  test(
    'a construct cannot be a connectTo target, and the error names both resources',
    async () => {
      await expect(synthesizeFamily('invalid-cdk-connect', config({ connectToConstruct: true }))).rejects.toMatchObject(
        {
          code: 'CONFIG_CONNECT_TO_RESOURCE_TYPE_UNSUPPORTED',
          message: expect.stringContaining('`notifications` of type `aws-cdk-construct`')
        }
      );
    },
    CDK_FIRST_LOAD_TIMEOUT_MS
  );

  test(
    'construct resources land in the template with their subscriptions and outputs',
    async () => {
      const template = await synthesizeFamily('aws-cdk-construct', config());
      expectReferencesResolve(template);

      const topic = onlyResourceOfType(template, 'AWS::SNS::Topic');
      const queue = onlyResourceOfType(template, 'AWS::SQS::Queue');
      const subscription = onlyResourceOfType(template, 'AWS::SNS::Subscription');
      expect(topic.logicalId.startsWith('Notifications')).toBe(true);
      expect(queue.logicalId.startsWith('Notifications')).toBe(true);
      expect(json(subscription.resource.Properties?.TopicArn)).toContain(topic.logicalId);
      expect(json(subscription.resource.Properties?.Endpoint)).toContain(queue.logicalId);
      expect(queue.resource.Properties?.MessageRetentionPeriod).toBe(345600);
      const outputs = Object.values(template.Outputs ?? {}) as { Value: unknown }[];
      expect(outputs.some(({ Value }) => json(Value).includes(topic.logicalId))).toBe(true);
    },
    CDK_FIRST_LOAD_TIMEOUT_MS
  );
});

describe('custom resource family', () => {
  const config = () =>
    defineConfig(() => {
      const webhookProvider = new CustomResourceDefinition({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/webhook-provider.ts' }),
        timeout: 30,
        environment: { EXTERNAL_API_KEY: 'not-a-real-key' }
      });
      const apiWebhook = new CustomResourceInstance({
        definitionName: 'webhookProvider',
        resourceProperties: { callbackUrl: 'https://myapp.example.com/webhook', retries: 3 }
      });
      return { resources: { webhookProvider, apiWebhook } };
    });

  test('the instance invokes the definition function with its properties', async () => {
    const template = await synthesizeFamily('custom-resources', config());
    expectReferencesResolve(template);

    const providerFunction = resourcesOfType(template, 'AWS::Lambda::Function').find(([logicalId]) =>
      logicalId.startsWith('WebhookProvider')
    );
    expect(providerFunction).toBeDefined();
    expect(providerFunction![1].Properties?.Timeout).toBe(30);
    expect(json(providerFunction![1].Properties?.Environment)).toContain('EXTERNAL_API_KEY');

    const instance = resourcesOfType(template, 'AWS::CloudFormation::CustomResource').find(([logicalId]) =>
      logicalId.startsWith('ApiWebhook')
    );
    expect(instance).toBeDefined();
    expect(instance![1].Properties?.ServiceToken).toEqual({ 'Fn::GetAtt': [providerFunction![0], 'Arn'] });
    expect(instance![1].Properties?.callbackUrl).toBe('https://myapp.example.com/webhook');
    expect(instance![1].Properties?.retries).toBe(3);
  });
});

describe('raw CloudFormation resources and overrides', () => {
  const config = () =>
    defineConfig(() => {
      const emailSender = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/handler.ts' }),
        environment: { SENDER_DOMAIN: 'notifications.example.com' },
        iamRoleStatements: [{ Effect: 'Allow', Action: ['ses:SendEmail', 'ses:SendRawEmail'], Resource: ['*'] }],
        overrides: {
          EmailSenderFunction: { ReservedConcurrentExecutions: 100, Description: 'overridden' }
        }
      });
      return {
        resources: { emailSender },
        cloudformationResources: {
          sesEmailIdentity: {
            Type: 'AWS::SES::EmailIdentity',
            Properties: { EmailIdentity: 'notifications.example.com' }
          }
        }
      };
    });

  test('raw resources are added verbatim and overrides reach the child resource', async () => {
    const template = await synthesizeFamily('raw-cloudformation-and-overrides', config());
    expectReferencesResolve(template);

    expect(template.Resources.sesEmailIdentity).toEqual({
      Type: 'AWS::SES::EmailIdentity',
      Properties: { EmailIdentity: 'notifications.example.com' }
    });
    const fn = template.Resources.EmailSenderFunction as Resource;
    expect(fn.Type).toBe('AWS::Lambda::Function');
    expect(fn.Properties?.ReservedConcurrentExecutions).toBe(100);
    expect(fn.Properties?.Description).toBe('overridden');
    expect(json(fn.Properties?.Environment)).toContain('SENDER_DOMAIN');
    const roleLogicalId = fn.Properties?.Role['Fn::GetAtt'][0] as string;
    const statements = roleStatements(template, roleLogicalId);
    expect(
      statements.some(({ actions }) => actions.includes('ses:SendEmail') && actions.includes('ses:SendRawEmail'))
    ).toBe(true);
  });

  test('an override naming a resource that is not a child of the Stacktape resource is rejected', async () => {
    const invalid = defineConfig(() => {
      const api = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/handler.ts' }),
        overrides: { SomeoneElsesResource: { Description: 'x' } }
      });
      return { resources: { api } };
    });
    await expect(synthesizeFamily('invalid-override', invalid)).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_OVERRIDE_TARGET_INVALID'
    });
  });
});

describe('log forwarding family', () => {
  const config = () =>
    defineConfig(() => {
      const api = new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/handler.ts' }),
        logging: { logForwarding: { type: 'datadog', properties: { apiKey: 'not-a-real-datadog-key' } } }
      });
      const web = new WebService({
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/web.ts' }),
        resources: { cpu: 0.25, memory: 512 },
        logging: {
          logForwarding: {
            type: 'http-endpoint',
            properties: { endpointUrl: 'https://logs.example.com/ingest', accessKey: 'not-a-real-access-key' }
          }
        }
      });
      const worker = new WorkerService({
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
        resources: { cpu: 0.25, memory: 512 },
        logging: { logForwarding: { type: 'highlight', properties: { projectId: 'highlight-project' } } }
      });
      return { resources: { api, web, worker } };
    });

  test('each workload log group streams to its own delivery stream with the configured destination', async () => {
    const template = await synthesizeFamily('log-forwarding', config());
    expectReferencesResolve(template);

    const deliveryStreams = resourcesOfType(template, 'AWS::KinesisFirehose::DeliveryStream');
    const subscriptions = resourcesOfType(template, 'AWS::Logs::SubscriptionFilter').filter(([, resource]) =>
      json(resource.Properties?.DestinationArn).includes('DeliveryStream')
    );
    // The web service forwards both its container log group and its API Gateway access log group.
    expect(deliveryStreams).toHaveLength(4);
    expect(subscriptions).toHaveLength(4);

    for (const [logicalId] of deliveryStreams) {
      expect(subscriptions.some(([, resource]) => json(resource.Properties?.DestinationArn).includes(logicalId))).toBe(
        true
      );
    }
    const destinations = deliveryStreams.map(([, resource]) =>
      json(resource.Properties?.HttpEndpointDestinationConfiguration)
    );
    expect(destinations.some((destination) => destination.includes('datadoghq'))).toBe(true);
    expect(destinations.some((destination) => destination.includes('https://logs.example.com/ingest'))).toBe(true);
    expect(destinations.some((destination) => destination.includes('highlight'))).toBe(true);
    // Each subscription filter points at a log group owned by the workload it forwards.
    const logGroups = subscriptions.map(([, resource]) => json(resource.Properties?.LogGroupName));
    expect(logGroups.some((name) => name.includes('ApiLogGroup'))).toBe(true);
    expect(logGroups.some((name) => name.includes('WebServiceContainerLogGroup'))).toBe(true);
    expect(logGroups.some((name) => name.includes('WebLogGroup'))).toBe(true);
    expect(logGroups.some((name) => name.includes('WorkerServiceContainerLogGroup'))).toBe(true);
  });
});

describe('container rolling deployment family', () => {
  const packaging = new JsBundleImagePackaging({ entryfilePath: './src/web.ts' });
  const resources = { cpu: 0.25, memory: 512 } as const;
  const healthCheck = { healthCheckCommand: ['CMD-SHELL', 'exit 0'] };
  const config = ({ overrides }: { overrides?: Record<string, Record<string, unknown>> } = {}) =>
    defineConfig(() => ({
      resources: {
        albWeb: new WebService({
          packaging,
          resources,
          loadBalancing: { type: 'application-load-balancer' },
          ...(overrides ? { overrides } : {})
        }),
        apiWeb: new WebService({ packaging, resources }),
        checkedApiWeb: new WebService({ packaging, resources, internalHealthCheck: healthCheck }),
        internal: new PrivateService({ packaging, resources }),
        worker: new WorkerService({ packaging, resources, stopTimeout: 10 })
      }
    }));

  const earlySuccess = { Enable: true, HealthyPercent: 100, SourceServiceRevisionCleanup: 'DEFERRED' };
  const deploymentConfiguration = (template: CloudFormationTemplate, workloadName: string, blueGreen = false) => {
    const service = template.Resources[cfLogicalNames.ecsService(workloadName, blueGreen)] as Resource;
    return (blueGreen ? service.Properties?.ECSService : service.Properties)?.DeploymentConfiguration;
  };
  const deregistrationDelays = (template: CloudFormationTemplate, workloadName: string, blueGreen = false) => {
    const service = template.Resources[cfLogicalNames.ecsService(workloadName, blueGreen)] as Resource;
    const loadBalancers = (blueGreen ? service.Properties?.ECSService : service.Properties)?.LoadBalancers as {
      TargetGroupArn: { Ref: string };
    }[];
    return loadBalancers.map(
      ({ TargetGroupArn }) =>
        (template.Resources[TargetGroupArn.Ref] as Resource).Properties?.TargetGroupAttributes.find(
          ({ Key }: { Key: string }) => Key === 'deregistration_delay.timeout_seconds'
        ).Value
    );
  };
  const stopTimeouts = (template: CloudFormationTemplate, workloadName: string) =>
    (
      (template.Resources[cfLogicalNames.ecsTaskDefinition(workloadName)] as Resource).Properties
        ?.ContainerDefinitions as { StopTimeout: number }[]
    ).map(({ StopTimeout }) => StopTimeout);

  test("ECS starts the init process in Stacktape's js-bundle images and leaves other images alone", async () => {
    const template = await synthesizeFamily(
      'container-init-process',
      defineConfig(() => ({
        resources: {
          web: new WebService({ packaging, resources }),
          prebuilt: new WorkerService({
            packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/worker:v1' } },
            resources
          })
        }
      }))
    );
    const linuxParameters = (workloadName: string) =>
      (
        (template.Resources[cfLogicalNames.ecsTaskDefinition(workloadName)] as Resource).Properties
          ?.ContainerDefinitions as { LinuxParameters?: unknown }[]
      ).map(({ LinuxParameters }) => LinuxParameters);

    // The js-bundle image has no tini: the init process ECS starts passes the stop signal to the server.
    expect(linuxParameters('web')).toEqual([{ InitProcessEnabled: true }, undefined]);
    // A prebuilt image may bring its own init.
    expect(linuxParameters('prebuilt')).toEqual([undefined]);
  });

  test('a deploy succeeds once new tasks pass a health check and old tasks drain afterwards', async () => {
    const template = await synthesizeFamily('container-rolling-deployment', config());
    expectReferencesResolve(template);

    // Load balancer health checks tell ECS when a task serves traffic.
    expect(deploymentConfiguration(template, 'albWeb')).toEqual({
      DeploymentCircuitBreaker: { Enable: true, Rollback: true },
      EarlySuccessCriteria: earlySuccess,
      MaximumPercent: 200,
      MinimumHealthyPercent: 100
    });
    expect(deregistrationDelays(template, 'albWeb')).toEqual(['30']);
    expect(stopTimeouts(template, 'albWeb')).toEqual([30]);

    // Cloud Map and Service Connect count a task healthy once it runs; only a container health check says more.
    expect(deploymentConfiguration(template, 'apiWeb').EarlySuccessCriteria).toBeUndefined();
    expect(deploymentConfiguration(template, 'internal').EarlySuccessCriteria).toBeUndefined();
    expect(deploymentConfiguration(template, 'checkedApiWeb').EarlySuccessCriteria).toEqual(earlySuccess);

    // ECS reverses START dependencies at shutdown. Retiring HTTP API servers stay alive while the managed
    // sidecar waits for API Gateway's cached Cloud Map routes; readiness and application stop timeouts stay separate.
    for (const workload of ['apiWeb', 'checkedApiWeb']) {
      const containers = (template.Resources[cfLogicalNames.ecsTaskDefinition(workload)] as Resource).Properties
        ?.ContainerDefinitions as {
        Name: string;
        DependsOn?: unknown;
        HealthCheck?: unknown;
        StopTimeout?: number;
        Essential?: boolean;
        Image?: string;
        Command?: string[];
      }[];
      const drain = containers.find(({ Name }) => Name === 'stp-cloudmap-drain');
      expect(drain).toBeDefined();
      expect(drain?.DependsOn).toEqual([{ ContainerName: 'service-container', Condition: 'START' }]);
      expect(drain?.HealthCheck).toBeUndefined();
      expect(drain?.StopTimeout).toBe(40);
      expect(drain?.Essential).toBe(false);
      expect(drain?.Image).toMatch(/\.dkr\.ecr\.eu-west-1\.amazonaws\.com\/.+@sha256:[a-f0-9]{64}$/);
      expect(drain?.Command?.[0]).toContain('sleep 35');
      expect(containers.find(({ Name }) => Name === 'service-container')?.StopTimeout).toBe(30);
    }
    expect(stopTimeouts(template, 'internal')).toEqual([30]);

    // A worker receives no traffic, and its configured stop timeout wins over the default.
    expect(deploymentConfiguration(template, 'worker').EarlySuccessCriteria).toEqual(earlySuccess);
    expect(stopTimeouts(template, 'worker')).toEqual([10]);
  });

  test.each([false, true])(
    'HTTP API discovery and hints follow the effective supervisor check=%s',
    async (supervisor) => {
      const template = await synthesizeFamily('container-sidecar-health-hotswap', config());
      const taskDefinition = structuredClone(
        template.Resources[cfLogicalNames.ecsTaskDefinition('apiWeb')]
      ) as Resource;
      taskDefinition.Properties!.ContainerDefinitions.push({
        Name: 'telemetry',
        Essential: false,
        HealthCheck: { Command: ['CMD', 'true'] }
      });
      if (supervisor)
        taskDefinition.Properties!.ContainerDefinitions[0].HealthCheck = {
          Command: ['CMD', '/stacktape-supervisor', 'readiness']
        };
      const original = configManager.allContainerWorkloads.find(({ name }) => name === 'apiWeb')!;
      const workload = {
        ...original,
        containers: [
          ...original.containers,
          {
            ...original.containers[0],
            name: 'telemetry',
            essential: false,
            events: [],
            internalHealthCheck: { healthCheckCommand: ['CMD', 'true'] }
          }
        ]
      };
      const logger = operationReporter.createChildLogger({
        parentEventType: 'HOTSWAP_UPDATE',
        instanceId: workload.name
      });
      const loggerSpy = spyOn(operationReporter, 'createChildLogger').mockReturnValue(logger);
      const finishSpy = spyOn(logger, 'finishEvent');
      const startSpy = spyOn(awsSdkManager.ecs, 'startRollingUpdate').mockResolvedValue({ deploymentId: 'ecs-svc/2' });
      const waitSpy = spyOn(awsSdkManager.ecs, 'waitForRollingUpdate').mockResolvedValue({
        finishedWhen: 'new-instances-discoverable'
      });
      try {
        await updateEcsService({
          workload,
          newCfTaskDefinition: taskDefinition,
          ecsServiceArn: 'arn:aws:ecs:eu-west-1:123456789999:service/cluster/apiWeb',
          blueGreen: false,
          ecsTaskDefinition: { needsUpdate: false, currentState: { taskDefinitionArn: 'arn:task:1' } },
          ecsService: { needsUpdate: true, currentState: {} }
        } as unknown as Parameters<typeof updateEcsService>[0]);
        expect(waitSpy).toHaveBeenCalledWith({
          ecsServiceArn: 'arn:aws:ecs:eu-west-1:123456789999:service/cluster/apiWeb',
          deploymentId: 'ecs-svc/2',
          allowUncheckedDiscovery: !supervisor
        });
        expect(finishSpy).toHaveBeenCalledWith({
          eventType: 'UPDATE_ECS_SERVICE',
          finalMessage: supervisor
            ? "New version healthy and registered with API Gateway's service discovery; traffic moves to it within seconds. Old containers drain in the background"
            : "New task running and registered with API Gateway's service discovery; application health is unchecked. Old containers drain in the background"
        });
      } finally {
        waitSpy.mockRestore();
        startSpy.mockRestore();
        finishSpy.mockRestore();
        loggerSpy.mockRestore();
      }
    }
  );

  test('a hotswap sends the overridden deployment configuration that CloudFormation receives', async () => {
    const serviceLogicalId = cfLogicalNames.ecsService('albWeb', false);
    const template = await synthesizeFamily(
      'container-rolling-deployment-hotswap-overrides',
      config({
        overrides: {
          [serviceLogicalId]: {
            DeploymentConfiguration: {
              EarlySuccessCriteria: { Enable: false },
              MaximumPercent: 150,
              MinimumHealthyPercent: 50
            }
          }
        }
      })
    );
    const templateConfiguration = (template.Resources[serviceLogicalId] as Resource).Properties
      ?.DeploymentConfiguration;
    expect(templateConfiguration).toEqual({
      DeploymentCircuitBreaker: { Enable: true, Rollback: true },
      EarlySuccessCriteria: { ...earlySuccess, Enable: false },
      MaximumPercent: 150,
      MinimumHealthyPercent: 50
    });

    const { startRollingUpdate, waitForRollingUpdate } = awsSdkManager.ecs;
    let sent: UpdateServiceCommandInput | undefined;
    let awaited: string | undefined;
    awsSdkManager.ecs.startRollingUpdate = async (input) => {
      sent = input;
      return { deploymentId: 'ecs-svc/2' };
    };
    // The waiter follows the deployment the update started, without waiting for it to become primary.
    awsSdkManager.ecs.waitForRollingUpdate = async ({ deploymentId }) => {
      awaited = deploymentId;
      return { finishedWhen: 'new-targets-healthy' };
    };
    try {
      await updateEcsService({
        workload: configManager.allContainerWorkloads.find(({ name }) => name === 'albWeb')!,
        newCfTaskDefinition: template.Resources[cfLogicalNames.ecsTaskDefinition('albWeb')],
        ecsServiceArn: 'arn:aws:ecs:eu-west-1:123456789999:service/cluster/albWeb',
        blueGreen: false,
        ecsTaskDefinition: { needsUpdate: false, currentState: { taskDefinitionArn: 'arn:task:1' } },
        ecsService: { needsUpdate: true, currentState: {} }
      } as unknown as Parameters<typeof updateEcsService>[0]);
    } finally {
      awsSdkManager.ecs.startRollingUpdate = startRollingUpdate;
      awsSdkManager.ecs.waitForRollingUpdate = waitForRollingUpdate;
    }
    expect(awaited).toBe('ecs-svc/2');

    // What the SDK puts on the wire, so a key in the wrong casing cannot pass unnoticed.
    let wireBody: { deploymentConfiguration?: unknown } = {};
    const client = new ECSClient({
      region: 'eu-west-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      requestHandler: {
        handle: async (request: { body: string | Uint8Array }) => {
          const body = typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body);
          wireBody = JSON.parse(body);
          return { response: { statusCode: 200, headers: {}, body: new TextEncoder().encode('{}') } };
        }
      } as never
    });
    await client.send(new UpdateServiceCommand(sent!));
    expect(wireBody.deploymentConfiguration).toEqual({
      deploymentCircuitBreaker: { enable: true, rollback: true },
      earlySuccessCriteria: { enable: false, healthyPercent: 100, sourceServiceRevisionCleanup: 'DEFERRED' },
      maximumPercent: 150,
      minimumHealthyPercent: 50
    });
  });

  test('a blue/green service keeps the CodeDeploy rollout, the short drain and the short stop timeout', async () => {
    // Not written for cfn-lint: it does not know the Stacktape blue/green resource type.
    const template = await synthesizeFixture({
      compiledConfig: defineConfig(() => ({
        resources: {
          gradualWeb: new WebService({
            packaging,
            resources,
            loadBalancing: { type: 'application-load-balancer' },
            deployment: { strategy: 'AllAtOnce' }
          })
        }
      }))(authoringParams),
      workingDir: fixturesDir
    });
    expect(deploymentConfiguration(template, 'gradualWeb', true)).toEqual({
      MaximumPercent: 200,
      MinimumHealthyPercent: 100
    });
    expect(new Set(deregistrationDelays(template, 'gradualWeb', true))).toEqual(new Set(['5']));
    expect(stopTimeouts(template, 'gradualWeb')).toEqual([2]);
  });

  test('overrides replace the deployment and drain defaults', async () => {
    const service = (await synthesizeFamily('container-rolling-deployment', config())).Resources[
      cfLogicalNames.ecsService('albWeb', false)
    ] as Resource;
    const targetGroupLogicalId = (service.Properties?.LoadBalancers as { TargetGroupArn: { Ref: string } }[])[0]
      .TargetGroupArn.Ref;
    const template = await synthesizeFamily(
      'container-rolling-deployment-overrides',
      config({
        overrides: {
          [cfLogicalNames.ecsService('albWeb', false)]: {
            'DeploymentConfiguration.EarlySuccessCriteria.SourceServiceRevisionCleanup': 'BLOCKING'
          },
          [targetGroupLogicalId]: {
            TargetGroupAttributes: [{ Key: 'deregistration_delay.timeout_seconds', Value: '120' }]
          }
        }
      })
    );
    expect(deploymentConfiguration(template, 'albWeb').EarlySuccessCriteria).toEqual({
      ...earlySuccess,
      SourceServiceRevisionCleanup: 'BLOCKING'
    });
    expect(deregistrationDelays(template, 'albWeb')).toEqual(['120']);
  });

  test('scaling policies exist only when the instance count can change', async () => {
    const cpuPolicy = (name: string) => cfLogicalNames.autoScalingPolicy(name, 'ECSServiceAverageCPUUtilization');
    const memoryPolicy = (name: string) => cfLogicalNames.autoScalingPolicy(name, 'ECSServiceAverageMemoryUtilization');
    const template = await synthesizeFamily(
      'container-scaling',
      defineConfig(() => ({
        resources: {
          fixed: new WebService({ packaging, resources, scaling: { minInstances: 2, maxInstances: 2 } }),
          single: new WorkerService({ packaging, resources }),
          scaled: new WebService({
            packaging,
            resources,
            scaling: { minInstances: 1, maxInstances: 4, scalingPolicy: { keepAvgCpuUtilizationUnder: 60 } }
          }),
          // An override can widen the range after synthesis, or tune a policy, so both keep the policies.
          widened: new WorkerService({
            packaging,
            resources,
            overrides: { [cfLogicalNames.autoScalingTarget('widened')]: { MaxCapacity: 4 } }
          }),
          tuned: new WorkerService({
            packaging,
            resources,
            overrides: { [cpuPolicy('tuned')]: { 'TargetTrackingScalingPolicyConfiguration.ScaleOutCooldown': 120 } }
          })
        }
      }))
    );
    expectReferencesResolve(template);
    const scalableTargets = Object.fromEntries(
      resourcesOfType(template, 'AWS::ApplicationAutoScaling::ScalableTarget').map(([logicalId, resource]) => [
        logicalId,
        [resource.Properties?.MinCapacity, resource.Properties?.MaxCapacity]
      ])
    );
    // Every service keeps its scalable target: it holds the task count at the configured value.
    expect(scalableTargets).toEqual({
      [cfLogicalNames.autoScalingTarget('fixed')]: [2, 2],
      [cfLogicalNames.autoScalingTarget('single')]: [1, 1],
      [cfLogicalNames.autoScalingTarget('scaled')]: [1, 4],
      [cfLogicalNames.autoScalingTarget('widened')]: [1, 4],
      [cfLogicalNames.autoScalingTarget('tuned')]: [1, 1]
    });
    const policies = Object.fromEntries(
      resourcesOfType(template, 'AWS::ApplicationAutoScaling::ScalingPolicy').map(([logicalId, resource]) => [
        logicalId,
        [
          resource.Properties?.ScalingTargetId,
          resource.Properties?.TargetTrackingScalingPolicyConfiguration.TargetValue
        ]
      ])
    );
    const target = (name: string) => ({ Ref: cfLogicalNames.autoScalingTarget(name) });
    expect(policies).toEqual({
      [cpuPolicy('scaled')]: [target('scaled'), 60],
      [memoryPolicy('scaled')]: [target('scaled'), 80],
      [cpuPolicy('widened')]: [target('widened'), 80],
      [memoryPolicy('widened')]: [target('widened'), 80],
      [cpuPolicy('tuned')]: [target('tuned'), 80],
      [memoryPolicy('tuned')]: [target('tuned'), 80]
    });
    expect(
      (template.Resources[cpuPolicy('tuned')] as Resource).Properties?.TargetTrackingScalingPolicyConfiguration
        .ScaleOutCooldown
    ).toBe(120);
  });
});

describe('EC2-backed container family', () => {
  const packaging = new JsBundleImagePackaging({ entryfilePath: './src/web.ts' });
  const config = ({
    privateSubnets,
    nat,
    reuseVpc
  }: { privateSubnets?: boolean; nat?: 'gateway' | 'ec2'; reuseVpc?: boolean } = {}) =>
    defineConfig(() => ({
      resources: {
        web: new WebService({
          packaging,
          resources: { instanceTypes: ['t3.micro'] },
          ...(privateSubnets ? { usePrivateSubnetsWithNAT: true } : {})
        })
      },
      ...(nat || reuseVpc
        ? {
            stackConfig: {
              ...(nat ? { nat } : {}),
              ...(reuseVpc ? { vpc: { reuseVpc: { vpcId: 'vpc-0123456789abcdef0' } } } : {})
            }
          }
        : {})
    }));

  // Synthesis reads instance memory and architecture from EC2; the fixture forbids network access.
  const synthesizeWithInstanceTypes = async (family: string, definedConfig: ReturnType<typeof defineConfig>) => {
    const init = spyOn(ec2Manager, 'init').mockImplementation(async () => {
      ec2Manager.ec2InstanceTypes = [
        {
          InstanceType: 't3.micro',
          MemoryInfo: { SizeInMiB: 1024 },
          ProcessorInfo: { SupportedArchitectures: ['x86_64'] }
        }
      ];
    });
    try {
      return await synthesizeFamily(family, definedConfig);
    } finally {
      init.mockRestore();
    }
  };

  /** Everything CloudFormation creates before, and so deletes after, the given resource. */
  const deletedAfter = (template: CloudFormationTemplate, logicalId: string) => {
    const resources = template.Resources as Record<string, Resource>;
    const seen = new Set<string>();
    const visit = (id: string) => {
      const resource = resources[id];
      if (!resource || seen.has(id)) return;
      seen.add(id);
      const references = [...json(resource.Properties ?? {}).matchAll(/"(?:Ref|Fn::GetAtt)":\[?"([^".]+)/g)].map(
        ([, target]) => target
      );
      [...[resource.DependsOn ?? []].flat(), ...references].forEach(visit);
    };
    visit(logicalId);
    seen.delete(logicalId);
    return seen;
  };

  const networkPath = (template: CloudFormationTemplate) =>
    [
      'AWS::EC2::Route',
      'AWS::EC2::SubnetRouteTableAssociation',
      'AWS::EC2::VPCGatewayAttachment',
      'AWS::EC2::NatGateway',
      'AWS::EC2::NetworkInterface'
    ].flatMap((type) => resourcesOfType(template, type).map(([logicalId]) => logicalId));

  // The instance's ECS agent must reach ECS until the service's tasks have stopped. Without that, the service stays
  // DRAINING and the stack delete fails after CloudFormation's 30 minute timeout.
  test.each([
    ['public subnets', 'ec2-container-public', {}],
    ['private subnets behind NAT gateways', 'ec2-container-nat-gateway', { privateSubnets: true, nat: 'gateway' }],
    ['private subnets behind a NAT instance', 'ec2-container-nat-instance', { privateSubnets: true, nat: 'ec2' }]
  ] as const)(
    'in %s, the service is deleted before the internet path its instances use',
    async (_, family, options) => {
      const template = await synthesizeWithInstanceTypes(family, config(options));
      expectReferencesResolve(template);
      const path = networkPath(template);
      expect(path.length).toBeGreaterThan(6);
      const afterService = deletedAfter(template, cfLogicalNames.ecsService('web', false));
      expect(path.filter((logicalId) => !afterService.has(logicalId))).toEqual([]);
    }
  );

  // While managed termination protection is enabled, ECS protects instances that still run tasks again. The instances
  // must be unprotected after the service is gone and protection is disabled, and before the group is scaled in.
  test('the instances are unprotected after the service and before the capacity provider are deleted', async () => {
    const template = await synthesizeWithInstanceTypes('ec2-container-delete-order', config());
    const service = cfLogicalNames.ecsService('web', false);
    const disableProtection = cfLogicalNames.ecsDisableManagedTerminationProtectionCustomResource('web');
    const unprotect = cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource('web');
    const order = [service, disableProtection, unprotect, cfLogicalNames.ecsEc2CapacityProvider('web')];
    order.slice(0, -1).forEach((logicalId, index) => {
      const afterIt = deletedAfter(template, logicalId);
      expect(afterIt.has(order[index + 1])).toBe(true);
      expect(order.slice(0, index + 1).filter((earlier) => afterIt.has(earlier))).toEqual([]);
    });
    expect(deletedAfter(template, unprotect).has(cfLogicalNames.ecsEc2AutoscalingGroup('web'))).toBe(true);
  });

  // A reused VPC's routes and associations belong to another stack; naming them in DependsOn fails the deploy.
  test.each([
    ['public subnets', 'ec2-container-reused-vpc-public', {}, 'subnet-public-a'],
    ['private subnets', 'ec2-container-reused-vpc-private', { privateSubnets: true }, 'subnet-private-a']
  ] as const)(
    'in a reused VPC with %s, the service depends on no network resource',
    async (_, family, options, reusedSubnet) => {
      // Synthesis would otherwise read the reused VPC's subnets from EC2; the fixture forbids network access.
      const lookups = [
        spyOn(vpcManager, 'getVpcId').mockReturnValue('vpc-0123456789abcdef0'),
        spyOn(vpcManager, 'getVpcCidr').mockReturnValue('10.0.0.0/16'),
        spyOn(vpcManager, 'getPublicSubnetIds').mockReturnValue([
          'subnet-public-a',
          'subnet-public-b',
          'subnet-public-c'
        ]),
        spyOn(vpcManager, 'getPrivateSubnetIds').mockReturnValue(['subnet-private-a', 'subnet-private-b'])
      ];
      try {
        const template = await synthesizeWithInstanceTypes(family, config({ ...options, reuseVpc: true }));
        expectReferencesResolve(template);
        expect(networkPath(template)).toEqual([]);
        expect(json(template.Resources)).toContain(reusedSubnet);
      } finally {
        lookups.forEach((lookup) => lookup.mockRestore());
      }
    }
  );
});
