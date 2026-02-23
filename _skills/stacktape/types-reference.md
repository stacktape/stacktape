# Stacktape Type Reference

Complete TypeScript type definitions for all Stacktape resources.

## Root Config Structure

```typescript
interface StacktapeConfig {
  /**
   * #### The name of this service.
   *
   * ---
   *
   * > **Deprecated:** Use the `--projectName` option in the CLI instead.
   *
   * The CloudFormation stack name will be in the format: `{serviceName}-{stage}`.
   *
   * Must be alphanumeric and can contain dashes. Must match the regex `[a-zA-Z][-a-zA-Z0-9]*`.
   *
   * @deprecated
   */
  serviceName?: string;
  /**
   * #### Configuration for 3rd-party service providers.
   */
  providerConfig?: {
    mongoDbAtlas?: MongoDbAtlasProvider;
    upstash?: UpstashProvider;
  };
  /**
   * #### Defines variables that can be used throughout the configuration.
   *
   * ---
   *
   * Variables can be accessed using the `$Var().{variable-name}` directive.
   * They are useful when you want to reuse the same value for multiple properties.
   *
   * Example: `dbAddress: $ResourceParam('myDatabase', 'host')`
   */
  variables?: { [variableName: string]: any };
  /**
   * #### Configures a monthly budget and notifications for the stack.
   *
   * ---
   *
   * Budget control allows you to monitor your spending and configure email notifications when cost thresholds are met.
   * The budget is reset at the beginning of each calendar month.
   */
  budgetControl?: BudgetControl;
  /**
   * #### Configures hooks to be executed before or after specified commands.
   *
   * ---
   *
   * Hooks are used to automatically execute scripts from the `scripts` section.
   */
  hooks?: Hooks;
  /**
   * #### A list of script definitions.
   *
   * ---
   *
   * Scripts allow you to specify and execute custom logic. Defining scripts in your Stacktape configuration offers several benefits:
   * - They are easily reusable by all members of your team.
   * - They can be executed automatically as part of lifecycle [hooks](https://docs.stacktape.com/configuration/hooks/) (e.g., before/after `deploy`/`delete`) or manually using the [`script:run` command](https://docs.stacktape.com/cli/commands/script-run/).
   * - You can use the `connectTo` property to easily inject environment variables for connecting to your stack's resources.
   * - You can leverage bastion scripts and tunneling to access resources that are only available within a VPC.
   *
   * There are three types of scripts:
   * 1.  **`local-script`**: Executed locally on the same machine where the Stacktape command is run.
   * 2.  **`local-script-with-bastion-tunneling`**: Same as `local-script`, but connections to resources in the `connectTo` list are tunneled through a bastion host, allowing you to access VPC-only resources.
   * 3.  **`bastion-script`**: Executed on the bastion host itself.
   *
   * Scripts can be either shell commands or files written in JavaScript, TypeScript, or Python.
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling };
  /**
   * #### Configures custom, user-defined directives for use in this configuration.
   *
   * ---
   *
   * Directives can be used to dynamically configure certain aspects of your stack.
   */
  directives?: DirectiveDefinition[];
  /**
   * #### Configures deployment-related aspects for this stack.
   */
  deploymentConfig?: DeploymentConfig;
  /**
   * #### Configures other, uncategorized aspects of this stack.
   */
  stackConfig?: StackConfig;
  /**
   * #### The infrastructure resources that make up your stack.
   *
   * ---
   *
   * Each resource consists of multiple underlying AWS resources.
   * To see all resources in this stack, including their underlying CloudFormation resources, use the `stacktape stack-info --detailed` command.
   * Each resource specified here counts towards your resource limit.
   */
  resources: { [resourceName: string]: StacktapeResourceDefinition };
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
  cloudformationResources?: { [resourceName: string]: CloudformationResource };
}

```

## Helper Types

```typescript
type StacktapeResourceDefinition =
  | HostingBucket
  | NextjsWeb
  | StacktapeWorkloadDefinition
  | RelationalDatabase
  | ApplicationLoadBalancer
  | NetworkLoadBalancer
  | HttpApiGateway
  | Bucket
  | UserAuthPool
  | EventBus
  | Bastion
  | DynamoDbTable
  | RedisCluster
  | StateMachine
  | MongoDbAtlasCluster
  | CustomResourceInstance
  | CustomResourceDefinition
  | UpstashRedis
  | DeploymentScript
  | AwsCdkConstruct
  | SqsQueue
  | SnsTopic
  | WebAppFirewall
  | OpenSearchDomain
  | EfsFilesystem
  | KinesisStream;

type StpResource = (
  | StpWorkloadDefinition
  | StpRelationalDatabase
  | StpApplicationLoadBalancer
  | StpNetworkLoadBalancer
  | StpHttpApiGateway
  | StpBucket
  | StpUserAuthPool
  | StpEventBus
  | StpBastion
  | StpDynamoTable
  | StpStateMachine
  | StpMongoDbAtlasCluster
  | StpRedisCluster
  | StpCustomResource
  | StpCustomResourceDefinition
  | StpUpstashRedis
  | StpDeploymentScript
  | StpAwsCdkConstruct
  | StpSqsQueue
  | StpSnsTopic
  | StpHostingBucket
  | StpWebAppFirewall
  | StpNextjsWeb
  | StpHelperLambdaFunction
  | StpHelperEdgeLambdaFunction
  | StpOpenSearchDomain
  | StpEfsFilesystem
  | StpKinesisStream
) & {
  _nestedResources?: {
    [nestedStpResourceIdentifier: string]: StpResource;
  };
};

type StpWorkloadType = StacktapeWorkloadDefinition['type'];
type StpResourceType = StpResource['type'];

type Tracing = 'Active' | 'PassThrough';

/**
 * #### Dev Mode Configuration
 *
 * ---
 *
 * Configures how this resource behaves during `stacktape dev` mode.
 */
interface DevModeConfig {
  /**
   * #### Use Remote Resource
   *
   * ---
   *
   * If `true`, connects to the deployed AWS resource instead of running a local emulation during dev mode.
   *
   * By default, databases (RDS, Aurora), Redis clusters, and DynamoDB tables run locally during dev mode.
   * Set this to `true` to use the deployed AWS resource instead.
   *
   * @default false
   */
  remote?: boolean;
}

type EcsServiceScheduledMaintenanceRuleInput = {
  ecsServiceArn: string | IntrinsicFunction;
  asgName: string | IntrinsicFunction;
  codeDeployApplicationName?: string;
  codeDeployDeploymentGroupName?: string;
};

type CustomTaggingScheduledRuleInput = {
  tagNetworkInterfaceWithSecurityGroup: {
    securityGroupId: string | IntrinsicFunction;
    attributionCfResourceLogicalName: string;
    extraTags?: { Key: string; Value: string }[];
  }[];
  tagHostedZoneAttributedToCloudMapNamespace: {
    namespaceId: string | IntrinsicFunction;
    attributionCfResourceLogicalName: string;
    extraTags?: { Key: string; Value: string }[];
  }[];
};

interface DomainConfiguration {
  /**
   * #### Domain Name
   *
   * ---
   *
   * The fully qualified domain name (e.g., `mydomain.com`, `api.mydomain.com`). Do not include the protocol (`https://`).
   */
  domainName: string;
  /**
   * #### Custom Certificate ARN
   *
   * ---
   *
   * The ARN of a custom ACM certificate to use for this domain.
   *
   * By default, Stacktape automatically generates and manages certificates for your domains. If you prefer to use a custom certificate from your AWS account, provide its ARN here.
   */
  customCertificateArn?: string;
  /**
   * #### Disable DNS Record Creation
   *
   * ---
   *
   * If `true`, Stacktape will not create a DNS record for this domain. This is useful if you want to manage DNS records manually.
   *
   * @default false
   */
  disableDnsRecordCreation?: boolean;
}

type StpWorkloadDefinition =
  | StpLambdaFunction
  | StpContainerWorkload
  | StpBatchJob
  | StpWebService
  | StpPrivateService
  | StpWorkerService
  | StpEdgeLambdaFunction;

type StacktapeWorkloadDefinition =
  | LambdaFunction
  | ContainerWorkload
  | BatchJob
  | WebService
  | PrivateService
  | WorkerService
  | EdgeLambdaFunction;

type StpCdnCompatibleResource = StpBucket | StpApplicationLoadBalancer | StpHttpApiGateway | StpLambdaFunction;

type StpCdnAttachableResourceType = Subtype<
  StpResourceType,
  'bucket' | 'application-load-balancer' | 'http-api-gateway' | 'function' // | 'web-service' | 'hosting-bucket'
>;

type DevModeCapableResourceType = Subtype<StpResourceType, 'batch-job' | 'multi-container-workload' | 'function'>;

type StpCdnOriginTargetableByRouteRewrite = StpCdnAttachableResourceType | 'custom-origin';

type StpDomainAttachableResourceType =
  | Subtype<StpResourceType, 'application-load-balancer' | 'http-api-gateway' | 'network-load-balancer'>
  | 'cdn';

type StpResourceScopableByConnectToAffectingRole =
  | Subtype<StpResource, StpLambdaFunction>
  | Subtype<StpResource, StpContainerWorkload>
  | Subtype<StpResource, StpBatchJob>
  | Subtype<StpResource, StpStateMachine>
  | Subtype<StpResource, StpEventBus>
  | Subtype<StpResource, StpBucket>
  | Subtype<StpResource, StpDynamoTable>
  | Subtype<StpResource, StpOpenSearchDomain>
  | Subtype<StpResource, StpUserAuthPool>
  | Subtype<StpResource, StpSqsQueue>
  | Subtype<StpResource, StpSnsTopic>
  | Subtype<StpResource, StpKinesisStream>;

type ConnectToAwsServicesMacro =
  (typeof import('../../src/domain/config-manager/utils/resource-references'))['ConnectToAwsServiceMacros'][number];

type StpResourceScopableByConnectToAffectingSecurityGroup =
  | Subtype<StpResource, StpRelationalDatabase>
  | Subtype<StpResource, StpRedisCluster>;

type StpResourceScopableByConnectTo =
  | StpResourceScopableByConnectToAffectingSecurityGroup
  | StpResourceScopableByConnectToAffectingRole;

/**
 * #### Resource Overrides
 *
 * ---
 *
 * Overrides properties of the underlying CloudFormation resources that Stacktape creates.
 *
 * Child resources are identified by their CloudFormation logical ID (e.g., `MyBucketBucket`). You can find these IDs by running `stacktape stack:info --detailed`.
 *
 * For a list of properties that can be overridden, refer to the [AWS CloudFormation documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).
 */
type ResourceOverrides = {
  [cfLogicalName: string]: { [resourcePath: string]: any };
};

interface Hooks {
  /**
   * #### Before Deploy
   *
   * ---
   *
   * A list of scripts to execute before the `deploy` and `codebuild:deploy` commands. When using `codebuild:deploy`, these hooks run in the CodeBuild environment, not on your local machine.
   */
  beforeDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### After Deploy
   *
   * ---
   *
   * A list of scripts to execute after the `deploy` and `codebuild:deploy` commands. When using `codebuild:deploy`, these hooks run in the CodeBuild environment, not on your local machine.
   */
  afterDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### Before Delete
   *
   * ---
   *
   * A list of scripts to execute before the `delete` command. These hooks only run if you provide the `--configPath` and `--stage` options when running the command.
   */
  beforeDelete?: NamedScriptLifecycleHook[];
  /**
   * #### After Delete
   *
   * ---
   *
   * A list of scripts to execute after the `delete` command. These hooks only run if you provide the `--configPath` and `--stage` options when running the command.
   */
  afterDelete?: NamedScriptLifecycleHook[];
  /**
   * #### Before Bucket Sync
   *
   * ---
   *
   * A list of scripts to execute before the `bucket:sync` command.
   */
  beforeBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### After Bucket Sync
   *
   * ---
   *
   * A list of scripts to execute after the `bucket:sync` command.
   */
  afterBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### Before Dev
   *
   * ---
   *
   * A list of scripts to execute before the `dev` command.
   */
  beforeDev?: NamedScriptLifecycleHook[];
  /**
   * #### After Dev
   *
   * ---
   *
   * A list of scripts to execute after the `dev` command.
   */
  afterDev?: NamedScriptLifecycleHook[];
}

interface LifecycleHookBase {
  /**
   * #### Skip on CI
   *
   * ---
   *
   * If `true`, this hook will not run in a CI/CD environment (e.g., AWS CodeBuild, GitHub Actions, GitLab CI). This is useful for hooks that should only run locally.
   *
   * @default false
   */
  skipOnCI?: boolean;
  /**
   * #### Skip on Local
   *
   * ---
   *
   * If `true`, this hook will only run in a CI/CD environment and will be skipped during local execution.
   *
   * @default false
   */
  skipOnLocal?: boolean;
}

// interface InlineScriptLifecycleHook extends Script, LifecycleHookBase {}

interface NamedScriptLifecycleHook extends LifecycleHookBase {
  /**
   * #### Script Name
   *
   * ---
   *
   * The name of the script to execute. The script must be defined in the `scripts` section of your configuration.
   */
  scriptName: string;
}

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
interface LocalScriptWithBastionTunneling {
  type: 'local-script-with-bastion-tunneling';
  properties: LocalScriptWithBastionTunnelingProps;
}

interface LocalScriptWithBastionTunnelingProps extends LocalScriptProps {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource to use for tunneling to protected resources.
   */
  bastionResource?: string;
}

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
interface BastionScript {
  type: 'bastion-script';
  properties: BastionScriptProps;
}

interface BastionScriptProps extends ScriptEnvProps {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource on which the commands will be executed.
   */
  bastionResource?: string;
  /**
   * #### Execute Command
   *
   * ---
   *
   * A single terminal command to execute on the bastion host. Logs from the execution are streamed to your terminal.
   *
   * You can use either `executeCommand` or `executeCommands`, but not both.
   */
  executeCommand?: string;
  /**
   * #### Execute Commands
   *
   * ---
   *
   * A list of terminal commands to execute sequentially as a script on the bastion host. Logs from the execution are streamed to your terminal.
   *
   * You can use either `executeCommand` or `executeCommands`, but not both.
   */
  executeCommands?: string[];
  /**
   * #### Working Directory
   *
   * ---
   *
   * The directory on the bastion host where the command will be executed.
   *
   * @default "/"
   */
  cwd?: string;
}

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
interface LocalScript {
  type: 'local-script';
  properties: LocalScriptProps;
}

interface LocalScriptProps extends ScriptEnvProps {
  /**
   * #### Execute Script
   *
   * ---
   *
   * The path to a script file to execute. The script can be written in JavaScript, TypeScript, or Python and runs in a separate process.
   *
   * The executable is determined by `defaults:configure` or the system default (`node` for JS/TS, `python` for Python). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   */
  executeScript?: string;
  /**
   * #### Execute Command
   *
   * ---
   *
   * A single terminal command to execute in a separate shell process.
   *
   * The command runs on the machine executing the Stacktape command. Be aware of potential differences between local and CI environments (e.g., OS, shell). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   */
  executeCommand?: string;
  /**
   * #### Execute Scripts
   *
   * ---
   *
   * A list of script files to execute sequentially. Each script runs in a separate process.
   *
   * The script can be written in JavaScript, TypeScript, or Python. The executable is determined by `defaults:configure` or the system default. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   */
  executeScripts?: string[];
  /**
   * #### Execute Commands
   *
   * ---
   *
   * A list of terminal commands to execute sequentially. Each command runs in a separate shell process.
   *
   * The commands run on the machine executing the Stacktape command. Be aware of potential differences between environments. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   */
  executeCommands?: string[];
  /**
   * #### Working Directory
   *
   * ---
   *
   * The directory where the script or command will be executed.
   *
   * @default The directory where the Stacktape command was executed.
   */
  cwd?: string;
  /**
   * #### Pipe Stdio
   *
   * ---
   *
   * If `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.
   *
   * @default true
   */
  pipeStdio?: boolean;
}

interface ScriptEnvProps {
  /**
   * #### Connect To
   *
   * ---
   *
   * A list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.
   *
   * Environment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).
   *
   * **Injected Variables by Resource Type:**
   * - **`Bucket`**: `NAME`, `ARN`
   * - **`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`
   * - **`MongoDbAtlasCluster`**: `CONNECTION_STRING`
   * - **`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.
   * - **`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`
   * - **`EventBus`**: `ARN`
   * - **`Function`**: `ARN`
   * - **`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
   * - **`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`
   * - **`SnsTopic`**: `ARN`, `NAME`
   * - **`SqsQueue`**: `ARN`, `NAME`, `URL`
   * - **`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`
   * - **`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
   * - **`PrivateService`**: `ADDRESS`
   * - **`WebService`**: `URL`
   */
  connectTo?: string[];
  /**
   * #### Environment Variables
   *
   * ---
   *
   * A list of environment variables to pass to the script or command.
   *
   * Values can be:
   * - A static string, number, or boolean.
   * - The result of a [custom directive](https://docs.stacktape.com/configuration/directives/#custom-directives).
   * - A reference to another resource's parameter using the [`$ResourceParam` directive](https://docs.stacktape.com/configuration/referencing-parameters/).
   * - A value from a [secret](https://docs.stacktape.com/resources/secrets/) using the [`$Secret` directive](https://docs.stacktape.com/configuration/directives/#secret).
   */
  environment?: EnvironmentVar[];
  /**
   * #### Assume Role of Resource
   *
   * ---
   *
   * The name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.
   *
   * The resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.
   *
   * **Supported Resource Types:**
   * - `function`
   * - `batch-job`
   * - `worker-service`
   * - `web-service`
   * - `private-service`
   * - `multi-container-workload`
   * - `nextjs-web`
   */
  assumeRoleOfResource?: string;
}

type Script = StacktapeConfig['scripts'][string] & { scriptName: string };

interface TunnelTargetInfo {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource (as defined in your configuration) to use for the tunnel.
   */
  bastionStpName?: string;
  /**
   * #### Target Resource Name
   *
   * ---
   *
   * The name of the target resource to connect to through the tunnel. Environment variables passed to the script are automatically adjusted to use the tunneled endpoints.
   *
   * **Supported Target Resources:**
   * - `relational-database`
   * - `redis-cluster`
   * - `mongo-db-atlas-cluster`
   * - `application-load-balancer`
   * - `private-service` (with an Application Load Balancer)
   *
   * If the target resource has multiple endpoints (e.g., a Redis cluster with reader and writer endpoints), all endpoints are tunneled automatically.
   */
  targetStpName: string;
}

type ResolvedRemoteTarget = {
  bastionInstanceId: string;
  remoteHost: string;
  remotePort: number;
  label: string;
  targetStpName: string;
  additionalStringToSubstitute?: string;
  affectedReferencableParams?: StacktapeResourceReferenceableParam[];
};

interface DirectiveDefinition {
  /**
   * #### Directive Name
   *
   * ---
   *
   * The name of the custom directive.
   */
  name: string;
  /**
   * #### File Path
   *
   * ---
   *
   * The path to the file where the directive is defined, in the format `{file-path}:{handler}`.
   *
   * If the `{handler}` is omitted:
   * - For `.js` and `.ts` files, the `default` export is used.
   * - For `.py` files, the `main` function is used.
   */
  filePath: string;
}

