import configSchema from '../generated/config-schema.json';
import { getPrettyResourceName } from './resource-types';
import type { StacktapeResourceType } from './resource-types';

export type StacktapeResourceCategory =
  | 'compute-resource'
  | 'database-resource'
  | 'security-resource'
  | 'other-resource'
  | '3rd-party-resource';

type JsonSchemaDefinition = {
  description?: string;
  properties: {
    type: {
      const: StacktapeResourceType;
    };
  };
} & Record<string, unknown>;

export type InspectedStacktapeResourceDefinition = {
  definitionName: string;
  type: StacktapeResourceType;
  prettyName: string;
  description: string | null;
  resourceType: StacktapeResourceType;
  category: StacktapeResourceCategory | undefined;
  definition: JsonSchemaDefinition;
};

const COMPUTE_RESOURCES = new Set<StacktapeResourceType>([
  'web-service',
  'function',
  'batch-job',
  'worker-service',
  'private-service',
  'edge-lambda-function',
  'multi-container-workload'
]);

const DATABASE_RESOURCES = new Set<StacktapeResourceType>([
  'relational-database',
  'dsql-database',
  'redis-cluster',
  'dynamo-db-table',
  'open-search-domain'
]);

const SECURITY_RESOURCES = new Set<StacktapeResourceType>(['web-app-firewall', 'user-auth-pool', 'bastion']);

const OTHER_RESOURCES = new Set<StacktapeResourceType>([
  'hosting-bucket',
  'bucket',
  'event-bus',
  'sns-topic',
  'sqs-queue',
  'application-load-balancer',
  'http-api-gateway',
  'websocket-api-gateway',
  'appsync-api',
  'kafka-cluster',
  'state-machine',
  'custom-resource-definition',
  'custom-resource-instance',
  'multi-container-workload',
  'deployment-script',
  'aws-cdk-construct',
  'uptime-check',
  'synthetic-test'
]);

const THIRD_PARTY_RESOURCES = new Set<StacktapeResourceType>(['mongo-db-atlas-cluster', 'upstash-redis']);

const getResourceCategory = (resourceType: StacktapeResourceType): StacktapeResourceCategory | undefined => {
  if (COMPUTE_RESOURCES.has(resourceType)) {
    return 'compute-resource';
  }
  if (DATABASE_RESOURCES.has(resourceType)) {
    return 'database-resource';
  }
  if (SECURITY_RESOURCES.has(resourceType)) {
    return 'security-resource';
  }
  if (OTHER_RESOURCES.has(resourceType)) {
    return 'other-resource';
  }
  if (THIRD_PARTY_RESOURCES.has(resourceType)) {
    return '3rd-party-resource';
  }
  return undefined;
};

const FORCED_ORDER_RESOURCES: StacktapeResourceType[] = ['web-service', 'hosting-bucket', 'function'];

const getDefinition = (ref: string): JsonSchemaDefinition | undefined => {
  const segments = ref.replace(/^#\//, '').split('/');
  let current: unknown = configSchema;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as JsonSchemaDefinition;
};

export const getStacktapeResourceDefinitions = (): InspectedStacktapeResourceDefinition[] =>
  configSchema.definitions.StacktapeResourceDefinition.anyOf
    .flatMap(({ $ref }) => {
      const definitionName = $ref.split('/').pop();
      const definition = getDefinition($ref);

      if (!definitionName || !definition) {
        return [];
      }

      const [titleLine, descriptionLine] = (definition.description ?? '').split('\n---\n-');
      const resourceType = definition.properties.type.const;

      return [
        {
          definitionName,
          type: resourceType,
          prettyName: getPrettyResourceName(definitionName),
          description: descriptionLine ? descriptionLine.trim().replaceAll('\n- ', '<br />') : titleLine || null,
          resourceType,
          category: getResourceCategory(resourceType),
          definition
        }
      ];
    })
    .sort(
      (first, second) =>
        FORCED_ORDER_RESOURCES.indexOf(second.resourceType) - FORCED_ORDER_RESOURCES.indexOf(first.resourceType)
    );
