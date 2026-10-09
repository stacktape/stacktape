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
import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime,
  AwsCdkConstruct,
  Convex,
  CustomResourceDefinition,
  CustomResourceInstance,
  DockerfilePackaging,
  JsBundleImagePackaging,
  JsBundleLambdaPackaging,
  LambdaFunction,
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

/** Every `Ref` and `Fn::GetAtt` target in the template must exist as a resource or a parameter; cfn-lint also checks it, this keeps the failure readable. */
const expectReferencesResolve = (template: CloudFormationTemplate) => {
  const known = new Set([...Object.keys(template.Resources), ...Object.keys(template.Parameters ?? {})]);
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
        tools: [
          {
            name: 'lookupOrder',
            function: 'tools',
            toolSchema: [
              {
                name: 'lookupOrder',
                description: 'Looks up an order',
                inputSchema: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] }
              }
            ]
          }
        ]
      });
      const agentBrowser = new AgentCoreBrowser({});
      const agentInterpreter = new AgentCoreCodeInterpreter({});
      const supportAgent = new AgentCoreRuntime({
        packaging: new DockerfilePackaging({ buildContextPath: './agent' }),
        protocol: 'HTTP',
        useMemory: 'agentMemory',
        useGateway: 'agentGateway',
        useBrowser: 'agentBrowser',
        useCodeInterpreter: 'agentInterpreter',
        endpoints: ['chat'],
        environment: { MODEL: 'anthropic.claude' },
        lifecycle: { maxLifetime: 7200, idleRuntimeSessionTimeout: 300 }
      });
      return { resources: { tools, agentMemory, agentGateway, agentBrowser, agentInterpreter, supportAgent } };
    });

  test('runtime references memory, gateway, browser and code interpreter and may use them', async () => {
    const template = await synthesizeFamily('agentcore', config());
    expectReferencesResolve(template);

    const memory = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Memory');
    const gateway = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Gateway');
    const browser = onlyResourceOfType(template, 'AWS::BedrockAgentCore::BrowserCustom');
    const interpreter = onlyResourceOfType(template, 'AWS::BedrockAgentCore::CodeInterpreterCustom');
    const runtime = onlyResourceOfType(template, 'AWS::BedrockAgentCore::Runtime');
    const endpoint = onlyResourceOfType(template, 'AWS::BedrockAgentCore::RuntimeEndpoint');
    const target = onlyResourceOfType(template, 'AWS::BedrockAgentCore::GatewayTarget');

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
    expect(resourcesOfType(template, 'AWS::S3::Bucket').length).toBeGreaterThanOrEqual(6);

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
