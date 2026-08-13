import type { AuthoringResourceProps } from './config.js';
import { BaseResource } from './config.js';
import { REFERENCEABLE_PARAMS } from './resource-metadata.js';
import type { StacktapeResourceType } from '@stacktape/config/resource-types';

const getParamReferenceSymbol = Symbol.for('stacktape:getParamReference');

type ReferenceableParamName<Type extends StacktapeResourceType> = Type extends keyof typeof REFERENCEABLE_PARAMS
  ? (typeof REFERENCEABLE_PARAMS)[Type][number]['name']
  : never;

export type StacktapeResource<Type extends StacktapeResourceType> = BaseResource<Type, AuthoringResourceProps<Type>> &
  Readonly<Record<ReferenceableParamName<Type>, string>>;

export type ResourceConstructor<Type extends StacktapeResourceType> = new (
  properties: AuthoringResourceProps<Type>
) => StacktapeResource<Type>;

function createResourceClass<Type extends StacktapeResourceType>(
  className: string,
  resourceType: Type
): ResourceConstructor<Type> {
  const ResourceClass = class extends BaseResource<Type, AuthoringResourceProps<Type>> {
    constructor(properties: AuthoringResourceProps<Type>) {
      super(resourceType, properties);
    }
  };

  Object.defineProperty(ResourceClass, 'name', { value: className });

  const referenceableParams =
    resourceType in REFERENCEABLE_PARAMS
      ? REFERENCEABLE_PARAMS[resourceType as keyof typeof REFERENCEABLE_PARAMS]
      : undefined;
  for (const param of referenceableParams ?? []) {
    Object.defineProperty(ResourceClass.prototype, param.name, {
      get(this: BaseResource) {
        return (this as any)[getParamReferenceSymbol](param.name);
      },
      enumerable: false,
      configurable: true
    });
  }

  return ResourceClass as ResourceConstructor<Type>;
}

export const RelationalDatabase = createResourceClass('RelationalDatabase', 'relational-database');
export const DsqlDatabase = createResourceClass('DsqlDatabase', 'dsql-database');
export const KafkaCluster = createResourceClass('KafkaCluster', 'kafka-cluster');
export const EmailSender = createResourceClass('EmailSender', 'email-sender');
export const WebService = createResourceClass('WebService', 'web-service');
export const PrivateService = createResourceClass('PrivateService', 'private-service');
export const WorkerService = createResourceClass('WorkerService', 'worker-service');
export const MultiContainerWorkload = createResourceClass('MultiContainerWorkload', 'multi-container-workload');
export const LambdaFunction = createResourceClass('LambdaFunction', 'function');
export const BatchJob = createResourceClass('BatchJob', 'batch-job');
export const Convex = createResourceClass('Convex', 'convex');
export const Bucket = createResourceClass('Bucket', 'bucket');
export const HostingBucket = createResourceClass('HostingBucket', 'hosting-bucket');
export const DynamoDbTable = createResourceClass('DynamoDbTable', 'dynamo-db-table');
export const EventBus = createResourceClass('EventBus', 'event-bus');
export const HttpApiGateway = createResourceClass('HttpApiGateway', 'http-api-gateway');
export const WebSocketApiGateway = createResourceClass('WebSocketApiGateway', 'websocket-api-gateway');
export const ApplicationLoadBalancer = createResourceClass('ApplicationLoadBalancer', 'application-load-balancer');
export const AppSyncApi = createResourceClass('AppSyncApi', 'appsync-api');
export const NetworkLoadBalancer = createResourceClass('NetworkLoadBalancer', 'network-load-balancer');
export const RedisCluster = createResourceClass('RedisCluster', 'redis-cluster');
export const MongoDbAtlasCluster = createResourceClass('MongoDbAtlasCluster', 'mongo-db-atlas-cluster');
export const StateMachine = createResourceClass('StateMachine', 'state-machine');
export const UserAuthPool = createResourceClass('UserAuthPool', 'user-auth-pool');
export const UpstashRedis = createResourceClass('UpstashRedis', 'upstash-redis');
export const SqsQueue = createResourceClass('SqsQueue', 'sqs-queue');
export const SnsTopic = createResourceClass('SnsTopic', 'sns-topic');
export const KinesisStream = createResourceClass('KinesisStream', 'kinesis-stream');
export const WebAppFirewall = createResourceClass('WebAppFirewall', 'web-app-firewall');
export const OpenSearchDomain = createResourceClass('OpenSearchDomain', 'open-search-domain');
export const EfsFilesystem = createResourceClass('EfsFilesystem', 'efs-filesystem');
export const NextjsWeb = createResourceClass('NextjsWeb', 'nextjs-web');
export const AstroWeb = createResourceClass('AstroWeb', 'astro-web');
export const NuxtWeb = createResourceClass('NuxtWeb', 'nuxt-web');
export const SvelteKitWeb = createResourceClass('SvelteKitWeb', 'sveltekit-web');
export const SolidStartWeb = createResourceClass('SolidStartWeb', 'solidstart-web');
export const TanStackWeb = createResourceClass('TanStackWeb', 'tanstack-web');
export const RemixWeb = createResourceClass('RemixWeb', 'remix-web');
export const Bastion = createResourceClass('Bastion', 'bastion');
export const AgentCoreRuntime = createResourceClass('AgentCoreRuntime', 'agentcore-runtime');
export const AgentCoreMemory = createResourceClass('AgentCoreMemory', 'agentcore-memory');
export const AgentCoreGateway = createResourceClass('AgentCoreGateway', 'agentcore-gateway');
export const AgentCoreBrowser = createResourceClass('AgentCoreBrowser', 'agentcore-browser');
export const AgentCoreCodeInterpreter = createResourceClass('AgentCoreCodeInterpreter', 'agentcore-code-interpreter');
export const AwsCdkConstruct = createResourceClass('AwsCdkConstruct', 'aws-cdk-construct');
export const CustomResourceDefinition = createResourceClass('CustomResourceDefinition', 'custom-resource-definition');
export const CustomResourceInstance = createResourceClass('CustomResourceInstance', 'custom-resource-instance');
export const DeploymentScript = createResourceClass('DeploymentScript', 'deployment-script');
export const EdgeLambdaFunction = createResourceClass('EdgeLambdaFunction', 'edge-lambda-function');
