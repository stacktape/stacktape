/* eslint-disable */
// Generated file - Do not edit manually
// Types export for 'stacktape/types'
// For plain configs using getConfig pattern

// ==========================================
// CLOUDFORMATION TYPE IMPORTS (for overrides/transforms)
// ==========================================

import type {
  AwsApigatewayv2Api,
  AwsApigatewayv2Apimapping,
  AwsApigatewayv2Domainname,
  AwsApigatewayv2Stage,
  AwsApigatewayv2Vpclink,
  AwsApplicationautoscalingScalabletarget,
  AwsAutoscalingAutoscalinggroup,
  AwsAutoscalingWarmpool,
  AwsBatchComputeenvironment,
  AwsBatchJobdefinition,
  AwsBatchJobqueue,
  AwsBedrockagentcoreBrowsercustom,
  AwsBedrockagentcoreCodeinterpretercustom,
  AwsBedrockagentcoreGateway,
  AwsBedrockagentcoreMemory,
  AwsBedrockagentcoreRuntime,
  AwsCloudformationCustomresource,
  AwsCloudfrontCachepolicy,
  AwsCloudfrontCloudfrontoriginaccessidentity,
  AwsCloudfrontDistribution,
  AwsCloudfrontFunction,
  AwsCloudfrontOriginrequestpolicy,
  AwsCodedeployApplication,
  AwsCodedeployDeploymentgroup,
  AwsCognitoUserpool,
  AwsCognitoUserpoolclient,
  AwsCognitoUserpooldomain,
  AwsCognitoUserpoolidentityprovider,
  AwsCognitoUserpooluicustomizationattachment,
  AwsDynamodbGlobaltable,
  AwsEc2Launchtemplate,
  AwsEc2Securitygroup,
  AwsEcsCapacityprovider,
  AwsEcsCluster,
  AwsEcsClustercapacityproviderassociations,
  AwsEcsTaskdefinition,
  AwsEfsAccesspoint,
  AwsEfsFilesystem,
  AwsElasticacheParametergroup,
  AwsElasticacheReplicationgroup,
  AwsElasticacheSubnetgroup,
  AwsElasticloadbalancingv2Listener,
  AwsElasticloadbalancingv2Loadbalancer,
  AwsEventsArchive,
  AwsEventsEventbus,
  AwsIamInstanceprofile,
  AwsIamRole,
  AwsKinesisStream,
  AwsLambdaAlias,
  AwsLambdaEventinvokeconfig,
  AwsLambdaFunction,
  AwsLambdaPermission,
  AwsLambdaUrl,
  AwsLogsLoggroup,
  AwsOpensearchserviceDomain,
  AwsRdsDbcluster,
  AwsRdsDbclusterparametergroup,
  AwsRdsDbinstance,
  AwsRdsDbparametergroup,
  AwsRdsDbsubnetgroup,
  AwsRdsOptiongroup,
  AwsRoute53Recordset,
  AwsS3Bucket,
  AwsS3Bucketpolicy,
  AwsSchedulerSchedule,
  AwsSnsTopic,
  AwsSqsQueue,
  AwsSqsQueuepolicy,
  AwsSsmAssociation,
  AwsSsmDocument,
  AwsStepfunctionsStatemachine,
  AwsWafv2Webaclassociation
} from './cloudformation';

// ==========================================
// SDK TYPE IMPORTS (for augmented props base types)
// ==========================================

import type {
  WebServiceProps as SdkWebServiceProps,
  PrivateServiceProps as SdkPrivateServiceProps,
  WorkerServiceProps as SdkWorkerServiceProps,
  ContainerWorkloadProps as SdkContainerWorkloadProps,
  LambdaFunctionProps as SdkLambdaFunctionProps,
  BatchJobProps as SdkBatchJobProps,
  StateMachineProps as SdkStateMachineProps,
  NextjsWebProps as SdkNextjsWebProps,
  NuxtWebProps as SdkNuxtWebProps,
  AgentCoreRuntimeProps as SdkAgentCoreRuntimeProps,
  LocalScriptProps as SdkLocalScriptProps,
  BastionScriptProps as SdkBastionScriptProps,
  LocalScriptWithBastionTunnelingProps as SdkLocalScriptWithBastionTunnelingProps
} from './plain';

// ==========================================
// PLAIN TYPE RE-EXPORTS
// ==========================================

export type {
  WebServiceProps as PlainWebServiceProps,
  PrivateServiceProps as PlainPrivateServiceProps,
  WorkerServiceProps as PlainWorkerServiceProps,
  ContainerWorkloadProps as PlainContainerWorkloadProps,
  LambdaFunctionProps as PlainLambdaFunctionProps,
  BatchJobProps as PlainBatchJobProps,
  StateMachineProps as PlainStateMachineProps,
  NextjsWebProps as PlainNextjsWebProps,
  NuxtWebProps as PlainNuxtWebProps,
  AgentCoreRuntimeProps as PlainAgentCoreRuntimeProps,
  LocalScriptProps as PlainLocalScriptProps,
  BastionScriptProps as PlainBastionScriptProps,
  LocalScriptWithBastionTunnelingProps as PlainLocalScriptWithBastionTunnelingProps,
  RelationalDatabaseProps,
  BucketProps,
  HostingBucketProps,
  DynamoDbTableProps,
  EventBusProps,
  HttpApiGatewayProps,
  ApplicationLoadBalancerProps,
  NetworkLoadBalancerProps,
  RedisClusterProps,
  MongoDbAtlasClusterProps,
  UserAuthPoolProps,
  UpstashRedisProps,
  SqsQueueProps,
  SnsTopicProps,
  KinesisStreamProps,
  WebAppFirewallProps,
  OpenSearchDomainProps,
  EfsFilesystemProps,
  AstroWebProps,
  SvelteKitWebProps,
  SolidStartWebProps,
  TanStackWebProps,
  RemixWebProps,
  BastionProps,
  AgentCoreMemoryProps,
  AgentCoreGatewayProps,
  AgentCoreBrowserProps,
  AgentCoreCodeInterpreterProps,
  RdsEngineProperties,
  AuroraEngineProperties,
  AuroraServerlessEngineProperties,
  AuroraServerlessV2EngineProperties,
  StpBuildpackLambdaPackagingProps,
  CustomArtifactLambdaPackagingProps,
  PrebuiltImageCwPackagingProps,
  CustomDockerfileCwImagePackagingProps,
  ExternalBuildpackCwImagePackagingProps,
  NixpacksCwImagePackagingProps,
  StpBuildpackCwImagePackagingProps,
  CdnLoadBalancerOrigin,
  CdnHttpApiGatewayOrigin,
  CdnLambdaFunctionOrigin,
  CdnCustomOrigin,
  CdnBucketOrigin,
  ManagedRuleGroupProps,
  CustomRuleGroupProps,
  RateBasedStatementProps,
  HttpEndpointLogForwardingProps,
  HighlightLogForwardingProps,
  DatadogLogForwardingProps,
  ExpirationProps,
  NonCurrentVersionExpirationProps,
  CognitoAuthorizerProperties,
  LambdaAuthorizerProperties,
  ApplicationLoadBalancerCustomTriggerProps,
  ApplicationLoadBalancerErrorRateTriggerProps,
  ApplicationLoadBalancerUnhealthyTargetsTriggerProps,
  HttpApiGatewayErrorRateTriggerProps,
  HttpApiGatewayLatencyTriggerProps,
  RelationalDatabaseReadLatencyTriggerProps,
  RelationalDatabaseWriteLatencyTriggerProps,
  RelationalDatabaseCPUUtilizationTriggerProps,
  RelationalDatabaseFreeStorageTriggerProps,
  RelationalDatabaseFreeMemoryTriggerProps,
  RelationalDatabaseConnectionCountTriggerProps,
  SqsQueueReceivedMessagesCountTriggerProps,
  LambdaErrorRateTriggerProps,
  LambdaDurationTriggerProps,
  CustomResourceDefinitionProps,
  CustomResourceInstanceProps,
  DeploymentScriptProps,
  EdgeLambdaFunctionProps,
  AlarmUserIntegration,
  StpIamRoleStatement
} from './plain';

// ==========================================
// PROPS TYPE ALIASES
// These map expected *Props type names to actual generated types
// ==========================================

// Props type aliases extracting 'properties' from discriminated unions
export type HttpApiIntegrationProps = import('./plain').HttpApiIntegration['properties'];
export type S3IntegrationProps = import('./plain').S3Integration['properties'];
export type ScheduleIntegrationProps = import('./plain').ScheduleIntegration['properties'];
export type SnsIntegrationProps = import('./plain').SnsIntegration['properties'];
export type SqsIntegrationProps = import('./plain').SqsIntegration['properties'];
export type KinesisIntegrationProps = import('./plain').KinesisIntegration['properties'];
export type DynamoDbIntegrationProps = import('./plain').DynamoDbIntegration['properties'];
export type CloudwatchLogIntegrationProps = import('./plain').CloudwatchLogIntegration['properties'];
export type ApplicationLoadBalancerIntegrationProps = import('./plain').ApplicationLoadBalancerIntegration['properties'];
export type EventBusIntegrationProps = import('./plain').EventBusIntegration['properties'];
export type KafkaTopicIntegrationProps = import('./plain').KafkaTopicIntegration['properties'];
export type AlarmIntegrationProps = import('./plain').AlarmIntegration['properties'];
export type SqsQueueEventBusIntegrationProps = import('./plain').SqsQueueEventBusIntegration['properties'];
export type ContainerWorkloadHttpApiIntegrationProps = import('./plain').ContainerWorkloadHttpApiIntegration['properties'];
export type ContainerWorkloadLoadBalancerIntegrationProps = import('./plain').ContainerWorkloadLoadBalancerIntegration['properties'];
export type ContainerWorkloadNetworkLoadBalancerIntegrationProps = import('./plain').ContainerWorkloadNetworkLoadBalancerIntegration['properties'];
export type ContainerWorkloadInternalIntegrationProps = import('./plain').ContainerWorkloadInternalIntegration['properties'];
export type ContainerWorkloadServiceConnectIntegrationProps = import('./plain').ContainerWorkloadServiceConnectIntegration['properties'];

// Direct type aliases
export type ContainerEfsMountProps = import('./plain').ContainerEfsMount;
export type LambdaEfsMountProps = import('./plain').LambdaEfsMount;
export type LambdaS3FilesMountProps = import('./plain').LambdaS3FilesMount;

// Placeholder types for missing types
export type IotIntegrationProps = Record<string, unknown>;

// ==========================================
// ADDITIONAL TYPE DEFINITIONS
// ==========================================

/**
 * CLI arguments passed to the getConfig function.
 * Contains any additional arguments passed via --arg flag.
 */
export type StacktapeArgs = Record<string, string | number | boolean>;

// ==========================================
// CONFIG TYPES
// ==========================================

/**
 * A reference to a resource parameter that will be resolved at runtime.
 * Stores a reference to the resource for lazy name resolution.
 */
/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
/**
 * Defines a CloudWatch alarm that monitors a metric and triggers notifications when thresholds are breached.
 *
 * Alarms can be attached to resources like Lambda functions, databases, load balancers, SQS queues, and HTTP API Gateways.
 * When the alarm condition is met (e.g., error rate exceeds 5%), notifications are sent to configured targets (Slack, email, MS Teams).
 *
 * @example
 * ```ts
 * new Alarm({
 *   trigger: new LambdaErrorRateTrigger({ thresholdPercent: 5 }),
 *   evaluation: { period: 60, evaluationPeriods: 3, breachedPeriods: 2 },
 *   notificationTargets: [{ slack: { url: $Secret('slack-webhook-url') } }],
 *   description: 'Lambda error rate exceeded 5%'
 * })
 * ```
 */
/**
 * Base resource class that provides common functionality
 */
/**
 * Helper function to define a config with automatic transformation
 * Use this when exporting your config for the Stacktape CLI
 */
export declare const defineConfig: (configFn: (params: GetConfigParams) => StacktapeConfig) => (params: GetConfigParams) => any;
/**
 * Transforms a config with resource instances into a plain config object
 */
export declare const transformConfigWithResources: (config: any) => any;
export declare const transformValue: (value: any) => any;
export {};

// ==========================================
// BASE CLASSES AND UTILITIES
// ==========================================

/**
 * Parameters passed to the getConfig/defineConfig function.
 */
export type GetConfigParams = {
  /** Project name used for this operation */
  projectName: string;
  /** Stage ("environment") used for this operation */
  stage: string;
  /** AWS region used for this operation */
  region: string;
  /** List of arguments passed to the operation */
  cliArgs: StacktapeArgs;
  /** Stacktape command used to perform this operation */
  command: string;
  /** Locally-configured AWS profile used to execute the operation */
  profile: string | undefined;
};

declare const getParamReferenceSymbol: unique symbol;
declare const getTypeSymbol: unique symbol;
declare const getPropertiesSymbol: unique symbol;
declare const getOverridesSymbol: unique symbol;
declare const getTransformsSymbol: unique symbol;
declare const setResourceNameSymbol: unique symbol;
declare const resourceParamRefSymbol: unique symbol;
declare const baseTypePropertiesSymbol: unique symbol;
declare const alarmSymbol: unique symbol;

/**
 * A reference to a resource parameter that will be resolved at runtime.
 * Stores a reference to the resource for lazy name resolution.
 */
