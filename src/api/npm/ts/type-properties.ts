import { MISC_TYPES_CONVERTIBLE_TO_CLASSES } from './class-config';
import { BaseTypeProperties } from './config';

function createTypePropertiesClass(className: string, typeValue: string): any {
  const TypePropertiesClass = class extends BaseTypeProperties {
    constructor(properties: any) {
      super(typeValue, properties);
    }
  };

  Object.defineProperty(TypePropertiesClass, 'name', { value: className });
  return TypePropertiesClass;
}

// Create all type-properties classes from config
const TYPE_PROPERTIES_CLASSES: Record<string, ReturnType<typeof createTypePropertiesClass>> = {};
for (const def of MISC_TYPES_CONVERTIBLE_TO_CLASSES) {
  TYPE_PROPERTIES_CLASSES[def.className] = createTypePropertiesClass(def.className, def.typeValue);
}

// Export all classes for named imports (TypeScript needs these explicit exports)
export const {
  // Database Engines
  RdsEnginePostgres,
  RdsEngineMariadb,
  RdsEngineMysql,
  RdsEngineOracleEE,
  RdsEngineOracleSE2,
  RdsEngineSqlServerEE,
  RdsEngineSqlServerEX,
  RdsEngineSqlServerSE,
  RdsEngineSqlServerWeb,
  AuroraEnginePostgresql,
  AuroraEngineMysql,
  AuroraServerlessEnginePostgresql,
  AuroraServerlessEngineMysql,
  AuroraServerlessV2EnginePostgresql,
  AuroraServerlessV2EngineMysql,
  // Lambda Packaging
  StacktapeLambdaBuildpackPackaging,
  CustomArtifactLambdaPackaging,
  // Container Packaging
  PrebuiltImagePackaging,
  CustomDockerfilePackaging,
  ExternalBuildpackPackaging,
  NixpacksPackaging,
  StacktapeImageBuildpackPackaging,
  // Lambda Function Events/Integrations
  HttpApiIntegration,
  S3Integration,
  ScheduleIntegration,
  SnsIntegration,
  SqsIntegration,
  KinesisIntegration,
  DynamoDbIntegration,
  CloudwatchLogIntegration,
  ApplicationLoadBalancerIntegration,
  EventBusIntegration,
  KafkaTopicIntegration,
  AlarmIntegration,
  IotIntegration,
  // CDN Routes
  CdnLoadBalancerRoute,
  CdnHttpApiGatewayRoute,
  CdnLambdaFunctionRoute,
  CdnCustomDomainRoute,
  CdnBucketRoute,
  // Web App Firewall Rules
  ManagedRuleGroup,
  CustomRuleGroup,
  RateBasedRule,
  // SQS Queue Integrations
  SqsQueueEventBusIntegration,
  // Multi Container Workload Integrations
  MultiContainerWorkloadHttpApiIntegration,
  MultiContainerWorkloadLoadBalancerIntegration,
  MultiContainerWorkloadNetworkLoadBalancerIntegration,
  MultiContainerWorkloadInternalIntegration,
  MultiContainerWorkloadServiceConnectIntegration,
  // Scripts
  LocalScript,
  BastionScript,
  LocalScriptWithBastionTunneling,
  // Log Forwarding
  HttpEndpointLogForwarding,
  HighlightLogForwarding,
  DatadogLogForwarding,
  // Bucket Lifecycle Rules
  ExpirationLifecycleRule,
  NonCurrentVersionExpirationLifecycleRule,
  // EFS Mounts
  ContainerEfsMount,
  LambdaEfsMount,
  // Authorizers
  CognitoAuthorizer,
  LambdaAuthorizer,
  // Custom Resources
  CustomResourceDefinition,
  CustomResourceInstance,
  // Deployment Scripts
  DeploymentScript,
  // Edge Lambda Functions
  EdgeLambdaFunction
} = TYPE_PROPERTIES_CLASSES;
