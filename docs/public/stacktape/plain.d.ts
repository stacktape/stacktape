/* eslint-disable */
// Generated file - Do not edit manually
// Plain types (YAML-equivalent) - no class augmentation
// For class-based types, use: import { X } from 'stacktape'

export type StacktapeResourceDefinition =
  | ContainerWorkload
  | BatchJob
  | WebService
  | PrivateService
  | WorkerService
  | RelationalDatabase
  | ApplicationLoadBalancer
  | NetworkLoadBalancer
  | HttpApiGateway
  | Bucket
  | UserAuthPool
  | EventBus
  | Bastion
  | DynamoDbTable
  | StateMachine
  | MongoDbAtlasCluster
  | RedisCluster
  | CustomResourceInstance
  | CustomResourceDefinition
  | UpstashRedis
  | DeploymentScript
  | AwsCdkConstruct
  | SqsQueue
  | SnsTopic
  | HostingBucket
  | WebAppFirewall
  | NextjsWeb
  | OpenSearchDomain
  | EfsFilesystem
  | KinesisStream
  | LambdaFunction
  | EdgeLambdaFunction
  | AstroWeb
  | NuxtWeb
  | SvelteKitWeb
  | SolidStartWeb
  | TanStackWeb
  | RemixWeb;
export type HttpMethod = "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
export type ApplicationLoadBalancerAlarmTrigger =
  | ApplicationLoadBalancerCustomTrigger
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger;
export type AlarmUserIntegration =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;
export type HttpApiGatewayAlarmTrigger = HttpApiGatewayErrorRateTrigger | HttpApiGatewayLatencyTrigger;
/**
 * #### How traffic reaches this service from other resources.
 *
 * ---
 *
 * - **`service-connect`** (default, ~$0.50/mo): Direct container-to-container. Cheapest option.
 *   Only reachable from other container-based resources in the stack.
 * - **`application-load-balancer`** (~$18/mo): HTTP load balancer. Reachable from any VPC resource.
 */
export type PrivateServiceLoadBalancing = {
  type: "application-load-balancer" | "service-connect";
} & string;
export type RelationalDatabaseAlarmTrigger =
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger;
export type AllowedOauthFlow = "client_credentials" | "code" | "implicit";
/**
 * #### System messages (`/var/log/messages`) — startup info, kernel messages, service logs.
 */
