/* eslint-disable */
// Generated file - Do not edit manually
// Main export for 'stacktape' - classes, directives, defineConfig, augmented section types
// For plain types (getConfig pattern), use: import type { X } from 'stacktape/types'

// Re-export classes and defineConfig from types
export {
  defineConfig,
  RelationalDatabase,
  WebService,
  PrivateService,
  WorkerService,
  MultiContainerWorkload,
  LambdaFunction,
  BatchJob,
  Bucket,
  HostingBucket,
  DynamoDbTable,
  EventBus,
  HttpApiGateway,
  ApplicationLoadBalancer,
  NetworkLoadBalancer,
  RedisCluster,
  MongoDbAtlasCluster,
  StateMachine,
  UserAuthPool,
  UpstashRedis,
  SqsQueue,
  SnsTopic,
  KinesisStream,
  WebAppFirewall,
  OpenSearchDomain,
  EfsFilesystem,
  NextjsWeb,
  AstroWeb,
  NuxtWeb,
  SvelteKitWeb,
  SolidStartWeb,
  TanStackWeb,
  RemixWeb,
  Bastion,
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
  LambdaDurationTrigger,
  CustomResourceDefinition,
  CustomResourceInstance,
  DeploymentScript,
  EdgeLambdaFunction,
  Alarm
} from './types';

// Re-export GetConfigParams for convenience
export type { GetConfigParams, StacktapeConfig } from './types';

// ==========================================
// DIRECTIVES
// ==========================================

/**
 * Returns a reference to a resource parameter.
 * @param resourceName - The name of the resource as specified in the Stacktape config.
 * @param property - The property of the resource. The list of properties is available in the Stacktape docs for every given resource type.
 */
export declare const $ResourceParam: (resourceName: string, property: string) => string;
/**
 * Returns a reference to a CloudFormation resource parameter.
 * @param cloudformationResourceLogicalId - The logical name of the Cloudformation resource.
 * If you are referencing a resource defined in the cloudformationResources section, use its name.
 * To reference a child resource of a Stacktape resource, you can get a list of child resources with the `stacktape stack-info` command
 * @param property - The parameter of the Cloudformation resource to reference.
 * For a list of all referenceable parameters, refer to the [Referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters#parameters-of-cloudformation-resources) section in the Stacktape docs.
 */
export declare const $CfResourceParam: (cloudformationResourceLogicalId: string, property: string) => string;
/**
 * Returns a reference to a secret.
 * @param secretName - The name of the secret. Must be a valid secret name in the AWS Secrets Manager in the region you're deploying to.
 * If the secret is in JSON format, you can extract nested properties using dot notation.
 * Example: `$Secret('my-secret.api-key')` will return the value of the `api-key` property in the `my-secret` secret.
 */
export declare const $Secret: (secretName: string) => string;
/**
 * Returns a reference to an SSM Parameter Store parameter.
 * @param paramName - The name (or path) of the SSM parameter. Must exist in the AWS Systems Manager Parameter Store in the region you're deploying to.
 * Supports both `String` and `SecureString` parameter types (auto-detected).
 * Example: `$SsmParam('my-api-key')` or `$SsmParam('/prod/database/host')`
 */
export declare const $SsmParam: (paramName: string) => string;
/**
 * Returns an interpolated string. Unlike the $Format() directive, the $CfFormat() directive can contain runtime-resolved directives as arguments.
 * @param interpolatedString - Occurrences of {} are replaced by the subsequent arguments.
 * @param values - The number of values must be equal to the number of {} placeholders in the first argument.
 * Example:
 * `$CfFormat('{}-{}', 'foo', 'bar')` results in `foo-bar`.
 * $CfFormat('{}-mydomain.com', 'foo') results in foo-mydomain.com.
 * `$CfFormat('{}.mydomain.com', $Stage())` results in `staging.mydomain.com` if the stage is staging.
 */
export declare const $CfFormat: (interpolatedString: string, ...values: any[]) => string;
/**
 * Returns the output of another stack, allowing you to reference resources deployed in another stack. The referenced stack must already be deployed. If you try to delete a stack that is referenced by another stack, you will get an error.
 * To get the output locally (i.e., download the value and pass it to the configuration), use the $StackOutput() directive.
 * @param stackName - The name of the stack.
 * @param outputName - The name of the output.
 */
