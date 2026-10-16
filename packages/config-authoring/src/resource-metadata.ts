import {
  getResourceByClassName,
  getResourceByType,
  getResourcesWithAugmentedProps,
  getResourcesWithOverrides,
  getTypePropertiesByClassName,
  getTypePropertiesByTypeValue,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  RESOURCES_CONVERTIBLE_TO_CLASSES,
  type ResourceDefinition,
  type TypePropertiesDefinition
} from './class-config.js';
import type { StacktapeResourceType } from '@stacktape/config/resource-types';

export type { ResourceDefinition, TypePropertiesDefinition };
export {
  getResourceByClassName,
  getResourceByType,
  getResourcesWithAugmentedProps,
  getResourcesWithOverrides,
  getTypePropertiesByClassName,
  getTypePropertiesByTypeValue,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  RESOURCES_CONVERTIBLE_TO_CLASSES
};

/** Parameters of a resource with a CDN in front of it. `cdnUrl` exists only while the CDN has no custom domains. */
const CDN_PARAMS = [
  { name: 'cdnUrl', description: 'CDN URL (without custom domains)' },
  { name: 'cdnDomain', description: 'CDN domain' },
  { name: 'cdnCanonicalDomain', description: 'Canonical CDN domain' },
  { name: 'cdnCanonicalUrl', description: 'Canonical CDN URL' },
  { name: 'cdnCustomDomains', description: 'CDN custom domains' },
  { name: 'cdnCustomDomainUrls', description: 'CDN custom domain URLs' }
] as const;

/**
 * Parameters of an API or load balancer. `domain` and `url` are the default domain while there are no custom domains;
 * with custom domains they are the first custom domain.
 */
const ENDPOINT_PARAMS = [
  { name: 'domain', description: 'Domain' },
  { name: 'url', description: 'URL' },
  { name: 'customDomains', description: 'Custom domains' },
  { name: 'customDomainUrl', description: 'First custom domain URL' },
  { name: 'customDomainUrls', description: 'Custom domain URLs' },
  { name: 'canonicalDomain', description: 'Canonical domain' }
] as const;

const SSR_WEB_PARAMS = [{ name: 'url', description: 'Website URL' }] as const;

/**
 * The parameters each resource type can expose to `$ResourceParam`, the resource classes and `stacktape param:get`.
 * Which of them a deployed resource has depends on its configuration: a custom domain, for example, adds
 * `customDomainUrl`. The synthesis test `referenceable-params.spec.ts` keeps this list equal to what the CLI publishes.
 */
