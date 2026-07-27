# AlarmDefinition API Reference

## TypeScript definition

```typescript
import type { AlarmEvaluation, ApplicationLoadBalancerCustomTrigger, ApplicationLoadBalancerErrorRateTrigger, ApplicationLoadBalancerUnhealthyTargetsTrigger, DiscordIntegration, EmailIntegration, HttpApiGatewayErrorRateTrigger, HttpApiGatewayLatencyTrigger, LambdaDurationTrigger, LambdaErrorRateTrigger, MsTeamsIntegration, RelationalDatabaseCPUUtilizationTrigger, RelationalDatabaseConnectionCountTrigger, RelationalDatabaseFreeMemoryTrigger, RelationalDatabaseFreeStorageTrigger, RelationalDatabaseReadLatencyTrigger, RelationalDatabaseWriteLatencyTrigger, SlackIntegration, SqsQueueNotEmptyTrigger, SqsQueueReceivedMessagesCountTrigger, WebhookIntegration } from 'stacktape';

type AlarmDefinition = {
  /** A unique name for this alarm (e.g., api-error-rate, db-cpu-high). */
  name: string;
  /** The metric and threshold that fires this alarm. */
  trigger: AlarmDefinitionTrigger;
  /** Custom alarm description used in notification messages and the AWS console. */
  description?: string;
  /** How long and how often to evaluate the metric before triggering. */
  evaluation?: AlarmEvaluation;
  /** Only activate this alarm for these services. If omitted, applies to all services. */
  forServices?: Array<string>;
  /** Only activate this alarm for these stages (e.g., production). If omitted, applies to all stages. */
  forStages?: Array<string>;
  /** Whether alarm state changes should appear in monitoring history. */
  includeInHistory?: boolean;
  /** Where to send notifications when the alarm fires — Slack, MS Teams, or email. */
  notificationTargets?: Array<AlarmDefinitionNotificationTargets>;
};

/** Union choices used by the properties above. */
type AlarmDefinitionTrigger =
  | ApplicationLoadBalancerCustomTrigger
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger
  | SqsQueueReceivedMessagesCountTrigger
  | SqsQueueNotEmptyTrigger
  | LambdaErrorRateTrigger
  | LambdaDurationTrigger
  | HttpApiGatewayErrorRateTrigger
  | HttpApiGatewayLatencyTrigger
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger;

type AlarmDefinitionNotificationTargets =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;
```

## Property: `name`

- Required: yes
- Type: `string`

A unique name for this alarm (e.g., `api-error-rate`, `db-cpu-high`).

## Property: `trigger`

- Required: yes
- Type: `application-load-balancer-custom | application-load-balancer-error-rate | application-load-balancer-unhealthy-targets | sqs-queue-received-messages-count | sqs-queue-not-empty | lambda-error-rate | lambda-duration | http-api-gateway-error-rate | http-api-gateway-latency | database-read-latency | database-write-latency | database-cpu-utilization | database-free-storage | database-free-memory | database-connection-count`

The metric and threshold that fires this alarm.

`type` selects what to monitor (error rate, CPU, latency, etc.) and `properties` set the threshold.

