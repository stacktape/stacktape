# Lambda Function

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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/handlers/api.ts
   *       memory: 512
   *       timeout: 15
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: mainApi
   *             method: GET
   *             path: /health
   *   mainApi:
   *     type: http-api-gateway
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/handlers/api.ts' }
   *     },
   *     memory: 512,
   *     timeout: 15,
   *     events: [
   *       { type: 'http-api-gateway', properties: { httpApiGatewayName: 'mainApi', method: 'GET', path: '/health' } }
   *     ]
   *   });
   *   const mainApi = new HttpApiGateway({});
   *   return { resources: { apiFunction, mainApi } };
   * });
   * ```
   */
  packaging: LambdaPackaging;
  /**
   * #### What triggers this function: HTTP requests, file uploads, queues, schedules, etc.
   *
   * ---
   *
   * Stacktape auto-configures permissions for each trigger.
   * The event payload your function receives depends on the trigger type.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/orders.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: publicApi
   *             method: POST
   *             path: /orders
   *         - type: schedule
   *           properties:
   *             scheduleRate: rate(1 hour)
   *   publicApi:
   *     type: http-api-gateway
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/orders.ts' } },
   *     events: [
   *       { type: 'http-api-gateway', properties: { httpApiGatewayName: 'publicApi', method: 'POST', path: '/orders' } },
   *       { type: 'schedule', properties: { scheduleRate: 'rate(1 hour)' } }
   *     ]
   *   });
   *   const publicApi = new HttpApiGateway({});
   *   return { resources: { ordersApi, publicApi } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       environment:
   *         - name: STAGE
   *           value: production
   *         - name: STRIPE_SECRET_KEY
   *           value: $Secret('stripe-key')
   *         - name: MAX_RETRIES
   *           value: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
   *     environment: {
   *       STAGE: 'production',
   *       STRIPE_SECRET_KEY: $Secret('stripe-key'),
   *       MAX_RETRIES: 3
   *     }
   *   });
   *   return { resources: { worker } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### The language runtime (e.g., `nodejs22.x`, `python3.13`).
   *
   * ---
   *
   * Auto-detected from your source file extension when using `stacktape-lambda-buildpack`.
   * Override only if you need a specific version.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   reportGenerator:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/report.py
   *       runtime: python3.13
   *       memory: 1024
   *       timeout: 60
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const reportGenerator = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/report.py' } },
   *     runtime: 'python3.13',
   *     memory: 1024,
   *     timeout: 60
   *   });
   *   return { resources: { reportGenerator } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   imageResizer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/resize.ts
   *       architecture: arm64
   *       memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const imageResizer = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/resize.ts' } },
   *     architecture: 'arm64',
   *     memory: 1024
   *   });
   *   return { resources: { imageResizer } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   pdfRenderer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/pdf.ts
   *       memory: 3538
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const pdfRenderer = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pdf.ts' } },
   *     memory: 3538,
   *     timeout: 120
   *   });
   *   return { resources: { pdfRenderer } };
   * });
   * ```
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Function is killed if it exceeds this.
   *
   * ---
   *
   * Maximum: 900 seconds (15 minutes). For longer tasks, use a `batch-job` or `worker-service`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dataImporter:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/import.ts
   *       memory: 512
   *       timeout: 300
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dataImporter = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/import.ts' } },
   *     memory: 512,
   *     timeout: 300
   *   });
   *   return { resources: { dataImporter } };
   * });
   * ```
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources.
   *
   * ---
   *
   * Set this to `true` when the function must reach VPC-only resources such as a database with
   * `accessibilityMode: 'vpc'`/`'scoping-workloads-in-vpc'`, a Redis cluster, or EFS.
   *
   * **Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB
   * (Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.
   * If you need both VPC access and internet, use a `web-service` or `worker-service` instead.
   *
   * Required when using `volumeMounts` (EFS or S3 Files).
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dbMigrator:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/migrate.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - mainDb
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: { type: 'postgres', properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } } }
   *   });
   *   const dbMigrator = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/migrate.ts' } },
   *     joinDefaultVpc: true,
   *     connectTo: [mainDb]
   *   });
   *   return { resources: { dbMigrator, mainDb } };
   * });
   * ```
   *
   * @default false
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Additional tags for this function (on top of stack-level tags). Max 50.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   billingFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/billing.ts
   *       tags:
   *         - name: team
   *           value: payments
   *         - name: cost-center
   *           value: "4400"
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const billingFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/billing.ts' } },
   *     tags: [
   *       { name: 'team', value: 'payments' },
   *       { name: 'cost-center', value: '4400' }
   *     ]
   *   });
   *   return { resources: { billingFunction } };
   * });
   * ```
   */
  tags?: CloudformationTag[];
  /**
   * #### Route async invocation results to another service (SQS, SNS, EventBus, or another function).
   *
   * ---
   *
   * Useful for building event-driven workflows: send successful results to one destination
   * and failures to another for error handling.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   asyncProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/process.ts
   *       destinations:
   *         onSuccess: $ResourceParam('successTopic', 'arn')
   *         onFailure: $ResourceParam('deadLetterQueue', 'arn')
   *   successTopic:
   *     type: sns-topic
   *   deadLetterQueue:
   *     type: sqs-queue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, SnsTopic, SqsQueue, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const asyncProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/process.ts' } },
   *     destinations: {
   *       onSuccess: $ResourceParam('successTopic', 'arn'),
   *       onFailure: $ResourceParam('deadLetterQueue', 'arn')
   *     }
   *   });
   *   const successTopic = new SnsTopic({});
   *   const deadLetterQueue = new SqsQueue({});
   *   return { resources: { asyncProcessor, successTopic, deadLetterQueue } };
   * });
   * ```
   */
  destinations?: LambdaFunctionDestinations;
  /**
   * #### Logging configuration (retention, forwarding).
   *
   * ---
   *
   * Logs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       logging:
   *         retentionDays: 30
   *         logForwarding:
   *           type: datadog
   *           properties:
   *             apiKey: $Secret('datadog-api-key')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHandler = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     logging: {
   *       retentionDays: 30,
   *       logForwarding: { type: 'datadog', properties: { apiKey: $Secret('datadog-api-key') } }
   *     }
   *   });
   *   return { resources: { apiHandler } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/checkout.ts
   *       memory: 1024
   *       provisionedConcurrency: 5
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: storeApi
   *             method: POST
   *             path: /checkout
   *   storeApi:
   *     type: http-api-gateway
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/checkout.ts' } },
   *     memory: 1024,
   *     provisionedConcurrency: 5,
   *     events: [
   *       { type: 'http-api-gateway', properties: { httpApiGatewayName: 'storeApi', method: 'POST', path: '/checkout' } }
   *     ]
   *   });
   *   const storeApi = new HttpApiGateway({});
   *   return { resources: { checkoutApi, storeApi } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   legacyDbWriter:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/write.ts
   *       reservedConcurrency: 10
   *       connectTo:
   *         - legacyDb
   *   legacyDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const legacyDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: { type: 'postgres', properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } } }
   *   });
   *   const legacyDbWriter = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/write.ts' } },
   *     reservedConcurrency: 10,
   *     connectTo: [legacyDb]
   *   });
   *   return { resources: { legacyDbWriter, legacyDb } };
   * });
   * ```
   */
  reservedConcurrency?: number;
  /**
   * #### Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.).
   *
   * ---
   *
   * Layers are zip archives with additional code/data mounted into the function.
   * Provide the layer ARN (e.g., from AWS console or another stack). Max 5 layers per function.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   monitoredFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/handler.ts
   *       layers:
   *         - arn:aws:lambda:eu-west-1:464622532012:layer:Datadog-Extension:62
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const monitoredFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/handler.ts' } },
   *     layers: ['arn:aws:lambda:eu-west-1:464622532012:layer:Datadog-Extension:62']
   *   });
   *   return { resources: { monitoredFunction } };
   * });
   * ```
   */
  layers?: string[];
  /**
   * #### Gradual traffic shifting for safe deployments.
   *
   * ---
   *
   * Instead of switching all traffic to the new version instantly, shift it gradually
   * (canary or linear). If issues arise, traffic rolls back automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payment.ts
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         beforeAllowTrafficFunction: smokeTest
   *   smokeTest:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/smoke-test.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       beforeAllowTrafficFunction: 'smokeTest'
   *     }
   *   });
   *   const smokeTest = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/smoke-test.ts' } }
   *   });
   *   return { resources: { paymentApi, smokeTest } };
   * });
   * ```
   */
  deployment?: LambdaDeploymentConfig;
  /**
   * #### Alarms for this function (merged with global alarms from the Stacktape Console).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   criticalApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/critical.ts
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 sender: alerts@example.com
   *                 recipient: oncall@example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const criticalApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/critical.ts' } },
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
   *         notificationTargets: [
   *           { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { criticalApi } };
   * });
   * ```
   */
  alarms?: LambdaAlarm[];
  /**
   * #### Global alarm names to exclude from this function.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   batchReporter:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/batch.ts
   *       timeout: 300
   *       disabledGlobalAlarms:
   *         - lambda-duration-global
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const batchReporter = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/batch.ts' } },
   *     timeout: 300,
   *     disabledGlobalAlarms: ['lambda-duration-global']
   *   });
   *   return { resources: { batchReporter } };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Give this function its own HTTPS URL (no API Gateway needed).
   *
   * ---
   *
   * Simpler and cheaper than an API Gateway for single-function endpoints.
   * URL format: `https://{id}.lambda-url.{region}.on.aws`
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webhookReceiver:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/webhook.ts
   *       url:
   *         enabled: true
   *         authMode: NONE
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webhookReceiver = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/webhook.ts' } },
   *     url: { enabled: true, authMode: 'NONE' }
   *   });
   *   return { resources: { webhookReceiver } };
   * });
   * ```
   */
  url?: LambdaUrlConfig;
  /**
   * #### Put a CDN (CloudFront) in front of this function for caching and lower latency.
   *
   * ---
   *
   * Caches responses at edge locations worldwide. Reduces function invocations and bandwidth costs.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ssrFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/render.ts
   *       memory: 1024
   *       url:
   *         enabled: true
   *       cdn:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ssrFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/render.ts' } },
   *     memory: 1024,
   *     url: { enabled: true },
   *     cdn: { enabled: true }
   *   });
   *   return { resources: { ssrFunction } };
   * });
   * ```
   */
  cdn?: CdnConfiguration;
  /**
   * #### Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation.
   *
   * ---
   *
   * Increase if your function downloads/processes large files temporarily.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   videoTranscoder:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/transcode.ts
   *       memory: 3008
   *       timeout: 600
   *       storage: 4096
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const videoTranscoder = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/transcode.ts' } },
   *     memory: 3008,
   *     timeout: 600,
   *     storage: 4096
   *   });
   *   return { resources: { videoTranscoder } };
   * });
   * ```
   *
   * @default 512
   */
  storage?: number;
  /**
   * #### Persistent file-system mounts shared across invocations and functions.
   *
   * ---
   *
   * Unlike `/tmp`, mounted file systems persist independently from the function runtime and can be
   * shared across multiple functions.
   * Requires `joinDefaultVpc: true` (Stacktape will remind you if you forget).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   sharedDataFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/handler.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: sharedStorage
   *             mountPath: /mnt/data
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedDataFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/handler.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       { type: 'efs', properties: { efsFilesystemName: 'sharedStorage', mountPath: '/mnt/data' } }
   *     ]
   *   });
   *   const sharedStorage = new EfsFilesystem({});
   *   return { resources: { sharedDataFunction, sharedStorage } };
   * });
   * ```
   */
  volumeMounts?: (LambdaEfsMount | LambdaS3FilesMount)[];
}