export type BastionLogging = {
  /**
   * #### Disable this log type. Stops sending to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
} & string;
/**
 * #### Auth logs (`/var/log/secure`) — SSH login attempts, authentication events.
 */
export type BastionLogging1 = {
  /**
   * #### Disable this log type. Stops sending to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
} & string;
/**
 * #### Audit logs (`/var/log/audit/audit.log`) — detailed security events from the Linux audit system.
 */
export type BastionLogging2 = {
  /**
   * #### Disable this log type. Stops sending to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
} & string;
export type State = Choice | Fail | StateMachineMap | Parallel | Pass | Succeed | Task | Wait;
export type SqsQueueAlarmTrigger = SqsQueueReceivedMessagesCountTrigger | SqsQueueNotEmptyTrigger;
export type LambdaAlarmTrigger = LambdaErrorRateTrigger | LambdaDurationTrigger;
export type ValueNumber = IntrinsicFunction | number;
export type ValueString = IntrinsicFunction | string;
export type DeletionPolicy = "Delete" | "Retain" | "Snapshot";
export type ValueBoolean = IntrinsicFunction | boolean;
export type ListString = string[] | IntrinsicFunction;

export interface StacktapeConfig {
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
   */
  serviceName?: string;
  /**
   * #### Credentials and settings for 3rd-party services (MongoDB Atlas, Upstash).
   *
   * ---
   *
   * Required only if you use `mongo-db-atlas-cluster` or `upstash-redis` resources in your stack.
   */
  providerConfig?: {
    mongoDbAtlas?: MongoDbAtlasProvider;
    upstash?: UpstashProvider;
  };
  /**
   * #### Reusable values you can reference anywhere in the config with `$Var().variableName`.
   *
   * ---
   *
   * Useful for avoiding repetition. For example, define a shared environment name
   * and reference it in multiple resources.
   *
   * ```yaml
   * variables:
   *   appPort: 3000
   * # Then use: $Var().appPort
   * ```
   */
  variables?: any;
  hooks?: Hooks;
  /**
   * #### Custom shell commands or code you can run manually or as lifecycle hooks.
   *
   * ---
   *
   * Use `connectTo` in a script to auto-inject database URLs, API keys, etc. as environment variables.
   * Run scripts with `stacktape script:run --scriptName myScript` or attach them to `hooks`.
   *
   * **Script types:**
   * - **`local-script`**: Runs on your machine (or CI). Good for migrations, builds, seed scripts.
   * - **`local-script-with-bastion-tunneling`**: Runs locally but tunnels connections to VPC-only
   *   resources (e.g., private databases) through a bastion host.
   * - **`bastion-script`**: Runs remotely on the bastion host inside your VPC.
   *
   * Scripts can be shell commands or JS/TS/Python files.
   */
  scripts?: {
    [k: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling;
  };
  /**
   * #### Register custom functions that dynamically compute config values at deploy time.
   *
   * ---
   *
   * Define a directive by pointing to a JS/TS/Python file, then use it anywhere in the config
   * like a built-in directive (`$MyDirective()`). Useful for fetching external data,
   * computing dynamic values, or conditional logic.
   */
  directives?: DirectiveDefinition[];
  deploymentConfig?: DeploymentConfig;
  stackConfig?: StackConfig;
  /**
   * #### Your app's infrastructure: APIs, databases, containers, functions, buckets, and more.
   *
   * ---
   *
   * Each entry is a named resource (e.g., `myApi`, `myDatabase`). Stacktape creates and manages
   * the underlying AWS resources for you. Use `stacktape stack-info --detailed` to inspect them.
   */
  resources: {
    [k: string]: StacktapeResourceDefinition;
  };
  /**
   * #### Escape hatch: add raw AWS CloudFormation resources alongside Stacktape-managed ones.
   *
   * ---
   *
   * For advanced use cases where Stacktape doesn't have a built-in resource type.
   * These are merged into the CloudFormation template as-is. Use `stacktape stack-info --detailed`
   * to check existing logical names and avoid conflicts.
   *
   * Does not count towards your resource limit.
   */
  cloudformationResources?: {
    [k: string]: Default;
  };
}
export interface MongoDbAtlasProvider {
  /**
   * #### Your MongoDB Atlas public API key.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   */
  publicKey?: string;
  /**
   * #### Your MongoDB Atlas private API key. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   */
  privateKey?: string;
  /**
   * #### Your MongoDB Atlas Organization ID.
   *
   * ---
   *
   * Found in the MongoDB Atlas console under Organization Settings.
   */
  organizationId?: string;
  accessibility?: MongoDbAtlasAccessibility;
}
/**
 * #### Network connectivity settings for all MongoDB Atlas clusters in this stack.
 *
 * ---
 *
 * Stacktape auto-creates a MongoDB Atlas Project for your clusters. These accessibility settings
 * apply at the project level — all clusters in the stack share the same network config.
 */
export interface MongoDbAtlasAccessibility {
  /**
   * #### Network access mode.
   *
   * ---
   *
   * - **`internet`**: Accessible from anywhere (credentials still required).
   * - **`vpc`**: Only from resources in your VPC + any `whitelistedIps`.
   * - **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.
   * - **`whitelisted-ips-only`**: Only from IP addresses listed in `whitelistedIps`.
   */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only";
  /**
   * #### IP addresses or CIDR ranges allowed to access the cluster (e.g., your office IP).
   *
   * ---
   *
   * No effect in `internet` mode. In `vpc`/`scoping-workloads-in-vpc`, adds access for IPs outside the VPC.
   * In `whitelisted-ips-only`, these are the only IPs that can connect.
   */
  whitelistedIps?: string[];
}
export interface UpstashProvider {
  /**
   * #### Email address of your Upstash account.
   */
  accountEmail: string;
  /**
   * #### API key for your Upstash account. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create an API key in the Upstash console under Account > API Keys.
   */
  apiKey: string;
}
/**
 * #### Run scripts automatically before/after deploy, delete, or dev commands.
 *
 * ---
 *
 * Each hook references a script defined in the `scripts` section.
 * Common uses: run database migrations after deploy, build frontend before deploy,
 * clean up resources after delete.
 */
export interface Hooks {
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
export interface NamedScriptLifecycleHook {
  /**
   * #### Script Name
   *
   * ---
   *
   * The name of the script to execute. The script must be defined in the `scripts` section of your configuration.
   */
  scriptName: string;
  /**
   * #### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).
   *
   * ---
   *
   * Useful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).
   */
  skipOnCI?: boolean;
  /**
   * #### Skip this hook when running locally; only run in CI/CD.
   *
   * ---
   *
   * Useful for CI-only tasks (e.g., uploading test reports, notifying Slack).
   */
  skipOnLocal?: boolean;
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
export interface LocalScript {
  type: "local-script";
  properties: LocalScriptProps;
}
export interface LocalScriptProps {
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
   */
  cwd?: string;
  /**
   * #### Pipe Stdio
   *
   * ---
   *
   * If `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.
   */
  pipeStdio?: boolean;
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
export interface EnvironmentVar {
  /**
   * #### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`).
   */
  name: string;
  /**
   * #### Environment variable value. Numbers and booleans are converted to strings.
   */
  value: string | number | boolean;
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
export interface BastionScript {
  type: "bastion-script";
  properties: BastionScriptProps;
}
export interface BastionScriptProps {
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
   */
  cwd?: string;
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
export interface LocalScriptWithBastionTunneling {
  type: "local-script-with-bastion-tunneling";
  properties: LocalScriptWithBastionTunnelingProps;
}
export interface LocalScriptWithBastionTunnelingProps {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource to use for tunneling to protected resources.
   */
  bastionResource?: string;
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
   */
  cwd?: string;
  /**
   * #### Pipe Stdio
   *
   * ---
   *
   * If `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.
   */
  pipeStdio?: boolean;
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
export interface DirectiveDefinition {
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
/**
 * #### Advanced deployment settings: rollback behavior, termination protection, artifact retention.
 *
 * ---
 *
 * Most projects don't need to change these. Useful for production stacks where you want
 * extra safety (termination protection, rollback alarms) or cost control (artifact cleanup).
 */
export interface DeploymentConfig {
  /**
   * #### Prevents accidental stack deletion. Must be disabled before you can delete.
   *
   * ---
   *
   * Recommended for production stacks. To delete a protected stack, first deploy with
   * `terminationProtection: false`, then run the delete command.
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
  cloudformationRoleArn?: string;
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
   */
  disableAutoRollback?: boolean;
  /**
   * #### SNS topic ARNs to receive CloudFormation stack events during deployment.
   *
   * ---
   *
   * Useful for monitoring deployments in external systems (Slack, PagerDuty, etc.).
   */
  publishEventsToArn?: string[];
  /**
   * #### How many old deployment artifacts (Lambda bundles, container images) to keep.
   *
   * ---
   *
   * Older versions are cleaned up automatically. Lower values save storage costs,
   * higher values make it easier to roll back to previous versions.
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
   */
  disableS3TransferAcceleration?: boolean;
}
/**
 * #### Stack-wide settings: custom outputs, tags, VPC configuration, and stack info saving.
 */
export interface StackConfig {
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
   */
  disableStackInfoSaving?: boolean;
  /**
   * #### Directory for the stack info JSON file.
   *
   * ---
   *
   * Relative to the project root.
   */
  stackInfoDirectory?: string;
  vpc?: VpcSettings;
  /**
   * #### Disable automatic issue detection for all functions in this stack.
   *
   * ---
   *
   * By default, Stacktape automatically detects runtime errors (uncaught exceptions,
   * unhandled promise rejections, console.error) in your Node.js/TypeScript Lambda functions
   * and reports them to the Stacktape Console as Issues.
   *
   * Set to `true` to disable this feature for the entire stack.
   */
  disableIssues?: boolean;
}
export interface StackOutput {
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
   */
  export?: boolean;
}
export interface CloudformationTag {
  /**
   * #### Tag name (1-128 characters).
   */
  name: string;
  /**
   * #### Tag value (1-256 characters).
   */
  value: string;
}
/**
 * #### VPC configuration: reuse an existing VPC or configure NAT Gateways.
 */
export interface VpcSettings {
  reuseVpc?: VpcReuseConfig;
  nat?: NatSettings;
}
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
export interface VpcReuseConfig {
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
/**
 * #### NAT Gateway configuration for private subnets.
 *
 * ---
 *
 * Only applies when you have workloads using `usePrivateSubnetsWithNAT: true`.
 * Controls how many availability zones get a NAT Gateway (affects cost and redundancy).
 */
export interface NatSettings {
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
   */
  availabilityZones?: 1 | 2 | 3;
}
/**
 * #### Run multiple containers together as a single unit with shared compute resources.
 *
 * ---
 *
 * For advanced setups: sidecars, init containers, or services that need multiple processes.
 * Supports Fargate (serverless) or EC2 (custom instances). Auto-scales horizontally.
 */
export interface ContainerWorkload {
  type: "multi-container-workload";
  properties: ContainerWorkloadProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface ContainerWorkloadProps {
  /**
   * #### Containers in this workload. They share compute resources and scale together.
   */
  containers: ContainerWorkloadContainer[];
  resources: ContainerWorkloadResourcesConfig;
  scaling?: ContainerWorkloadScaling;
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Enable `stacktape container:session` for interactive shell access to running containers.
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP.
   *
   * ---
   *
   * Useful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees.
   */
  usePrivateSubnetsWithNAT?: boolean;
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
export interface ContainerWorkloadContainer {
  /**
   * #### How this container receives traffic (API Gateway, load balancer, or service-connect).
   */
  events?: (
    | ContainerWorkloadLoadBalancerIntegration
    | ContainerWorkloadHttpApiIntegration
    | ContainerWorkloadInternalIntegration
    | ContainerWorkloadServiceConnectIntegration
    | ContainerWorkloadNetworkLoadBalancerIntegration
  )[];
  loadBalancerHealthCheck?: LoadBalancerHealthCheck;
  /**
   * #### Unique container name within this workload.
   */
  name: string;
  /**
   * #### How to build or specify the container image.
   */
  packaging:
    | StpBuildpackCwImagePackaging
    | ExternalBuildpackCwImagePackaging
    | PrebuiltCwImagePackaging
    | CustomDockerfileCwImagePackaging
    | NixpacksCwImagePackaging;
  /**
   * #### If `true` (default), the entire workload restarts when this container fails.
   */
  essential?: boolean;
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### Start this container only after the listed containers reach a specific state.
   *
   * ---
   *
   * E.g., wait for a database sidecar to be `HEALTHY` before starting the app container.
   */
  dependsOn?: ContainerDependency[];
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Seconds to wait after SIGTERM before SIGKILL (2-120).
   */
  stopTimeout?: number;
  /**
   * #### Mount EFS volumes for persistent, shared storage across containers.
   */
  volumeMounts?: ContainerEfsMount[];
}
/**
 * #### Triggers a container when a request matches the specified conditions on an Application Load Balancer.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
export interface ContainerWorkloadLoadBalancerIntegration {
  type: "application-load-balancer";
  properties: ContainerWorkloadLoadBalancerIntegrationProps;
}
export interface ContainerWorkloadLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
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
export interface LbHeaderCondition {
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
export interface LbQueryParamCondition {
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
/**
 * #### Triggers a container when an HTTP API Gateway receives a matching request.
 *
 * ---
 *
 * You can route requests based on HTTP method and path.
 */
export interface ContainerWorkloadHttpApiIntegration {
  type: "http-api-gateway";
  properties: ContainerWorkloadHttpApiIntegrationProps;
}
export interface ContainerWorkloadHttpApiIntegrationProps {
  /**
   * #### The container port that will receive traffic from the API Gateway.
   */
  containerPort: number;
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
  method: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
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
  authorizer?: CognitoAuthorizer | LambdaAuthorizer;
  /**
   * #### The payload format version for the Lambda integration.
   *
   * ---
   *
   * For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
   */
  payloadFormat?: "1.0" | "2.0";
}
export interface CognitoAuthorizer {
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
  type: "cognito";
  properties: CognitoAuthorizerProperties;
}
export interface CognitoAuthorizerProperties {
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
export interface LambdaAuthorizer {
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
  type: "lambda";
  properties: LambdaAuthorizerProperties;
}
export interface LambdaAuthorizerProperties {
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
/**
 * #### Opens a container port for connections from other containers within the same workload.
 */
export interface ContainerWorkloadInternalIntegration {
  type: "workload-internal";
  properties: ContainerWorkloadInternalIntegrationProps;
}
export interface ContainerWorkloadInternalIntegrationProps {
  /**
   * #### The container port to open for internal traffic.
   */
  containerPort: number;
}
/**
 * #### Opens a container port for connections from other compute resources in the same stack.
 */
export interface ContainerWorkloadServiceConnectIntegration {
  type: "service-connect";
  properties: ContainerWorkloadServiceConnectIntegrationProps;
}
export interface ContainerWorkloadServiceConnectIntegrationProps {
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
  protocol?: "grpc" | "http" | "http2";
}
/**
 * #### Triggers a container when a request is made to a Network Load Balancer.
 *
 * ---
 *
 * A Network Load Balancer operates at the transport layer (Layer 4) and can handle TCP and TLS traffic.
 */
export interface ContainerWorkloadNetworkLoadBalancerIntegration {
  type: "network-load-balancer";
  properties: ContainerWorkloadNetworkLoadBalancerIntegrationProps;
}
export interface ContainerWorkloadNetworkLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
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
/**
 * #### Load balancer health check settings. Only applies when integrated with an ALB or NLB.
 */
export interface LoadBalancerHealthCheck {
  /**
   * #### Path the load balancer pings to check container health.
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol. ALB defaults to `HTTP`, NLB defaults to `TCP`.
   */
  healthCheckProtocol?: "HTTP" | "TCP";
  /**
   * #### Health check port. Defaults to the traffic port.
   */
  healthCheckPort?: number;
}
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
export interface StpBuildpackCwImagePackaging {
  type: "stacktape-image-buildpack";
  properties: StpBuildpackCwImagePackagingProps;
}
/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
export interface StpBuildpackCwImagePackagingProps {
  /**
   * #### Language-specific packaging configuration.
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
  /**
   * #### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.
   *
   * ---
   *
   * Results in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.
   */
  requiresGlibcBinaries?: boolean;
  /**
   * #### A list of commands to be executed during the `docker build` process.
   *
   * ---
   *
   * These commands are executed using the `RUN` directive in the Dockerfile.
   * This is useful for installing additional system dependencies in your container.
   */
  customDockerBuildCommands?: string[];
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
   * For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).
   */
  entryfilePath: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
   */
  excludeFiles?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
   */
  excludeDependencies?: string[];
}
export interface EsLanguageSpecificConfig {
  /**
   * #### The path to the `tsconfig.json` file.
   *
   * ---
   *
   * This is primarily used to resolve path aliases during the build process.
   */
  tsConfigPath?: string;
  /**
   * #### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.
   */
  emitTsDecoratorMetadata?: boolean;
  /**
   * #### A list of dependencies to exclude from the main bundle.
   *
   * ---
   *
   * These dependencies will be treated as "external" and will not be bundled directly into your application's code.
   * Instead, they will be installed separately in the deployment package.
   * Use `*` to exclude all dependencies from the bundle.
   */
  dependenciesToExcludeFromBundle?: string[];
  /**
   * #### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).
   *
   * ---
   *
   * **Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces.
   */
  outputModuleFormat?: "cjs" | "esm";
  /**
   * #### The major version of Node.js to use.
   */
  nodeVersion?: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
  /**
   * #### Skip generating source maps. Reduces package size but makes production errors harder to debug.
   */
  disableSourceMaps?: boolean;
  /**
   * #### Save source maps to a local directory instead of uploading them to AWS.
   *
   * ---
   *
   * Useful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.
   */
  outputSourceMapsTo?: string;
  /**
   * #### A list of dependencies to exclude from the deployment package.
   *
   * ---
   *
   * This only applies to dependencies that are not statically bundled.
   * To exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.
   * Use `*` to exclude all non-bundled dependencies.
   */
  dependenciesToExcludeFromDeploymentPackage?: string[];
}
export interface PyLanguageSpecificConfig {
  /**
   * #### The path to your project's dependency file.
   *
   * ---
   *
   * This can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.
   */
  packageManagerFile?: string;
  /**
   * #### The Python package manager to use.
   *
   * ---
   *
   * Stacktape uses `uv` for dependency resolution and installation. This option is kept
   * for compatibility and must be set to `uv` if provided.
   */
  packageManager?: "uv";
  /**
   * #### The version of Python to use.
   */
  pythonVersion?: 2.7 | 3.11 | 3.12 | 3.13 | 3.14 | 3.6 | 3.7 | 3.8 | 3.9;
  /**
   * #### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).
   *
   * ---
   *
   * Only for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.
   * Set `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).
   */
  runAppAs?: "ASGI" | "WSGI";
  /**
   * #### Minify Python code to reduce package size. Makes production stack traces harder to read.
   */
  minify?: boolean;
}
export interface JavaLanguageSpecificConfig {
  /**
   * #### Specifies whether to use Maven instead of Gradle.
   *
   * ---
   *
   * By default, Stacktape uses Gradle to build Java projects.
   */
  useMaven?: boolean;
  /**
   * #### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).
   */
  packageManagerFile?: string;
  /**
   * #### The version of Java to use.
   */
  javaVersion?: 11 | 17 | 19 | 8;
}
export interface PhpLanguageSpecificConfig {
  /**
   * #### The version of PHP to use.
   */
  phpVersion?: 8.2 | 8.3;
}
export interface DotnetLanguageSpecificConfig {
  /**
   * #### The path to your .NET project file (.csproj).
   */
  projectFile?: string;
  /**
   * #### The version of .NET to use.
   */
  dotnetVersion?: 6 | 8;
}
export interface GoLanguageSpecificConfig {}
export interface RubyLanguageSpecificConfig {
  /**
   * #### The version of Ruby to use.
   */
  rubyVersion?: 3.2 | 3.3;
}
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
export interface ExternalBuildpackCwImagePackaging {
  type: "external-buildpack";
  properties: ExternalBuildpackCwImagePackagingProps;
}
export interface ExternalBuildpackCwImagePackagingProps {
  /**
   * #### The Buildpack Builder to use.
   *
   * ---
   */
  builder?: string;
  /**
   * #### The specific Buildpack to use.
   *
   * ---
   *
   * By default, the buildpack is detected automatically.
   */
  buildpacks?: string[];
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
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
export interface PrebuiltCwImagePackaging {
  type: "prebuilt-image";
  properties: PrebuiltImageCwPackagingProps;
}
/**
 * #### Configures a pre-built container image.
 */
export interface PrebuiltImageCwPackagingProps {
  /**
   * #### The ARN of a secret containing credentials for a private container registry.
   *
   * ---
   *
   * The secret must be a JSON object with `username` and `password` keys.
   * You can create secrets using the `stacktape secret:create` command.
   */
  repositoryCredentialsSecretArn?: string;
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
   */
  entryPoint?: string[];
  /**
   * #### The name or URL of the container image.
   */
  image: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
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
export interface CustomDockerfileCwImagePackaging {
  type: "custom-dockerfile";
  properties: CustomDockerfileCwImagePackagingProps;
}
/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
export interface CustomDockerfileCwImagePackagingProps {
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
   */
  entryPoint?: string[];
  /**
   * #### The path to the Dockerfile, relative to `buildContextPath`.
   */
  dockerfilePath?: string;
  /**
   * #### The path to the build context directory, relative to your Stacktape configuration file.
   */
  buildContextPath: string;
  /**
   * #### A list of arguments to pass to the `docker build` command.
   */
  buildArgs?: DockerBuildArg[];
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
export interface DockerBuildArg {
  /**
   * #### Argument name
   */
  argName: string;
  /**
   * #### Argument value
   */
  value: string;
}
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
export interface NixpacksCwImagePackaging {
  type: "nixpacks";
  properties: NixpacksCwImagePackagingProps;
}
export interface NixpacksCwImagePackagingProps {
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### The base image to use for building the application.
   *
   * ---
   *
   * For more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).
   */
  buildImage?: string;
  /**
   * #### A list of providers to use for determining the build and runtime environments.
   */
  providers?: string[];
  /**
   * #### The command to execute when starting the application.
   *
   * ---
   *
   * This overrides the default start command inferred by Nixpacks.
   */
  startCmd?: string;
  /**
   * #### The base image to use for running the application.
   */
  startRunImage?: string;
  /**
   * #### A list of file paths to include in the runtime environment; all other files will be excluded.
   */
  startOnlyIncludeFiles?: string[];
  /**
   * #### The build phases for the application.
   */
  phases?: NixpacksPhase[];
}
export interface NixpacksPhase {
  /**
   * #### The name of the build phase.
   */
  name: string;
  /**
   * #### A list of shell commands to execute in this phase.
   */
  cmds?: string[];
  /**
   * #### A list of Nix packages to install in this phase.
   */
  nixPkgs?: string[];
  /**
   * #### A list of Nix libraries to include in this phase.
   */
  nixLibs?: string[];
  /**
   * #### A list of Nix overlay files to apply in this phase.
   */
  nixOverlay?: string[];
  /**
   * #### The Nixpkgs archive to use.
   */
  nixpkgsArchive?: string;
  /**
   * #### A list of APT packages to install in this phase.
   */
  aptPkgs?: string[];
  /**
   * #### A list of directories to cache between builds to speed up subsequent builds.
   */
  cacheDirectories?: string[];
  /**
   * #### A list of file paths to include in this phase; all other files will be excluded.
   */
  onlyIncludeFiles?: string[];
}
/**
 * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
 */
export interface ContainerWorkloadContainerLogging {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
export interface HttpEndpointLogForwarding {
  type: "http-endpoint";
  properties: HttpEndpointLogForwardingProps;
}
export interface HttpEndpointLogForwardingProps {
  /**
   * #### HTTPS endpoint URL where logs are sent.
   */
  endpointUrl: string;
  /**
   * #### Compress request body with GZIP to reduce transfer costs.
   */
  gzipEncodingEnabled?: boolean;
  /**
   * #### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.
   */
  parameters?: {
    [k: string]: string;
  };
  /**
   * #### Total retry time (seconds) before sending failed logs to a backup S3 bucket.
   */
  retryDuration?: number;
  /**
   * #### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.
   */
  accessKey?: string;
}
export interface HighlightLogForwarding {
  type: "highlight";
  properties: HighlightLogForwardingProps;
}
export interface HighlightLogForwardingProps {
  /**
   * #### Your Highlight.io project ID (from the Highlight console).
   */
  projectId: string;
  /**
   * #### Highlight.io endpoint. Override for self-hosted or regional endpoints.
   */
  endpointUrl?: string;
}
export interface DatadogLogForwarding {
  type: "datadog";
  properties: DatadogLogForwardingProps;
}
export interface DatadogLogForwardingProps {
  /**
   * #### Your Datadog API key. Store as `$Secret()` for security.
   */
  apiKey: string;
  /**
   * #### Datadog endpoint. Use the EU URL if your account is in the EU region.
   */
  endpointUrl?: string;
}
export interface ContainerDependency {
  /**
   * The name of the container that this container depends on.
   */
  containerName: string;
  /**
   * #### The condition that the dependency container must meet.
   * ---
   * Available conditions:
   * - `START`: The dependency has started.
   * - `COMPLETE`: The dependency has finished executing (regardless of success).
   * - `SUCCESS`: The dependency has finished with an exit code of `0`.
   * - `HEALTHY`: The dependency has passed its first health check.
   */
  condition: "COMPLETE" | "HEALTHY" | "START" | "SUCCESS";
}
/**
 * #### Command-based health check. If it fails on an essential container, the workload instance is replaced.
 */
export interface ContainerHealthCheck {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   */
  startPeriodSeconds?: number;
}
export interface ContainerEfsMount {
  /**
   * #### The type of the volume mount.
   */
  type: "efs";
  /**
   * #### Properties for the EFS volume mount.
   */
  properties: {
    /**
     * #### Name of the `efs-filesystem` resource defined in your config.
     */
    efsFilesystemName: string;
    /**
     * #### Subdirectory within the EFS filesystem to mount. Restricts access to that directory.
     */
    rootDirectory?: string;
    /**
     * #### Absolute path inside the container where the volume is mounted (e.g., `/data`).
     */
    mountPath: string;
  };
}
/**
 * #### CPU, memory, and compute engine (Fargate or EC2).
 *
 * ---
 *
 * - **Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.
 * - **EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access.
 */
export interface ContainerWorkloadResourcesConfig {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
   */
  cpu?: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8;
  /**
   * #### Memory in MB. Must be compatible with the vCPU count on Fargate.
   *
   * ---
   *
   * Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
   * 4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
   * For EC2: auto-detected from instance type if omitted.
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   */
  architecture?: "arm64" | "x86_64";
}
/**
 * #### Auto-scaling: how many instances and when to add/remove them.
 */
export interface ContainerWorkloadScaling {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   */
  maxInstances?: number;
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}
/**
 * #### When to scale: CPU and/or memory utilization targets.
 */
export interface ContainerWorkloadScalingPolicy {
  /**
   * #### Scale out when avg CPU exceeds this %, scale in when it drops below.
   */
  keepAvgCpuUtilizationUnder?: number;
  /**
   * #### Scale out when avg memory exceeds this %, scale in when it drops below.
   */
  keepAvgMemoryUtilizationUnder?: number;
}
/**
 * #### Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration.
 */
export interface ContainerWorkloadDeploymentConfig {
  /**
   * #### How traffic shifts to the new version during deployment.
   *
   * ---
   *
   * - `Canary10Percent5Minutes`: 10% first, then all after 5 min.
   * - `Canary10Percent15Minutes`: 10% first, then all after 15 min.
   * - `Linear10PercentEvery1Minutes`: 10% more every minute.
   * - `Linear10PercentEvery3Minutes`: 10% more every 3 minutes.
   * - `AllAtOnce`: Instant switch.
   */
  strategy:
    | "AllAtOnce"
    | "Canary10Percent15Minutes"
    | "Canary10Percent5Minutes"
    | "Linear10PercentEvery1Minutes"
    | "Linear10PercentEvery3Minutes";
  /**
   * #### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Lambda function to run after all traffic has shifted (for post-deployment checks).
   */
  afterTrafficShiftFunction?: string;
  /**
   * #### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.
   */
  testListenerPort?: number;
}
export interface StpIamRoleStatement {
  /**
   * #### Optional identifier for this statement (for readability).
   */
  Sid?: string;
  /**
   * #### Whether to allow or deny the specified actions.
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
/**
 * #### Run containerized tasks to completion — data processing, ML training, video encoding, etc.
 *
 * ---
 *
 * Pay only for the compute time used. Supports CPU and GPU workloads, retries on failure,
 * and can be triggered by schedules, HTTP requests, S3 uploads, or queue messages.
 */
export interface BatchJob {
  type: "batch-job";
  properties: BatchJobProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface BatchJobProps {
  container: BatchJobContainer;
  resources: BatchJobResources;
  /**
   * #### Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set.
   */
  timeout?: number;
  /**
   * #### Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted.
   *
   * ---
   *
   * **Use this when:** Your job can safely be restarted from the beginning (e.g., data imports,
   * image processing, ML training with checkpoints). Combine with `retryConfig` to auto-retry
   * on interruption.
   *
   * **Don't use when:** Your job has side effects that can't be repeated (e.g., sending emails,
   * charging payments) or must finish within a strict deadline.
   *
   * If interrupted, your container gets a `SIGTERM` and 120 seconds to shut down gracefully.
   */
  useSpotInstances?: boolean;
  logging?: BatchJobLogging;
  retryConfig?: BatchJobRetryConfiguration;
  /**
   * #### Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.).
   */
  events?: (
    | ApplicationLoadBalancerIntegration
    | SnsIntegration
    | SqsIntegration
    | KinesisIntegration
    | DynamoDbIntegration
    | S3Integration
    | ScheduleIntegration
    | CloudwatchLogIntegration
    | HttpApiIntegration
    | EventBusIntegration
  )[];
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
/**
 * #### Docker container image and environment for the job.
 */
export interface BatchJobContainer {
  /**
   * #### How to build or specify the container image for this job.
   */
  packaging:
    | StpBuildpackBjImagePackaging
    | ExternalBuildpackBjImagePackaging
    | PrebuiltBjImagePackaging
    | CustomDockerfileBjImagePackaging
    | NixpacksBjImagePackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use `$ResourceParam()` or `$Secret()` to inject database URLs, API keys, etc.
   */
  environment?: EnvironmentVar[];
}
export interface StpBuildpackBjImagePackaging {
  type: "stacktape-image-buildpack";
  properties: StpBuildpackBjImagePackagingProps;
}
/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
export interface StpBuildpackBjImagePackagingProps {
  /**
   * #### Language-specific packaging configuration.
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
  /**
   * #### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.
   *
   * ---
   *
   * Results in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.
   */
  requiresGlibcBinaries?: boolean;
  /**
   * #### A list of commands to be executed during the `docker build` process.
   *
   * ---
   *
   * These commands are executed using the `RUN` directive in the Dockerfile.
   * This is useful for installing additional system dependencies in your container.
   */
  customDockerBuildCommands?: string[];
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
   * For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).
   */
  entryfilePath: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
   */
  excludeFiles?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
   */
  excludeDependencies?: string[];
}
export interface ExternalBuildpackBjImagePackaging {
  type: "external-buildpack";
  properties: ExternalBuildpackBjImagePackagingProps;
}
export interface ExternalBuildpackBjImagePackagingProps {
  /**
   * #### The Buildpack Builder to use.
   *
   * ---
   */
  builder?: string;
  /**
   * #### The specific Buildpack to use.
   *
   * ---
   *
   * By default, the buildpack is detected automatically.
   */
  buildpacks?: string[];
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
export interface PrebuiltBjImagePackaging {
  type: "prebuilt-image";
  properties: PrebuiltImageBjPackagingProps;
}
/**
 * #### Configures a pre-built container image.
 */
export interface PrebuiltImageBjPackagingProps {
  /**
   * #### The name or URL of the container image.
   */
  image: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
export interface CustomDockerfileBjImagePackaging {
  type: "custom-dockerfile";
  properties: CustomDockerfileBjImagePackagingProps;
}
/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
export interface CustomDockerfileBjImagePackagingProps {
  /**
   * #### The path to the Dockerfile, relative to `buildContextPath`.
   */
  dockerfilePath?: string;
  /**
   * #### The path to the build context directory, relative to your Stacktape configuration file.
   */
  buildContextPath: string;
  /**
   * #### A list of arguments to pass to the `docker build` command.
   */
  buildArgs?: DockerBuildArg[];
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}
export interface NixpacksBjImagePackaging {
  type: "nixpacks";
  properties: NixpacksBjImagePackagingProps;
}
export interface NixpacksBjImagePackagingProps {
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### The base image to use for building the application.
   *
   * ---
   *
   * For more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).
   */
  buildImage?: string;
  /**
   * #### A list of providers to use for determining the build and runtime environments.
   */
  providers?: string[];
  /**
   * #### The command to execute when starting the application.
   *
   * ---
   *
   * This overrides the default start command inferred by Nixpacks.
   */
  startCmd?: string;
  /**
   * #### The base image to use for running the application.
   */
  startRunImage?: string;
  /**
   * #### A list of file paths to include in the runtime environment; all other files will be excluded.
   */
  startOnlyIncludeFiles?: string[];
  /**
   * #### The build phases for the application.
   */
  phases?: NixpacksPhase[];
}
/**
 * #### CPU, memory, and GPU requirements. AWS auto-provisions a matching instance.
 */
export interface BatchJobResources {
  /**
   * #### Number of vCPUs for the job (e.g., 1, 2, 4).
   */
  cpu: number;
  /**
   * #### Memory in MB. Use slightly less than powers of 2 for efficient instance sizing.
   *
   * ---
   *
   * AWS reserves some memory for system processes. Requesting exactly 8192 MB (8 GB) may provision
   * a larger instance than needed. Use 7680 MB instead to fit on a standard 8 GB instance.
   */
  memory: number;
  /**
   * #### Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.).
   *
   * ---
   *
   * Omit for CPU-only workloads.
   */
  gpu?: number;
}
/**
 * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
 */
export interface BatchJobLogging {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Auto-retry on failure, timeout, or Spot interruption.
 */
export interface BatchJobRetryConfiguration {
  /**
   * #### Max retry attempts before the job is marked as failed.
   */
  attempts?: number;
  /**
   * #### Seconds to wait between retries.
   */
  retryIntervalSeconds?: number;
  /**
   * #### Multiply wait time by this factor after each retry (exponential backoff).
   *
   * ---
   *
   * E.g., with `retryIntervalSeconds: 5` and `retryIntervalMultiplier: 2`, waits are 5s, 10s, 20s, etc.
   */
  retryIntervalMultiplier?: number;
}
/**
 * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
export interface ApplicationLoadBalancerIntegration {
  /**
   * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
   *
   * ---
   *
   * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
   */
  type: "application-load-balancer";
  properties: ApplicationLoadBalancerIntegrationProps;
}
export interface ApplicationLoadBalancerIntegrationProps {
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
/**
 * #### Triggers a function when a new message is published to an SNS topic.
 *
 * ---
 *
 * SNS is a pub/sub messaging service. Reference a topic from your stack's `snsTopics` or use an external ARN.
 */
export interface SnsIntegration {
  type: "sns";
  properties: SnsIntegrationProps;
}
export interface SnsIntegrationProps {
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
   * #### Filter messages by attributes so only relevant ones trigger the function.
   *
   * ---
   *
   * Uses SNS subscription filter policy syntax. For content-based filtering, use EventBridge instead.
   */
  filterPolicy?: any;
  onDeliveryFailure?: SnsOnDeliveryFailure;
}
/**
 * #### A destination for messages that fail to be delivered to the target.
 *
 * ---
 *
 * In rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.
 * This property specifies an SQS queue where failed messages will be sent.
 */
export interface SnsOnDeliveryFailure {
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
 * Messages are processed in batches. The function fires when `batchSize` is reached,
 * `maxBatchWindowSeconds` expires, or the 6 MB payload limit is hit.
 *
 * **Important:** A single SQS queue should only have one consumer function. For fan-out (multiple
 * consumers for the same message), use an SNS topic or EventBridge event bus instead.
 */
export interface SqsIntegration {
  type: "sqs";
  properties: SqsIntegrationProps;
}
export interface SqsIntegrationProps {
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
 * Records are processed in batches. Two consumption modes:
 * - **Direct**: Polls each shard ~1/sec, throughput shared with other consumers.
 * - **Stream Consumer** (`autoCreateConsumer`): Dedicated connection per shard — higher throughput, lower latency.
 */
export interface KinesisIntegration {
  type: "kinesis-stream";
  properties: KinesisIntegrationProps;
}
export interface KinesisIntegrationProps {
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
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
   */
  startingPosition?: "LATEST" | "TRIM_HORIZON";
  /**
   * #### The number of times to retry a failed batch of records.
   *
   * ---
   *
   * > **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.
   */
  maximumRetryAttempts?: number;
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
 * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
 */
export interface DestinationOnFailure {
  /**
   * #### The ARN of the SNS topic or SQS queue for failed batches.
   */
  arn: string;
  /**
   * #### The type of the destination.
   */
  type: "sns" | "sqs";
}
/**
 * #### Triggers a function when items are created, updated, or deleted in a DynamoDB table.
 *
 * ---
 *
 * Records are processed in batches. You must enable streams on the DynamoDB table first
 * (set `streaming` in your `dynamoDbTables` config).
 */
export interface DynamoDbIntegration {
  type: "dynamo-db-stream";
  properties: DynamoDbIntegrationProps;
}
export interface DynamoDbIntegrationProps {
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
  maxBatchWindowSeconds?: number;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 1,000.
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
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
  onFailure?: DestinationOnFailure1;
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
 * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
 */
export interface DestinationOnFailure1 {
  /**
   * #### The ARN of the SNS topic or SQS queue for failed batches.
   */
  arn: string;
  /**
   * #### The type of the destination.
   */
  type: "sns" | "sqs";
}
/**
 * #### Triggers a function when files are created, deleted, or restored in an S3 bucket.
 */
export interface S3Integration {
  type: "s3";
  properties: S3IntegrationProps;
}
export interface S3IntegrationProps {
  /**
   * #### The ARN of the S3 bucket to monitor for events.
   */
  bucketArn: string;
  /**
   * #### The type of S3 event that will trigger the function.
   */
  s3EventType:
    | "s3:ObjectCreated:*"
    | "s3:ObjectCreated:CompleteMultipartUpload"
    | "s3:ObjectCreated:Copy"
    | "s3:ObjectCreated:Post"
    | "s3:ObjectCreated:Put"
    | "s3:ObjectRemoved:*"
    | "s3:ObjectRemoved:Delete"
    | "s3:ObjectRemoved:DeleteMarkerCreated"
    | "s3:ObjectRestore:*"
    | "s3:ObjectRestore:Completed"
    | "s3:ObjectRestore:Post"
    | "s3:ReducedRedundancyLostObject"
    | "s3:Replication:*"
    | "s3:Replication:OperationFailedReplication"
    | "s3:Replication:OperationMissedThreshold"
    | "s3:Replication:OperationNotTracked"
    | "s3:Replication:OperationReplicatedAfterThreshold";
  filterRule?: S3FilterRule;
}
/**
 * #### A filter to apply to objects, so the function is only triggered for relevant objects.
 */
export interface S3FilterRule {
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
 * #### Triggers a function on a recurring schedule (cron jobs, periodic tasks).
 *
 * ---
 *
 * Two formats:
 * - **Rate**: `rate(5 minutes)`, `rate(1 hour)`, `rate(7 days)`
 * - **Cron**: `cron(0 18 ? * MON-FRI *)` (6-field AWS cron, all times UTC)
 */
export interface ScheduleIntegration {
  type: "schedule";
  properties: ScheduleIntegrationProps;
}
export interface ScheduleIntegrationProps {
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
  inputTransformer?: EventInputTransformer;
}
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
export interface EventInputTransformer {
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
/**
 * #### Triggers a function when new log records appear in a CloudWatch log group.
 *
 * ---
 *
 * **Note:** The event payload is base64-encoded and gzipped — you must decode and decompress it in your handler.
 */
export interface CloudwatchLogIntegration {
  type: "cloudwatch-log";
  properties: CloudwatchLogIntegrationProps;
}
export interface CloudwatchLogIntegrationProps {
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
/**
 * #### Triggers a function when an HTTP API Gateway receives a matching request.
 *
 * ---
 *
 * Routes are matched by specificity — exact paths take priority over wildcard paths.
 */
export interface HttpApiIntegration {
  type: "http-api-gateway";
  properties: HttpApiIntegrationProps;
}
export interface HttpApiIntegrationProps {
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
  method: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
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
  authorizer?: CognitoAuthorizer | LambdaAuthorizer;
  /**
   * #### The payload format version for the Lambda integration.
   *
   * ---
   *
   * For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
   */
  payloadFormat?: "1.0" | "2.0";
}
/**
 * #### Triggers a batch job when an event matching a specified pattern is received by an event bus.
 *
 * ---
 *
 * You can use a custom event bus or the default AWS event bus.
 */
export interface EventBusIntegration {
  type: "event-bus";
  properties: EventBusIntegrationProps;
}
export interface EventBusIntegrationProps {
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
  eventPattern: EventBusIntegrationPattern;
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
  inputTransformer?: EventInputTransformer1;
}
/**
 * #### A pattern to filter events from the event bus.
 *
 * ---
 *
 * Only events that match this pattern will trigger the target.
 * For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
 */
export interface EventBusIntegrationPattern {
  /**
   * #### Filter by event version.
   */
  version?: any;
  /**
   * #### Filter by event detail-type (e.g., `["OrderPlaced"]`). This is the primary field for routing custom events.
   */
  "detail-type"?: any;
  /**
   * #### Filter by event source (e.g., `["my-app"]` or `["aws.ec2"]` for AWS service events).
   */
  source?: any;
  /**
   * #### Filter by AWS account ID.
   */
  account?: any;
  /**
   * #### Filter by AWS region.
   */
  region?: any;
  /**
   * #### Filter by resource ARNs.
   */
  resources?: any;
  /**
   * #### Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.
   */
  detail?: any;
  /**
   * #### Filter by replay name (only present on replayed events).
   */
  "replay-name"?: any;
}
/**
 * #### A destination for events that fail to be delivered to the target.
 *
 * ---
 *
 * In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.
 */
export interface EventBusOnDeliveryFailure {
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
export interface EventInputTransformer1 {
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
/**
 * #### A container running 24/7 with a public HTTPS URL.
 *
 * ---
 *
 * Use for APIs, web apps, and any service that needs to be always-on and reachable from the internet.
 * Includes TLS/SSL, auto-scaling, health checks, and zero-downtime deployments.
 */
export interface WebService {
  type: "web-service";
  properties: WebServiceProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface WebServiceProps {
  cors?: HttpApiCorsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### How traffic reaches your containers. Affects pricing, features, and protocol support.
   *
   * ---
   *
   * - **`http-api-gateway`** (default): Pay-per-request (~$1/million requests). Best for most apps.
   *   Cheapest at low traffic, but costs grow with volume.
   *
   * - **`application-load-balancer`**: Flat ~$18/month + usage. Required for gradual deployments
   *   (`deployment`), firewalls (`useFirewall`), and WebSocket support.
   *   More cost-effective above ~500k requests/day. AWS Free Tier eligible.
   *
   * - **`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.
   *   Requires explicit `ports` configuration. Does not support CDN, firewall, or gradual deployments.
   */
  loadBalancing?: WebServiceHttpApiGatewayLoadBalancing | WebServiceAlbLoadBalancing | WebServiceNlbLoadBalancing;
  cdn?: CdnConfiguration;
  /**
   * #### Alarms for this service (merged with global alarms from the Stacktape Console).
   */
  alarms?: (ApplicationLoadBalancerAlarm | HttpApiGatewayAlarm)[];
  /**
   * #### Global alarm names to exclude from this service.
   */
  disabledGlobalAlarms?: string[];
  deployment?: ContainerWorkloadDeploymentConfig1;
  /**
   * #### Name of a `web-app-firewall` resource to protect this service from common web exploits.
   */
  useFirewall?: string;
  /**
   * #### Configures the container image for the service.
   */
  packaging:
    | StpBuildpackCwImagePackaging
    | ExternalBuildpackCwImagePackaging
    | PrebuiltCwImagePackaging
    | CustomDockerfileCwImagePackaging
    | NixpacksCwImagePackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use for configuration like API keys, feature flags, or secrets.
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   */
  environment?: EnvironmentVar[];
  logging?: ContainerWorkloadContainerLogging1;
  resources: ContainerWorkloadResourcesConfig1;
  scaling?: ContainerWorkloadScaling1;
  internalHealthCheck?: ContainerHealthCheck1;
  /**
   * #### Seconds to wait for graceful shutdown before force-killing the container.
   *
   * ---
   *
   * The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.
   */
  stopTimeout?: number;
  /**
   * #### Allow SSH-like access to running containers for debugging.
   *
   * ---
   *
   * Enables `stacktape container:session` to open an interactive shell inside the container.
   * Adds a small SSM agent that uses minimal CPU/memory.
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
   */
  usePrivateSubnetsWithNAT?: boolean;
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
/**
 * #### CORS settings. Overrides any CORS headers from your application.
 *
 * ---
 *
 * Only works with `http-api-gateway` load balancing (the default).
 */
export interface HttpApiCorsConfig {
  /**
   * #### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers in CORS preflight.
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods. Auto-detected from integrations if not set.
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies/auth headers in cross-origin requests.
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}
export interface DomainConfiguration {
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
   */
  disableDnsRecordCreation?: boolean;
}
export interface WebServiceHttpApiGatewayLoadBalancing {
  type: "http-api-gateway";
}
export interface WebServiceAlbLoadBalancing {
  type: "application-load-balancer";
  properties?: WebServiceAlbLoadBalancingProps;
}
export interface WebServiceAlbLoadBalancingProps {
  /**
   * #### Path the load balancer pings to check container health.
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
   */
  healthcheckTimeout?: number;
}
export interface WebServiceNlbLoadBalancing {
  type: "network-load-balancer";
  properties: WebServiceNlbLoadBalancingProps;
}
export interface WebServiceNlbLoadBalancingProps {
  /**
   * #### Health check path (only used when `healthCheckProtocol` is `HTTP`).
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks (5-300).
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed (2-120).
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol: `TCP` (port check) or `HTTP` (path check).
   */
  healthCheckProtocol?: "HTTP" | "TCP";
  /**
   * #### Health check port. Defaults to the traffic port.
   */
  healthCheckPort?: number;
  ports: WebServiceNlbLoadBalancingPort[];
}
export interface WebServiceNlbLoadBalancingPort {
  /**
   * #### Public port exposed by the load balancer.
   */
  port: number;
  /**
   * #### Protocol: `TLS` (encrypted) or `TCP` (raw).
   */
  protocol?: "TCP" | "TLS";
  /**
   * #### Port on the container that receives the traffic. Defaults to `port`.
   */
  containerPort?: number;
}
/**
 * #### Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide.
 */
export interface CdnConfiguration {
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   */
  enabled: boolean;
  cachingOptions?: CdnCachingOptions;
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  edgeFunctions?: EdgeFunctionsConfig1;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}
/**
 * #### Control how long and what gets cached at the CDN edge.
 *
 * ---
 *
 * When the origin response has no `Cache-Control` header, defaults apply:
 * - **Bucket origins**: cached for 6 months (or until invalidated on deploy).
 * - **API Gateway / Load Balancer origins**: not cached.
 */
export interface CdnCachingOptions {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
/**
 * #### Which headers, cookies, and query params make responses unique in the cache.
 *
 * ---
 *
 * Defaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.
 * Values included in the cache key are always forwarded to the origin.
 */
export interface CdnCacheKey {
  cookies?: CacheKeyCookies;
  headers?: CacheKeyHeaders;
  queryString?: CacheKeyQueryString;
}
/**
 * #### Which cookies to include in the cache key. Different cookie values = different cached responses.
 */
export interface CacheKeyCookies {
  /**
   * #### No cookies are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are included in the cache key.
   */
  whitelist?: string[];
  /**
   * #### All cookies except the listed ones are included in the cache key.
   */
  allExcept?: string[];
  /**
   * #### All cookies are included in the cache key.
   */
  all?: boolean;
}
/**
 * #### Which headers to include in the cache key. Different header values = different cached responses.
 */
export interface CacheKeyHeaders {
  /**
   * #### No headers are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed headers are included in the cache key.
   */
  whitelist?: string[];
}
/**
 * #### Which query params to include in the cache key. Different param values = different cached responses.
 */
export interface CacheKeyQueryString {
  /**
   * #### All query parameters are included in the cache key.
   */
  all?: boolean;
  /**
   * #### No query parameters are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are included in the cache key.
   */
  whitelist?: string[];
}
/**
 * #### Control which headers, cookies, and query params are forwarded to your origin.
 *
 * ---
 *
 * By default, all headers/cookies/query params are forwarded. Use this to restrict
 * what reaches your app (e.g., strip cookies for static content).
 */
export interface CdnForwardingOptions {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
   */
  allowedMethods?: ("DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT")[];
  cookies?: ForwardCookies;
  headers?: ForwardHeaders;
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
   */
  originRequestPolicyId?: string;
}
export interface CdnCustomRequestHeader {
  /**
   * #### Name of the header
   */
  headerName: string;
  /**
   * #### Value of the header
   */
  value: string;
}
/**
 * #### Which cookies to forward to the origin. Default: all cookies.
 *
 * ---
 *
 * Cookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.
 */
export interface ForwardCookies {
  /**
   * #### No cookies are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are forwarded to the origin.
   */
  whitelist?: string[];
  /**
   * #### All cookies are forwarded to the origin.
   */
  all?: boolean;
}
/**
 * #### Which headers to forward to the origin. Default: all headers.
 *
 * ---
 *
 * > The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.
 */
export interface ForwardHeaders {
  /**
   * #### No headers are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed headers are forwarded to the origin.
   */
  whitelist?: string[];
  /**
   * #### Forward all headers from the viewer's request.
   */
  allViewer?: boolean;
  /**
   * #### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).
   */
  allViewerAndWhitelistCloudFront?: string[];
  /**
   * #### Forward all viewer headers except the listed ones.
   */
  allExcept?: string[];
}
/**
 * #### Which query params to forward to the origin. Default: all query params.
 */
export interface ForwardQueryString {
  /**
   * #### All query parameters are forwarded to the origin.
   */
  all?: boolean;
  /**
   * #### No query parameters are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are forwarded to the origin.
   */
  whitelist?: string[];
}
export interface CdnRouteRewrite {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported.
   */
  path: string;
  /**
   * #### Prepend a path prefix to requests before forwarding to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.
   */
  routePrefix?: string;
  /**
   * #### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.
   *
   * ---
   *
   * If not set, requests go to the default origin (the resource this CDN is attached to).
   */
  routeTo?:
    | CdnLoadBalancerRoute
    | CdnHttpApiGatewayRoute
    | CdnLambdaFunctionRoute
    | CdnCustomDomainRoute
    | CdnBucketRoute;
  cachingOptions?: CdnCachingOptions1;
  forwardingOptions?: CdnForwardingOptions1;
  edgeFunctions?: EdgeFunctionsConfig;
}
export interface CdnLoadBalancerRoute {
  type: "application-load-balancer";
  properties: CdnLoadBalancerOrigin;
}
export interface CdnLoadBalancerOrigin {
  /**
   * #### Name of the `application-load-balancer` resource to route to.
   */
  loadBalancerName: string;
  /**
   * #### Listener port on the load balancer. Only needed if using custom listeners.
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
   */
  originDomainName?: string;
}
export interface CdnHttpApiGatewayRoute {
  type: "http-api-gateway";
  properties: CdnHttpApiGatewayOrigin;
}
export interface CdnHttpApiGatewayOrigin {
  /**
   * #### Name of the `http-api-gateway` resource to route to.
   */
  httpApiGatewayName: string;
}
export interface CdnLambdaFunctionRoute {
  type: "function";
  properties: CdnLambdaFunctionOrigin;
}
export interface CdnLambdaFunctionOrigin {
  /**
   * #### Name of the `function` resource to route to. The function must have `url.enabled: true`.
   */
  functionName: string;
}
export interface CdnCustomDomainRoute {
  type: "custom-origin";
  properties: CdnCustomOrigin;
}
export interface CdnCustomOrigin {
  /**
   * #### Domain name of the external origin (e.g., `api.example.com`).
   */
  domainName: string;
  /**
   * #### Protocol for connecting to the origin.
   */
  protocol?: "HTTP" | "HTTPS";
  /**
   * #### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.
   */
  port?: number;
}
export interface CdnBucketRoute {
  type: "bucket";
  properties: CdnBucketOrigin;
}
export interface CdnBucketOrigin {
  /**
   * #### Name of the `bucket` resource to route to.
   */
  bucketName: string;
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
   */
  disableUrlNormalization?: boolean;
}
/**
 * #### Override caching behavior for requests matching this route.
 */
export interface CdnCachingOptions1 {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
/**
 * #### Override which headers, cookies, and query params are forwarded for this route.
 */
export interface CdnForwardingOptions1 {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
   */
  allowedMethods?: ("DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT")[];
  cookies?: ForwardCookies;
  headers?: ForwardHeaders;
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
   */
  originRequestPolicyId?: string;
}
/**
 * #### Run edge functions on requests/responses matching this route.
 */
export interface EdgeFunctionsConfig {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}
/**
 * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
 *
 * ---
 *
 * - `onRequest`: Before cache lookup — modify the request, add auth, or return early.
 * - `onResponse`: Before returning to the client — modify headers, add cookies.
 */
export interface EdgeFunctionsConfig1 {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}
export interface ApplicationLoadBalancerAlarm {
  trigger: ApplicationLoadBalancerAlarmTrigger;
  evaluation?: AlarmEvaluation;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}
export interface ApplicationLoadBalancerCustomTrigger {
  type: "application-load-balancer-custom";
  properties: ApplicationLoadBalancerCustomTriggerProps;
}
export interface ApplicationLoadBalancerCustomTriggerProps {
  /**
   * #### The metric to monitor on the Load Balancer.
   *
   * ---
   *
   * The threshold will be compared against the calculated value of `statistic(METRIC)`, where:
   * - `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).
   * - `METRIC` is the chosen metric.
   *
   * **Available Metrics:**
   *
   * - `ActiveConnectionCount`: The total number of concurrent TCP connections active from clients to the load balancer and from the load balancer to targets.
   * - `AnomalousHostCount`: The number of hosts detected with anomalies.
   * - `ClientTLSNegotiationErrorCount`: The number of TLS connections initiated by the client that did not establish a session with the load balancer due to a TLS error.
   * - `ConsumedLCUs`: The number of load balancer capacity units (LCU) used by your load balancer.
   * - `DesyncMitigationMode_NonCompliant_Request_Count`: The number of requests that do not comply with RFC 7230.
   * - `DroppedInvalidHeaderRequestCount`: The number of requests where the load balancer removed HTTP headers with invalid fields before routing the request.
   * - `MitigatedHostCount`: The number of targets under mitigation.
   * - `ForwardedInvalidHeaderRequestCount`: The number of requests routed by the load balancer that had HTTP headers with invalid fields.
   * - `GrpcRequestCount`: The number of gRPC requests processed over IPv4 and IPv6.
   * - `HTTP_Fixed_Response_Count`: The number of successful fixed-response actions.
   * - `HTTP_Redirect_Count`: The number of successful redirect actions.
   * - `HTTP_Redirect_Url_Limit_Exceeded_Count`: The number of redirect actions that failed because the URL in the response location header exceeded 8K.
   * - `HTTPCode_ELB_3XX_Count`: The number of HTTP 3XX redirection codes originating from the load balancer.
   * - `HTTPCode_ELB_4XX_Count`: The number of HTTP 4XX client error codes originating from the load balancer.
   * - `HTTPCode_ELB_5XX_Count`: The number of HTTP 5XX server error codes originating from the load balancer.
   * - `HTTPCode_ELB_500_Count`: The number of HTTP 500 error codes originating from the load balancer.
   * - `HTTPCode_ELB_502_Count`: The number of HTTP 502 error codes originating from the load balancer.
   * - `HTTPCode_ELB_503_Count`: The number of HTTP 503 error codes originating from the load balancer.
   * - `HTTPCode_ELB_504_Count`: The number of HTTP 504 error codes originating from the load balancer.
   * - `IPv6ProcessedBytes`: The total number of bytes processed by the load balancer over IPv6.
   * - `IPv6RequestCount`: The number of IPv6 requests received by the load balancer.
   * - `NewConnectionCount`: The total number of new TCP connections established from clients to the load balancer and from the load balancer to targets.
   * - `NonStickyRequestCount`: The number of requests where the load balancer chose a new target because it could not use an existing sticky session.
   * - `ProcessedBytes`: The total number of bytes processed by the load balancer over IPv4 and IPv6.
   * - `RejectedConnectionCount`: The number of connections rejected because the load balancer reached its maximum number of connections.
   * - `RequestCount`: The number of requests processed over IPv4 and IPv6.
   * - `RuleEvaluations`: The number of rules processed by the load balancer, averaged over an hour.
   * - `HealthyHostCount`: The number of targets that are considered healthy.
   * - `HTTPCode_Target_2XX_Count`: The number of HTTP 2XX response codes generated by the targets.
   * - `HTTPCode_Target_3XX_Count`: The number of HTTP 3XX response codes generated by the targets.
   * - `HTTPCode_Target_4XX_Count`: The number of HTTP 4XX response codes generated by the targets.
   * - `HTTPCode_Target_5XX_Count`: The number of HTTP 5XX response codes generated by the targets.
   * - `RequestCountPerTarget`: The average number of requests per target in a target group.
   * - `TargetConnectionErrorCount`: The number of connections that were not successfully established between the load balancer and a target.
   * - `TargetResponseTime`: The time elapsed (in seconds) from when a request leaves the load balancer until the target starts sending response headers.
   * - `TargetTLSNegotiationErrorCount`: The number of TLS connections initiated by the load balancer that did not establish a session with the target.
   * - `UnHealthyHostCount`: The number of targets that are considered unhealthy.
   * - `HealthyStateDNS`: The number of zones that meet the DNS healthy state requirements.
   * - `HealthyStateRouting`: The number of zones that meet the routing healthy state requirements.
   * - `UnhealthyRoutingRequestCount`: The number of requests routed using the routing failover action (fail open).
   * - `UnhealthyStateDNS`: The number of zones that do not meet the DNS healthy state requirements.
   * - `UnhealthyStateRouting`: The number of zones that do not meet the routing healthy state requirements.
   * - `LambdaInternalError`: The number of requests to a Lambda function that failed due to an issue internal to the load balancer or AWS Lambda.
   * - `LambdaTargetProcessedBytes`: The total number of bytes processed by the load balancer for requests to and responses from a Lambda function.
   * - `LambdaUserError`: The number of requests to a Lambda function that failed due to an issue with the Lambda function itself.
   * - `ELBAuthError`: The number of user authentications that could not be completed due to an internal error.
   * - `ELBAuthFailure`: The number of user authentications that could not be completed because the IdP denied access.
   * - `ELBAuthLatency`: The time elapsed (in milliseconds) to query the IdP for the ID token and user info.
   * - `ELBAuthRefreshTokenSuccess`: The number of times the load balancer successfully refreshed user claims using a refresh token.
   * - `ELBAuthSuccess`: The number of successful authentication actions.
   * - `ELBAuthUserClaimsSizeExceeded`: The number of times a configured IdP returned user claims that exceeded 11K bytes in size.
   */
  metric:
    | "ActiveConnectionCount"
    | "AnomalousHostCount"
    | "ClientTLSNegotiationErrorCount"
    | "ConsumedLCUs"
    | "DesyncMitigationMode_NonCompliant_Request_Count"
    | "DroppedInvalidHeaderRequestCount"
    | "ELBAuthError"
    | "ELBAuthFailure"
    | "ELBAuthLatency"
    | "ELBAuthRefreshTokenSuccess"
    | "ELBAuthSuccess"
    | "ELBAuthUserClaimsSizeExceeded"
    | "ForwardedInvalidHeaderRequestCount"
    | "GrpcRequestCount"
    | "HTTPCode_ELB_3XX_Count"
    | "HTTPCode_ELB_4XX_Count"
    | "HTTPCode_ELB_500_Count"
    | "HTTPCode_ELB_502_Count"
    | "HTTPCode_ELB_503_Count"
    | "HTTPCode_ELB_504_Count"
    | "HTTPCode_ELB_5XX_Count"
    | "HTTPCode_Target_2XX_Count"
    | "HTTPCode_Target_3XX_Count"
    | "HTTPCode_Target_4XX_Count"
    | "HTTPCode_Target_5XX_Count"
    | "HTTP_Fixed_Response_Count"
    | "HTTP_Redirect_Count"
    | "HTTP_Redirect_Url_Limit_Exceeded_Count"
    | "HealthyHostCount"
    | "HealthyStateDNS"
    | "HealthyStateRouting"
    | "IPv6ProcessedBytes"
    | "IPv6RequestCount"
    | "LambdaInternalError"
    | "LambdaTargetProcessedBytes"
    | "LambdaUserError"
    | "MitigatedHostCount"
    | "NewConnectionCount"
    | "NonStickyRequestCount"
    | "ProcessedBytes"
    | "RejectedConnectionCount"
    | "RequestCount"
    | "RequestCountPerTarget"
    | "RuleEvaluations"
    | "TargetConnectionErrorCount"
    | "TargetResponseTime"
    | "TargetTLSNegotiationErrorCount"
    | "UnHealthyHostCount"
    | "UnhealthyRoutingRequestCount"
    | "UnhealthyStateDNS"
    | "UnhealthyStateRouting";
  /**
   * #### The threshold that triggers the alarm.
   *
   * ---
   *
   * The threshold is compared against the calculated value of `statistic(METRIC)`, where:
   * - `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).
   * - `METRIC` is the chosen metric.
   */
  threshold: number;
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
}
export interface ApplicationLoadBalancerErrorRateTrigger {
  type: "application-load-balancer-error-rate";
  properties: ApplicationLoadBalancerErrorRateTriggerProps;
}
export interface ApplicationLoadBalancerErrorRateTriggerProps {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   *
   * ---
   *
   * Example: `5` fires the alarm if more than 5% of requests return errors.
   */
  thresholdPercent: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
}
export interface ApplicationLoadBalancerUnhealthyTargetsTrigger {
  type: "application-load-balancer-unhealthy-targets";
  properties: ApplicationLoadBalancerUnhealthyTargetsTriggerProps;
}
export interface ApplicationLoadBalancerUnhealthyTargetsTriggerProps {
  /**
   * #### Fires when the percentage of unhealthy targets exceeds this value.
   *
   * ---
   *
   * If the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold.
   */
  thresholdPercent: number;
  /**
   * #### Only monitor health of these target container services. If omitted, monitors all targets.
   *
   * ---
   *
   * Only services actually targeted by the load balancer can be listed.
   */
  onlyIncludeTargets?: string[];
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
}
/**
 * #### How long and how often to evaluate the metric before triggering.
 *
 * ---
 *
 * Controls the evaluation window (period), how many periods to look at, and how many must breach
 * the threshold to fire the alarm. Useful for filtering out short spikes.
 */
export interface AlarmEvaluation {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   */
  breachedPeriods?: number;
}
export interface MsTeamsIntegration {
  type: "ms-teams";
  properties?: MsTeamsIntegrationProps;
}
export interface MsTeamsIntegrationProps {
  /**
   * #### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create an Incoming Webhook connector in your Teams channel settings to get this URL.
   */
  webhookUrl: string;
}
export interface SlackIntegration {
  type: "slack";
  properties?: SlackIntegrationProps;
}
export interface SlackIntegrationProps {
  /**
   * #### The Slack channel or DM ID to send notifications to.
   *
   * ---
   *
   * To find the ID: open the channel, click its name, and look at the bottom of the **About** tab.
   */
  conversationId: string;
  /**
   * #### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.
   */
  accessToken: string;
}
export interface EmailIntegration {
  type: "email";
  properties: EmailIntegrationProps;
}
export interface EmailIntegrationProps {
  /**
   * #### The email address of the sender.
   */
  sender: string;
  /**
   * #### The email address of the recipient.
   */
  recipient: string;
}
export interface DiscordIntegration {
  type: "discord";
  properties?: DiscordIntegrationProps;
}
export interface DiscordIntegrationProps {
  /**
   * #### Discord Webhook URL for the channel. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create a webhook in your Discord channel settings (Edit Channel → Integrations → Webhooks).
   */
  webhookUrl: string;
}
export interface WebhookIntegration {
  type: "webhook";
  properties?: WebhookIntegrationProps;
}
export interface WebhookIntegrationProps {
  /**
   * #### The URL to send webhook POST requests to.
   */
  url: string;
  /**
   * #### Optional signing secret for HMAC-SHA256 payload verification.
   *
   * ---
   *
   * If provided, each request includes an `X-Stacktape-Signature` header.
   */
  secret?: string;
  headers?: RecordStringString;
}
/**
 * #### Optional custom headers to include in each request.
 */
export interface RecordStringString {}
export interface HttpApiGatewayAlarm {
  trigger: HttpApiGatewayAlarmTrigger;
  evaluation?: AlarmEvaluation1;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}
export interface HttpApiGatewayErrorRateTrigger {
  type: "http-api-gateway-error-rate";
  properties: HttpApiGatewayErrorRateTriggerProps;
}
export interface HttpApiGatewayErrorRateTriggerProps {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   */
  thresholdPercent: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
}
export interface HttpApiGatewayLatencyTrigger {
  type: "http-api-gateway-latency";
  properties: HttpApiGatewayLatencyTriggerProps;
}
export interface HttpApiGatewayLatencyTriggerProps {
  /**
   * #### Fires when request-to-response latency exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** latency > threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMilliseconds: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
/**
 * #### How long and how often to evaluate the metric before triggering.
 *
 * ---
 *
 * Controls the evaluation window (period), how many periods to look at, and how many must breach
 * the threshold to fire the alarm. Useful for filtering out short spikes.
 */
export interface AlarmEvaluation1 {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   */
  breachedPeriods?: number;
}
/**
 * #### Gradual traffic shifting for safe deployments (canary, linear, or all-at-once).
 *
 * ---
 *
 * Requires `loadBalancing` type `application-load-balancer`.
 */
export interface ContainerWorkloadDeploymentConfig1 {
  /**
   * #### How traffic shifts to the new version during deployment.
   *
   * ---
   *
   * - `Canary10Percent5Minutes`: 10% first, then all after 5 min.
   * - `Canary10Percent15Minutes`: 10% first, then all after 15 min.
   * - `Linear10PercentEvery1Minutes`: 10% more every minute.
   * - `Linear10PercentEvery3Minutes`: 10% more every 3 minutes.
   * - `AllAtOnce`: Instant switch.
   */
  strategy:
    | "AllAtOnce"
    | "Canary10Percent15Minutes"
    | "Canary10Percent5Minutes"
    | "Linear10PercentEvery1Minutes"
    | "Linear10PercentEvery3Minutes";
  /**
   * #### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Lambda function to run after all traffic has shifted (for post-deployment checks).
   */
  afterTrafficShiftFunction?: string;
  /**
   * #### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.
   */
  testListenerPort?: number;
}
/**
 * #### Logging configuration.
 *
 * ---
 *
 * Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
 * View logs with `stacktape logs` or in the Stacktape Console.
 */
export interface ContainerWorkloadContainerLogging1 {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### CPU, memory, and compute engine for the container.
 *
 * ---
 *
 * Two compute engines:
 * - **Fargate** (default): Serverless — just specify `cpu` and `memory`.
 * - **EC2**: Specify `instanceTypes` for more control and potentially lower cost.
 */
export interface ContainerWorkloadResourcesConfig1 {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
   */
  cpu?: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8;
  /**
   * #### Memory in MB. Must be compatible with the vCPU count on Fargate.
   *
   * ---
   *
   * Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
   * 4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
   * For EC2: auto-detected from instance type if omitted.
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   */
  architecture?: "arm64" | "x86_64";
}
/**
 * #### Auto-scaling: add/remove container instances based on demand.
 *
 * ---
 *
 * Traffic is automatically distributed across all running containers.
 */
export interface ContainerWorkloadScaling1 {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   */
  maxInstances?: number;
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}
/**
 * #### Health check that auto-replaces unhealthy containers.
 *
 * ---
 *
 * If a container fails the health check, it's terminated and replaced automatically.
 */
export interface ContainerHealthCheck1 {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   */
  startPeriodSeconds?: number;
}
export interface ServiceHelperContainer {
  /**
   * #### When and how this sidecar container runs.
   *
   * ---
   *
   * - **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.
   * - **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails.
   */
  containerType: "always-running" | "run-on-init";
  /**
   * #### Unique container name within this workload.
   */
  name: string;
  /**
   * #### How to build or specify the container image.
   */
  packaging:
    | StpBuildpackCwImagePackaging
    | ExternalBuildpackCwImagePackaging
    | PrebuiltCwImagePackaging
    | CustomDockerfileCwImagePackaging
    | NixpacksCwImagePackaging;
  /**
   * #### If `true` (default), the entire workload restarts when this container fails.
   */
  essential?: boolean;
  logging?: ContainerWorkloadContainerLogging2;
  /**
   * #### Start this container only after the listed containers reach a specific state.
   *
   * ---
   *
   * E.g., wait for a database sidecar to be `HEALTHY` before starting the app container.
   */
  dependsOn?: ContainerDependency[];
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  internalHealthCheck?: ContainerHealthCheck2;
  /**
   * #### Seconds to wait after SIGTERM before SIGKILL (2-120).
   */
  stopTimeout?: number;
  /**
   * #### Mount EFS volumes for persistent, shared storage across containers.
   */
  volumeMounts?: ContainerEfsMount[];
}
/**
 * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
 */
export interface ContainerWorkloadContainerLogging2 {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Command-based health check. If it fails on an essential container, the workload instance is replaced.
 */
export interface ContainerHealthCheck2 {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   */
  startPeriodSeconds?: number;
}
/**
 * #### Always-on container with a private endpoint, reachable only from other resources in your stack.
 *
 * ---
 *
 * Use for internal APIs, microservices, or gRPC servers that shouldn't be publicly accessible.
 * Other containers in the same stack can reach it by name (e.g., `http://myService:3000`).
 */
export interface PrivateService {
  type: "private-service";
  properties: PrivateServiceProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface PrivateServiceProps {
  /**
   * #### Port this service listens on. Injected as the `PORT` env var.
   */
  port?: number;
  /**
   * #### Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking).
   */
  protocol?: "grpc" | "http" | "http2";
  loadBalancing?: PrivateServiceLoadBalancing;
  /**
   * #### Configures the container image for the service.
   */
  packaging:
    | StpBuildpackCwImagePackaging
    | ExternalBuildpackCwImagePackaging
    | PrebuiltCwImagePackaging
    | CustomDockerfileCwImagePackaging
    | NixpacksCwImagePackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use for configuration like API keys, feature flags, or secrets.
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   */
  environment?: EnvironmentVar[];
  logging?: ContainerWorkloadContainerLogging3;
  resources: ContainerWorkloadResourcesConfig2;
  scaling?: ContainerWorkloadScaling2;
  internalHealthCheck?: ContainerHealthCheck3;
  /**
   * #### Seconds to wait for graceful shutdown before force-killing the container.
   *
   * ---
   *
   * The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.
   */
  stopTimeout?: number;
  /**
   * #### Allow SSH-like access to running containers for debugging.
   *
   * ---
   *
   * Enables `stacktape container:session` to open an interactive shell inside the container.
   * Adds a small SSM agent that uses minimal CPU/memory.
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
   */
  usePrivateSubnetsWithNAT?: boolean;
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
/**
 * #### Logging configuration.
 *
 * ---
 *
 * Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
 * View logs with `stacktape logs` or in the Stacktape Console.
 */
export interface ContainerWorkloadContainerLogging3 {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### CPU, memory, and compute engine for the container.
 *
 * ---
 *
 * Two compute engines:
 * - **Fargate** (default): Serverless — just specify `cpu` and `memory`.
 * - **EC2**: Specify `instanceTypes` for more control and potentially lower cost.
 */
export interface ContainerWorkloadResourcesConfig2 {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
   */
  cpu?: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8;
  /**
   * #### Memory in MB. Must be compatible with the vCPU count on Fargate.
   *
   * ---
   *
   * Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
   * 4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
   * For EC2: auto-detected from instance type if omitted.
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   */
  architecture?: "arm64" | "x86_64";
}
/**
 * #### Auto-scaling: add/remove container instances based on demand.
 *
 * ---
 *
 * Traffic is automatically distributed across all running containers.
 */
export interface ContainerWorkloadScaling2 {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   */
  maxInstances?: number;
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}
/**
 * #### Health check that auto-replaces unhealthy containers.
 *
 * ---
 *
 * If a container fails the health check, it's terminated and replaced automatically.
 */
export interface ContainerHealthCheck3 {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   */
  startPeriodSeconds?: number;
}
/**
 * #### Always-on container with no public URL. For background workers, queue processors, and internal tasks.
 *
 * ---
 *
 * Runs 24/7 inside your VPC. Not reachable from the internet. Can connect to databases, queues, and other resources.
 */
export interface WorkerService {
  type: "worker-service";
  properties: WorkerServiceProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface WorkerServiceProps {
  /**
   * #### Configures the container image for the service.
   */
  packaging:
    | StpBuildpackCwImagePackaging
    | ExternalBuildpackCwImagePackaging
    | PrebuiltCwImagePackaging
    | CustomDockerfileCwImagePackaging
    | NixpacksCwImagePackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use for configuration like API keys, feature flags, or secrets.
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   */
  environment?: EnvironmentVar[];
  logging?: ContainerWorkloadContainerLogging4;
  resources: ContainerWorkloadResourcesConfig3;
  scaling?: ContainerWorkloadScaling3;
  internalHealthCheck?: ContainerHealthCheck4;
  /**
   * #### Seconds to wait for graceful shutdown before force-killing the container.
   *
   * ---
   *
   * The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.
   */
  stopTimeout?: number;
  /**
   * #### Allow SSH-like access to running containers for debugging.
   *
   * ---
   *
   * Enables `stacktape container:session` to open an interactive shell inside the container.
   * Adds a small SSM agent that uses minimal CPU/memory.
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
   */
  usePrivateSubnetsWithNAT?: boolean;
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
/**
 * #### Logging configuration.
 *
 * ---
 *
 * Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
 * View logs with `stacktape logs` or in the Stacktape Console.
 */
export interface ContainerWorkloadContainerLogging4 {
  /**
   * #### Disable logging to CloudWatch.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### CPU, memory, and compute engine for the container.
 *
 * ---
 *
 * Two compute engines:
 * - **Fargate** (default): Serverless — just specify `cpu` and `memory`.
 * - **EC2**: Specify `instanceTypes` for more control and potentially lower cost.
 */
export interface ContainerWorkloadResourcesConfig3 {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
   */
  cpu?: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8;
  /**
   * #### Memory in MB. Must be compatible with the vCPU count on Fargate.
   *
   * ---
   *
   * Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
   * 4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
   * For EC2: auto-detected from instance type if omitted.
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   */
  architecture?: "arm64" | "x86_64";
}
/**
 * #### Auto-scaling: add/remove container instances based on demand.
 *
 * ---
 *
 * Traffic is automatically distributed across all running containers.
 */
export interface ContainerWorkloadScaling3 {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   */
  maxInstances?: number;
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}
/**
 * #### Health check that auto-replaces unhealthy containers.
 *
 * ---
 *
 * If a container fails the health check, it's terminated and replaced automatically.
 */
export interface ContainerHealthCheck4 {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   */
  startPeriodSeconds?: number;
}
/**
 * #### A fully managed relational (SQL) database resource.
 *
 * ---
 *
 * Supports various database engines like PostgreSQL, MySQL, and MariaDB, with features like clustering and high availability.
 */
export interface RelationalDatabase {
  type: "relational-database";
  properties: RelationalDatabaseProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface RelationalDatabaseProps {
  credentials: RelationalDatabaseCredentials;
  /**
   * #### Database engine: what type of database and how it runs.
   *
   * ---
   *
   * - **RDS** (`postgres`, `mysql`, `mariadb`, etc.): Single-node, fixed-size. Simple and predictable pricing.
   * - **Aurora** (`aurora-postgresql`, `aurora-mysql`): High-performance clustered DB with auto-failover.
   *   Up to 5x faster than standard MySQL / 3x faster than standard PostgreSQL.
   * - **Aurora Serverless v2** (`aurora-postgresql-serverless-v2`): Auto-scales from 0.5 to 128 ACUs.
   *   **Recommended for most new projects** — pay only for what you use.
   */
  engine: AuroraEngine | AuroraServerlessEngine | AuroraServerlessV2Engine | RdsEngine;
  accessibility?: DatabaseAccessibility;
  /**
   * #### Prevent accidental deletion of the database. Must be disabled before deleting.
   */
  deletionProtection?: boolean;
  /**
   * #### Days to keep automated daily backups (0-35). Set to 0 to disable (RDS only).
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### When maintenance (patching, upgrades) happens. Format: `Sun:02:00-Sun:04:00` (UTC).
   *
   * ---
   *
   * The database may be briefly unavailable during this window.
   * Use multi-AZ or Aurora to minimize downtime.
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### Alarms for this database (merged with global alarms from the Stacktape Console).
   */
  alarms?: RelationalDatabaseAlarm[];
  /**
   * #### Global alarm names to exclude from this database.
   */
  disabledGlobalAlarms?: string[];
  logging?: RelationalDatabaseLogging;
  dev?: DevModeConfig;
}
/**
 * #### Master user credentials (username and password).
 *
 * ---
 *
 * Included in the auto-generated connection string. Store the password in a Stacktape secret
 * to avoid exposing it in your config file.
 */
export interface RelationalDatabaseCredentials {
  /**
   * #### Admin username. Avoid special characters: `[]{}(),;?*=!@`.
   *
   * ---
   *
   * > **Warning:** Changing this after creation **replaces the database and deletes all data**.
   */
  masterUserName?: string;
  /**
   * #### Admin password. Avoid special characters: `[]{}(),;?*=!@`.
   *
   * ---
   *
   * Use `$Secret()` to store it securely instead of hardcoding:
   * ```yaml
   * masterUserPassword: $Secret('database.password')
   * ```
   */
  masterUserPassword: string;
}
/**
 * #### Aurora: high-performance clustered database with auto-failover.
 *
 * ---
 *
 * Up to 5x faster than MySQL, 3x faster than PostgreSQL. Data is replicated across 3 AZs
 * automatically. If the primary instance fails, a read replica is promoted in seconds.
 */
export interface AuroraEngine {
  type: "aurora-mysql" | "aurora-postgresql";
  properties: AuroraEngineProperties;
}
export interface AuroraEngineProperties {
  /**
   * #### Name of the initial database.
   */
  dbName?: string;
  /**
   * #### Port. Defaults: aurora-mysql 3306, aurora-postgresql 5432.
   */
  port?: number;
  /**
   * #### Cluster instances. First = primary (writer), rest = read replicas.
   *
   * ---
   *
   * Reads are load-balanced across all instances. If the primary fails,
   * a replica is automatically promoted (usually within 30 seconds).
   */
  instances: AuroraEngineInstance[];
  /**
   * #### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL).
   */
  version: string;
  /**
   * #### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).
   */
  disableAutoMinorVersionUpgrade?: boolean;
}
export interface AuroraEngineInstance {
  /**
   * #### Instance size (e.g., `db.t4g.medium`, `db.r6g.large`).
   *
   * ---
   *
   * `t` family = burstable (dev/low-traffic). `r` family = memory-optimized (production).
   */
  instanceSize: string;
}
/**
 * #### Aurora Serverless v1: auto-scaling database that can pause when idle.
 *
 * ---
 *
 * Scales compute capacity automatically and pauses during inactivity (you only pay for storage).
 *
 * > **For new projects, use Aurora Serverless v2 instead** — it has faster scaling and more granular capacity control.
 */
export interface AuroraServerlessEngine {
  type: "aurora-mysql-serverless" | "aurora-postgresql-serverless";
  properties?: AuroraServerlessEngineProperties;
}
export interface AuroraServerlessEngineProperties {
  /**
   * #### Engine version. Usually managed by AWS automatically for serverless v1.
   */
  version?: string;
  /**
   * #### Name of the initial database.
   */
  dbName?: string;
  /**
   * #### Minimum ACUs to scale down to (~1 ACU ≈ 2 GB RAM).
   *
   * ---
   *
   * MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).
   */
  minCapacity?: number;
  /**
   * #### Maximum ACUs to scale up to.
   *
   * ---
   *
   * MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).
   */
  maxCapacity?: number;
  /**
   * #### Pause the database after this many seconds of inactivity (no connections).
   *
   * ---
   *
   * When paused, you only pay for storage. Range: 300 (5 min) - 86400 (24 hr).
   * Omit to never pause.
   */
  pauseAfterSeconds?: number;
  /**
   * #### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).
   */
  disableAutoMinorVersionUpgrade?: boolean;
}
/**
 * #### Aurora Serverless v2: recommended for most new projects.
 *
 * ---
 *
 * Scales instantly from 0.5 to 128 ACUs in 0.5-ACU increments (~1 ACU ≈ 2 GB RAM).
 * You pay only for the capacity used, making it cost-effective for variable workloads.
 */
export interface AuroraServerlessV2Engine {
  type: "aurora-mysql-serverless-v2" | "aurora-postgresql-serverless-v2";
  properties: AuroraServerlessV2EngineProperties;
}
export interface AuroraServerlessV2EngineProperties {
  /**
   * #### Name of the initial database.
   */
  dbName?: string;
  /**
   * #### Minimum ACUs (0.5-128 in 0.5 increments). ~1 ACU ≈ 2 GB RAM.
   *
   * ---
   *
   * Set low (0.5) for dev/staging to minimize cost. The database scales up instantly under load.
   */
  minCapacity?: number;
  /**
   * #### Maximum ACUs (0.5-128 in 0.5 increments). Caps your scaling and cost.
   */
  maxCapacity?: number;
  /**
   * #### Number of reader instances in the Aurora Serverless v2 cluster.
   *
   * ---
   *
   * Aurora Serverless v2 always has one writer instance. This value adds additional readers
   * (`0` means writer only, `2` means writer + 2 readers).
   */
  serverlessReadersCount?: number;
  /**
   * #### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL).
   */
  version: string;
  /**
   * #### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).
   */
  disableAutoMinorVersionUpgrade?: boolean;
}
/**
 * #### Standard RDS: single-instance database with predictable pricing.
 *
 * ---
 *
 * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
 * For high availability, enable `multiAz` on the primary instance.
 */
export interface RdsEngine {
  type:
    | "mariadb"
    | "mysql"
    | "oracle-ee"
    | "oracle-se2"
    | "postgres"
    | "sqlserver-ee"
    | "sqlserver-ex"
    | "sqlserver-se"
    | "sqlserver-web";
  properties: RdsEngineProperties;
}
export interface RdsEngineProperties {
  /**
   * #### Name of the database created on initialization. For Oracle, this is the SID. Not applicable to SQL Server.
   */
  dbName?: string;
  /**
   * #### Port the database listens on. Defaults: PostgreSQL 5432, MySQL/MariaDB 3306, Oracle 1521, SQL Server 1433.
   */
  port?: number;
  storage?: RdsEngineStorage;
  primaryInstance: RdsEnginePrimaryInstance;
  /**
   * #### Read replicas to offload read traffic from the primary instance.
   *
   * ---
   *
   * Each replica gets its own endpoint. Data is replicated asynchronously from the primary.
   */
  readReplicas?: RdsEngineReadReplica[];
  /**
   * #### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL).
   */
  version: string;
  /**
   * #### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).
   */
  disableAutoMinorVersionUpgrade?: boolean;
}
/**
 * #### Storage configuration. Auto-scales up when free space is low.
 */
export interface RdsEngineStorage {
  /**
   * #### Initial storage in GB. Auto-scales up when free space is low.
   */
  initialSize?: number;
  /**
   * #### Max storage in GB. The database won't auto-scale beyond this.
   */
  maxSize?: number;
}
/**
 * #### The primary (writer) instance. Handles all write operations.
 */
export interface RdsEnginePrimaryInstance {
  /**
   * #### Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).
   *
   * ---
   *
   * Determines CPU, memory, and network capacity. Quick guide:
   * - **db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM
   * - **db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM
   * - **db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM
   *
   * `t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads.
   */
  instanceSize: string;
  /**
   * #### Create a standby replica in another availability zone for automatic failover.
   *
   * ---
   *
   * If the primary goes down, traffic fails over to the standby automatically.
   * Also reduces downtime during maintenance. Doubles the instance cost.
   */
  multiAz?: boolean;
}
export interface RdsEngineReadReplica {
  /**
   * #### Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).
   *
   * ---
   *
   * Determines CPU, memory, and network capacity. Quick guide:
   * - **db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM
   * - **db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM
   * - **db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM
   *
   * `t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads.
   */
  instanceSize: string;
  /**
   * #### Create a standby replica in another availability zone for automatic failover.
   *
   * ---
   *
   * If the primary goes down, traffic fails over to the standby automatically.
   * Also reduces downtime during maintenance. Doubles the instance cost.
   */
  multiAz?: boolean;
}
/**
 * #### Who can connect to this database (network-level access control).
 *
 * ---
 *
 * Default is `internet` — anyone with credentials can connect (fine for development).
 * For production, use `scoping-workloads-in-vpc` to restrict access to only resources
 * that list this database in their `connectTo`.
 */
export interface DatabaseAccessibility {
  /**
   * #### Controls who can connect to your database.
   *
   * ---
   *
   * - **`internet`** (default): Anyone with the credentials can connect. Simplest setup, great for development.
   *   The database is still protected by username/password.
   * - **`vpc`**: Only your app's resources (and anything in the same VPC) can connect.
   *   You can also whitelist specific IPs (e.g., your office) using `whitelistedIps`.
   * - **`scoping-workloads-in-vpc`**: Most restrictive. Only resources that explicitly list this
   *   database in their `connectTo` can reach it. Best for production.
   * - **`whitelisted-ips-only`**: Only the IP addresses you list in `whitelistedIps` can connect.
   *
   * > Aurora Serverless engines only support `vpc` or `scoping-workloads-in-vpc`.
   */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only";
  /**
   * #### Remove the database's public IP entirely (VPC-only access).
   *
   * ---
   *
   * > For Aurora, this can only be set at creation time and cannot be changed later.
   */
  forceDisablePublicIp?: boolean;
  /**
   * #### IP addresses or CIDR ranges allowed to connect (e.g., `203.0.113.50/32`).
   *
   * ---
   *
   * - In `vpc`/`scoping-workloads-in-vpc`: adds external IPs on top of VPC access (e.g., your office).
   * - In `whitelisted-ips-only`: only these IPs can connect.
   * - No effect in `internet` mode.
   */
  whitelistedIps?: string[];
}
export interface RelationalDatabaseAlarm {
  trigger: RelationalDatabaseAlarmTrigger;
  evaluation?: AlarmEvaluation2;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}
export interface RelationalDatabaseReadLatencyTrigger {
  type: "database-read-latency";
  properties: RelationalDatabaseReadLatencyTriggerProps;
}
export interface RelationalDatabaseReadLatencyTriggerProps {
  /**
   * #### Fires when average read I/O latency exceeds this value (seconds).
   */
  thresholdSeconds: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface RelationalDatabaseWriteLatencyTrigger {
  type: "database-write-latency";
  properties: RelationalDatabaseWriteLatencyTriggerProps;
}
export interface RelationalDatabaseWriteLatencyTriggerProps {
  /**
   * #### Fires when average write I/O latency exceeds this value (seconds).
   */
  thresholdSeconds: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface RelationalDatabaseCPUUtilizationTrigger {
  type: "database-cpu-utilization";
  properties: RelationalDatabaseCPUUtilizationTriggerProps;
}
export interface RelationalDatabaseCPUUtilizationTriggerProps {
  /**
   * #### Fires when CPU utilization exceeds this percentage.
   */
  thresholdPercent: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface RelationalDatabaseFreeStorageTrigger {
  type: "database-free-storage";
  properties: RelationalDatabaseFreeStorageTriggerProps;
}
export interface RelationalDatabaseFreeStorageTriggerProps {
  /**
   * #### Fires when free disk space drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **minimum** free storage < threshold.
   */
  thresholdMB: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface RelationalDatabaseFreeMemoryTrigger {
  type: "database-free-memory";
  properties: RelationalDatabaseFreeMemoryTriggerProps;
}
export interface RelationalDatabaseFreeMemoryTriggerProps {
  /**
   * #### Fires when free memory drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **average** free memory < threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMB: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface RelationalDatabaseConnectionCountTrigger {
  type: "database-connection-count";
  properties: RelationalDatabaseConnectionCountTriggerProps;
}
export interface RelationalDatabaseConnectionCountTriggerProps {
  /**
   * #### Fires when the number of active database connections exceeds this value.
   */
  thresholdCount: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
/**
 * #### How long and how often to evaluate the metric before triggering.
 *
 * ---
 *
 * Controls the evaluation window (period), how many periods to look at, and how many must breach
 * the threshold to fire the alarm. Useful for filtering out short spikes.
 */
export interface AlarmEvaluation2 {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   */
  breachedPeriods?: number;
}
/**
 * #### Database logging (connections, slow queries, errors).
 *
 * ---
 *
 * Logs are sent to CloudWatch and retained for 90 days by default.
 * Available log types vary by engine.
 */
export interface RelationalDatabaseLogging {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Which log types to export. Depends on engine:
   *
   * - **PostgreSQL**: `postgresql`
   * - **MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`
   * - **Oracle**: `alert`, `audit`, `listener`, `trace`
   * - **SQL Server**: `agent`, `error`
   */
  logTypes?: string[];
  /**
   * #### Fine-grained logging settings (PostgreSQL: slow queries, statements; MySQL: audit events).
   */
  engineSpecificOptions?: PostgresLoggingOptions | MysqlLoggingOptions;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
export interface PostgresLoggingOptions {
  /**
   * #### Log new client connections.
   */
  log_connections?: boolean;
  /**
   * #### Log client disconnections.
   */
  log_disconnections?: boolean;
  /**
   * #### Log sessions waiting for locks (helps find lock contention issues).
   */
  log_lock_waits?: boolean;
  /**
   * #### Log queries slower than this (ms). `-1` = disabled, `0` = log all. Great for finding slow queries.
   */
  log_min_duration_statement?: number;
  /**
   * #### Which SQL statements to log: `none`, `ddl` (CREATE/ALTER), `mod` (ddl + INSERT/UPDATE/DELETE), `all`.
   */
  log_statement?: "all" | "ddl" | "mod" | "none";
}
export interface MysqlLoggingOptions {
  /**
   * #### What to record in the audit log: connections, all queries, DDL only, DML only, etc.
   */
  server_audit_events?: ("CONNECT" | "QUERY" | "QUERY_DCL" | "QUERY_DDL" | "QUERY_DML" | "QUERY_DML_NO_SELECT")[];
  /**
   * #### Queries slower than this (seconds) are logged as "slow queries". `-1` to disable.
   */
  long_query_time?: number;
}
/**
 * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed database.
 */
export interface DevModeConfig {
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
   */
  remote?: boolean;
}
/**
 * #### HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.
 *
 * ---
 *
 * Routes requests to containers or Lambda functions based on path, host, headers, or query params.
 * More cost-effective than API Gateway above ~500k requests/day. AWS Free Tier eligible.
 */
export interface ApplicationLoadBalancer {
  type: "application-load-balancer";
  properties?: ApplicationLoadBalancerProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface ApplicationLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only). Internal ALBs are not reachable from the internet.
   */
  interface?: "internal" | "internet";
  /**
   * #### Custom domains.
   *
   * ---
   *
   * By default, Stacktape creates DNS records and TLS certificates for each domain.
   * If you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.
   *
   * Backward compatible format `string[]` is still supported.
   */
  customDomains?: string[] | DomainConfiguration[];
  /**
   * #### Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS).
   */
  listeners?: ApplicationLoadBalancerListener[];
  cdn?: ApplicationLoadBalancerCdnConfiguration;
  /**
   * #### Alarms for this load balancer (merged with global alarms from the Stacktape Console).
   */
  alarms?: ApplicationLoadBalancerAlarm[];
  /**
   * #### Global alarm names to exclude from this load balancer.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Name of a `web-app-firewall` resource to protect this load balancer from common web exploits.
   */
  useFirewall?: string;
}
export interface ApplicationLoadBalancerListener {
  /**
   * #### Listener protocol. `HTTPS` requires a TLS certificate (auto-created with `customDomains` or via `customCertificateArns`).
   */
  protocol: "HTTP" | "HTTPS";
  /**
   * #### Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP).
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` (Stacktape creates certs automatically).
   */
  customCertificateArns?: string[];
  /**
   * #### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.
   */
  whitelistIps?: string[];
  defaultAction?: LbRedirect;
}
/**
 * #### Action for requests that don't match any integration. Currently supports `redirect` only.
 */
export interface LbRedirect {
  /**
   * #### The type of the default action.
   */
  type: "redirect";
  /**
   * #### Configures where to redirect the request.
   *
   * ---
   *
   * A redirect changes the URI, which has the format: `protocol://hostname:port/path?query`.
   * Unmodified URI components will retain their original values.
   *
   * To avoid redirect loops, ensure that you sufficiently modify the URI.
   * You can reuse URI components with the following keywords: `#{protocol}`, `#{host}`, `#{port}`, `#{path}` (the leading `/` is removed), and `#{query}`.
   *
   * For example, you can change the path to `/new/#{path}`, the hostname to `example.#{host}`, or the query to `#{query}&value=xyz`.
   */
  properties: {
    /**
     * #### Redirect path (must start with `/`). Use `#{path}` to reuse the original path.
     */
    path?: string;
    /**
     * #### Query string for the redirect (without leading `?`). Use `#{query}` to preserve the original.
     */
    query?: string;
    /**
     * #### Redirect port (1-65535). Use `#{port}` to keep the original.
     */
    port?: number;
    /**
     * #### Redirect hostname. Use `#{host}` to keep the original.
     */
    host?: string;
    /**
     * #### Redirect protocol. Cannot redirect HTTPS to HTTP.
     */
    protocol?: "HTTP" | "HTTPS";
    /**
     * #### `HTTP_301` (permanent) or `HTTP_302` (temporary) redirect.
     */
    statusCode: "HTTP_301" | "HTTP_302";
  };
}
/**
 * #### Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide.
 */
export interface ApplicationLoadBalancerCdnConfiguration {
  /**
   * #### Listener port for CDN traffic. Only needed if using custom listeners.
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
   */
  originDomainName?: string;
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   */
  enabled: boolean;
  cachingOptions?: CdnCachingOptions2;
  forwardingOptions?: CdnForwardingOptions2;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  edgeFunctions?: EdgeFunctionsConfig2;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}
/**
 * #### Control how long and what gets cached at the CDN edge.
 *
 * ---
 *
 * When the origin response has no `Cache-Control` header, defaults apply:
 * - **Bucket origins**: cached for 6 months (or until invalidated on deploy).
 * - **API Gateway / Load Balancer origins**: not cached.
 */
export interface CdnCachingOptions2 {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
/**
 * #### Control which headers, cookies, and query params are forwarded to your origin.
 *
 * ---
 *
 * By default, all headers/cookies/query params are forwarded. Use this to restrict
 * what reaches your app (e.g., strip cookies for static content).
 */
export interface CdnForwardingOptions2 {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
   */
  allowedMethods?: ("DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT")[];
  cookies?: ForwardCookies;
  headers?: ForwardHeaders;
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
   */
  originRequestPolicyId?: string;
}
/**
 * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
 *
 * ---
 *
 * - `onRequest`: Before cache lookup — modify the request, add auth, or return early.
 * - `onResponse`: Before returning to the client — modify headers, add cookies.
 */
export interface EdgeFunctionsConfig2 {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}
/**
 * #### TCP/TLS load balancer for non-HTTP traffic (MQTT, game servers, custom protocols).
 *
 * ---
 *
 * Handles millions of connections with ultra-low latency. Use when you need raw TCP/TLS
 * instead of HTTP routing. Does not support CDN, firewall, or gradual deployments.
 */
export interface NetworkLoadBalancer {
  type: "network-load-balancer";
  properties: NetworkLoadBalancerProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface NetworkLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only).
   */
  interface?: "internal" | "internet";
  /**
   * #### Custom domains.
   *
   * ---
   *
   * By default, Stacktape creates DNS records and TLS certificates for each domain.
   * If you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.
   *
   * Backward compatible format `string[]` is still supported.
   */
  customDomains?: string[] | DomainConfiguration[];
  /**
   * #### Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on.
   */
  listeners: NetworkLoadBalancerListener[];
}
export interface NetworkLoadBalancerListener {
  /**
   * #### `TCP` (raw) or `TLS` (encrypted). TLS requires a certificate (auto-created with `customDomains` or via `customCertificateArns`).
   */
  protocol: "TCP" | "TLS";
  /**
   * #### Port this listener accepts traffic on.
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` or TCP protocol.
   */
  customCertificateArns?: string[];
  /**
   * #### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.
   */
  whitelistIps?: string[];
}
/**
 * #### Serverless HTTP API with pay-per-request pricing (~$1/million requests).
 *
 * ---
 *
 * Routes HTTP requests to Lambda functions, containers, or other backends.
 * No servers to manage. Includes built-in throttling, CORS, and TLS.
 */
export interface HttpApiGateway {
  type: "http-api-gateway";
  properties?: HttpApiGatewayProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface HttpApiGatewayProps {
  /**
   * #### Lambda event payload format. `2.0` is simpler and recommended for new projects.
   *
   * ---
   *
   * Only used if not overridden at the integration level.
   */
  payloadFormat?: "1.0" | "2.0";
  cors?: HttpApiCorsConfig1;
  logging?: HttpApiAccessLogsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  cdn?: CdnConfiguration1;
  /**
   * #### Alarms for this API Gateway (merged with global alarms from the Stacktape Console).
   */
  alarms?: HttpApiGatewayAlarm[];
  /**
   * #### Global alarm names to exclude from this API Gateway.
   */
  disabledGlobalAlarms?: string[];
}
/**
 * #### CORS settings. Overrides any CORS headers from your application code.
 */
export interface HttpApiCorsConfig1 {
  /**
   * #### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers in CORS preflight.
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods. Auto-detected from integrations if not set.
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies/auth headers in cross-origin requests.
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}
/**
 * #### Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`.
 */
export interface HttpApiAccessLogsConfig {
  /**
   * #### Disable access logging.
   */
  disabled?: boolean;
  /**
   * #### Log format. Logs include: requestId, IP, method, status, protocol, responseLength.
   */
  format?: "CLF" | "CSV" | "JSON" | "XML";
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide.
 */
export interface CdnConfiguration1 {
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   */
  enabled: boolean;
  cachingOptions?: CdnCachingOptions;
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  edgeFunctions?: EdgeFunctionsConfig1;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}
/**
 * #### S3 storage bucket for files, images, backups, or any binary data.
 *
 * ---
 *
 * Pay only for what you store and transfer. Highly durable (99.999999999%).
 */
export interface Bucket {
  type: "bucket";
  properties?: BucketProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface BucketProps {
  directoryUpload?: DirectoryUpload;
  accessibility?: BucketAccessibility;
  cors?: BucketCorsConfig;
  /**
   * #### Keep previous versions of overwritten/deleted objects. Helps recover from mistakes.
   */
  versioning?: boolean;
  /**
   * #### Encrypt stored objects at rest (AES-256).
   */
  encryption?: boolean;
  /**
   * #### Auto-delete or move objects to cheaper storage classes over time.
   *
   * ---
   *
   * Use to control storage costs: expire old files, archive infrequently accessed data,
   * or clean up incomplete uploads.
   */
  lifecycleRules?: (
    | Expiration
    | NonCurrentVersionExpiration
    | ClassTransition
    | NonCurrentVersionClassTransition
    | AbortIncompleteMultipartUpload
  )[];
  /**
   * #### Send events (object created, deleted, etc.) to EventBridge for event-driven workflows.
   */
  enableEventBusNotifications?: boolean;
  cdn?: BucketCdnConfiguration;
}
/**
 * #### Sync a local directory to this bucket on every deploy.
 *
 * ---
 *
 * > **Warning:** Replaces all existing bucket contents. Don't use for buckets
 * > with user-uploaded or application-generated files.
 */
export interface DirectoryUpload {
  /**
   * #### Path to the local directory to upload (relative to project root).
   *
   * ---
   *
   * The bucket will mirror this directory exactly — existing files not in the directory are deleted.
   */
  directoryPath: string;
  /**
   * #### Set HTTP headers or tags on files matching specific patterns.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Glob patterns for files to skip during upload (relative to `directoryPath`).
   */
  excludeFilesPatterns?: string[];
  /**
   * #### Preset for HTTP caching headers, optimized for your frontend framework.
   *
   * ---
   *
   * - **`single-page-app`**: HTML never cached, hashed assets cached forever. For React/Vue/Angular SPAs.
   * - **`static-website`**: CDN-cached, never browser-cached. For generic static sites.
   * - **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**: Framework-specific
   *   caching (hashed build assets cached forever, HTML always fresh).
   *
   * Override individual files with `fileOptions`.
   */
  headersPreset?:
    | "astro-static-website"
    | "gatsby-static-website"
    | "nuxt-static-website"
    | "single-page-app"
    | "static-website"
    | "sveltekit-static-website";
  /**
   * #### Disable faster uploads via S3 Transfer Acceleration. Saves a small per-GB cost.
   */
  disableS3TransferAcceleration?: boolean;
}
export interface DirectoryUploadFilter {
  /**
   * #### Glob pattern for files this rule applies to (e.g., `*.html`, `assets/**`).
   */
  includePattern: string;
  /**
   * #### Glob pattern for files to exclude even if they match `includePattern`.
   */
  excludePattern?: string;
  /**
   * #### HTTP headers (e.g., `Cache-Control`) for matching files. Forwarded through CDN to the browser.
   */
  headers?: KeyValuePair[];
  /**
   * #### Tags for matching files. Can be used to target files with `lifecycleRules`.
   */
  tags?: KeyValuePair[];
}
export interface KeyValuePair {
  /**
   * #### Key
   */
  key: string;
  /**
   * #### Value
   */
  value: string;
}
/**
 * #### Who can read/write to this bucket: `private` (default), `public-read`, or `public-read-write`.
 */
export interface BucketAccessibility {
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
   */
  accessibilityMode: "private" | "public-read" | "public-read-write";
  /**
   * #### Advanced access configuration that leverages IAM policy statements.
   *
   * ---
   *
   * This gives you fine-grained access control over the bucket.
   */
  accessPolicyStatements?: BucketPolicyIamRoleStatement[];
}
export interface BucketPolicyIamRoleStatement {
  Principal: any;
  /**
   * #### Optional identifier for this statement (for readability).
   */
  Sid?: string;
  /**
   * #### Whether to allow or deny the specified actions.
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
/**
 * #### CORS settings for browser-based access to the bucket.
 */
export interface BucketCorsConfig {
  /**
   * #### Enable CORS. When `true` with no rules, uses permissive defaults (`*` origins, all methods).
   */
  enabled: boolean;
  /**
   * #### Custom CORS rules. First matching rule wins for each preflight request.
   */
  corsRules?: BucketCorsRule[];
}
export interface BucketCorsRule {
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any.
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers.
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods.
   */
  allowedMethods?: ("*" | "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT")[];
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}
export interface Expiration {
  type: "expiration";
  properties: ExpirationProps;
}
export interface ExpirationProps {
  /**
   * #### Delete objects this many days after upload.
   */
  daysAfterUpload: number;
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   */
  tags?: KeyValuePair[];
}
export interface NonCurrentVersionExpiration {
  type: "non-current-version-expiration";
  properties: NonCurrentVersionExpirationProps;
}
export interface NonCurrentVersionExpirationProps {
  /**
   * #### Delete old versions this many days after they become non-current. Requires `versioning: true`.
   */
  daysAfterVersioned: number;
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   */
  tags?: KeyValuePair[];
}
export interface ClassTransition {
  type: "class-transition";
  properties: ClassTransitionProps;
}
export interface ClassTransitionProps {
  /**
   * #### Move objects to a cheaper storage class this many days after upload.
   */
  daysAfterUpload: number;
  /**
   * #### Target storage class. Cheaper classes have higher retrieval costs/latency.
   *
   * ---
   *
   * - `STANDARD_IA` / `ONEZONE_IA`: Infrequent access, instant retrieval.
   * - `INTELLIGENT_TIERING`: AWS auto-moves between tiers based on access patterns.
   * - `GLACIER`: Archive, minutes to hours for retrieval.
   * - `DEEP_ARCHIVE`: Cheapest, 12+ hours for retrieval.
   */
  storageClass: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   */
  tags?: KeyValuePair[];
}
export interface NonCurrentVersionClassTransition {
  type: "non-current-version-class-transition";
  properties: NonCurrentVersionClassTransitionProps;
}
export interface NonCurrentVersionClassTransitionProps {
  /**
   * #### Move old versions to a cheaper storage class this many days after becoming non-current.
   */
  daysAfterVersioned: number;
  /**
   * #### Target storage class for non-current versions.
   */
  storageClass: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   */
  tags?: KeyValuePair[];
}
export interface AbortIncompleteMultipartUpload {
  type: "abort-incomplete-multipart-upload";
  properties: AbortIncompleteMultipartUploadProps;
}
export interface AbortIncompleteMultipartUploadProps {
  /**
   * #### Clean up incomplete multipart uploads after this many days. Prevents storage waste.
   */
  daysAfterInitiation: number;
  /**
   * #### Only apply this rule to objects with this key prefix (e.g., `logs/`, `uploads/`).
   */
  prefix?: string;
  /**
   * #### Only apply this rule to objects with these tags.
   */
  tags?: KeyValuePair[];
}
/**
 * #### Put a CDN (CloudFront) in front of this bucket for faster downloads and lower bandwidth costs.
 */
export interface BucketCdnConfiguration {
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
   */
  disableUrlNormalization?: boolean;
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   */
  enabled: boolean;
  cachingOptions?: CdnCachingOptions3;
  forwardingOptions?: CdnForwardingOptions3;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  edgeFunctions?: EdgeFunctionsConfig3;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}
/**
 * #### Control how long and what gets cached at the CDN edge.
 *
 * ---
 *
 * When the origin response has no `Cache-Control` header, defaults apply:
 * - **Bucket origins**: cached for 6 months (or until invalidated on deploy).
 * - **API Gateway / Load Balancer origins**: not cached.
 */
export interface CdnCachingOptions3 {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
/**
 * #### Control which headers, cookies, and query params are forwarded to your origin.
 *
 * ---
 *
 * By default, all headers/cookies/query params are forwarded. Use this to restrict
 * what reaches your app (e.g., strip cookies for static content).
 */
export interface CdnForwardingOptions3 {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
   */
  allowedMethods?: ("DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT")[];
  cookies?: ForwardCookies;
  headers?: ForwardHeaders;
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
   */
  originRequestPolicyId?: string;
}
/**
 * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
 *
 * ---
 *
 * - `onRequest`: Before cache lookup — modify the request, add auth, or return early.
 * - `onResponse`: Before returning to the client — modify headers, add cookies.
 */
export interface EdgeFunctionsConfig3 {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}
/**
 * #### A resource for managing user authentication and authorization.
 *
 * ---
 *
 * A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
 * It provides a secure and scalable way to manage user identities for your applications.
 */
export interface UserAuthPool {
  type: "user-auth-pool";
  properties?: UserAuthPoolProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface UserAuthPoolProps {
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
  hooks?: UserPoolHooks;
  emailConfiguration?: EmailConfiguration;
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
  userVerificationType?: "email-code" | "email-link" | "none" | "sms";
  userVerificationMessageConfig?: UserVerificationMessageConfig;
  mfaConfiguration?: MfaConfiguration;
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
   */
  allowOnlyExternalIdentityProviders?: boolean;
}
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
export interface UserPoolHooks {
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
export interface EmailConfiguration {
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
export interface InviteMessageConfig {
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
/**
 * #### Verification message text
 *
 * ---
 *
 * Lets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.
 * For example, you can change subjects, body text, or the message that contains the `{####}` verification code.
 */
export interface UserVerificationMessageConfig {
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
export interface MfaConfiguration {
  /**
   * #### MFA requirement
   *
   * - `OFF`: MFA is completely disabled.
   * - `ON`: All users must complete MFA during sign‑in.
   * - `OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.
   *
   * This value configures the Cognito `MfaConfiguration` property.
   */
  status?: "OFF" | "ON" | "OPTIONAL";
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
  enabledTypes?: ("EMAIL_OTP" | "SMS" | "SOFTWARE_TOKEN")[];
}
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
export interface PasswordPolicy {
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
export interface AttributeSchema {
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
export interface IdentityProvider {
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
  type: "Facebook" | "Google" | "LoginWithAmazon" | "OIDC" | "SAML" | "SignInWithApple";
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
  attributeMapping?: {
    [k: string]: string;
  };
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
  providerDetails?: RecordStringAny;
}
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
export interface RecordStringAny {}
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
export interface UserPoolCustomDomainConfiguration {
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
   */
  disableDnsRecordCreation?: boolean;
}
/**
 * #### Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.
 *
 * ---
 *
 * Use to build event-driven architectures where producers and consumers are independent.
 * Functions, batch jobs, and other resources can subscribe to specific event patterns.
 */
export interface EventBus {
  type: "event-bus";
  properties?: EventBusProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface EventBusProps {
  /**
   * #### Partner event source name. Only needed for receiving events from third-party SaaS integrations.
   */
  eventSourceName?: string;
  archivation?: EventBusArchivation;
}
/**
 * #### Archive events to store and replay them later. Useful for debugging, testing, or error recovery.
 */
export interface EventBusArchivation {
  /**
   * #### Enable event archiving. Disabling deletes the archive.
   */
  enabled: boolean;
  /**
   * #### Days to keep archived events. Omit to keep indefinitely.
   */
  retentionDays?: number;
}
/**
 * #### Secure jump box for accessing private resources (databases, Redis, OpenSearch) in your VPC.
 *
 * ---
 *
 * Uses keyless SSH via AWS Systems Manager — no SSH keys to manage. Connect with `stacktape bastion:ssh`
 * or create port-forwarding tunnels with `stacktape bastion:tunnel`. Costs ~$4/month (t3.micro).
 */
export interface Bastion {
  type: "bastion";
  properties?: BastionProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface BastionProps {
  /**
   * #### EC2 instance type. `t3.micro` is sufficient for SSH tunneling and basic admin tasks.
   */
  instanceSize?: string;
  /**
   * #### Shell commands to run when the instance starts (as root — no `sudo` needed).
   *
   * ---
   *
   * Use to install CLI tools, database clients, or other dependencies.
   * **Warning:** changing this list after creation replaces the instance — any data on the old instance is lost.
   */
  runCommandsAtLaunch?: string[];
  logging?: BastionLoggingConfig;
}
/**
 * #### Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch.
 */
export interface BastionLoggingConfig {
  messages?: BastionLogging;
  secure?: BastionLogging1;
  audit?: BastionLogging2;
}
/**
 * #### Serverless NoSQL database with single-digit millisecond reads/writes at any scale.
 *
 * ---
 *
 * No servers to manage, no capacity planning needed (in on-demand mode). Pay per read/write.
 * Great for user profiles, session data, IoT data, and any key-value or document workload.
 */
export interface DynamoDbTable {
  type: "dynamo-db-table";
  properties: DynamoDbTableProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface DynamoDbTableProps {
  primaryKey: DynamoDbTablePrimaryKey;
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /**
   * #### Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days).
   *
   * ---
   *
   * Restores always create a new table. Adds ~20% to storage cost.
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Stream item changes to trigger functions or batch jobs in real time.
   *
   * ---
   *
   * - `KEYS_ONLY`: Only key attributes of the changed item.
   * - `NEW_IMAGE`: The full item after the change.
   * - `OLD_IMAGE`: The full item before the change.
   * - `NEW_AND_OLD_IMAGES`: Both before and after — useful for change tracking and auditing.
   */
  streamType?: "KEYS_ONLY" | "NEW_AND_OLD_IMAGES" | "NEW_IMAGE" | "OLD_IMAGE";
  /**
   * #### Additional indexes for querying by attributes other than the primary key.
   *
   * ---
   *
   * Without indexes, you can only query by primary key. Add a secondary index to query by
   * any attribute (e.g., query orders by `status` or users by `email`).
   */
  secondaryIndexes?: DynamoDbTableGlobalSecondaryIndex[];
  dev?: DevModeConfig1;
}
/**
 * #### The primary key that uniquely identifies each item.
 *
 * ---
 *
 * - **Simple key**: Just a `partitionKey` (e.g., `userId`).
 * - **Composite key**: `partitionKey` + `sortKey` (e.g., `userId` + `createdAt`).
 *
 * > **Cannot be changed after creation.** Every item must include the primary key attribute(s).
 */
export interface DynamoDbTablePrimaryKey {
  partitionKey: DynamoDbAttribute;
  sortKey?: DynamoDbAttribute1;
}
/**
 * #### The main key attribute (e.g., `userId`, `orderId`). Must be unique if no sort key is used.
 */
export interface DynamoDbAttribute {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   */
  type: "binary" | "number" | "string";
}
/**
 * #### Optional second key for composite keys. Enables range queries and multiple items per partition key.
 *
 * ---
 *
 * E.g., partition key `userId` + sort key `createdAt` lets you query all items for a user sorted by date.
 */
export interface DynamoDbAttribute1 {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   */
  type: "binary" | "number" | "string";
}
/**
 * #### Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode.
 *
 * ---
 *
 * - **On-demand** (default, no config): Pay per read/write. Best for unpredictable or variable traffic.
 * - **Provisioned**: Set fixed read/write capacity. Cheaper at steady, predictable load. Can auto-scale.
 */
export interface DynamoDbProvisionedThroughput {
  /**
   * #### Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent).
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `readScaling` to auto-adjust.
   */
  readUnits: number;
  /**
   * #### Write capacity units per second. 1 unit = one 1 KB write.
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `writeScaling` to auto-adjust.
   */
  writeUnits: number;
  writeScaling?: DynamoDbWriteScaling;
  readScaling?: DynamoDbReadScaling;
}
/**
 * #### Auto-scale write capacity based on actual usage. Scales up/down between min and max units.
 */
export interface DynamoDbWriteScaling {
  /**
   * #### Minimum write units. Capacity never scales below this.
   */
  minUnits: number;
  /**
   * #### Maximum write units. Capacity never scales above this.
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   */
  keepUtilizationUnder: number;
}
/**
 * #### Auto-scale read capacity based on actual usage. Scales up/down between min and max units.
 */
export interface DynamoDbReadScaling {
  /**
   * #### Minimum read units. Capacity never scales below this.
   */
  minUnits: number;
  /**
   * #### Maximum read units. Capacity never scales above this.
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   */
  keepUtilizationUnder: number;
}
export interface DynamoDbTableGlobalSecondaryIndex {
  /**
   * #### Name of the index (used when querying).
   */
  name: string;
  partitionKey: DynamoDbAttribute2;
  sortKey?: DynamoDbAttribute3;
  /**
   * #### Extra attributes to copy into the index. Only projected attributes are available when querying.
   *
   * ---
   *
   * The table's primary key is always projected. List additional attributes you need in query results.
   */
  projections?: string[];
}
/**
 * #### Partition key for this index — the attribute you'll query by.
 */
export interface DynamoDbAttribute2 {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   */
  type: "binary" | "number" | "string";
}
/**
 * #### Optional sort key for range queries within a partition.
 */
export interface DynamoDbAttribute3 {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   */
  type: "binary" | "number" | "string";
}
/**
 * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed table.
 */
export interface DevModeConfig1 {
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
   */
  remote?: boolean;
}
/**
 * #### Visual workflow engine for orchestrating Lambda functions, API calls, and other AWS services.
 *
 * ---
 *
 * Define multi-step workflows with branching, retries, parallel execution, and error handling —
 * all without writing orchestration code. Pay per state transition (~$0.025/1,000 transitions).
 * Defined using [Amazon States Language (ASL)](https://states-language.net/spec.html).
 */
export interface StateMachine {
  type: "state-machine";
  properties: StateMachineProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface StateMachineProps {
  definition: StateMachineDefinition;
}
/**
 * #### The workflow definition in [Amazon States Language (ASL)](https://states-language.net/spec.html).
 */
export interface StateMachineDefinition {
  /**
   * #### A human-readable description of the state machine.
   */
  Comment?: string;
  /**
   * #### The name of the state to start the execution at.
   */
  StartAt: string;
  /**
   * #### An object containing the states of the state machine.
   */
  States: {
    [k: string]: State;
  };
  /**
   * #### The version of the Amazon States Language.
   */
  Version?: string;
  /**
   * #### The maximum time, in seconds, that a state machine can run.
   */
  TimeoutSeconds?: number;
}
export interface Choice {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  Choices: Operator[];
  Default?: string;
}
export interface Operator {
  Variable?: string;
  Next?: string;
  And?: Operator[];
  Or?: Operator[];
  Not?: Operator;
  BooleanEquals?: boolean;
  NumericEquals?: number;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThan?: number;
  NumericLessThanEquals?: number;
  StringEquals?: string;
  StringGreaterThan?: string;
  StringGreaterThanEquals?: string;
  StringLessThan?: string;
  StringLessThanEquals?: string;
  TimestampEquals?: string;
  TimestampGreaterThan?: string;
  TimestampGreaterThanEquals?: string;
  TimestampLessThan?: string;
  TimestampLessThanEquals?: string;
  [k: string]: any;
}
export interface Fail {
  Type: string;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  Cause?: string;
  Error?: string;
}
export interface StateMachineMap {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  ResultPath?: string;
  ItemsPath?: string;
  MaxConcurrency?: number;
  Iterator: StpStateMachine;
  Parameters?: any;
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
}
export interface StpStateMachine {
  name: string;
  type: "state-machine";
  configParentResourceType: "state-machine";
  nameChain: string[];
}
export interface Parallel {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  ResultPath?: string;
  Branches: StpStateMachine[];
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
}
export interface Pass {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  ResultPath?: string;
  Parameters?: any;
  Result?: any;
}
export interface Succeed {
  Type: string;
  Comment?: string;
}
export interface Task {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  Resource:
    | {
        [k: string]: any;
      }
    | string;
  ResultPath?: string;
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
  TimeoutSeconds?: number;
  HeartbeatSeconds?: number;
  Parameters?: any;
}
export interface Wait {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string;
  InputPath?: string;
  Seconds?: number;
  Timestamp?: string;
  SecondsPath?: string;
  TimestampPath?: string;
}
/**
 * #### Managed MongoDB database (Atlas) deployed into your AWS account and managed within your stack.
 *
 * ---
 *
 * Document database with flexible schemas — great for content management, user profiles, catalogs, and apps
 * where your data model evolves. Starts at M2 (shared, ~$9/month) or M10 (dedicated, ~$57/month).
 */
export interface MongoDbAtlasCluster {
  type: "mongo-db-atlas-cluster";
  properties: MongoDbAtlasClusterProps;
}
export interface MongoDbAtlasClusterProps {
  /**
   * #### Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default.
   */
  diskSizeGB?: number;
  /**
   * #### Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups).
   */
  clusterTier:
    | "M10"
    | "M100"
    | "M140"
    | "M2"
    | "M20"
    | "M200"
    | "M200 Low-CPU (R200)"
    | "M200_NVME"
    | "M30"
    | "M300"
    | "M300 Low-CPU (R300)"
    | "M40"
    | "M40 Low-CPU (R40)"
    | "M400"
    | "M400 Low-CPU (R400)"
    | "M400_NVME"
    | "M40_NVME"
    | "M5"
    | "M50"
    | "M50 Low-CPU (R50)"
    | "M50_NVME"
    | "M60"
    | "M60 Low-CPU (R60)"
    | "M60_NVME"
    | "M700"
    | "M700 Low-CPU (R700)"
    | "M80"
    | "M80 Low-CPU (R80)"
    | "M80_NVME";
  /**
   * #### MongoDB engine version.
   */
  version?: "5.0" | "6.0" | "7.0";
  /**
   * #### Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+.
   */
  numShards?: number;
  replication?: MongoDbReplication;
  /**
   * #### Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules.
   */
  enableBackups?: boolean;
  /**
   * #### Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+.
   */
  enablePointInTimeRecovery?: boolean;
  biConnector?: MongoDbBiConnector;
  autoScaling?: MongoDbAutoScaling;
  adminUserCredentials?: MongoDbAdminUserCredentials;
}
/**
 * #### Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes.
 */
export interface MongoDbReplication {
  /**
   * #### Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance.
   */
  numAnalyticsNodes?: number;
  /**
   * #### Nodes that can become primary. More = better redundancy. Must be odd.
   */
  numElectableNodes?: 3 | 5 | 7;
  /**
   * #### Read-only replica nodes for scaling read throughput.
   */
  numReadOnlyNodes?: number;
}
/**
 * #### BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance.
 */
export interface MongoDbBiConnector {
  /**
   * #### Which node type the BI Connector reads from. Use `analytics` to avoid impacting production queries.
   */
  readPreference?: "analytics" | "primary" | "secondary";
  /**
   * #### Enable the BI Connector for SQL-based access.
   */
  enabled: boolean;
}
/**
 * #### Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs.
 *
 * ---
 *
 * Scales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours.
 */
export interface MongoDbAutoScaling {
  /**
   * #### Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up.
   */
  minClusterTier?:
    | "M10"
    | "M100"
    | "M140"
    | "M20"
    | "M200"
    | "M200 Low-CPU (R200)"
    | "M200_NVME"
    | "M30"
    | "M300"
    | "M300 Low-CPU (R300)"
    | "M40"
    | "M40 Low-CPU (R40)"
    | "M400 Low-CPU (R400)"
    | "M400_NVME"
    | "M40_NVME"
    | "M50"
    | "M50 Low-CPU (R50)"
    | "M50_NVME"
    | "M60"
    | "M60 Low-CPU (R60)"
    | "M60_NVME"
    | "M700 Low-CPU (R700)"
    | "M80"
    | "M80 Low-CPU (R80)"
    | "M80_NVME";
  /**
   * #### Highest tier the cluster can scale up to. Set a ceiling to control maximum costs.
   */
  maxClusterTier?:
    | "M10"
    | "M100"
    | "M140"
    | "M20"
    | "M200"
    | "M200 Low-CPU (R200)"
    | "M200_NVME"
    | "M30"
    | "M300"
    | "M300 Low-CPU (R300)"
    | "M40"
    | "M40 Low-CPU (R40)"
    | "M400 Low-CPU (R400)"
    | "M400_NVME"
    | "M40_NVME"
    | "M50"
    | "M50 Low-CPU (R50)"
    | "M50_NVME"
    | "M60"
    | "M60 Low-CPU (R60)"
    | "M60_NVME"
    | "M700 Low-CPU (R700)"
    | "M80"
    | "M80 Low-CPU (R80)"
    | "M80_NVME";
  /**
   * #### Prevent automatic disk expansion. By default, storage grows when usage hits 90%. Storage never scales down.
   */
  disableDiskScaling?: boolean;
  /**
   * #### Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier.
   */
  disableScaleDown?: boolean;
}
/**
 * #### Admin user for direct database access (e.g., from your local machine or admin tools).
 *
 * ---
 *
 * Not required for app-to-database access via `connectTo` — that's handled automatically.
 */
export interface MongoDbAdminUserCredentials {
  /**
   * #### Name of the admin user
   */
  userName: string;
  /**
   * #### Password for the admin user
   */
  password: string;
}
/**
 * #### In-memory data store for caching, sessions, queues, and real-time data. Sub-millisecond latency.
 */
export interface RedisCluster {
  type: "redis-cluster";
  properties: RedisClusterProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface RedisClusterProps {
  /**
   * #### Split data across multiple shards for horizontal scaling.
   *
   * ---
   *
   * Each shard has its own primary + replicas. Routing is automatic.
   *
   * > **Must be set at creation time** — can't be added later.
   * > Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.
   */
  enableSharding?: boolean;
  /**
   * #### Number of shards (only with `enableSharding: true`).
   */
  numShards?: number;
  /**
   * #### Read replicas per shard. Increases read throughput and availability.
   *
   * ---
   *
   * If the primary fails and `enableAutomaticFailover` is on, a replica takes over.
   * Can't be changed after creation for sharded clusters.
   */
  numReplicaNodes?: number;
  /**
   * #### Auto-promote a replica to primary if the primary node fails.
   *
   * ---
   *
   * Requires `numReplicaNodes >= 1`. Always enabled for sharded clusters.
   *
   * > Deploy replicas first, then enable failover in a separate deployment.
   */
  enableAutomaticFailover?: boolean;
  /**
   * #### The size of each Redis node. Affects memory, performance, and cost.
   *
   * ---
   *
   * **Quick guide:**
   * - **`cache.t4g.micro`** (~$0.016/hr, 0.5 GB): Development, testing, low-traffic apps.
   * - **`cache.t4g.small`** (~$0.032/hr, 1.37 GB): Small production apps, session stores.
   * - **`cache.m7g.large`** (~$0.15/hr, 6.38 GB): Production workloads with moderate data.
   * - **`cache.r7g.large`** (~$0.20/hr, 13.07 GB): Large datasets, memory-heavy caching.
   *
   * **Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.
   * Suffix `g` = ARM/Graviton (better price-performance).
   *
   * This size applies to every node (primary + replicas). You can change it later without data loss.
   */
  instanceSize:
    | "cache.m4.10xlarge"
    | "cache.m4.2xlarge"
    | "cache.m4.4xlarge"
    | "cache.m4.large"
    | "cache.m4.xlarge"
    | "cache.m5.12xlarge"
    | "cache.m5.24xlarge"
    | "cache.m5.2xlarge"
    | "cache.m5.4xlarge"
    | "cache.m5.large"
    | "cache.m5.xlarge"
    | "cache.m6g.12xlarge"
    | "cache.m6g.16xlarge"
    | "cache.m6g.2xlarge"
    | "cache.m6g.4xlarge"
    | "cache.m6g.8xlarge"
    | "cache.m6g.large"
    | "cache.m6g.xlarge"
    | "cache.m7g.12xlarge"
    | "cache.m7g.16xlarge"
    | "cache.m7g.2xlarge"
    | "cache.m7g.4xlarge"
    | "cache.m7g.8xlarge"
    | "cache.m7g.large"
    | "cache.m7g.xlarge"
    | "cache.r4.16xlarge"
    | "cache.r4.2xlarge"
    | "cache.r4.4xlarge"
    | "cache.r4.8xlarge"
    | "cache.r4.large"
    | "cache.r4.xlarge"
    | "cache.r5.12xlarge"
    | "cache.r5.24xlarge"
    | "cache.r5.2xlarge"
    | "cache.r5.4xlarge"
    | "cache.r5.large"
    | "cache.r5.xlarge"
    | "cache.r6g.12xlarge"
    | "cache.r6g.16xlarge"
    | "cache.r6g.2xlarge"
    | "cache.r6g.4xlarge"
    | "cache.r6g.8xlarge"
    | "cache.r6g.large"
    | "cache.r6g.xlarge"
    | "cache.r7g.12xlarge"
    | "cache.r7g.16xlarge"
    | "cache.r7g.2xlarge"
    | "cache.r7g.4xlarge"
    | "cache.r7g.8xlarge"
    | "cache.r7g.large"
    | "cache.r7g.xlarge"
    | "cache.t2.medium"
    | "cache.t2.micro"
    | "cache.t2.small"
    | "cache.t3.medium"
    | "cache.t3.micro"
    | "cache.t3.small"
    | "cache.t4g.medium"
    | "cache.t4g.micro"
    | "cache.t4g.small";
  logging?: RedisLogging;
  /**
   * #### Days to keep automated daily backups. Set to 0 to disable.
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### Port the cluster listens on.
   */
  port?: number;
  /**
   * #### Cluster password. 16-128 chars, printable ASCII only. Cannot contain `/`, `"`, or `@`.
   *
   * ---
   *
   * All traffic is encrypted in transit. Use `$Secret()` instead of hardcoding:
   * ```yaml
   * defaultUserPassword: $Secret('redis.password')
   * ```
   */
  defaultUserPassword: string;
  accessibility?: RedisAccessibility;
  /**
   * #### Redis engine version.
   */
  engineVersion?: "6.0" | "6.2" | "7.0" | "7.1";
  dev?: DevModeConfig2;
}
/**
 * #### Slow query logging. Sent to CloudWatch; view with `stacktape logs`.
 */
export interface RedisLogging {
  /**
   * #### Disable slow query logging.
   */
  disabled?: boolean;
  /**
   * #### Log format.
   */
  format?: "json" | "text";
  /**
   * #### How many days to keep logs.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive).
 */
export interface RedisAccessibility {
  /**
   * #### Who can connect to this cluster.
   *
   * ---
   *
   * - **`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
   * - **`scoping-workloads-in-vpc`**: Only resources that list this cluster in their `connectTo`.
   *
   * Redis clusters don't have public IPs — you can't connect from your local machine directly.
   * Use a bastion host for local access.
   */
  accessibilityMode: "scoping-workloads-in-vpc" | "vpc";
}
/**
 * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cluster.
 */
export interface DevModeConfig2 {
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
   */
  remote?: boolean;
}
/**
 * #### An instance of a `custom-resource-definition`. Pass properties to the backing Lambda function.
 */
export interface CustomResourceInstance {
  type: "custom-resource-instance";
  properties: CustomResourceInstanceProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface CustomResourceInstanceProps {
  /**
   * #### Name of the `custom-resource-definition` in your config that provides the backing Lambda.
   */
  definitionName: string;
  /**
   * #### Key-value pairs passed to the Lambda function during create/update/delete events.
   */
  resourceProperties: any;
}
/**
 * #### Lambda-backed provisioning logic for resources not natively supported by Stacktape/CloudFormation.
 *
 * ---
 *
 * Your Lambda function runs on stack create, update, and delete events to manage external resources
 * (third-party APIs, SaaS services, custom infrastructure). Pair with `custom-resource-instance` to use.
 */
export interface CustomResourceDefinition {
  type: "custom-resource-definition";
  properties: CustomResourceDefinitionProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface CustomResourceDefinitionProps {
  /**
   * #### How the Lambda function code is packaged and deployed.
   */
  packaging: StpBuildpackLambdaPackaging | CustomArtifactLambdaPackaging;
  /**
   * #### Environment variables injected into the Lambda function. Use `$ResourceParam()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   */
  runtime?:
    | "dotnet6"
    | "dotnet7"
    | "dotnet8"
    | "java11"
    | "java17"
    | "java8"
    | "java8.al2"
    | "nodejs18.x"
    | "nodejs20.x"
    | "nodejs22.x"
    | "nodejs24.x"
    | "provided.al2"
    | "provided.al2023"
    | "python3.10"
    | "python3.11"
    | "python3.12"
    | "python3.13"
    | "python3.8"
    | "python3.9"
    | "ruby3.3";
  /**
   * #### Max execution time in seconds. Max: 900.
   */
  timeout?: number;
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
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
export interface StpBuildpackLambdaPackaging {
  type: "stacktape-lambda-buildpack";
  properties: StpBuildpackLambdaPackagingProps;
}
export interface StpBuildpackLambdaPackagingProps {
  /**
   * #### The name of the handler function to be executed when the Lambda is invoked.
   */
  handlerFunction?: string;
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
   * For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).
   */
  entryfilePath: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
   */
  excludeFiles?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
   */
  excludeDependencies?: string[];
  /**
   * #### Language-specific packaging configuration.
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
}
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
export interface CustomArtifactLambdaPackaging {
  type: "custom-artifact";
  properties: CustomArtifactLambdaPackagingProps;
}
export interface CustomArtifactLambdaPackagingProps {
  /**
   * #### The path to a pre-built deployment package.
   *
   * ---
   *
   * If the path points to a directory or a non-zip file, Stacktape will automatically zip it for you.
   */
  packagePath: string;
  /**
   * #### The handler function to be executed when the Lambda is invoked.
   *
   * ---
   *
   * The syntax is `{{filepath}}:{{functionName}}`.
   *
   * Example: `my-lambda/index.js:default`
   */
  handler?: string;
}
/**
 * #### Serverless Redis by Upstash — pay-per-request with no idle costs.
 *
 * ---
 *
 * Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
 * Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.
 */
export interface UpstashRedis {
  type: "upstash-redis";
  properties?: UpstashRedisProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface UpstashRedisProps {
  /**
   * #### Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.
   *
   * ---
   *
   * Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads.
   */
  enableEviction?: boolean;
}
/**
 * #### Run a script during deploy or delete — database migrations, seed data, cleanup tasks.
 *
 * ---
 *
 * Executes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,
 * or `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`.
 */
export interface DeploymentScript {
  type: "deployment-script";
  properties: DeploymentScriptProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface DeploymentScriptProps {
  /**
   * #### When to run: `after:deploy` (fails → rollback) or `before:delete` (fails → deletion continues).
   */
  trigger: "after:deploy" | "before:delete";
  /**
   * #### How the script code is packaged. Use `stacktape-lambda-buildpack` for auto-bundling.
   */
  packaging: StpBuildpackLambdaPackaging | CustomArtifactLambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   */
  runtime?:
    | "dotnet6"
    | "dotnet7"
    | "dotnet8"
    | "java11"
    | "java17"
    | "java8"
    | "java8.al2"
    | "nodejs18.x"
    | "nodejs20.x"
    | "nodejs22.x"
    | "nodejs24.x"
    | "provided.al2"
    | "provided.al2023"
    | "python3.10"
    | "python3.11"
    | "python3.12"
    | "python3.13"
    | "python3.8"
    | "python3.9"
    | "ruby3.3";
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Structured data passed to the handler function as the event payload. Not for secrets — use `environment`.
   */
  parameters?: any;
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 900 (15 minutes).
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Ephemeral `/tmp` storage in MB (512–10,240).
   */
  storage?: number;
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
/**
 * #### Embed an AWS CDK construct directly in your Stacktape stack.
 *
 * ---
 *
 * Escape hatch for resources not natively supported by Stacktape. Write a CDK construct class
 * in TypeScript/JavaScript and Stacktape will synthesize and deploy it as part of your stack.
 */
export interface AwsCdkConstruct {
  type: "aws-cdk-construct";
  properties?: AwsCdkConstructProps;
}
export interface AwsCdkConstructProps {
  /**
   * #### Path to the file containing your CDK construct class.
   *
   * ---
   *
   * Supports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`.
   */
  entryfilePath: string;
  /**
   * #### Name of the exported construct class from the entry file.
   *
   * ---
   *
   * Must match the exact export name. Use this when the file has multiple exports or uses named exports.
   */
  exportName?: string;
  /**
   * #### Custom props passed to the construct's constructor.
   *
   * ---
   *
   * This object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`
   * directives here to pass dynamic values from other resources in your stack.
   */
  constructProperties?: any;
}
/**
 * #### Message queue for decoupling services. Producers send messages, consumers process them at their own pace.
 *
 * ---
 *
 * Fully managed, serverless, pay-per-message. Use for background processing, task queues, or buffering between services.
 */
export interface SqsQueue {
  type: "sqs-queue";
  properties?: SqsQueueProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface SqsQueueProps {
  /**
   * #### Delay (in seconds) before new messages become visible to consumers. Range: 0–900.
   *
   * ---
   *
   * Useful for introducing a buffer, e.g., waiting for related data to be available before processing.
   */
  delayMessagesSecond?: number;
  /**
   * #### Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB).
   *
   * ---
   *
   * Messages larger than this limit are rejected. For payloads over 256 KB, store the data in S3 and send the reference.
   */
  maxMessageSizeBytes?: number;
  /**
   * #### How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days).
   *
   * ---
   *
   * Default is 4 days (345,600s). Increase if consumers might fall behind or be temporarily offline.
   */
  messageRetentionPeriodSeconds?: number;
  /**
   * #### Seconds the queue waits for messages before returning an empty response. Range: 0–20.
   *
   * ---
   *
   * Set to `1`–`20` to enable long polling, which reduces costs by making fewer API calls.
   * With short polling (`0`), the consumer gets an immediate (often empty) response and must poll again.
   *
   * Recommended: `20` for most workloads — it's the most cost-effective.
   */
  longPollingSeconds?: number;
  /**
   * #### How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours).
   *
   * ---
   *
   * After a consumer picks up a message, it must delete it before this timeout expires — otherwise it becomes
   * visible again and can be processed by another consumer (duplicate processing).
   *
   * Set this higher than your expected processing time. If your tasks take 2 minutes, use at least 150 seconds.
   */
  visibilityTimeoutSeconds?: number;
  /**
   * #### Creates a FIFO queue that guarantees message order and exactly-once delivery.
   *
   * ---
   *
   * Use when processing order matters (e.g., financial transactions, sequential workflows).
   * FIFO queues have lower throughput (~300 msg/s without batching, ~3,000 with) compared to standard queues.
   *
   * Requires either `contentBasedDeduplication: true` or a `MessageDeduplicationId` on each message.
   */
  fifoEnabled?: boolean;
  /**
   * #### Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue).
   *
   * ---
   *
   * Messages are partitioned by `MessageGroupId` — order is guaranteed within each group but not across groups.
   * Requires `fifoEnabled: true`.
   */
  fifoHighThroughput?: boolean;
  /**
   * #### Automatically deduplicates messages based on their content (SHA-256 hash of the body).
   *
   * ---
   *
   * Within the 5-minute deduplication window, identical messages are delivered only once.
   * Saves you from having to generate a unique `MessageDeduplicationId` for each message.
   * Requires `fifoEnabled: true`.
   */
  contentBasedDeduplication?: boolean;
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
   * #### Custom access-control statements added to the queue's resource policy.
   *
   * ---
   *
   * These are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow
   * specific AWS services (e.g., SNS) to send messages to this queue.
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
/**
 * #### Moves messages that fail processing too many times to a dead-letter queue for inspection.
 *
 * ---
 *
 * After `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue
 * so you can investigate and reprocess it. Prevents poison messages from blocking the queue.
 */
export interface SqsQueueRedrivePolicy {
  /**
   * #### Name of another `sqs-queue` in your config to use as the dead-letter queue.
   */
  targetSqsQueueName?: string;
  /**
   * #### ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account.
   */
  targetSqsQueueArn?: string;
  /**
   * #### How many times a message can be received (and fail) before being moved to the dead-letter queue.
   *
   * ---
   *
   * A typical starting value is `3`–`5`. Set lower for fast-failing workloads, higher for retryable transient errors.
   */
  maxReceiveCount: number;
}
export interface SqsQueueAlarm {
  trigger: SqsQueueAlarmTrigger;
  evaluation?: AlarmEvaluation3;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}
export interface SqsQueueReceivedMessagesCountTrigger {
  type: "sqs-queue-received-messages-count";
  properties: SqsQueueReceivedMessagesCountTriggerProps;
}
export interface SqsQueueReceivedMessagesCountTriggerProps {
  /**
   * #### Fires when received message count crosses this threshold.
   *
   * ---
   *
   * Default: fires if **average** messages received per period > `thresholdCount`.
   * Customize with `statistic` and `comparisonOperator`.
   */
  thresholdCount: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
export interface SqsQueueNotEmptyTrigger {
  /**
   * #### Fires when the SQS queue has unprocessed messages.
   *
   * ---
   *
   * The queue is considered "not empty" if any of these are non-zero: visible messages,
   * in-flight messages, messages received, or messages sent.
   */
  type: "sqs-queue-not-empty";
}
/**
 * #### How long and how often to evaluate the metric before triggering.
 *
 * ---
 *
 * Controls the evaluation window (period), how many periods to look at, and how many must breach
 * the threshold to fire the alarm. Useful for filtering out short spikes.
 */
export interface AlarmEvaluation3 {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   */
  breachedPeriods?: number;
}
export interface SqsQueuePolicyStatement {
  /**
   * #### `Allow` or `Deny` access for the specified actions and principal.
   */
  Effect: string;
  /**
   * #### SQS actions to allow or deny. E.g., `["sqs:SendMessage"]` or `["sqs:*"]`.
   */
  Action: string[];
  /**
   * #### Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range).
   */
  Condition?: any;
  /**
   * #### Who gets access: AWS account ID, IAM ARN, or `"*"` for everyone. E.g., `{ "Service": "sns.amazonaws.com" }`.
   */
  Principal: any;
}
/**
 * #### Routes events from an EventBridge event bus to this queue when they match a specified pattern.
 */
export interface SqsQueueEventBusIntegration {
  type: "event-bus";
  /**
   * #### Properties of the integration
   */
  properties: {
    /**
     * #### Message group ID for FIFO queues. Required when the target queue has `fifoEnabled: true`.
     *
     * ---
     *
     * Messages in the same group are processed in strict order. Different groups can be processed in parallel.
     */
    messageGroupId?: string;
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
    eventPattern: EventBusIntegrationPattern1;
    onDeliveryFailure?: EventBusOnDeliveryFailure1;
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
    inputTransformer?: EventInputTransformer2;
  };
}
/**
 * #### A pattern to filter events from the event bus.
 *
 * ---
 *
 * Only events that match this pattern will trigger the target.
 * For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
 */
export interface EventBusIntegrationPattern1 {
  /**
   * #### Filter by event version.
   */
  version?: any;
  /**
   * #### Filter by event detail-type (e.g., `["OrderPlaced"]`). This is the primary field for routing custom events.
   */
  "detail-type"?: any;
  /**
   * #### Filter by event source (e.g., `["my-app"]` or `["aws.ec2"]` for AWS service events).
   */
  source?: any;
  /**
   * #### Filter by AWS account ID.
   */
  account?: any;
  /**
   * #### Filter by AWS region.
   */
  region?: any;
  /**
   * #### Filter by resource ARNs.
   */
  resources?: any;
  /**
   * #### Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.
   */
  detail?: any;
  /**
   * #### Filter by replay name (only present on replayed events).
   */
  "replay-name"?: any;
}
/**
 * #### A destination for events that fail to be delivered to the target.
 *
 * ---
 *
 * In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.
 */
export interface EventBusOnDeliveryFailure1 {
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
export interface EventInputTransformer2 {
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
/**
 * #### Pub/sub messaging: publish once, deliver to many subscribers (Lambda, SQS, email, SMS, HTTP).
 *
 * ---
 *
 * Serverless, pay-per-message. Use when one event needs to trigger multiple actions — e.g., order placed
 * triggers email confirmation + inventory update + analytics. Subscribers are configured on the subscriber side.
 */
export interface SnsTopic {
  type: "sns-topic";
  properties?: SnsTopicProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface SnsTopicProps {
  /**
   * #### Sender name shown on SMS messages sent to subscribers (e.g., "MyApp"). Max 11 characters.
   */
  smsDisplayName?: string;
  /**
   * #### Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows.
   *
   * ---
   *
   * FIFO topics can only deliver to FIFO SQS queues (not email, SMS, or HTTP).
   * Requires either `contentBasedDeduplication: true` or a unique `MessageDeduplicationId` per message.
   */
  fifoEnabled?: boolean;
  /**
   * #### Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window.
   *
   * ---
   *
   * Saves you from generating a unique deduplication ID for each message. Requires `fifoEnabled: true`.
   */
  contentBasedDeduplication?: boolean;
}
/**
 * #### Host a static website (React, Vue, Astro, etc.) on S3 + CloudFront CDN.
 *
 * ---
 *
 * Combines S3 storage with a global CDN for fast, cheap, and scalable static site hosting.
 * Includes build step, custom domains, caching presets, and environment injection.
 */
export interface HostingBucket {
  type: "hosting-bucket";
  properties: HostingBucketProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface HostingBucketProps {
  /**
   * #### Path to the build output directory (e.g., `dist`, `build`, `out`).
   *
   * ---
   *
   * This folder's contents are uploaded to the bucket on every deploy.
   */
  uploadDirectoryPath: string;
  build?: HostingBucketBuild;
  dev?: HostingBucketBuild1;
  /**
   * #### Glob patterns for files to skip during upload (relative to `uploadDirectoryPath`).
   */
  excludeFilesPatterns?: string[];
  /**
   * #### Optimizes caching and routing for your type of frontend app.
   *
   * ---
   *
   * - **`single-page-app`**: For React, Vue, Angular, or any SPA built with Vite/Webpack.
   *   Enables client-side routing (e.g., `/about` serves `index.html`). HTML is never browser-cached;
   *   hashed assets (`.js`, `.css`) are cached forever.
   *
   * - **`static-website`** (default): For multi-page static sites. All files are CDN-cached
   *   but never browser-cached, so users always see the latest content after a deploy.
   *
   * - **`astro-static-website`** / **`sveltekit-static-website`** / **`nuxt-static-website`**:
   *   Framework-specific presets that cache hashed build assets (`_astro/`, `_app/`, `_nuxt/`)
   *   indefinitely while keeping HTML fresh.
   *
   * - **`gatsby-static-website`**: Gatsby-specific caching following their recommendations.
   *
   * You can override any preset's behavior using `fileOptions`.
   */
  hostingContentType?:
    | "astro-static-website"
    | "gatsby-static-website"
    | "nuxt-static-website"
    | "single-page-app"
    | "static-website"
    | "sveltekit-static-website";
  /**
   * #### Custom domains (e.g., `www.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
   */
  disableUrlNormalization?: boolean;
  edgeFunctions?: EdgeFunctionsConfig4;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Inject deploy-time values into HTML files as `window.STP_INJECTED_ENV.VARIABLE_NAME`.
   *
   * ---
   *
   * Useful for making API URLs, User Pool IDs, and other dynamic values
   * available to your frontend JavaScript without rebuilding.
   */
  injectEnvironment?: EnvironmentVar[];
  /**
   * #### Write deploy-time values to a `.env` file in the specified directory.
   *
   * ---
   *
   * Merges with existing `.env` content if the file already exists.
   */
  writeDotenvFilesTo?: string;
  /**
   * #### Name of a `web-app-firewall` resource to protect this site. Must have `scope: cdn`.
   */
  useFirewall?: string;
  /**
   * #### Set HTTP headers (e.g., `Cache-Control`) for files matching specific patterns.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → a Lambda function).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the bucket.
   */
  routeRewrites?: CdnRouteRewrite[];
}
/**
 * #### Build command that produces the files to upload (e.g., `npm run build`).
 *
 * ---
 *
 * Runs during the packaging phase, in parallel with other resources. Bundle size is shown in deploy logs.
 */
export interface HostingBucketBuild {
  /**
   * #### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`).
   */
  command: string;
  /**
   * #### Working directory for the command (relative to project root).
   */
  workingDirectory?: string;
}
/**
 * #### Dev server command for local development (e.g., `npm run dev`, `vite`).
 *
 * ---
 *
 * Used by `stacktape dev`.
 */
export interface HostingBucketBuild1 {
  /**
   * #### Command to run (e.g., `npm run build`, `vite build`, `npm run dev`).
   */
  command: string;
  /**
   * #### Working directory for the command (relative to project root).
   */
  workingDirectory?: string;
}
/**
 * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
 *
 * ---
 *
 * - `onRequest`: Before cache lookup and before forwarding to the bucket.
 * - `onResponse`: Before returning the response to the client.
 */
export interface EdgeFunctionsConfig4 {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}
/**
 * #### Protects your APIs and websites from common attacks (SQL injection, XSS, bots, DDoS).
 *
 * ---
 *
 * Attach to an HTTP API Gateway, Application Load Balancer, or CDN. Comes with AWS-managed rule sets
 * by default. Costs ~$5/month base + $1/million requests inspected.
 */
export interface WebAppFirewall {
  type: "web-app-firewall";
  properties?: WebAppFirewallProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface WebAppFirewallProps {
  /**
   * #### `cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways.
   */
  scope: "cdn" | "regional";
  /**
   * #### What happens when no rule matches a request.
   *
   * ---
   *
   * - **`Allow`** (recommended): Allow all traffic, block only what rules catch.
   * - **`Block`**: Block all traffic, allow only what rules explicitly permit (returns 403).
   */
  defaultAction?: "Allow" | "Block";
  /**
   * #### Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules.
   *
   * ---
   *
   * If omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default.
   */
  rules?: (ManagedRuleGroup | CustomRuleGroup | RateBasedStatement)[];
  customResponseBodies?: CustomResponseBodies;
  /**
   * #### Seconds a solved CAPTCHA stays valid before requiring re-verification.
   */
  captchaImmunityTime?: number;
  /**
   * #### Seconds a solved challenge stays valid before requiring re-verification.
   */
  challengeImmunityTime?: number;
  /**
   * #### Domains accepted in WAF tokens. Enables token sharing across multiple protected websites.
   */
  tokenDomains?: string[];
  /**
   * #### Disable CloudWatch metrics for the firewall.
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of matched requests for inspection in the AWS WAF console.
   */
  sampledRequestsEnabled?: boolean;
}
export interface ManagedRuleGroup {
  type: "managed-rule-group";
  properties: ManagedRuleGroupProps;
}
export interface ManagedRuleGroupProps {
  /**
   * #### Vendor name (e.g., `AWS` for AWS-managed rules).
   */
  vendorName: string;
  /**
   * #### Rules within this group to skip (by rule name). Useful for disabling false positives.
   */
  excludedRules?: string[];
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
   */
  overrideAction?: "Count" | "None";
  /**
   * #### Evaluation order. Lower = evaluated first. Must be unique across all rules.
   */
  priority: number;
  name: string;
  /**
   * #### Disable CloudWatch metrics for this rule.
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of requests matching this rule for inspection in the WAF console.
   */
  sampledRequestsEnabled?: boolean;
}
export interface CustomRuleGroup {
  type: "custom-rule-group";
  properties: CustomRuleGroupProps;
}
export interface CustomRuleGroupProps {
  /**
   * #### ARN of the custom WAF rule group.
   */
  arn: string;
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
   */
  overrideAction?: "Count" | "None";
  /**
   * #### Evaluation order. Lower = evaluated first. Must be unique across all rules.
   */
  priority: number;
  name: string;
  /**
   * #### Disable CloudWatch metrics for this rule.
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of requests matching this rule for inspection in the WAF console.
   */
  sampledRequestsEnabled?: boolean;
}
export interface RateBasedStatement {
  type: "rate-based-rule";
  properties: RateBasedStatementProps;
}
export interface RateBasedStatementProps {
  /**
   * #### Max requests per IP in a 5-minute window. Range: 100–20,000,000. Exceeding triggers the `action`.
   */
  limit: number;
  /**
   * #### `IP` = direct client IP, `FORWARDED_IP` = IP from a header (e.g., `X-Forwarded-For` behind a proxy).
   */
  aggregateBasedOn?: "FORWARDED_IP" | "IP";
  forwardedIPConfig?: ForwardedIPConfig;
  /**
   * #### What to do when the rate limit is exceeded.
   *
   * ---
   *
   * - `Block`: Return 403 (most common for rate limiting).
   * - `Count`: Log only, don't block (useful for testing thresholds).
   * - `Captcha`/`Challenge`: Verify the client is human.
   */
  action?: "Allow" | "Block" | "Captcha" | "Challenge" | "Count";
  /**
   * #### Evaluation order. Lower = evaluated first. Must be unique across all rules.
   */
  priority: number;
  name: string;
  /**
   * #### Disable CloudWatch metrics for this rule.
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of requests matching this rule for inspection in the WAF console.
   */
  sampledRequestsEnabled?: boolean;
}
/**
 * #### Header and fallback settings when using `FORWARDED_IP` aggregation.
 */
export interface ForwardedIPConfig {
  /**
   * #### What to do when the header is missing. `MATCH` = apply rule action, `NO_MATCH` = skip.
   */
  fallbackBehavior: "MATCH" | "NO_MATCH";
  /**
   * #### HTTP header containing the client IP (e.g., `X-Forwarded-For`).
   */
  headerName: string;
}
/**
 * #### Custom response bodies for `Block` actions. Map of key → content type + body.
 */
export interface CustomResponseBodies {
  [k: string]: {
    /**
     * #### MIME type: `application/json`, `text/plain`, or `text/html`.
     */
    contentType: string;
    /**
     * #### Response body content.
     */
    content: string;
  };
}
/**
 * #### Deploy a Next.js app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN.
 *
 * ---
 *
 * Handles ISR (Incremental Static Regeneration), image optimization, and middleware out of the box.
 * Optionally deploy to Lambda@Edge for lower latency or enable response streaming.
 */
export interface NextjsWeb {
  type: "nextjs-web";
  properties: NextjsWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface NextjsWebProps {
  /**
   * #### Directory containing your `next.config.js`. For monorepos, point to the Next.js workspace.
   */
  appDirectory: string;
  serverLambda?: NextjsServerLambdaProperties;
  /**
   * #### Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts.
   *
   * ---
   *
   * A separate "warmer" function periodically pings the SSR Lambda. Not available with `useEdgeLambda: true`.
   */
  warmServerInstances?: number;
  /**
   * #### Run SSR at CloudFront edge locations for lower latency worldwide.
   *
   * ---
   *
   * **Trade-offs:** Slower deploys, no `warmServerInstances`, no response streaming.
   */
  useEdgeLambda?: boolean;
  /**
   * #### Override the default `next build` command.
   */
  buildCommand?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `next dev`.
   */
  dev?: {
    /**
     * #### Dev server command (e.g., `npm run dev`).
     */
    command?: string;
  };
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default).
   *
   * ---
   *
   * Not compatible with `useEdgeLambda: true`.
   */
  streamingEnabled?: boolean;
  cdn?: SsrWebCdnConfig;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface NextjsServerLambdaProperties {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  logging?: LambdaFunctionLogging;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   *
   * ---
   *
   * S3 and DynamoDB remain accessible via auto-created VPC endpoints.
   */
  joinDefaultVpc?: boolean;
}
/**
 * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
 */
export interface LambdaFunctionLogging {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Override default SSR caching behavior for all routes handled by the server.
 *
 * ---
 *
 * Useful when you want to cache SSR responses longer than the framework defaults.
 */
export interface CdnCachingOptions4 {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
export interface SsrWebPathCachingOverride {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `/_server-islands/*`).
   */
  path: string;
  cachingOptions: CdnCachingOptions5;
}
/**
 * #### Caching behavior override for this path pattern.
 */
export interface CdnCachingOptions5 {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ("GET" | "HEAD" | "OPTIONS")[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   */
  disableCompression?: boolean;
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}
/**
 * #### Managed search and analytics engine (OpenSearch/Elasticsearch compatible).
 *
 * ---
 *
 * Full-text search, log analytics, and real-time dashboards. Use for search features in your app,
 * centralized logging, or time-series data analysis. Costs start at ~$50/month (single small node).
 */
export interface OpenSearchDomain {
  type: "open-search-domain";
  properties?: OpenSearchDomainProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface OpenSearchDomainProps {
  /**
   * #### OpenSearch engine version. Pin this to avoid surprises when the default changes.
   */
  version?: "1.0" | "1.1" | "1.2" | "1.3" | "2.11" | "2.13" | "2.15" | "2.17" | "2.3" | "2.5" | "2.7" | "2.9";
  clusterConfig?: OpenSearchClusterConfig;
  storage?: OpenSearchStorage;
  /**
   * #### Name of a `user-pool` resource in your config. Enables login to OpenSearch Dashboards via Cognito.
   */
  userPool?: string;
  logging?: OpenSearchLogConfiguration;
  accessibility?: OpenSearchAccessibility;
}
/**
 * #### Instance types, counts, and cluster topology (data nodes, master nodes, warm storage).
 *
 * ---
 *
 * Defaults to a single `m4.large.search` node if not specified.
 */
export interface OpenSearchClusterConfig {
  /**
   * #### Instance type for data nodes (e.g., `t3.medium.search`, `r6g.large.search`).
   *
   * ---
   *
   * Data nodes store data and handle queries. For production, pair with dedicated master nodes.
   */
  instanceType: string;
  /**
   * #### Number of data nodes. More nodes = more storage capacity and query throughput.
   */
  instanceCount: number;
  /**
   * #### Instance type for dedicated master nodes (e.g., `m5.large.search`). Manages cluster state, not data.
   *
   * ---
   *
   * Recommended for clusters with 3+ data nodes to prevent split-brain. Use an odd count (3, 5, or 7).
   */
  dedicatedMasterType?: string;
  /**
   * #### Number of dedicated master nodes. Must be odd (3, 5, or 7) for quorum.
   */
  dedicatedMasterCount?: number;
  /**
   * #### Instance type for warm (UltraWarm) nodes — cheaper storage for infrequently accessed data.
   *
   * ---
   *
   * Data on warm nodes is still searchable but with higher query latency. Great for retaining old logs
   * or time-series data at lower cost.
   */
  warmType?: string;
  /**
   * #### Number of warm (UltraWarm) nodes for lower-cost storage of older data.
   */
  warmCount?: number;
  /**
   * #### Disable Multi-AZ replication. Not recommended — reduces availability and data durability.
   *
   * ---
   *
   * Multi-AZ is auto-enabled for clusters with 2+ nodes. It distributes nodes across availability zones
   * so the cluster survives an AZ outage.
   */
  multiAzDisabled?: boolean;
  /**
   * #### Enable Multi-AZ with a standby AZ for highest availability (99.99% SLA).
   *
   * ---
   *
   * Distributes nodes across 3 AZs with one as standby. The standby takes over instantly during failures
   * without re-balancing. Requires: version 1.3+, 3 dedicated master + data nodes, GP3/SSD instances.
   */
  standbyEnabled?: boolean;
}
/**
 * #### EBS volume size, IOPS, and throughput per data node. Only for EBS-backed instance types.
 *
 * ---
 *
 * `iops` and `throughput` settings only apply to GP3 volumes.
 */
export interface OpenSearchStorage {
  /**
   * #### EBS volume size per data node in GiB. Min/max depends on instance type (typically 10–16,384 GiB).
   */
  size: number;
  /**
   * #### Provisioned IOPS per data node. GP3 volumes only.
   */
  iops?: number;
  /**
   * #### Provisioned throughput per data node in MiB/s. GP3 volumes only.
   */
  throughput?: number;
}
/**
 * #### Error logs, search slow logs, and indexing slow logs. Sent to CloudWatch automatically.
 */
export interface OpenSearchLogConfiguration {
  errorLogs?: OpenSearchLogRetentionSettings;
  searchSlowLogs?: OpenSearchLogRetentionSettings1;
  indexSlowLogs?: OpenSearchLogRetentionSettings2;
}
/**
 * #### Error logs — script compilation errors, invalid queries, indexing issues, snapshot failures.
 */
export interface OpenSearchLogRetentionSettings {
  /**
   * #### Disable this log type.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
}
/**
 * #### Search slow logs — queries exceeding thresholds you configure in OpenSearch index settings.
 */
export interface OpenSearchLogRetentionSettings1 {
  /**
   * #### Disable this log type.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
}
/**
 * #### Indexing slow logs — indexing operations exceeding thresholds you configure in OpenSearch index settings.
 */
export interface OpenSearchLogRetentionSettings2 {
  /**
   * #### Disable this log type.
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
}
/**
 * #### Network access mode: public internet (default), VPC-only, or VPC with security-group scoping.
 *
 * ---
 *
 * Even in `internet` mode, access requires IAM credentials. VPC modes add network-level isolation.
 * **Warning:** you cannot switch between `internet` and `vpc`/`scoping-workloads-in-vpc` after creation.
 */
export interface OpenSearchAccessibility {
  /**
   * #### How the domain can be reached.
   *
   * ---
   *
   * - **`internet`**: Accessible from anywhere (still requires IAM credentials).
   * - **`vpc`**: Only accessible from resources inside your VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
   * - **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.
   *
   * **Cannot be changed after creation** — switching between internet and VPC modes requires a new domain.
   */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc";
}
/**
 * #### Shared file storage that multiple containers can read/write simultaneously.
 *
 * ---
 *
 * Persistent, elastic (grows/shrinks automatically), and accessible from any container in your stack
 * via `volumeMounts`. Use for shared uploads, CMS media, ML model files, or anything that needs to
 * survive container restarts. Pay only for storage used (~$0.30/GB/month for standard access).
 */
export interface EfsFilesystem {
  type: "efs-filesystem";
  properties?: EfsFilesystemProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface EfsFilesystemProps {
  /**
   * #### Enable daily automatic backups with 35-day retention. Incremental (only changes are copied).
   */
  backupEnabled?: boolean;
  /**
   * #### How throughput scales with your workload.
   *
   * ---
   *
   * - **`elastic`** (recommended): Auto-scales throughput. Best for spiky workloads (web apps, CI/CD).
   * - **`provisioned`**: Fixed throughput you set via `provisionedThroughputInMibps`. Best for steady high-throughput workloads.
   * - **`bursting`**: Throughput scales with storage size (50 KiB/s per GiB). Can run out of burst credits.
   */
  throughputMode?: "bursting" | "elastic" | "provisioned";
  /**
   * #### Guaranteed throughput in MiB/s. Required when `throughputMode` is `provisioned`.
   *
   * ---
   *
   * E.g., `100` = 100 MiB/s. Additional fees apply based on the provisioned amount. Can be changed anytime.
   */
  provisionedThroughputInMibps?: number;
}
/**
 * #### Real-time data stream for ingesting high-volume events (logs, clickstreams, IoT, analytics).
 *
 * ---
 *
 * Continuously captures data from many producers. Consumers (Lambda functions, etc.) process records in order.
 * Use when you need real-time processing with sub-second latency, not just async messaging (use SQS for that).
 */
export interface KinesisStream {
  type: "kinesis-stream";
  properties?: KinesisStreamProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface KinesisStreamProps {
  /**
   * #### How the stream scales.
   *
   * ---
   *
   * - **`ON_DEMAND`**: Auto-scales, pay per GB. Recommended for most use cases.
   * - **`PROVISIONED`**: You choose a fixed number of shards (1 MB/s write, 2 MB/s read each). More predictable costs.
   */
  capacityMode?: "ON_DEMAND" | "PROVISIONED";
  /**
   * #### Number of shards. Only used when `capacityMode` is `PROVISIONED`.
   *
   * ---
   *
   * Each shard: 1 MB/s write (1,000 records/s), 2 MB/s read (shared across consumers).
   */
  shardCount?: number;
  /**
   * #### How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra.
   */
  retentionPeriodHours?: number;
  encryption?: KinesisStreamEncryption;
  /**
   * #### Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing).
   *
   * ---
   *
   * Use when you have multiple consumers reading from the same stream and need low latency.
   * Enhanced fan-out consumers are auto-created when a Lambda uses `autoCreateConsumer: true`.
   */
  enableEnhancedFanOut?: boolean;
}
/**
 * #### Encrypt data at rest using a KMS key.
 */
export interface KinesisStreamEncryption {
  /**
   * #### Enable server-side encryption.
   */
  enabled: boolean;
  /**
   * #### ARN of your own KMS key. If omitted, uses the AWS-managed `alias/aws/kinesis` key (no extra cost).
   */
  kmsKeyArn?: string;
}
/**
 * #### A serverless compute resource that runs your code in response to events.
 *
 * ---
 *
 * Lambda functions are short-lived, stateless, and scale automatically. You only pay for the compute time you consume.
 */
export interface LambdaFunction {
  type: "function";
  properties: LambdaFunctionProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface LambdaFunctionProps {
  /**
   * #### How your code is built and packaged for deployment.
   *
   * ---
   *
   * - **`stacktape-lambda-buildpack`** (recommended): Point to your source file and Stacktape builds,
   *   bundles, and uploads it automatically.
   * - **`custom-artifact`**: Provide a pre-built zip file. Stacktape handles the upload.
   */
  packaging: StpBuildpackLambdaPackaging | CustomArtifactLambdaPackaging;
  /**
   * #### What triggers this function: HTTP requests, file uploads, queues, schedules, etc.
   *
   * ---
   *
   * Stacktape auto-configures permissions for each trigger.
   * The event payload your function receives depends on the trigger type.
   */
  events?: (
    | ApplicationLoadBalancerIntegration
    | KafkaTopicIntegration
    | SnsIntegration
    | SqsIntegration
    | KinesisIntegration
    | DynamoDbIntegration
    | S3Integration
    | ScheduleIntegration
    | AlarmIntegration
    | CloudwatchLogIntegration
    | HttpApiIntegration
    | EventBusIntegration
  )[];
  /**
   * #### Environment variables available to the function at runtime.
   *
   * ---
   *
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   */
  environment?: EnvironmentVar[];
  /**
   * #### The language runtime (e.g., `nodejs22.x`, `python3.13`).
   *
   * ---
   *
   * Auto-detected from your source file extension when using `stacktape-lambda-buildpack`.
   * Override only if you need a specific version.
   */
  runtime?:
    | "dotnet6"
    | "dotnet7"
    | "dotnet8"
    | "java11"
    | "java17"
    | "java8"
    | "java8.al2"
    | "nodejs18.x"
    | "nodejs20.x"
    | "nodejs22.x"
    | "nodejs24.x"
    | "provided.al2"
    | "provided.al2023"
    | "python3.10"
    | "python3.11"
    | "python3.12"
    | "python3.13"
    | "python3.8"
    | "python3.9"
    | "ruby3.3";
  /**
   * #### Processor architecture: `x86_64` (default) or `arm64` (Graviton, ~20% cheaper).
   *
   * ---
   *
   * `arm64` is cheaper per GB-second and often faster. Works with most code out of the box.
   * If using `stacktape-lambda-buildpack`, Stacktape builds for the selected architecture automatically.
   * With `custom-artifact`, you must pre-compile for the target architecture.
   */
  architecture?: "arm64" | "x86_64";
  /**
   * #### Memory in MB (128 - 10,240). Also determines CPU power.
   *
   * ---
   *
   * Lambda scales CPU proportionally to memory: 1,769 MB = 1 vCPU, 3,538 MB = 2 vCPUs, etc.
   * If your function is slow, increasing memory gives it more CPU, which often makes it faster
   * and cheaper overall (less execution time).
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Function is killed if it exceeds this.
   *
   * ---
   *
   * Maximum: 900 seconds (15 minutes). For longer tasks, use a `batch-job` or `worker-service`.
   */
  timeout?: number;
  /**
   * #### Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources.
   *
   * ---
   *
   * **You usually don't need to set this manually.** Stacktape will tell you if a resource in your `connectTo`
   * requires it (e.g., a database with `accessibilityMode: 'vpc'`, or any Redis cluster).
   *
   * **Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB
   * (Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.
   * If you need both VPC access and internet, use a `web-service` or `worker-service` instead.
   *
   * Required when using `volumeMounts` (EFS).
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Additional tags for this function (on top of stack-level tags). Max 50.
   */
  tags?: CloudformationTag[];
  destinations?: LambdaFunctionDestinations;
  logging?: LambdaFunctionLogging1;
  /**
   * #### Eliminates cold starts by keeping function instances warm and ready.
   *
   * ---
   *
   * When a function hasn't been called recently, the first request can take 1-5+ seconds ("cold start").
   * This setting pre-warms the specified number of instances so they respond instantly.
   *
   * **When to use:** User-facing APIs, web/mobile backends, or any function where response time matters.
   * Skip this for background jobs, cron tasks, or data pipelines.
   *
   * **Cost:** You pay for each provisioned instance even when idle. Also increases deploy time by ~2-5 minutes.
   */
  provisionedConcurrency?: number;
  /**
   * #### Cap the maximum number of concurrent instances for this function.
   *
   * ---
   *
   * Reserves this many execution slots exclusively for this function — other functions can't use them,
   * and this function can't scale beyond it. **No additional cost.**
   *
   * Common uses:
   * - Prevent overwhelming a database with too many connections
   * - Guarantee capacity for critical functions
   * - Throttle expensive downstream API calls
   */
  reservedConcurrency?: number;
  /**
   * #### Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.).
   *
   * ---
   *
   * Layers are zip archives with additional code/data mounted into the function.
   * Provide the layer ARN (e.g., from AWS console or another stack). Max 5 layers per function.
   */
  layers?: string[];
  deployment?: LambdaDeploymentConfig;
  /**
   * #### Alarms for this function (merged with global alarms from the Stacktape Console).
   */
  alarms?: LambdaAlarm[];
  /**
   * #### Global alarm names to exclude from this function.
   */
  disabledGlobalAlarms?: string[];
  url?: LambdaUrlConfig;
  cdn?: CdnConfiguration2;
  /**
   * #### Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation.
   *
   * ---
   *
   * Increase if your function downloads/processes large files temporarily.
   */
  storage?: number;
  /**
   * #### Persistent EFS storage shared across invocations and functions.
   *
   * ---
   *
   * Unlike `/tmp`, EFS data persists indefinitely and can be shared across multiple functions.
   * Requires `joinDefaultVpc: true` (Stacktape will remind you if you forget).
   */
  volumeMounts?: LambdaEfsMount[];
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
/**
 * #### Triggers a function when new messages are available in a Kafka topic.
 */
export interface KafkaTopicIntegration {
  type: "kafka-topic";
  properties: KafkaTopicIntegrationProps;
}
export interface KafkaTopicIntegrationProps {
  customKafkaConfiguration?: CustomKafkaEventSource;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * The function will be invoked with up to this many records. Maximum is 10,000.
   */
  batchSize?: number;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * The function will be triggered when either the `batchSize` is reached or this time window expires.
   * Maximum is 300 seconds.
   */
  maxBatchWindowSeconds?: number;
}
/**
 * #### The details of your Kafka cluster.
 *
 * ---
 *
 * Specifies the bootstrap servers and topic name.
 */
export interface CustomKafkaEventSource {
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
export interface KafkaSASLAuth {
  /**
   * #### The SASL authentication protocol.
   *
   * ---
   *
   * - `BASIC_AUTH`: SASL/PLAIN
   * - `SASL_SCRAM_256_AUTH`: SASL SCRAM-256
   * - `SASL_SCRAM_512_AUTH`: SASL SCRAM-512
   */
  type: "BASIC_AUTH" | "SASL_SCRAM_256_AUTH" | "SASL_SCRAM_512_AUTH";
  /**
   * #### Properties of authentication method
   */
  properties: {
    /**
     * #### The ARN of a secret containing the Kafka credentials.
     *
     * ---
     *
     * The secret must be a JSON object with `username` and `password` keys.
     * You can create secrets using the `stacktape secret:create` command.
     */
    authenticationSecretArn: string;
  };
}
export interface KafkaMTLSAuth {
  /**
   * #### The authentication protocol.
   *
   * ---
   *
   * `MTLS`: Mutual TLS authentication.
   */
  type: "MTLS";
  /**
   * #### Properties of authentication method
   */
  properties: {
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
  };
}
export interface AlarmIntegration {
  type: "cloudwatch-alarm";
  properties: AlarmIntegrationProps;
}
export interface AlarmIntegrationProps {
  /**
   * #### The name of the alarm (defined in the `alarms` section) that will trigger the function.
   */
  alarmName: string;
}
/**
 * #### Route async invocation results to another service (SQS, SNS, EventBus, or another function).
 *
 * ---
 *
 * Useful for building event-driven workflows: send successful results to one destination
 * and failures to another for error handling.
 */
export interface LambdaFunctionDestinations {
  /**
   * #### ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN).
   */
  onSuccess?: string;
  /**
   * #### ARN to receive error details when the function fails. Useful for dead-letter processing.
   */
  onFailure?: string;
}
/**
 * #### Logging configuration (retention, forwarding).
 *
 * ---
 *
 * Logs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console.
 */
export interface LambdaFunctionLogging1 {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Gradual traffic shifting for safe deployments.
 *
 * ---
 *
 * Instead of switching all traffic to the new version instantly, shift it gradually
 * (canary or linear). If issues arise, traffic rolls back automatically.
 */
export interface LambdaDeploymentConfig {
  /**
   * #### How traffic shifts from the old version to the new one.
   *
   * ---
   *
   * - **Canary**: Send 10% of traffic first, then all traffic after a wait period.
   * - **Linear**: Shift 10% of traffic at regular intervals.
   * - **AllAtOnce**: Instant switch (no gradual rollout).
   */
  strategy:
    | "AllAtOnce"
    | "Canary10Percent10Minutes"
    | "Canary10Percent15Minutes"
    | "Canary10Percent30Minutes"
    | "Canary10Percent5Minutes"
    | "Linear10PercentEvery10Minutes"
    | "Linear10PercentEvery1Minute"
    | "Linear10PercentEvery2Minutes"
    | "Linear10PercentEvery3Minutes";
  /**
   * #### Function to run before traffic shifting begins (e.g., smoke tests).
   *
   * ---
   *
   * Must signal success/failure to CodeDeploy. If it fails, the deployment rolls back.
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Function to run after all traffic has shifted (e.g., post-deploy validation).
   *
   * ---
   *
   * Must signal success/failure to CodeDeploy.
   */
  afterTrafficShiftFunction?: string;
}
export interface LambdaAlarm {
  trigger: LambdaAlarmTrigger;
  evaluation?: AlarmEvaluation4;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}
export interface LambdaErrorRateTrigger {
  type: "lambda-error-rate";
  properties: LambdaErrorRateTriggerProps;
}
export interface LambdaErrorRateTriggerProps {
  /**
   * #### Fires when the percentage of failed Lambda invocations exceeds this value.
   */
  thresholdPercent: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
}
export interface LambdaDurationTrigger {
  type: "lambda-duration";
  properties: LambdaDurationTriggerProps;
}
export interface LambdaDurationTriggerProps {
  /**
   * #### Fires when Lambda execution time exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** duration > threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMilliseconds: number;
  /**
   * #### How to compare the metric value against the threshold.
   */
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   */
  statistic?: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum";
}
/**
 * #### How long and how often to evaluate the metric before triggering.
 *
 * ---
 *
 * Controls the evaluation window (period), how many periods to look at, and how many must breach
 * the threshold to fire the alarm. Useful for filtering out short spikes.
 */
export interface AlarmEvaluation4 {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   */
  breachedPeriods?: number;
}
/**
 * #### Give this function its own HTTPS URL (no API Gateway needed).
 *
 * ---
 *
 * Simpler and cheaper than an API Gateway for single-function endpoints.
 * URL format: `https://{id}.lambda-url.{region}.on.aws`
 */
export interface LambdaUrlConfig {
  /**
   * #### Enable the function URL.
   */
  enabled: boolean;
  cors?: LambdaUrlCorsConfig;
  /**
   * #### Who can call this URL.
   *
   * ---
   *
   * - `NONE` — public, anyone can call it.
   * - `AWS_IAM` — only authenticated AWS users/roles with invoke permission.
   */
  authMode?: "AWS_IAM" | "NONE";
  /**
   * #### Stream the response progressively instead of buffering the entire response.
   *
   * ---
   *
   * Improves Time to First Byte and increases max response size from 6 MB to 20 MB.
   * Requires using the AWS streaming handler pattern in your code.
   */
  responseStreamEnabled?: boolean;
}
/**
 * #### CORS settings for the function URL. Overrides any CORS headers from the function itself.
 */
export interface LambdaUrlCorsConfig {
  /**
   * #### Enable CORS. When `true` with no other settings, uses permissive defaults (`*` for origins and methods).
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any origin.
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers (e.g., `Content-Type`, `Authorization`).
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods (e.g., `GET`, `POST`).
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies and credentials in cross-origin requests.
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}
/**
 * #### Put a CDN (CloudFront) in front of this function for caching and lower latency.
 *
 * ---
 *
 * Caches responses at edge locations worldwide. Reduces function invocations and bandwidth costs.
 */
export interface CdnConfiguration2 {
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   */
  enabled: boolean;
  cachingOptions?: CdnCachingOptions;
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  edgeFunctions?: EdgeFunctionsConfig1;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}
export interface LambdaEfsMount {
  /**
   * #### The type of the volume mount.
   */
  type: "efs";
  /**
   * #### Properties for the EFS volume mount.
   */
  properties: {
    /**
     * #### Name of the `efs-filesystem` resource defined in your config.
     */
    efsFilesystemName: string;
    /**
     * #### Subdirectory within the EFS filesystem to mount. Omit for full access.
     */
    rootDirectory?: string;
    /**
     * #### Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/data`).
     */
    mountPath: string;
  };
}
/**
 * #### Lambda function that runs at CDN edge locations for request/response manipulation.
 *
 * ---
 *
 * Runs on CloudFront events (viewer request, origin request, etc.) to modify headers, rewrite URLs,
 * implement A/B testing, or add auth checks at the edge. Referenced from CDN `edgeFunctions` config.
 */
export interface EdgeLambdaFunction {
  type: "edge-lambda-function";
  properties: EdgeLambdaFunctionProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface EdgeLambdaFunctionProps {
  /**
   * #### How the function code is packaged and deployed.
   */
  packaging: StpBuildpackLambdaPackaging | CustomArtifactLambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only.
   */
  runtime?:
    | "nodejs18.x"
    | "nodejs20.x"
    | "nodejs22.x"
    | "nodejs24.x"
    | "python3.10"
    | "python3.11"
    | "python3.12"
    | "python3.13"
    | "python3.8"
    | "python3.9";
  /**
   * #### Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s.
   */
  timeout?: number;
  /**
   * #### Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access).
   *
   * ---
   *
   * Edge Lambda functions **cannot** use environment variables or connect to VPC resources.
   * `connectTo` only sets up IAM permissions (e.g., S3 bucket access, DynamoDB, SES).
   */
  connectTo?: string[];
  /**
   * #### Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides.
   */
  iamRoleStatements?: StpIamRoleStatement[];
  logging?: LambdaFunctionLogging2;
}
/**
 * #### Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region).
 */
export interface LambdaFunctionLogging2 {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Deploy an Astro SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only Astro sites, use `hosting-bucket` with `hostingContentType: 'astro-static-website'` instead.
 */
export interface AstroWeb {
  type: "astro-web";
  properties: AstroWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface AstroWebProps {
  /**
   * #### Directory containing your `astro.config.mjs`. For monorepos, point to the Astro workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `astro build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: AstroWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: AstroWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig1;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface AstroWebServerLambdaConfig {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging3;
}
/**
 * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
 */
export interface LambdaFunctionLogging3 {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `astro dev`.
 */
export interface AstroWebDevConfig {
  /**
   * #### Override the default `astro dev` command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig1 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Deploy a Nuxt SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only Nuxt sites, use `hosting-bucket` with `hostingContentType: 'nuxt-static-website'` instead.
 */
export interface NuxtWeb {
  type: "nuxt-web";
  properties: NuxtWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface NuxtWebProps {
  /**
   * #### Directory containing your `nuxt.config.ts`. For monorepos, point to the Nuxt workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `nuxt build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: SsrWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig2;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface SsrWebServerLambdaConfig {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging4;
}
/**
 * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
 */
export interface LambdaFunctionLogging4 {
  /**
   * #### Disable CloudWatch logging entirely.
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `nuxt dev`.
 */
export interface SsrWebDevConfig {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig2 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead.
 */
export interface SvelteKitWeb {
  type: "sveltekit-web";
  properties: SvelteKitWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface SvelteKitWebProps {
  /**
   * #### Directory containing your `svelte.config.js`. For monorepos, point to the SvelteKit workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `vite build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: SsrWebServerLambdaConfig1;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: SsrWebDevConfig1;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig3;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface SsrWebServerLambdaConfig1 {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging4;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `vite dev`.
 */
export interface SsrWebDevConfig1 {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig3 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Deploy a SolidStart SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 */
export interface SolidStartWeb {
  type: "solidstart-web";
  properties: SolidStartWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface SolidStartWebProps {
  /**
   * #### Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `vinxi build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: SsrWebServerLambdaConfig2;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: SsrWebDevConfig2;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig4;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface SsrWebServerLambdaConfig2 {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging4;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.
 */
export interface SsrWebDevConfig2 {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig4 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Deploy a TanStack Start SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
 */
export interface TanStackWeb {
  type: "tanstack-web";
  properties: TanStackWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface TanStackWebProps {
  /**
   * #### Directory containing your `app.config.ts`. For monorepos, point to the TanStack Start workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `vinxi build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: SsrWebServerLambdaConfig3;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: SsrWebDevConfig3;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig5;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface SsrWebServerLambdaConfig3 {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging4;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.
 */
export interface SsrWebDevConfig3 {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig5 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
/**
 * #### Deploy a Remix SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
 */
export interface RemixWeb {
  type: "remix-web";
  properties: RemixWebProps;
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
  overrides?: {
    [k: string]: any;
  };
}
export interface RemixWebProps {
  /**
   * #### Directory containing your `vite.config.ts` (or `remix.config.js`). For monorepos, point to the Remix workspace.
   */
  appDirectory?: string;
  /**
   * #### Override the default `remix vite:build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  serverLambda?: SsrWebServerLambdaConfig4;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  dev?: SsrWebDevConfig4;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  cdn?: SsrWebCdnConfig6;
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
/**
 * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
 */
export interface SsrWebServerLambdaConfig4 {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  logging?: LambdaFunctionLogging4;
}
/**
 * #### Dev server config for `stacktape dev`. Defaults to `remix vite:dev`.
 */
export interface SsrWebDevConfig4 {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}
/**
 * #### CDN cache controls for SSR routes and specific path patterns.
 */
export interface SsrWebCdnConfig6 {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   */
  disableInvalidationAfterDeploy?: boolean;
  defaultCachingOptions?: CdnCachingOptions4;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}
export interface Default {
  Type: string;
  DependsOn?: string[] | IntrinsicFunction | string;
  Properties?: any;
  Metadata?: any;
  CreationPolicy?: CreationPolicy;
  DeletionPolicy?: DeletionPolicy;
  UpdatePolicy?: UpdatePolicy;
  Condition?: ValueString;
}
export interface IntrinsicFunction {
  name: string;
  payload: any;
}
export interface CreationPolicy {
  AutoScalingCreationPolicy?: {
    MinSuccessfulInstancesPercent?: ValueNumber;
  };
  ResourceSignal?: {
    Count?: ValueNumber;
    Timeout?: ValueString;
  };
}
export interface UpdatePolicy {
  AutoScalingReplacingUpdate?: {
    WillReplace?: ValueBoolean;
  };
  AutoScalingRollingUpdate?: {
    MaxBatchSize?: ValueNumber;
    MinInstancesInService?: ValueNumber;
    MinSuccessfulInstancesPercent?: ValueNumber;
    PauseTime?: ValueString;
    SuspendProcesses?: ListString;
    WaitOnResourceSignals?: ValueBoolean;
  };
  AutoScalingScheduledAction?: {
    IgnoreUnmodifiedGroupSizeProperties?: ValueBoolean;
  };
  CodeDeployLambdaAliasUpdate?: {
    AfterAllowTrafficHook: ValueString;
    ApplicationName: ValueString;
    BeforeAllowTrafficHook: ValueString;
    DeploymentGroupName: ValueString;
  };
}

