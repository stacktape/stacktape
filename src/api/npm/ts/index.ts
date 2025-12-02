// Export base classes and utilities
export {
  BaseResource,
  BaseTypeProperties,
  defineConfig,
  type GetConfigParams,
  ResourceParamReference,
  transformConfigWithResources,
  transformValue
} from './config';

// Export directives
export { $CfFormat, $CfResourceParam, $CfStackOutput, $GitInfo, $ResourceParam, $Secret } from './directives';

// Export AWS service constants
export { AWS_SES, type GlobalAwsServiceConstant } from './global-aws-services';

// Export resource metadata types
export { type ResourceTypeName } from './resource-metadata';

// Export resource classes
export {
  ApplicationLoadBalancer,
  Bastion,
  BatchJob,
  Bucket,
  DynamoDbTable,
  EfsFilesystem,
  EventBus,
  HostingBucket,
  HttpApiGateway,
  LambdaFunction,
  MongoDbAtlasCluster,
  MultiContainerWorkload,
  NetworkLoadBalancer,
  NextjsWeb,
  OpenSearchDomain,
  PrivateService,
  RedisCluster,
  RelationalDatabase,
  SnsTopic,
  SqsQueue,
  StateMachine,
  UpstashRedis,
  UserAuthPool,
  WebAppFirewall,
  WebService,
  WorkerService
} from './resources';

// Export type/properties classes
export {
  AlarmIntegration,
  ApplicationLoadBalancerIntegration,
  AuroraEngineMysql,
  AuroraEnginePostgresql,
  AuroraServerlessEngineMysql,
  AuroraServerlessEnginePostgresql,
  AuroraServerlessV2EngineMysql,
  AuroraServerlessV2EnginePostgresql,
  // Scripts - Bastion Script variants
  BastionScriptWithCommand,
  BastionScriptWithCommands,
  CdnBucketRoute,
  CdnCustomDomainRoute,
  CdnHttpApiGatewayRoute,
  CdnLambdaFunctionRoute,
  // CDN Routes
  CdnLoadBalancerRoute,
  CloudwatchLogIntegration,
  // EFS Mounts
  ContainerEfsMount,
  CustomArtifactLambdaPackaging,
  CustomDockerfilePackaging,
  CustomRuleGroup,
  DatadogLogForwarding,
  DynamoDbIntegration,
  EventBusIntegration,
  // Bucket Lifecycle Rules
  ExpirationLifecycleRule,
  ExternalBuildpackPackaging,
  HighlightLogForwarding,
  // Lambda Function Events/Integrations
  HttpApiIntegration,
  // Log Forwarding
  HttpEndpointLogForwarding,
  KafkaTopicIntegration,
  KinesisIntegration,
  LambdaEfsMount,
  // Scripts - Local Script with Bastion Tunneling variants
  LocalScriptWithBastionTunnelingCommand,
  LocalScriptWithBastionTunnelingCommands,
  LocalScriptWithBastionTunnelingFileScript,
  LocalScriptWithBastionTunnelingFileScripts,
  // Scripts - Local Script variants
  LocalScriptWithCommand,
  LocalScriptWithCommands,
  LocalScriptWithFileScript,
  LocalScriptWithFileScripts,
  // Web App Firewall Rules
  ManagedRuleGroup,
  // Multi Container Workload Integrations
  MultiContainerWorkloadHttpApiIntegration,
  MultiContainerWorkloadInternalIntegration,
  MultiContainerWorkloadLoadBalancerIntegration,
  MultiContainerWorkloadNetworkLoadBalancerIntegration,
  MultiContainerWorkloadServiceConnectIntegration,
  NixpacksPackaging,
  NonCurrentVersionExpirationLifecycleRule,
  // Container Packaging
  PrebuiltImagePackaging,
  RateBasedRule,
  RdsEngineMariadb,
  RdsEngineMysql,
  RdsEngineOracleEE,
  RdsEngineOracleSE2,
  // Database Engines
  RdsEnginePostgres,
  RdsEngineSqlServerEE,
  RdsEngineSqlServerEX,
  RdsEngineSqlServerSE,
  RdsEngineSqlServerWeb,
  S3Integration,
  ScheduleIntegration,
  SnsIntegration,
  SqsIntegration,
  // SQS Queue Integrations
  SqsQueueEventBusIntegration,
  StacktapeImageBuildpackPackaging,
  // Lambda Packaging
  StacktapeLambdaBuildpackPackaging
} from './type-properties';

// AWS service name type (for connectTo with AWS services like SES)
export type AwsServiceName = 'AWS_SES';
