import { RESOURCES_CONVERTIBLE_TO_CLASSES } from './class-config';
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

// Create all resource classes from config
const RESOURCE_CLASSES: Record<string, ReturnType<typeof createResourceClass>> = {};
for (const def of RESOURCES_CONVERTIBLE_TO_CLASSES) {
  // Use 'LambdaFunction' as the exported name for 'Function' to avoid JS reserved word issues
  const exportName = def.className === 'Function' ? 'LambdaFunction' : def.className;
  RESOURCE_CLASSES[exportName] = createResourceClass(def.className, def.resourceType);
}

// Export all resource classes for named imports
export const {
  RelationalDatabase,
  WebService,
  PrivateService,
  WorkerService,
  MultiContainerWorkload,
  LambdaFunction,
  BatchJob,
  Bucket,
  HostingBucket,
  DynamoDbTable,
  EventBus,
  HttpApiGateway,
  ApplicationLoadBalancer,
  NetworkLoadBalancer,
  RedisCluster,
  MongoDbAtlasCluster,
  StateMachine,
  UserAuthPool,
  UpstashRedis,
  SqsQueue,
  SnsTopic,
  WebAppFirewall,
  OpenSearchDomain,
  EfsFilesystem,
  NextjsWeb,
  Bastion
} = RESOURCE_CLASSES;