interface DeploymentConfig {
  /**
   * #### Enable Termination Protection
   *
   * ---
   *
   * If `true`, protects the stack from accidental deletion. You must disable this protection before you can delete the stack.
   *
   * @default false
   */
  terminationProtection?: boolean;
  /**
   * << Description missing. Will be provided soon. >>
   */
  cloudformationRoleArn?: Arn;
  /**
   * #### Rollback Alarms
   *
   * ---
   *
   * A list of alarms that will trigger a rollback if they enter the `ALARM` state during a stack deployment.
   *
   * You can specify an alarm by its name (if defined in the `alarms` section) or by its ARN.
   *
   * > An alarm must exist before the deployment starts to be used as a rollback trigger. If you specify a newly created alarm, it will only be used in subsequent deployments.
   */
  triggerRollbackOnAlarms?: string[];
  /**
   * #### Post-Deployment Monitoring Time
   *
   * ---
   *
   * The amount of time (in minutes) that CloudFormation should monitor the stack and rollback alarms after a deployment.
   *
   * If a rollback alarm is triggered or the update is canceled during this period, the stack will be rolled back.
   *
   * @default 0
   */
  monitoringTimeAfterDeploymentInMinutes?: number;
  /**
   * #### Disable Auto-Rollback
   *
   * ---
   *
   * If `true`, disables automatic rollback on deployment failure.
   *
   * - **With auto-rollback (default):** If a deployment fails, the stack is automatically rolled back to the last known good state.
   * - **Without auto-rollback:** If a deployment fails, the stack remains in the `UPDATE_FAILED` state. You can then either fix the issues and redeploy or manually roll back using the `stacktape rollback` command.
   *
   * @default false
   */
  disableAutoRollback?: boolean;
  /**
   * << Description missing. Will be provided soon. >>
   */
  publishEventsToArn?: Arn[];
  /**
   * #### Previous Versions to Keep
   *
   * ---
   *
   * The number of previous deployment artifact versions (functions, images, templates) to keep.
   *
   * @default 10
   */
  previousVersionsToKeep?: number;
  /**
   * #### Disable S3 Transfer Acceleration
   *
   * ---
   *
   * If `true`, disables the use of S3 Transfer Acceleration for uploading deployment artifacts.
   *
   * S3 Transfer Acceleration can improve upload times and security by routing uploads through the nearest AWS edge location. It may incur minor additional costs.
   *
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}

interface StackConfig {
  /**
   * #### Stack Outputs
   *
   * ---
   *
   * A list of custom outputs for your stack, such as API Gateway URLs, database endpoints, or resource ARNs. These outputs are often dynamically generated by AWS and are only known after deployment.
   */
  outputs?: StackOutput[];
  /**
   * #### Stack Tags
   *
   * ---
   *
   * A list of tags to apply to the stack. These tags are propagated to all supported AWS resources created in the stack and can help with cost allocation and resource management. You can specify a maximum of 45 tags.
   */
  tags?: CloudformationTag[];
  /**
   * #### Disable Stack Info Saving
   *
   * ---
   *
   * If `true`, disables saving information about the deployed stack to a local file after each deployment.
   *
   * By default, stack information is saved to `.stacktape-stack-info/<<stack-name>>.json`.
   *
   * @default false
   */
  disableStackInfoSaving?: boolean;
  /**
   * #### Stack Info Directory
   *
   * ---
   *
   * The directory where information about deployed stacks will be saved.
   *
   * @default ".stacktape-stack-info/"
   */
  stackInfoDirectory?: string;
  /**
   * #### VPC configuration
   *
   * ---
   *
   * Configure VPC settings including VPC reuse and NAT Gateway configuration for private subnets.
   */
  vpc?: VpcSettings;
}

interface VpcReuseConfig {
  /**
   * #### Project name of target stack
   * ---
   * - Project name of the target stack (stack in which the VPC is created).
   * - Must be used together with `stage`.
   * - Cannot be used together with `vpcId`.
   */
  projectName?: string;
  /**
   * #### Stage of target stack
   * ---
   * - The stage of the target stack (stack in which the VPC is created).
   * - Must be used together with `projectName`.
   * - Cannot be used together with `vpcId`.
   */
  stage?: string;
  /**
   * #### VPC ID
   * ---
   * - Direct VPC ID to reuse (e.g., `vpc-1234567890abcdef0`).
   * - Cannot be used together with `projectName` and `stage`.
   * - The VPC must have at least 3 public subnets. Public subnets are identified by having a route to an Internet Gateway (0.0.0.0/0 -> igw-*) in their associated route table.
   */
  vpcId?: string;
}

interface NatSettings {
  /**
   * #### Number of availability zones for NAT Gateway deployment.
   *
   * ---
   *
   * Controls how many availability zones will have a dedicated NAT Gateway for high availability.
   *
   * - **1 AZ:** Single NAT Gateway (lowest cost, but no redundancy if that AZ fails)
   * - **2 AZs:** NAT Gateways in two zones (balanced cost and availability)
   * - **3 AZs:** NAT Gateways in three zones (highest availability and cost)
   *
   * Higher numbers provide better fault tolerance but increase costs proportionally.
   *
   * Each NAT Gateway receives a static Elastic IP address that persists across deployments,
   * allowing you to whitelist these IP addresses in external services (e.g., third-party APIs, databases, payment gateways).
   *
   * @default 2
   */
  availabilityZones?: 1 | 2 | 3;
}

interface VpcSettings {
  /**
   * #### Reuse VPC from another stack or use existing VPC.
   *
   * ---
   *
   * If this property is set, resources will be created in the VPC of the specified existing stack or the provided VPC ID.
   *
   * Reusing a VPC is helpful when services in this stack are tightly coupled with services in another stack
   * (e.g., if this stack needs to access VPC-protected resources from another stack).
   *
   * > **Note:** It is recommended to specify this property when creating a new stack. If you add this property to an already deployed stack, updating may cause resources to be replaced and data to be lost.
   *
   * By default, each stack has its own dedicated VPC.
   */
  reuseVpc?: VpcReuseConfig;

  /**
   * #### NAT Gateway configuration for private subnets.
   *
   * ---
   *
   * Configures NAT Gateways that provide internet access for workloads deployed in private subnets.
   *
   * This configuration only applies when you have workloads using the `usePrivateSubnetsWithNAT` option.
   */
  nat?: NatSettings;
}

interface BudgetControl {
  /**
   * #### Budget Limit
   *
   * ---
   *
   * The total cost (in USD) that you want to track with this budget. Notification thresholds are calculated as a percentage of this limit.
   */
  limit: number;
  /**
   * #### Budget Notifications
   *
   * ---
   *
   * A list of notifications to send when a budget threshold is met.
   *
   * Notifications are sent via email and can be triggered based on either actual or forecasted spend. You can configure up to 5 notifications per stack.
   */
  notifications?: BudgetNotification[];
}

interface BudgetNotification {
  /**
   * #### Budget Type
   *
   * ---
   *
   * Determines whether the notification is based on `ACTUAL` or `FORECASTED` spend.
   *
   * - `ACTUAL`: Based on the costs you have already incurred this month.
   * - `FORECASTED`: Based on a prediction of your total spend for the month.
   *
   * > **Note:** AWS requires about 5 weeks of usage data to generate accurate forecasts. Forecast-based notifications will not be triggered until sufficient historical data is available.
   *
   * @default "ACTUAL"
   */
  budgetType?: 'ACTUAL' | 'FORECASTED';
  /**
   * #### Threshold Percentage
   *
   * ---
   *
   * The percentage of the budget limit at which the notification should be triggered.
   *
   * For example, if the `limit` is $200 and `thresholdPercentage` is 80, the notification will be sent when the spend exceeds $160.
   *
   * @default 100
   */
  thresholdPercentage?: number;
  /**
   * #### Email Recipients
   *
   * ---
   *
   * A list of email addresses that will receive the notification. You can specify up to 10 recipients.
   */
  emails: string[];
}

// interface BudgetNotificationCondition {
//   /**
//    * #### Whether the notification applies to how much you have spent (**ACTUAL**) or to how much you are forecasted to spend (**FORECASTED**).
//    * ---
//    * - **FORECASTED** - A forecast is a prediction of how much you will use AWS services over the following month. This forecast is based on your past usage.
//    * - **ACTUAL** - An actual budget that you already spent in this month (as billed by AWS).
//    * @default ACTUAL
//    */
//   budgetType?: 'ACTUAL' | 'FORECASTED';
//   /**
//    * #### Percentage threshold. When this threshold is crossed, the notification is triggered.
//    * ---
//    * - Example:
//    *    - IF you set:
//    *      - `limit` to **200** dollars,
//    *      - `budgetType` to **ACTUAL**,
//    *      - `thresholdPercentage` to **80** percent,
//    *    - THEN the notification is triggered once your actual spend goes over 160 dollars (80% of 200).
//    * @default 100
//    */
//   thresholdPercentage?: number;
// }

interface StackOutput {
  /**
   * #### Output Name
   *
   * ---
   *
   * The name of the stack output.
   */
  name: string;
  /**
   * #### Output Value
   *
   * ---
   *
   * The value of the stack output.
   */
  value: string;
  /**
   * #### Output Description
   *
   * ---
   *
   * A human-readable description of the stack output.
   */
  description?: string;
  /**
   * #### Export Output
   *
   * ---
   *
   * If `true`, exports the stack output so it can be referenced by other stacks using the [`$CfStackOutput` directive](https://docs.stacktape.com/configuration/directives#cf-stack-output).
   *
   * @default false
   */
  export?: boolean;
}

// this is stacktape specification.
// We allow for only specifying Resource property and other values we will set with defaults.
interface StpIamRoleStatement {
  /**
   * #### Statement ID (Sid)
   *
   * ---
   *
   * An optional identifier for the statement. For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies-introduction).
   */
  Sid?: string;
  /**
   * #### Effect
   *
   * ---
   *
   * Specifies whether the statement results in an `Allow` or `Deny`. For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies-introduction).
   *
   * @default "Allow"
   */
  Effect?: string;
  /**
   * #### Action
   *
   * ---
   *
   * A list of actions that the statement allows or denies (e.g., `s3:GetObject`). For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies-introduction).
   */
  Action?: string[];
  /**
   * #### Condition
   *
   * ---
   *
   * Specifies the conditions under which the statement is in effect. For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies-introduction).
   */
  Condition?: any;
  /**
   * #### Resource
   *
   * ---
   *
   * A list of resources to which the actions apply. For more information, see the [AWS documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies-introduction).
   */
  Resource: string[];
}

interface EnvironmentVar {
  /**
   * #### Variable Name
   *
   * ---
   *
   * The name of the environment variable.
   */
  name: string;
  /**
   * #### Variable Value
   *
   * ---
   *
   * The value of the environment variable. Numbers and booleans will be converted to strings.
   */
  value: string | boolean | number;
}

interface CloudformationTag {
  /**
   * #### Tag Name
   *
   * ---
   *
   * The name of the tag. It must be between 1 and 128 characters and can contain Unicode letters, digits, whitespace, and the characters `_`, `.`, `/`, `=`, `+`, `-`.
   */
  name: string;
  /**
   * #### Tag Value
   *
   * ---
   *
   * The value of the tag. It must be between 1 and 256 characters.
   */
  value: string;
}

interface CfStackPolicyStatement {
  /**
   * #### Effect
   *
   * ---
   *
   * Specifies whether the statement results in an `Allow` or `Deny`. For more information, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
   */
  Effect?: 'Allow' | 'Deny';
  /**
   * #### Action
   *
   * ---
   *
   * A list of actions that the policy allows or denies (e.g., `Update:Modify`, `Update:Delete`). For more information, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
   */
  Action?: ('Update:Modify' | 'Update:Replace' | 'Update:Delete' | 'Update:*')[];
  /**
   * #### Condition
   *
   * ---
   *
   * Specifies the conditions under which the policy is in effect. For more information, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
   */
  Condition?: any;
  /**
   * #### Resource
   *
   * ---
   *
   * A list of resources to which the policy applies. For more information, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
   */
  Resource: string[];
  /**
   * #### Principal
   *
   * ---
   *
   * The principal to whom the policy applies. For more information, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
   */
  Principal: '*';
}

interface ResourceAccessProps {
  /**
   * #### Connect To
   *
   * ---
   *
   * Configures access to other resources in your stack and AWS services. By specifying resources here, Stacktape automatically:
   * - Configures IAM role permissions.
   * - Sets up security group rules to allow network traffic.
   * - Injects environment variables with connection details into the compute resource.
   *
   * Environment variables are named `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).
   *
   * ---
   *
   * #### Granted Permissions and Injected Variables:
   *
   * **`Bucket`**
   * - **Permissions:** List, create, get, delete, and tag objects.
   * - **Variables:** `NAME`, `ARN`
   *
   * **`DynamoDbTable`**
   * - **Permissions:** Get, put, update, delete, scan, and query items; describe table stream.
   * - **Variables:** `NAME`, `ARN`, `STREAM_ARN`
   *
   * **`MongoDbAtlasCluster`**
   * - **Permissions:** Allows connection to clusters with `accessibilityMode` set to `scoping-workloads-in-vpc`. Creates a temporary user for secure, credential-less access.
   * - **Variables:** `CONNECTION_STRING`
   *
   * **`RelationalDatabase`**
   * - **Permissions:** Allows connection to databases with `accessibilityMode` set to `scoping-workloads-in-vpc`.
   * - **Variables:** `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.
   *
   * **`RedisCluster`**
   * - **Permissions:** Allows connection to clusters with `accessibilityMode` set to `scoping-workloads-in-vpc`.
   * - **Variables:** `HOST`, `READER_HOST`, `PORT`
   *
   * **`EventBus`**
   * - **Permissions:** Publish events.
   * - **Variables:** `ARN`
   *
   * **`Function`**
   * - **Permissions:** Invoke the function, including via its URL if enabled.
   * - **Variables:** `ARN`
   *
   * **`BatchJob`**
   * - **Permissions:** Submit, list, describe, and terminate jobs; manage state machine executions.
   * - **Variables:** `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
   *
   * **`UserAuthPool`**
   * - **Permissions:** Full control over the user pool (`cognito-idp:*`).
   * - **Variables:** `ID`, `CLIENT_ID`, `ARN`
   *
   * **`SnsTopic`**
   * - **Permissions:** Confirm, list, publish, and manage subscriptions.
   * - **Variables:** `ARN`, `NAME`
   *
   * **`SqsQueue`**
   * - **Permissions:** Send, receive, delete, and purge messages.
   * - **Variables:** `ARN`, `NAME`, `URL`
   *
   * **`UpstashKafkaTopic`**
   * - **Variables:** `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`
   *
   * **`UpstashRedis`**
   * - **Variables:** `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
   *
   * **`PrivateService`**
   * - **Variables:** `ADDRESS`
   *
   * **`aws:ses` (Macro)**
   * - **Permissions:** Full permissions for AWS SES (`ses:*`).
   */
  connectTo?: string[];
  /**
   * #### Custom IAM Role Statements
   *
   * ---
   *
   * A list of raw AWS IAM role statements to append to the resource's role, allowing for fine-grained permission control.
   */
  iamRoleStatements?: StpIamRoleStatement[];
}

interface SimpleServiceContainer extends ResourceAccessProps {
  /**
   * #### Container Packaging
   *
   * ---
   *
   * Configures the container image for the service.
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### Environment Variables
   *
   * ---
   *
   * A list of environment variables to inject into the container at runtime. This is often used to provide configuration details, such as database URLs or secrets.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Logging Configuration
   *
   * ---
   *
   * Configures the logging behavior for the service container.
   *
   * Container logs (from `stdout` and `stderr`) are automatically sent to a CloudWatch log group and retained for 180 days by default. You can view logs in the AWS CloudWatch console or by using the [`stacktape logs` command](https://docs.stacktape.com/cli/commands/logs/).
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### Resource Allocation
   *
   * ---
   *
   * Configures the CPU, memory, and underlying compute engine for the service container.
   *
   * You can choose between two compute engines:
   * - **Fargate:** A serverless engine that abstracts away server management. To use Fargate, specify `cpu` and `memory` without `instanceTypes`.
   * - **EC2:** Provides direct control over the underlying virtual servers. To use EC2, specify the desired `instanceTypes`.
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * #### Scaling Configuration
   *
   * ---
   *
   * Configures horizontal scaling by adding or removing container instances based on demand. Incoming requests are automatically distributed across all available containers.
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Internal Health Check
   *
   * ---
   *
   * Configures an internal health check to monitor the container's status. If a container fails the health check, it is automatically terminated and replaced with a new one.
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Stop Timeout
   *
   * ---
   *
   * The amount of time (in seconds) to wait before a container is forcefully killed if it does not exit gracefully.
   *
   * When a container is stopped, it receives a `SIGTERM` signal. If it doesn't exit within the timeout period, it receives a `SIGKILL` signal. This allows for graceful shutdown and cleanup. The timeout must be between 2 and 120 seconds.
   *
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### Enable Remote Sessions
   *
   * ---
   *
   * If `true`, allows you to start an interactive shell session inside a running container using the `stacktape container:session` command.
   *
   * This uses AWS ECS Exec and SSM Session Manager for secure connections. It runs a small agent alongside your application, which consumes a minimal amount of CPU and memory. This is useful for debugging and inspecting deployed containers.
   *
   * @default false
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Volume Mounts
   *
   * ---
   *
   * A list of volumes to attach to the container for persistent storage.
   *
   * Currently, only EFS (Elastic File System) volumes are supported. Volumes can be shared across multiple containers and persist even if the container is stopped or replaced.
   */
  volumeMounts?: ContainerEfsMount[];
  /**
   * #### Sidecar Containers
   *
   * ---
   *
   * A list of helper containers that run alongside the main service container to provide additional functionality.
   *
   * - **`run-on-init`:** Runs to completion before the main service container starts. Ideal for setup tasks like database migrations.
   * - **`always-running`:** Runs for the entire lifecycle of the service container. Ideal for supporting services like logging, monitoring, or debugging agents.
   *
   * `always-running` containers can communicate with the main container via `localhost` on its exposed ports.
   */
  sideContainers?: ServiceHelperContainer[];
  /**
   * #### Deploys the service in private subnets with internet access through NAT Gateway.
   *
   * ---
   *
   * When the service is in a private subnet, it does not have public IP and direct internet access.
   * Instead, all outbound internet traffic is routed through a NAT Gateway.
   *
   * You can assign a static public IP address to the NAT Gateway and configure high availability using `stackConfig.vpcSettings`.
   * This allows you to whitelist your service's IP address in external services (e.g., third-party APIs, databases, payment gateways).
   *
   * **Cost considerations:**
   * - NAT Gateways incur additional AWS charges for both the gateway itself and data processing
   *
   * @default false
   */
  usePrivateSubnetsWithNAT?: boolean;
}

interface ServiceHelperContainer extends ContainerWorkloadContainerBase {
  /**
   * #### Container Type
   *
   * ---
   *
   * The type of the helper container.
   *
   * - **`run-on-init`:** Runs to completion before the main service container starts. The main container will wait for this container to exit with a code of 0. Ideal for setup tasks like database migrations.
   * - **`always-running`:** Runs for the entire lifecycle of the service container. Ideal for supporting services like logging or monitoring agents.
   */
  containerType: 'run-on-init' | 'always-running';
}

type StacktapeResourceReferenceableParam =
  | ApplicationLoadBalancerReferenceableParam
  | BatchJobReferencableParam
  | BucketReferencableParam
  | ContainerWorkloadReferencableParam
  | DynamoDBTableReferencableParam
  | EventBusReferencableParam
  | FunctionReferencableParam
  | HttpApiGatewayReferencableParam
  | MongoDbAtlasClusterReferencableParam
  | RedisClusterReferencableParam
  | RelationalDatabaseReferencableParam
  | StateMachineReferencableParam
  | UpstashRedisReferencableParam
  | UserPoolReferencableParam
  | PrivateServiceReferencableParams
  | WebServiceReferencableParam
  | WorkerServiceReferencableParams
  | WebAppFirewallReferencableParams
  | OpenSearchDomainReferencableParams
  | KinesisStreamReferencableParam;

```

## Lambda Functions (`type: function`)

```typescript
/**
 * #### A serverless compute resource that runs your code in response to events.
 *
 * ---
 *
 * Lambda functions are short-lived, stateless, and scale automatically. You only pay for the compute time you consume.
 */
interface LambdaFunction {
  type: 'function';
  properties: LambdaFunctionProps;
  overrides?: ResourceOverrides;
}

