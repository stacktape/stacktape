import type { ApplicationLoadBalancerCustomTriggerProps } from '@stacktape/config/alarm-metrics';
import type {
  ApplicationLoadBalancerErrorRateTriggerProps,
  ApplicationLoadBalancerUnhealthyTargetsTriggerProps,
  HttpApiGatewayErrorRateTriggerProps,
  HttpApiGatewayLatencyTriggerProps,
  LambdaDurationTriggerProps,
  LambdaErrorRateTriggerProps,
  RelationalDatabaseCPUUtilizationTriggerProps,
  RelationalDatabaseConnectionCountTriggerProps,
  RelationalDatabaseFreeMemoryTriggerProps,
  RelationalDatabaseFreeStorageTriggerProps,
  RelationalDatabaseReadLatencyTriggerProps,
  RelationalDatabaseWriteLatencyTriggerProps,
  SqsQueueReceivedMessagesCountTriggerProps
} from '@stacktape/config/alarms';
import type { ExpirationProps, NonCurrentVersionExpirationProps } from '@stacktape/config/buckets';
import type {
  CdnBucketOrigin,
  CdnCustomOrigin,
  CdnHttpApiGatewayOrigin,
  CdnLambdaFunctionOrigin,
  CdnLoadBalancerOrigin
} from '@stacktape/config/cdn';
import type {
  CustomArtifactLambdaPackagingProps,
  CustomDockerfileCwImagePackagingProps,
  ExternalBuildpackCwImagePackagingProps,
  NixpacksCwImagePackagingProps,
  PrebuiltImageCwPackagingProps,
  StpBuildpackCwImagePackagingProps,
  StpBuildpackLambdaPackagingProps
} from '@stacktape/config/deployment-artifacts';
import type {
  AlarmIntegrationProps,
  ApplicationLoadBalancerIntegrationProps,
  CloudwatchLogIntegrationProps,
  ContainerWorkloadHttpApiIntegrationProps,
  ContainerWorkloadInternalIntegrationProps,
  ContainerWorkloadLoadBalancerIntegrationProps,
  ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  ContainerWorkloadServiceConnectIntegrationProps,
  DynamoDbIntegrationProps,
  EventBusIntegrationProps,
  HttpApiIntegrationProps,
  IotIntegrationProps,
  KafkaTopicIntegrationProps,
  KinesisIntegrationProps,
  S3IntegrationProps,
  ScheduleIntegrationProps,
  SnsIntegrationProps,
  SqsIntegrationProps
} from '@stacktape/config/events';
import type { LambdaEfsMountProps, LambdaS3FilesMountProps } from '@stacktape/config/functions';
import type {
  DatadogLogForwardingProps,
  HighlightLogForwardingProps,
  HttpEndpointLogForwardingProps
} from '@stacktape/config/log-forwarding';
import type { ContainerEfsMountProps } from '@stacktape/config/multi-container-workloads';
import type {
  AuroraEngineProperties,
  AuroraServerlessEngineProperties,
  AuroraServerlessV2EngineProperties,
  RdsEngineProperties
} from '@stacktape/config/relational-databases';
import type {
  BastionScriptProps,
  LocalScriptProps,
  LocalScriptWithBastionTunnelingProps
} from '@stacktape/config/shared';
import type { SqsQueueEventBusIntegrationProps } from '@stacktape/config/sqs-queues';
import type { CognitoAuthorizerProperties, LambdaAuthorizerProperties } from '@stacktape/config/user-pools';
import type {
  CustomRuleGroupProps,
  ManagedRuleGroupProps,
  RateBasedStatementProps
} from '@stacktape/config/web-app-firewall';
import { MISC_TYPES_CONVERTIBLE_TO_CLASSES } from './class-config.js';
import {
  BaseTypeOnly,
  BaseTypeProperties,
  type WithAuthoringNamedResourceReferences,
  type WithAuthoringResourceReferences
} from './config.js';

type TypePropertyDefinition = (typeof MISC_TYPES_CONVERTIBLE_TO_CLASSES)[number];
type TypePropertyClassName = TypePropertyDefinition['className'];
type TypeOnlyClassName = Extract<TypePropertyDefinition, { readonly typeOnly: true }>['className'];
type PropertiesClassName = Exclude<TypePropertyClassName, TypeOnlyClassName>;
type DefinitionFor<Name extends TypePropertyClassName> = Extract<TypePropertyDefinition, { readonly className: Name }>;

type CompletePropertiesMap<Map extends Record<PropertiesClassName, unknown>> = Map;

