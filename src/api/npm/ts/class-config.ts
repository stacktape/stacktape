/**
 * This file defines type-properties shaped definitions (e.g. Stacktape resources, packaging types etc.)
 * that can be converted to a Typescript class. These classes are then exported from stacktape/classes
 *
 * @example import { StacktapeLambdaBuildpackPackaging } from 'stacktape/classes';
 */

export type ResourceClassName = Omit<KebabToPascalCase<StpResourceType>, 'Function'> | 'LambdaFunction';

export type ResourceDefinition = {
  /** Class name for the resource (e.g., 'LambdaFunction') */
  className: ResourceClassName;
  /** Resource type identifier used in config (e.g., 'function') */
  resourceType: string;
  /** Props type name (e.g., 'LambdaFunctionProps') */
  propsType: string;
  /** Interface name in the source .d.ts file (e.g., 'LambdaFunction') */
  interfaceName: string;
  /** Source .d.ts file name (e.g., 'functions.d.ts') */
  sourceFile: string;
  /** Resources and AWS services this resource can connect to. GlobalAwsServiceConstant is for global services, e.g. aws:ses  */
  canConnectTo?: string[];
  /** Whether this resource supports overrides (default: true) */
  supportsOverrides?: boolean;
  /** Whether this resource has augmented connectTo/environment props (default: false) */
  hasAugmentedProps?: boolean;
};

/**
 * Complete list of all Stacktape resources.
 * This is the single source of truth - all code generation derives from this.
 */