interface LambdaFunctionProps extends ResourceAccessProps {
  /**
   * #### Configures how your code is packaged and deployed.
   *
   * ---
   *
   * Stacktape supports two packaging methods:
   * - `stacktape-lambda-buildpack`: Stacktape automatically builds and packages your code from a specified source file. This is the recommended and simplest approach.
   * - `custom-artifact`: You provide a path to a pre-built deployment package (e.g., a zip file). Stacktape will handle the upload.
   *
   * Your deployment packages are stored in an S3 bucket managed by Stacktape.
   */
  packaging: LambdaPackaging;
  /**
   * #### A list of event sources that trigger this function.
   *
   * ---
   *
   * Functions are executed in response to events from various sources, such as:
   * - HTTP requests from an API Gateway.
   * - File uploads to an S3 bucket.
   * - Messages in an SQS queue.
   * - Scheduled events (cron jobs).
   *
   * Stacktape automatically configures the necessary permissions for the function to be invoked by these event sources.
   * The data passed to the function (the "event payload") varies depending on the trigger.
   */
  events?: (
    | HttpApiIntegration
    | S3Integration
    | ScheduleIntegration
    | SnsIntegration
    | SqsIntegration
    | KinesisIntegration
    | DynamoDbIntegration
    | CloudwatchLogIntegration
    | ApplicationLoadBalancerIntegration
    | EventBusIntegration
    | KafkaTopicIntegration
    | AlarmIntegration
  )[];
  /**
   * #### A list of environment variables available to the function at runtime.
   *
   * ---
   *
   * Environment variables are ideal for providing configuration details to your function, such as database connection strings, API keys, or other dynamic parameters.
   */
  environment?: EnvironmentVar[];
  /**
   * #### The runtime environment for the function.
   *
   * ---
   *
   * Stacktape automatically detects the programming language and selects the latest appropriate runtime. For example, `.ts` and `.js` files will use a recent Node.js runtime.
   * For a full list of available runtimes, see the [AWS Lambda runtimes documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).
   */
  runtime?: LambdaRuntime;
  /**
   * #### The processor architecture for the function.
   *
   * ---
   *
   * You can choose between two architectures:
   * - **x86_64**: The traditional 64-bit architecture, offering broad compatibility with libraries and dependencies.
   * - **arm64**: A modern ARM-based architecture that can offer better performance and cost-effectiveness for some workloads.
   *
   * If you use `stacktape-lambda-buildpack`, Stacktape automatically builds for the selected architecture. If you provide a custom artifact, ensure it's compiled for the target architecture.
   *
   * @default "x86_64"
   */
  architecture?: 'x86_64' | 'arm64';
  /**
   * #### The amount of memory (in MB) allocated to the function.
   *
   * ---
   *
   * This setting also influences the amount of CPU power your function receives. Higher memory allocation results in more powerful CPU resources.
   * The value must be between 128 MB and 10,240 MB.
   */
  memory?: number;
  /**
   * #### The maximum execution time for the function, in seconds.
   *
   * ---
   *
   * If the function runs longer than this, it will be terminated. The maximum allowed timeout is 900 seconds (15 minutes).
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### Connects the function to your stack's default Virtual Private Cloud (VPC).
   *
   * ---
   *
   * By default, functions are not connected to a VPC. Connecting to a VPC is necessary to access resources within that VPC, such as relational databases or Redis clusters.
   *
   * > **Important:** When a function joins a VPC, it loses direct internet access.
   *
   * If your function needs to access S3 or DynamoDB, Stacktape automatically creates VPC endpoints to ensure connectivity.
   * To learn more, see the [Stacktape VPCs documentation](https://docs.stacktape.com/user-guides/vpcs).
   */
  joinDefaultVpc?: boolean;
  /**
   * #### A list of tags to apply to the function.
   *
   * ---
   *
   * Tags are key-value pairs that help you organize, identify, and manage your AWS resources. You can specify up to 50 tags.
   */
  tags?: CloudformationTag[];
  /**
   * #### Configures destinations for asynchronous invocations.
   *
   * ---
   *
   * This feature allows you to route the results of a function's execution (success or failure) to another service for further processing. This is useful for building simple, event-driven workflows.
   * Supported destinations include SQS queues, SNS topics, EventBridge event buses, and other Lambda functions.
   *
   * For more information, see the [AWS Lambda Destinations documentation](https://aws.amazon.com/blogs/compute/introducing-aws-lambda-destinations/).
   */
  destinations?: LambdaFunctionDestinations;
  /**
   * #### Configures the logging behavior for the function.
   *
   * ---
   *
   * Function logs, including `stdout` and `stderr`, are automatically sent to a CloudWatch log group.
   * By default, logs are retained for 180 days.
   *
   * You can view logs in two ways:
   *   - Through the AWS CloudWatch console. Use the `stacktape stack-info` command to get a direct link.
   *   - Using the `stacktape logs` command to stream logs directly to your terminal.
   */
  logging?: LambdaFunctionLogging;
  /**
   * #### Configures the provisioned concurrency for the function.
   *
   * ---
   *
   * This is the number of pre-initialized execution environments allocated to your function.
   * These execution environments are ready to respond immediately to incoming function requests.
   * Provisioned concurrency is useful for reducing cold start latencies for functions and designed to make functions available with double-digit millisecond response times.
   * Generally, interactive workloads benefit the most from the feature.
   * Those are applications with users initiating requests, such as web and mobile applications, and are the most sensitive to latency.
   * Asynchronous workloads, such as data processing pipelines, are often less latency sensitive and so do not usually need provisioned concurrency.
   * Configuring provisioned concurrency incurs additional charges to your AWS account.
   */
  provisionedConcurrency?: number;
  /**
   * #### Configures the reserved concurrency for the function.
   *
   * ---
   *
   * This sets both the maximum and minimum number of concurrent instances allocated to your function.
   * When a function has reserved concurrency, no other function can use that concurrency.
   * Reserved concurrency is useful for ensuring that your most critical functions always have enough concurrency to handle incoming requests.
   * Additionally, reserved concurrency can be used for limiting concurrency to prevent overwhelming downstream resources, like database connections.
   * Reserved concurrency acts as both a lower and upper bound - it reserves the specified capacity exclusively for your function while also preventing it from scaling beyond that limit.
   * Configuring reserved concurrency for a function incurs no additional charges.
   */
  reservedConcurrency?: number;
  /**
   * #### A list of layers to add to the function.
   *
   * ---
   *
   * A Lambda layer is a .zip file archive that contains supplementary code or data.
   * Layers usually contain library dependencies, a custom runtime, or configuration files.
   *
   * Using layers:
   * 1. Package your layer content. This means creating a .zip file archive. For more information, see [Packaging your layer content](https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html).
   * 2. Create the layer in Lambda. For more information, see [Creating and deleting layers in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/creating-deleting-layers.html)
   * 3. Get the layer ARN and put it in the `layers` property of the function.
  */
  layers?: string[];
  /**
   * #### Configures the deployment strategy for updating the function.
   *
   * ---
   *
   * This allows for safe, gradual deployments. Instead of instantly replacing the old version, traffic is shifted to the new version over time. This provides an opportunity to monitor for issues and roll back if necessary.
   *
   * Supported strategies include:
   *   - **Canary**: A percentage of traffic is shifted to the new version for a specified time before routing all traffic.
   *   - **Linear**: Traffic is shifted in equal increments over a specified period.
   *   - **AllAtOnce**: All traffic is shifted to the new version immediately.
   */
  deployment?: LambdaDeploymentConfig;
  /**
   * #### A list of additional alarms to associate with this function.
   *
   * ---
   *
   * These alarms are merged with any globally configured alarms from the Stacktape console.
   */
  alarms?: LambdaAlarm[];
  /**
   * #### A list of global alarm names to disable for this function.
   *
   * ---
   *
   * Use this to prevent specific globally-defined alarms from applying to this function.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Configures a dedicated HTTPS endpoint (URL) for the function.
   *
   * ---
   *
   * This provides a simple way to invoke your function over HTTPS without needing an API Gateway. The URL is automatically generated.
   */
  url?: LambdaUrlConfig;
  /**
   * #### Places an AWS CloudFront Content Delivery Network (CDN) in front of the function.
   *
   * ---
   *
   * A CDN can significantly improve performance and reduce latency by caching the function's responses at edge locations closer to your users.
   * This is useful for reducing load on your function, lowering bandwidth costs, and improving security.
   */
  cdn?: CdnConfiguration;
  /**
   * #### The size (in MB) of the function's `/tmp` directory.
   *
   * ---
   *
   * This provides ephemeral storage for your function. The size can be between 512 MB and 10,240 MB.
   *
   * @default 512
   */
  storage?: number;
  /**
   * #### A list of file system volumes to mount to the function.
   *
   * ---
   *
   * Volumes provide persistent storage that can be shared across multiple function invocations and even multiple functions.
   * This is useful for workloads that require access to a shared file system.
   * Currently, only EFS (Elastic File System) volumes are supported.
   *
   * > **Note:** The function must be connected to a VPC to use this feature (`joinDefaultVpc: true`).
   */
  volumeMounts?: LambdaEfsMount[];
}

interface LambdaUrlConfig {
  /**
   * #### Enables the Lambda function URL.
   *
   * ---
   *
   * When enabled, your function gets a dedicated HTTPS endpoint. The URL format is `https://{url-id}.lambda-url.{region}.on.aws`.
   */
  enabled: boolean;
  /**
   * #### Configures Cross-Origin Resource Sharing (CORS) for the function URL.
   *
   * ---
   *
   * If configured, these settings will override any CORS headers returned by the function itself.
   */
  cors?: LambdaUrlCorsConfig;
  /**
   * #### The authentication mode for the function URL.
   *
   * ---
   *
   * - `AWS_IAM`: Only authenticated AWS users and roles with the necessary permissions can invoke the URL.
   * - `NONE`: The URL is public and can be invoked by anyone.
   *
   * @default NONE
   */
  authMode?: 'AWS_IAM' | 'NONE';
  /**
   * #### Enables response streaming.
   *
   * ---
   *
   * With streaming, the function can start sending parts of the response as they become available, which can improve Time to First Byte (TTFB).
   * It also increases the maximum response size to 20MB (from the standard 6MB).
   * To use this, you need to use a specific handler provided by AWS. See the [AWS documentation on response streaming](https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html#config-rs-write-functions-handler).
   */
  responseStreamEnabled?: boolean;
}

interface LambdaUrlCorsConfig {
  /**
   * #### Enables Cross-Origin Resource Sharing (CORS).
   *
   * ---
   *
   * If enabled without other properties, a permissive default CORS configuration is used:
   * - `AllowedMethods`: `*`
   * - `AllowedOrigins`: `*`
   * - `AllowedHeaders`: `Content-Type`, `X-Amz-Date`, `Authorization`, `X-Api-Key`, `X-Amz-Security-Token`, `X-Amz-User-Agent`
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### A list of origins that are allowed to make cross-domain requests.
   *
   * ---
   *
   * An origin is the combination of the protocol, domain, and port. For example: `https://example.com`.
   *
   * @default *
   */
  allowedOrigins?: string[];
  /**
   * #### A list of allowed HTTP headers in a cross-origin request.
   *
   * ---
   *
   * This is used in response to a preflight `Access-Control-Request-Headers` header.
   */
  allowedHeaders?: string[];
  /**
   * #### A list of allowed HTTP methods for cross-origin requests.
   *
   * ---
   *
   * By default, Stacktape determines the allowed methods based on the event integrations configured for the function.
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Specifies whether the browser should include credentials (such as cookies) in the CORS request.
   */
  allowCredentials?: boolean;
  /**
   * #### A list of response headers that should be accessible to scripts running in the browser.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### The maximum time (in seconds) that a browser can cache the response to a preflight request.
   */
  maxAge?: number;
}

interface LambdaDeploymentConfig {
  /**
   * #### The strategy to use for deploying updates to the function.
   *
   * ---
   *
   * Supported strategies:
   * - **Canary10Percent5Minutes**: Shifts 10% of traffic, then the rest after 5 minutes.
   * - **Canary10Percent10Minutes**: Shifts 10% of traffic, then the rest after 10 minutes.
   * - **Canary10Percent15Minutes**: Shifts 10% of traffic, then the rest after 15 minutes.
   * - **Canary10Percent30Minutes**: Shifts 10% of traffic, then the rest after 30 minutes.
   * - **Linear10PercentEvery1Minute**: Shifts 10% of traffic every minute.
   * - **Linear10PercentEvery2Minutes**: Shifts 10% of traffic every 2 minutes.
   * - **Linear10PercentEvery3Minutes**: Shifts 10% of traffic every 3 minutes.
   * - **Linear10PercentEvery10Minutes**: Shifts 10% of traffic every 10 minutes.
   * - **AllAtOnce**: Shifts all traffic at once.
   */
  strategy:
    | 'Canary10Percent5Minutes'
    | 'Canary10Percent10Minutes'
    | 'Canary10Percent15Minutes'
    | 'Canary10Percent30Minutes'
    | 'Linear10PercentEvery1Minute'
    | 'Linear10PercentEvery2Minutes'
    | 'Linear10PercentEvery3Minutes'
    | 'Linear10PercentEvery10Minutes'
    | 'AllAtOnce';
  /**
   * #### The name of a Lambda function to run before traffic shifting begins.
   *
   * ---
   *
   * This "hook" function is typically used to run validation checks before the new version receives production traffic.
   * The function must signal success or failure to CodeDeploy. See an example in the [documentation](/compute-resources/lambda-functions/#hook-functions).
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### The name of a Lambda function to run after all traffic has been shifted.
   *
   * ---
   *
   * This "hook" function is typically used for post-deployment validation.
   * The function must signal success or failure to CodeDeploy. See an example in the [documentation](/compute-resources/lambda-functions/#hook-functions).
   */
  afterTrafficShiftFunction?: string;
}

interface LambdaFunctionDestinations {
  /**
   * #### The ARN of the destination for successful invocations.
   *
   * ---
   *
   * When the function executes successfully, a JSON object with the execution result is sent to this destination (e.g., an SQS queue, SNS topic, or another Lambda).
   * This can be used to chain Lambda functions together or to trigger other processes.
   * For details on the payload format, refer to the [Stacktape documentation](https://docs.stacktape.com/compute-resources/lambda-functions#event-bus-event).
   */
  onSuccess?: string;
  /**
   * #### The ARN of the destination for failed invocations.
   *
   * ---
   *
   * When the function execution fails, a JSON object containing details about the error is sent to this destination.
   * This is useful for error handling, retries, or sending notifications.
   * For details on the payload format, refer to the [Stacktape documentation](https://docs.stacktape.com/compute-resources/lambda-functions#event-bus-event).
   */
  onFailure?: string;
}

interface LambdaFunctionLogging extends LogForwardingBase {
  /**
   * #### Disables application logging to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The number of days to retain logs in CloudWatch.
   *
   * @default 180
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface LambdaEfsMount {
  /**
   * #### The type of the volume mount.
   */
  type: 'efs';
  /**
   * #### Properties for the EFS volume mount.
   */
  properties: LambdaEfsMountProps;
}

interface LambdaEfsMountProps {
  /**
   * #### The name of the EFS filesystem to mount.
   *
   * ---
   *
   * This must match the name of an EFS filesystem defined in your Stacktape configuration.
   */
  efsFilesystemName: string;

  /**
   * #### The root directory within the EFS filesystem to mount.
   *
   * ---
   *
   * This restricts the function's access to a specific directory within the filesystem. If not specified, the function can access the entire filesystem.
   *
   * @default "/"
   */
  rootDirectory?: string;

  /**
   * #### The path where the EFS volume will be mounted inside the function.
   *
   * ---
   *
   * This must be an absolute path starting with `/mnt/`. For example: `/mnt/data`.
   */
  mountPath: string;
}

type StpLambdaFunction = LambdaFunctionProps & {
  name: string;
  type: LambdaFunction['type'];
  configParentResourceType:
    | BatchJob['type']
    | LambdaFunction['type']
    | CustomResourceDefinition['type']
    | DeploymentScript['type']
    | NextjsWeb['type'];
  nameChain: string[];
  handler: string;
  cfLogicalName: string;
  artifactName: string;
  resourceName: string;
  aliasLogicalName?: string;
};

type StpHelperLambdaFunction = Omit<StpLambdaFunction, 'packaging'> & {
  packaging: HelperLambdaPackaging;
  artifactPath: string;
  runtime: LambdaRuntime;
};

type FunctionReferencableParam = 'arn' | 'logGroupArn';

```

## Web Services (`type: web-service`)

```typescript
/**
 * #### Web Service
 *
 * ---
 *
 * A continuously running container with a public endpoint (URL) that is accessible from the internet.
 * It includes TLS/SSL out of the box and provides easy configuration for scaling, health checks, and other properties.
 */
interface WebService {
  type: 'web-service';
  properties: WebServiceProps;
  overrides?: ResourceOverrides;
}