interface LambdaUrlConfig {
  /**
   * #### Enable the function URL.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   publicFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/public.ts
   *       url:
   *         enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const publicFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/public.ts' } },
   *     url: {
   *       enabled: true
   *     }
   *   });
   *   return { resources: { publicFunction } };
   * });
   * ```
   */
  enabled: boolean;
  /**
   * #### CORS settings for the function URL. Overrides any CORS headers from the function itself.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: { enabled: true, allowedOrigins: ['https://app.example.com'] }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   internalFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/internal.ts
   *       url:
   *         enabled: true
   *         authMode: AWS_IAM
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const internalFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/internal.ts' } },
   *     url: {
   *       enabled: true,
   *       authMode: 'AWS_IAM'
   *     }
   *   });
   *   return { resources: { internalFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   streamingFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/stream.ts
   *       memory: 1024
   *       url:
   *         enabled: true
   *         responseStreamEnabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const streamingFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/stream.ts' } },
   *     memory: 1024,
   *     url: {
   *       enabled: true,
   *       responseStreamEnabled: true
   *     }
   *   });
   *   return { resources: { streamingFunction } };
   * });
   * ```
   */
  responseStreamEnabled?: boolean;
}

interface LambdaUrlCorsConfig {
  /**
   * #### Enable CORS. When `true` with no other settings, uses permissive defaults (`*` for origins and methods).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://example.com`). Use `*` for any origin.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *             - https://admin.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default ["*"]
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers (e.g., `Content-Type`, `Authorization`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *           allowedHeaders:
   *             - Content-Type
   *             - Authorization
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com'],
   *         allowedHeaders: ['Content-Type', 'Authorization']
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods (e.g., `GET`, `POST`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *           allowedMethods:
   *             - GET
   *             - POST
   *             - OPTIONS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com'],
   *         allowedMethods: ['GET', 'POST', 'OPTIONS']
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies and credentials in cross-origin requests.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *           allowCredentials: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com'],
   *         allowCredentials: true
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *           exposedResponseHeaders:
   *             - X-Request-Id
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com'],
   *         exposedResponseHeaders: ['X-Request-Id']
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       url:
   *         enabled: true
   *         cors:
   *           enabled: true
   *           allowedOrigins:
   *             - https://app.example.com
   *           maxAge: 600
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     url: {
   *       enabled: true,
   *       cors: {
   *         enabled: true,
   *         allowedOrigins: ['https://app.example.com'],
   *         maxAge: 600
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payment.ts
   *       deployment:
   *         strategy: Linear10PercentEvery2Minutes
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
   *     deployment: {
   *       strategy: 'Linear10PercentEvery2Minutes'
   *     }
   *   });
   *   return { resources: { paymentApi } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payment.ts
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         beforeAllowTrafficFunction: preTrafficCheck
   *   preTrafficCheck:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/pre-traffic.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       beforeAllowTrafficFunction: 'preTrafficCheck'
   *     }
   *   });
   *   const preTrafficCheck = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-traffic.ts' } }
   *   });
   *   return { resources: { paymentApi, preTrafficCheck } };
   * });
   * ```
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Function to run after all traffic has shifted (e.g., post-deploy validation).
   *
   * ---
   *
   * Must signal success/failure to CodeDeploy.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentApi:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payment.ts
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         afterTrafficShiftFunction: postTrafficCheck
   *   postTrafficCheck:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/post-traffic.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentApi = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       afterTrafficShiftFunction: 'postTrafficCheck'
   *     }
   *   });
   *   const postTrafficCheck = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-traffic.ts' } }
   *   });
   *   return { resources: { paymentApi, postTrafficCheck } };
   * });
   * ```
   */
  afterTrafficShiftFunction?: string;
}

