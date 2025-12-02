/**
 * Central metadata registry for all Stacktape resources.
 * This is the single source of truth for resource metadata.
 *
 * When adding a new resource:
 * 1. Add it to the RESOURCES array below with its connectTo configuration
 * 2. Add its referenceable params to the REFERENCEABLE_PARAMS object
 * 3. Ensure child resources are defined in child-resources.ts
 * 4. That's it! The types will be generated automatically.
 */

export type ResourceTypeName =
  | 'RelationalDatabase'
  | 'WebService'
  | 'PrivateService'
  | 'WorkerService'
  | 'MultiContainerWorkload'
  | 'LambdaFunction'
  | 'BatchJob'
  | 'Bucket'
  | 'HostingBucket'
  | 'DynamoDbTable'
  | 'EventBus'
  | 'HttpApiGateway'
  | 'ApplicationLoadBalancer'
  | 'NetworkLoadBalancer'
  | 'RedisCluster'
  | 'MongoDbAtlasCluster'
  | 'StateMachine'
  | 'UserAuthPool'
  | 'UpstashRedis'
  | 'SqsQueue'
  | 'SnsTopic'
  | 'WebAppFirewall'
  | 'OpenSearchDomain'
  | 'EfsFilesystem'
  | 'NextjsWeb'
  | 'Bastion';

export type ResourceDefinition = {
  /** Class name for the resource (e.g., 'LambdaFunction') */
  className: ResourceTypeName;
  /** Resource type identifier used in config (e.g., 'function') */
  resourceType: string;
  /** Props type name (e.g., 'LambdaFunctionProps') */
  propsType: string;
  /** Resources and AWS services this resource can connect to */
  canConnectTo?: ResourceTypeName[] | 'GlobalAwsServiceConstant'[];
  /** Whether this resource supports overrides (default: true) */
  supportsOverrides?: boolean;
  /** Whether this resource has augmented connectTo/environment props (default: false) */
  hasAugmentedProps?: boolean;
};

/**
 * Complete list of all Stacktape resources.
 * This is the single source of truth - all code generation derives from this.
 */
export const RESOURCES: ResourceDefinition[] = [
  {
    className: 'RelationalDatabase',
    resourceType: 'relational-database',
    propsType: 'RelationalDatabaseProps',
    canConnectTo: []
  },
  {
    className: 'WebService',
    resourceType: 'web-service',
    propsType: 'WebServiceProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem',
      'PrivateService'
    ]
  },
  {
    className: 'PrivateService',
    resourceType: 'private-service',
    propsType: 'PrivateServiceProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem'
    ]
  },
  {
    className: 'WorkerService',
    resourceType: 'worker-service',
    propsType: 'WorkerServiceProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem'
    ]
  },
  {
    className: 'MultiContainerWorkload',
    resourceType: 'multi-container-workload',
    propsType: 'ContainerWorkloadProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem'
    ]
  },
  {
    className: 'LambdaFunction',
    resourceType: 'function',
    propsType: 'LambdaFunctionProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem',
      'PrivateService',
      'WebService'
    ]
  },
  {
    className: 'BatchJob',
    resourceType: 'batch-job',
    propsType: 'BatchJobProps',
    hasAugmentedProps: true,
    canConnectTo: [
      'RelationalDatabase',
      'Bucket',
      'HostingBucket',
      'DynamoDbTable',
      'EventBus',
      'RedisCluster',
      'MongoDbAtlasCluster',
      'UpstashRedis',
      'SqsQueue',
      'SnsTopic',
      'OpenSearchDomain',
      'EfsFilesystem'
    ]
  },
  {
    className: 'Bucket',
    resourceType: 'bucket',
    propsType: 'BucketProps',
    canConnectTo: []
  },
  {
    className: 'HostingBucket',
    resourceType: 'hosting-bucket',
    propsType: 'HostingBucketProps',
    canConnectTo: []
  },
  {
    className: 'DynamoDbTable',
    resourceType: 'dynamo-db-table',
    propsType: 'DynamoDbTableProps',
    canConnectTo: []
  },
  {
    className: 'EventBus',
    resourceType: 'event-bus',
    propsType: 'EventBusProps',
    canConnectTo: []
  },
  {
    className: 'HttpApiGateway',
    resourceType: 'http-api-gateway',
    propsType: 'HttpApiGatewayProps',
    canConnectTo: []
  },
  {
    className: 'ApplicationLoadBalancer',
    resourceType: 'application-load-balancer',
    propsType: 'ApplicationLoadBalancerProps',
    canConnectTo: []
  },
  {
    className: 'NetworkLoadBalancer',
    resourceType: 'network-load-balancer',
    propsType: 'NetworkLoadBalancerProps',
    canConnectTo: []
  },
  {
    className: 'RedisCluster',
    resourceType: 'redis-cluster',
    propsType: 'RedisClusterProps',
    canConnectTo: []
  },
  {
    className: 'MongoDbAtlasCluster',
    resourceType: 'mongo-db-atlas-cluster',
    propsType: 'MongoDbAtlasClusterProps',
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: 'StateMachine',
    resourceType: 'state-machine',
    propsType: 'StateMachineProps',
    hasAugmentedProps: true,
    canConnectTo: ['LambdaFunction', 'BatchJob']
  },
  {
    className: 'UserAuthPool',
    resourceType: 'user-auth-pool',
    propsType: 'UserAuthPoolProps',
    canConnectTo: []
  },
  {
    className: 'UpstashRedis',
    resourceType: 'upstash-redis',
    propsType: 'UpstashRedisProps',
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: 'SqsQueue',
    resourceType: 'sqs-queue',
    propsType: 'SqsQueueProps',
    canConnectTo: []
  },
  {
    className: 'SnsTopic',
    resourceType: 'sns-topic',
    propsType: 'SnsTopicProps',
    canConnectTo: []
  },
  {
    className: 'WebAppFirewall',
    resourceType: 'web-app-firewall',
    propsType: 'WebAppFirewallProps',
    canConnectTo: []
  },
  {
    className: 'OpenSearchDomain',
    resourceType: 'open-search-domain',
    propsType: 'OpenSearchDomainProps',
    canConnectTo: []
  },
  {
    className: 'EfsFilesystem',
    resourceType: 'efs-filesystem',
    propsType: 'EfsFilesystemProps',
    canConnectTo: []
  },
  {
    className: 'NextjsWeb',
    resourceType: 'nextjs-web',
    propsType: 'NextjsWebProps',
    canConnectTo: []
  },
  {
    className: 'Bastion',
    resourceType: 'bastion',
    propsType: 'BastionProps',
    canConnectTo: []
  }
];