interface WebServiceProps extends SimpleServiceContainer {
  /**
   * #### Configures CORS (Cross-Origin Resource Sharing) for this service.
   *
   * ---
   *
   * If CORS is configured using this property, any CORS headers returned from your application will be ignored and replaced.
   *
   * > This property is only effective if the `loadBalancing` type is `http-api-gateway` (the default).
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Attaches custom domains to this Web Service.
   *
   * ---
   *
   * Stacktape allows you to connect custom domains to various resources, including Web Services, HTTP API Gateways, Application Load Balancers, and Buckets with CDNs.
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** If the resource uses HTTPS, Stacktape issues and attaches a free, AWS-managed TLS certificate, handling TLS termination for you.
   *
   * If you want to use your own certificates, you can configure `customCertificateArns`.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Configures the entry point used for distributing traffic to containers.
   *
   * ---
   *
   * The following entry point types are supported:
   *
   * - **`http-api-gateway`** (default):
   *   - Distributes traffic to available containers randomly.
   *   - Uses a pay-per-use pricing model (~$1 per million requests).
   *   - Ideal for most workloads, but an `application-load-balancer` may be more cost-effective if you exceed ~500,000 requests per day.
   *
   * - **`application-load-balancer`**:
   *   - Distributes traffic to available containers in a round-robin fashion.
   *   - Uses a pricing model that combines a flat hourly charge (~$0.0252/hour) with usage-based charges for LCUs (Load Balancer Capacity Units) (~$0.08/hour).
   *   - Eligible for the AWS Free Tier. For more details, see the [AWS pricing documentation](https://aws.amazon.com/elasticloadbalancing/pricing/).
   *
   * - **`network-load-balancer`**:
   *   - Supports TCP and TLS protocols.
   *   - Uses the same pricing model as the `application-load-balancer`.
   *   - Also eligible for the AWS Free Tier.
   */
  loadBalancing?: WebServiceHttpApiGatewayLoadBalancing | WebServiceAlbLoadBalancing | WebServiceNlbLoadBalancing;
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your Web Service.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your Web Service, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin (the Web Service containers).
   * - Enhance security.
   *
   * The CDN caches responses from the origin at the edge for a specified amount of time.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: (HttpApiGatewayAlarm | ApplicationLoadBalancerAlarm)[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Configures the deployment behavior of the Web Service.
   *
   * ---
   *
   * This allows you to safely update your service in a live environment by gradually shifting traffic to the new version.
   * This gives you the opportunity to monitor the workload during the update and quickly roll back in case of any issues.
   *
   * The following deployment strategies are supported:
   * - **`Canary10Percent5Minutes`**: Shifts 10% of traffic, then the remaining 90% five minutes later.
   * - **`Canary10Percent15Minutes`**: Shifts 10% of traffic, then the remaining 90% fifteen minutes later.
   * - **`Linear10PercentEvery1Minute`**: Shifts 10% of traffic every minute until all traffic is shifted.
   * - **`Linear10PercentEvery3Minutes`**: Shifts 10% of traffic every three minutes until all traffic is shifted.
   * - **`AllAtOnce`**: Shifts all traffic to the updated service at once.
   *
   * You can use Lambda function hooks to validate or abort the deployment.
   *
   * > This feature requires the `loadBalancing` type to be set to `application-load-balancer`.
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### The name of the `web-app-firewall` resource to use for this Web Service.
   *
   * ---
   *
   * A `web-app-firewall` can protect your resources from common web exploits that could affect availability, compromise security, or consume excessive resources.
   * The firewall works by filtering malicious requests before they reach your application.
   *
   * For more information, see the [firewall documentation](https://docs.stacktape.com/security-resources/web-app-firewalls/).
   */
  useFirewall?: string;
}

type StpWebService = WebService['properties'] & {
  name: string;
  type: WebService['type'];
  configParentResourceType: WebService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    httpApiGateway?: StpHttpApiGateway;
    loadBalancer?: StpApplicationLoadBalancer;
    networkLoadBalancer?: StpNetworkLoadBalancer;
  };
};

type WebServiceReferencableParam = HttpApiGatewayReferencableParam | ContainerWorkloadReferencableParam;

interface WebServiceHttpApiGatewayLoadBalancing {
  type: HttpApiGateway['type'];
}

interface WebServiceAlbLoadBalancing {
  type: ApplicationLoadBalancer['type'];
  properties?: WebServiceAlbLoadBalancingProps;
}

interface WebServiceAlbLoadBalancingProps {
  /**
   * #### The path on which the Load Balancer performs health checks.
   *
   * ---
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### The interval (in seconds) for how often the health check is performed.
   *
   * ---
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### The timeout (in seconds) after which the health check is considered failed.
   *
   * ---
   *
   * @default 4
   */
  healthcheckTimeout?: number;
}

interface WebServiceNlbLoadBalancing {
  type: NetworkLoadBalancer['type'];
  properties: WebServiceNlbLoadBalancingProps;
}

interface WebServiceNlbLoadBalancingProps {
  /**
   * #### The path on which the Load Balancer performs health checks.
   *
   * ---
   *
   * This only takes effect if `healthcheckProtocol` is set to `HTTP`.
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### The interval (in seconds) for how often the health check is performed.
   *
   * ---
   *
   * Must be between 5 and 300.
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### The timeout (in seconds) after which the health check is considered failed.
   *
   * ---
   *
   * Must be between 2 and 120.
   *
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### The protocol the Load Balancer uses when performing health checks on targets.
   *
   * ---
   *
   * @default TCP
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### The port the Load Balancer uses when performing health checks on targets.
   *
   * ---
   *
   * By default, this uses the same port that receives traffic from the Load Balancer.
   */
  healthCheckPort?: number;
  ports: WebServiceNlbLoadBalancingPort[];
}

interface WebServiceNlbLoadBalancingPort {
  /**
   * #### The port number exposed by the Load Balancer.
   *
   * ---
   *
   */
  port: number;
  /**
   * #### The protocol to be used for the Load Balancer.
   *
   * ---
   *
   * @default TLS
   */
  protocol?: 'TCP' | 'TLS';
  /**
   * #### The port number on the container that will receive traffic from the Load Balancer.
   *
   * ---
   *
   * Defaults to the same port number specified in the `port` property.
   */
  containerPort?: number;
}

```

## Relational Databases (`type: relational-database`)

```typescript
/**
 * #### A fully managed relational (SQL) database resource.
 *
 * ---
 *
 * Supports various database engines like PostgreSQL, MySQL, and MariaDB, with features like clustering and high availability.
 */
interface RelationalDatabase {
  type: 'relational-database';
  properties: RelationalDatabaseProps;
  overrides?: ResourceOverrides;
}

interface RelationalDatabaseProps {
  /**
   * #### Configures the credentials for the database's master user.
   *
   * ---
   *
   * These credentials are used to connect to the database and are included in the connection string.
   */
  credentials: RelationalDatabaseCredentials;
  /**
   * #### Configures the database engine.
   *
   * ---
   *
   * The engine determines the database type (e.g., PostgreSQL, MySQL), performance characteristics, and features like high availability and scaling.
   *
   * Stacktape supports several engine types:
   *
   * - **RDS Engines**: Fully managed, single-node databases (e.g., `postgres`, `mysql`). Ideal for standard workloads.
   * - **Aurora Engines**: High-performance, highly available clustered databases developed by AWS (e.g., `aurora-postgresql`, `aurora-mysql`).
   * - **Aurora Serverless V2 Engines**: A serverless version of Aurora that automatically scales compute capacity based on demand (e.g., `aurora-postgresql-serverless-v2`). This is the recommended serverless option.
   *
   * For more details on each engine, see the [AWS documentation](https://aws.amazon.com/rds/).
   */
  engine: AuroraServerlessEngine | RdsEngine | AuroraEngine | AuroraServerlessV2Engine;
  /**
   * #### Configures the network accessibility of the database.
   *
   * ---
   *
   * By default, the database is accessible from the internet (but still protected by credentials).
   * You can restrict access to a VPC, specific IP addresses, or only to other resources within your stack.
   */
  accessibility?: DatabaseAccessibility;
  /**
   * #### Protects the database from accidental deletion.
   *
   * ---
   *
   * If enabled, you must explicitly disable this protection before you can delete the database.
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### The number of days to retain automated backups.
   *
   * ---
   *
   * Automated backups are taken daily. You can retain them for up to 35 days.
   * To disable automated backups for RDS engines, set this to 0.
   * This setting does not affect manual snapshots.
   *
   * @default 1
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### The preferred time window for database maintenance.
   *
   * ---
   *
   * Maintenance activities, such as OS patching or engine upgrades, will be performed during this window.
   * The database may be briefly unavailable during maintenance. To avoid downtime, use a multi-AZ deployment or an Aurora engine.
   *
   * The format is `day:start_time-day:end_time` in UTC (e.g., `Sun:02:00-Sun:04:00`).
   * By default, the maintenance window is set to a region-specific time on Sundays.
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### A list of additional alarms to associate with this database.
   *
   * ---
   *
   * These alarms are merged with any globally configured alarms from the Stacktape console.
   */
  alarms?: RelationalDatabaseAlarm[];
  /**
   * #### A list of global alarm names to disable for this database.
   *
   * ---
   *
   * Use this to prevent specific globally-defined alarms from applying to this database.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Configures logging for the database.
   *
   * ---
   *
   * By default, logs are enabled and retained for 90 days.
   * The available log types depend on the database engine. You can log connections, queries, errors, and more.
   */
  logging?: RelationalDatabaseLogging;
  /**
   * #### Dev Mode Configuration
   *
   * ---
   *
   * Configures how this database behaves during `stacktape dev` mode.
   * By default, databases run locally using Docker. Set `dev.remote: true` to connect to the deployed AWS database instead.
   */
  dev?: DevModeConfig;
}

type StpRelationalDatabase = RelationalDatabase['properties'] & {
  name: string;
  type: RelationalDatabase['type'];
  configParentResourceType: RelationalDatabase['type'];
  nameChain: string[];
};

interface SharedEngineProperties {
  /**
   * #### The version of the database engine.
   *
   * ---
   *
   * Each engine type supports a specific set of versions.
   * For a full list, see the [Stacktape documentation](https://docs.stacktape.com/database-resources/relational-databases/#engine-version).
   */
  version: string;
  /**
   * #### Specifies whether minor engine upgrades should be applied automatically.
   *
   * @default false
   */
  disableAutoMinorVersionUpgrade?: boolean;
}

/**
 * #### A high-performance Aurora clustered database engine.
 *
 * ---
 *
 * Aurora is a fully managed, MySQL and PostgreSQL-compatible database developed by AWS.
 * It offers up to 5x the throughput of standard MySQL and 3x the throughput of standard PostgreSQL.
 *
 * Aurora automatically replicates data across multiple Availability Zones for high availability
 * and provides automatic failover with read replicas.
 */
interface AuroraEngine {
  type: 'aurora-mysql' | 'aurora-postgresql';
  properties: AuroraEngineProperties;
}

/**
 * #### An Aurora Serverless v1 database engine.
 *
 * ---
 *
 * Aurora Serverless v1 automatically scales compute capacity based on your application's needs.
 * It can pause during periods of inactivity and resume when traffic arrives, making it cost-effective
 * for variable or unpredictable workloads.
 *
 * **Note:** For new projects, consider using Aurora Serverless v2 which offers better scaling.
 */
interface AuroraServerlessEngine {
  type: 'aurora-mysql-serverless' | 'aurora-postgresql-serverless';
  properties?: AuroraServerlessEngineProperties;
}

/**
 * #### An Aurora Serverless v2 database engine (recommended serverless option).
 *
 * ---
 *
 * Aurora Serverless v2 provides instant, fine-grained scaling from 0.5 to 128 ACUs.
 * It scales in increments as small as 0.5 ACUs for more precise capacity matching.
 *
 * This is the recommended serverless engine for most use cases, offering better performance
 * and more granular scaling than v1.
 */
interface AuroraServerlessV2Engine {
  type: 'aurora-mysql-serverless-v2' | 'aurora-postgresql-serverless-v2';
  properties: AuroraServerlessV2EngineProperties;
}

/**
 * #### A standard RDS single-instance database engine.
 *
 * ---
 *
 * RDS engines are fully managed, single-node databases ideal for standard workloads.
 * Supported engines include PostgreSQL, MySQL, MariaDB, Oracle, and SQL Server.
 *
 * RDS handles routine database tasks such as provisioning, patching, backup, recovery,
 * and failure detection. For high availability, enable multi-AZ deployment.
 */
interface RdsEngine {
  type:
    | 'postgres'
    | 'mariadb'
    | 'mysql'
    | 'oracle-ee'
    | 'oracle-se2'
    | 'sqlserver-ee'
    | 'sqlserver-ex'
    | 'sqlserver-se'
    | 'sqlserver-web';
  properties: RdsEngineProperties;
}

interface RdsEnginePrimaryInstance {
  /**
   * #### The instance size for the database.
   *
   * ---
   *
   * This determines the CPU, memory, and networking capacity of the database instance.
   * For a list of available instance sizes, see the [AWS RDS instance types documentation](https://aws.amazon.com/rds/instance-types/).
   *
   * > **Note:** Not all instance sizes are available for all engines, versions, and regions.
   * > Some instance families (like `t3` or `t4`) are intended for development and testing, not production workloads.
   */
  instanceSize: string;
  /**
   * #### Specifies whether the database should be deployed across multiple Availability Zones (AZs) for high availability.
   *
   * ---
   *
   * When enabled, a standby replica is created in a different AZ. If the primary instance fails, traffic is automatically failed over to the standby.
   * This also minimizes downtime during maintenance.
   */
  multiAz?: boolean;
}

interface RelationalDatabaseCredentials {
  /**
   * #### The username for the database's master user.
   *
   * ---
   *
   * This user will have administrative privileges for the database.
   * Avoid using the following characters in the username: `[]{}(),;?*=!@`.
   *
   * > Changing this value after the database has been created will cause the database to be replaced, resulting in data loss.
   *
   * @default "db_master_user"
   */
  masterUserName?: string;
  /**
   * #### The password for the database's master user.
   *
   * ---
   *
   * Avoid using the following characters in the password: `[]{}(),;?*=!@`.
   *
   * > **Recommendation:** Store the password in a [Stacktape secret](https://docs.stacktape.com/security-resources/secrets/) and reference it using the `$Secret` directive to avoid exposing it in your configuration file.
   */
  masterUserPassword: string;
}

interface DatabaseAccessibility {
  /**
   * #### The accessibility mode for the database.
   *
   * ---
   *
   * - **internet**: The database is accessible from anywhere on the internet.
   * - **vpc**: The database is only accessible from within the same VPC. You can optionally whitelist external IPs.
   * - **scoping-workloads-in-vpc**: Similar to `vpc` mode, but requires explicit `connectTo` permissions for other resources in the stack to access the database.
   * - **whitelisted-ips-only**: The database is only accessible from a specific list of IP addresses.
   *
   * > **Note:** Aurora Serverless engines do not support public accessibility. You must use `vpc` or `scoping-workloads-in-vpc` and connect via a bastion host or the Data API.
   *
   * For more information on VPCs, see the [Stacktape VPCs documentation](https://docs.stacktape.com/user-guides/vpcs/).
   *
   * @default "internet"
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc' | 'whitelisted-ips-only';
  /**
   * #### Disables public accessibility for the database endpoint.
   *
   * ---
   *
   * This ensures that the database can only be accessed from within its VPC, providing an additional layer of isolation.
   *
   * > For Aurora engines, this property can only be set when the database is created and cannot be changed later.
   */
  forceDisablePublicIp?: boolean;
  /**
   * #### A list of IP addresses or CIDR ranges to allow access from.
   *
   * ---
   *
   * - In `vpc` and `scoping-workloads-in-vpc` modes, this allows access from outside the VPC (e.g., an office IP).
   * - In `whitelisted-ips-only` mode, only these addresses can access the database.
   * - This has no effect in `internet` mode.
   */
  whitelistedIps?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RdsEngineReadReplica extends RdsEnginePrimaryInstance {}

interface RdsEngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create in the cluster.
   *
   * ---
   *
   * The behavior of this property depends on the engine:
   * - For MySQL, MariaDB, and PostgreSQL, this is the name of the database created on initialization. If not specified, a default database is created.
   * - For Oracle, this is the System ID (SID) of the database instance.
   * - For SQL Server, this property is not applicable.
   */
  dbName?: string;
  /**
   * #### The port on which the database server will listen for connections.
   *
   * ---
   *
   * Default ports vary by engine:
   * - MySQL/MariaDB: 3306
   * - PostgreSQL: 5432
   * - Oracle: 1521
   * - SQL Server: 1433
   */
  port?: number;
  /**
   * #### Configures storage for the database.
   *
   * ---
   *
   * Storage will automatically scale up when free space is low.
   * For more details on storage autoscaling, see the [AWS documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.StorageTypes.html#USER_PIOPS.Autoscaling).
   */
  storage?: RdsEngineStorage;
  /**
   * #### Configures the primary database instance.
   *
   * ---
   *
   * The primary instance handles all write operations. You can specify its size and enable multi-AZ deployment for high availability.
   */
  primaryInstance: RdsEnginePrimaryInstance;
  /**
   * #### A list of read replicas for the primary instance.
   *
   * ---
   *
   * Read replicas can handle read-only traffic to reduce the load on the primary instance.
   * They are kept in sync with the primary through asynchronous replication.
   * Each read replica has its own endpoint.
   */
  readReplicas?: RdsEngineReadReplica[];
}

interface RelationalDatabaseLogging extends LogForwardingBase {
  /**
   * #### Disables the collection of database server logs to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The number of days to retain logs in CloudWatch.
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
  /**
   * #### The types of logs to export to CloudWatch.
   *
   * ---
   *
   * The available log types depend on the database engine.
   *
   * - **PostgreSQL**: `postgresql`
   * - **MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`
   * - **Oracle**: `alert`, `audit`, `listener`, `trace`
   * - **SQL Server**: `agent`, `error`
   */
  logTypes?: string[];
  /**
   * #### Engine-specific logging options.
   *
   * ---
   *
   * This allows for more granular control over what is logged.
   * Currently supported for PostgreSQL, MySQL, and MariaDB.
   */
  engineSpecificOptions?: PostgresLoggingOptions | MysqlLoggingOptions;
}

interface PostgresLoggingOptions {
  /**
   * #### Logs all new client connections.
   *
   * @default false
   */
  log_connections?: boolean;
  /**
   * #### Logs all client disconnections.
   *
   * @default false
   */
  log_disconnections?: boolean;
  /**
   * #### Logs sessions that are waiting for a lock.
   *
   * ---
   *
   * This can help identify performance issues caused by lock contention.
   *
   * @default false
   */
  log_lock_waits?: boolean;
  /**
   * #### The minimum execution time (in milliseconds) for a statement to be logged.
   *
   * ---
   *
   * - `-1`: Disables this feature.
   * - `0`: Logs all statements.
   * - `>0`: Logs statements that exceed this duration.
   *
   * This is useful for identifying slow queries.
   *
   * @default 10000
   */
  log_min_duration_statement?: number;
  /**
   * #### Controls which types of SQL statements are logged.
   *
   * ---
   *
   * - `none`: No statements are logged.
   * - `ddl`: Logs all Data Definition Language (DDL) statements (e.g., `CREATE`, `ALTER`).
   * - `mod`: Logs all DDL statements plus `INSERT`, `UPDATE`, and `DELETE`.
   * - `all`: Logs all statements.
   *
   * @default "ddl"
   */
  log_statement?: 'none' | 'ddl' | 'mod' | 'all';
}

interface MysqlLoggingOptions {
  /**
   * #### The types of activity to record in the audit log.
   *
   * ---
   *
   * - `CONNECT`: Successful and unsuccessful connections and disconnections.
   * - `QUERY`: The text of all queries.
   * - `QUERY_DDL`: Only Data Definition Language (DDL) queries.
   * - `QUERY_DML`: Only Data Manipulation Language (DML) queries (including `SELECT`).
   * - `QUERY_DML_NO_SELECT`: DML queries, excluding `SELECT`.
   * - `QUERY_DCL`: Only Data Control Language (DCL) queries.
   *
   * @default ["QUERY_DDL"]
   */
  server_audit_events?: ('CONNECT' | 'QUERY' | 'QUERY_DDL' | 'QUERY_DML' | 'QUERY_DML_NO_SELECT' | 'QUERY_DCL')[];
  /**
   * #### The execution time (in seconds) above which a query is considered "slow" and logged to the slow query log.
   *
   * ---
   *
   * Use `-1` to disable slow query logging.
   *
   * @default 10
   */
  long_query_time?: number;
}

interface RdsEngineStorage {
  /**
   * #### The initial storage size (in GB) for the database.
   *
   * @default 20
   */
  initialSize?: number;
  /**
   * #### The maximum storage size (in GB) that the database can scale up to.
   *
   * @default 200
   */
  maxSize?: number;
}

interface AuroraServerlessEngineProperties extends Omit<SharedEngineProperties, 'version'> {
  /**
   * #### The version of the database engine.
   *
   * ---
   *
   * For serverless engines, you typically don't need to specify this, as AWS manages the version.
   * For a list of supported versions, see the [Stacktape documentation](https://docs.stacktape.com/database-resources/relational-databases/#engine-version).
   */
  version?: string;
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The minimum number of Aurora Capacity Units (ACUs) for the database to scale down to.
   *
   * ---
   *
   * Each ACU provides approximately 2 GB of memory and corresponding CPU and networking.
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless`: 1, 2, 4, 8, 16, 32, 64, 128, 256
   * - `aurora-postgresql-serverless`: 2, 4, 8, 16, 32, 64, 128, 256
   *
   * @default 2
   */
  minCapacity?: number;
  /**
   * #### The maximum number of Aurora Capacity Units (ACUs) for the database to scale up to.
   *
   * ---
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless`: 1, 2, 4, 8, 16, 32, 64, 128, 256
   * - `aurora-postgresql-serverless`: 2, 4, 8, 16, 32, 64, 128, 256
   *
   * @default 4
   */
  maxCapacity?: number;
  /**
   * #### The time (in seconds) of inactivity before the serverless database is paused.
   *
   * ---
   *
   * The database is considered inactive if there are no active connections.
   * When paused, you are only charged for storage.
   *
   * The value must be between 300 (5 minutes) and 86400 (24 hours). If not set, the database is never paused.
   */
  pauseAfterSeconds?: number;
}

interface AuroraServerlessV2EngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The minimum number of Aurora Capacity Units (ACUs) for the database to scale down to.
   *
   * ---
   *
   * Each ACU provides approximately 2 GB of memory and corresponding CPU and networking.
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless-v2`: 0.5-128 (in 0.5 increments)
   * - `aurora-postgresql-serverless-v2`: 0.5-128 (in 0.5 increments)
   *
   * @default 0.5
   */
  minCapacity?: number;
  /**
   * #### The maximum number of Aurora Capacity Units (ACUs) for the database to scale up to.
   *
   * ---
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless-v2`: 0.5-128 (in 0.5 increments)
   * - `aurora-postgresql-serverless-v2`: 0.5-128 (in 0.5 increments)
   *
   * @default 10
   */
  maxCapacity?: number;
}

interface AuroraEngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The port on which the database will listen for connections.
   *
   * ---
   *
   * - `aurora-mysql`: 3306
   * - `aurora-postgresql`: 5432
   */
  port?: number;
  /**
   * #### A list of database instances in the Aurora cluster.
   *
   * ---
   *
   * The first instance in the list is the primary (writer) instance. The rest are read replicas.
   * Read requests are automatically load-balanced across all instances.
   * If the primary instance fails, a read replica is automatically promoted to be the new primary.
   */
  instances: AuroraEngineInstance[];
}

interface AuroraEngineInstance {
  /**
   * #### The instance size for the database.
   *
   * ---
   *
   * This determines the CPU, memory, and networking capacity of the database instance.
   * For a list of available instance sizes, see the [AWS Aurora pricing documentation](https://aws.amazon.com/rds/aurora/pricing/#Database%20Instances).
   *
   * > **Note:** Not all instance sizes are available for all engines, versions, and regions.
   * > Some instance families (like `t3` or `t4`) are intended for development and testing, not production workloads.
   */
  instanceSize: string;
}

type RelationalDatabaseReferencableParam =
  | 'host'
  | 'hosts'
  | 'connectionString'
  | 'jdbcConnectionString'
  | 'port'
  | 'dbName'
  | 'readerHost'
  | 'readerPort'
  | 'readerConnectionString'
  | 'readerJdbcConnectionString'
  | 'readReplicaHosts'
  | 'readReplicaConnectionStrings'
  | 'readReplicaJdbcConnectionStrings'
  | `readReplica${number}Port`;

type NormalizedSQLEngine = Exclude<
  StpRelationalDatabase['engine']['type'],
  | 'aurora-postgresql-serverless'
  | 'aurora-mysql-serverless'
  | 'aurora-postgresql-serverless-v2'
  | 'aurora-mysql-serverless-v2'
>;

```

## DynamoDB Tables (`type: dynamo-db-table`)

```typescript
/**
 * #### DynamoDB Table
 *
 * ---
 *
 * A fully managed, serverless, and highly available key-value and document database that delivers single-digit millisecond performance at any scale.
 */
interface DynamoDbTable {
  type: 'dynamo-db-table';
  properties: DynamoDbTableProps;
  overrides?: ResourceOverrides;
}

type StpDynamoTable = DynamoDbTable['properties'] & {
  name: string;
  type: DynamoDbTable['type'];
  configParentResourceType: DynamoDbTable['type'] | NextjsWeb['type'];
  nameChain: string[];
};

