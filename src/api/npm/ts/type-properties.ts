import { BaseTypeProperties } from './config';

/**
 * Factory function to create a type/properties class
 */
function createTypePropertiesClass(className: string, typeValue: string): any {
  const TypePropertiesClass = class extends BaseTypeProperties {
    constructor(properties: any) {
      super(typeValue, properties);
    }
  };

  Object.defineProperty(TypePropertiesClass, 'name', { value: className });
  return TypePropertiesClass;
}

// ==================== DATABASE ENGINES ====================

export const RdsEnginePostgres = createTypePropertiesClass('RdsEnginePostgres', 'postgres');
export const RdsEngineMariadb = createTypePropertiesClass('RdsEngineMariadb', 'mariadb');
export const RdsEngineMysql = createTypePropertiesClass('RdsEngineMysql', 'mysql');
export const RdsEngineOracleEE = createTypePropertiesClass('RdsEngineOracleEE', 'oracle-ee');
export const RdsEngineOracleSE2 = createTypePropertiesClass('RdsEngineOracleSE2', 'oracle-se2');
export const RdsEngineSqlServerEE = createTypePropertiesClass('RdsEngineSqlServerEE', 'sqlserver-ee');
export const RdsEngineSqlServerEX = createTypePropertiesClass('RdsEngineSqlServerEX', 'sqlserver-ex');
export const RdsEngineSqlServerSE = createTypePropertiesClass('RdsEngineSqlServerSE', 'sqlserver-se');
export const RdsEngineSqlServerWeb = createTypePropertiesClass('RdsEngineSqlServerWeb', 'sqlserver-web');
export const AuroraEnginePostgresql = createTypePropertiesClass('AuroraEnginePostgresql', 'aurora-postgresql');
export const AuroraEngineMysql = createTypePropertiesClass('AuroraEngineMysql', 'aurora-mysql');
export const AuroraServerlessEnginePostgresql = createTypePropertiesClass(
  'AuroraServerlessEnginePostgresql',
  'aurora-postgresql-serverless'
);
export const AuroraServerlessEngineMysql = createTypePropertiesClass(
  'AuroraServerlessEngineMysql',
  'aurora-mysql-serverless'
);
export const AuroraServerlessV2EnginePostgresql = createTypePropertiesClass(
  'AuroraServerlessV2EnginePostgresql',
  'aurora-postgresql-serverless-v2'
);
export const AuroraServerlessV2EngineMysql = createTypePropertiesClass(
  'AuroraServerlessV2EngineMysql',
  'aurora-mysql-serverless-v2'
);

// ==================== LAMBDA PACKAGING ====================

export const StacktapeLambdaBuildpackPackaging = createTypePropertiesClass(
  'StacktapeLambdaBuildpackPackaging',
  'stacktape-lambda-buildpack'
);
export const CustomArtifactLambdaPackaging = createTypePropertiesClass(
  'CustomArtifactLambdaPackaging',
  'custom-artifact'
);

// ==================== CONTAINER PACKAGING ====================

export const PrebuiltImagePackaging = createTypePropertiesClass('PrebuiltImagePackaging', 'prebuilt-image');
export const CustomDockerfilePackaging = createTypePropertiesClass('CustomDockerfilePackaging', 'custom-dockerfile');
export const ExternalBuildpackPackaging = createTypePropertiesClass('ExternalBuildpackPackaging', 'external-buildpack');
export const NixpacksPackaging = createTypePropertiesClass('NixpacksPackaging', 'nixpacks');
export const StacktapeImageBuildpackPackaging = createTypePropertiesClass(
  'StacktapeImageBuildpackPackaging',
  'stacktape-image-buildpack'
);

// ==================== LAMBDA FUNCTION EVENTS/INTEGRATIONS ====================

export const HttpApiIntegration = createTypePropertiesClass('HttpApiIntegration', 'http-api-gateway');
export const S3Integration = createTypePropertiesClass('S3Integration', 's3');
export const ScheduleIntegration = createTypePropertiesClass('ScheduleIntegration', 'schedule');
export const SnsIntegration = createTypePropertiesClass('SnsIntegration', 'sns');
export const SqsIntegration = createTypePropertiesClass('SqsIntegration', 'sqs');
export const KinesisIntegration = createTypePropertiesClass('KinesisIntegration', 'kinesis');
export const DynamoDbIntegration = createTypePropertiesClass('DynamoDbIntegration', 'dynamodb');
export const CloudwatchLogIntegration = createTypePropertiesClass('CloudwatchLogIntegration', 'cloudwatch-logs');
export const ApplicationLoadBalancerIntegration = createTypePropertiesClass(
  'ApplicationLoadBalancerIntegration',
  'application-load-balancer'
);
export const EventBusIntegration = createTypePropertiesClass('EventBusIntegration', 'event-bus');
export const KafkaTopicIntegration = createTypePropertiesClass('KafkaTopicIntegration', 'kafka-topic');
export const AlarmIntegration = createTypePropertiesClass('AlarmIntegration', 'alarm');