export declare const $CfStackOutput: (stackName: string, outputName: string) => string;
/**
 * Returns information about the current Git repository.
 *
 * $GitInfo().sha1 - SHA-1 of the latest commit
 *
 * $GitInfo().commit - The latest commit ID
 *
 * $GitInfo().branch - The name of the current branch
 *
 * $GitInfo().message - The message of the last commit
 *
 * $GitInfo().user - Git user's name
 *
 * $GitInfo().email - Git user's email
 *
 * $GitInfo().repository - The name of the git repository
 *
 * $GitInfo().tags - The tags pointing to the current commit
 *
 * $GitInfo().describe - The most recent tag that is reachable from a commit
 */
export declare const $GitInfo: () => string;
/**
 * Returns the current AWS region where the stack is being deployed.
 * Example: `us-east-1`
 */
export declare const $Region: () => string;
/**
 * Returns the current stage name.
 * Example: `production`, `staging`, `dev`
 */
export declare const $Stage: () => string;

// ==========================================
// AWS SERVICE CONSTANTS
// ==========================================

export declare const AWS_SES: "aws:ses";


// ==========================================
// AUGMENTED SECTION TYPES (for defineConfig pattern)
// ==========================================

/**
 * Resources section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeResources = { [resourceName: string]: import('./types').RelationalDatabase | import('./types').WebService | import('./types').PrivateService | import('./types').WorkerService | import('./types').MultiContainerWorkload | import('./types').LambdaFunction | import('./types').BatchJob | import('./types').Bucket | import('./types').HostingBucket | import('./types').DynamoDbTable | import('./types').EventBus | import('./types').HttpApiGateway | import('./types').ApplicationLoadBalancer | import('./types').NetworkLoadBalancer | import('./types').RedisCluster | import('./types').MongoDbAtlasCluster | import('./types').StateMachine | import('./types').UserAuthPool | import('./types').UpstashRedis | import('./types').SqsQueue | import('./types').SnsTopic | import('./types').KinesisStream | import('./types').WebAppFirewall | import('./types').OpenSearchDomain | import('./types').EfsFilesystem | import('./types').NextjsWeb | import('./types').AstroWeb | import('./types').NuxtWeb | import('./types').SvelteKitWeb | import('./types').SolidStartWeb | import('./types').TanStackWeb | import('./types').RemixWeb | import('./types').Bastion | import('./plain').StacktapeResourceDefinition };

/**
 * Scripts section type (accepts class instances).
 * Use this with defineConfig for enhanced type-safe configs.
 */
export type StacktapeScripts = { [scriptName: string]: import('./types').LocalScript | import('./types').BastionScript | import('./types').LocalScriptWithBastionTunneling | import('./plain').LocalScript | import('./plain').BastionScript | import('./plain').LocalScriptWithBastionTunneling };

/**
 * Hooks section type.
 */
export type StacktapeHooks = import('./plain').Hooks;

/**
 * Deployment config section type.
 */
export type StacktapeDeploymentConfig = import('./plain').DeploymentConfig;

/**
 * Stack config section type.
 */
export type StacktapeStackConfig = import('./plain').StackConfig;

/**
 * Cloudformation resources section type.
 */
export type StacktapeCloudformationResources = { [resourceName: string]: StacktapeCloudformationResource };

/**
 * Single cloudformation resource type.
 */
export type StacktapeCloudformationResource = import('./cloudformation').CloudFormationResource;

/**
 * Stack outputs type (stackConfig.outputs).
 */
export type StacktapeOutputs = import('./plain').StackConfig['outputs'];

/**
 * Variables section type.
 */
export type StacktapeVariables = import('./plain').StacktapeConfig['variables'];

/**
 * Provider config section type.
 */
export type StacktapeProviderConfig = import('./plain').StacktapeConfig['providerConfig'];

/**
 * Budget control section type.
 */
export type StacktapeBudgetControl = import('./plain').BudgetControl;

/**
 * Directives section type.
 */
export type StacktapeDirectives = import('./plain').StacktapeConfig['directives'];

