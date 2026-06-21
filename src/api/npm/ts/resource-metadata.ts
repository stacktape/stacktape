// Re-export from class-config (single source of truth)
export {
  getResourceByClassName,
  getResourceByType,
  getResourcesWithAugmentedProps,
  getResourcesWithOverrides,
  getTypePropertiesByClassName,
  getTypePropertiesByTypeValue,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  type ResourceDefinition,
  RESOURCES_CONVERTIBLE_TO_CLASSES,
  type TypePropertiesDefinition
} from './class-config';

// These can be referenced using $ResourceParam directive
export const REFERENCEABLE_PARAMS: Record<string, Array<{ name: string; description: string }>> = {
  'relational-database': [
    { name: 'connectionString', description: 'Connection string for the database' },
    { name: 'jdbcConnectionString', description: 'JDBC connection string' },
    { name: 'host', description: 'Database host' },
    { name: 'port', description: 'Database port' },
    { name: 'dbName', description: 'Database name' },
    { name: 'readerHost', description: 'Reader endpoint host' },
    { name: 'readerConnectionString', description: 'Reader connection string' },
    { name: 'readerJdbcConnectionString', description: 'Reader JDBC connection string' }
  ],
  'web-service': [
    { name: 'domain', description: 'Web service domain' },
    { name: 'url', description: 'Web service URL' },
    { name: 'customDomains', description: 'Custom domains' },
    { name: 'customDomainUrls', description: 'Custom domain URLs' }
  ],
  'private-service': [{ name: 'address', description: 'Private service address' }],
  bucket: [
    { name: 'name', description: 'Bucket name' },
    { name: 'arn', description: 'Bucket ARN' }
  ],
  'dynamo-db-table': [
    { name: 'name', description: 'Table name' },
    { name: 'arn', description: 'Table ARN' },
    { name: 'streamArn', description: 'Stream ARN' }
  ],
  function: [
    { name: 'arn', description: 'Function ARN' },
    { name: 'logGroupArn', description: 'Log group ARN' }
  ],
  'batch-job': [
    { name: 'jobDefinitionArn', description: 'Job definition ARN' },
    { name: 'stateMachineArn', description: 'State machine ARN' },
    { name: 'logGroupArn', description: 'Log group ARN' }
  ],
  'event-bus': [
    { name: 'arn', description: 'Event bus ARN' },
    { name: 'archiveArn', description: 'Archive ARN' }
  ],
  'http-api-gateway': [
    { name: 'domain', description: 'API Gateway domain' },
    { name: 'url', description: 'API Gateway URL' },
    { name: 'customDomains', description: 'Custom domains' },
    { name: 'customDomainUrls', description: 'Custom domain URLs' },
    { name: 'customDomainUrl', description: 'First custom domain URL' }
  ],
  'mongo-db-atlas-cluster': [{ name: 'connectionString', description: 'MongoDB connection string' }],
  'redis-cluster': [
    { name: 'host', description: 'Redis host' },
    { name: 'readerHost', description: 'Redis reader host' },
    { name: 'port', description: 'Redis port' },
    { name: 'sharding', description: 'Sharding status' }
  ],
  'state-machine': [
    { name: 'arn', description: 'State machine ARN' },
    { name: 'name', description: 'State machine name' }
  ],
  'user-auth-pool': [
    { name: 'id', description: 'User pool ID' },
    { name: 'clientId', description: 'Client ID' },
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
    { name: 'customDomains', description: 'Custom domains' }
  ],
  'network-load-balancer': [
    { name: 'domain', description: 'Load balancer domain' },
    { name: 'customDomains', description: 'Custom domains' }
  ],
  'hosting-bucket': [
    { name: 'name', description: 'Bucket name' },
    { name: 'arn', description: 'Bucket ARN' }
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
  'nextjs-web': [{ name: 'url', description: 'Website URL' }],
  'astro-web': [{ name: 'url', description: 'Website URL' }],
  'nuxt-web': [{ name: 'url', description: 'Website URL' }],
  'sveltekit-web': [{ name: 'url', description: 'Website URL' }],
  'solidstart-web': [{ name: 'url', description: 'Website URL' }],
  'tanstack-web': [{ name: 'url', description: 'Website URL' }],
  'remix-web': [{ name: 'url', description: 'Website URL' }],
  'multi-container-workload': [{ name: 'logGroupArn', description: 'Log group ARN' }],
  'sqs-queue': [
    { name: 'arn', description: 'Queue ARN' },
    { name: 'url', description: 'Queue URL' },
    { name: 'name', description: 'Queue name' }
  ],
  'sns-topic': [
    { name: 'arn', description: 'Topic ARN' },
    { name: 'name', description: 'Topic name' }
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
};
