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