interface DynamoDbTableProps {
  /**
   * #### Configures the primary key for the table.
   *
   * ---
   *
   * The primary key uniquely identifies each item in the table. Two types of primary keys are supported:
   *
   * - **Simple primary key**: Composed of one attribute, the `partitionKey`.
   * - **Composite primary key**: Composed of two attributes, the `partitionKey` and the `sortKey`.
   *
   * The primary key cannot be modified after the table is created, and each item in the table must include the primary key attribute(s).
   *
   * For more details, see the [AWS documentation on primary keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey).
   */
  primaryKey: DynamoDbTablePrimaryKey;
  /**
   * #### Configures the read and write throughput capabilities of the table.
   *
   * ---
   *
   * - **Provisioned mode**: If you specify `provisionedThroughput`, you must set the read and write capacity for your table. This can provide cost predictability but may not handle unpredictable loads.
   * - **On-demand mode**: If `provisionedThroughput` is not configured, the table runs in on-demand mode, and you pay only for what you use.
   *
   * For more details on the differences between these modes, see the [AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html).
   */
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /**
   * #### Enables continuous backups with point-in-time recovery.
   *
   * ---
   *
   * Point-in-time recovery allows you to restore a table to any point in time within the last 35 days.
   * The recovery process always restores the data to a new table.
   *
   * Enabling this feature may result in additional charges. For more details, see the [AWS DynamoDB pricing page](https://aws.amazon.com/dynamodb/pricing/on-demand/#DynamoDB_detailed_feature_pricing).
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Enables streaming of item changes and configures the stream type.
   *
   * ---
   *
   * The stream type determines what information is written to the stream when an item in the table is modified.
   * Streams can be consumed by [functions](https://docs.stacktape.com/compute-resources/lambda-functions/#dynamo-db-stream-event) and [batch jobs](https://docs.stacktape.com/compute-resources/batch-jobs/#dynamo-db-event).
   *
   * Allowed values are:
   * - `KEYS_ONLY`: Only the key attributes of the modified item are written to the stream.
   * - `NEW_IMAGE`: The entire item, as it appears after it was modified, is written to the stream.
   * - `OLD_IMAGE`: The entire item, as it appeared before it was modified, is written to the stream.
   * - `NEW_AND_OLD_IMAGES`: Both the new and old images of the item are written to the stream.
   */
  streamType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  /**
   * #### A list of global secondary indexes for this table.
   *
   * ---
   *
   * By default, you can only query items in a DynamoDB table based on primary key attributes.
   * Global secondary indexes allow you to perform queries using a variety of different attributes.
   *
   * For more details, see the [AWS documentation on secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html).
   */
  secondaryIndexes?: DynamoDbTableGlobalSecondaryIndex[];
  /**
   * #### Dev Mode Configuration
   *
   * ---
   *
   * Configures how this DynamoDB table behaves during `stacktape dev` mode.
   * By default, DynamoDB runs locally using Docker. Set `dev.remote: true` to connect to the deployed AWS DynamoDB table instead.
   */
  dev?: DevModeConfig;
}

interface DynamoDbTablePrimaryKey {
  /**
   * #### Specifies the partition key for the table.
   *
   * ---
   *
   * If a table has only a `partitionKey` and no `sortKey`, no two items can have the same partition key.
   * DynamoDB uses the partition key's value as input to an internal hash function, which determines the partition (physical storage) where the item is stored.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Specifies the sort key for the table.
   *
   * ---
   *
   * Using a `sortKey` provides additional flexibility when querying data.
   * In a table with a `partitionKey` and a `sortKey`, multiple items can have the same partition key, but they must have different sort key values.
   * All items with the same partition key are stored together, sorted by the sort key value.
   */
  sortKey?: DynamoDbAttribute;
}

interface DynamoDbTableGlobalSecondaryIndex {
  /**
   * #### The name of the index.
   */
  name: string;
  /**
   * #### Specifies the partition key for the index.
   *
   * ---
   *
   * DynamoDB uses the partition key's value as input to an internal hash function, which determines the partition where the item is stored.
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Specifies the sort key for the index.
   *
   * ---
   *
   * Using a `sortKey` provides additional flexibility when querying data.
   * In an index with a `partitionKey` and a `sortKey`, multiple items can have the same partition key, but they must have different sort key values.
   */
  sortKey?: DynamoDbAttribute;
  /**
   * #### A list of attributes that are copied from the table into the global secondary index.
   *
   * ---
   *
   * When querying a secondary index, you can only access attributes that are projected into it.
   * By default, the table's primary key (partition key and sort key) is projected into the index.
   */
  projections?: string[];
}

interface DynamoDbAttribute {
  /**
   * #### The name of the attribute that will be used as a key.
   */
  name: string;
  /**
   * #### The type of the attribute that will be used as a key.
   */
  type: 'string' | 'number' | 'binary';
}

interface DynamoDbProvisionedThroughput {
  /**
   * #### The number of read units available per second.
   *
   * ---
   *
   * Each read unit represents either:
   * - One strongly consistent read
   * - Two eventually consistent reads
   *
   * This applies to items up to 4 KB in size. Reading larger items will consume additional read capacity units.
   * If you exceed the provisioned read capacity, you will receive a `ThrottlingException`.
   */
  readUnits: number;
  /**
   * #### The number of write units available per second.
   *
   * ---
   *
   * One write unit represents one write per second for an item up to 1 KB in size.
   * Writing larger items will consume additional write capacity units.
   * If you exceed the provisioned write capacity, you will receive a `ThrottlingException`.
   */
  writeUnits: number;
  /**
   * #### Auto-scaling configuration for write units.
   *
   * ---
   *
   * Even in provisioned mode, you can configure throughput to scale based on load.
   * The table throughput scales up or down once the specified thresholds are met.
   *
   * For more details, see [this detailed AWS article](https://aws.amazon.com/blogs/database/amazon-dynamodb-auto-scaling-performance-and-cost-optimization-at-any-scale/).
   */
  writeScaling?: DynamoDbWriteScaling;
  /**
   * #### Auto-scaling configuration for read units.
   *
   * ---
   *
   * Even in provisioned mode, you can configure throughput to scale based on load.
   * The table throughput scales up or down once the specified thresholds are met.
   *
   * For more details, see [this detailed AWS article](https://aws.amazon.com/blogs/database/amazon-dynamodb-auto-scaling-performance-and-cost-optimization-at-any-scale/).
   */
  readScaling?: DynamoDbReadScaling;
}

interface DynamoDbWriteScaling {
  /**
   * #### The minimum number of provisioned write units per second.
   *
   * ---
   *
   * The available write units will never scale down below this threshold.
   */
  minUnits: number;
  /**
   * #### The maximum number of provisioned write units per second that the table can scale up to.
   *
   * ---
   *
   * The available write units will never scale up above this threshold.
   */
  maxUnits: number;
  /**
   * #### The target utilization percentage for scaling.
   *
   * ---
   *
   * If the table's consumed write capacity exceeds (or falls below) your target utilization for a sustained period, the provisioned capacity will be increased (or decreased).
   */
  keepUtilizationUnder: number;
}

interface DynamoDbReadScaling {
  /**
   * #### The minimum number of provisioned read units per second.
   *
   * ---
   *
   * The available read units will never scale down below this threshold.
   */
  minUnits: number;
  /**
   * #### The maximum number of provisioned read units per second that the table can scale up to.
   *
   * ---
   *
   * The available read units will never scale up above this threshold.
   */
  maxUnits: number;
  /**
   * #### The target utilization percentage for scaling.
   *
   * ---
   *
   * If the table's consumed read capacity exceeds (or falls below) your target utilization for a sustained period, the provisioned capacity will be increased (or decreased).
   */
  keepUtilizationUnder: number;
}

type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';

```

## S3 Buckets (`type: bucket`)

```typescript
/**
 * #### Storage Bucket
 *
 * ---
 *
 * A durable and highly available object storage service with pay-per-use pricing.
 */
interface Bucket {
  type: 'bucket';
  properties?: BucketProps;
  overrides?: ResourceOverrides;
}

type SupportedHeaderPreset = 'gatsby-static-website' | 'static-website' | 'single-page-app';

interface DirectoryUpload {
  /**
   * #### The path to the directory that should be uploaded to the bucket.
   *
   * ---
   *
   * After the sync is finished, the contents of your bucket will mirror the contents of the local folder.
   * The path is relative to your current working directory.
   *
   * > **Warning:** Any existing contents of the bucket will be deleted and replaced with the contents of the local directory.
   * > You should not use a bucket with `directoryUpload` enabled for application-generated or user-generated content.
   */
  directoryPath: string;
  /**
   * #### Allows you to set properties of files (objects) during the upload.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Glob patterns for files to be excluded from the upload.
   *
   * ---
   *
   * These patterns are relative to the `directoryPath`.
   */
  excludeFilesPatterns?: string[];
  // /**
  //  * #### Configures which files should be included during upload (glob patterns).
  //  * ---
  //  * - Relative to the `directoryPath`
  //  * - If you do not specify this property, all the files/folders in the directory are included(uploaded).
  //  * - If a file matches both a pattern from `skipFiles` and `includeFiles` properties, then file is not uploaded (`skipFiles` takes precedence over `includeFiles`)
  //  */
  // includeFiles?: string[];
  /**
   * #### Configures HTTP headers of uploaded files to be optimized for a selected preset.
   *
   * ---
   *
   * Available presets:
   *
   * - **`static-website`**:
   *   - Sets the `Cache-Control` header to `public, max-age=0, s-maxage=31536000, must-revalidate` for all uploaded files.
   *   - This setup caches all content on the CDN but never in the browser.
   *
   * - **`gatsby-static-website`**:
   *   - Optimizes headers for static websites built with [Gatsby](https://www.gatsbyjs.com/), following their [caching recommendations](https://www.gatsbyjs.com/docs/caching/).
   *
   * - **`single-page-app`**:
   *   - Optimizes headers for [Single-Page Applications](https://en.wikipedia.org/wiki/Single-page_application).
   *   - `html` files are never cached to ensure users always get the latest content after a deployment.
   *   - All other assets (e.g., `.js`, `.css`) are cached indefinitely. You should **always** add a content hash to your filenames to ensure users receive new versions after updates.
   *
   * You can override these presets using custom `filters`.
   *
   * > When `headersPreset` is used, `cdn.invalidateAfterDeploy` must also be configured.
   */
  headersPreset?: SupportedHeaderPreset;
  /**
   * #### Disables S3 Transfer Acceleration.
   *
   * ---
   *
   * S3 Transfer Acceleration improves the upload times of your directory contents by uploading objects to the nearest AWS edge location and routing them to the bucket through the AWS backbone network.
   *
   * This feature incurs a small additional cost.
   *
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}

interface KeyValuePair {
  /**
   * #### Key
   */
  key: string;
  /**
   * #### Value
   */
  value: string;
}

interface DirectoryUploadFilter {
  /**
   * #### A glob pattern that specifies which files should be handled by this filter.
   *
   * ---
   *
   * The pattern is relative to the `directoryPath`.
   */
  includePattern: string;
  /**
   * #### A glob pattern that specifies which files should be excluded from this filter, even if they match the `includePattern`.
   *
   * ---
   *
   * The pattern is relative to the `directoryPath`.
   */
  excludePattern?: string;
  /**
   * #### Configures HTTP headers for files (objects) that match this filter.
   *
   * ---
   *
   * If you are using a CDN, these headers will be forwarded to the client.
   * This can be used to implement a custom HTTP caching strategy for your static content.
   */
  headers?: KeyValuePair[];
  /**
   * #### Tags to apply to the files that match this filter.
   *
   * ---
   *
   * Tags help you categorize your objects and can be used to filter objects when using `lifecycleRules`.
   *
   * For more details on object tagging, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html).
   *
   * > A single file (object) can have only one tag with the same key.
   */
  tags?: KeyValuePair[];
}

interface BucketProps {
  /**
   * #### Allows you to upload a specified directory to the bucket on every deployment.
   *
   * ---
   *
   * After the upload is finished, the contents of your bucket will mirror the contents of the local folder.
   * Files are uploaded using parallel, multipart uploads.
   *
   * > **Warning:** Any existing contents of the bucket will be deleted and replaced with the contents of the local directory.
   * > You should not use `directoryUpload` for buckets with application-generated or user-generated content.
   */
  directoryUpload?: DirectoryUpload;
  /**
   * #### Configures the accessibility of the bucket.
   */
  accessibility?: BucketAccessibility;
  /**
   * #### Configures CORS (Cross-Origin Resource Sharing) HTTP headers for the bucket.
   *
   * ---
   *
   * Web browsers use CORS to block websites from making requests to a different origin (server) than the one they are served from.
   */
  cors?: BucketCorsConfig;
  /**
   * #### Enables versioning of objects in the bucket.
   *
   * ---
   *
   * When enabled, the bucket will keep multiple variants of an object.
   * This can help you recover objects from accidental deletion or overwrites.
   */
  versioning?: boolean;
  /**
   * #### Enables encryption of the objects stored in this bucket.
   *
   * ---
   *
   * Objects are encrypted using the AES-256 algorithm.
   */
  encryption?: boolean;
  /**
   * #### Configures how objects are stored throughout their lifecycle.
   *
   * ---
   *
   * Lifecycle rules are used to transition objects to different storage classes or delete old objects.
   */
  lifecycleRules?: (
    | Expiration
    | NonCurrentVersionExpiration
    | ClassTransition
    | NonCurrentVersionClassTransition
    | AbortIncompleteMultipartUpload
  )[];
  /**
   * #### Enables sending bucket events to the default EventBridge bus.
   *
   * ---
   *
   * When enabled, an event is sent to the default event bus whenever certain actions occur in your bucket (e.g., an object is created or deleted).
   *
   * For a full list of all bucket events, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html).
   *
   * @default false
   */
  enableEventBusNotifications?: boolean;
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your bucket.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your bucket, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin.
   * - Enhance security.
   *
   * The "origin" is the resource (in this case, the bucket) that the CDN is attached to.
   */
  cdn?: BucketCdnConfiguration;
}

type StpBucket = Bucket['properties'] & {
  name: string;
  type: Bucket['type'];
  configParentResourceType: Bucket['type'] | HostingBucket['type'] | NextjsWeb['type'];
  nameChain: string[];
};

interface BucketAccessibility {
  /**
   * #### Configures pre-defined accessibility modes for the bucket.
   *
   * ---
   *
   * This allows you to easily configure the most common access patterns.
   *
   * Available modes:
   * - `public-read-write`: Everyone can read from and write to the bucket.
   * - `public-read`: Everyone can read from the bucket. Only compute resources and entities with sufficient IAM permissions can write to it.
   * - `private` (default): Only compute resources and entities with sufficient IAM permissions can read from or write to the bucket.
   *
   * For functions, batch jobs, and container workloads, you can grant the required IAM permissions using the `allowsAccessTo` or `iamRoleStatements` properties in their respective configurations.
   *
   * @default private
   */
  accessibilityMode: 'private' | 'public-read-write' | 'public-read';
  /**
   * #### Advanced access configuration that leverages IAM policy statements.
   *
   * ---
   *
   * This gives you fine-grained access control over the bucket.
   */
  accessPolicyStatements?: BucketPolicyIamRoleStatement[];
}

interface BucketCdnConfiguration extends CdnConfiguration {
  /**
   * #### Rewrites incoming requests to work for a single-page application.
   *
   * ---
   *
   * The routing works as follows:
   * - If the path has an extension (e.g., `.css`, `.js`, `.png`), the request is not rewritten, and the appropriate file is returned.
   * - If the path does not have an extension, the request is routed to `index.html`.
   *
   * This allows single-page applications to handle routing on the client side.
   */
  rewriteRoutesForSinglePageApp?: boolean;
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from the bucket with clean URLs.
   *
   * @default false
   */
  disableUrlNormalization?: boolean;
}

interface LifecycleRuleBase {
  /**
   * #### The prefix of the objects to which the lifecycle rule is applied.
   */
  prefix?: string;
  /**
   * #### The tags of the objects to which the lifecycle rule is applied.
   *
   * ---
   *
   * For more details on tagging objects, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html).
   */
  tags?: KeyValuePair[];
}

interface Expiration {
  type: 'expiration';
  properties: ExpirationProps;
}

interface ExpirationProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an object is considered expired.
   *
   * ---
   *
   * This is relative to the date the object was uploaded.
   */
  daysAfterUpload: number;
}

interface NonCurrentVersionExpiration {
  type: 'non-current-version-expiration';
  properties: NonCurrentVersionExpirationProps;
}

interface NonCurrentVersionExpirationProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which a non-current version of an object becomes expired.
   *
   * ---
   *
   * This is relative to the date the object became a non-current version.
   * This rule is only effective if the bucket has versioning enabled.
   */
  daysAfterVersioned: number;
}

interface ClassTransition {
  type: 'class-transition';
  properties: ClassTransitionProps;
}

interface ClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an object is transitioned to another storage class.
   *
   * ---
   *
   * This is relative to the date the object was uploaded.
   * Depending on how often you need to access your objects, transitioning them to another storage class can lead to significant cost savings.
   */
  daysAfterUpload: number;
  /**
   * #### The storage class to which to transition the object.
   *
   * ---
   *
   * By default, all objects are in the `STANDARD` (general purpose) class.
   * Depending on your access patterns, you can transition objects to a different storage class to save costs.
   *
   * For more details on storage classes, see the [AWS documentation](https://aws.amazon.com/s3/storage-classes/).
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface NonCurrentVersionClassTransition {
  type: 'non-current-version-class-transition';
  properties: NonCurrentVersionClassTransitionProps;
}

interface NonCurrentVersionClassTransitionProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which a non-current version of an object is transitioned to another storage class.
   *
   * ---
   *
   * This is relative to the date the object became a non-current version.
   * Depending on how often you need to access your objects, transitioning them to another storage class can lead to significant cost savings.
   */
  daysAfterVersioned: number;
  /**
   * #### The storage class to which to transition the object.
   *
   * ---
   *
   * For more details on storage classes and transitions, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html).
   */
  storageClass: 'DEEP_ARCHIVE' | 'GLACIER' | 'INTELLIGENT_TIERING' | 'ONEZONE_IA' | 'STANDARD_IA';
}

interface AbortIncompleteMultipartUpload {
  type: 'abort-incomplete-multipart-upload';
  properties: AbortIncompleteMultipartUploadProps;
}

interface AbortIncompleteMultipartUploadProps extends LifecycleRuleBase {
  /**
   * #### The number of days after which an incomplete multipart upload is aborted and its parts are deleted.
   *
   * ---
   *
   * This is relative to the start of the multipart upload.
   */
  daysAfterInitiation: number;
}

interface BucketCorsConfig {
  /**
   * #### Enables CORS (Cross-Origin Resource Sharing) HTTP headers for the bucket.
   *
   * ---
   *
   * If you enable CORS without specifying any rules, a default rule with the following configuration is used:
   * - `allowedMethods`: `GET`, `PUT`, `HEAD`, `POST`, `DELETE`
   * - `allowedOrigins`: `*`
   * - `allowedHeaders`: `Authorization`, `Content-Length`, `Content-Type`, `Content-MD5`, `Date`, `Expect`, `Host`, `x-amz-content-sha256`, `x-amz-date`, `x-amz-security-token`
   */
  enabled: boolean;
  /**
   * #### A list of CORS rules.
   *
   * ---
   *
   * When the bucket receives a preflight request from a browser, it evaluates the CORS configuration and uses the first rule that matches the request to enable a cross-origin request.
   * For a rule to match, the following conditions must be met:
   *
   * - The request's `Origin` header must match one of the `allowedOrigins`.
   * - The request method (e.g., `GET`, `PUT`) or the `Access-Control-Request-Method` header must be one of the `allowedMethods`.
   * - Every header listed in the request's `Access-Control-Request-Headers` header must match one of the `allowedHeaders`.
   */
  corsRules?: BucketCorsRule[];
}

interface BucketCorsRule {
  /**
   * #### The origins to accept cross-domain requests from.
   *
   * ---
   *
   * An origin is a combination of a scheme (protocol), hostname (domain), and port.
   */
  allowedOrigins?: string[];
  /**
   * #### The allowed HTTP headers.
   *
   * ---
   *
   * Each header name in the `Access-Control-Request-Headers` header of a preflight request must match an entry in this list.
   */
  allowedHeaders?: string[];
  /**
   * #### The allowed HTTP methods.
   */
  allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | '*')[];
  /**
   * #### The response headers that should be made available to scripts running in the browser in response to a cross-origin request.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### The time (in seconds) that the browser can cache the response for a preflight request.
   */
  maxAge?: number;
}

type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;

```

## Hosting Buckets (`type: hosting-bucket`)

```typescript
/**
 * #### Hosting Bucket
 *
 * ---
 *
 * A resource designed to host your static website or other static content.
 * It combines the power of an S3 Bucket (for storing data) and a CloudFront CDN (for distributing it globally).
 */
interface HostingBucket {
  type: 'hosting-bucket';
  properties: HostingBucketProps;
  overrides?: ResourceOverrides;
}