// ==================== CDN ROUTES ====================

export const CdnLoadBalancerRoute = createTypePropertiesClass('CdnLoadBalancerRoute', 'application-load-balancer');
export const CdnHttpApiGatewayRoute = createTypePropertiesClass('CdnHttpApiGatewayRoute', 'http-api-gateway');
export const CdnLambdaFunctionRoute = createTypePropertiesClass('CdnLambdaFunctionRoute', 'function');
export const CdnCustomDomainRoute = createTypePropertiesClass('CdnCustomDomainRoute', 'custom-origin');
export const CdnBucketRoute = createTypePropertiesClass('CdnBucketRoute', 'bucket');

// ==================== WEB APP FIREWALL RULES ====================

export const ManagedRuleGroup = createTypePropertiesClass('ManagedRuleGroup', 'managed-rule-group');
export const CustomRuleGroup = createTypePropertiesClass('CustomRuleGroup', 'custom-rule-group');
export const RateBasedRule = createTypePropertiesClass('RateBasedRule', 'rate-based-rule');

// ==================== SQS QUEUE INTEGRATIONS ====================

export const SqsQueueEventBusIntegration = createTypePropertiesClass('SqsQueueEventBusIntegration', 'event-bus');

// ==================== MULTI CONTAINER WORKLOAD INTEGRATIONS ====================

export const MultiContainerWorkloadHttpApiIntegration = createTypePropertiesClass(
  'MultiContainerWorkloadHttpApiIntegration',
  'http-api-gateway'
);
export const MultiContainerWorkloadLoadBalancerIntegration = createTypePropertiesClass(
  'MultiContainerWorkloadLoadBalancerIntegration',
  'application-load-balancer'
);
export const MultiContainerWorkloadNetworkLoadBalancerIntegration = createTypePropertiesClass(
  'MultiContainerWorkloadNetworkLoadBalancerIntegration',
  'network-load-balancer'
);
export const MultiContainerWorkloadInternalIntegration = createTypePropertiesClass(
  'MultiContainerWorkloadInternalIntegration',
  'workload-internal'
);
export const MultiContainerWorkloadServiceConnectIntegration = createTypePropertiesClass(
  'MultiContainerWorkloadServiceConnectIntegration',
  'service-connect'
);

// ==================== SCRIPTS ====================

export const LocalScriptWithCommand = createTypePropertiesClass('LocalScriptWithCommand', 'local-script');
export const LocalScriptWithCommands = createTypePropertiesClass('LocalScriptWithCommands', 'local-script');
export const LocalScriptWithFileScript = createTypePropertiesClass('LocalScriptWithFileScript', 'local-script');
export const LocalScriptWithFileScripts = createTypePropertiesClass('LocalScriptWithFileScripts', 'local-script');
export const BastionScriptWithCommand = createTypePropertiesClass('BastionScriptWithCommand', 'bastion-script');
export const BastionScriptWithCommands = createTypePropertiesClass('BastionScriptWithCommands', 'bastion-script');
export const LocalScriptWithBastionTunnelingCommand = createTypePropertiesClass(
  'LocalScriptWithBastionTunnelingCommand',
  'local-script-with-bastion-tunneling'
);
export const LocalScriptWithBastionTunnelingCommands = createTypePropertiesClass(
  'LocalScriptWithBastionTunnelingCommands',
  'local-script-with-bastion-tunneling'
);
export const LocalScriptWithBastionTunnelingFileScript = createTypePropertiesClass(
  'LocalScriptWithBastionTunnelingFileScript',
  'local-script-with-bastion-tunneling'
);
export const LocalScriptWithBastionTunnelingFileScripts = createTypePropertiesClass(
  'LocalScriptWithBastionTunnelingFileScripts',
  'local-script-with-bastion-tunneling'
);

// ==================== LOG FORWARDING ====================

export const HttpEndpointLogForwarding = createTypePropertiesClass('HttpEndpointLogForwarding', 'http-endpoint');
export const HighlightLogForwarding = createTypePropertiesClass('HighlightLogForwarding', 'highlight');
export const DatadogLogForwarding = createTypePropertiesClass('DatadogLogForwarding', 'datadog');

// ==================== BUCKET LIFECYCLE RULES ====================

export const ExpirationLifecycleRule = createTypePropertiesClass('ExpirationLifecycleRule', 'expiration');
export const NonCurrentVersionExpirationLifecycleRule = createTypePropertiesClass(
  'NonCurrentVersionExpirationLifecycleRule',
  'non-current-version-expiration'
);

// ==================== EFS MOUNTS ====================

export const ContainerEfsMount = createTypePropertiesClass('ContainerEfsMount', 'efs');
export const LambdaEfsMount = createTypePropertiesClass('LambdaEfsMount', 'efs');
