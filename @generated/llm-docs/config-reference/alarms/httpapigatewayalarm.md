# HttpApiGatewayAlarm API Reference

## TypeScript definition

```typescript
import type { AlarmEvaluation, DiscordIntegration, EmailIntegration, HttpApiGatewayErrorRateTrigger, HttpApiGatewayLatencyTrigger, MsTeamsIntegration, SlackIntegration, WebhookIntegration } from 'stacktape';

type HttpApiGatewayAlarm = {
  trigger: HttpApiGatewayAlarmTrigger;
  /** Custom alarm description used in notification messages and the AWS console. */
  description?: string;
  /** How long and how often to evaluate the metric before triggering. */
  evaluation?: AlarmEvaluation;
  /** Whether alarm state changes should appear in monitoring history. */
  includeInHistory?: boolean;
  /** Where to send notifications when the alarm fires — Slack, MS Teams, or email. */
  notificationTargets?: Array<HttpApiGatewayAlarmNotificationTargets>;
};

/** Union choices used by the properties above. */
type HttpApiGatewayAlarmTrigger =
  | HttpApiGatewayErrorRateTrigger
  | HttpApiGatewayLatencyTrigger;

type HttpApiGatewayAlarmNotificationTargets =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;
```

## Property: `trigger`

- Required: yes
- Type: `http-api-gateway-error-rate | http-api-gateway-latency`

Choices:
- `http-api-gateway-error-rate` (`HttpApiGatewayErrorRateTrigger`). Properties: `thresholdPercent: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`.
- `http-api-gateway-latency` (`HttpApiGatewayLatencyTrigger`). Properties: `thresholdMilliseconds: number`, `comparisonOperator?: string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`, `statistic?: string: "avg" | "max" | "min" | "p90" | "p95" | "p99" | "sum"`.

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
