# SlackIntegrationProps API Reference

## TypeScript definition

```typescript
type SlackIntegrationProps = {
  /** Bot User OAuth Token for your Slack app. Store as $Secret() for security. */
  accessToken: string;
  /** The Slack channel or DM ID to send notifications to. */
  conversationId: string;
};
```

## Property: `accessToken`

- Required: yes
- Type: `string`

Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.

Create a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.

### Example 1 (yaml)

```yaml
resources:
  workerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      memory: 512
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
          description: Worker error rate is too high
          notificationTargets:
            - type: slack
              properties:
                conversationId: C0123456789
                accessToken: $Secret('slack-bot-token')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const workerFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/worker.ts' }
    },
    memory: 512,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
        description: 'Worker error rate is too high',
        notificationTargets: [
          {
            type: 'slack',
            properties: {
              conversationId: 'C0123456789',
              accessToken: $Secret('slack-bot-token')
            }
          }
        ]
      }
    ]
  });
  return { resources: { workerFunction } };
});
```

## Property: `conversationId`

- Required: yes
- Type: `string`

The Slack channel or DM ID to send notifications to.

To find the ID: open the channel, click its name, and look at the bottom of the **About** tab.

### Example 1 (yaml)

```yaml
resources:
  workerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      memory: 512
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
          description: Worker error rate is too high
          notificationTargets:
            - type: slack
              properties:
                conversationId: C0123456789
                accessToken: $Secret('slack-bot-token')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const workerFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/worker.ts' }
    },
    memory: 512,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
        description: 'Worker error rate is too high',
        notificationTargets: [
          {
            type: 'slack',
            properties: {
              conversationId: 'C0123456789',
              accessToken: $Secret('slack-bot-token')
            }
          }
        ]
      }
    ]
  });
  return { resources: { workerFunction } };
});
```
