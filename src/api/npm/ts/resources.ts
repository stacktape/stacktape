import { BaseResource } from './config';
import { REFERENCEABLE_PARAMS } from './resource-metadata';

// Private symbol for accessing the internal param reference method
const getParamReferenceSymbol = Symbol.for('stacktape:getParamReference');

/**
 * Factory function to create a resource class with referenceable parameters.
 * Supports two calling conventions:
 * - new Resource(properties) - name derived from object key in resources
 * - new Resource(name, properties) - explicit name (backwards compatible)
 */
function createResourceClass(className: string, resourceType: string): any {
  // Create the class dynamically
  const ResourceClass = class extends BaseResource {
    constructor(nameOrProperties: string | any, properties?: any) {
      if (typeof nameOrProperties === 'string') {
        // Old style: (name, properties) - explicit name
        super(nameOrProperties, resourceType, properties);
      } else {
        // New style: (properties) - name will be set from object key
        super(undefined, resourceType, nameOrProperties);
      }
    }
  };

  // Set the class name for better debugging
  Object.defineProperty(ResourceClass, 'name', { value: className });

  // Add referenceable parameter getters
  const referenceableParams = REFERENCEABLE_PARAMS[resourceType] || [];
  for (const param of referenceableParams) {
    Object.defineProperty(ResourceClass.prototype, param.name, {
      get(this: BaseResource) {
        return (this as any)[getParamReferenceSymbol](param.name);
      },
      enumerable: false,
      configurable: true
    });
  }

  return ResourceClass;
}

// ==================== RESOURCE CLASSES ====================

export const RelationalDatabase = createResourceClass('RelationalDatabase', 'relational-database');
export const WebService = createResourceClass('WebService', 'web-service');
export const PrivateService = createResourceClass('PrivateService', 'private-service');
export const WorkerService = createResourceClass('WorkerService', 'worker-service');
export const MultiContainerWorkload = createResourceClass('MultiContainerWorkload', 'multi-container-workload');
export const LambdaFunction = createResourceClass('LambdaFunction', 'function');
export const BatchJob = createResourceClass('BatchJob', 'batch-job');
export const Bucket = createResourceClass('Bucket', 'bucket');
export const HostingBucket = createResourceClass('HostingBucket', 'hosting-bucket');
export const DynamoDbTable = createResourceClass('DynamoDbTable', 'dynamo-db-table');
export const EventBus = createResourceClass('EventBus', 'event-bus');
export const HttpApiGateway = createResourceClass('HttpApiGateway', 'http-api-gateway');
export const ApplicationLoadBalancer = createResourceClass('ApplicationLoadBalancer', 'application-load-balancer');
export const NetworkLoadBalancer = createResourceClass('NetworkLoadBalancer', 'network-load-balancer');
export const RedisCluster = createResourceClass('RedisCluster', 'redis-cluster');
export const MongoDbAtlasCluster = createResourceClass('MongoDbAtlasCluster', 'mongo-db-atlas-cluster');
export const StateMachine = createResourceClass('StateMachine', 'state-machine');
export const UserAuthPool = createResourceClass('UserAuthPool', 'user-auth-pool');
export const UpstashRedis = createResourceClass('UpstashRedis', 'upstash-redis');
export const SqsQueue = createResourceClass('SqsQueue', 'sqs-queue');
export const SnsTopic = createResourceClass('SnsTopic', 'sns-topic');
export const WebAppFirewall = createResourceClass('WebAppFirewall', 'web-app-firewall');
export const OpenSearchDomain = createResourceClass('OpenSearchDomain', 'open-search-domain');
export const EfsFilesystem = createResourceClass('EfsFilesystem', 'efs-filesystem');
export const NextjsWeb = createResourceClass('NextjsWeb', 'nextjs-web');
export const Bastion = createResourceClass('Bastion', 'bastion');
