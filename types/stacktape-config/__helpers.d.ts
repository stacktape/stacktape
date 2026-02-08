type StacktapeResourceDefinition =
  | HostingBucket
  | NextjsWeb
  | AstroWeb
  | NuxtWeb
  | SvelteKitWeb
  | SolidStartWeb
  | TanStackWeb
  | RemixWeb
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
  | StpAstroWeb
  | StpNuxtWeb
  | StpSvelteKitWeb
  | StpSolidStartWeb
  | StpTanStackWeb
  | StpRemixWeb
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
 * Controls whether this resource runs locally or connects to the deployed AWS version
 * during `stacktape dev`.
 */
interface DevModeConfig {
  /**
   * #### Use the deployed AWS resource instead of a local emulation.
   *
   * ---
   *
   * By default, databases, Redis, and DynamoDB run locally in Docker during dev mode.
   * Set to `true` to connect to the real deployed resource instead (must be deployed first).
   *
   * Useful when local emulation doesn't match production behavior closely enough,
   * or when you need to work with real data.
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
   * #### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).
   *
   * ---
   *
   * Don't include the protocol (`https://`). The domain must have a Route53 hosted zone
   * in your AWS account, with your registrar's nameservers pointing to it.
   *
   * Stacktape automatically creates a DNS record and provisions a free TLS certificate.
   */
  domainName: string;
  /**
   * #### Use your own TLS certificate instead of the auto-generated one.
   *
   * ---
   *
   * Provide the ARN of an ACM certificate from your AWS account.
   * Only needed if you have specific certificate requirements (e.g., EV/OV certs).
   * By default, Stacktape provisions and renews free certificates automatically.
   */
  customCertificateArn?: string;
  /**
   * #### Skip DNS record creation for this domain.
   *
   * ---
   *
   * Set to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).
   * Stacktape will still provision the TLS certificate but won't touch your DNS.
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
 * #### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.
 *
 * ---
 *
 * Use dot-notation paths to override specific properties on any child resource.
 * Find resource logical IDs with `stacktape stack-info --detailed`.
 *
 * ```yaml
 * overrides:
 *   MyDbInstance:
 *     Properties.StorageEncrypted: true
 * ```
 */
type ResourceOverrides = {
  [cfLogicalName: string]: { [resourcePath: string]: any };
};

interface Hooks {
  /**
   * #### Scripts to run before deploying. Common use: build frontend, lint code.
   */
  beforeDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after deploying. Common use: run database migrations, seed data.
   */
  afterDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before deleting the stack. Common use: export data, clean up external resources.
   *
   * ---
   *
   * Only runs when `--configPath` and `--stage` are provided to the delete command.
   */
  beforeDelete?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after deleting the stack.
   *
   * ---
   *
   * Only runs when `--configPath` and `--stage` are provided to the delete command.
   */
  afterDelete?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before syncing bucket contents.
   */
  beforeBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after syncing bucket contents.
   */
  afterBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before starting dev mode.
   */
  beforeDev?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after dev mode exits.
   */
  afterDev?: NamedScriptLifecycleHook[];
}

interface LifecycleHookBase {
  /**
   * #### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).
   *
   * ---
   *
   * Useful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).
   *
   * @default false
   */
  skipOnCI?: boolean;
  /**
   * #### Skip this hook when running locally; only run in CI/CD.
   *
   * ---
   *
   * Useful for CI-only tasks (e.g., uploading test reports, notifying Slack).
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
   * - `astro-web`
   * - `nuxt-web`
   * - `sveltekit-web`
   * - `solidstart-web`
   * - `tanstack-web`
   * - `remix-web`
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
   * #### Prevents accidental stack deletion. Must be disabled before you can delete.
   *
   * ---
   *
   * Recommended for production stacks. To delete a protected stack, first deploy with
   * `terminationProtection: false`, then run the delete command.
   *
   * @default false
   */
  terminationProtection?: boolean;
  /**
   * #### IAM role for CloudFormation to assume during create/update/delete operations.
   *
   * ---
   *
   * Use this when your deploy user has limited permissions and CloudFormation needs
   * a more privileged role to manage resources. The role is persisted across deployments
   * and reused for delete/rollback even if removed from config later.
   */
  cloudformationRoleArn?: Arn;
  /**
   * #### Alarms that trigger automatic rollback if they fire during deployment.
   *
   * ---
   *
   * Specify alarm names (from `alarms` section) or ARNs. The alarm must already exist -
   * a newly created alarm only takes effect on the *next* deployment.
   *
   * Use with `monitoringTimeAfterDeploymentInMinutes` to keep watching after deploy completes.
   */
  triggerRollbackOnAlarms?: string[];
  /**
   * #### How long (in minutes) to monitor rollback alarms after deployment completes.
   *
   * ---
   *
   * If an alarm fires during this window, the stack rolls back automatically.
   * Only useful when `triggerRollbackOnAlarms` is configured.
   *
   * @default 0
   */
  monitoringTimeAfterDeploymentInMinutes?: number;
  /**
   * #### Keep the stack in a failed state instead of rolling back on deployment failure.
   *
   * ---
   *
   * Useful for debugging: inspect what went wrong, then fix and redeploy
   * (or run `stacktape rollback` manually). By default, failed deployments
   * auto-rollback to the last working state.
   *
   * @default false
   */
  disableAutoRollback?: boolean;
  /**
   * #### SNS topic ARNs to receive CloudFormation stack events during deployment.
   *
   * ---
   *
   * Useful for monitoring deployments in external systems (Slack, PagerDuty, etc.).
   */
  publishEventsToArn?: Arn[];
  /**
   * #### How many old deployment artifacts (Lambda bundles, container images) to keep.
   *
   * ---
   *
   * Older versions are cleaned up automatically. Lower values save storage costs,
   * higher values make it easier to roll back to previous versions.
   *
   * @default 10
   */
  previousVersionsToKeep?: number;
  /**
   * #### Disable faster uploads via S3 Transfer Acceleration.
   *
   * ---
   *
   * Transfer Acceleration routes uploads through the nearest AWS edge location
   * for faster deploys, especially from distant regions. Adds a small cost per GB.
   * Automatically disabled in regions where it's not available.
   *
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}

interface StackConfig {
  /**
   * #### Custom values to display and save after each deployment.
   *
   * ---
   *
   * Use outputs to surface dynamic values like API URLs, database endpoints, or resource ARNs
   * that are only known after deployment. Outputs are:
   * - Printed in the terminal after deploy
   * - Saved to the stack info JSON file
   * - Optionally exported for cross-stack references (via `export: true`)
   */
  outputs?: StackOutput[];
  /**
   * #### Tags applied to every AWS resource in this stack.
   *
   * ---
   *
   * Useful for cost tracking, access control, and organization. Stacktape automatically
   * adds `projectName`, `stage`, and `stackName` tags — your custom tags are merged on top.
   *
   * Max 45 tags.
   */
  tags?: CloudformationTag[];
  /**
   * #### Stop saving stack info to a local file after each deployment.
   *
   * ---
   *
   * By default, Stacktape saves resource details and custom outputs to
   * `.stacktape-stack-info/{stackName}.json` after every deploy.
   *
   * @default false
   */
  disableStackInfoSaving?: boolean;
  /**
   * #### Directory for the stack info JSON file.
   *
   * ---
   *
   * Relative to the project root.
   *
   * @default ".stacktape-stack-info/"
   */
  stackInfoDirectory?: string;
  /**
   * #### VPC configuration: reuse an existing VPC or configure NAT Gateways.
   */
  vpc?: VpcSettings;
}

interface VpcReuseConfig {
  /**
   * #### Project name of the stack whose VPC you want to share.
   *
   * ---
   *
   * Must be used together with `stage`. Cannot be combined with `vpcId`.
   */
  projectName?: string;
  /**
   * #### Stage of the stack whose VPC you want to share.
   *
   * ---
   *
   * Must be used together with `projectName`. Cannot be combined with `vpcId`.
   */
  stage?: string;
  /**
   * #### Direct VPC ID to reuse (e.g., `vpc-1234567890abcdef0`).
   *
   * ---
   *
   * Use this to connect to a VPC not managed by Stacktape. Cannot be combined
   * with `projectName`/`stage`.
   *
   * The VPC must use a private CIDR range (10.x, 172.16-31.x, or 192.168.x)
   * and have at least 3 public subnets (subnets with a route to an Internet Gateway).
   */
  vpcId?: string;
}

interface NatSettings {
  /**
   * #### How many availability zones get a NAT Gateway (~$32/month each).
   *
   * ---
   *
   * - **1**: Cheapest, but no redundancy if that AZ goes down.
   * - **2**: Balanced cost and availability.
   * - **3**: Highest availability.
   *
   * Each NAT Gateway gets a static Elastic IP that persists across deployments —
   * useful for IP whitelisting with external services.
   *
   * @default 2
   */
  availabilityZones?: 1 | 2 | 3;
}

interface VpcSettings {
  /**
   * #### Share a VPC with another Stacktape stack or use an existing VPC.
   *
   * ---
   *
   * Useful when this stack needs to access VPC-protected resources (databases, Redis)
   * from another stack. By default, each stack gets its own VPC.
   *
   * > **Important:** Set this when first creating the stack. Adding it to an already
   * > deployed stack can cause resources to be replaced and **data to be lost**.
   */
  reuseVpc?: VpcReuseConfig;