type TypePropertyProperties = CompletePropertiesMap<{
  RdsEnginePostgres: RdsEngineProperties;
  RdsEngineMariadb: RdsEngineProperties;
  RdsEngineMysql: RdsEngineProperties;
  RdsEngineOracleEE: RdsEngineProperties;
  RdsEngineOracleSE2: RdsEngineProperties;
  RdsEngineSqlServerEE: RdsEngineProperties;
  RdsEngineSqlServerEX: RdsEngineProperties;
  RdsEngineSqlServerSE: RdsEngineProperties;
  RdsEngineSqlServerWeb: RdsEngineProperties;
  AuroraEnginePostgresql: AuroraEngineProperties;
  AuroraEngineMysql: AuroraEngineProperties;
  AuroraServerlessEnginePostgresql: AuroraServerlessEngineProperties;
  AuroraServerlessEngineMysql: AuroraServerlessEngineProperties;
  AuroraServerlessV2EnginePostgresql: AuroraServerlessV2EngineProperties;
  AuroraServerlessV2EngineMysql: AuroraServerlessV2EngineProperties;
  StacktapeLambdaBuildpackPackaging: StpBuildpackLambdaPackagingProps;
  CustomArtifactLambdaPackaging: CustomArtifactLambdaPackagingProps;
  PrebuiltImagePackaging: PrebuiltImageCwPackagingProps;
  CustomDockerfilePackaging: CustomDockerfileCwImagePackagingProps;
  ExternalBuildpackPackaging: ExternalBuildpackCwImagePackagingProps;
  NixpacksPackaging: NixpacksCwImagePackagingProps;
  StacktapeImageBuildpackPackaging: StpBuildpackCwImagePackagingProps;
  HttpApiIntegration: HttpApiIntegrationProps;
  S3Integration: S3IntegrationProps;
  ScheduleIntegration: ScheduleIntegrationProps;
  SnsIntegration: SnsIntegrationProps;
  SqsIntegration: SqsIntegrationProps;
  KinesisIntegration: KinesisIntegrationProps;
  DynamoDbIntegration: DynamoDbIntegrationProps;
  CloudwatchLogIntegration: CloudwatchLogIntegrationProps;
  ApplicationLoadBalancerIntegration: ApplicationLoadBalancerIntegrationProps;
  EventBusIntegration: EventBusIntegrationProps;
  KafkaTopicIntegration: KafkaTopicIntegrationProps;
  AlarmIntegration: AlarmIntegrationProps;
  IotIntegration: IotIntegrationProps;
  CdnLoadBalancerRoute: CdnLoadBalancerOrigin;
  CdnHttpApiGatewayRoute: CdnHttpApiGatewayOrigin;
  CdnLambdaFunctionRoute: CdnLambdaFunctionOrigin;
  CdnCustomDomainRoute: CdnCustomOrigin;
  CdnBucketRoute: CdnBucketOrigin;
  ManagedRuleGroup: ManagedRuleGroupProps;
  CustomRuleGroup: CustomRuleGroupProps;
  RateBasedRule: RateBasedStatementProps;
  SqsQueueEventBusIntegration: SqsQueueEventBusIntegrationProps;
  MultiContainerWorkloadHttpApiIntegration: ContainerWorkloadHttpApiIntegrationProps;
  MultiContainerWorkloadLoadBalancerIntegration: ContainerWorkloadLoadBalancerIntegrationProps;
  MultiContainerWorkloadNetworkLoadBalancerIntegration: ContainerWorkloadNetworkLoadBalancerIntegrationProps;
  MultiContainerWorkloadInternalIntegration: ContainerWorkloadInternalIntegrationProps;
  MultiContainerWorkloadServiceConnectIntegration: ContainerWorkloadServiceConnectIntegrationProps;
  LocalScript: LocalScriptProps;
  BastionScript: BastionScriptProps;
  LocalScriptWithBastionTunneling: LocalScriptWithBastionTunnelingProps;
  HttpEndpointLogForwarding: HttpEndpointLogForwardingProps;
  HighlightLogForwarding: HighlightLogForwardingProps;
  DatadogLogForwarding: DatadogLogForwardingProps;
  ExpirationLifecycleRule: ExpirationProps;
  NonCurrentVersionExpirationLifecycleRule: NonCurrentVersionExpirationProps;
  ContainerEfsMount: ContainerEfsMountProps;
  LambdaEfsMount: LambdaEfsMountProps;
  LambdaS3FilesMount: LambdaS3FilesMountProps;
  CognitoAuthorizer: CognitoAuthorizerProperties;
  LambdaAuthorizer: LambdaAuthorizerProperties;
  ApplicationLoadBalancerCustomTrigger: ApplicationLoadBalancerCustomTriggerProps;
  ApplicationLoadBalancerErrorRateTrigger: ApplicationLoadBalancerErrorRateTriggerProps;
  ApplicationLoadBalancerUnhealthyTargetsTrigger: ApplicationLoadBalancerUnhealthyTargetsTriggerProps;
  HttpApiGatewayErrorRateTrigger: HttpApiGatewayErrorRateTriggerProps;
  HttpApiGatewayLatencyTrigger: HttpApiGatewayLatencyTriggerProps;
  RelationalDatabaseReadLatencyTrigger: RelationalDatabaseReadLatencyTriggerProps;
  RelationalDatabaseWriteLatencyTrigger: RelationalDatabaseWriteLatencyTriggerProps;
  RelationalDatabaseCPUUtilizationTrigger: RelationalDatabaseCPUUtilizationTriggerProps;
  RelationalDatabaseFreeStorageTrigger: RelationalDatabaseFreeStorageTriggerProps;
  RelationalDatabaseFreeMemoryTrigger: RelationalDatabaseFreeMemoryTriggerProps;
  RelationalDatabaseConnectionCountTrigger: RelationalDatabaseConnectionCountTriggerProps;
  SqsQueueReceivedMessagesCountTrigger: SqsQueueReceivedMessagesCountTriggerProps;
  LambdaErrorRateTrigger: LambdaErrorRateTriggerProps;
  LambdaDurationTrigger: LambdaDurationTriggerProps;
}>;

