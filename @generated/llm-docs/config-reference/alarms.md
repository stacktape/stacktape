# Alarm Definition Base


## TypeScript Definition

```typescript
type AlarmUserIntegration =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;

interface AlarmDefinitionBase {
  /**
   * #### How long and how often to evaluate the metric before triggering.
   *
   * ---
   *
   * Controls the evaluation window (period), how many periods to look at, and how many must breach
   * the threshold to fire the alarm. Useful for filtering out short spikes.
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
   *           entryfilePath: ./src/api.ts
   *       memory: 512
   *       timeout: 10
   *       alarms:
   *         - description: API error rate too high
   *           trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           evaluation:
   *             period: 60
   *             evaluationPeriods: 5
   *             breachedPeriods: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
   *     memory: 512,
   *     timeout: 10,
   *     alarms: [
   *       {
   *         description: 'API error rate too high',
   *         trigger: {
   *           type: 'lambda-error-rate',
   *           properties: { thresholdPercent: 5 }
   *         },
   *         evaluation: {
   *           period: 60,
   *           evaluationPeriods: 5,
   *           breachedPeriods: 3
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  evaluation?: AlarmEvaluation;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: http-api-gateway
   *     properties:
   *       alarms:
   *         - description: API returning too many errors
   *           trigger:
   *             type: http-api-gateway-error-rate
   *             properties:
   *               thresholdPercent: 2
   *           notificationTargets:
   *             - type: slack
   *               properties:
   *                 conversationId: C12345678
   *                 accessToken: $Secret('slack-bot-token')
   *             - type: email
   *               properties:
   *                 sender: alerts@example.com
   *                 recipient: oncall@example.com
   *             - type: ms-teams
   *               properties:
   *                 webhookUrl: $Secret('teams-webhook-url')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new HttpApiGateway({
   *     alarms: [
   *       {
   *         description: 'API returning too many errors',
   *         trigger: {
   *           type: 'http-api-gateway-error-rate',
   *           properties: { thresholdPercent: 2 }
   *         },
   *         notificationTargets: [
   *           {
   *             type: 'slack',
   *             properties: { conversationId: 'C12345678', accessToken: $Secret('slack-bot-token') }
   *           },
   *           {
   *             type: 'email',
   *             properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' }
   *           },
   *           {
   *             type: 'ms-teams',
   *             properties: { webhookUrl: $Secret('teams-webhook-url') }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Whether alarm state changes should appear in monitoring history.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   jobsQueue:
   *     type: sqs-queue
   *     properties:
   *       alarms:
   *         - description: Jobs queue backing up
   *           trigger:
   *             type: sqs-queue-received-messages-count
   *             properties:
   *               thresholdCount: 1000
   *           includeInHistory: false
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jobsQueue = new SqsQueue({
   *     alarms: [
   *       {
   *         description: 'Jobs queue backing up',
   *         trigger: {
   *           type: 'sqs-queue-received-messages-count',
   *           properties: { thresholdCount: 1000 }
   *         },
   *         includeInHistory: false
   *       }
   *     ]
   *   });
   *
   *   return { resources: { jobsQueue } };
   * });
   * ```
   *
   * @default true
   */
  includeInHistory?: boolean;
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - trigger:
   *             type: database-cpu-utilization
   *             properties:
   *               thresholdPercent: 80
   *           description: Database CPU sustained above 80% — consider scaling up
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'database-cpu-utilization',
   *           properties: { thresholdPercent: 80 }
   *         },
   *         description: 'Database CPU sustained above 80% — consider scaling up'
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  description?: string;
}

interface AlarmDefinition extends AlarmDefinitionBase {
  /**
   * #### A unique name for this alarm (e.g., `api-error-rate`, `db-cpu-high`).
   */
  name: string;
  /**
   * #### The metric and threshold that fires this alarm.
   *
   * ---
   *
   * `type` selects what to monitor (error rate, CPU, latency, etc.) and `properties` set the threshold.
   */
  trigger: AlarmTrigger;
  /**
   * #### Only activate this alarm for these services. If omitted, applies to all services.
   */
  forServices?: string[];
  /**
   * #### Only activate this alarm for these stages (e.g., `production`). If omitted, applies to all stages.
   */
  forStages?: string[];
}

interface StpAlarm extends AlarmDefinition {
  nameChain: string[];
}

interface ApplicationLoadBalancerAlarm extends AlarmDefinitionBase {
  trigger: ApplicationLoadBalancerAlarmTrigger;
}

interface HttpApiGatewayAlarm extends AlarmDefinitionBase {
  trigger: HttpApiGatewayAlarmTrigger;
}