export const RESOURCES_CONVERTIBLE_TO_CLASSES: ResourceDefinition[] = [
  {
    className: 'RelationalDatabase',
    resourceType: 'relational-database',
    propsType: 'RelationalDatabaseProps',
    interfaceName: 'RelationalDatabase',
    sourceFile: 'relational-databases.d.ts',
    canConnectTo: []
  },
  {
    className: 'WebService',
    resourceType: 'web-service',
    propsType: 'WebServiceProps',
    interfaceName: 'WebService',
    sourceFile: 'web-services.d.ts',
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
    interfaceName: 'PrivateService',
    sourceFile: 'private-services.d.ts',
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
    interfaceName: 'WorkerService',
    sourceFile: 'worker-services.d.ts',
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
    interfaceName: 'MultiContainerWorkload',
    sourceFile: 'multi-container-workloads.d.ts',
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
    interfaceName: 'LambdaFunction',
    sourceFile: 'functions.d.ts',
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
    interfaceName: 'BatchJob',
    sourceFile: 'batch-jobs.d.ts',
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
    interfaceName: 'Bucket',
    sourceFile: 'buckets.d.ts',
    canConnectTo: []
  },
  {
    className: 'HostingBucket',
    resourceType: 'hosting-bucket',
    propsType: 'HostingBucketProps',
    interfaceName: 'HostingBucket',
    sourceFile: 'hosting-buckets.d.ts',
    canConnectTo: []
  },
  {
    className: 'DynamoDbTable',
    resourceType: 'dynamo-db-table',
    propsType: 'DynamoDbTableProps',
    interfaceName: 'DynamoDbTable',
    sourceFile: 'dynamo-db-tables.d.ts',
    canConnectTo: []
  },
  {
    className: 'EventBus',
    resourceType: 'event-bus',
    propsType: 'EventBusProps',
    interfaceName: 'EventBus',
    sourceFile: 'event-buses.d.ts',
    canConnectTo: []
  },
  {
    className: 'HttpApiGateway',
    resourceType: 'http-api-gateway',
    propsType: 'HttpApiGatewayProps',
    interfaceName: 'HttpApiGateway',
    sourceFile: 'http-api-gateways.d.ts',
    canConnectTo: []
  },
  {
    className: 'ApplicationLoadBalancer',
    resourceType: 'application-load-balancer',
    propsType: 'ApplicationLoadBalancerProps',
    interfaceName: 'ApplicationLoadBalancer',
    sourceFile: 'application-load-balancers.d.ts',
    canConnectTo: []
  },
  {
    className: 'NetworkLoadBalancer',
    resourceType: 'network-load-balancer',
    propsType: 'NetworkLoadBalancerProps',
    interfaceName: 'NetworkLoadBalancer',
    sourceFile: 'network-load-balancer.d.ts',
    canConnectTo: []
  },
  {
    className: 'RedisCluster',
    resourceType: 'redis-cluster',
    propsType: 'RedisClusterProps',
    interfaceName: 'RedisCluster',
    sourceFile: 'redis-cluster.d.ts',
    canConnectTo: []
  },
  {
    className: 'MongoDbAtlasCluster',
    resourceType: 'mongo-db-atlas-cluster',
    propsType: 'MongoDbAtlasClusterProps',
    interfaceName: 'MongoDbAtlasCluster',
    sourceFile: 'mongo-db-atlas-clusters.d.ts',
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: 'StateMachine',
    resourceType: 'state-machine',
    propsType: 'StateMachineProps',
    interfaceName: 'StateMachine',
    sourceFile: 'state-machines.d.ts',
    hasAugmentedProps: true,
    canConnectTo: ['Function', 'BatchJob']
  },
  {
    className: 'UserAuthPool',
    resourceType: 'user-auth-pool',
    propsType: 'UserAuthPoolProps',
    interfaceName: 'UserAuthPool',
    sourceFile: 'user-pools.d.ts',
    canConnectTo: []
  },
  {
    className: 'UpstashRedis',
    resourceType: 'upstash-redis',
    propsType: 'UpstashRedisProps',
    interfaceName: 'UpstashRedis',
    sourceFile: 'upstash-redis.d.ts',
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: 'SqsQueue',
    resourceType: 'sqs-queue',
    propsType: 'SqsQueueProps',
    interfaceName: 'SqsQueue',
    sourceFile: 'sqs-queues.d.ts',
    canConnectTo: []
  },
  {
    className: 'SnsTopic',
    resourceType: 'sns-topic',
    propsType: 'SnsTopicProps',
    interfaceName: 'SnsTopic',
    sourceFile: 'sns-topic.d.ts',
    canConnectTo: []
  },
  {
    className: 'WebAppFirewall',
    resourceType: 'web-app-firewall',
    propsType: 'WebAppFirewallProps',
    interfaceName: 'WebAppFirewall',
    sourceFile: 'web-app-firewall.d.ts',
    canConnectTo: []
  },
  {
    className: 'OpenSearchDomain',
    resourceType: 'open-search-domain',
    propsType: 'OpenSearchDomainProps',
    interfaceName: 'OpenSearchDomain',
    sourceFile: 'open-search.d.ts',
    canConnectTo: []
  },
  {
    className: 'EfsFilesystem',
    resourceType: 'efs-filesystem',
    propsType: 'EfsFilesystemProps',
    interfaceName: 'EfsFilesystem',
    sourceFile: 'efs-filesystem.d.ts',
    canConnectTo: []
  },
  {
    className: 'NextjsWeb',
    resourceType: 'nextjs-web',
    propsType: 'NextjsWebProps',
    interfaceName: 'NextjsWeb',
    sourceFile: 'nextjs-web.d.ts',
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
      'WebService',
      'LambdaFunction',
      'BatchJob',
      'UserAuthPool'
    ]
  },
  {
    className: 'Bastion',
    resourceType: 'bastion',
    propsType: 'BastionProps',
    interfaceName: 'Bastion',
    sourceFile: 'bastion.d.ts',
    canConnectTo: []
  }
];

/**
 * Defines all type + properties shaped definitions that can be converted to a Typescript class
 */
export type TypePropertiesDefinition = {
  className: string;
  typeValue: string;
  propsType: string;
  interfaceName: string;
  sourceFile: string;
};

