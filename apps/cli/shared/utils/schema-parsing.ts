import { capitalCase } from 'change-case';
import { get } from 'lodash';
import configSchema from '../../@generated/schemas/config-schema.json';

function getDefinitionNameFromRefPath(refPath: string) {
  return refPath.split('/').pop() ?? '';
}

/**
 * For use with _.get()
 */
function getJsObjPathFromRefPath(refPath: string): string {
  if (refPath.slice(0, 2) === '#/') {
    return refPath.slice(2).replaceAll('/', '.');
  }

  return refPath.replaceAll('/', '.');
}

function resolveConfigSchemaRef(ref: string): Record<string, any> {
  return get(configSchema, getJsObjPathFromRefPath(ref));
}

const COMPUTE_RESOURCES: StpResourceType[] = [
  'web-service',
  'function',
  'batch-job',
  'worker-service',
  'private-service',
  'edge-lambda-function',
  'multi-container-workload'
];

const DATABASE_RESOURCES: StpResourceType[] = [
  'relational-database',
  'redis-cluster',
  'dynamo-db-table',
  'open-search-domain'
];

const SECURITY_RESOURCES: StpResourceType[] = ['web-app-firewall', 'user-auth-pool', 'bastion'];

const OTHER_RESOURCES: StpResourceType[] = [
  'hosting-bucket',
  'bucket',
  'event-bus',
  'sns-topic',
  'sqs-queue',
  'application-load-balancer',
  'http-api-gateway',
  'state-machine',
  'custom-resource-definition',
  'custom-resource-instance',
  'multi-container-workload',
  'deployment-script',
  'aws-cdk-construct'
];

const THIRD_PARTY_RESOURCES: StpResourceType[] = ['mongo-db-atlas-cluster', 'upstash-redis'];

export const getResourceCategory = (resourceType: StpResourceType) => {
  if (COMPUTE_RESOURCES.includes(resourceType)) {
    return 'compute-resource';
  }
  if (DATABASE_RESOURCES.includes(resourceType)) {
    return 'database-resource';
  }
  if (SECURITY_RESOURCES.includes(resourceType)) {
    return 'security-resource';
  }
  if (OTHER_RESOURCES.includes(resourceType)) {
    return 'other-resource';
  }
  if (THIRD_PARTY_RESOURCES.includes(resourceType)) {
    return '3rd-party-resource';
  }
};

const FORCED_ORDER_RESOURCES = ['web-service', 'hosting-bucket', 'function'];

const getPrettyResourceName = (resourceName: string) => {
  return capitalCase(resourceName)
    .replaceAll(' Db', 'Db')
    .replace('Sqs', 'SQS')
    .replace('Sns', 'SNS')
    .replace('Aws Cdk', 'AWS CDK')
    .replace('Relational Database', 'SQL database')
    .replace('Open Search Domain', 'OpenSearch (Elastic)')
    .replace('Bastion', 'Bastion (Jump Host)')
    .replace('Event Bus', 'Event Bus (EventBridge)')
    .replace('State Machine', 'State Machine')
    .replace('Application Load', 'Load');
};

export function getStacktapeResourceDefinitions(): {
  definitionName: string;
  type: StpResourceType;
  prettyName: string;
  description: string;
  resourceType: StpResourceType;
  category: ReturnType<typeof getResourceCategory>;
  definition: Record<string, any>;
}[] {
  return configSchema.definitions.StacktapeResourceDefinition.anyOf
    .map((definitionRefObj) => {
      const definitionName = getDefinitionNameFromRefPath(definitionRefObj.$ref);

      if (!definitionName) {
        return null;
      }

      const definition = resolveConfigSchemaRef(definitionRefObj.$ref);
      const [titleLine, descriptionLine] = (definition.description || '').split('\n---\n-');
      const resourceType = definition.properties.type.const as StpResourceType;

      return {
        definitionName,
        type: definition.properties.type.const,
        prettyName: getPrettyResourceName(definitionName),
        description: descriptionLine ? descriptionLine.trim().replaceAll('\n- ', '<br />') : titleLine || null,
        resourceType,
        category: getResourceCategory(resourceType) as ReturnType<typeof getResourceCategory>,
        definition
      };
    })
    .filter(Boolean)
    .sort((a, b) => FORCED_ORDER_RESOURCES.indexOf(b.resourceType) - FORCED_ORDER_RESOURCES.indexOf(a.resourceType));
}