Choices:
- `application-load-balancer-custom` (`ApplicationLoadBalancerCustomTrigger`). Properties: `metric: string: "ActiveConnectionCount" | "AnomalousHostCount" | "ClientTLSNegotiationErrorCount" | "ConsumedLCUs" | "DesyncMitigationMode_NonCompliant_Request_Count" | "DroppedInvalidHeaderRequestCount" | "ELBAuthError" | "ELBAuthFailure" | "ELBAuthLatency" | "ELBAuthRefreshTokenSuccess" | "ELBAuthSuccess" | "ELBAuthUserClaimsSizeExceeded" | "ForwardedInvalidHeaderRequestCount" | "GrpcRequestCount" | "HTTPCode_ELB_3XX_Count" | "HTTPCode_ELB_4XX_Count" | "HTTPCode_ELB_500_Count" | "HTTPCode_ELB_502_Count" | "HTTPCode_ELB_503_Count" | "HTTPCode_ELB_504_Count" | "HTTPCode_ELB_5XX_Count" | "HTTPCode_Target_2XX_Count" | "HTTPCode_Target_3XX_Count" | "HTTPCode_Target_4XX_Count" | "HTTPCode_Target_5XX_Count" | "HTTP_Fixed_Response_Count" | "HTTP_Redirect_Count" | "HTTP_Redirect_Url_Limit_Exceeded_Count" | "HealthyHostCount" | "HealthyStateDNS" | "HealthyStateRouting" | "IPv6ProcessedBytes" | "IPv6RequestCount" | "LambdaInternalError" | "LambdaTargetProcessedBytes" | "LambdaUserError" | "MitigatedHostCount" | "NewConnectionCount" | "NonStickyRequestCount" | "ProcessedBytes" | "RejectedConnectionCount" | "RequestCount" | "RequestCountPerTarget" | "RuleEvaluations" | "TargetConnectionErrorCount" | "TargetResponseTime" | "TargetTLSNegotiationErrorCount" | "UnHealthyHostCount" | "UnhealthyRoutingRequestCount" | "UnhealthyStateDNS" | "UnhealthyStateRouting"`, `threshold: number`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `application-load-balancer-error-rate` (`ApplicationLoadBalancerErrorRateTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `application-load-balancer-unhealthy-targets` (`ApplicationLoadBalancerUnhealthyTargetsTrigger`). Properties: `thresholdPercent: number`, `onlyIncludeTargets?: Array<string>`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `sqs-queue-received-messages-count` (`SqsQueueReceivedMessagesCountTrigger`). Properties: `thresholdCount: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `sqs-queue-not-empty` (`SqsQueueNotEmptyTrigger`)
- `lambda-error-rate` (`LambdaErrorRateTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `lambda-duration` (`LambdaDurationTrigger`). Properties: `thresholdMilliseconds: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `http-api-gateway-error-rate` (`HttpApiGatewayErrorRateTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `http-api-gateway-latency` (`HttpApiGatewayLatencyTrigger`). Properties: `thresholdMilliseconds: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-read-latency` (`RelationalDatabaseReadLatencyTrigger`). Properties: `thresholdSeconds: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-write-latency` (`RelationalDatabaseWriteLatencyTrigger`). Properties: `thresholdSeconds: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-cpu-utilization` (`RelationalDatabaseCPUUtilizationTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-free-storage` (`RelationalDatabaseFreeStorageTrigger`). Properties: `thresholdMB: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-free-memory` (`RelationalDatabaseFreeMemoryTrigger`). Properties: `thresholdMB: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.
- `database-connection-count` (`RelationalDatabaseConnectionCountTrigger`). Properties: `thresholdCount: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.

## Property: `description`

- Required: no
- Type: `string`

Custom alarm description used in notification messages and the AWS console.

### Example 1 (yaml)

```yaml
resources:
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserName: admin
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
      alarms:
        - trigger:
            type: database-cpu-utilization
            properties:
              thresholdPercent: 80
          description: Database CPU sustained above 80% — consider scaling up
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserName: 'admin',
      masterUserPassword: $Secret('db-password')
    },
    engine: {
      type: 'postgres',
      properties: {
        version: '16.2',
        primaryInstance: { instanceSize: 'db.t3.micro' }
      }
    },
    alarms: [
      {
        trigger: {
          type: 'database-cpu-utilization',
          properties: { thresholdPercent: 80 }
        },
        description: 'Database CPU sustained above 80% — consider scaling up'
      }
    ]
  });

  return { resources: { mainDatabase } };
});
```

## Property: `evaluation`

- Required: no
- Type: `AlarmEvaluation`

How long and how often to evaluate the metric before triggering.

Controls the evaluation window (period), how many periods to look at, and how many must breach
the threshold to fire the alarm. Useful for filtering out short spikes.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/api.ts
      memory: 512
      timeout: 10
      alarms:
        - description: API error rate too high
          trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
          evaluation:
            period: 60
            evaluationPeriods: 5
            breachedPeriods: 3
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    memory: 512,
    timeout: 10,
    alarms: [
      {
        description: 'API error rate too high',
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 5 }
        },
        evaluation: {
          period: 60,
          evaluationPeriods: 5,
          breachedPeriods: 3
        }
      }
    ]
  });

  return { resources: { apiFunction } };
});
```

## Property: `forServices`

- Required: no
- Type: `Array<string>`

Only activate this alarm for these services. If omitted, applies to all services.

## Property: `forStages`

- Required: no
- Type: `Array<string>`

Only activate this alarm for these stages (e.g., `production`). If omitted, applies to all stages.

## Property: `includeInHistory`

- Required: no
- Type: `boolean`
- Default: `true`

Whether alarm state changes should appear in monitoring history.

### Example 1 (yaml)

```yaml
resources:
  jobsQueue:
    type: sqs-queue
    properties:
      alarms:
        - description: Jobs queue backing up
          trigger:
            type: sqs-queue-received-messages-count
            properties:
              thresholdCount: 1000
          includeInHistory: false
```

### Example 2 (typescript)

```typescript
import { SqsQueue, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jobsQueue = new SqsQueue({
    alarms: [
      {
        description: 'Jobs queue backing up',
        trigger: {
          type: 'sqs-queue-received-messages-count',
          properties: { thresholdCount: 1000 }
        },
        includeInHistory: false
      }
    ]
  });

  return { resources: { jobsQueue } };
});
```

## Property: `notificationTargets`

- Required: no
- Type: `Array<ms-teams | slack | email | discord | webhook>`

Where to send notifications when the alarm fires — Slack, MS Teams, or email.

Choices:
- `ms-teams` (`MsTeamsIntegration`). Properties: `webhookUrl: string`.
- `slack` (`SlackIntegration`). Properties: `conversationId: string`, `accessToken: string`.
- `email` (`EmailIntegration`). Properties: `sender: string`, `recipient: string`.
- `discord` (`DiscordIntegration`). Properties: `webhookUrl: string`.
- `webhook` (`WebhookIntegration`). Properties: `url: string`, `secret?: string`, `headers?: Record<string,string>`.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: http-api-gateway
    properties:
      alarms:
        - description: API returning too many errors
          trigger:
            type: http-api-gateway-error-rate
            properties:
              thresholdPercent: 2
          notificationTargets:
            - type: slack
              properties:
                conversationId: C12345678
                accessToken: $Secret('slack-bot-token')
            - type: email
              properties:
                sender: alerts@example.com
                recipient: oncall@example.com
            - type: ms-teams
              properties:
                webhookUrl: $Secret('teams-webhook-url')
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const api = new HttpApiGateway({
    alarms: [
      {
        description: 'API returning too many errors',
        trigger: {
          type: 'http-api-gateway-error-rate',
          properties: { thresholdPercent: 2 }
        },
        notificationTargets: [
          {
            type: 'slack',
            properties: { conversationId: 'C12345678', accessToken: $Secret('slack-bot-token') }
          },
          {
            type: 'email',
            properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' }
          },
          {
            type: 'ms-teams',
            properties: { webhookUrl: $Secret('teams-webhook-url') }
          }
        ]
      }
    ]
  });

  return { resources: { api } };
});
```
