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
  | EfsFilesystem;

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
) & {
  _nestedResources?: {
    [nestedStpResourceIdentifier: string]: StpResource;
  };
};

type StpWorkloadType = StacktapeWorkloadDefinition['type'];
type StpResourceType = StpResource['type'];

type Tracing = 'Active' | 'PassThrough';

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
  | Subtype<StpResource, StpSnsTopic>;

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
  | OpenSearchDomainReferencableParams;