interface HostingBucketProps {
  /**
   * #### The path to the directory to upload.
   *
   * ---
   *
   * This should be the path to the directory containing the content you want to host, such as the output directory of your website's build process.
   *
   * The contents of this folder will be uploaded to the bucket during the `deploy`, `codebuild:deploy`, or `bucket:sync` commands.
   */
  uploadDirectoryPath: string;
  /**
   * #### Build configuration for the hosting bucket.
   *
   * ---
   *
   * Configures the build process that produces the files to upload. The build runs during the packaging phase, in parallel with other packaging jobs.
   *
   * Supports common frontend build tools like Vite, Webpack, Angular CLI, Vue CLI, Create React App, and SvelteKit.
   * Build output is parsed to display meaningful information (e.g., bundle size) in the deployment logs.
   */
  build?: HostingBucketBuild;
  /**
   * #### Dev server configuration for the hosting bucket.
   *
   * ---
   *
   * Configures the dev server process for local development. Used by the `dev` command.
   *
   * Example commands:
   * - `npm run dev`
   * - `vite`
   * - `webpack serve`
   */
  dev?: HostingBucketBuild;
  /**
   * #### Glob patterns for files to be excluded from the upload.
   *
   * ---
   *
   * These patterns are relative to the `uploadDirectoryPath`.
   */
  excludeFilesPatterns?: string[];
  /**
   * #### Configures HTTP headers of uploaded files and CDN behavior based on the content type.
   *
   * ---
   *
   * Supported content types:
   *
   * - **`static-website`**:
   *   - Sets the `Cache-Control` header to `public, max-age=0, s-maxage=31536000, must-revalidate` for all uploaded files.
   *   - This setup caches all content on the CDN but never in the browser.
   *
   * - **`gatsby-static-website`**:
   *   - Optimizes headers for static websites built with [Gatsby](https://www.gatsbyjs.com/), following their [caching recommendations](https://www.gatsbyjs.com/docs/caching/).
   *
   * - **`single-page-app`**:
   *   - Optimizes headers for [Single-Page Applications](https://en.wikipedia.org/wiki/Single-page_application).
   *   - `html` files are never cached to ensure users always get the latest content after a deployment.
   *   - All other assets (e.g., `.js`, `.css`) are cached indefinitely. You should **always** add a content hash to your filenames to ensure users receive new versions after updates. For more details, see the documentation for your bundler (e.g., [webpack](https://webpack.js.org/guides/caching/)).
   *   - Sets up the necessary CDN redirects for a single-page app.
   *
   * @default static-website
   */
  hostingContentType?: SupportedHeaderPreset;
  /**
   * #### Attaches custom domains to this hosting bucket.
   *
   * ---
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** Stacktape issues and attaches a free, AWS-managed TLS certificate to handle HTTPS.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from a bucket with clean URLs (without the `.html` extension).
   *
   * @default false
   */
  disableUrlNormalization?: boolean;
  /**
   * #### Configures Edge function triggers.
   *
   * ---
   *
   * You can associate an `edge-lambda-function` with this hosting bucket to be executed at different stages:
   *
   * - `onRequest`: Executed when the CDN receives a request from a client, before checking the cache and before the request is forwarded to the hosting bucket.
   * - `onResponse`: Executed before returning a response to the client.
   *
   * **Potential Use Cases:**
   * - Generating an immediate HTTP response without checking the cache or forwarding to the bucket.
   * - Modifying the request (e.g., rewriting the URL or headers) before forwarding to the bucket.
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### The custom error document URL.
   *
   * ---
   *
   * This document is requested if the original request to the origin returns a `404` error code.
   *
   * Example: `/error.html`
   */
  errorDocument?: string;
  /**
   * #### The custom index document served for requests to the root path (`/`).
   *
   * ---
   *
   * @default /index.html
   */
  indexDocument?: string;
  /**
   * #### Injects referenced parameters into all HTML files in the `uploadDirectoryPath`.
   *
   * ---
   *
   * These parameters can be accessed by any JavaScript script using `window.STP_INJECTED_ENV.VARIABLE_NAME`.
   * This is useful for automatically referencing parameters that are only known after deployment, such as the URL of an API Gateway or the ID of a User Pool.
   */
  injectEnvironment?: EnvironmentVar[];
  /**
   * #### Injects referenced parameters into `.env` files within the specified directory.
   *
   * ---
   *
   * Writes the injected environment variables to a file named `.env`.
   * If the file already exists, the new variables will be merged with the existing ones.
   */
  writeDotenvFilesTo?: string;
  /**
   * #### The name of the `web-app-firewall` resource to use to protect this hosting bucket.
   *
   * ---
   *
   * A `web-app-firewall` can protect your resources from common web exploits that could affect availability, compromise security, or consume excessive resources.
   *
   * For more information, see the [firewall documentation](https://docs.stacktape.com/security-resources/web-app-firewalls/).
   *
   * > **Note:** Because this resource uses a CDN, the `scope` of the `web-app-firewall` must be set to `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Allows you to manually set headers (e.g., `Cache-Control`, `Content-Type`) for files that match a filter pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Redirects specific requests to a different origin.
   *
   * ---
   *
   * Each incoming request to the CDN is evaluated against a list of route rewrites. If the request path matches a rewrite's path pattern, it is sent to the configured route.
   * Route rewrites are evaluated in order, and the first match determines where the request will be sent.
   *
   * If no match is found, the request is sent to the default origin (the hosting bucket).
   *
   * **Example Use Cases:**
   * - Serving static content from the bucket while routing dynamic paths to a Lambda function.
   * - Caching `.jpg` files for a longer duration than other file types.
   */
  routeRewrites?: CdnRouteRewrite[];
}

type WriteEnvFilesFormat = 'dotenv';

/**
 * #### Build configuration for hosting bucket.
 *
 * ---
 *
 * Defines how to build frontend assets before uploading them to the bucket.
 */
interface HostingBucketBuild {
  /**
   * #### The command to execute.
   *
   * ---
   *
   * Examples:
   * - `npm run build`
   * - `bun run build`
   * - `vite build`
   * - `webpack --mode production`
   */
  command: string;
  /**
   * #### The working directory for the command.
   *
   * ---
   *
   * Relative to the project root. Defaults to the project root.
   *
   * @default "."
   */
  workingDirectory?: string;
}

type StpHostingBucket = HostingBucket['properties'] & {
  name: string;
  type: HostingBucket['type'];
  configParentResourceType: HostingBucket['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
  };
};

```

## SQS Queues (`type: sqs-queue`)

```typescript
/**
 * #### SQS Queue
 *
 * ---
 *
 * A fully managed message queuing service that enables you to decouple and scale microservices, distributed systems, and serverless applications.
 */
interface SqsQueue {
  type: 'sqs-queue';
  properties?: SqsQueueProps;
  overrides?: ResourceOverrides;
}