export const REFERENCEABLE_PARAMS = {
  'relational-database': [
    { name: 'connectionString', description: 'Connection string for the database' },
    { name: 'jdbcConnectionString', description: 'JDBC connection string' },
    { name: 'host', description: 'Database host' },
    { name: 'hosts', description: 'Hosts of all Aurora instances' },
    { name: 'port', description: 'Database port' },
    { name: 'dbName', description: 'Database name' },
    { name: 'readerHost', description: 'Reader endpoint host' },
    { name: 'readerPort', description: 'Reader endpoint port' },
    { name: 'readerConnectionString', description: 'Reader connection string' },
    { name: 'readerJdbcConnectionString', description: 'Reader JDBC connection string' },
    { name: 'readReplicaHosts', description: 'Read replica hosts' },
    { name: 'readReplicaConnectionStrings', description: 'Read replica connection strings' },
    { name: 'readReplicaJdbcConnectionStrings', description: 'Read replica JDBC connection strings' }
  ],
  'dsql-database': [
    { name: 'endpoint', description: 'DSQL cluster endpoint' },
    { name: 'port', description: 'PostgreSQL port' },
    { name: 'databaseName', description: 'Default database name' },
    { name: 'username', description: 'Built-in database role used by connectTo' },
    { name: 'region', description: 'AWS region containing the cluster' },
    { name: 'id', description: 'DSQL cluster ID' },
    { name: 'arn', description: 'DSQL cluster ARN' }
  ],
  'kafka-cluster': [
    { name: 'arn', description: 'MSK cluster ARN' },
    { name: 'name', description: 'MSK cluster name' },
    { name: 'bootstrapServers', description: 'Comma-separated IAM bootstrap brokers' }
  ],
  'email-sender': [
    { name: 'identity', description: 'Canonical SES sender identity' },
    { name: 'identityArn', description: 'SES identity ARN' },
    { name: 'region', description: 'AWS region containing the identity' },
    { name: 'configurationSetName', description: 'SES configuration set used by default' },
    { name: 'feedbackTopicArn', description: 'Shared SNS topic ARN for bounce and complaint events' }
  ],
  'web-service': [...ENDPOINT_PARAMS, ...CDN_PARAMS],
  'private-service': [
    { name: 'address', description: 'Private service address' },
    { name: 'domain', description: 'Load balancer domain' },
    { name: 'url', description: 'Load balancer URL' },
    { name: 'canonicalDomain', description: 'Canonical load balancer domain' }
  ],
  bucket: [{ name: 'name', description: 'Bucket name' }, { name: 'arn', description: 'Bucket ARN' }, ...CDN_PARAMS],
  'dynamo-db-table': [
    { name: 'name', description: 'Table name' },
    { name: 'arn', description: 'Table ARN' },
    { name: 'streamArn', description: 'Stream ARN' }
  ],
  function: [
    { name: 'arn', description: 'Function ARN' },
    { name: 'logGroupArn', description: 'Log group ARN' },
    { name: 'url', description: 'Function URL' },
    ...CDN_PARAMS
  ],
  'edge-lambda-function': [{ name: 'arn', description: 'Function version ARN' }],
  'batch-job': [
    { name: 'jobDefinitionArn', description: 'Job definition ARN' },
    { name: 'stateMachineArn', description: 'State machine ARN' },
    { name: 'logGroupArn', description: 'Log group ARN' }
  ],
  'event-bus': [
    { name: 'arn', description: 'Event bus ARN' },
    { name: 'archiveArn', description: 'Archive ARN' }
  ],
  'http-api-gateway': [...ENDPOINT_PARAMS, ...CDN_PARAMS],
  'websocket-api-gateway': [
    { name: 'apiId', description: 'API Gateway ID' },
    { name: 'url', description: 'WebSocket client URL' },
    { name: 'managementEndpoint', description: 'HTTPS endpoint for sending messages to connected clients' },
    { name: 'customDomains', description: 'Custom domains' },
    { name: 'customDomainUrl', description: 'First custom domain URL' },
    { name: 'customDomainUrls', description: 'Custom domain URLs' },
    { name: 'canonicalDomain', description: 'Canonical domain' }
  ],
  'appsync-api': [
    { name: 'apiId', description: 'AppSync API ID' },
    { name: 'arn', description: 'AppSync API ARN' },
    { name: 'url', description: 'GraphQL HTTPS endpoint' },
    { name: 'realtimeUrl', description: 'GraphQL realtime WebSocket endpoint' },
    { name: 'customDomainUrl', description: 'GraphQL endpoint on the configured custom domain' },
    { name: 'apiKey', description: 'Sensitive AppSync API key when API-key authentication is configured' }
  ],
  'mongo-db-atlas-cluster': [{ name: 'connectionString', description: 'MongoDB connection string' }],
  'redis-cluster': [
    { name: 'host', description: 'Redis host' },
    { name: 'port', description: 'Redis port' },
    { name: 'connectionString', description: 'Redis connection string' },
    { name: 'readerHost', description: 'Redis reader host' },
    { name: 'readerPort', description: 'Redis reader port' },
    { name: 'readerConnectionString', description: 'Redis reader connection string' },
    { name: 'sharding', description: 'Sharding status' }
  ],
  'state-machine': [
    { name: 'arn', description: 'State machine ARN' },
    { name: 'name', description: 'State machine name' }
  ],
  'user-auth-pool': [
    { name: 'id', description: 'User pool ID' },
    { name: 'arn', description: 'User pool ARN' },
    { name: 'clientId', description: 'Client ID' },
    { name: 'clientSecret', description: 'Client secret when generateClientSecret is enabled' },
    { name: 'providerUrl', description: 'Identity provider URL' },
    { name: 'domain', description: 'User pool domain' }
  ],
  'upstash-redis': [
    { name: 'host', description: 'Upstash Redis host' },
    { name: 'port', description: 'Upstash Redis port' },
    { name: 'password', description: 'Password' },
    { name: 'restToken', description: 'REST token' },
    { name: 'readOnlyRestToken', description: 'Read-only REST token' },
    { name: 'restUrl', description: 'REST URL' },
    { name: 'redisUrl', description: 'Redis URL' }
  ],
  'application-load-balancer': [
    { name: 'domain', description: 'Load balancer domain' },
    { name: 'url', description: 'Load balancer URL' },
    { name: 'customDomains', description: 'Custom domains' },
    { name: 'canonicalDomain', description: 'Canonical domain' },
    { name: 'address', description: 'Address of the load balancer of a private service' },
    ...CDN_PARAMS
  ],
  'network-load-balancer': [
    { name: 'domain', description: 'Load balancer domain' },
    { name: 'customDomains', description: 'Custom domains' },
    { name: 'canonicalDomain', description: 'Canonical domain' }
  ],
  'hosting-bucket': [
    { name: 'name', description: 'Bucket name' },
    { name: 'arn', description: 'Bucket ARN' },
    ...CDN_PARAMS
  ],
  'web-app-firewall': [
    { name: 'arn', description: 'Firewall ARN' },
    { name: 'scope', description: 'Firewall scope' }
  ],
  'open-search-domain': [
    { name: 'domainEndpoint', description: 'OpenSearch domain endpoint' },
    { name: 'arn', description: 'Domain ARN' }
  ],
  'efs-filesystem': [
    { name: 'arn', description: 'EFS ARN' },
    { name: 'id', description: 'EFS ID' }
  ],
  'nextjs-web': SSR_WEB_PARAMS,
  'astro-web': SSR_WEB_PARAMS,
  'nuxt-web': SSR_WEB_PARAMS,
  'sveltekit-web': SSR_WEB_PARAMS,
  'solidstart-web': SSR_WEB_PARAMS,
  'tanstack-web': SSR_WEB_PARAMS,
  'remix-web': SSR_WEB_PARAMS,
  convex: [
    { name: 'url', description: 'Cloud origin that frontend clients connect to' },
    { name: 'siteUrl', description: 'HTTP actions origin' },
    { name: 'dashboardUrl', description: 'Admin dashboard URL when the dashboard is enabled' },
    { name: 'adminKey', description: 'Sensitive admin key for Convex tooling; never injected by connectTo' },
    { name: 'instanceSecret', description: 'Sensitive instance boot secret' }
  ],
  'sqs-queue': [
    { name: 'arn', description: 'Queue ARN' },
    { name: 'url', description: 'Queue URL' },
    { name: 'name', description: 'Queue name' }
  ],
  'sns-topic': [
    { name: 'arn', description: 'Topic ARN' },
    { name: 'name', description: 'Topic name' }
  ],
  'kinesis-stream': [
    { name: 'arn', description: 'Stream ARN' },
    { name: 'name', description: 'Stream name' }
  ],
  'agentcore-runtime': [
    { name: 'id', description: 'AgentCore runtime ID' },
    { name: 'arn', description: 'AgentCore runtime ARN' },
    { name: 'endpointName', description: 'Default runtime endpoint name' },
    { name: 'endpointArn', description: 'Default runtime endpoint ARN' }
  ],
  'agentcore-memory': [
    { name: 'id', description: 'AgentCore memory ID' },
    { name: 'arn', description: 'AgentCore memory ARN' }
  ],
  'agentcore-gateway': [
    { name: 'id', description: 'AgentCore gateway ID' },
    { name: 'arn', description: 'AgentCore gateway ARN' },
    { name: 'url', description: 'AgentCore gateway URL' }
  ],
  'agentcore-browser': [
    { name: 'id', description: 'AgentCore browser ID' },
    { name: 'arn', description: 'AgentCore browser ARN' }
  ],
  'agentcore-code-interpreter': [
    { name: 'id', description: 'AgentCore code interpreter ID' },
    { name: 'arn', description: 'AgentCore code interpreter ARN' }
  ]
} as const satisfies Partial<
  Record<StacktapeResourceType, ReadonlyArray<{ readonly name: string; readonly description: string }>>