/**
 * Type properties (engines, packaging, events, integrations, etc.)
 * These are used for database engines, lambda packaging, lambda events, etc.
 */
export type TypePropertiesDefinition = {
  /** Class name (e.g., 'StacktapeLambdaBuildpackPackaging') */
  className: string;
  /** Type value that appears in the 'type' field (e.g., 'stacktape-lambda-buildpack') */
  typeValue: string;
  /** Props type name (e.g., 'StpBuildpackLambdaPackagingProps') */
  propsType: string;
};

export const TYPE_PROPERTIES: TypePropertiesDefinition[] = [
  // Database Engines
  { className: 'RdsEnginePostgres', typeValue: 'postgres', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineMariadb', typeValue: 'mariadb', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineMysql', typeValue: 'mysql', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineOracleEE', typeValue: 'oracle-ee', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineOracleSE2', typeValue: 'oracle-se2', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineSqlServerEE', typeValue: 'sqlserver-ee', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineSqlServerEX', typeValue: 'sqlserver-ex', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineSqlServerSE', typeValue: 'sqlserver-se', propsType: 'RdsEngineProperties' },
  { className: 'RdsEngineSqlServerWeb', typeValue: 'sqlserver-web', propsType: 'RdsEngineProperties' },
  { className: 'AuroraEnginePostgresql', typeValue: 'aurora-postgresql', propsType: 'AuroraEngineProperties' },
  { className: 'AuroraEngineMysql', typeValue: 'aurora-mysql', propsType: 'AuroraEngineProperties' },
  {
    className: 'AuroraServerlessEnginePostgresql',
    typeValue: 'aurora-postgresql-serverless',
    propsType: 'AuroraServerlessEngineProperties'
  },
  {
    className: 'AuroraServerlessEngineMysql',
    typeValue: 'aurora-mysql-serverless',
    propsType: 'AuroraServerlessEngineProperties'
  },
  {
    className: 'AuroraServerlessV2EnginePostgresql',
    typeValue: 'aurora-postgresql-serverless-v2',
    propsType: 'AuroraServerlessV2EngineProperties'
  },
  {
    className: 'AuroraServerlessV2EngineMysql',
    typeValue: 'aurora-mysql-serverless-v2',
    propsType: 'AuroraServerlessV2EngineProperties'
  },

  // Lambda Packaging
  {
    className: 'StacktapeLambdaBuildpackPackaging',
    typeValue: 'stacktape-lambda-buildpack',
    propsType: 'StpBuildpackLambdaPackagingProps'
  },
  {
    className: 'CustomArtifactLambdaPackaging',
    typeValue: 'custom-artifact',
    propsType: 'CustomArtifactLambdaPackagingProps'
  },

  // Container Packaging
  { className: 'PrebuiltImagePackaging', typeValue: 'prebuilt-image', propsType: 'PrebuiltImageCwPackagingProps' },
  {
    className: 'CustomDockerfilePackaging',
    typeValue: 'custom-dockerfile',
    propsType: 'CustomDockerfileCwImagePackagingProps'
  },
  {
    className: 'ExternalBuildpackPackaging',
    typeValue: 'external-buildpack',
    propsType: 'ExternalBuildpackCwImagePackagingProps'
  },
  { className: 'NixpacksPackaging', typeValue: 'nixpacks', propsType: 'NixpacksCwImagePackagingProps' },
  {
    className: 'StacktapeImageBuildpackPackaging',
    typeValue: 'stacktape-image-buildpack',
    propsType: 'StpBuildpackCwImagePackagingProps'
  },

  // Lambda Function Events/Integrations
  { className: 'HttpApiIntegration', typeValue: 'http-api-gateway', propsType: 'HttpApiIntegrationProps' },
  { className: 'S3Integration', typeValue: 's3', propsType: 'S3IntegrationProps' },
  { className: 'ScheduleIntegration', typeValue: 'schedule', propsType: 'ScheduleIntegrationProps' },
  { className: 'SnsIntegration', typeValue: 'sns', propsType: 'SnsIntegrationProps' },
  { className: 'SqsIntegration', typeValue: 'sqs', propsType: 'SqsIntegrationProps' },
  { className: 'KinesisIntegration', typeValue: 'kinesis', propsType: 'KinesisIntegrationProps' },
  { className: 'DynamoDbIntegration', typeValue: 'dynamodb', propsType: 'DynamoDbIntegrationProps' },
  {
    className: 'CloudwatchLogIntegration',
    typeValue: 'cloudwatch-logs',
    propsType: 'CloudwatchLogIntegrationProps'
  },
  {
    className: 'ApplicationLoadBalancerIntegration',
    typeValue: 'application-load-balancer',
    propsType: 'ApplicationLoadBalancerIntegrationProps'
  },
  { className: 'EventBusIntegration', typeValue: 'event-bus', propsType: 'EventBusIntegrationProps' },
  { className: 'KafkaTopicIntegration', typeValue: 'kafka-topic', propsType: 'KafkaTopicIntegrationProps' },
  { className: 'AlarmIntegration', typeValue: 'alarm', propsType: 'AlarmIntegrationProps' },

  // CDN Routes
  { className: 'CdnLoadBalancerRoute', typeValue: 'application-load-balancer', propsType: 'CdnLoadBalancerOrigin' },
  { className: 'CdnHttpApiGatewayRoute', typeValue: 'http-api-gateway', propsType: 'CdnHttpApiGatewayOrigin' },
  { className: 'CdnLambdaFunctionRoute', typeValue: 'function', propsType: 'CdnLambdaFunctionOrigin' },
  { className: 'CdnCustomDomainRoute', typeValue: 'custom-origin', propsType: 'CdnCustomOrigin' },
  { className: 'CdnBucketRoute', typeValue: 'bucket', propsType: 'CdnBucketOrigin' },

  // Web App Firewall Rules
  { className: 'ManagedRuleGroup', typeValue: 'managed-rule-group', propsType: 'ManagedRuleGroupProps' },
  { className: 'CustomRuleGroup', typeValue: 'custom-rule-group', propsType: 'CustomRuleGroupProps' },
  { className: 'RateBasedRule', typeValue: 'rate-based-rule', propsType: 'RateBasedStatementProps' },

  // SQS Queue Integrations
  {
    className: 'SqsQueueEventBusIntegration',
    typeValue: 'event-bus',
    propsType: 'SqsQueueEventBusIntegrationProps'
  },

  // Multi Container Workload Integrations
  {
    className: 'MultiContainerWorkloadHttpApiIntegration',
    typeValue: 'http-api-gateway',
    propsType: 'ContainerWorkloadHttpApiIntegrationProps'
  },
  {
    className: 'MultiContainerWorkloadLoadBalancerIntegration',
    typeValue: 'application-load-balancer',
    propsType: 'ContainerWorkloadLoadBalancerIntegrationProps'
  },
  {
    className: 'MultiContainerWorkloadNetworkLoadBalancerIntegration',
    typeValue: 'network-load-balancer',
    propsType: 'ContainerWorkloadNetworkLoadBalancerIntegrationProps'
  },
  {
    className: 'MultiContainerWorkloadInternalIntegration',
    typeValue: 'workload-internal',
    propsType: 'ContainerWorkloadInternalIntegrationProps'
  },
  {
    className: 'MultiContainerWorkloadServiceConnectIntegration',
    typeValue: 'service-connect',
    propsType: 'ContainerWorkloadServiceConnectIntegrationProps'
  },

  // Scripts
  { className: 'LocalScriptWithCommand', typeValue: 'local-script', propsType: 'LocalScriptProps' },
  { className: 'LocalScriptWithCommands', typeValue: 'local-script', propsType: 'LocalScriptProps' },
  { className: 'LocalScriptWithFileScript', typeValue: 'local-script', propsType: 'LocalScriptProps' },
  { className: 'LocalScriptWithFileScripts', typeValue: 'local-script', propsType: 'LocalScriptProps' },
  { className: 'BastionScriptWithCommand', typeValue: 'bastion-script', propsType: 'BastionScriptProps' },
  { className: 'BastionScriptWithCommands', typeValue: 'bastion-script', propsType: 'BastionScriptProps' },
  {
    className: 'LocalScriptWithBastionTunnelingCommand',
    typeValue: 'local-script-with-bastion-tunneling',
    propsType: 'LocalScriptWithBastionTunnelingProps'
  },
  {
    className: 'LocalScriptWithBastionTunnelingCommands',
    typeValue: 'local-script-with-bastion-tunneling',
    propsType: 'LocalScriptWithBastionTunnelingProps'
  },
  {
    className: 'LocalScriptWithBastionTunnelingFileScript',
    typeValue: 'local-script-with-bastion-tunneling',
    propsType: 'LocalScriptWithBastionTunnelingProps'
  },
  {
    className: 'LocalScriptWithBastionTunnelingFileScripts',
    typeValue: 'local-script-with-bastion-tunneling',
    propsType: 'LocalScriptWithBastionTunnelingProps'
  },

  // Log Forwarding
  {
    className: 'HttpEndpointLogForwarding',
    typeValue: 'http-endpoint',
    propsType: 'HttpEndpointLogForwardingProps'
  },
  { className: 'HighlightLogForwarding', typeValue: 'highlight', propsType: 'HighlightLogForwardingProps' },
  { className: 'DatadogLogForwarding', typeValue: 'datadog', propsType: 'DatadogLogForwardingProps' },

  // Bucket Lifecycle Rules
  { className: 'ExpirationLifecycleRule', typeValue: 'expiration', propsType: 'ExpirationProps' },
  {
    className: 'NonCurrentVersionExpirationLifecycleRule',
    typeValue: 'non-current-version-expiration',
    propsType: 'NonCurrentVersionExpirationProps'
  },

  // EFS Mounts
  { className: 'ContainerEfsMount', typeValue: 'efs', propsType: 'ContainerEfsMountProps' },
  { className: 'LambdaEfsMount', typeValue: 'efs', propsType: 'LambdaEfsMountProps' }
];

/**
 * Referenceable parameters for each resource type.
 * These are runtime-accessible properties that can be referenced using $ResourceParam directive.
 */
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
  'multi-container-workload': [{ name: 'logGroupArn', description: 'Log group ARN' }]
};

// Helper functions
export function getResourceByClassName(className: string): ResourceDefinition | undefined {
  return RESOURCES.find((r) => r.className === className);
}

export function getResourceByType(resourceType: string): ResourceDefinition | undefined {
  return RESOURCES.find((r) => r.resourceType === resourceType);
}

export function getResourcesWithAugmentedProps(): ResourceDefinition[] {
  return RESOURCES.filter((r) => r.hasAugmentedProps);
}

export function getResourcesWithOverrides(): ResourceDefinition[] {
  return RESOURCES.filter((r) => r.supportsOverrides !== false);
}
