# ApplicationLoadBalancerAlarm API Reference

## TypeScript definition

```typescript
import type { AlarmEvaluation, ApplicationLoadBalancerCustomTrigger, ApplicationLoadBalancerErrorRateTrigger, ApplicationLoadBalancerUnhealthyTargetsTrigger, DiscordIntegration, EmailIntegration, MsTeamsIntegration, SlackIntegration, WebhookIntegration } from 'stacktape';

type ApplicationLoadBalancerAlarm = {
  trigger: ApplicationLoadBalancerAlarmTrigger;
  /** Custom alarm description used in notification messages and the AWS console. */
  description?: string;
  /** How long and how often to evaluate the metric before triggering. */
  evaluation?: AlarmEvaluation;
  /** Whether alarm state changes should appear in monitoring history. */
  includeInHistory?: boolean;
  /** Where to send notifications when the alarm fires — Slack, MS Teams, or email. */
  notificationTargets?: Array<ApplicationLoadBalancerAlarmNotificationTargets>;
};

/** Union choices used by the properties above. */
type ApplicationLoadBalancerAlarmTrigger =
  | ApplicationLoadBalancerCustomTrigger
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger;

type ApplicationLoadBalancerAlarmNotificationTargets =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;
```

## Property: `trigger`

- Required: yes
- Type: `application-load-balancer-custom | application-load-balancer-error-rate | application-load-balancer-unhealthy-targets`

Choices:
- `application-load-balancer-custom` (`ApplicationLoadBalancerCustomTrigger`). Properties: `metric: string: "ActiveConnectionCount" | "AnomalousHostCount" | "ClientTLSNegotiationErrorCount" | "ConsumedLCUs" | "DesyncMitigationMode_NonCompliant_Request_Count" | "DroppedInvalidHeaderRequestCount" | "ELBAuthError" | "ELBAuthFailure" | "ELBAuthLatency" | "ELBAuthRefreshTokenSuccess" | "ELBAuthSuccess" | "ELBAuthUserClaimsSizeExceeded" | "ForwardedInvalidHeaderRequestCount" | "GrpcRequestCount" | "HTTPCode_ELB_3XX_Count" | "HTTPCode_ELB_4XX_Count" | "HTTPCode_ELB_500_Count" | "HTTPCode_ELB_502_Count" | "HTTPCode_ELB_503_Count" | "HTTPCode_ELB_504_Count" | "HTTPCode_ELB_5XX_Count" | "HTTPCode_Target_2XX_Count" | "HTTPCode_Target_3XX_Count" | "HTTPCode_Target_4XX_Count" | "HTTPCode_Target_5XX_Count" | "HTTP_Fixed_Response_Count" | "HTTP_Redirect_Count" | "HTTP_Redirect_Url_Limit_Exceeded_Count" | "HealthyHostCount" | "HealthyStateDNS" | "HealthyStateRouting" | "IPv6ProcessedBytes" | "IPv6RequestCount" | "LambdaInternalError" | "LambdaTargetProcessedBytes" | "LambdaUserError" | "MitigatedHostCount" | "NewConnectionCount" | "NonStickyRequestCount" | "ProcessedBytes" | "RejectedConnectionCount" | "RequestCount" | "RequestCountPerTarget" | "RuleEvaluations" | "TargetConnectionErrorCount" | "TargetResponseTime" | "TargetTLSNegotiationErrorCount" | "UnHealthyHostCount" | "UnhealthyRoutingRequestCount" | "UnhealthyStateDNS" | "UnhealthyStateRouting"`, `threshold: number`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `application-load-balancer-error-rate` (`ApplicationLoadBalancerErrorRateTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `application-load-balancer-unhealthy-targets` (`ApplicationLoadBalancerUnhealthyTargetsTrigger`). Properties: `thresholdPercent: number`, `onlyIncludeTargets?: Array<string>`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.

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