  /**
   * #### NAT Gateway configuration for private subnets.
   *
   * ---
   *
   * Only applies when you have workloads using `usePrivateSubnetsWithNAT: true`.
   * Controls how many availability zones get a NAT Gateway (affects cost and redundancy).
   */
  nat?: NatSettings;
}

interface BudgetControl {
  /**
   * #### Monthly spending limit in USD.
   *
   * ---
   *
   * Notification thresholds are calculated as a percentage of this amount.
   * Resets at the start of each calendar month.
   */
  limit: number;
  /**
   * #### Email alerts when spending approaches the limit.
   *
   * ---
   *
   * Each notification fires at a percentage threshold of the `limit`, based on
   * actual or forecasted spend. Max 5 notifications.
   */
  notifications?: BudgetNotification[];
}

interface BudgetNotification {
  /**
   * #### Whether to alert on actual or forecasted spend.
   *
   * ---
   *
   * - `ACTUAL` — fires when you've already spent past the threshold.
   * - `FORECASTED` — fires when AWS predicts you'll exceed the threshold by month-end.
   *
   * Forecasts need ~5 weeks of usage data before they work.
   *
   * @default "ACTUAL"
   */
  budgetType?: 'ACTUAL' | 'FORECASTED';
  /**
   * #### Percentage of the budget limit that triggers this alert.
   *
   * ---
   *
   * Example: limit = $200, threshold = 80 → alert fires at $160.
   *
   * @default 100
   */
  thresholdPercentage?: number;
  /**
   * #### Email addresses that receive the alert. Max 10.
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
   * #### Name of the output (used as the key in terminal and stack info file).
   */
  name: string;
  /**
   * #### Value to output. Typically a directive like `$ResourceParam('myApi', 'url')`.
   */
  value: string;
  /**
   * #### Human-readable description shown alongside the output.
   */
  description?: string;
  /**
   * #### Make this output available to other CloudFormation stacks.
   *
   * ---
   *
   * Exported outputs can be referenced from other stacks using `$CfStackOutput()`.
   *
   * @default false
   */
  export?: boolean;
}

// this is stacktape specification.
// We allow for only specifying Resource property and other values we will set with defaults.
interface StpIamRoleStatement {
  /**
   * #### Optional identifier for this statement (for readability).
   */
  Sid?: string;
  /**
   * #### Whether to allow or deny the specified actions.
   *
   * @default "Allow"
   */
  Effect?: string;
  /**
   * #### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).
   */
  Action?: string[];
  /**
   * #### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).
   */
  Condition?: any;
  /**
   * #### ARNs of the AWS resources this statement applies to. Use `"*"` for all resources.
   */
  Resource: string[];
}

interface EnvironmentVar {
  /**
   * #### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`).
   */
  name: string;
  /**
   * #### Environment variable value. Numbers and booleans are converted to strings.
   */
  value: string | boolean | number;
}

interface CloudformationTag {
  /**
   * #### Tag name (1-128 characters).
   */
  name: string;
  /**
   * #### Tag value (1-256 characters).
   */
  value: string;
}

interface CfStackPolicyStatement {
  /**
   * #### Whether to allow or deny the specified update actions.
   */
  Effect?: 'Allow' | 'Deny';
  /**
   * #### Update actions to allow or deny on the specified resources.
   */
  Action?: ('Update:Modify' | 'Update:Replace' | 'Update:Delete' | 'Update:*')[];
  /**
   * #### Conditions under which this policy statement applies.
   */
  Condition?: any;
  /**
   * #### Logical resource IDs this policy applies to. Use `"*"` for all resources.
   */
  Resource: string[];
  /**
   * #### Must be `"*"` (applies to all callers). Required by CloudFormation.
   */
  Principal: '*';
}

interface ResourceAccessProps {
  /**
   * #### Give this resource access to other resources in your stack.
   *
   * ---
   *
   * List the names of resources this workload needs to communicate with. Stacktape automatically:
   * - **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
   * - **Opens network access** (security group rules for databases, Redis)
   * - **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`
   *
   * Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
   * resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.
   *
   * ---
   *
   * #### What each resource type provides:
   *
   * **`Bucket`** — read/write/delete objects → `NAME`, `ARN`
   *
   * **`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`
   *
   * **`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.
   * Aurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.
   *
   * **`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`
   *
   * **`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`
   *
   * **`Function`** — invoke permission → `ARN`
   *
   * **`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
   *
   * **`EventBus`** — publish events → `ARN`
   *
   * **`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`
   *
   * **`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`
   *
   * **`SnsTopic`** — publish/subscribe → `ARN`, `NAME`
   *
   * **`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
   *
   * **`PrivateService`** → `ADDRESS`
   *
   * **`aws:ses`** — full SES email sending permissions
   */
  connectTo?: string[];
  /**
   * #### Raw IAM policy statements for permissions not covered by `connectTo`.
   *
   * ---
   *
   * Added as a separate policy alongside auto-generated permissions. Use this for
   * accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).
   */
  iamRoleStatements?: StpIamRoleStatement[];
}

interface SimpleServiceContainer extends ResourceAccessProps {
  /**
   * #### Configures the container image for the service.
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use for configuration like API keys, feature flags, or secrets.
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Logging configuration.
   *
   * ---
   *
   * Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
   * View logs with `stacktape logs` or in the Stacktape Console.
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### CPU, memory, and compute engine for the container.
   *
   * ---
   *
   * Two compute engines:
   * - **Fargate** (default): Serverless — just specify `cpu` and `memory`.
   * - **EC2**: Specify `instanceTypes` for more control and potentially lower cost.
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * #### Auto-scaling: add/remove container instances based on demand.
   *
   * ---
   *
   * Traffic is automatically distributed across all running containers.
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Health check that auto-replaces unhealthy containers.
   *
   * ---
   *
   * If a container fails the health check, it's terminated and replaced automatically.
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Seconds to wait for graceful shutdown before force-killing the container.
   *
   * ---
   *
   * The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.
   *
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### Allow SSH-like access to running containers for debugging.
   *
   * ---
   *
   * Enables `stacktape container:session` to open an interactive shell inside the container.
   * Adds a small SSM agent that uses minimal CPU/memory.
   *
   * @default false
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Persistent EFS volumes shared across containers and restarts.
   *
   * ---
   *
   * Data stored in EFS volumes persists even when containers are replaced.
   * Multiple containers can mount the same volume. All data is encrypted in transit.
   */
  volumeMounts?: ContainerEfsMount[];
  /**
   * #### Helper containers that run alongside the main container.
   *
   * ---
   *
   * - **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).
   * - **`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).
   *   Can reach the main container via `localhost`.
   */
  sideContainers?: ServiceHelperContainer[];
  /**
   * #### Deploy in private subnets with a static outbound IP via NAT Gateway.
   *
   * ---
   *
   * The container won't have a public IP. All outbound traffic routes through a NAT Gateway,
   * giving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).
   *
   * Configure the number of NAT Gateways in `stackConfig.vpc.nat`.
   *
   * **Adds cost:** NAT Gateway ~$32/month + data processing fees.
   *
   * @default false
   */
  usePrivateSubnetsWithNAT?: boolean;
}

interface ServiceHelperContainer extends ContainerWorkloadContainerBase {
  /**
   * #### When and how this sidecar container runs.
   *
   * ---
   *
   * - **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.
   * - **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails.
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