type ScriptClassName = 'LocalScript' | 'BastionScript' | 'LocalScriptWithBastionTunneling';

type AuthoringProperties<Name extends PropertiesClassName> = Name extends ScriptClassName
  ? WithAuthoringResourceReferences<WithAuthoringNamedResourceReferences<TypePropertyProperties[Name]>>
  : WithAuthoringNamedResourceReferences<TypePropertyProperties[Name]>;

type TypePropertyConstructors = {
  [Name in TypePropertyClassName]: Name extends TypeOnlyClassName
    ? new () => BaseTypeOnly<DefinitionFor<Name>['typeValue']>
    : Name extends PropertiesClassName
      ? new (
          properties: AuthoringProperties<Name>
        ) => BaseTypeProperties<DefinitionFor<Name>['typeValue'], AuthoringProperties<Name>>
      : never;
};

function createTypePropertiesClass(className: string, typeValue: string, typeOnly?: boolean): unknown {
  if (typeOnly) {
    const TypeOnlyClass = class extends BaseTypeOnly {
      constructor() {
        super(typeValue);
      }
    };
    Object.defineProperty(TypeOnlyClass, 'name', { value: className });
    return TypeOnlyClass;
  }

  const TypePropertiesClass = class extends BaseTypeProperties {
    constructor(properties: unknown) {
      super(typeValue, properties);
    }
  };

  Object.defineProperty(TypePropertiesClass, 'name', { value: className });
  return TypePropertiesClass;
}

// The metadata and TypePropertyProperties are exhaustive over the same class names. This is the
// single audited cast between the runtime-generated constructors and their static constructor types.
const TYPE_PROPERTIES_CLASSES = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.map((definition) => [
    definition.className,
    createTypePropertiesClass(
      definition.className,
      definition.typeValue,
      'typeOnly' in definition ? definition.typeOnly : false
    )
  ])
) as TypePropertyConstructors;

// Explicit named exports keep the public module API discoverable and tree-shakeable.
export const {
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
  StacktapeLambdaBuildpackPackaging,
  CustomArtifactLambdaPackaging,
  PrebuiltImagePackaging,
  CustomDockerfilePackaging,
  ExternalBuildpackPackaging,
  NixpacksPackaging,
  StacktapeImageBuildpackPackaging,
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
  CdnLoadBalancerRoute,
  CdnHttpApiGatewayRoute,
  CdnLambdaFunctionRoute,
  CdnCustomDomainRoute,
  CdnBucketRoute,
  ManagedRuleGroup,
  CustomRuleGroup,
  RateBasedRule,
  SqsQueueEventBusIntegration,
  MultiContainerWorkloadHttpApiIntegration,
  MultiContainerWorkloadLoadBalancerIntegration,
  MultiContainerWorkloadNetworkLoadBalancerIntegration,
  MultiContainerWorkloadInternalIntegration,
  MultiContainerWorkloadServiceConnectIntegration,
  LocalScript,
  BastionScript,
  LocalScriptWithBastionTunneling,
  HttpEndpointLogForwarding,
  HighlightLogForwarding,
  DatadogLogForwarding,
  ExpirationLifecycleRule,
  NonCurrentVersionExpirationLifecycleRule,
  ContainerEfsMount,
  LambdaEfsMount,
  LambdaS3FilesMount,
  CognitoAuthorizer,
  LambdaAuthorizer,
  ApplicationLoadBalancerCustomTrigger,
  ApplicationLoadBalancerErrorRateTrigger,
  ApplicationLoadBalancerUnhealthyTargetsTrigger,
  HttpApiGatewayErrorRateTrigger,
  HttpApiGatewayLatencyTrigger,
  RelationalDatabaseReadLatencyTrigger,
  RelationalDatabaseWriteLatencyTrigger,
  RelationalDatabaseCPUUtilizationTrigger,
  RelationalDatabaseFreeStorageTrigger,
  RelationalDatabaseFreeMemoryTrigger,
  RelationalDatabaseConnectionCountTrigger,
  SqsQueueReceivedMessagesCountTrigger,
  SqsQueueNotEmptyTrigger,
  LambdaErrorRateTrigger,
  LambdaDurationTrigger
} = TYPE_PROPERTIES_CLASSES;