>;

/**
 * Parameters named after a number from the configuration, which therefore have no resource class property: the port
 * of each load balancer listener (`port443`) and of each read replica (`readReplica0Port`).
 */
export const NUMBERED_REFERENCEABLE_PARAMS = {
  'application-load-balancer': [{ prefix: 'port', suffix: '', description: 'Listener port' }],
  'web-service': [{ prefix: 'port', suffix: '', description: 'Load balancer listener port' }],
  'private-service': [{ prefix: 'port', suffix: '', description: 'Load balancer listener port' }],
  'relational-database': [{ prefix: 'readReplica', suffix: 'Port', description: 'Read replica port' }]
} as const satisfies Partial<
  Record<
    StacktapeResourceType,
    ReadonlyArray<{ readonly prefix: string; readonly suffix: string; readonly description: string }>
  >
>;

type NumberedParamName<Param> = Param extends {
  prefix: infer Prefix extends string;
  suffix: infer Suffix extends string;
}
  ? `${Prefix}${number}${Suffix}`
  : never;

/** Every parameter name some resource type can expose. */
export type AnyReferenceableParamName =
  | (typeof REFERENCEABLE_PARAMS)[keyof typeof REFERENCEABLE_PARAMS][number]['name']
  | NumberedParamName<(typeof NUMBERED_REFERENCEABLE_PARAMS)[keyof typeof NUMBERED_REFERENCEABLE_PARAMS][number]>;

const paramsOfType = (resourceType: string) => ({
  named: (REFERENCEABLE_PARAMS as Partial<Record<string, ReadonlyArray<{ name: string }>>>)[resourceType] ?? [],
  numbered:
    (NUMBERED_REFERENCEABLE_PARAMS as Partial<Record<string, ReadonlyArray<{ prefix: string; suffix: string }>>>)[
      resourceType
    ] ?? []
});

/** The parameter names a resource type can expose, numbered ones written as `port<number>`. */
export const getReferenceableParamNames = (resourceType: string): string[] => {
  const { named, numbered } = paramsOfType(resourceType);
  return [...named.map(({ name }) => name), ...numbered.map(({ prefix, suffix }) => `${prefix}<number>${suffix}`)];
};

/** Whether a resource of `resourceType` exposes the parameter `name` in some configuration. */
export const isReferenceableParam = (resourceType: string, name: string): boolean => {
  const { named, numbered } = paramsOfType(resourceType);
  return (
    named.some((param) => param.name === name) ||
    numbered.some(
      ({ prefix, suffix }) =>
        name.startsWith(prefix) &&
        name.endsWith(suffix) &&
        /^\d+$/.test(name.slice(prefix.length, name.length - suffix.length))
    )
  );
};