interface LambdaAlarm extends AlarmDefinitionBase {
  trigger: LambdaAlarmTrigger;
}

interface RelationalDatabaseAlarm extends AlarmDefinitionBase {
  trigger: RelationalDatabaseAlarmTrigger;
}

interface SqsQueueAlarm extends AlarmDefinitionBase {
  trigger: SqsQueueAlarmTrigger;
}

type ApplicationLoadBalancerAlarmTrigger =
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger
  | ApplicationLoadBalancerCustomTrigger;
type SqsQueueAlarmTrigger = SqsQueueReceivedMessagesCountTrigger | SqsQueueNotEmptyTrigger;
type LambdaAlarmTrigger = LambdaErrorRateTrigger | LambdaDurationTrigger;
type HttpApiGatewayAlarmTrigger = HttpApiGatewayErrorRateTrigger | HttpApiGatewayLatencyTrigger;
type RelationalDatabaseAlarmTrigger =
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger;

type AlarmTrigger =
  | LambdaErrorRateTrigger
  | LambdaDurationTrigger
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger
  | HttpApiGatewayErrorRateTrigger
  | HttpApiGatewayLatencyTrigger
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger
  | ApplicationLoadBalancerCustomTrigger
  | SqsQueueReceivedMessagesCountTrigger
  | SqsQueueNotEmptyTrigger;

type AlarmTriggerType = AlarmTrigger['type'];

interface AlarmEvaluation {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   *
   *
   * ---
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
   *           entryfilePath: ./src/worker.ts
   *       alarms:
   *         - description: Worker running too long
   *           trigger:
   *             type: lambda-duration
   *             properties:
   *               thresholdMilliseconds: 5000
   *           evaluation:
   *             period: 300
   *             evaluationPeriods: 2
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
   *     alarms: [
   *       {
   *         description: 'Worker running too long',
   *         trigger: {
   *           type: 'lambda-duration',
   *           properties: { thresholdMilliseconds: 5000 }
   *         },
   *         evaluation: {
   *           period: 300,
   *           evaluationPeriods: 2
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { worker } };
   * });
   * ```
   *
   * @default 60
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/payments.ts
   *       alarms:
   *         - description: Payments error rate elevated
   *           trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 1
   *           evaluation:
   *             period: 60
   *             evaluationPeriods: 5
   *             breachedPeriods: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsFn = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/payments.ts' }),
   *     alarms: [
   *       {
   *         description: 'Payments error rate elevated',
   *         trigger: {
   *           type: 'lambda-error-rate',
   *           properties: { thresholdPercent: 1 }
   *         },
   *         evaluation: {
   *           period: 60,
   *           evaluationPeriods: 5,
   *           breachedPeriods: 3
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { paymentsFn } };
   * });
   * ```
   *
   * @default 1
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/checkout.ts
   *       alarms:
   *         - description: Checkout errors persisting across multiple periods
   *           trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 2
   *           evaluation:
   *             period: 60
   *             evaluationPeriods: 5
   *             breachedPeriods: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutFn = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/checkout.ts' }),
   *     alarms: [
   *       {
   *         description: 'Checkout errors persisting across multiple periods',
   *         trigger: {
   *           type: 'lambda-error-rate',
   *           properties: { thresholdPercent: 2 }
   *         },
   *         evaluation: {
   *           period: 60,
   *           evaluationPeriods: 5,
   *           breachedPeriods: 3
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { checkoutFn } };
   * });
   * ```
   *
   * @default 1
   */
  breachedPeriods?: number;
}

interface SqsQueueNotEmptyTrigger {
  /**
   * #### Fires when the SQS queue has unprocessed messages.
   *
   * ---
   *
   * The queue is considered "not empty" if any of these are non-zero: visible messages,
   * in-flight messages, messages received, or messages sent.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   deadLetterQueue:
   *     type: sqs-queue
   *     properties:
   *       alarms:
   *         - description: Dead-letter queue has messages — investigate failures
   *           trigger:
   *             type: sqs-queue-not-empty
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
   * import { SqsQueue, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const deadLetterQueue = new SqsQueue({
   *     alarms: [
   *       {
   *         description: 'Dead-letter queue has messages — investigate failures',
   *         trigger: {
   *           type: 'sqs-queue-not-empty'
   *         },
   *         notificationTargets: [
   *           {
   *             type: 'email',
   *             properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { deadLetterQueue } };
   * });
   * ```
   */
  type: 'sqs-queue-not-empty';
}

interface SqsQueueReceivedMessagesCountTrigger {
  type: 'sqs-queue-received-messages-count';
  properties: SqsQueueReceivedMessagesCountTriggerProps;
}

interface SqsQueueReceivedMessagesCountTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when received message count crosses this threshold.
   *
   * ---
   *
   * Default: fires if **average** messages received per period > `thresholdCount`.
   * Customize with `statistic` and `comparisonOperator`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ingestionQueue:
   *     type: sqs-queue
   *     properties:
   *       alarms:
   *         - description: Ingestion backlog growing
   *           trigger:
   *             type: sqs-queue-received-messages-count
   *             properties:
   *               thresholdCount: 5000
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ingestionQueue = new SqsQueue({
   *     alarms: [
   *       {
   *         description: 'Ingestion backlog growing',
   *         trigger: {
   *           type: 'sqs-queue-received-messages-count',
   *           properties: {
   *             thresholdCount: 5000
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { ingestionQueue } };
   * });
   * ```
   */
  thresholdCount: number;
}

interface ApplicationLoadBalancerErrorRateTrigger {
  type: 'application-load-balancer-error-rate';
  properties: ApplicationLoadBalancerErrorRateTriggerProps;
}

interface ApplicationLoadBalancerErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   *
   * ---
   *
   * Example: `5` fires the alarm if more than 5% of requests return errors.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   loadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       alarms:
   *         - description: Load balancer error rate too high
   *           trigger:
   *             type: application-load-balancer-error-rate
   *             properties:
   *               thresholdPercent: 5
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const loadBalancer = new ApplicationLoadBalancer({
   *     alarms: [
   *       {
   *         description: 'Load balancer error rate too high',
   *         trigger: {
   *           type: 'application-load-balancer-error-rate',
   *           properties: {
   *             thresholdPercent: 5
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { loadBalancer } };
   * });
   * ```
   */
  thresholdPercent: number;
}

interface ApplicationLoadBalancerUnhealthyTargetsTrigger {
  type: 'application-load-balancer-unhealthy-targets';
  properties: ApplicationLoadBalancerUnhealthyTargetsTriggerProps;
}

interface ApplicationLoadBalancerUnhealthyTargetsTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when the percentage of unhealthy targets exceeds this value.
   *
   * ---
   *
   * If the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   loadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       alarms:
   *         - description: Too many unhealthy targets behind the load balancer
   *           trigger:
   *             type: application-load-balancer-unhealthy-targets
   *             properties:
   *               thresholdPercent: 50
   *   apiService:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       containers:
   *         - name: api
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: my-org/api:latest
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: loadBalancer
   *                 priority: 1
   *                 containerPort: 3000
   *                 paths:
   *                   - '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const loadBalancer = new ApplicationLoadBalancer({
   *     alarms: [
   *       {
   *         description: 'Too many unhealthy targets behind the load balancer',
   *         trigger: {
   *           type: 'application-load-balancer-unhealthy-targets',
   *           properties: {
   *             thresholdPercent: 50
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new MultiContainerWorkload({
   *     resources: { cpu: 0.5, memory: 1024 },
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: { type: 'prebuilt-image', properties: { image: 'my-org/api:latest' } },
   *         events: [
   *           {
   *             type: 'application-load-balancer',
   *             properties: {
   *               loadBalancerName: 'loadBalancer',
   *               priority: 1,
   *               containerPort: 3000,
   *               paths: ['*']
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { loadBalancer, apiService } };
   * });
   * ```
   */
  thresholdPercent: number;
  /**
   * #### Only monitor health of these target container services. If omitted, monitors all targets.
   *
   * ---
   *
   * Only services actually targeted by the load balancer can be listed.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   loadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       alarms:
   *         - description: Critical service has unhealthy targets
   *           trigger:
   *             type: application-load-balancer-unhealthy-targets
   *             properties:
   *               thresholdPercent: 25
   *               onlyIncludeTargets:
   *                 - apiService
   *   apiService:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       containers:
   *         - name: api
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: my-org/api:latest
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: loadBalancer
   *                 priority: 1
   *                 containerPort: 3000
   *                 paths:
   *                   - '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const loadBalancer = new ApplicationLoadBalancer({
   *     alarms: [
   *       {
   *         description: 'Critical service has unhealthy targets',
   *         trigger: {
   *           type: 'application-load-balancer-unhealthy-targets',
   *           properties: {
   *             thresholdPercent: 25,
   *             onlyIncludeTargets: ['apiService']
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new MultiContainerWorkload({
   *     resources: { cpu: 0.5, memory: 1024 },
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: { type: 'prebuilt-image', properties: { image: 'my-org/api:latest' } },
   *         events: [
   *           {
   *             type: 'application-load-balancer',
   *             properties: {
   *               loadBalancerName: 'loadBalancer',
   *               priority: 1,
   *               containerPort: 3000,
   *               paths: ['*']
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { loadBalancer, apiService } };
   * });
   * ```
   */
  onlyIncludeTargets?: string[];
}

interface HttpApiGatewayErrorRateTrigger {
  type: 'http-api-gateway-error-rate';
  properties: HttpApiGatewayErrorRateTriggerProps;
}

interface HttpApiGatewayErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: http-api-gateway
   *     properties:
   *       alarms:
   *         - description: API Gateway error rate too high
   *           trigger:
   *             type: http-api-gateway-error-rate
   *             properties:
   *               thresholdPercent: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new HttpApiGateway({
   *     alarms: [
   *       {
   *         description: 'API Gateway error rate too high',
   *         trigger: {
   *           type: 'http-api-gateway-error-rate',
   *           properties: {
   *             thresholdPercent: 3
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  thresholdPercent: number;
}

interface HttpApiGatewayLatencyTrigger {
  type: 'http-api-gateway-latency';
  properties: HttpApiGatewayLatencyTriggerProps;
}

interface HttpApiGatewayLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when request-to-response latency exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** latency > threshold. Customize with `statistic` and `comparisonOperator`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: http-api-gateway
   *     properties:
   *       alarms:
   *         - description: API latency above SLA
   *           trigger:
   *             type: http-api-gateway-latency
   *             properties:
   *               thresholdMilliseconds: 1000
   *               statistic: p95
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new HttpApiGateway({
   *     alarms: [
   *       {
   *         description: 'API latency above SLA',
   *         trigger: {
   *           type: 'http-api-gateway-latency',
   *           properties: {
   *             thresholdMilliseconds: 1000,
   *             statistic: 'p95'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  thresholdMilliseconds: number;
}

interface LambdaErrorRateTrigger {
  type: 'lambda-error-rate';
  properties: LambdaErrorRateTriggerProps;
}

interface LambdaErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when the percentage of failed Lambda invocations exceeds this value.
   *
   * ---
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
   *           entryfilePath: ./src/worker.ts
   *       alarms:
   *         - description: Worker failing too often
   *           trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 5
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
   *     alarms: [
   *       {
   *         description: 'Worker failing too often',
   *         trigger: {
   *           type: 'lambda-error-rate',
   *           properties: {
   *             thresholdPercent: 5
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { worker } };
   * });
   * ```
   */
  thresholdPercent: number;
}

interface LambdaDurationTrigger {
  type: 'lambda-duration';
  properties: LambdaDurationTriggerProps;
}

interface LambdaDurationTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when Lambda execution time exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** duration > threshold. Customize with `statistic` and `comparisonOperator`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   imageProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/process-image.ts
   *       timeout: 30
   *       alarms:
   *         - description: Image processing approaching timeout
   *           trigger:
   *             type: lambda-duration
   *             properties:
   *               thresholdMilliseconds: 25000
   *               statistic: max
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const imageProcessor = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/process-image.ts' }),
   *     timeout: 30,
   *     alarms: [
   *       {
   *         description: 'Image processing approaching timeout',
   *         trigger: {
   *           type: 'lambda-duration',
   *           properties: {
   *             thresholdMilliseconds: 25000,
   *             statistic: 'max'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { imageProcessor } };
   * });
   * ```
   */
  thresholdMilliseconds: number;
}

interface RelationalDatabaseFreeMemoryTrigger {
  type: 'database-free-memory';
  properties: RelationalDatabaseFreeMemoryTriggerProps;
}

interface RelationalDatabaseFreeMemoryTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when free memory drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **average** free memory < threshold. Customize with `statistic` and `comparisonOperator`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database running low on free memory
   *           trigger:
   *             type: database-free-memory
   *             properties:
   *               thresholdMB: 256
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database running low on free memory',
   *         trigger: {
   *           type: 'database-free-memory',
   *           properties: {
   *             thresholdMB: 256
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdMB: number;
}

interface RelationalDatabaseReadLatencyTrigger {
  type: 'database-read-latency';
  properties: RelationalDatabaseReadLatencyTriggerProps;
}

interface RelationalDatabaseReadLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when average read I/O latency exceeds this value (seconds).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database read latency too high
   *           trigger:
   *             type: database-read-latency
   *             properties:
   *               thresholdSeconds: 0.05
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database read latency too high',
   *         trigger: {
   *           type: 'database-read-latency',
   *           properties: {
   *             thresholdSeconds: 0.05
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdSeconds: number;
}

interface RelationalDatabaseWriteLatencyTrigger {
  type: 'database-write-latency';
  properties: RelationalDatabaseWriteLatencyTriggerProps;
}

interface RelationalDatabaseWriteLatencyTriggerProps
  extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when average write I/O latency exceeds this value (seconds).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database write latency too high
   *           trigger:
   *             type: database-write-latency
   *             properties:
   *               thresholdSeconds: 0.1
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database write latency too high',
   *         trigger: {
   *           type: 'database-write-latency',
   *           properties: {
   *             thresholdSeconds: 0.1
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdSeconds: number;
}

interface RelationalDatabaseCPUUtilizationTrigger {
  type: 'database-cpu-utilization';
  properties: RelationalDatabaseCPUUtilizationTriggerProps;
}

interface RelationalDatabaseCPUUtilizationTriggerProps
  extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when CPU utilization exceeds this percentage.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database CPU utilization too high
   *           trigger:
   *             type: database-cpu-utilization
   *             properties:
   *               thresholdPercent: 85
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database CPU utilization too high',
   *         trigger: {
   *           type: 'database-cpu-utilization',
   *           properties: {
   *             thresholdPercent: 85
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdPercent: number;
}

interface RelationalDatabaseFreeStorageTrigger {
  type: 'database-free-storage';
  properties: RelationalDatabaseFreeStorageTriggerProps;
}

interface RelationalDatabaseFreeStorageTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when free disk space drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **minimum** free storage < threshold.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database running low on free storage
   *           trigger:
   *             type: database-free-storage
   *             properties:
   *               thresholdMB: 2048
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database running low on free storage',
   *         trigger: {
   *           type: 'database-free-storage',
   *           properties: {
   *             thresholdMB: 2048
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdMB: number;
}

interface RelationalDatabaseConnectionCountTrigger {
  type: 'database-connection-count';
  properties: RelationalDatabaseConnectionCountTriggerProps;
}

interface RelationalDatabaseConnectionCountTriggerProps
  extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when the number of active database connections exceeds this value.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Too many active database connections
   *           trigger:
   *             type: database-connection-count
   *             properties:
   *               thresholdCount: 180
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Too many active database connections',
   *         trigger: {
   *           type: 'database-connection-count',
   *           properties: {
   *             thresholdCount: 180
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   */
  thresholdCount: number;
}

interface TriggerWithCustomStatFunction {
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   *
   *
   * ---
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
   *           entryfilePath: ./src/worker.ts
   *       alarms:
   *         - description: 99th-percentile duration too high
   *           trigger:
   *             type: lambda-duration
   *             properties:
   *               thresholdMilliseconds: 3000
   *               statistic: p99
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
   *     alarms: [
   *       {
   *         description: '99th-percentile duration too high',
   *         trigger: {
   *           type: 'lambda-duration',
   *           properties: {
   *             thresholdMilliseconds: 3000,
   *             statistic: 'p99'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { worker } };
   * });
   * ```
   *
   * @default avg
   */
  statistic?: StatisticFunction;
}
interface TriggerWithCustomComparison {
  /**
   * #### How to compare the metric value against the threshold.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       alarms:
   *         - description: Database free memory dropped below threshold
   *           trigger:
   *             type: database-free-memory
   *             properties:
   *               thresholdMB: 512
   *               comparisonOperator: LessThanThreshold
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: {
   *       masterUserName: 'admin',
   *       masterUserPassword: $Secret('db-password')
   *     },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     alarms: [
   *       {
   *         description: 'Database free memory dropped below threshold',
   *         trigger: {
   *           type: 'database-free-memory',
   *           properties: {
   *             thresholdMB: 512,
   *             comparisonOperator: 'LessThanThreshold'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { mainDatabase } };
   * });
   * ```
   *
   * @default GreaterThanThreshold
   */
  comparisonOperator?: ComparisonOperator;
}

type StatisticFunction = 'avg' | 'p90' | 'p95' | 'p99' | 'min' | 'max' | 'sum';

type ComparisonOperator =
  | 'GreaterThanThreshold'
  | 'GreaterThanOrEqualToThreshold'
  | 'LessThanThreshold'
  | 'LessThanOrEqualToThreshold';

type AlarmNotificationEventRuleInput = {
  description: string;
  time: string;
  stateValue: string;
  alarmAwsResourceName: string;
  stackName: string;
  alarmConfig: AlarmDefinition;
  affectedResource: AlarmAffectedResourceInfo;
  comparisonOperator: ComparisonOperator;
  measuringUnit: string;
  alarmLink: string;
  statFunction: string;
};

type AlarmAffectedResourceInfo = {
  displayName: string;
  link: string;
  logLink?: string;
};
```