interface LambdaFunctionDestinations {
  /**
   * #### ARN to receive the result when the function succeeds (SQS, SNS, EventBus, or Lambda ARN).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   asyncWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       destinations:
   *         onSuccess: $ResourceParam('resultsTopic', 'arn')
   *   resultsTopic:
   *     type: sns-topic
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, SnsTopic, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const asyncWorker = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
   *     destinations: {
   *       onSuccess: $ResourceParam('resultsTopic', 'arn')
   *     }
   *   });
   *   const resultsTopic = new SnsTopic({});
   *   return { resources: { asyncWorker, resultsTopic } };
   * });
   * ```
   */
  onSuccess?: string;
  /**
   * #### ARN to receive error details when the function fails. Useful for dead-letter processing.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   asyncWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       destinations:
   *         onFailure: $ResourceParam('failureQueue', 'arn')
   *   failureQueue:
   *     type: sqs-queue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, SqsQueue, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const asyncWorker = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
   *     destinations: {
   *       onFailure: $ResourceParam('failureQueue', 'arn')
   *     }
   *   });
   *   const failureQueue = new SqsQueue({});
   *   return { resources: { asyncWorker, failureQueue } };
   * });
   * ```
   */
  onFailure?: string;
}

interface LambdaFunctionLogging extends LogForwardingBase {
  /**
   * #### Disable CloudWatch logging entirely.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   highVolumeFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/handler.ts
   *       logging:
   *         disabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const highVolumeFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/handler.ts' } },
   *     logging: {
   *       disabled: true
   *     }
   *   });
   *   return { resources: { highVolumeFunction } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs. Longer retention = higher storage cost.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   auditFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit.ts
   *       logging:
   *         retentionDays: 365
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/audit.ts' } },
   *     logging: {
   *       retentionDays: 365
   *     }
   *   });
   *   return { resources: { auditFunction } };
   * });
   * ```
   *
   * @default 180
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface LambdaEfsMount {
  /**
   * #### The type of the volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/media.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: mediaStore
   *             mountPath: /mnt/media
   *   mediaStore:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 'efs',
   *         properties: { efsFilesystemName: 'mediaStore', mountPath: '/mnt/media' }
   *       }
   *     ]
   *   });
   *   const mediaStore = new EfsFilesystem({});
   *   return { resources: { mediaProcessor, mediaStore } };
   * });
   * ```
   */
  type: 'efs';
  /**
   * #### Properties for the EFS volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/media.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: mediaStore
   *             mountPath: /mnt/media
   *   mediaStore:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 'efs',
   *         properties: { efsFilesystemName: 'mediaStore', mountPath: '/mnt/media' }
   *       }
   *     ]
   *   });
   *   const mediaStore = new EfsFilesystem({});
   *   return { resources: { mediaProcessor, mediaStore } };
   * });
   * ```
   */
  properties: LambdaEfsMountProps;
}