export declare class ResourceParamReference {
  private __resource;
  private __param;
  readonly [resourceParamRefSymbol]: true;
  constructor(resource: BaseResource, param: string);
  toString(): string;
  toJSON(): string;
  valueOf(): string;
}

/**
 * Base class for type/properties structures (engines, packaging, events, etc.)
 */
export declare class BaseTypeProperties {
  readonly type: string;
  readonly properties: any;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: string, properties: any);
}

/**
 * Base class for type-only structures (no properties field, just type discriminator)
 */
export declare class BaseTypeOnly {
  readonly type: string;
  readonly [baseTypePropertiesSymbol]: true;
  constructor(type: string);
}

/**
 * Defines a CloudWatch alarm that monitors a metric and triggers notifications when thresholds are breached.
 */
export declare class Alarm {
  readonly trigger: any;
  readonly evaluation?: any;
  readonly notificationTargets?: import('./plain').AlarmUserIntegration[];
  readonly description?: string;
  readonly [alarmSymbol]: true;
  constructor(props: { trigger: any; evaluation?: any; notificationTargets?: import('./plain').AlarmUserIntegration[]; description?: string });
}

/**
 * Base resource class that provides common functionality
 */
export declare class BaseResource {
  private readonly _type;
  private _properties;
  private _overrides?;
  private _transforms?;
  private _resourceName;
  private _explicitName;
  constructor(name: string | undefined, type: string, properties: any, overrides?: any);
  private _processOverridesAndTransforms;
  get resourceName(): string;
  [setResourceNameSymbol](name: string): void;
  [getParamReferenceSymbol](paramName: string): ResourceParamReference;
  [getTypeSymbol](): string;
  [getPropertiesSymbol](): any;
  [getOverridesSymbol](): any | undefined;
  [getTransformsSymbol](): any | undefined;
}


// ==========================================
// AUGMENTED PROPS TYPES
// ==========================================

// ConnectTo type aliases
type WebServiceConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | PrivateService | GlobalAwsServiceConstant;
type PrivateServiceConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | GlobalAwsServiceConstant;
type WorkerServiceConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | GlobalAwsServiceConstant;
type MultiContainerWorkloadConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;
type LambdaFunctionConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | PrivateService | WebService | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;
type BatchJobConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | GlobalAwsServiceConstant;
type StateMachineConnectTo = Function | BatchJob | GlobalAwsServiceConstant;
type NextjsWebConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | PrivateService | WebService | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;
type NuxtWebConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | PrivateService | WebService | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;
type AgentCoreRuntimeConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | PrivateService | WebService | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;
type ScriptConnectTo = RelationalDatabase | Bucket | HostingBucket | DynamoDbTable | EventBus | RedisCluster | MongoDbAtlasCluster | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | OpenSearchDomain | EfsFilesystem | PrivateService | WebService | LambdaFunction | BatchJob | UserAuthPool | GlobalAwsServiceConstant;

// Augmented container types with object-style environment
/**
 * Container configuration with object-style environment variables.
 * Environment is specified as { KEY: 'value' } for better developer experience.
 */
export type ContainerWithObjectEnv = Omit<import('./plain').ContainerWorkloadContainer, 'environment'> & {
  /**
   * Environment variables to inject into the container.
   * Specified as key-value pairs: { PORT: '3000', NODE_ENV: 'production' }
   */
  environment?: { [envVarName: string]: string | number | boolean };
};

/**
 * Batch job container configuration with object-style environment variables.
 * Environment is specified as { KEY: 'value' } for better developer experience.
 */
export type BatchJobContainerWithObjectEnv = Omit<import('./plain').BatchJobContainer, 'environment'> & {
  /**
   * Environment variables to inject into the batch job container.
   * Specified as key-value pairs: { PORT: '3000', NODE_ENV: 'production' }
   */
  environment?: { [envVarName: string]: string | number | boolean };
};

// Augmented props types with connectTo, environment, overrides, and transforms

export type WebServiceProps = Omit<SdkWebServiceProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: WebServiceConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: WebServiceOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: WebServiceTransforms;
};

export type PrivateServiceProps = Omit<SdkPrivateServiceProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: PrivateServiceConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: PrivateServiceOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: PrivateServiceTransforms;
};

export type WorkerServiceProps = Omit<SdkWorkerServiceProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: WorkerServiceConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: WorkerServiceOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: WorkerServiceTransforms;
};

export type ContainerWorkloadProps = Omit<SdkContainerWorkloadProps, 'connectTo' | 'environment' | 'containers'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: MultiContainerWorkloadConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * A list of containers that will run in this workload.
   * Containers within the same workload share computing resources and scale together.
   */
  containers: ContainerWithObjectEnv[];
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: MultiContainerWorkloadOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: MultiContainerWorkloadTransforms;
};

export type LambdaFunctionProps = Omit<SdkLambdaFunctionProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: LambdaFunctionConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: LambdaFunctionOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: LambdaFunctionTransforms;
};

export type BatchJobProps = Omit<SdkBatchJobProps, 'connectTo' | 'environment' | 'container'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: BatchJobConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Container configuration for the batch job.
   */
  container: BatchJobContainerWithObjectEnv;
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: BatchJobOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: BatchJobTransforms;
};

export type StateMachineProps = Omit<SdkStateMachineProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: StateMachineConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: StateMachineOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: StateMachineTransforms;
};

export type NextjsWebProps = Omit<SdkNextjsWebProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: NextjsWebConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: NextjsWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: NextjsWebTransforms;
};

export type NuxtWebProps = Omit<SdkNuxtWebProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: NuxtWebConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: NuxtWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: NuxtWebTransforms;
};

export type AgentCoreRuntimeProps = Omit<SdkAgentCoreRuntimeProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: AgentCoreRuntimeConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AgentCoreRuntimeOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AgentCoreRuntimeTransforms;
};

export type LocalScriptProps = Omit<SdkLocalScriptProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: ScriptConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
};

export type BastionScriptProps = Omit<SdkBastionScriptProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: ScriptConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
};

export type LocalScriptWithBastionTunnelingProps = Omit<SdkLocalScriptWithBastionTunnelingProps, 'connectTo' | 'environment'> & {
  /**
   * List of resources or AWS services to which this resource receives permissions.
   * Automatically grants necessary IAM permissions for accessing the connected resources.
   */
  connectTo?: ScriptConnectTo[];
  /**
   * Environment variables to set for this resource.
   * You can reference resource parameters using directive syntax: $ResourceParam('resourceName', 'paramName')
   */
  environment?: { [envVarName: string]: string | number | boolean };
};

// WithOverrides types for resources without connectTo augmentation

export type RelationalDatabasePropsWithOverrides = import('./plain').RelationalDatabaseProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: RelationalDatabaseOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: RelationalDatabaseTransforms;
};

export type BucketPropsWithOverrides = import('./plain').BucketProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: BucketOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: BucketTransforms;
};

export type HostingBucketPropsWithOverrides = Omit<import('./plain').HostingBucketProps, 'injectEnvironment'> & {
  /**
   * Injects referenced parameters into all HTML files in the uploadDirectoryPath.
   * These parameters can be accessed by any JavaScript script using window.STP_INJECTED_ENV.VARIABLE_NAME.
   * This is useful for automatically referencing parameters that are only known after deployment, such as the URL of an API Gateway.
   */
  injectEnvironment?: { [envVarName: string]: string | number | boolean };
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: HostingBucketOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: HostingBucketTransforms;
};

export type DynamoDbTablePropsWithOverrides = import('./plain').DynamoDbTableProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: DynamoDbTableOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: DynamoDbTableTransforms;
};

export type EventBusPropsWithOverrides = import('./plain').EventBusProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: EventBusOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: EventBusTransforms;
};

export type HttpApiGatewayPropsWithOverrides = import('./plain').HttpApiGatewayProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: HttpApiGatewayOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: HttpApiGatewayTransforms;
};

export type ApplicationLoadBalancerPropsWithOverrides = import('./plain').ApplicationLoadBalancerProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: ApplicationLoadBalancerOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: ApplicationLoadBalancerTransforms;
};

export type NetworkLoadBalancerPropsWithOverrides = import('./plain').NetworkLoadBalancerProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: NetworkLoadBalancerOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: NetworkLoadBalancerTransforms;
};

export type RedisClusterPropsWithOverrides = import('./plain').RedisClusterProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: RedisClusterOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: RedisClusterTransforms;
};

export type UserAuthPoolPropsWithOverrides = import('./plain').UserAuthPoolProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: UserAuthPoolOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: UserAuthPoolTransforms;
};

export type SqsQueuePropsWithOverrides = import('./plain').SqsQueueProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: SqsQueueOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: SqsQueueTransforms;
};

export type SnsTopicPropsWithOverrides = import('./plain').SnsTopicProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: SnsTopicOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: SnsTopicTransforms;
};

export type KinesisStreamPropsWithOverrides = import('./plain').KinesisStreamProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: KinesisStreamOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: KinesisStreamTransforms;
};

export type WebAppFirewallPropsWithOverrides = import('./plain').WebAppFirewallProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: WebAppFirewallOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: WebAppFirewallTransforms;
};

export type OpenSearchDomainPropsWithOverrides = import('./plain').OpenSearchDomainProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: OpenSearchDomainOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: OpenSearchDomainTransforms;
};

export type EfsFilesystemPropsWithOverrides = import('./plain').EfsFilesystemProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: EfsFilesystemOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: EfsFilesystemTransforms;
};

export type AstroWebPropsWithOverrides = import('./plain').AstroWebProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AstroWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AstroWebTransforms;
};

export type SvelteKitWebPropsWithOverrides = import('./plain').SvelteKitWebProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: SvelteKitWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: SvelteKitWebTransforms;
};

export type SolidStartWebPropsWithOverrides = import('./plain').SolidStartWebProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: SolidStartWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: SolidStartWebTransforms;
};

export type TanStackWebPropsWithOverrides = import('./plain').TanStackWebProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: TanStackWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: TanStackWebTransforms;
};

export type RemixWebPropsWithOverrides = import('./plain').RemixWebProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: RemixWebOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: RemixWebTransforms;
};

export type BastionPropsWithOverrides = import('./plain').BastionProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: BastionOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: BastionTransforms;
};

export type AgentCoreMemoryPropsWithOverrides = import('./plain').AgentCoreMemoryProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AgentCoreMemoryOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AgentCoreMemoryTransforms;
};

export type AgentCoreGatewayPropsWithOverrides = import('./plain').AgentCoreGatewayProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AgentCoreGatewayOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AgentCoreGatewayTransforms;
};

export type AgentCoreBrowserPropsWithOverrides = import('./plain').AgentCoreBrowserProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AgentCoreBrowserOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AgentCoreBrowserTransforms;
};

export type AgentCoreCodeInterpreterPropsWithOverrides = import('./plain').AgentCoreCodeInterpreterProps & {
  /**
   * Override properties of underlying CloudFormation resources.
   * Allows fine-grained control over the generated infrastructure.
   */
  overrides?: AgentCoreCodeInterpreterOverrides;
  /**
   * Transform functions for underlying CloudFormation resources.
   * Each function receives the current properties and returns modified properties.
   * Unlike overrides, transforms allow dynamic modification based on existing values.
   */
  transforms?: AgentCoreCodeInterpreterTransforms;
};


// ==========================================
// CLOUDFORMATION OVERRIDES
// ==========================================