export const MISC_TYPES_CONVERTIBLE_TO_CLASSES: TypePropertiesDefinition[] = [
  // Database Engines
  {
    className: 'RdsEnginePostgres',
    typeValue: 'postgres',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineMariadb',
    typeValue: 'mariadb',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineMysql',
    typeValue: 'mysql',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineOracleEE',
    typeValue: 'oracle-ee',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineOracleSE2',
    typeValue: 'oracle-se2',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineSqlServerEE',
    typeValue: 'sqlserver-ee',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineSqlServerEX',
    typeValue: 'sqlserver-ex',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineSqlServerSE',
    typeValue: 'sqlserver-se',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'RdsEngineSqlServerWeb',
    typeValue: 'sqlserver-web',
    propsType: 'RdsEngineProperties',
    interfaceName: 'RdsEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraEnginePostgresql',
    typeValue: 'aurora-postgresql',
    propsType: 'AuroraEngineProperties',
    interfaceName: 'AuroraEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraEngineMysql',
    typeValue: 'aurora-mysql',
    propsType: 'AuroraEngineProperties',
    interfaceName: 'AuroraEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraServerlessEnginePostgresql',
    typeValue: 'aurora-postgresql-serverless',
    propsType: 'AuroraServerlessEngineProperties',
    interfaceName: 'AuroraServerlessEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraServerlessEngineMysql',
    typeValue: 'aurora-mysql-serverless',
    propsType: 'AuroraServerlessEngineProperties',
    interfaceName: 'AuroraServerlessEngine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraServerlessV2EnginePostgresql',
    typeValue: 'aurora-postgresql-serverless-v2',
    propsType: 'AuroraServerlessV2EngineProperties',
    interfaceName: 'AuroraServerlessV2Engine',
    sourceFile: 'relational-databases.d.ts'
  },
  {
    className: 'AuroraServerlessV2EngineMysql',
    typeValue: 'aurora-mysql-serverless-v2',
    propsType: 'AuroraServerlessV2EngineProperties',
    interfaceName: 'AuroraServerlessV2Engine',
    sourceFile: 'relational-databases.d.ts'
  },
  // Lambda Packaging
  {
    className: 'StacktapeLambdaBuildpackPackaging',
    typeValue: 'stacktape-lambda-buildpack',
    propsType: 'StpBuildpackLambdaPackagingProps',
    interfaceName: 'StpBuildpackLambdaPackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  {
    className: 'CustomArtifactLambdaPackaging',
    typeValue: 'custom-artifact',
    propsType: 'CustomArtifactLambdaPackagingProps',
    interfaceName: 'CustomArtifactLambdaPackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  // Container Packaging
  {
    className: 'PrebuiltImagePackaging',
    typeValue: 'prebuilt-image',
    propsType: 'PrebuiltImageCwPackagingProps',
    interfaceName: 'PrebuiltCwImagePackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  {
    className: 'CustomDockerfilePackaging',
    typeValue: 'custom-dockerfile',
    propsType: 'CustomDockerfileCwImagePackagingProps',
    interfaceName: 'CustomDockerfileCwImagePackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  {
    className: 'ExternalBuildpackPackaging',
    typeValue: 'external-buildpack',
    propsType: 'ExternalBuildpackCwImagePackagingProps',
    interfaceName: 'ExternalBuildpackCwImagePackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  {
    className: 'NixpacksPackaging',
    typeValue: 'nixpacks',
    propsType: 'NixpacksCwImagePackagingProps',
    interfaceName: 'NixpacksCwImagePackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  {
    className: 'StacktapeImageBuildpackPackaging',
    typeValue: 'stacktape-image-buildpack',
    propsType: 'StpBuildpackCwImagePackagingProps',
    interfaceName: 'StpBuildpackCwImagePackaging',
    sourceFile: 'deployment-artifacts.d.ts'
  },
  // Lambda Function Events/Integrations
  {
    className: 'HttpApiIntegration',
    typeValue: 'http-api-gateway',
    propsType: 'HttpApiIntegrationProps',
    interfaceName: 'HttpApiIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'S3Integration',
    typeValue: 's3',
    propsType: 'S3IntegrationProps',
    interfaceName: 'S3Integration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'ScheduleIntegration',
    typeValue: 'schedule',
    propsType: 'ScheduleIntegrationProps',
    interfaceName: 'ScheduleIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'SnsIntegration',
    typeValue: 'sns',
    propsType: 'SnsIntegrationProps',
    interfaceName: 'SnsIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'SqsIntegration',
    typeValue: 'sqs',
    propsType: 'SqsIntegrationProps',
    interfaceName: 'SqsIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'KinesisIntegration',
    typeValue: 'kinesis',
    propsType: 'KinesisIntegrationProps',
    interfaceName: 'KinesisIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'DynamoDbIntegration',
    typeValue: 'dynamodb',
    propsType: 'DynamoDbIntegrationProps',
    interfaceName: 'DynamoDbIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'CloudwatchLogIntegration',
    typeValue: 'cloudwatch-logs',
    propsType: 'CloudwatchLogIntegrationProps',
    interfaceName: 'CloudwatchLogIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'ApplicationLoadBalancerIntegration',
    typeValue: 'application-load-balancer',
    propsType: 'ApplicationLoadBalancerIntegrationProps',
    interfaceName: 'ApplicationLoadBalancerIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'EventBusIntegration',
    typeValue: 'event-bus',
    propsType: 'EventBusIntegrationProps',
    interfaceName: 'EventBusIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'KafkaTopicIntegration',
    typeValue: 'kafka-topic',
    propsType: 'KafkaTopicIntegrationProps',
    interfaceName: 'KafkaTopicIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'AlarmIntegration',
    typeValue: 'alarm',
    propsType: 'AlarmIntegrationProps',
    interfaceName: 'AlarmIntegration',
    sourceFile: 'events.d.ts'
  },
  {
    className: 'IotIntegration',
    typeValue: 'iot',
    propsType: 'IotIntegrationProps',
    interfaceName: 'IotIntegration',
    sourceFile: 'events.d.ts'
  },
  // CDN Routes
  {
    className: 'CdnLoadBalancerRoute',
    typeValue: 'application-load-balancer',
    propsType: 'CdnLoadBalancerOrigin',
    interfaceName: 'CdnLoadBalancerOrigin',
    sourceFile: 'cdn.d.ts'
  },
  {
    className: 'CdnHttpApiGatewayRoute',
    typeValue: 'http-api-gateway',
    propsType: 'CdnHttpApiGatewayOrigin',
    interfaceName: 'CdnHttpApiGatewayOrigin',
    sourceFile: 'cdn.d.ts'
  },
  {
    className: 'CdnLambdaFunctionRoute',
    typeValue: 'function',
    propsType: 'CdnLambdaFunctionOrigin',
    interfaceName: 'CdnLambdaFunctionOrigin',
    sourceFile: 'cdn.d.ts'
  },
  {
    className: 'CdnCustomDomainRoute',
    typeValue: 'custom-origin',
    propsType: 'CdnCustomOrigin',
    interfaceName: 'CdnCustomOrigin',
    sourceFile: 'cdn.d.ts'
  },
  {
    className: 'CdnBucketRoute',
    typeValue: 'bucket',
    propsType: 'CdnBucketOrigin',
    interfaceName: 'CdnBucketOrigin',
    sourceFile: 'cdn.d.ts'
  },
  // Web App Firewall Rules
  {
    className: 'ManagedRuleGroup',
    typeValue: 'managed-rule-group',
    propsType: 'ManagedRuleGroupProps',
    interfaceName: 'ManagedRuleGroup',
    sourceFile: 'web-app-firewall.d.ts'
  },
  {
    className: 'CustomRuleGroup',
    typeValue: 'custom-rule-group',
    propsType: 'CustomRuleGroupProps',
    interfaceName: 'CustomRuleGroup',
    sourceFile: 'web-app-firewall.d.ts'
  },
  {
    className: 'RateBasedRule',
    typeValue: 'rate-based-rule',
    propsType: 'RateBasedStatementProps',
    interfaceName: 'RateBasedRule',
    sourceFile: 'web-app-firewall.d.ts'
  },
  // SQS Queue Integrations
  {
    className: 'SqsQueueEventBusIntegration',
    typeValue: 'event-bus',
    propsType: 'SqsQueueEventBusIntegrationProps',
    interfaceName: 'SqsQueueEventBusIntegration',
    sourceFile: 'sqs-queues.d.ts'
  },
  // Multi Container Workload Integrations
  {
    className: 'MultiContainerWorkloadHttpApiIntegration',
    typeValue: 'http-api-gateway',
    propsType: 'ContainerWorkloadHttpApiIntegrationProps',
    interfaceName: 'ContainerWorkloadHttpApiIntegration',
    sourceFile: 'multi-container-workloads.d.ts'
  },
  {
    className: 'MultiContainerWorkloadLoadBalancerIntegration',
    typeValue: 'application-load-balancer',
    propsType: 'ContainerWorkloadLoadBalancerIntegrationProps',
    interfaceName: 'ContainerWorkloadLoadBalancerIntegration',
    sourceFile: 'multi-container-workloads.d.ts'
  },
  {
    className: 'MultiContainerWorkloadNetworkLoadBalancerIntegration',
    typeValue: 'network-load-balancer',
    propsType: 'ContainerWorkloadNetworkLoadBalancerIntegrationProps',
    interfaceName: 'ContainerWorkloadNetworkLoadBalancerIntegration',
    sourceFile: 'multi-container-workloads.d.ts'
  },
  {
    className: 'MultiContainerWorkloadInternalIntegration',
    typeValue: 'workload-internal',
    propsType: 'ContainerWorkloadInternalIntegrationProps',
    interfaceName: 'ContainerWorkloadInternalIntegration',
    sourceFile: 'multi-container-workloads.d.ts'
  },
  {
    className: 'MultiContainerWorkloadServiceConnectIntegration',
    typeValue: 'service-connect',
    propsType: 'ContainerWorkloadServiceConnectIntegrationProps',
    interfaceName: 'ContainerWorkloadServiceConnectIntegration',
    sourceFile: 'multi-container-workloads.d.ts'
  },
  // Scripts
  {
    className: 'LocalScript',
    typeValue: 'local-script',
    propsType: 'LocalScriptProps',
    interfaceName: 'LocalScript',
    sourceFile: '__helpers.d.ts'
  },
  {
    className: 'BastionScript',
    typeValue: 'bastion-script',
    propsType: 'BastionScriptProps',
    interfaceName: 'BastionScript',
    sourceFile: '__helpers.d.ts'
  },
  {
    className: 'LocalScriptWithBastionTunneling',
    typeValue: 'local-script-with-bastion-tunneling',
    propsType: 'LocalScriptWithBastionTunnelingProps',
    interfaceName: 'LocalScriptWithBastionTunneling',
    sourceFile: '__helpers.d.ts'
  },
  // Log Forwarding
  {
    className: 'HttpEndpointLogForwarding',
    typeValue: 'http-endpoint',
    propsType: 'HttpEndpointLogForwardingProps',
    interfaceName: 'HttpEndpointLogForwarding',
    sourceFile: '__helpers.d.ts'
  },
  {
    className: 'HighlightLogForwarding',
    typeValue: 'highlight',
    propsType: 'HighlightLogForwardingProps',
    interfaceName: 'HighlightLogForwarding',
    sourceFile: '__helpers.d.ts'
  },
  {
    className: 'DatadogLogForwarding',
    typeValue: 'datadog',
    propsType: 'DatadogLogForwardingProps',
    interfaceName: 'DatadogLogForwarding',
    sourceFile: '__helpers.d.ts'
  },
  // Bucket Lifecycle Rules
  {
    className: 'ExpirationLifecycleRule',
    typeValue: 'expiration',
    propsType: 'ExpirationProps',
    interfaceName: 'ExpirationLifecycleRule',
    sourceFile: 'buckets.d.ts'
  },
  {
    className: 'NonCurrentVersionExpirationLifecycleRule',
    typeValue: 'non-current-version-expiration',
    propsType: 'NonCurrentVersionExpirationProps',
    interfaceName: 'NonCurrentVersionExpirationLifecycleRule',
    sourceFile: 'buckets.d.ts'
  },
  // EFS Mounts
  {
    className: 'ContainerEfsMount',
    typeValue: 'efs',
    propsType: 'ContainerEfsMountProps',
    interfaceName: 'ContainerEfsMount',
    sourceFile: '__helpers.d.ts'
  },
  {
    className: 'LambdaEfsMount',
    typeValue: 'efs',
    propsType: 'LambdaEfsMountProps',
    interfaceName: 'LambdaEfsMount',
    sourceFile: 'functions.d.ts'
  },
  // Authorizers
  {
    className: 'CognitoAuthorizer',
    typeValue: 'cognito',
    propsType: 'CognitoAuthorizerProperties',
    interfaceName: 'CognitoAuthorizer',
    sourceFile: 'user-pools.d.ts'
  },
  {
    className: 'LambdaAuthorizer',
    typeValue: 'lambda',
    propsType: 'LambdaAuthorizerProperties',
    interfaceName: 'LambdaAuthorizer',
    sourceFile: 'user-pools.d.ts'
  },
  // Custom Resources
  {
    className: 'CustomResourceDefinition',
    typeValue: 'custom-resource-definition',
    propsType: 'CustomResourceDefinitionProps',
    interfaceName: 'CustomResourceDefinition',
    sourceFile: 'custom-resources.d.ts'
  },
  {
    className: 'CustomResourceInstance',
    typeValue: 'custom-resource-instance',
    propsType: 'CustomResourceInstanceProps',
    interfaceName: 'CustomResourceInstance',
    sourceFile: 'custom-resources.d.ts'
  },
  // Deployment Scripts
  {
    className: 'DeploymentScript',
    typeValue: 'deployment-script',
    propsType: 'DeploymentScriptProps',
    interfaceName: 'DeploymentScript',
    sourceFile: 'deployment-script.d.ts'
  },
  // Edge Lambda Functions
  {
    className: 'EdgeLambdaFunction',
    typeValue: 'edge-lambda-function',
    propsType: 'EdgeLambdaFunctionProps',
    interfaceName: 'EdgeLambdaFunction',
    sourceFile: 'edge-lambda-functions.d.ts'
  }
];

// ==================== HELPER FUNCTIONS ====================

export function getResourceByClassName(className: string): ResourceDefinition | undefined {
  return RESOURCES_CONVERTIBLE_TO_CLASSES.find((r) => r.className === className);
}

export function getResourceByType(resourceType: string): ResourceDefinition | undefined {
  return RESOURCES_CONVERTIBLE_TO_CLASSES.find((r) => r.resourceType === resourceType);
}

export function getResourcesWithAugmentedProps(): ResourceDefinition[] {
  return RESOURCES_CONVERTIBLE_TO_CLASSES.filter((r) => r.hasAugmentedProps);
}

export function getResourcesWithOverrides(): ResourceDefinition[] {
  return RESOURCES_CONVERTIBLE_TO_CLASSES.filter((r) => r.supportsOverrides !== false);
}

export function getTypePropertiesByClassName(className: string): TypePropertiesDefinition | undefined {
  return MISC_TYPES_CONVERTIBLE_TO_CLASSES.find((t) => t.className === className);
}

export function getTypePropertiesByTypeValue(typeValue: string): TypePropertiesDefinition | undefined {
  return MISC_TYPES_CONVERTIBLE_TO_CLASSES.find((t) => t.typeValue === typeValue);
}

// ==================== DERIVED MAPPINGS ====================

/** Resource type → class name mapping */
export const RESOURCE_TYPE_TO_CLASS: Record<string, ResourceClassName> = Object.fromEntries(
  RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => [r.resourceType, r.className])
);

/** Script type → class name mapping */
export const SCRIPT_TYPE_TO_CLASS: Record<string, string> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter(
    (t) => t.sourceFile === '__helpers.d.ts' && t.propsType.includes('Script')
  ).map((t) => [t.typeValue, t.className])
);

/** Packaging type → class name mapping */
export const PACKAGING_TYPE_TO_CLASS: Record<string, string> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter((t) => t.sourceFile === 'deployment-artifacts.d.ts').map((t) => [
    t.typeValue,
    t.className
  ])
);

/** Engine type → class name mapping */
export const ENGINE_TYPE_TO_CLASS: Record<string, string> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter((t) => t.propsType.includes('Engine')).map((t) => [t.typeValue, t.className])
);