interface SqsQueueProps {
  /**
   * #### The amount of time that each message delivery is delayed.
   *
   * ---
   *
   * Specifies the time in seconds (0-900) for which the delivery of all messages in the queue is delayed.
   *
   * @default 0
   */
  delayMessagesSecond?: number;
  /**
   * #### The maximum size of a message, in bytes.
   *
   * ---
   *
   * You can specify an integer value from 1,024 bytes (1 KiB) to 262,144 bytes (256 KiB).
   *
   * @default 262144
   */
  maxMessageSizeBytes?: number;
  /**
   * #### The number of seconds that the queue retains a message.
   *
   * ---
   *
   * You can specify an integer value from 60 seconds (1 minute) to 1,209,600 seconds (14 days).
   *
   * @default 345600
   */
  messageRetentionPeriodSeconds?: number;
  /**
   * #### Enables long polling for receiving messages from the queue.
   *
   * ---
   *
   * Long polling reduces the number of empty responses by allowing Amazon SQS to wait until a message is available in the queue before sending a response.
   * This can help reduce the cost of using SQS by minimizing the number of `ReceiveMessage` API calls.
   *
   * This value specifies the duration (in seconds) that the `ReceiveMessage` call waits for a message to arrive.
   * If set to `0` (the default), short polling is used.
   *
   * For more details on the differences between short and long polling, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html#sqs-short-long-polling-differences).
   *
   * @default 0
   */
  longPollingSeconds?: number;
  /**
   * #### The length of time that a message will be unavailable after it is delivered from the queue.
   *
   * ---
   *
   * When a consumer receives a message, it remains in the queue but is made invisible to other consumers for the duration of the visibility timeout.
   * This prevents the message from being processed multiple times. The consumer is responsible for deleting the message from the queue after it has been successfully processed.
   *
   * The visibility timeout can be set from 0 to 43,200 seconds (12 hours).
   *
   * For more information, see the [AWS documentation on visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).
   *
   * @default 30
   */
  visibilityTimeoutSeconds?: number;
  /**
   * #### If `true`, creates a FIFO (First-In-First-Out) queue.
   *
   * ---
   *
   * FIFO queues are designed for applications where the order of operations and events is critical and duplicates cannot be tolerated.
   *
   * When using a FIFO queue, each message must have a `MessageDeduplicationId`, or `contentBasedDeduplication` must be enabled.
   *
   * For more information, see the [AWS documentation on FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html).
   *
   * @default false
   */
  fifoEnabled?: boolean;
  /**
   * #### If `true`, enables high-throughput mode for the FIFO queue.
   *
   * ---
   *
   * High throughput is achieved by partitioning messages based on their `MessageGroupId`.
   * Messages with the same `MessageGroupId` are always processed in order.
   *
   * `fifoEnabled` must be `true` to use this feature.
   *
   * For more information, see the [AWS documentation on high-throughput FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html).
   */
  fifoHighThroughput?: boolean;
  /**
   * #### If `true`, enables content-based deduplication for the FIFO queue.
   *
   * ---
   *
   * During the deduplication interval, the queue treats messages with the same content as duplicates and delivers only one copy.
   * Deduplication is based on the `MessageDeduplicationId`. If you do not provide one, Amazon SQS will generate a SHA-256 hash of the message body to use as the `MessageDeduplicationId`.
   *
   * `fifoEnabled` must be `true` to use this feature.
   */
  contentBasedDeduplication?: boolean;
  /**
   * #### Configures a redrive policy for automatically moving messages that fail processing to a dead-letter queue.
   *
   * ---
   *
   * Messages are sent to the dead-letter queue after they have been retried `maxReceiveCount` times.
   */
  redrivePolicy?: SqsQueueRedrivePolicy;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: SqsQueueAlarm[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Adds policy statements to the SQS queue policy.
   *
   * ---
   *
   * These statements are added on top of the policy statements automatically inferred by Stacktape.
   */
  policyStatements?: SqsQueuePolicyStatement[];
  /**
   * #### A list of event sources that trigger message delivery to this queue.
   *
   * ---
   *
   * Currently supports EventBridge event bus integration for delivering events directly to the queue.
   */
  events?: SqsQueueEventBusIntegration[];
}

interface SqsQueuePolicyStatement {
  /**
   * #### The effect of the statement.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Effect: string;
  /**
   * #### A list of actions allowed or denied by the statement.
   *
   * ---
   *
   * Actions must start with `sqs:`.
   * For a list of available actions, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html).
   */
  Action: string[];
  /**
   * #### The circumstances under which the statement grants permissions.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Condition?: any;
  /**
   * #### The principal (user, role, or service) to which you are allowing or denying access.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Principal: any;
}

/**
 * #### Delivers messages to an SQS queue when an event matching a specified pattern is received by an event bus.
 */
interface SqsQueueEventBusIntegration {
  type: 'event-bus';
  /**
   * #### Properties of the integration
   */
  properties: SqsQueueEventBusIntegrationProps;
}

interface SqsQueueEventBusIntegrationProps extends EventBusIntegrationProps {
  /**
   * #### The message group ID to use for FIFO queues.
   *
   * ---
   *
   * This parameter is required for FIFO queues and is used to group messages together.
   * Messages with the same message group ID are processed in order within that group.
   * For more information, see the [AWS documentation on FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html).
   */
  messageGroupId?: string;
}

interface SqsQueueRedrivePolicy {
  /**
   * #### The name of the SQS queue in your Stacktape configuration where failed messages will be sent.
   */
  targetSqsQueueName?: string;
  /**
   * #### The ARN of the SQS queue where failed messages will be sent.
   */
  targetSqsQueueArn?: string;
  /**
   * #### The number of times a message is delivered to the source queue before being moved to the dead-letter queue.
   *
   * ---
   *
   * When the `ReceiveCount` for a message exceeds this value, Amazon SQS moves the message to the target queue.
   */
  maxReceiveCount: number;
}

type StpSqsQueue = SqsQueue['properties'] & {
  name: string;
  type: SqsQueue['type'];
  configParentResourceType: SqsQueue['type'] | NextjsWeb['type'];
  nameChain: string[];
};

type SqsQueueReferencableParam = 'arn' | 'name' | 'url';

```

## User Auth Pools (`type: user-auth-pool`)

```typescript
/**
 * #### A resource for managing user authentication and authorization.
 *
 * ---
 *
 * A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
 * It provides a secure and scalable way to manage user identities for your applications.
 */
interface UserAuthPool {
  type: 'user-auth-pool';
  properties?: UserAuthPoolProps;
  overrides?: ResourceOverrides;
}

interface UserAuthPoolProps {
  /**
   * #### Restrict account creation to administrators
   *
   * ---
   *
   * If enabled, new users can't sign up themselves. Accounts must be created through an admin flow (for example from an internal admin tool or script),
   * which helps prevent unwanted self-registrations.
   *
   * Internally this controls `AdminCreateUserConfig.AllowAdminCreateUserOnly` on the Cognito user pool
   * ([AWS::Cognito::UserPool](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   * @default false
   */
  allowOnlyAdminsToCreateAccount?: boolean;
  /**
   * #### Expire unused admin-created accounts
   *
   * ---
   *
   * When an admin creates a user account, Cognito issues a temporary password. This setting controls how many days that temporary password
   * (and the corresponding account) stays valid if the user never signs in.
   *
   * Internally this maps to `AdminCreateUserConfig.UnusedAccountValidityDays`.
   *
   * @default 31
   */
  unusedAccountValidityDays?: number;
  /**
   * #### (Reserved) Require verified emails
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require email-based verification today, use `userVerificationType: 'email-link' | 'email-code'` instead.
   */
  requireEmailVerification?: boolean;
  /**
   * #### (Reserved) Require verified phone numbers
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require SMS-based verification today, use `userVerificationType: 'sms'`.
   */
  requirePhoneNumberVerification?: boolean;
  /**
   * #### Enable the Cognito Hosted UI
   *
   * ---
   *
   * Turns on Cognito's Hosted UI – a pre-built, hosted login and registration page – so you don't have to build your own auth screens.
   * This is useful when you want to get started quickly or keep authentication logic outside of your main app.
   *
   * @default false
   */
  enableHostedUi?: boolean;
  /**
   * #### Hosted UI domain prefix
   *
   * ---
   *
   * Sets the first part of your Hosted UI URL: `https://<prefix>.auth.<region>.amazoncognito.com`.
   * Pick something that matches your project or company name.
   */
  hostedUiDomainPrefix?: string;
  /**
   * #### Custom CSS for the Hosted UI
   *
   * ---
   *
   * Lets you override the default Cognito Hosted UI styling with your own CSS (colors, fonts, layouts, etc.),
   * so the login experience matches the rest of your application.
   *
   * Behind the scenes this is applied using the `AWS::Cognito::UserPoolUICustomizationAttachment` resource.
   */
  hostedUiCSS?: string;
  /**
   * #### Lambda triggers for the user pool
   *
   * ---
   *
   * Connects AWS Lambda functions to Cognito "hooks" (triggers) such as pre-sign-up, post-confirmation, or token generation.
   * You can use these to enforce additional validation, enrich user profiles, migrate users from another system, and more.
   *
   * Internally this maps to the Cognito user pool `LambdaConfig`.
   */
  hooks?: UserPoolHooks;
  /**
   * #### Email delivery settings
   *
   * ---
   *
   * Controls how Cognito sends emails (verification messages, password reset codes, admin invitations, etc.).
   * You can either use Cognito's built-in email service or plug in your own SES identity for full control over the sender.
   *
   * This config is used to build the Cognito `EmailConfiguration` block
   * ([AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  emailConfiguration?: EmailConfiguration;
  /**
   * #### Invite message overrides
   *
   * ---
   *
   * Customizes the contents of the "invitation" message that users receive when an administrator creates their account
   * (for example, when sending a temporary password and sign-in instructions).
   *
   * If you want to send custom emails through SES, you must also configure `emailConfiguration.sesAddressArn`.
   */
  inviteMessageConfig?: InviteMessageConfig;
  /**
   * #### Verification strategy
   *
   * ---
   *
   * Chooses how new users prove that they own their contact information:
   *
   * - `email-link`: Cognito emails a clickable link.
   * - `email-code`: Cognito emails a short numeric code.
   * - `sms`: Cognito sends a code via SMS to the user's phone number.
   * - `none`: Users aren't required to verify email or phone during sign-up.
   *
   * Stacktape uses this value to configure `AutoVerifiedAttributes` and `VerificationMessageTemplate`
   * on the underlying Cognito user pool.
   */
  userVerificationType?: UserVerificationType;
  /**
   * #### Verification message text
   *
   * ---
   *
   * Lets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.
   * For example, you can change subjects, body text, or the message that contains the `{####}` verification code.
   */
  userVerificationMessageConfig?: UserVerificationMessageConfig;
  /**
   * #### Multi-factor authentication
   *
   * ---
   *
   * Controls whether you use Multi‑Factor Authentication (MFA) and which second factors are allowed.
   * MFA makes it much harder for attackers to access accounts even if they know a user's password.
   *
   * Under the hood this config drives both the `MfaConfiguration` and `EnabledMfas` properties in Cognito
   * (see "MFA configuration" in the
   * [AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  mfaConfiguration?: MfaConfiguration;
  /**
   * #### Password strength rules
   *
   * ---
   *
   * Defines how strong user passwords must be – minimum length and whether they must include lowercase, uppercase,
   * numbers, and/or symbols – plus how long temporary passwords issued to new users remain valid.
   *
   * This is applied to the Cognito `Policies.PasswordPolicy` block.
   */
  passwordPolicy?: PasswordPolicy;
  /**
   * #### Custom attributes schema
   *
   * ---
   *
   * Lets you define additional attributes (like `role`, `plan`, `companyId`, etc.) that are stored on each user,
   * including their data type and validation constraints.
   *
   * These translate into the Cognito user pool `Schema` entries
   * ([schema docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  schema?: AttributeSchema[];
  /**
   * #### Allow phone numbers as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their phone number in addition to any traditional username.
   * Turning this off means phone numbers can still be stored, but can't be used to log in.
   *
   * This is implemented via Cognito's `UsernameAttributes` configuration.
   *
   * @default true
   */
  allowPhoneNumberAsUserName?: boolean;
  /**
   * #### Allow email addresses as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their email address instead of a dedicated username.
   * Turning this off means emails can still be stored, but can't be used to log in directly.
   *
   * This is also controlled through Cognito `UsernameAttributes`.
   *
   * @default true
   */
  allowEmailAsUserName?: boolean;
  /**
   * #### Access token lifetime
   *
   * ---
   *
   * Controls how long an access token issued by Cognito stays valid after login. Shorter lifetimes reduce the window
   * in which a stolen token can be abused, at the cost of more frequent refreshes.
   *
   * This value is passed to the user pool client as `AccessTokenValidity`.
   */
  accessTokenValiditySeconds?: number;
  /**
   * #### ID token lifetime
   *
   * ---
   *
   * Controls how long an ID token (which contains user profile and claims) is accepted before clients must obtain a new one.
   *
   * This is set on the user pool client as `IdTokenValidity`.
   */
  idTokenValiditySeconds?: number;
  /**
   * #### Refresh token lifetime
   *
   * ---
   *
   * Sets for how many days a refresh token can be used to obtain new access / ID tokens without requiring the user to sign in again.
   * Longer lifetimes mean fewer re-authentications, but keep sessions alive for longer.
   *
   * This value is used as `RefreshTokenValidity` on the Cognito user pool client.
   */
  refreshTokenValidityDays?: number;
  /**
   * #### OAuth flows
   *
   * ---
   *
   * Specifies which OAuth 2.0 flows the user pool client is allowed to use:
   *
   * - `code`: Authorization Code flow (recommended for web apps and backends).
   * - `implicit`: Implicit flow (legacy browser-only flow).
   * - `client_credentials`: Server‑to‑server (no end user) machine credentials.
   *
   * These values populate `AllowedOAuthFlows` on the Cognito user pool client
   * ([AWS::Cognito::UserPoolClient](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient)).
   */
  allowedOAuthFlows?: AllowedOauthFlow[];
  /**
   * #### OAuth scopes
   *
   * ---
   *
   * Lists which scopes clients can request when using OAuth (for example `email`, `openid`, `profile`).
   * Scopes control which user information and permissions your app receives in tokens.
   *
   * These values are passed to the user pool client as `AllowedOAuthScopes`.
   */
  allowedOAuthScopes?: string[];
  /**
   * #### OAuth callback URLs
   *
   * ---
   *
   * The allowed URLs where Cognito is permitted to redirect users after successful authentication.
   * These must exactly match the URLs registered with your frontend / backend, otherwise the redirect will fail.
   *
   * Mapped into `CallbackURLs` and `DefaultRedirectURI` on the user pool client.
   */
  callbackURLs?: string[];
  /**
   * #### OAuth logout URLs
   *
   * ---
   *
   * The URLs Cognito can redirect users to after they log out of the Hosted UI or end their session.
   * Must also be explicitly configured so that sign-out redirects don't fail.
   *
   * These populate the `LogoutURLs` list on the user pool client.
   */
  logoutURLs?: string[];
  /**
   * #### External identity providers
   *
   * ---
   *
   * Allows users to sign in with third‑party identity providers like Google, Facebook, Login with Amazon, OIDC, SAML, or Sign in with Apple.
   * Each entry configures one external provider (client ID/secret, attribute mapping, requested scopes, and advanced provider‑specific options).
   *
   * Under the hood Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them
   * in the user pool client's `SupportedIdentityProviders`.
   */
  identityProviders?: IdentityProvider[];
  /**
   * #### Associate a WAF
   *
   * ---
   *
   * Links the user pool to a `web-app-firewall` resource, so requests to the Hosted UI and token endpoints are inspected
   * by AWS WAF rules you configure in Stacktape.
   *
   * Stacktape does this by creating a `WebACLAssociation` between the user pool and the referenced firewall.
   */
  useFirewall?: string;
  /**
   * #### Custom Domain
   *
   * ---
   *
   * Configures a custom domain for the Cognito Hosted UI (e.g., `auth.example.com`).
   *
   * When configured, Cognito creates a CloudFront distribution to serve your custom domain.
   * Stacktape automatically:
   * - Configures the user pool domain with your custom domain and an ACM certificate from us-east-1
   * - Creates a DNS record pointing to the CloudFront distribution
   *
   * The domain must be registered and verified in your Stacktape account with a valid ACM certificate in us-east-1.
   */
  customDomain?: UserPoolCustomDomainConfiguration;
  /**
   * #### Generate a client secret
   *
   * ---
   *
   * Asks Cognito to generate a secret for the user pool client. Use this when you have trusted backends (like APIs or server‑side apps)
   * that can safely store a client secret and use confidential OAuth flows.
   *
   * This flag controls the `GenerateSecret` property on the user pool client.
   *
   * @default false
   */
  generateClientSecret?: boolean;
  /**
   * #### Force external identity providers
   *
   * ---
   *
   * If `true`, users can't sign in with a username/password against the Cognito user directory at all.
   * Instead, they must always use one of the configured external identity providers (Google, SAML, etc.).
   *
   * Internally this removes `COGNITO` from `SupportedIdentityProviders` on the user pool client.
   *
   * @default false
   */
  allowOnlyExternalIdentityProviders?: boolean;
}

type AllowedOauthFlow = 'code' | 'implicit' | 'client_credentials';

type UserVerificationType = 'email-link' | 'email-code' | 'sms' | 'none';

interface UserPoolCustomDomainConfiguration {
  /**
   * #### Domain Name
   *
   * ---
   *
   * Fully qualified domain name for the Cognito Hosted UI (e.g., `auth.example.com`).
   */
  domainName: string;
  /**
   * #### Custom Certificate ARN
   *
   * ---
   *
   * ARN of an ACM certificate in **us-east-1** to use for this domain.
   * By default, Stacktape uses the certificate associated with your domain in us-east-1.
   *
   * The certificate must be in us-east-1 because Cognito uses CloudFront for custom domains.
   */
  customCertificateArn?: string;
  /**
   * #### Disable DNS Record Creation
   *
   * ---
   *
   * If `true`, Stacktape will not create a DNS record for this domain.
   *
   * @default false
   */
  disableDnsRecordCreation?: boolean;
}

interface UserPoolHooks {
  /**
   * #### Custom message hook
   *
   * Triggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).
   * Lets you fully customize message contents or dynamically choose language/branding.
   *
   * Value must be the ARN of a Lambda function configured to handle the "Custom Message" trigger.
   */
  customMessage?: string;
  /**
   * #### Post-authentication hook
   *
   * Runs after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,
   * or block access based on additional checks.
   */
  postAuthentication?: string;
  /**
   * #### Post-confirmation hook
   *
   * Runs right after a user confirms their account (for example via email link or admin confirmation).
   * This is often used to create user records in your own database or to provision resources.
   */
  postConfirmation?: string;
  /**
   * #### Pre-authentication hook
   *
   * Invoked just before Cognito validates a user's credentials. You can use this to block sign‑in attempts
   * based on IP, device, or user state (for example, soft‑deleting an account).
   */
  preAuthentication?: string;
  /**
   * #### Pre-sign-up hook
   *
   * Called before a new user is created. Useful for validating input, auto‑confirming trusted users,
   * or blocking sign‑ups that don't meet your business rules.
   */
  preSignUp?: string;
  /**
   * #### Pre-token-generation hook
   *
   * Runs right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)
   * based on external systems or additional logic.
   */
  preTokenGeneration?: string;
  /**
   * #### User migration hook
   *
   * Lets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn't exist in Cognito,
   * this trigger can look them up elsewhere, import them, and let the sign‑in continue.
   */
  userMigration?: string;
  /**
   * #### Create auth challenge hook
   *
   * Part of Cognito's custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)
   * after `DefineAuthChallenge` decides a challenge is needed.
   */
  createAuthChallenge?: string;
  /**
   * #### Define auth challenge hook
   *
   * Also part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,
   * based on previous challenges and responses.
   */
  defineAuthChallenge?: string;
  /**
   * #### Verify auth challenge response hook
   *
   * Validates the user's response to a custom challenge (for example, checking an OTP the user provides).
   */
  verifyAuthChallengeResponse?: string;
}

interface EmailConfiguration {
  /**
   * #### SES identity to send emails from
   *
   * ---
   *
   * ARN of an SES verified identity (email address or domain) that Cognito should use when sending emails.
   * Required when you want full control over sending (for example for MFA via `EMAIL_OTP`), because Cognito
   * must switch into `DEVELOPER` email sending mode.
   */
  sesAddressArn?: string;
  /**
   * #### From address
   *
   * ---
   *
   * The email address that appears in the "From" field of messages sent by Cognito (if you're using SES).
   * This address must be verified in SES if you're sending through your own identity.
   */
  from?: string;
  /**
   * #### Reply-to address
   *
   * ---
   *
   * Optional address where replies to Cognito emails should be delivered.
   * If not set, replies go to the `from` address (or the default Cognito sender).
   */
  replyToEmailAddress?: string;
}

interface InviteMessageConfig {
  /**
   * #### Invitation email body
   *
   * ---
   *
   * The text of the email sent when an administrator creates a new user.
   * You can reference placeholders like `{username}` and `{####}` (temporary password or code) in the message.
   */
  emailMessage?: string;
  /**
   * #### Invitation email subject
   */
  emailSubject?: string;
  /**
   * #### Invitation SMS body
   *
   * ---
   *
   * The content of the SMS message sent when new users are created with a phone number.
   * As with email, you can include placeholders such as `{username}` and `{####}`.
   */
  smsMessage?: string;
}

interface UserVerificationMessageConfig {
  /**
   * #### Email body when verifying with a code
   *
   * Used when `userVerificationType` is `email-code`. The message typically contains a `{####}` placeholder
   * that Cognito replaces with a one‑time verification code.
   */
  emailMessageUsingCode?: string;
  /**
   * #### Email body when verifying with a link
   *
   * Used when `userVerificationType` is `email-link`. Cognito replaces special markers like `{##verify your email##}`
   * with a clickable URL.
   */
  emailMessageUsingLink?: string;
  /**
   * #### Email subject when verifying with a code
   */
  emailSubjectUsingCode?: string;
  /**
   * #### Email subject when verifying with a link
   */
  emailSubjectUsingLink?: string;
  /**
   * #### SMS verification message
   *
   * ---
   *
   * Text of the SMS Cognito sends when verifying a phone number (for example containing `{####}`).
   */
  smsMessage?: string;
}

interface AttributeSchema {
  /**
   * #### Attribute name
   *
   * The logical name of the attribute as it appears on the user (for example `given_name`, `plan`, or `tenantId`).
   */
  name?: string;
  /**
   * #### Attribute data type
   *
   * The value type stored for this attribute (`String`, `Number`, etc.).
   * This is passed to Cognito's `AttributeDataType`.
   */
  attributeDataType?: string;
  /**
   * #### Developer-only attribute
   *
   * If true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly.
   */
  developerOnlyAttribute?: boolean;
  /**
   * #### Mutable after sign-up
   *
   * Controls whether the attribute can be changed after it has been initially set.
   */
  mutable?: boolean;
  /**
   * #### Required at sign-up
   *
   * If true, users must supply this attribute when creating an account.
   */
  required?: boolean;
  /**
   * #### Maximum numeric value
   */
  numberMaxValue?: number;
  /**
   * #### Minimum numeric value
   */
  numberMinValue?: number;
  /**
   * #### Maximum string length
   */
  stringMaxLength?: number;
  /**
   * #### Minimum string length
   */
  stringMinLength?: number;
}

interface PasswordPolicy {
  /**
   * #### Minimum password length
   *
   * The fewest characters a password can have. Longer passwords are generally more secure.
   */
  minimumLength?: number;
  /**
   * #### Require at least one lowercase letter
   */
  requireLowercase?: boolean;
  /**
   * #### Require at least one number
   */
  requireNumbers?: boolean;
  /**
   * #### Require at least one symbol
   *
   * Symbols are non‑alphanumeric characters such as `!`, `@`, or `#`.
   */
  requireSymbols?: boolean;
  /**
   * #### Require at least one uppercase letter
   */
  requireUppercase?: boolean;
  /**
   * #### Temporary password validity (days)
   *
   * How long a temporary password issued to a new user is valid before it must be changed on first sign‑in.
   */
  temporaryPasswordValidityDays?: number;
}

interface MfaConfiguration {
  /**
   * #### MFA requirement
   *
   * - `OFF`: MFA is completely disabled.
   * - `ON`: All users must complete MFA during sign‑in.
   * - `OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.
   *
   * This value configures the Cognito `MfaConfiguration` property.
   */
  status?: 'ON' | 'OFF' | 'OPTIONAL';
  /**
   * #### Enabled MFA factor types
   *
   * ---
   *
   * Chooses which MFA methods users can use:
   *
   * - `SMS`: One‑time codes are sent via text message. Requires an SNS role so Cognito can send SMS.
   * - `SOFTWARE_TOKEN`: Time‑based one‑time codes from an authenticator app.
   * - `EMAIL_OTP`: Codes are sent by email. AWS requires that you configure a developer email sending identity
   *   (which Stacktape does when you provide `emailConfiguration.sesAddressArn`).
   *
   * These values are mapped to Cognito's `EnabledMfas` setting (`SMS_MFA`, `SOFTWARE_TOKEN_MFA`, `EMAIL_OTP`),
   * whose behavior is described in
   * [EnabledMfas in the AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool).
   */
  enabledTypes?: ('SMS' | 'SOFTWARE_TOKEN' | 'EMAIL_OTP')[];
}

interface IdentityProvider {
  /**
   * #### Provider type
   *
   * ---
   *
   * The kind of external identity provider you want to integrate:
   *
   * - `Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`: social identity providers.
   * - `OIDC`: a generic OpenID Connect provider.
   * - `SAML`: a SAML 2.0 identity provider (often used for enterprise SSO).
   */
  type: 'Facebook' | 'Google' | 'LoginWithAmazon' | 'OIDC' | 'SAML' | 'SignInWithApple';
  /**
   * #### OAuth / OIDC client ID
   *
   * ---
   *
   * The client ID (sometimes called app ID) that you obtained from the external provider's console.
   * Cognito presents this ID when redirecting users to the provider.
   */
  clientId: string;
  /**
   * #### OAuth / OIDC client secret
   *
   * ---
   *
   * The client secret associated with the `clientId`, used by Cognito when exchanging authorization codes for tokens.
   * This value should be kept confidential and only configured from secure sources.
   */
  clientSecret: string;
  /**
   * #### Attribute mapping
   *
   * ---
   *
   * Maps attributes from the external provider (for example `email`, `given_name`) to Cognito user pool attributes.
   * Keys are Cognito attribute names, values are attribute names from the identity provider.
   *
   * If not provided, Stacktape defaults to mapping `email -> email`.
   */
  attributeMapping?: { [awsAttributeName: string]: string };
  /**
   * #### Requested scopes
   *
   * ---
   *
   * Additional OAuth scopes to request from the identity provider (for example `openid`, `email`, `profile`).
   * These control which pieces of user information and permissions your app receives in the provider's tokens.
   *
   * If omitted, Stacktape uses a reasonable default per provider (see
   * [AWS::Cognito::UserPoolIdentityProvider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider)).
   */
  authorizeScopes?: string[];
  /**
   * #### Advanced provider options
   *
   * ---
   *
   * Low‑level configuration passed directly into Cognito's `ProviderDetails` map.
   * You can use this to override endpoints or supply provider‑specific keys as documented by AWS,
   * for example `authorize_url`, `token_url`, `attributes_request_method`, `oidc_issuer`, and others.
   *
   * In most cases you don't need to set this – Stacktape configures sensible defaults for common providers.
   */
  providerDetails?: Record<string, any>;
}

type StpUserAuthPool = UserAuthPool['properties'] & {
  name: string;
  type: UserAuthPool['type'];
  configParentResourceType: UserAuthPool['type'];
  nameChain: string[];
};

interface CognitoAuthorizerProperties {
  /**
   * #### Name of the user pool to protect the API
   *
   * ---
   *
   * The Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.
   * Stacktape uses this to:
   *
   * - Set the expected **audience** to the user pool client ID.
   * - Build the expected **issuer** URL based on the user pool and AWS region.
   *
   * In practice this means only JWTs issued by this pool (and its client) will be considered valid.
   */
  userPoolName: string;
  /**
   * #### Where to read the JWT from in the request
   *
   * ---
   *
   * A list of identity sources that tell API Gateway where to look for the bearer token, using the
   * `$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).
   *
   * If you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,
   * using a JWT authorizer as described in the API Gateway v2 authorizer docs
   * ([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).
   */
  identitySources?: string[];
}

interface CognitoAuthorizer {
  /**
   * #### Cognito JWT authorizer
   *
   * ---
   *
   * Configures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.
   * This is the simplest way to protect routes when your users sign in via `user-auth-pool`.
   *
   * Stacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience.
   */
  type: 'cognito';
  properties: CognitoAuthorizerProperties;
}

interface LambdaAuthorizerProperties {
  /**
   * #### Name of the authorizer function
   *
   * ---
   *
   * The Stacktape name of a `function` resource that should run for each authorized request.
   * API Gateway calls this Lambda, passes request details, and uses its response to allow or deny access.
   */
  functionName: string;
  /**
   * #### Use IAM-style (v1) authorizer responses
   *
   * ---
   *
   * - If `true`, your Lambda must return a full IAM policy document (the "v1" format).
   * - If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)
   *   so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.
   *
   * This flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.
   */
  iamResponse?: boolean;
  /**
   * #### Where to read identity data from
   *
   * ---
   *
   * A list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,
   * or stage variables) using the `$request.*` syntax.
   *
   * When left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.
   */
  identitySources?: string[];
  /**
   * #### Cache authorizer results
   *
   * ---
   *
   * Number of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.
   * While cached, repeated requests skip calling your authorizer function and reuse the previous result.
   *
   * This value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).
   */
  cacheResultSeconds?: number;
}

interface LambdaAuthorizer {
  /**
   * #### Lambda-based HTTP API authorizer
   *
   * ---
   *
   * Configures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.
   * This is useful when your authorization logic can't be expressed as simple JWT validation – for example when you
   * check API keys, look up permissions in a database, or integrate with a non-JWT identity system.
   *
   * Stacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda.
   */
  type: 'lambda';
  properties: LambdaAuthorizerProperties;
}

type StpAuthorizer = CognitoAuthorizer | LambdaAuthorizer;

type UserPoolReferencableParam = 'id' | 'clientId' | 'arn' | 'domain' | 'clientSecret' | 'providerUrl';

```

## Event Types

```typescript
/**
 * #### Triggers a container when a request matches the specified conditions on an Application Load Balancer.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
interface ContainerWorkloadLoadBalancerIntegration {
  type: 'application-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadLoadBalancerIntegrationProps;
}

interface ContainerWorkloadLoadBalancerIntegrationProps extends ApplicationLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
}

/**
 * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
interface ApplicationLoadBalancerIntegration {
  /**
   * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
   *
   * ---
   *
   * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
   */
  type: 'application-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ApplicationLoadBalancerIntegrationProps;
}

interface ApplicationLoadBalancerIntegrationProps {
  /**
   * #### The name of the Application Load Balancer.
   *
   * ---
   *
   * This must reference a load balancer defined in your Stacktape configuration.
   */
  loadBalancerName: string;
  /**
   * #### The port of the load balancer listener to attach to.
   *
   * ---
   *
   * You only need to specify this if the load balancer uses custom listeners.
   */
  listenerPort?: number;
  /**
   * #### The priority of this integration rule.
   *
   * ---
   *
   * Load balancer rules are evaluated in order from the lowest priority to the highest.
   * The first rule that matches an incoming request will handle it.
   */
  priority: number;
  /**
   * #### A list of URL paths that will trigger this integration.
   *
   * ---
   *
   * The request will be routed if its path matches any of the paths in this list.
   * The comparison is case-sensitive and supports `*` and `?` wildcards.
   *
   * Example: `/users`, `/articles/*`
   */
  paths?: string[];
  /**
   * #### A list of HTTP methods that will trigger this integration.
   *
   * ---
   *
   * Example: `GET`, `POST`, `DELETE`
   */
  methods?: string[];
  /**
   * #### A list of hostnames that will trigger this integration.
   *
   * ---
   *
   * The hostname is parsed from the `Host` header of the request.
   * Wildcards (`*` and `?`) are supported.
   *
   * Example: `api.example.com`, `*.myapp.com`
   */
  hosts?: string[];
  /**
   * #### A list of header conditions that the request must match.
   *
   * ---
   *
   * All header conditions must be met for the request to be routed.
   */
  headers?: LbHeaderCondition[];
  /**
   * #### A list of query parameter conditions that the request must match.
   *
   * ---
   *
   * All query parameter conditions must be met for the request to be routed.
   */
  queryParams?: LbQueryParamCondition[];
  /**
   * #### A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.
   *
   * ---
   *
   * > **Note:** If the client is behind a proxy, this will be the IP address of the proxy.
   */
  sourceIps?: string[];
}

interface LbHeaderCondition {
  /**
   * #### The name of the HTTP header.
   */
  headerName: string;
  /**
   * #### A list of allowed values for the header.
   *
   * ---
   *
   * The condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.
   */
  values: string[];
}
interface LbQueryParamCondition {
  /**
   * #### The name of the query parameter.
   */
  paramName: string;
  /**
   * #### A list of allowed values for the query parameter.
   *
   * ---
   *
   * The condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.
   */
  values: string[];
}
interface ContainerWorkloadHttpApiIntegrationProps extends HttpApiIntegrationProps {
  /**
   * #### The container port that will receive traffic from the API Gateway.
   */
  containerPort: number;
}

/**
 * #### Triggers a container when an HTTP API Gateway receives a matching request.
 *
 * ---
 *
 * You can route requests based on HTTP method and path.
 */
interface ContainerWorkloadHttpApiIntegration {
  type: 'http-api-gateway';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadHttpApiIntegrationProps;
}

/**
 * #### Opens a container port for connections from other containers within the same workload.
 */
interface ContainerWorkloadInternalIntegration {
  type: 'workload-internal';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadInternalIntegrationProps;
}

interface ContainerWorkloadInternalIntegrationProps {
  /**
   * #### The container port to open for internal traffic.
   */
  containerPort: number;
}

/**
 * #### Opens a container port for connections from other compute resources in the same stack.
 */
interface ContainerWorkloadServiceConnectIntegration {
  type: 'service-connect';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadServiceConnectIntegrationProps;
}

interface ContainerWorkloadServiceConnectIntegrationProps {
  /**
   * #### The container port to open for service-to-service communication.
   */
  containerPort: number;
  /**
   * #### An alias for this service, used for service discovery.
   *
   * ---
   *
   * Other resources in the stack can connect to this service using a URL like `protocol://alias:port` (e.g., `http://my-service:8080`).
   * By default, the alias is derived from the resource and container names (e.g., `my-resource-my-container`).
   */
  alias?: string;
  /**
   * #### The protocol used for service-to-service communication.
   *
   * ---
   *
   * Specifying the protocol allows AWS to capture protocol-specific metrics, such as the number of HTTP 5xx errors.
   */
  protocol?: 'http' | 'http2' | 'grpc';
}

/**
 * #### Triggers a function when new messages are available in a Kafka topic.
 */
interface KafkaTopicIntegration {
  type: 'kafka-topic';
  /**
   * #### Properties of the integration
   */
  properties: KafkaTopicIntegrationProps;
}

interface KafkaTopicIntegrationProps {
  /**
   * #### The details of your Kafka cluster.
   *
   * ---
   *
   * Specifies the bootstrap servers and topic name.
   */
  customKafkaConfiguration?: CustomKafkaEventSource;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * The function will be invoked with up to this many records. Maximum is 10,000.
   *
   * @default 100
   */
  batchSize?: number;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * The function will be triggered when either the `batchSize` is reached or this time window expires.
   * Maximum is 300 seconds.
   *
   * @default 0.5
   */
  maxBatchWindowSeconds?: number;
}

interface CustomKafkaEventSource {
  /**
   * #### A list of `host:port` addresses for your Kafka brokers.
   */
  bootstrapServers: string[];
  /**
   * #### The name of the Kafka topic to consume messages from.
   */
  topicName: string;
  /**
   * #### The authentication method for connecting to the Kafka cluster.
   *
   * ---
   *
   * - `SASL`: Authenticate using a username and password (PLAIN or SCRAM).
   * - `MTLS`: Authenticate using a client-side TLS certificate.
   */
  authentication: KafkaSASLAuth | KafkaMTLSAuth;
}

interface KafkaSASLAuth {
  /**
   * #### The SASL authentication protocol.
   *
   * ---
   *
   * - `BASIC_AUTH`: SASL/PLAIN
   * - `SASL_SCRAM_256_AUTH`: SASL SCRAM-256
   * - `SASL_SCRAM_512_AUTH`: SASL SCRAM-512
   */
  type: 'BASIC_AUTH' | 'SASL_SCRAM_256_AUTH' | 'SASL_SCRAM_512_AUTH';
  /**
   * #### Properties of authentication method
   */
  properties: KafkaSASLAuthProps;
}

interface KafkaSASLAuthProps {
  /**
   * #### The ARN of a secret containing the Kafka credentials.
   *
   * ---
   *
   * The secret must be a JSON object with `username` and `password` keys.
   * You can create secrets using the `stacktape secret:create` command.
   */
  authenticationSecretArn: string;
}

interface KafkaMTLSAuth {
  /**
   * #### The authentication protocol.
   *
   * ---
   *
   * `MTLS`: Mutual TLS authentication.
   */
  type: 'MTLS';
  /**
   * #### Properties of authentication method
   */
  properties: KafkaMTLSAuthProps;
}
interface KafkaMTLSAuthProps {
  /**
   * #### The ARN of a secret containing the client certificate.
   *
   * ---
   *
   * This secret should contain the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password.
   * You can create secrets using the `stacktape secret:create` command.
   */
  clientCertificate: string;
  /**
   * #### The ARN of a secret containing the server's root CA certificate.
   *
   * ---
   *
   * You can create secrets using the `stacktape secret:create` command.
   */
  serverRootCaCertificate?: string;
}

/**
 * #### Triggers a function when a new message is published to an SNS topic.
 *
 * ---
 *
 * Amazon SNS is a fully managed messaging service for both application-to-application (A2A) and application-to-person (A2P) communication.
 *
 * To add a custom SNS topic to your stack, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sns-topic.html) in the `cloudformationResources` section of your configuration.
 */
interface SnsIntegration {
  type: 'sns';
  /**
   * #### Properties of the integration
   */
  properties: SnsIntegrationProps;
}

interface SnsIntegrationProps {
  /**
   * #### The name of an SNS topic defined in your stack's resources.
   *
   * ---
   *
   * You must specify either `snsTopicName` or `snsTopicArn`.
   */
  snsTopicName?: string;
  /**
   * #### The ARN of an existing SNS topic.
   *
   * ---
   *
   * Use this to subscribe to a topic that is not managed by your stack.
   * You must specify either `snsTopicName` or `snsTopicArn`.
   */
  snsTopicArn?: string;
  /**
   * #### A filter policy to apply to incoming messages.
   *
   * ---
   *
   * This allows you to filter messages based on their attributes, so the function is only triggered for relevant messages.
   * If you need to filter based on the message content, consider using an EventBridge event bus instead.
   * For more details on filter policies, see the [AWS documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html).
   */
  filterPolicy?: any;
  /**
   * #### A destination for messages that fail to be delivered to the target.
   *
   * ---
   *
   * In rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.
   * This property specifies an SQS queue where failed messages will be sent.
   */
  onDeliveryFailure?: SnsOnDeliveryFailure;
}

interface SnsOnDeliveryFailure {
  /**
   * #### The ARN of the SQS queue for failed messages.
   */
  sqsQueueArn?: string;
  /**
   * #### The name of an SQS queue (defined in your Stacktape configuration) for failed messages.
   */
  sqsQueueName?: string;
}

/**
 * #### Triggers a function when new messages are available in an SQS queue.
 *
 * ---
 *
 * Messages are processed in batches. A single function invocation can receive multiple messages.
 *
 * > A single SQS queue should only be consumed by one function. If you need multiple consumers for the same message (a "fan-out" pattern), use an SNS topic or an EventBridge event bus.
 *
 * To add a custom SQS queue, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sqs-queues.html) in the `cloudformationResources` section.
 *
 * The function is triggered when:
 * - The batch window (`maxBatchWindowSeconds`) expires.
 * - The maximum batch size (`batchSize`) is reached.
 * - The maximum payload size (6 MB) is reached.
 */
interface SqsIntegration {
  type: 'sqs';
  /**
   * #### Properties of the integration
   */
  properties: SqsIntegrationProps;
}

interface SqsIntegrationProps {
  /**
   * #### The name of an SQS queue defined in your stack's resources.
   *
   * ---
   *
   * You must specify either `sqsQueueName` or `sqsQueueArn`.
   */
  sqsQueueName?: string;
  /**
   * #### The ARN of an existing SQS queue.
   *
   * ---
   *
   * Use this to consume messages from a queue that is not managed by your stack.
   * You must specify either `sqsQueueName` or `sqsQueueArn`.
   */
  sqsQueueArn?: string;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 10,000.
   *
   * @default 10
   */
  batchSize?: number;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds. If not set, the function is invoked as soon as messages are available.
   */
  maxBatchWindowSeconds?: number;
}

/**
 * #### Triggers a function when new records are available in a Kinesis Data Stream.
 *
 * ---
 *
 * Kinesis is suitable for real-time data streaming and processing. Records are processed in batches.
 * For a comparison with SQS, see the [AWS documentation](https://aws.amazon.com/kinesis/data-streams/faqs/).
 *
 * To add a custom Kinesis stream, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kinesis-stream.html) in the `cloudformationResources` section.
 *
 * You can consume messages in two ways:
 * - **Directly**: Polls each shard once per second. Read throughput is shared with other consumers.
 * - **Stream Consumer**: Provides a dedicated connection to each shard for higher throughput and lower latency.
 */
interface KinesisIntegration {
  type: 'kinesis-stream';
  /**
   * #### Properties of the integration
   */
  properties: KinesisIntegrationProps;
}

interface KinesisIntegrationProps {
  /**
   * #### The name of a Kinesis stream defined in your stack's resources.
   *
   * ---
   *
   * You must specify either `kinesisStreamName` or `streamArn`.
   */
  kinesisStreamName?: string;
  /**
   * #### The ARN of an existing Kinesis stream to consume records from.
   *
   * ---
   *
   * Use this to consume from a stream that is not managed by your stack.
   * You must specify either `kinesisStreamName` or `streamArn`.
   */
  streamArn?: string;
  /**
   * #### The ARN of a specific stream consumer to use.
   *
   * ---
   *
   * This cannot be used with `autoCreateConsumer`.
   */
  consumerArn?: string;
  /**
   * #### Automatically creates a dedicated stream consumer for this integration.
   *
   * ---
   *
   * This is recommended for minimizing latency and maximizing throughput.
   * For more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).
   * This cannot be used with `consumerArn`.
   */
  autoCreateConsumer?: boolean;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds.
   */
  maxBatchWindowSeconds?: number;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 10,000.
   *
   * @default 10
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
   *
   * @default TRIM_HORIZON
   */
  startingPosition?: 'LATEST' | 'TRIM_HORIZON';
  /**
   * #### The number of times to retry a failed batch of records.
   *
   * ---
   *
   * > **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.
   */
  maximumRetryAttempts?: number;
  /**
   * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
   */
  onFailure?: DestinationOnFailure;
  /**
   * #### The number of batches to process concurrently from the same shard.
   */
  parallelizationFactor?: number;
  /**
   * #### Splits a failed batch in two before retrying.
   *
   * ---
   *
   * This can be useful if a failure is caused by a batch being too large.
   */
  bisectBatchOnFunctionError?: boolean;
}

interface DestinationOnFailure {
  /**
   * #### The ARN of the SNS topic or SQS queue for failed batches.
   */
  arn: string;
  /**
   * #### The type of the destination.
   */
  type: 'sns' | 'sqs';
}

/**
 * #### Triggers a function when item-level changes occur in a DynamoDB table.
 *
 * ---
 *
 * DynamoDB Streams capture a time-ordered sequence of modifications to items in a table.
 * Records are processed in batches.
 * To use this, you must enable streams on your DynamoDB table. For more information, see the [DynamoDB table documentation](https://docs.stacktape.com/resources/dynamo-db-tables/#item-change-streaming).
 */
interface DynamoDbIntegration {
  type: 'dynamo-db-stream';
  /**
   * #### Properties of the integration
   */
  properties: DynamoDbIntegrationProps;
}

interface DynamoDbIntegrationProps {
  /**
   * #### The ARN of the DynamoDB table stream.
   */
  streamArn: string;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds.
   */
  maxBatchWindowSeconds?: number; // maximum 300 seconds
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 1,000.
   *
   * @default 100
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
   *
   * @default TRIM_HORIZON
   */
  startingPosition?: string;
  /**
   * #### The number of times to retry a failed batch of records.
   *
   * ---
   *
   * > **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.
   */
  maximumRetryAttempts?: number;
  /**
   * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
   */
  onFailure?: DestinationOnFailure;
  /**
   * #### The number of batches to process concurrently from the same shard.
   */
  parallelizationFactor?: number;
  /**
   * #### Splits a failed batch in two before retrying.
   *
   * ---
   *
   * This can be useful if a failure is caused by a batch being too large.
   */
  bisectBatchOnFunctionError?: boolean;
}
/**
 * #### Triggers a function when a specified event occurs in an S3 bucket.
 *
 * ---
 *
 * For a list of supported event types, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html#supported-notification-event-types).
 */
interface S3Integration {
  type: 's3';
  /**
   * #### Properties of the integration
   */
  properties: S3IntegrationProps;
}

interface S3IntegrationProps {
  /**
   * #### The ARN of the S3 bucket to monitor for events.
   */
  bucketArn: string;
  /**
   * #### The type of S3 event that will trigger the function.
   */
  s3EventType:
    | 's3:ReducedRedundancyLostObject'
    | 's3:ObjectCreated:*'
    | 's3:ObjectCreated:Put'
    | 's3:ObjectCreated:Post'
    | 's3:ObjectCreated:Copy'
    | 's3:ObjectCreated:CompleteMultipartUpload'
    | 's3:ObjectRemoved:*'
    | 's3:ObjectRemoved:Delete'
    | 's3:ObjectRemoved:DeleteMarkerCreated'
    | 's3:ObjectRestore:*'
    | 's3:ObjectRestore:Post'
    | 's3:ObjectRestore:Completed'
    | 's3:Replication:*'
    | 's3:Replication:OperationFailedReplication'
    | 's3:Replication:OperationNotTracked'
    | 's3:Replication:OperationMissedThreshold'
    | 's3:Replication:OperationReplicatedAfterThreshold';
  /**
   * #### A filter to apply to objects, so the function is only triggered for relevant objects.
   */
  filterRule?: S3FilterRule;
}

interface S3FilterRule {
  /**
   * #### The prefix that an object's key must have to trigger the function.
   */
  prefix?: string;
  /**
   * #### The suffix that an object's key must have to trigger the function.
   */
  suffix?: string;
}

/**
 * #### Triggers a function on a recurring schedule.
 *
 * ---
 *
 * You can define schedules using two formats:
 * - **Rate expressions**: Run at a regular interval (e.g., `rate(5 minutes)`). See the [AWS documentation on rate expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions).
 * - **Cron expressions**: Run at specific times (e.g., `cron(0 18 ? * MON-FRI *)`). See the [AWS documentation on cron expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions).
 */
interface ScheduleIntegration {
  type: 'schedule';
  /**
   * #### Properties of the integration
   */
  properties: ScheduleIntegrationProps;
}

interface ScheduleIntegrationProps {
  /**
   * #### The schedule rate or cron expression.
   *
   * ---
   *
   * Examples: `rate(2 hours)`, `cron(0 10 * * ? *)`
   */
  scheduleRate: string;
  /**
   * #### A fixed JSON object to be passed as the event payload.
   *
   * ---
   *
   * If you need to customize the payload based on the event, use `inputTransformer` instead.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * input:
   *   source: 'my-scheduled-event'
   * ```
   */
  input?: any;
  /**
   * #### A JSONPath expression to extract a portion of the event to pass to the target.
   *
   * ---
   *
   * This is useful for forwarding only a specific part of the event payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputPath: '$.detail'
   * ```
   */
  inputPath?: string;
  /**
   * #### Customizes the event payload sent to the target.
   *
   * ---
   *
   * This allows you to extract values from the original event and use them to construct a new payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputTransformer:
   *   inputPathsMap:
   *     eventTime: '$.time'
   *   inputTemplate:
   *     message: 'This event occurred at <eventTime>.'
   * ```
   */
  inputTransformer?: EventInputTransformer;
}

interface AlarmIntegration {
  type: 'cloudwatch-alarm';
  /**
   * #### Properties of the integration
   */
  properties: AlarmIntegrationProps;
}

interface AlarmIntegrationProps {
  /**
   * #### The name of the alarm (defined in the `alarms` section) that will trigger the function.
   */
  alarmName: string;
  // input?: any;
  // inputPath?: string;
  // inputTransformer?: EventInputTransformer;
}

/**
 * #### Triggers a function when a new log record is added to a CloudWatch log group.
 *
 * ---
 *
 * > **Note:** The event payload is BASE64-encoded and gzipped. You will need to decode and decompress it in your function to access the log data.
 */
interface CloudwatchLogIntegration {
  type: 'cloudwatch-log';
  /**
   * #### Properties of the integration
   */
  properties: CloudwatchLogIntegrationProps;
}

interface CloudwatchLogIntegrationProps {
  /**
   * #### The ARN of the log group to watch for new records.
   */
  logGroupArn: string;
  /**
   * #### A filter pattern to apply to the log records.
   *
   * ---
   *
   * Only logs that match this pattern will trigger the function.
   * For details on the syntax, see the [AWS documentation on filter and pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
   */
  filter?: string;
}

interface EventBusIntegrationPattern {
  /**
   * #### A filter for the `version` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  version?: any;
  /**
   * #### A filter for the `detail-type` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  'detail-type'?: any;
  /**
   * #### A filter for the `source` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  source?: any;
  /**
   * #### A filter for the `account` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  account?: any;
  /**
   * #### A filter for the `region` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  region?: any;
  /**
   * #### A filter for the `resources` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  resources?: any;
  /**
   * #### A filter for the `detail` field of the event.
   *
   * ---
   *
   * The `detail` field contains the main payload of the event as a JSON object. You can create complex matching rules based on its contents.
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  detail?: any;
  /**
   * #### A filter for the `replay-name` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  'replay-name'?: any;
}

interface EventInputTransformer {
  /**
   * #### A map of key-value pairs to extract from the event payload.
   *
   * ---
   *
   * Each value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.
   */
  inputPathsMap?: any;
  /**
   * #### A template for constructing a new event payload.
   *
   * ---
   *
   * Use placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.
   */
  inputTemplate: any;
}

interface IotIntegration {
  type: 'iot';
  /**
   * #### Properties of the integration
   */
  properties: IotIntegrationProps;
}

interface IotIntegrationProps {
  /**
   * #### The SQL statement for the IoT topic rule.
   */
  sql: string;
  /**
   * #### The version of the IoT SQL rules engine to use.
   */
  sqlVersion?: string;
}

/**
 * #### Triggers a function when a request is made to an HTTP API Gateway.
 *
 * ---
 *
 * Routes are selected based on the most specific match. For more details on route evaluation, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html#http-api-develop-routes.evaluation).
 */
interface HttpApiIntegration {
  type: 'http-api-gateway';
  /**
   * #### Properties of the integration
   */
  properties: HttpApiIntegrationProps;
}

interface HttpApiIntegrationProps {
  /**
   * #### The name of the HTTP API Gateway.
   */
  httpApiGatewayName: string;
  /**
   * #### The HTTP method that will trigger this integration.
   *
   * ---
   *
   * You can specify an exact method (e.g., `GET`) or use `*` to match any method.
   */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';
  /**
   * #### The URL path that will trigger this integration.
   *
   * ---
   *
   * - **Exact path**: `/users`
   * - **Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.
   * - **Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`.
   */
  path: string;
  /**
   * #### An authorizer to protect this route.
   *
   * ---
   *
   * Unauthorized requests will be rejected with a `401 Unauthorized` response.
   */
  authorizer?: StpAuthorizer;
  /**
   * #### The payload format version for the Lambda integration.
   *
   * ---
   *
   * For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
   *
   * @default '1.0'
   */
  payloadFormat?: '1.0' | '2.0';
}

/**
 * #### Triggers a batch job when an event matching a specified pattern is received by an event bus.
 *
 * ---
 *
 * You can use a custom event bus or the default AWS event bus.
 */
interface EventBusIntegration {
  type: 'event-bus';
  /**
   * #### Properties of the integration
   */
  properties: EventBusIntegrationProps;
}

interface EventBusIntegrationProps {
  /**
   * #### The ARN of an existing event bus.
   *
   * ---
   *
   * Use this to subscribe to an event bus that is not managed by your stack.
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  eventBusArn?: string;
  /**
   * #### The name of an event bus defined in your stack's resources.
   *
   * ---
   *
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  eventBusName?: string;
  /**
   * #### Uses the default AWS event bus.
   *
   * ---
   *
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  useDefaultBus?: boolean;
  /**
   * #### A pattern to filter events from the event bus.
   *
   * ---
   *
   * Only events that match this pattern will trigger the target.
   * For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  eventPattern: EventBusIntegrationPattern;
  /**
   * #### A destination for events that fail to be delivered to the target.
   *
   * ---
   *
   * In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.
   */
  onDeliveryFailure?: EventBusOnDeliveryFailure;
  /**
   * #### A fixed JSON object to be passed as the event payload.
   *
   * ---
   *
   * If you need to customize the payload based on the event, use `inputTransformer` instead.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * input:
   *   source: 'my-custom-event'
   * ```
   */
  input?: any;
  /**
   * #### A JSONPath expression to extract a portion of the event to pass to the target.
   *
   * ---
   *
   * This is useful for forwarding only a specific part of the event payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputPath: '$.detail'
   * ```
   */
  inputPath?: string;
  /**
   * #### Customizes the event payload sent to the target.
   *
   * ---
   *
   * This allows you to extract values from the original event and use them to construct a new payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputTransformer:
   *   inputPathsMap:
   *     instanceId: '$.detail.instance-id'
   *     instanceState: '$.detail.state'
   *   inputTemplate:
   *     message: 'Instance <instanceId> is now in state <instanceState>.'
   * ```
   */
  inputTransformer?: EventInputTransformer;
}

interface EventBusOnDeliveryFailure {
  /**
   * #### The ARN of the SQS queue for failed events.
   */
  sqsQueueArn?: string;
  /**
   * #### The name of an SQS queue (defined in your Stacktape configuration) for failed events.
   */
  sqsQueueName?: string;
}

/**
 * #### Triggers a container when a request is made to a Network Load Balancer.
 *
 * ---
 *
 * A Network Load Balancer operates at the transport layer (Layer 4) and can handle TCP and TLS traffic.
 */
interface ContainerWorkloadNetworkLoadBalancerIntegration {
  type: 'network-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadNetworkLoadBalancerIntegrationProps;
}

interface ContainerWorkloadNetworkLoadBalancerIntegrationProps extends NetworkLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
}

interface NetworkLoadBalancerIntegrationProps {
  /**
   * #### The name of the Network Load Balancer.
   *
   * ---
   *
   * This must reference a load balancer defined in your Stacktape configuration.
   */
  loadBalancerName: string;
  /**
   * #### The port of the listener that will forward traffic to this integration.
   */
  listenerPort: number;
}

```