interface LambdaEfsMountProps {
  /**
   * #### Name of the `efs-filesystem` resource defined in your config.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/media.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: mediaStore
   *             mountPath: /mnt/media
   *   mediaStore:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 'efs',
   *         properties: {
   *           efsFilesystemName: 'mediaStore',
   *           mountPath: '/mnt/media'
   *         }
   *       }
   *     ]
   *   });
   *   const mediaStore = new EfsFilesystem({});
   *   return { resources: { mediaProcessor, mediaStore } };
   * });
   * ```
   */
  efsFilesystemName: string;

  /**
   * #### Subdirectory within the EFS filesystem to mount. Omit for full access.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/media.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: mediaStore
   *             rootDirectory: /uploads
   *             mountPath: /mnt/media
   *   mediaStore:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 'efs',
   *         properties: {
   *           efsFilesystemName: 'mediaStore',
   *           rootDirectory: '/uploads',
   *           mountPath: '/mnt/media'
   *         }
   *       }
   *     ]
   *   });
   *   const mediaStore = new EfsFilesystem({});
   *   return { resources: { mediaProcessor, mediaStore } };
   * });
   * ```
   *
   * @default "/"
   */
  rootDirectory?: string;

  /**
   * #### Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/data`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/media.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: mediaStore
   *             mountPath: /mnt/media
   *   mediaStore:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaProcessor = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 'efs',
   *         properties: {
   *           efsFilesystemName: 'mediaStore',
   *           mountPath: '/mnt/media'
   *         }
   *       }
   *     ]
   *   });
   *   const mediaStore = new EfsFilesystem({});
   *   return { resources: { mediaProcessor, mediaStore } };
   * });
   * ```
   */
  mountPath: string;
}