export type RelationalDatabaseOverrides = {
  dbSubnetGroup?: Partial<AwsRdsDbsubnetgroup>;
  dbSecurityGroup?: Partial<AwsEc2Securitygroup>;
  customResourceDatabaseDeletionProtection?: Partial<AwsCloudformationCustomresource>;
  auroraDbCluster?: Partial<AwsRdsDbcluster>;
  auroraDbClusterParameterGroup?: Partial<AwsRdsDbclusterparametergroup>;
  auroraDbInstanceParameterGroup?: Partial<AwsRdsDbparametergroup>;
  dbInstance?: Partial<AwsRdsDbinstance>;
  dbOptionGroup?: Partial<AwsRdsOptiongroup>;
  dbInstanceParameterGroup?: Partial<AwsRdsDbparametergroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type WebServiceOverrides = {
  ecsCluster?: Partial<AwsEcsCluster>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: Partial<AwsIamRole>;
  ecsTaskDefinition?: Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: Partial<AwsIamRole>;
  ecsAutoScalingRole?: Partial<AwsIamRole>;
  autoScalingTarget?: Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: Partial<AwsEfsAccesspoint>;
  loadBalancer?: Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: Partial<AwsEc2Securitygroup>;
  listener?: Partial<AwsElasticloadbalancingv2Listener>;
  webAppFirewallAssociation?: Partial<AwsWafv2Webaclassociation>;
  httpApi?: Partial<AwsApigatewayv2Api>;
  httpApiStage?: Partial<AwsApigatewayv2Stage>;
  httpApiLogGroup?: Partial<AwsLogsLoggroup>;
  httpApiVpcLinkSecurityGroup?: Partial<AwsEc2Securitygroup>;
  httpApiVpcLink?: Partial<AwsApigatewayv2Vpclink>;
  httpApiDomain?: Partial<AwsApigatewayv2Domainname>;
  httpApiDomainMapping?: Partial<AwsApigatewayv2Apimapping>;
  httpApiDefaultDomain?: Partial<AwsApigatewayv2Domainname>;
  httpApiDefaultDomainMapping?: Partial<AwsApigatewayv2Apimapping>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type PrivateServiceOverrides = {
  ecsCluster?: Partial<AwsEcsCluster>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: Partial<AwsIamRole>;
  ecsTaskDefinition?: Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: Partial<AwsIamRole>;
  ecsAutoScalingRole?: Partial<AwsIamRole>;
  autoScalingTarget?: Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: Partial<AwsEfsAccesspoint>;
  loadBalancer?: Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: Partial<AwsEc2Securitygroup>;
  listener?: Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type WorkerServiceOverrides = {
  ecsCluster?: Partial<AwsEcsCluster>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: Partial<AwsIamRole>;
  ecsTaskDefinition?: Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: Partial<AwsIamRole>;
  ecsAutoScalingRole?: Partial<AwsIamRole>;
  autoScalingTarget?: Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: Partial<AwsEfsAccesspoint>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type MultiContainerWorkloadOverrides = {
  ecsExecutionRole?: Partial<AwsIamRole>;
  ecsAutoScalingRole?: Partial<AwsIamRole>;
  autoScalingTarget?: Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: Partial<AwsCodedeployDeploymentgroup>;
  ecsCluster?: Partial<AwsEcsCluster>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: Partial<AwsIamRole>;
  ecsTaskDefinition?: Partial<AwsEcsTaskdefinition>;
  efsAccessPoint?: Partial<AwsEfsAccesspoint>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type LambdaFunctionOverrides = {
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  efsAccessPoint?: Partial<AwsEfsAccesspoint>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  lambdaPublicUrlPermission?: Partial<AwsLambdaPermission>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaInvokeConfig?: Partial<AwsLambdaEventinvokeconfig>;
  lambdaCodeDeployApp?: Partial<AwsCodedeployApplication>;
  lambdaVersionPublisherCustomResource?: Partial<AwsCloudformationCustomresource>;
  codeDeployDeploymentGroup?: Partial<AwsCodedeployDeploymentgroup>;
  lambdaStpAlias?: Partial<AwsLambdaAlias>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type BatchJobOverrides = {
  batchServiceRole?: Partial<AwsIamRole>;
  batchSpotFleetRole?: Partial<AwsIamRole>;
  batchInstanceRole?: Partial<AwsIamRole>;
  batchInstanceProfile?: Partial<AwsIamInstanceprofile>;
  batchStateMachineExecutionRole?: Partial<AwsIamRole>;
  batchInstanceLaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  batchInstanceDefaultSecurityGroup?: Partial<AwsEc2Securitygroup>;
  batchComputeEnvironment?: Partial<AwsBatchComputeenvironment>;
  batchJobQueue?: Partial<AwsBatchJobqueue>;
  batchJobDefinition?: Partial<AwsBatchJobdefinition>;
  batchStateMachine?: Partial<AwsStepfunctionsStatemachine>;
  batchJobLogGroup?: Partial<AwsLogsLoggroup>;
  batchJobExecutionRole?: Partial<AwsIamRole>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type BucketOverrides = {
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type HostingBucketOverrides = {
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type DynamoDbTableOverrides = {
  dynamoGlobalTable?: Partial<AwsDynamodbGlobaltable>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type EventBusOverrides = {
  eventBus?: Partial<AwsEventsEventbus>;
  eventBusArchive?: Partial<AwsEventsArchive>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type HttpApiGatewayOverrides = {
  httpApi?: Partial<AwsApigatewayv2Api>;
  httpApiStage?: Partial<AwsApigatewayv2Stage>;
  httpApiLogGroup?: Partial<AwsLogsLoggroup>;
  httpApiVpcLinkSecurityGroup?: Partial<AwsEc2Securitygroup>;
  httpApiVpcLink?: Partial<AwsApigatewayv2Vpclink>;
  httpApiDomain?: Partial<AwsApigatewayv2Domainname>;
  httpApiDomainMapping?: Partial<AwsApigatewayv2Apimapping>;
  httpApiDefaultDomain?: Partial<AwsApigatewayv2Domainname>;
  httpApiDefaultDomainMapping?: Partial<AwsApigatewayv2Apimapping>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type ApplicationLoadBalancerOverrides = {
  loadBalancer?: Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: Partial<AwsEc2Securitygroup>;
  webAppFirewallAssociation?: Partial<AwsWafv2Webaclassociation>;
  listener?: Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type NetworkLoadBalancerOverrides = {
  loadBalancer?: Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: Partial<AwsEc2Securitygroup>;
  listener?: Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type RedisClusterOverrides = {
  redisParameterGroup?: Partial<AwsElasticacheParametergroup>;
  redisSubnetGroup?: Partial<AwsElasticacheSubnetgroup>;
  redisSecurityGroup?: Partial<AwsEc2Securitygroup>;
  redisLogGroup?: Partial<AwsLogsLoggroup>;
  redisReplicationGroup?: Partial<AwsElasticacheReplicationgroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type StateMachineOverrides = {
  globalStateMachinesRole?: Partial<AwsIamRole>;
  stateMachine?: Partial<AwsStepfunctionsStatemachine>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type UserAuthPoolOverrides = {
  userPool?: Partial<AwsCognitoUserpool>;
  snsRoleSendSmsFromCognito?: Partial<AwsIamRole>;
  userPoolClient?: Partial<AwsCognitoUserpoolclient>;
  userPoolDomain?: Partial<AwsCognitoUserpooldomain>;
  cognitoUserPoolDetailsCustomResource?: Partial<AwsCloudformationCustomresource>;
  identityProvider?: Partial<AwsCognitoUserpoolidentityprovider>;
  cognitoLambdaHookPermission?: Partial<AwsLambdaPermission>;
  userPoolUiCustomizationAttachment?: Partial<AwsCognitoUserpooluicustomizationattachment>;
  webAppFirewallAssociation?: Partial<AwsWafv2Webaclassociation>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type SqsQueueOverrides = {
  sqsQueue?: Partial<AwsSqsQueue>;
  sqsQueuePolicy?: Partial<AwsSqsQueuepolicy>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type SnsTopicOverrides = {
  snsTopic?: Partial<AwsSnsTopic>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type KinesisStreamOverrides = {
  kinesisStream?: Partial<AwsKinesisStream>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type WebAppFirewallOverrides = {
  webAppFirewallCustomResource?: Partial<AwsCloudformationCustomresource>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type OpenSearchDomainOverrides = {
  openSearchDomain?: Partial<AwsOpensearchserviceDomain>;
  openSearchSecurityGroup?: Partial<AwsEc2Securitygroup>;
  openSearchCustomResource?: Partial<AwsCloudformationCustomresource>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type EfsFilesystemOverrides = {
  efsFilesystem?: Partial<AwsEfsFilesystem>;
  efsSecurityGroup?: Partial<AwsEc2Securitygroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type NextjsWebOverrides = {
  openNextHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  openNextAssetReplacerCustomResource?: Partial<AwsCloudformationCustomresource>;
  openNextDynamoInsertCustomResource?: Partial<AwsCloudformationCustomresource>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  customResourceEdgeLambda?: Partial<AwsCloudformationCustomresource>;
  sqsQueue?: Partial<AwsSqsQueue>;
  sqsQueuePolicy?: Partial<AwsSqsQueuepolicy>;
  dynamoGlobalTable?: Partial<AwsDynamodbGlobaltable>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AstroWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type NuxtWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type SvelteKitWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type SolidStartWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type TanStackWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type RemixWebOverrides = {
  ssrWebHostHeaderRewriteFunction?: Partial<AwsCloudfrontFunction>;
  bucket?: Partial<AwsS3Bucket>;
  bucketPolicy?: Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: Partial<AwsCloudformationCustomresource>;
  dnsRecord?: Partial<AwsRoute53Recordset>;
  lambdaRole?: Partial<AwsIamRole>;
  lambda?: Partial<AwsLambdaFunction>;
  lambdaLogGroup?: Partial<AwsLogsLoggroup>;
  lambdaUrl?: Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type BastionOverrides = {
  bastionCloudwatchSsmDocument?: Partial<AwsSsmDocument>;
  bastionEc2AutoscalingGroup?: Partial<AwsAutoscalingAutoscalinggroup>;
  bastionSecurityGroup?: Partial<AwsEc2Securitygroup>;
  bastionEc2LaunchTemplate?: Partial<AwsEc2Launchtemplate>;
  bastionRole?: Partial<AwsIamRole>;
  bastionEc2InstanceProfile?: Partial<AwsIamInstanceprofile>;
  bastionCwAgentSsmAssociation?: Partial<AwsSsmAssociation>;
  bastionSsmAgentSsmAssociation?: Partial<AwsSsmAssociation>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AgentCoreRuntimeOverrides = {
  agentCoreRuntimeRole?: Partial<AwsIamRole>;
  workloadSecurityGroup?: Partial<AwsEc2Securitygroup>;
  agentCoreRuntime?: Partial<AwsBedrockagentcoreRuntime>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AgentCoreMemoryOverrides = {
  agentCoreMemory?: Partial<AwsBedrockagentcoreMemory>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AgentCoreGatewayOverrides = {
  agentCoreGatewayRole?: Partial<AwsIamRole>;
  agentCoreGateway?: Partial<AwsBedrockagentcoreGateway>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AgentCoreBrowserOverrides = {
  agentCoreBrowserRole?: Partial<AwsIamRole>;
  agentCoreBrowser?: Partial<AwsBedrockagentcoreBrowsercustom>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};

export type AgentCoreCodeInterpreterOverrides = {
  agentCoreCodeInterpreterRole?: Partial<AwsIamRole>;
  agentCoreCodeInterpreter?: Partial<AwsBedrockagentcoreCodeinterpretercustom>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: Record<string, unknown> | undefined;
};


// ==========================================
// CLOUDFORMATION TRANSFORMS
// ==========================================

export type RelationalDatabaseTransforms = {
  dbSubnetGroup?: (props: Partial<AwsRdsDbsubnetgroup>) => Partial<AwsRdsDbsubnetgroup>;
  dbSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  customResourceDatabaseDeletionProtection?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  auroraDbCluster?: (props: Partial<AwsRdsDbcluster>) => Partial<AwsRdsDbcluster>;
  auroraDbClusterParameterGroup?: (props: Partial<AwsRdsDbclusterparametergroup>) => Partial<AwsRdsDbclusterparametergroup>;
  auroraDbInstanceParameterGroup?: (props: Partial<AwsRdsDbparametergroup>) => Partial<AwsRdsDbparametergroup>;
  dbInstance?: (props: Partial<AwsRdsDbinstance>) => Partial<AwsRdsDbinstance>;
  dbOptionGroup?: (props: Partial<AwsRdsOptiongroup>) => Partial<AwsRdsOptiongroup>;
  dbInstanceParameterGroup?: (props: Partial<AwsRdsDbparametergroup>) => Partial<AwsRdsDbparametergroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type WebServiceTransforms = {
  ecsCluster?: (props: Partial<AwsEcsCluster>) => Partial<AwsEcsCluster>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsTaskDefinition?: (props: Partial<AwsEcsTaskdefinition>) => Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsAutoScalingRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  autoScalingTarget?: (props: Partial<AwsApplicationautoscalingScalabletarget>) => Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: (props: Partial<AwsAutoscalingAutoscalinggroup>) => Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: (props: Partial<AwsEcsCapacityprovider>) => Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: (props: Partial<AwsEcsClustercapacityproviderassociations>) => Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: (props: Partial<AwsSchedulerSchedule>) => Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: (props: Partial<AwsAutoscalingWarmpool>) => Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: (props: Partial<AwsCodedeployApplication>) => Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: (props: Partial<AwsCodedeployDeploymentgroup>) => Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: (props: Partial<AwsEfsAccesspoint>) => Partial<AwsEfsAccesspoint>;
  loadBalancer?: (props: Partial<AwsElasticloadbalancingv2Loadbalancer>) => Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  listener?: (props: Partial<AwsElasticloadbalancingv2Listener>) => Partial<AwsElasticloadbalancingv2Listener>;
  webAppFirewallAssociation?: (props: Partial<AwsWafv2Webaclassociation>) => Partial<AwsWafv2Webaclassociation>;
  httpApi?: (props: Partial<AwsApigatewayv2Api>) => Partial<AwsApigatewayv2Api>;
  httpApiStage?: (props: Partial<AwsApigatewayv2Stage>) => Partial<AwsApigatewayv2Stage>;
  httpApiLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  httpApiVpcLinkSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  httpApiVpcLink?: (props: Partial<AwsApigatewayv2Vpclink>) => Partial<AwsApigatewayv2Vpclink>;
  httpApiDomain?: (props: Partial<AwsApigatewayv2Domainname>) => Partial<AwsApigatewayv2Domainname>;
  httpApiDomainMapping?: (props: Partial<AwsApigatewayv2Apimapping>) => Partial<AwsApigatewayv2Apimapping>;
  httpApiDefaultDomain?: (props: Partial<AwsApigatewayv2Domainname>) => Partial<AwsApigatewayv2Domainname>;
  httpApiDefaultDomainMapping?: (props: Partial<AwsApigatewayv2Apimapping>) => Partial<AwsApigatewayv2Apimapping>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type PrivateServiceTransforms = {
  ecsCluster?: (props: Partial<AwsEcsCluster>) => Partial<AwsEcsCluster>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsTaskDefinition?: (props: Partial<AwsEcsTaskdefinition>) => Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsAutoScalingRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  autoScalingTarget?: (props: Partial<AwsApplicationautoscalingScalabletarget>) => Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: (props: Partial<AwsAutoscalingAutoscalinggroup>) => Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: (props: Partial<AwsEcsCapacityprovider>) => Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: (props: Partial<AwsEcsClustercapacityproviderassociations>) => Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: (props: Partial<AwsSchedulerSchedule>) => Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: (props: Partial<AwsAutoscalingWarmpool>) => Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: (props: Partial<AwsCodedeployApplication>) => Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: (props: Partial<AwsCodedeployDeploymentgroup>) => Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: (props: Partial<AwsEfsAccesspoint>) => Partial<AwsEfsAccesspoint>;
  loadBalancer?: (props: Partial<AwsElasticloadbalancingv2Loadbalancer>) => Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  listener?: (props: Partial<AwsElasticloadbalancingv2Listener>) => Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type WorkerServiceTransforms = {
  ecsCluster?: (props: Partial<AwsEcsCluster>) => Partial<AwsEcsCluster>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsTaskDefinition?: (props: Partial<AwsEcsTaskdefinition>) => Partial<AwsEcsTaskdefinition>;
  ecsExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsAutoScalingRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  autoScalingTarget?: (props: Partial<AwsApplicationautoscalingScalabletarget>) => Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: (props: Partial<AwsAutoscalingAutoscalinggroup>) => Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: (props: Partial<AwsEcsCapacityprovider>) => Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: (props: Partial<AwsEcsClustercapacityproviderassociations>) => Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: (props: Partial<AwsSchedulerSchedule>) => Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: (props: Partial<AwsAutoscalingWarmpool>) => Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: (props: Partial<AwsCodedeployApplication>) => Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: (props: Partial<AwsCodedeployDeploymentgroup>) => Partial<AwsCodedeployDeploymentgroup>;
  efsAccessPoint?: (props: Partial<AwsEfsAccesspoint>) => Partial<AwsEfsAccesspoint>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type MultiContainerWorkloadTransforms = {
  ecsExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsAutoScalingRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  autoScalingTarget?: (props: Partial<AwsApplicationautoscalingScalabletarget>) => Partial<AwsApplicationautoscalingScalabletarget>;
  ecsEc2InstanceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  eventBusRoleForScheduledInstanceRefresh?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsEc2InstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  ecsEc2InstanceLaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  ecsEc2AutoscalingGroup?: (props: Partial<AwsAutoscalingAutoscalinggroup>) => Partial<AwsAutoscalingAutoscalinggroup>;
  ecsEc2ForceDeleteAutoscalingGroupCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  ecsEc2CapacityProvider?: (props: Partial<AwsEcsCapacityprovider>) => Partial<AwsEcsCapacityprovider>;
  ecsEc2CapacityProviderAssociation?: (props: Partial<AwsEcsClustercapacityproviderassociations>) => Partial<AwsEcsClustercapacityproviderassociations>;
  schedulerRuleForScheduledInstanceRefresh?: (props: Partial<AwsSchedulerSchedule>) => Partial<AwsSchedulerSchedule>;
  ecsEc2AutoscalingGroupWarmPool?: (props: Partial<AwsAutoscalingWarmpool>) => Partial<AwsAutoscalingWarmpool>;
  ecsCodeDeployApp?: (props: Partial<AwsCodedeployApplication>) => Partial<AwsCodedeployApplication>;
  codeDeployDeploymentGroup?: (props: Partial<AwsCodedeployDeploymentgroup>) => Partial<AwsCodedeployDeploymentgroup>;
  ecsCluster?: (props: Partial<AwsEcsCluster>) => Partial<AwsEcsCluster>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  ecsTaskRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  ecsTaskDefinition?: (props: Partial<AwsEcsTaskdefinition>) => Partial<AwsEcsTaskdefinition>;
  efsAccessPoint?: (props: Partial<AwsEfsAccesspoint>) => Partial<AwsEfsAccesspoint>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type LambdaFunctionTransforms = {
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  efsAccessPoint?: (props: Partial<AwsEfsAccesspoint>) => Partial<AwsEfsAccesspoint>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  lambdaPublicUrlPermission?: (props: Partial<AwsLambdaPermission>) => Partial<AwsLambdaPermission>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaInvokeConfig?: (props: Partial<AwsLambdaEventinvokeconfig>) => Partial<AwsLambdaEventinvokeconfig>;
  lambdaCodeDeployApp?: (props: Partial<AwsCodedeployApplication>) => Partial<AwsCodedeployApplication>;
  lambdaVersionPublisherCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  codeDeployDeploymentGroup?: (props: Partial<AwsCodedeployDeploymentgroup>) => Partial<AwsCodedeployDeploymentgroup>;
  lambdaStpAlias?: (props: Partial<AwsLambdaAlias>) => Partial<AwsLambdaAlias>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type BatchJobTransforms = {
  batchServiceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  batchSpotFleetRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  batchInstanceRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  batchInstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  batchStateMachineExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  batchInstanceLaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  batchInstanceDefaultSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  batchComputeEnvironment?: (props: Partial<AwsBatchComputeenvironment>) => Partial<AwsBatchComputeenvironment>;
  batchJobQueue?: (props: Partial<AwsBatchJobqueue>) => Partial<AwsBatchJobqueue>;
  batchJobDefinition?: (props: Partial<AwsBatchJobdefinition>) => Partial<AwsBatchJobdefinition>;
  batchStateMachine?: (props: Partial<AwsStepfunctionsStatemachine>) => Partial<AwsStepfunctionsStatemachine>;
  batchJobLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  batchJobExecutionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type BucketTransforms = {
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type HostingBucketTransforms = {
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type DynamoDbTableTransforms = {
  dynamoGlobalTable?: (props: Partial<AwsDynamodbGlobaltable>) => Partial<AwsDynamodbGlobaltable>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type EventBusTransforms = {
  eventBus?: (props: Partial<AwsEventsEventbus>) => Partial<AwsEventsEventbus>;
  eventBusArchive?: (props: Partial<AwsEventsArchive>) => Partial<AwsEventsArchive>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type HttpApiGatewayTransforms = {
  httpApi?: (props: Partial<AwsApigatewayv2Api>) => Partial<AwsApigatewayv2Api>;
  httpApiStage?: (props: Partial<AwsApigatewayv2Stage>) => Partial<AwsApigatewayv2Stage>;
  httpApiLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  httpApiVpcLinkSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  httpApiVpcLink?: (props: Partial<AwsApigatewayv2Vpclink>) => Partial<AwsApigatewayv2Vpclink>;
  httpApiDomain?: (props: Partial<AwsApigatewayv2Domainname>) => Partial<AwsApigatewayv2Domainname>;
  httpApiDomainMapping?: (props: Partial<AwsApigatewayv2Apimapping>) => Partial<AwsApigatewayv2Apimapping>;
  httpApiDefaultDomain?: (props: Partial<AwsApigatewayv2Domainname>) => Partial<AwsApigatewayv2Domainname>;
  httpApiDefaultDomainMapping?: (props: Partial<AwsApigatewayv2Apimapping>) => Partial<AwsApigatewayv2Apimapping>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type ApplicationLoadBalancerTransforms = {
  loadBalancer?: (props: Partial<AwsElasticloadbalancingv2Loadbalancer>) => Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  webAppFirewallAssociation?: (props: Partial<AwsWafv2Webaclassociation>) => Partial<AwsWafv2Webaclassociation>;
  listener?: (props: Partial<AwsElasticloadbalancingv2Listener>) => Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type NetworkLoadBalancerTransforms = {
  loadBalancer?: (props: Partial<AwsElasticloadbalancingv2Loadbalancer>) => Partial<AwsElasticloadbalancingv2Loadbalancer>;
  loadBalancerSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  listener?: (props: Partial<AwsElasticloadbalancingv2Listener>) => Partial<AwsElasticloadbalancingv2Listener>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type RedisClusterTransforms = {
  redisParameterGroup?: (props: Partial<AwsElasticacheParametergroup>) => Partial<AwsElasticacheParametergroup>;
  redisSubnetGroup?: (props: Partial<AwsElasticacheSubnetgroup>) => Partial<AwsElasticacheSubnetgroup>;
  redisSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  redisLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  redisReplicationGroup?: (props: Partial<AwsElasticacheReplicationgroup>) => Partial<AwsElasticacheReplicationgroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type StateMachineTransforms = {
  globalStateMachinesRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  stateMachine?: (props: Partial<AwsStepfunctionsStatemachine>) => Partial<AwsStepfunctionsStatemachine>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type UserAuthPoolTransforms = {
  userPool?: (props: Partial<AwsCognitoUserpool>) => Partial<AwsCognitoUserpool>;
  snsRoleSendSmsFromCognito?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  userPoolClient?: (props: Partial<AwsCognitoUserpoolclient>) => Partial<AwsCognitoUserpoolclient>;
  userPoolDomain?: (props: Partial<AwsCognitoUserpooldomain>) => Partial<AwsCognitoUserpooldomain>;
  cognitoUserPoolDetailsCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  identityProvider?: (props: Partial<AwsCognitoUserpoolidentityprovider>) => Partial<AwsCognitoUserpoolidentityprovider>;
  cognitoLambdaHookPermission?: (props: Partial<AwsLambdaPermission>) => Partial<AwsLambdaPermission>;
  userPoolUiCustomizationAttachment?: (props: Partial<AwsCognitoUserpooluicustomizationattachment>) => Partial<AwsCognitoUserpooluicustomizationattachment>;
  webAppFirewallAssociation?: (props: Partial<AwsWafv2Webaclassociation>) => Partial<AwsWafv2Webaclassociation>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type SqsQueueTransforms = {
  sqsQueue?: (props: Partial<AwsSqsQueue>) => Partial<AwsSqsQueue>;
  sqsQueuePolicy?: (props: Partial<AwsSqsQueuepolicy>) => Partial<AwsSqsQueuepolicy>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type SnsTopicTransforms = {
  snsTopic?: (props: Partial<AwsSnsTopic>) => Partial<AwsSnsTopic>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type KinesisStreamTransforms = {
  kinesisStream?: (props: Partial<AwsKinesisStream>) => Partial<AwsKinesisStream>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type WebAppFirewallTransforms = {
  webAppFirewallCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type OpenSearchDomainTransforms = {
  openSearchDomain?: (props: Partial<AwsOpensearchserviceDomain>) => Partial<AwsOpensearchserviceDomain>;
  openSearchSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  openSearchCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type EfsFilesystemTransforms = {
  efsFilesystem?: (props: Partial<AwsEfsFilesystem>) => Partial<AwsEfsFilesystem>;
  efsSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type NextjsWebTransforms = {
  openNextHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  openNextAssetReplacerCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  openNextDynamoInsertCustomResource?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  customResourceEdgeLambda?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  sqsQueue?: (props: Partial<AwsSqsQueue>) => Partial<AwsSqsQueue>;
  sqsQueuePolicy?: (props: Partial<AwsSqsQueuepolicy>) => Partial<AwsSqsQueuepolicy>;
  dynamoGlobalTable?: (props: Partial<AwsDynamodbGlobaltable>) => Partial<AwsDynamodbGlobaltable>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AstroWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type NuxtWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type SvelteKitWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type SolidStartWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type TanStackWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type RemixWebTransforms = {
  ssrWebHostHeaderRewriteFunction?: (props: Partial<AwsCloudfrontFunction>) => Partial<AwsCloudfrontFunction>;
  bucket?: (props: Partial<AwsS3Bucket>) => Partial<AwsS3Bucket>;
  bucketPolicy?: (props: Partial<AwsS3Bucketpolicy>) => Partial<AwsS3Bucketpolicy>;
  cloudfrontOriginAccessIdentity?: (props: Partial<AwsCloudfrontCloudfrontoriginaccessidentity>) => Partial<AwsCloudfrontCloudfrontoriginaccessidentity>;
  cloudfrontCustomCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontDefaultCachePolicy?: (props: Partial<AwsCloudfrontCachepolicy>) => Partial<AwsCloudfrontCachepolicy>;
  cloudfrontCustomOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDefaultOriginRequestPolicy?: (props: Partial<AwsCloudfrontOriginrequestpolicy>) => Partial<AwsCloudfrontOriginrequestpolicy>;
  cloudfrontDistribution?: (props: Partial<AwsCloudfrontDistribution>) => Partial<AwsCloudfrontDistribution>;
  customResourceDefaultDomain?: (props: Partial<AwsCloudformationCustomresource>) => Partial<AwsCloudformationCustomresource>;
  dnsRecord?: (props: Partial<AwsRoute53Recordset>) => Partial<AwsRoute53Recordset>;
  lambdaRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  lambda?: (props: Partial<AwsLambdaFunction>) => Partial<AwsLambdaFunction>;
  lambdaLogGroup?: (props: Partial<AwsLogsLoggroup>) => Partial<AwsLogsLoggroup>;
  lambdaUrl?: (props: Partial<AwsLambdaUrl>) => Partial<AwsLambdaUrl>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type BastionTransforms = {
  bastionCloudwatchSsmDocument?: (props: Partial<AwsSsmDocument>) => Partial<AwsSsmDocument>;
  bastionEc2AutoscalingGroup?: (props: Partial<AwsAutoscalingAutoscalinggroup>) => Partial<AwsAutoscalingAutoscalinggroup>;
  bastionSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  bastionEc2LaunchTemplate?: (props: Partial<AwsEc2Launchtemplate>) => Partial<AwsEc2Launchtemplate>;
  bastionRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  bastionEc2InstanceProfile?: (props: Partial<AwsIamInstanceprofile>) => Partial<AwsIamInstanceprofile>;
  bastionCwAgentSsmAssociation?: (props: Partial<AwsSsmAssociation>) => Partial<AwsSsmAssociation>;
  bastionSsmAgentSsmAssociation?: (props: Partial<AwsSsmAssociation>) => Partial<AwsSsmAssociation>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AgentCoreRuntimeTransforms = {
  agentCoreRuntimeRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  workloadSecurityGroup?: (props: Partial<AwsEc2Securitygroup>) => Partial<AwsEc2Securitygroup>;
  agentCoreRuntime?: (props: Partial<AwsBedrockagentcoreRuntime>) => Partial<AwsBedrockagentcoreRuntime>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AgentCoreMemoryTransforms = {
  agentCoreMemory?: (props: Partial<AwsBedrockagentcoreMemory>) => Partial<AwsBedrockagentcoreMemory>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AgentCoreGatewayTransforms = {
  agentCoreGatewayRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  agentCoreGateway?: (props: Partial<AwsBedrockagentcoreGateway>) => Partial<AwsBedrockagentcoreGateway>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AgentCoreBrowserTransforms = {
  agentCoreBrowserRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  agentCoreBrowser?: (props: Partial<AwsBedrockagentcoreBrowsercustom>) => Partial<AwsBedrockagentcoreBrowsercustom>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};

export type AgentCoreCodeInterpreterTransforms = {
  agentCoreCodeInterpreterRole?: (props: Partial<AwsIamRole>) => Partial<AwsIamRole>;
  agentCoreCodeInterpreter?: (props: Partial<AwsBedrockagentcoreCodeinterpretercustom>) => Partial<AwsBedrockagentcoreCodeinterpretercustom>;
  /** Index signature for dynamic CloudFormation resource names */
  [key: string]: ((props: Record<string, unknown>) => Record<string, unknown>) | undefined;
};


// ==========================================
// RESOURCE CLASS DECLARATIONS
// ==========================================

export declare class RelationalDatabase extends BaseResource {
  /**
   * #### A fully managed relational (SQL) database resource.
   * 
   * ---
   * 
   * Supports various database engines like PostgreSQL, MySQL, and MariaDB, with features like clustering and high availability.
   */
  constructor(properties: RelationalDatabasePropsWithOverrides);
  constructor(name: string, properties: RelationalDatabasePropsWithOverrides);
  /** Connection string for the database */
  readonly connectionString: string;
  /** JDBC connection string */
  readonly jdbcConnectionString: string;
  /** Database host */
  readonly host: string;
  /** Database port */
  readonly port: string;
  /** Database name */
  readonly dbName: string;
  /** Reader endpoint host */
  readonly readerHost: string;
  /** Reader connection string */
  readonly readerConnectionString: string;
  /** Reader JDBC connection string */
  readonly readerJdbcConnectionString: string;
}
export declare class WebService extends BaseResource {
  /**
   * #### A container running 24/7 with a public HTTPS URL.
   * 
   * ---
   * 
   * Use for APIs, web apps, and any service that needs to be always-on and reachable from the internet.
   * Includes TLS/SSL, auto-scaling, health checks, and zero-downtime deployments.
   */
  constructor(properties: WebServiceProps);
  constructor(name: string, properties: WebServiceProps);
  /** Web service domain */
  readonly domain: string;
  /** Web service URL */
  readonly url: string;
  /** Custom domains */
  readonly customDomains: string;
  /** Custom domain URLs */
  readonly customDomainUrls: string;
}
export declare class PrivateService extends BaseResource {
  /**
   * #### Always-on container with a private endpoint, reachable only from other resources in your stack.
   * 
   * ---
   * 
   * Use for internal APIs, microservices, or gRPC servers that shouldn't be publicly accessible.
   * Other containers in the same stack can reach it by name (e.g., `http://myService:3000`).
   */
  constructor(properties: PrivateServiceProps);
  constructor(name: string, properties: PrivateServiceProps);
  /** Private service address */
  readonly address: string;
}
export declare class WorkerService extends BaseResource {
  /**
   * #### Always-on container with no public URL. For background workers, queue processors, and internal tasks.
   * 
   * ---
   * 
   * Runs 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources.
   */
  constructor(properties: WorkerServiceProps);
  constructor(name: string, properties: WorkerServiceProps);
}
export declare class MultiContainerWorkload extends BaseResource {
  /**
   * Create a MultiContainerWorkload resource
   */
  constructor(properties: ContainerWorkloadProps);
  constructor(name: string, properties: ContainerWorkloadProps);
  /** Log group ARN */
  readonly logGroupArn: string;
}
export declare class LambdaFunction extends BaseResource {
  /**
   * #### A serverless compute resource that runs your code in response to events.
   * 
   * ---
   * 
   * Lambda functions are short-lived, stateless, and scale automatically. You only pay for the compute time you consume.
   */
  constructor(properties: LambdaFunctionProps);
  constructor(name: string, properties: LambdaFunctionProps);
  /** Function ARN */
  readonly arn: string;
  /** Log group ARN */
  readonly logGroupArn: string;
}
export declare class BatchJob extends BaseResource {
  /**
   * #### Run containerized tasks to completion — data processing, ML training, video encoding, etc.
   * 
   * ---
   * 
   * Pay only for the compute time used. Supports CPU and GPU workloads, retries on failure,
   * and can be triggered by schedules, HTTP requests, S3 uploads, or queue messages.
   */
  constructor(properties: BatchJobProps);
  constructor(name: string, properties: BatchJobProps);
  /** Job definition ARN */
  readonly jobDefinitionArn: string;
  /** State machine ARN */
  readonly stateMachineArn: string;
  /** Log group ARN */
  readonly logGroupArn: string;
}
export declare class Bucket extends BaseResource {
  /**
   * #### S3 storage bucket for files, images, backups, or any binary data.
   * 
   * ---
   * 
   * Pay only for what you store and transfer. Highly durable (99.999999999%).
   */
  constructor(properties: BucketPropsWithOverrides);
  constructor(name: string, properties: BucketPropsWithOverrides);
  /** Bucket name */
  readonly name: string;
  /** Bucket ARN */
  readonly arn: string;
}
export declare class HostingBucket extends BaseResource {
  /**
   * #### Host a static website (React, Vue, Astro, etc.) on S3 + CloudFront CDN.
   * 
   * ---
   * 
   * Combines S3 storage with a global CDN for fast, cheap, and scalable static site hosting.
   * Includes build step, custom domains, caching presets, and environment injection.
   */
  constructor(properties: HostingBucketPropsWithOverrides);
  constructor(name: string, properties: HostingBucketPropsWithOverrides);
  /** Bucket name */
  readonly name: string;
  /** Bucket ARN */
  readonly arn: string;
}
export declare class DynamoDbTable extends BaseResource {
  /**
   * #### Serverless NoSQL database with single-digit millisecond reads/writes at any scale.
   * 
   * ---
   * 
   * No servers to manage, no capacity planning needed (in on-demand mode). Pay per read/write.
   * Great for user profiles, session data, IoT data, and any key-value or document workload.
   */
  constructor(properties: DynamoDbTablePropsWithOverrides);
  constructor(name: string, properties: DynamoDbTablePropsWithOverrides);
  /** Table name */
  readonly name: string;
  /** Table ARN */
  readonly arn: string;
  /** Stream ARN */
  readonly streamArn: string;
}
export declare class EventBus extends BaseResource {
  /**
   * #### Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.
   * 
   * ---
   * 
   * Use to build event-driven architectures where producers and consumers are independent.
   * Functions, batch jobs, and other resources can subscribe to specific event patterns.
   */
  constructor(properties: EventBusPropsWithOverrides);
  constructor(name: string, properties: EventBusPropsWithOverrides);
  /** Event bus ARN */
  readonly arn: string;
  /** Archive ARN */
  readonly archiveArn: string;
}
export declare class HttpApiGateway extends BaseResource {
  /**
   * #### Serverless HTTP API with pay-per-request pricing (~$1/million requests).
   * 
   * ---
   * 
   * Routes HTTP requests to Lambda functions, containers, or other backends.
   * No servers to manage. Includes built-in throttling, CORS, and TLS.
   */
  constructor(properties: HttpApiGatewayPropsWithOverrides);
  constructor(name: string, properties: HttpApiGatewayPropsWithOverrides);
  /** API Gateway domain */
  readonly domain: string;
  /** API Gateway URL */
  readonly url: string;
  /** Custom domains */
  readonly customDomains: string;
  /** Custom domain URLs */
  readonly customDomainUrls: string;
  /** First custom domain URL */
  readonly customDomainUrl: string;
}
export declare class ApplicationLoadBalancer extends BaseResource {
  /**
   * #### HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.
   * 
   * ---
   * 
   * Routes requests to containers or Lambda functions based on path, host, headers, or query params.
   * More cost-effective than API Gateway above ~500k requests/day. AWS Free Tier eligible.
   */
  constructor(properties: ApplicationLoadBalancerPropsWithOverrides);
  constructor(name: string, properties: ApplicationLoadBalancerPropsWithOverrides);
  /** Load balancer domain */
  readonly domain: string;
  /** Custom domains */
  readonly customDomains: string;
}
export declare class NetworkLoadBalancer extends BaseResource {
  /**
   * #### TCP/TLS load balancer for non-HTTP traffic (MQTT, game servers, custom protocols).
   * 
   * ---
   * 
   * Handles millions of connections with ultra-low latency. Use when you need raw TCP/TLS
   * instead of HTTP routing. Does not support CDN, firewall, or gradual deployments.
   */
  constructor(properties: NetworkLoadBalancerPropsWithOverrides);
  constructor(name: string, properties: NetworkLoadBalancerPropsWithOverrides);
  /** Load balancer domain */
  readonly domain: string;
  /** Custom domains */
  readonly customDomains: string;
}
export declare class RedisCluster extends BaseResource {
  /**
   * #### In-memory data store for caching, sessions, queues, and real-time data. Sub-millisecond latency.
   */
  constructor(properties: RedisClusterPropsWithOverrides);
  constructor(name: string, properties: RedisClusterPropsWithOverrides);
  /** Redis host */
  readonly host: string;
  /** Redis reader host */
  readonly readerHost: string;
  /** Redis port */
  readonly port: string;
  /** Sharding status */
  readonly sharding: string;
}
export declare class MongoDbAtlasCluster extends BaseResource {
  /**
   * #### Managed MongoDB database (Atlas) deployed into your AWS account and managed within your stack.
   * 
   * ---
   * 
   * Document database with flexible schemas — great for content management, user profiles, catalogs, and apps
   * where your data model evolves. Starts at M2 (shared, ~$9/month) or M10 (dedicated, ~$57/month).
   */
  constructor(properties: import('./plain').MongoDbAtlasClusterProps);
  constructor(name: string, properties: import('./plain').MongoDbAtlasClusterProps);
  /** MongoDB connection string */
  readonly connectionString: string;
}
export declare class StateMachine extends BaseResource {
  /**
   * #### Visual workflow engine for orchestrating Lambda functions, API calls, and other AWS services.
   * 
   * ---
   * 
   * Define multi-step workflows with branching, retries, parallel execution, and error handling —
   * all without writing orchestration code. Pay per state transition (~$0.025/1,000 transitions).
   * Defined using [Amazon States Language (ASL)](https://states-language.net/spec.html).
   */
  constructor(properties: StateMachineProps);
  constructor(name: string, properties: StateMachineProps);
  /** State machine ARN */
  readonly arn: string;
  /** State machine name */
  readonly name: string;
}
export declare class UserAuthPool extends BaseResource {
  /**
   * #### A resource for managing user authentication and authorization.
   * 
   * ---
   * 
   * A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
   * It provides a secure and scalable way to manage user identities for your applications.
   */
  constructor(properties: UserAuthPoolPropsWithOverrides);
  constructor(name: string, properties: UserAuthPoolPropsWithOverrides);
  /** User pool ID */
  readonly id: string;
  /** Client ID */
  readonly clientId: string;
  /** User pool domain */
  readonly domain: string;
}
export declare class UpstashRedis extends BaseResource {
  /**
   * #### Serverless Redis by Upstash — pay-per-request with no idle costs.
   * 
   * ---
   * 
   * Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
   * Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.
   */
  constructor(properties: import('./plain').UpstashRedisProps);
  constructor(name: string, properties: import('./plain').UpstashRedisProps);
  /** Upstash Redis host */
  readonly host: string;
  /** Upstash Redis port */
  readonly port: string;
  /** Password */
  readonly password: string;
  /** REST token */
  readonly restToken: string;
  /** Read-only REST token */
  readonly readOnlyRestToken: string;
  /** REST URL */
  readonly restUrl: string;
  /** Redis URL */
  readonly redisUrl: string;
}
export declare class SqsQueue extends BaseResource {
  /**
   * #### Message queue for decoupling services. Producers send messages, consumers process them at their own pace.
   * 
   * ---
   * 
   * Fully managed, serverless, pay-per-message. Use for background processing, task queues, or buffering between services.
   */
  constructor(properties: SqsQueuePropsWithOverrides);
  constructor(name: string, properties: SqsQueuePropsWithOverrides);
  /** Queue ARN */
  readonly arn: string;
  /** Queue URL */
  readonly url: string;
  /** Queue name */
  readonly name: string;
}
export declare class SnsTopic extends BaseResource {
  /**
   * #### Pub/sub messaging: publish once, deliver to many subscribers (Lambda, SQS, email, SMS, HTTP).
   * 
   * ---
   * 
   * Serverless, pay-per-message. Use when one event needs to trigger multiple actions — e.g., order placed
   * triggers email confirmation + inventory update + analytics. Subscribers are configured on the subscriber side.
   */
  constructor(properties: SnsTopicPropsWithOverrides);
  constructor(name: string, properties: SnsTopicPropsWithOverrides);
  /** Topic ARN */
  readonly arn: string;
  /** Topic name */
  readonly name: string;
}
export declare class KinesisStream extends BaseResource {
  /**
   * #### Real-time data stream for ingesting high-volume events (logs, clickstreams, IoT, analytics).
   * 
   * ---
   * 
   * Continuously captures data from many producers. Consumers (Lambda functions, etc.) process records in order.
   * Use when you need real-time processing with sub-second latency, not just async messaging (use SQS for that).
   */
  constructor(properties: KinesisStreamPropsWithOverrides);
  constructor(name: string, properties: KinesisStreamPropsWithOverrides);
}
export declare class WebAppFirewall extends BaseResource {
  /**
   * #### Protects your APIs and websites from common attacks (SQL injection, XSS, bots, DDoS).
   * 
   * ---
   * 
   * Attach to an HTTP API Gateway, Application Load Balancer, or CDN. Comes with AWS-managed rule sets
   * by default. Costs ~$5/month base + $1/million requests inspected.
   */
  constructor(properties: WebAppFirewallPropsWithOverrides);
  constructor(name: string, properties: WebAppFirewallPropsWithOverrides);
  /** Firewall ARN */
  readonly arn: string;
  /** Firewall scope */
  readonly scope: string;
}
export declare class OpenSearchDomain extends BaseResource {
  /**
   * #### Managed search and analytics engine (OpenSearch/Elasticsearch compatible).
   * 
   * ---
   * 
   * Full-text search, log analytics, and real-time dashboards. Use for search features in your app,
   * centralized logging, or time-series data analysis. Costs start at ~$50/month (single small node).
   */
  constructor(properties: OpenSearchDomainPropsWithOverrides);
  constructor(name: string, properties: OpenSearchDomainPropsWithOverrides);
  /** OpenSearch domain endpoint */
  readonly domainEndpoint: string;
  /** Domain ARN */
  readonly arn: string;
}
export declare class EfsFilesystem extends BaseResource {
  /**
   * #### Shared file storage that multiple containers can read/write simultaneously.
   * 
   * ---
   * 
   * Persistent, elastic (grows/shrinks automatically), and accessible from any container in your stack
   * via `volumeMounts`. Use for shared uploads, CMS media, ML model files, or anything that needs to
   * survive container restarts. Pay only for storage used (~$0.30/GB/month for standard access).
   */
  constructor(properties: EfsFilesystemPropsWithOverrides);
  constructor(name: string, properties: EfsFilesystemPropsWithOverrides);
  /** EFS ARN */
  readonly arn: string;
  /** EFS ID */
  readonly id: string;
}
export declare class NextjsWeb extends BaseResource {
  /**
   * #### Deploy a Next.js app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN.
   * 
   * ---
   * 
   * Handles ISR (Incremental Static Regeneration), image optimization, and middleware out of the box.
   * Optionally deploy to Lambda@Edge for lower latency or enable response streaming.
   */
  constructor(properties: NextjsWebProps);
  constructor(name: string, properties: NextjsWebProps);
  /** Website URL */
  readonly url: string;
}
export declare class AstroWeb extends BaseResource {
  /**
   * #### Deploy an Astro SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
   * 
   * ---
   * 
   * For static-only Astro sites, use `hosting-bucket` with `hostingContentType: 'astro-static-website'` instead.
   */
  constructor(properties: AstroWebPropsWithOverrides);
  constructor(name: string, properties: AstroWebPropsWithOverrides);
  /** Website URL */
  readonly url: string;
}
export declare class NuxtWeb extends BaseResource {
  /**
   * #### Deploy a Nuxt SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
   * 
   * ---
   * 
   * For static-only Nuxt sites, use `hosting-bucket` with `hostingContentType: 'nuxt-static-website'` instead.
   */
  constructor(properties: NuxtWebProps);
  constructor(name: string, properties: NuxtWebProps);
  /** Website URL */
  readonly url: string;
}
export declare class SvelteKitWeb extends BaseResource {
  /**
   * #### Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
   * 
   * ---
   * 
   * For static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead.
   */
  constructor(properties: SvelteKitWebPropsWithOverrides);
  constructor(name: string, properties: SvelteKitWebPropsWithOverrides);
  /** Website URL */
  readonly url: string;
}
export declare class SolidStartWeb extends BaseResource {
  /**
   * #### Deploy a SolidStart SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
   */
  constructor(properties: SolidStartWebPropsWithOverrides);
  constructor(name: string, properties: SolidStartWebPropsWithOverrides);
  /** Website URL */
  readonly url: string;
}
export declare class TanStackWeb extends BaseResource {
  /**
   * #### Deploy a TanStack Start SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
   */
  constructor(properties: TanStackWebPropsWithOverrides);
  constructor(name: string, properties: TanStackWebPropsWithOverrides);
  /** Website URL */
  readonly url: string;
}
export declare class RemixWeb extends BaseResource {
  /**
   * #### Deploy a Remix SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
   */
  constructor(properties: RemixWebPropsWithOverrides);
  constructor(name: string, properties: RemixWebPropsWithOverrides);
  /** Website URL */
  readonly url: string;
}
export declare class Bastion extends BaseResource {
  /**
   * #### Secure jump box for accessing private resources (databases, Redis, OpenSearch) in your VPC.
   * 
   * ---
   * 
   * Uses keyless SSH via AWS Systems Manager — no SSH keys to manage. Connect with `stacktape bastion:ssh`
   * or create port-forwarding tunnels with `stacktape bastion:tunnel`. Costs ~$4/month (t3.micro).
   */
  constructor(properties: BastionPropsWithOverrides);
  constructor(name: string, properties: BastionPropsWithOverrides);
}
export declare class AgentCoreRuntime extends BaseResource {
  /**
   * Create a AgentCoreRuntime resource
   */
  constructor(properties: AgentCoreRuntimeProps);
  constructor(name: string, properties: AgentCoreRuntimeProps);
  /** AgentCore runtime ID */
  readonly id: string;
  /** AgentCore runtime ARN */
  readonly arn: string;
  /** Default runtime endpoint name */
  readonly endpointName: string;
  /** Default runtime endpoint ARN */
  readonly endpointArn: string;
}
export declare class AgentCoreMemory extends BaseResource {
  /**
   * Create a AgentCoreMemory resource
   */
  constructor(properties: AgentCoreMemoryPropsWithOverrides);
  constructor(name: string, properties: AgentCoreMemoryPropsWithOverrides);
  /** AgentCore memory ID */
  readonly id: string;
  /** AgentCore memory ARN */
  readonly arn: string;
}
export declare class AgentCoreGateway extends BaseResource {
  /**
   * Create a AgentCoreGateway resource
   */
  constructor(properties: AgentCoreGatewayPropsWithOverrides);
  constructor(name: string, properties: AgentCoreGatewayPropsWithOverrides);
  /** AgentCore gateway ID */
  readonly id: string;
  /** AgentCore gateway ARN */
  readonly arn: string;
  /** AgentCore gateway URL */
  readonly url: string;
}
export declare class AgentCoreBrowser extends BaseResource {
  /**
   * Create a AgentCoreBrowser resource
   */
  constructor(properties: AgentCoreBrowserPropsWithOverrides);
  constructor(name: string, properties: AgentCoreBrowserPropsWithOverrides);
  /** AgentCore browser ID */
  readonly id: string;
  /** AgentCore browser ARN */
  readonly arn: string;
}
export declare class AgentCoreCodeInterpreter extends BaseResource {
  /**
   * Create a AgentCoreCodeInterpreter resource
   */
  constructor(properties: AgentCoreCodeInterpreterPropsWithOverrides);
  constructor(name: string, properties: AgentCoreCodeInterpreterPropsWithOverrides);
  /** AgentCore code interpreter ID */
  readonly id: string;
  /** AgentCore code interpreter ARN */
  readonly arn: string;
}

// ==========================================
// TYPE PROPERTIES CLASS DECLARATIONS
// ==========================================


export declare class RdsEnginePostgres extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'postgres';
}

export declare class RdsEngineMariadb extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'mariadb';
}

export declare class RdsEngineMysql extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'mysql';
}

export declare class RdsEngineOracleEE extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'oracle-ee';
}

export declare class RdsEngineOracleSE2 extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'oracle-se2';
}

export declare class RdsEngineSqlServerEE extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'sqlserver-ee';
}

export declare class RdsEngineSqlServerEX extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'sqlserver-ex';
}

export declare class RdsEngineSqlServerSE extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'sqlserver-se';
}

export declare class RdsEngineSqlServerWeb extends BaseTypeProperties {
  /**
   * #### Standard RDS: single-instance database with predictable pricing.
   * 
   * ---
   * 
   * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
   * For high availability, enable `multiAz` on the primary instance.
   */
  constructor(properties: import('./plain').RdsEngineProperties);
  readonly type: 'sqlserver-web';
}

export declare class AuroraEnginePostgresql extends BaseTypeProperties {
  /**
   * #### Aurora: high-performance clustered database with auto-failover.
   * 
   * ---
   * 
   * Up to 5x faster than MySQL, 3x faster than PostgreSQL. Data is replicated across 3 AZs
   * automatically. If the primary instance fails, a read replica is promoted in seconds.
   */
  constructor(properties: import('./plain').AuroraEngineProperties);
  readonly type: 'aurora-postgresql';
}

export declare class AuroraEngineMysql extends BaseTypeProperties {
  /**
   * #### Aurora: high-performance clustered database with auto-failover.
   * 
   * ---
   * 
   * Up to 5x faster than MySQL, 3x faster than PostgreSQL. Data is replicated across 3 AZs
   * automatically. If the primary instance fails, a read replica is promoted in seconds.
   */
  constructor(properties: import('./plain').AuroraEngineProperties);
  readonly type: 'aurora-mysql';
}

export declare class AuroraServerlessEnginePostgresql extends BaseTypeProperties {
  /**
   * #### Aurora Serverless v1: auto-scaling database that can pause when idle.
   * 
   * ---
   * 
   * Scales compute capacity automatically and pauses during inactivity (you only pay for storage).
   * 
   * > **For new projects, use Aurora Serverless v2 instead** — it has faster scaling and more granular capacity control.
   */
  constructor(properties: import('./plain').AuroraServerlessEngineProperties);
  readonly type: 'aurora-postgresql-serverless';
}

export declare class AuroraServerlessEngineMysql extends BaseTypeProperties {
  /**
   * #### Aurora Serverless v1: auto-scaling database that can pause when idle.
   * 
   * ---
   * 
   * Scales compute capacity automatically and pauses during inactivity (you only pay for storage).
   * 
   * > **For new projects, use Aurora Serverless v2 instead** — it has faster scaling and more granular capacity control.
   */
  constructor(properties: import('./plain').AuroraServerlessEngineProperties);
  readonly type: 'aurora-mysql-serverless';
}

export declare class AuroraServerlessV2EnginePostgresql extends BaseTypeProperties {
  /**
   * #### Aurora Serverless v2: recommended for most new projects.
   * 
   * ---
   * 
   * Scales instantly from 0.5 to 128 ACUs in 0.5-ACU increments (~1 ACU ≈ 2 GB RAM).
   * You pay only for the capacity used, making it cost-effective for variable workloads.
   */
  constructor(properties: import('./plain').AuroraServerlessV2EngineProperties);
  readonly type: 'aurora-postgresql-serverless-v2';
}

export declare class AuroraServerlessV2EngineMysql extends BaseTypeProperties {
  /**
   * #### Aurora Serverless v2: recommended for most new projects.
   * 
   * ---
   * 
   * Scales instantly from 0.5 to 128 ACUs in 0.5-ACU increments (~1 ACU ≈ 2 GB RAM).
   * You pay only for the capacity used, making it cost-effective for variable workloads.
   */
  constructor(properties: import('./plain').AuroraServerlessV2EngineProperties);
  readonly type: 'aurora-mysql-serverless-v2';
}

export declare class StacktapeLambdaBuildpackPackaging extends BaseTypeProperties {
  /**
   * #### A zero-config buildpack that packages your code for AWS Lambda.
   * 
   * ---
   * 
   * The `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.
   * 
   * **Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.
   * 
   * For JS/TS, your code is bundled into a single file. Source maps are automatically generated.
   * Packages are cached based on a checksum, so unchanged code is not re-packaged.
   */
  constructor(properties: import('./plain').StpBuildpackLambdaPackagingProps);
  readonly type: 'stacktape-lambda-buildpack';
}

export declare class CustomArtifactLambdaPackaging extends BaseTypeProperties {
  /**
   * #### Uses a pre-built artifact for Lambda deployment.
   * 
   * ---
   * 
   * With `custom-artifact`, you provide a path to your own pre-built deployment package.
   * If the specified path is a directory or an unzipped file, Stacktape will automatically zip it.
   * 
   * This is useful when you have custom build processes or need full control over the packaging.
   */
  constructor(properties: import('./plain').CustomArtifactLambdaPackagingProps);
  readonly type: 'custom-artifact';
}

export declare class PrebuiltImagePackaging extends BaseTypeProperties {
  /**
   * #### Uses a pre-built container image.
   * 
   * ---
   * 
   * With `prebuilt-image`, you provide a reference to an existing container image.
   * This can be a public image from Docker Hub or a private image from any container registry.
   * 
   * For private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager.
   */
  constructor(properties: import('./plain').PrebuiltImageCwPackagingProps);
  readonly type: 'prebuilt-image';
}

export declare class CustomDockerfilePackaging extends BaseTypeProperties {
  /**
   * #### Builds a container image from your own Dockerfile.
   * 
   * ---
   * 
   * With `custom-dockerfile`, you provide a path to your Dockerfile and build context.
   * Stacktape builds the image and uploads it to a managed ECR repository.
   * 
   * This gives you full control over the container environment and is ideal for complex setups.
   */
  constructor(properties: import('./plain').CustomDockerfileCwImagePackagingProps);
  readonly type: 'custom-dockerfile';
}

export declare class ExternalBuildpackPackaging extends BaseTypeProperties {
  /**
   * #### Builds a container image using an external buildpack.
   * 
   * ---
   * 
   * External buildpacks (buildpacks.io) automatically detect your application type
   * and build an optimized container image with zero configuration.
   * 
   * The default builder is `paketobuildpacks/builder-jammy-base`.
   * You can find buildpacks for almost any language or framework.
   */
  constructor(properties: import('./plain').ExternalBuildpackCwImagePackagingProps);
  readonly type: 'external-buildpack';
}

export declare class NixpacksPackaging extends BaseTypeProperties {
  /**
   * #### Builds a container image using Nixpacks.
   * 
   * ---
   * 
   * Nixpacks automatically detects your application type and builds an optimized container image.
   * In most cases, no configuration is required.
   * 
   * It supports a wide range of languages and frameworks out of the box.
   */
  constructor(properties: import('./plain').NixpacksCwImagePackagingProps);
  readonly type: 'nixpacks';
}

export declare class StacktapeImageBuildpackPackaging extends BaseTypeProperties {
  /**
   * #### A zero-config buildpack that creates a container image from your source code.
   * 
   * ---
   * 
   * The `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.
   * 
   * **Supported languages:** JavaScript, TypeScript, Python, Java, and Go.
   * 
   * For JS/TS, your code is bundled into a single file with source maps.
   * The resulting image is uploaded to a managed ECR repository.
   */
  constructor(properties: import('./plain').StpBuildpackCwImagePackagingProps);
  readonly type: 'stacktape-image-buildpack';
}

export declare class HttpApiIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when an HTTP API Gateway receives a matching request.
   * 
   * ---
   * 
   * Routes are matched by specificity — exact paths take priority over wildcard paths.
   */
  constructor(properties: import('./plain').HttpApiIntegration['properties']);
  readonly type: 'http-api-gateway';
}

export declare class S3Integration extends BaseTypeProperties {
  /**
   * #### Triggers a function when files are created, deleted, or restored in an S3 bucket.
   */
  constructor(properties: import('./plain').S3Integration['properties']);
  readonly type: 's3';
}

export declare class ScheduleIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function on a recurring schedule (cron jobs, periodic tasks).
   * 
   * ---
   * 
   * Two formats:
   * - **Rate**: `rate(5 minutes)`, `rate(1 hour)`, `rate(7 days)`
   * - **Cron**: `cron(0 18 ? * MON-FRI *)` (6-field AWS cron, all times UTC)
   */
  constructor(properties: import('./plain').ScheduleIntegration['properties']);
  readonly type: 'schedule';
}

export declare class SnsIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when a new message is published to an SNS topic.
   * 
   * ---
   * 
   * SNS is a pub/sub messaging service. Reference a topic from your stack's `snsTopics` or use an external ARN.
   */
  constructor(properties: import('./plain').SnsIntegration['properties']);
  readonly type: 'sns';
}

export declare class SqsIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when new messages are available in an SQS queue.
   * 
   * ---
   * 
   * Messages are processed in batches. The function fires when `batchSize` is reached,
   * `maxBatchWindowSeconds` expires, or the 6 MB payload limit is hit.
   * 
   * **Important:** A single SQS queue should only have one consumer function. For fan-out (multiple
   * consumers for the same message), use an SNS topic or EventBridge event bus instead.
   */
  constructor(properties: import('./plain').SqsIntegration['properties']);
  readonly type: 'sqs';
}

export declare class KinesisIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when new records are available in a Kinesis Data Stream.
   * 
   * ---
   * 
   * Records are processed in batches. Two consumption modes:
   * - **Direct**: Polls each shard ~1/sec, throughput shared with other consumers.
   * - **Stream Consumer** (`autoCreateConsumer`): Dedicated connection per shard — higher throughput, lower latency.
   */
  constructor(properties: import('./plain').KinesisIntegration['properties']);
  readonly type: 'kinesis-stream';
}

export declare class DynamoDbIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when items are created, updated, or deleted in a DynamoDB table.
   * 
   * ---
   * 
   * Records are processed in batches. You must enable streams on the DynamoDB table first
   * (set `streaming` in your `dynamoDbTables` config).
   */
  constructor(properties: import('./plain').DynamoDbIntegration['properties']);
  readonly type: 'dynamo-db-stream';
}

export declare class CloudwatchLogIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when new log records appear in a CloudWatch log group.
   * 
   * ---
   * 
   * **Note:** The event payload is base64-encoded and gzipped — you must decode and decompress it in your handler.
   */
  constructor(properties: import('./plain').CloudwatchLogIntegration['properties']);
  readonly type: 'cloudwatch-log';
}

export declare class ApplicationLoadBalancerIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
   * 
   * ---
   * 
   * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
   */
  constructor(properties: import('./plain').ApplicationLoadBalancerIntegration['properties']);
  readonly type: 'application-load-balancer';
}

export declare class EventBusIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a batch job when an event matching a specified pattern is received by an event bus.
   * 
   * ---
   * 
   * You can use a custom event bus or the default AWS event bus.
   */
  constructor(properties: import('./plain').EventBusIntegration['properties']);
  readonly type: 'event-bus';
}

export declare class KafkaTopicIntegration extends BaseTypeProperties {
  /**
   * #### Triggers a function when new messages are available in a Kafka topic.
   */
  constructor(properties: import('./plain').KafkaTopicIntegration['properties']);
  readonly type: 'kafka-topic';
}

export declare class AlarmIntegration extends BaseTypeProperties {
  /**
   * Create a AlarmIntegration
   */
  constructor(properties: import('./plain').AlarmIntegration['properties']);
  readonly type: 'cloudwatch-alarm';
}

export declare class IotIntegration extends BaseTypeProperties {
  /**
   * Create a IotIntegration
   */
  constructor(properties: Record<string, unknown>);
  readonly type: 'iot';
}

export declare class CdnLoadBalancerRoute extends BaseTypeProperties {
  /**
   * Create a CdnLoadBalancerRoute
   */
  constructor(properties: import('./plain').CdnLoadBalancerOrigin);
  readonly type: 'application-load-balancer';
}

export declare class CdnHttpApiGatewayRoute extends BaseTypeProperties {
  /**
   * Create a CdnHttpApiGatewayRoute
   */
  constructor(properties: import('./plain').CdnHttpApiGatewayOrigin);
  readonly type: 'http-api-gateway';
}

export declare class CdnLambdaFunctionRoute extends BaseTypeProperties {
  /**
   * Create a CdnLambdaFunctionRoute
   */
  constructor(properties: import('./plain').CdnLambdaFunctionOrigin);
  readonly type: 'function';
}

export declare class CdnCustomDomainRoute extends BaseTypeProperties {
  /**
   * Create a CdnCustomDomainRoute
   */
  constructor(properties: import('./plain').CdnCustomOrigin);
  readonly type: 'custom-origin';
}

export declare class CdnBucketRoute extends BaseTypeProperties {
  /**
   * Create a CdnBucketRoute
   */
  constructor(properties: import('./plain').CdnBucketOrigin);
  readonly type: 'bucket';
}

export declare class ManagedRuleGroup extends BaseTypeProperties {
  /**
   * Create a ManagedRuleGroup
   */
  constructor(properties: import('./plain').ManagedRuleGroupProps);
  readonly type: 'managed-rule-group';
}

export declare class CustomRuleGroup extends BaseTypeProperties {
  /**
   * Create a CustomRuleGroup
   */
  constructor(properties: import('./plain').CustomRuleGroupProps);
  readonly type: 'custom-rule-group';
}

export declare class RateBasedRule extends BaseTypeProperties {
  /**
   * Create a RateBasedRule
   */
  constructor(properties: import('./plain').RateBasedStatementProps);
  readonly type: 'rate-based-rule';
}

export declare class SqsQueueEventBusIntegration extends BaseTypeProperties {
  /**
   * #### Routes events from an EventBridge event bus to this queue when they match a specified pattern.
   */
  constructor(properties: import('./plain').SqsQueueEventBusIntegration['properties']);
  readonly type: 'event-bus';
}

export declare class MultiContainerWorkloadHttpApiIntegration extends BaseTypeProperties {
  /**
   * Create a MultiContainerWorkloadHttpApiIntegration
   */
  constructor(properties: import('./plain').ContainerWorkloadHttpApiIntegration['properties']);
  readonly type: 'http-api-gateway';
}

export declare class MultiContainerWorkloadLoadBalancerIntegration extends BaseTypeProperties {
  /**
   * Create a MultiContainerWorkloadLoadBalancerIntegration
   */
  constructor(properties: import('./plain').ContainerWorkloadLoadBalancerIntegration['properties']);
  readonly type: 'application-load-balancer';
}

export declare class MultiContainerWorkloadNetworkLoadBalancerIntegration extends BaseTypeProperties {
  /**
   * Create a MultiContainerWorkloadNetworkLoadBalancerIntegration
   */
  constructor(properties: import('./plain').ContainerWorkloadNetworkLoadBalancerIntegration['properties']);
  readonly type: 'network-load-balancer';
}

export declare class MultiContainerWorkloadInternalIntegration extends BaseTypeProperties {
  /**
   * Create a MultiContainerWorkloadInternalIntegration
   */
  constructor(properties: import('./plain').ContainerWorkloadInternalIntegration['properties']);
  readonly type: 'workload-internal';
}

export declare class MultiContainerWorkloadServiceConnectIntegration extends BaseTypeProperties {
  /**
   * Create a MultiContainerWorkloadServiceConnectIntegration
   */
  constructor(properties: import('./plain').ContainerWorkloadServiceConnectIntegration['properties']);
  readonly type: 'service-connect';
}

export declare class LocalScript extends BaseTypeProperties {
  /**
   * #### A script that runs on your local machine.
   * 
   * ---
   * 
   * Local scripts are executed on the same machine where the Stacktape command is run.
   * They are useful for tasks like building your application, running database migrations, or other automation.
   * 
   * The script must define one of the following: `executeCommand`, `executeScript`, `executeCommands`, or `executeScripts`.
   */
  constructor(properties: LocalScriptProps);
  readonly type: 'local-script';
}

export declare class BastionScript extends BaseTypeProperties {
  /**
   * #### A script that runs remotely on a bastion server.
   * 
   * ---
   * 
   * Bastion scripts are executed on a bastion server within your VPC, not on your local machine.
   * Logs from the script's execution are streamed in real-time to your terminal.
   * 
   * This is useful for running commands that need direct access to VPC resources
   * or for ensuring consistent execution environments across different machines.
   */
  constructor(properties: BastionScriptProps);
  readonly type: 'bastion-script';
}

export declare class LocalScriptWithBastionTunneling extends BaseTypeProperties {
  /**
   * #### A local script with secure tunneling through a bastion host.
   * 
   * ---
   * 
   * This script type runs locally but tunnels connections to resources through a bastion server.
   * It provides a secure, encrypted connection to resources that are only accessible within the VPC,
   * such as private databases or Redis clusters.
   * 
   * The environment variables injected by `connectTo` are automatically adjusted to use the tunneled endpoints.
   */
  constructor(properties: LocalScriptWithBastionTunnelingProps);
  readonly type: 'local-script-with-bastion-tunneling';
}

export declare class HttpEndpointLogForwarding extends BaseTypeProperties {
  /**
   * Create a HttpEndpointLogForwarding
   */
  constructor(properties: import('./plain').HttpEndpointLogForwardingProps);
  readonly type: 'http-endpoint';
}

export declare class HighlightLogForwarding extends BaseTypeProperties {
  /**
   * Create a HighlightLogForwarding
   */
  constructor(properties: import('./plain').HighlightLogForwardingProps);
  readonly type: 'highlight';
}

export declare class DatadogLogForwarding extends BaseTypeProperties {
  /**
   * Create a DatadogLogForwarding
   */
  constructor(properties: import('./plain').DatadogLogForwardingProps);
  readonly type: 'datadog';
}

export declare class ExpirationLifecycleRule extends BaseTypeProperties {
  /**
   * Create a ExpirationLifecycleRule
   */
  constructor(properties: import('./plain').ExpirationProps);
  readonly type: 'expiration';
}

export declare class NonCurrentVersionExpirationLifecycleRule extends BaseTypeProperties {
  /**
   * Create a NonCurrentVersionExpirationLifecycleRule
   */
  constructor(properties: import('./plain').NonCurrentVersionExpirationProps);
  readonly type: 'non-current-version-expiration';
}

export declare class ContainerEfsMount extends BaseTypeProperties {
  /**
   * Create a ContainerEfsMount
   */
  constructor(properties: import('./plain').ContainerEfsMount);
  readonly type: 'efs';
}

export declare class LambdaEfsMount extends BaseTypeProperties {
  /**
   * Create a LambdaEfsMount
   */
  constructor(properties: import('./plain').LambdaEfsMount);
  readonly type: 'efs';
}

export declare class LambdaS3FilesMount extends BaseTypeProperties {
  /**
   * Create a LambdaS3FilesMount
   */
  constructor(properties: import('./plain').LambdaS3FilesMount);
  readonly type: 's3files';
}

export declare class CognitoAuthorizer extends BaseTypeProperties {
  /**
   * Create a CognitoAuthorizer
   */
  constructor(properties: import('./plain').CognitoAuthorizerProperties);
  readonly type: 'cognito';
}

export declare class LambdaAuthorizer extends BaseTypeProperties {
  /**
   * Create a LambdaAuthorizer
   */
  constructor(properties: import('./plain').LambdaAuthorizerProperties);
  readonly type: 'lambda';
}

export declare class ApplicationLoadBalancerCustomTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm based on any Application Load Balancer CloudWatch metric (e.g., connection counts, request counts, target response times).
   */
  constructor(properties: import('./plain').ApplicationLoadBalancerCustomTriggerProps);
  readonly type: 'application-load-balancer-custom';
}

export declare class ApplicationLoadBalancerErrorRateTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the Application Load Balancer error rate (percentage of 4xx/5xx responses) exceeds the threshold.
   */
  constructor(properties: import('./plain').ApplicationLoadBalancerErrorRateTriggerProps);
  readonly type: 'application-load-balancer-error-rate';
}

export declare class ApplicationLoadBalancerUnhealthyTargetsTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the percentage of unhealthy targets behind the Application Load Balancer exceeds the threshold.
   */
  constructor(properties: import('./plain').ApplicationLoadBalancerUnhealthyTargetsTriggerProps);
  readonly type: 'application-load-balancer-unhealthy-targets';
}

export declare class HttpApiGatewayErrorRateTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the HTTP API Gateway error rate (percentage of 4xx/5xx responses) exceeds the threshold.
   */
  constructor(properties: import('./plain').HttpApiGatewayErrorRateTriggerProps);
  readonly type: 'http-api-gateway-error-rate';
}

export declare class HttpApiGatewayLatencyTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when HTTP API Gateway latency exceeds the threshold. Latency is measured from request receipt to response sent.
   */
  constructor(properties: import('./plain').HttpApiGatewayLatencyTriggerProps);
  readonly type: 'http-api-gateway-latency';
}

export declare class RelationalDatabaseReadLatencyTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when database read latency (average time for read I/O operations) exceeds the threshold.
   */
  constructor(properties: import('./plain').RelationalDatabaseReadLatencyTriggerProps);
  readonly type: 'database-read-latency';
}

export declare class RelationalDatabaseWriteLatencyTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when database write latency (average time for write I/O operations) exceeds the threshold.
   */
  constructor(properties: import('./plain').RelationalDatabaseWriteLatencyTriggerProps);
  readonly type: 'database-write-latency';
}

export declare class RelationalDatabaseCPUUtilizationTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when database CPU utilization exceeds the threshold percentage.
   */
  constructor(properties: import('./plain').RelationalDatabaseCPUUtilizationTriggerProps);
  readonly type: 'database-cpu-utilization';
}

export declare class RelationalDatabaseFreeStorageTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when available database storage falls below the threshold (in MB).
   */
  constructor(properties: import('./plain').RelationalDatabaseFreeStorageTriggerProps);
  readonly type: 'database-free-storage';
}

export declare class RelationalDatabaseFreeMemoryTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when available database memory falls below the threshold (in MB).
   */
  constructor(properties: import('./plain').RelationalDatabaseFreeMemoryTriggerProps);
  readonly type: 'database-free-memory';
}

export declare class RelationalDatabaseConnectionCountTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the number of database connections exceeds the threshold.
   */
  constructor(properties: import('./plain').RelationalDatabaseConnectionCountTriggerProps);
  readonly type: 'database-connection-count';
}

export declare class SqsQueueReceivedMessagesCountTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the number of messages received from an SQS queue crosses the threshold.
   */
  constructor(properties: import('./plain').SqsQueueReceivedMessagesCountTriggerProps);
  readonly type: 'sqs-queue-received-messages-count';
}

export declare class SqsQueueNotEmptyTrigger extends BaseTypeOnly {
  /**
   * Triggers an alarm if the SQS queue is not empty. Useful for monitoring dead-letter queues.
   */
  constructor();
  readonly type: 'sqs-queue-not-empty';
}

export declare class LambdaErrorRateTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when the Lambda function error rate (percentage of failed invocations) exceeds the threshold.
   */
  constructor(properties: import('./plain').LambdaErrorRateTriggerProps);
  readonly type: 'lambda-error-rate';
}

export declare class LambdaDurationTrigger extends BaseTypeProperties {
  /**
   * Triggers an alarm when Lambda function execution duration exceeds the threshold (in milliseconds).
   */
  constructor(properties: import('./plain').LambdaDurationTriggerProps);
  readonly type: 'lambda-duration';
}

export declare class CustomResourceDefinition extends BaseTypeProperties {
  /**
   * #### Lambda-backed provisioning logic for resources not natively supported by Stacktape/CloudFormation.
   * 
   * ---
   * 
   * Your Lambda function runs on stack create, update, and delete events to manage external resources
   * (third-party APIs, SaaS services, custom infrastructure). Pair with `custom-resource-instance` to use.
   */
  constructor(properties: import('./plain').CustomResourceDefinitionProps);
  readonly type: 'custom-resource-definition';
}

export declare class CustomResourceInstance extends BaseTypeProperties {
  /**
   * #### An instance of a `custom-resource-definition`. Pass properties to the backing Lambda function.
   */
  constructor(properties: import('./plain').CustomResourceInstanceProps);
  readonly type: 'custom-resource-instance';
}

export declare class DeploymentScript extends BaseTypeProperties {
  /**
   * #### Run a script during deploy or delete — database migrations, seed data, cleanup tasks.
   * 
   * ---
   * 
   * Executes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,
   * or `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`.
   */
  constructor(properties: import('./plain').DeploymentScriptProps);
  readonly type: 'deployment-script';
}

export declare class EdgeLambdaFunction extends BaseTypeProperties {
  /**
   * #### Lambda function that runs at CDN edge locations for request/response manipulation.
   * 
   * ---
   * 
   * Runs on CloudFront events (viewer request, origin request, etc.) to modify headers, rewrite URLs,
   * implement A/B testing, or add auth checks at the edge. Referenced from CDN `edgeFunctions` config.
   */
  constructor(properties: import('./plain').EdgeLambdaFunctionProps);
  readonly type: 'edge-lambda-function';
}

// ==========================================
// STACKTAPE CONFIG TYPE
// ==========================================

// Re-export StacktapeConfig with properly typed resources
// Accepts both class instances and plain objects
import type { StacktapeResourceDefinition } from './plain';
import type { CloudFormationResource } from './cloudformation';

/**
 * CloudFormation template structure
 */
export type CloudFormationTemplate = {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Transform?: string[];
  Parameters?: Record<string, unknown>;
  Mappings?: Record<string, unknown>;
  Conditions?: Record<string, unknown>;
  Resources: { [logicalName: string]: CloudFormationResource };
  Outputs?: Record<string, { Value: unknown; Description?: string; Export?: { Name: string } }>;
  Hooks?: Record<string, unknown>;
};

export type StacktapeConfig = Omit<import('./plain').StacktapeConfig, 'resources' | 'cloudformationResources' | 'scripts'> & {
  resources: { [resourceName: string]: RelationalDatabase | WebService | PrivateService | WorkerService | MultiContainerWorkload | LambdaFunction | BatchJob | Bucket | HostingBucket | DynamoDbTable | EventBus | HttpApiGateway | ApplicationLoadBalancer | NetworkLoadBalancer | RedisCluster | MongoDbAtlasCluster | StateMachine | UserAuthPool | UpstashRedis | SqsQueue | SnsTopic | KinesisStream | WebAppFirewall | OpenSearchDomain | EfsFilesystem | NextjsWeb | AstroWeb | NuxtWeb | SvelteKitWeb | SolidStartWeb | TanStackWeb | RemixWeb | Bastion | AgentCoreRuntime | AgentCoreMemory | AgentCoreGateway | AgentCoreBrowser | AgentCoreCodeInterpreter | StacktapeResourceDefinition };
  /**
   * #### Scripts that can be executed using the `stacktape script:run` command.
   *
   * ---
   *
   * Scripts can be either shell commands or files written in JavaScript, TypeScript, or Python.
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling | import('./plain').LocalScript | import('./plain').BastionScript | import('./plain').LocalScriptWithBastionTunneling };
  /**
   * #### Raw CloudFormation resources that will be deployed in this stack.
   *
   * ---
   *
   * These resources will be merged with the resources managed by Stacktape.
   * Each CloudFormation resource consists of a logical name and its definition.
   *
   * To avoid logical name conflicts, you can see all logical names for resources deployed by Stacktape using the `stacktape stack-info --detailed` command.
   * Resources specified here do not count towards your resource limit.
   *
   * For a list of all supported AWS CloudFormation resources, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).
   */
  cloudformationResources?: { [resourceName: string]: CloudFormationResource };
  /**
   * #### Final transform function for the entire CloudFormation template.
   *
   * ---
   *
   * This function is called after all other processing (including resource transforms and overrides) is complete.
   * It receives the entire CloudFormation template and must return the modified template.
   *
   * Use this for advanced customizations that need access to the full template structure.
   *
   * @example
   * finalTransform: (template) => {
   *   // Add a global tag to all resources
   *   for (const resource of Object.values(template.Resources)) {
   *     if (resource.Properties?.Tags) {
   *       resource.Properties.Tags.push({ Key: 'Environment', Value: 'production' });
   *     }
   *   }
   *   return template;
   * }
   */
  finalTransform?: (template: CloudFormationTemplate) => CloudFormationTemplate;
};

// ==========================================
// ADDITIONAL SDK TYPE RE-EXPORTS
// ==========================================

/**
 * AWS SES (Simple Email Service) reference for connectTo
 * Grants full permissions for AWS SES (ses:*)
 */
export declare const AWS_SES: "aws:ses";
/**
 * Type that represents any AWS service constant
 */
export type GlobalAwsServiceConstant = typeof AWS_SES;

export declare const REFERENCEABLE_PARAMS: Record<string, Array<{
    name: string;
    description: string;
}>>;


// ==========================================
// PLAIN SECTION TYPES (for getConfig pattern)
// ==========================================

/**
 * Plain resources section type (YAML-equivalent).
 * Use this with GetConfigFunction for legacy configs.
 */
export type StacktapeResourcesPlain = import('./plain').StacktapeConfig['resources'];

/**
 * Plain scripts section type (YAML-equivalent).
 * Use this with GetConfigFunction for legacy configs.
 */
export type StacktapeScriptsPlain = import('./plain').StacktapeConfig['scripts'];

/**
 * Plain hooks section type.
 */
export type StacktapeHooksPlain = import('./plain').Hooks;

/**
 * Plain deployment config section type.
 */
export type StacktapeDeploymentConfigPlain = import('./plain').DeploymentConfig;

/**
 * Plain stack config section type.
 */
export type StacktapeStackConfigPlain = import('./plain').StackConfig;

/**
 * Plain cloudformation resources section type.
 */
export type StacktapeCloudformationResourcesPlain = import('./plain').StacktapeConfig['cloudformationResources'];

/**
 * Plain stack outputs type (stackConfig.outputs).
 */
export type StacktapeOutputsPlain = import('./plain').StackConfig['outputs'];

/**
 * Plain variables section type.
 */
export type StacktapeVariablesPlain = import('./plain').StacktapeConfig['variables'];

/**
 * Plain provider config section type.
 */
export type StacktapeProviderConfigPlain = import('./plain').StacktapeConfig['providerConfig'];

/**
 * Plain budget control section type.
 */
export type StacktapeBudgetControlPlain = import('./plain').BudgetControl;

/**
 * Plain directives section type.
 */
export type StacktapeDirectivesPlain = import('./plain').StacktapeConfig['directives'];

/**
 * Function type for plain config (legacy getConfig pattern).
 * Returns plain objects (YAML-equivalent), no class instances.
 */
export type GetConfigFunction = (params: GetConfigParams) => import('./plain').StacktapeConfig;

