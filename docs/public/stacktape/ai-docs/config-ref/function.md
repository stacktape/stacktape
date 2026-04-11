---
docType: config-ref
title: Lambda Function
resourceType: function
tags:
  - function
  - lambda
  - serverless
  - faas
source: types/stacktape-config/functions.d.ts
priority: 1
---

# Lambda Function

A serverless compute resource that runs your code in response to events.

Lambda functions are short-lived, stateless, and scale automatically. You only pay for the compute time you consume.

Resource type: `function`

## TypeScript Definition

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
   * #### How your code is built and packaged for deployment.
   *
   * ---
   *
   * - **`stacktape-lambda-buildpack`** (recommended): Point to your source file and Stacktape builds,
   *   bundles, and uploads it automatically.
   * - **`custom-artifact`**: Provide a pre-built zip file. Stacktape handles the upload.
   */
  packaging: LambdaPackaging;
  /**
   * #### What triggers this function: HTTP requests, file uploads, queues, schedules, etc.
   *
   * ---
   *
   * Stacktape auto-configures permissions for each trigger.
   * The event payload your function receives depends on the trigger type.
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
  runtime?: LambdaRuntime;
  /**
   * #### Processor architecture: `x86_64` (default) or `arm64` (Graviton, ~20% cheaper).
   *
   * ---
   *
   * `arm64` is cheaper per GB-second and often faster. Works with most code out of the box.
   * If using `stacktape-lambda-buildpack`, Stacktape builds for the selected architecture automatically.
   * With `custom-artifact`, you must pre-compile for the target architecture.
   *
   * @default "x86_64"
   */
  architecture?: 'x86_64' | 'arm64';
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
   *
   * @default 10
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
   *
   * @default false
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Additional tags for this function (on top of stack-level tags). Max 50.
   */
  tags?: CloudformationTag[];
  /**
   * #### Route async invocation results to another service (SQS, SNS, EventBus, or another function).
   *
   * ---
   *
   * Useful for building event-driven workflows: send successful results to one destination
   * and failures to another for error handling.
   */
  destinations?: LambdaFunctionDestinations;
  /**
   * #### Logging configuration (retention, forwarding).
   *
   * ---
   *
   * Logs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console.
   */
  logging?: LambdaFunctionLogging;
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
  /**
   * #### Gradual traffic shifting for safe deployments.
   *
   * ---
   *
   * Instead of switching all traffic to the new version instantly, shift it gradually
   * (canary or linear). If issues arise, traffic rolls back automatically.
   */
  deployment?: LambdaDeploymentConfig;
  /**
   * #### Alarms for this function (merged with global alarms from the Stacktape Console).
   */
  alarms?: LambdaAlarm[];
  /**
   * #### Global alarm names to exclude from this function.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Give this function its own HTTPS URL (no API Gateway needed).
   *
   * ---
   *
   * Simpler and cheaper than an API Gateway for single-function endpoints.
   * URL format: `https://{id}.lambda-url.{region}.on.aws`
   */
  url?: LambdaUrlConfig;
  /**
   * #### Put a CDN (CloudFront) in front of this function for caching and lower latency.
   *
   * ---
   *
   * Caches responses at edge locations worldwide. Reduces function invocations and bandwidth costs.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation.
   *
   * ---
   *
   * Increase if your function downloads/processes large files temporarily.
   *
   * @default 512
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
}

interface LambdaUrlConfig {
  /**
   * #### Enable the function URL.
   */
  enabled: boolean;
  /**
   * #### CORS settings for the function URL. Overrides any CORS headers from the function itself.
   */
  cors?: LambdaUrlCorsConfig;
  /**
   * #### Who can call this URL.
   *
   * ---
   *
   * - `NONE` — public, anyone can call it.
   * - `AWS_IAM` — only authenticated AWS users/roles with invoke permission.
   *
   * @default NONE
   */
  authMode?: 'AWS_IAM' | 'NONE';
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

interface LambdaUrlCorsConfig {
  /**
   * #### Enable CORS. When `true` with no other settings, uses permissive defaults (`*` for origins and methods).
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any origin.
   *
   * @default ["*"]
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

interface LambdaDeploymentConfig {
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

interface LambdaFunctionDestinations {
  /**
   * #### ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN).
   */
  onSuccess?: string;
  /**
   * #### ARN to receive error details when the function fails. Useful for dead-letter processing.
   */
  onFailure?: string;
}

interface LambdaFunctionLogging extends LogForwardingBase {
  /**
   * #### Disable CloudWatch logging entirely.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
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
   * #### Name of the `efs-filesystem` resource defined in your config.
   */
  efsFilesystemName: string;

  /**
   * #### Subdirectory within the EFS filesystem to mount. Omit for full access.
   *
   * @default "/"
   */
  rootDirectory?: string;

  /**
   * #### Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/data`).
   */
  mountPath: string;
}

type FunctionReferencableParam = 'arn' | 'logGroupArn';
```