interface LambdaS3FilesMount {
  /**
   * #### The type of the volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   datasetReader:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/read.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: s3files
   *           properties:
   *             accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
   *             mountPath: /mnt/s3data
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const datasetReader = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 's3files',
   *         properties: { accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap', mountPath: '/mnt/s3data' }
   *       }
   *     ]
   *   });
   *   return { resources: { datasetReader } };
   * });
   * ```
   */
  type: 's3files';
  /**
   * #### Properties for the S3 Files volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   datasetReader:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/read.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: s3files
   *           properties:
   *             accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
   *             mountPath: /mnt/s3data
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const datasetReader = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 's3files',
   *         properties: { accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap', mountPath: '/mnt/s3data' }
   *       }
   *     ]
   *   });
   *   return { resources: { datasetReader } };
   * });
   * ```
   */
  properties: LambdaS3FilesMountProps;
}

interface LambdaS3FilesMountProps {
  /**
   * #### ARN of an existing S3 Files access point.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   datasetReader:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/read.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: s3files
   *           properties:
   *             accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
   *             mountPath: /mnt/s3data
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const datasetReader = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 's3files',
   *         properties: {
   *           accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap',
   *           mountPath: '/mnt/s3data'
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { datasetReader } };
   * });
   * ```
   */
  accessPointArn: string | IntrinsicFunction;

  /**
   * #### Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/s3data`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   datasetReader:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/read.ts
   *       joinDefaultVpc: true
   *       volumeMounts:
   *         - type: s3files
   *           properties:
   *             accessPointArn: arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap
   *             mountPath: /mnt/s3data
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const datasetReader = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/read.ts' } },
   *     joinDefaultVpc: true,
   *     volumeMounts: [
   *       {
   *         type: 's3files',
   *         properties: {
   *           accessPointArn: 'arn:aws:s3:eu-west-1:123456789012:accesspoint/my-ap',
   *           mountPath: '/mnt/s3data'
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { datasetReader } };
   * });
   * ```
   */
  mountPath: string;
}

type FunctionReferencableParam = 'arn' | 'logGroupArn';
```
