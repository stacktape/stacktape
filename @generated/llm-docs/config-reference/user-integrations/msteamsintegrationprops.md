# MsTeamsIntegrationProps API Reference

## TypeScript definition

```typescript
type MsTeamsIntegrationProps = {
  /** Incoming Webhook URL for the MS Teams channel. Store as $Secret() for security. */
  webhookUrl: string;
};
```

## Property: `webhookUrl`

- Required: yes
- Type: `string`

Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.

Create an Incoming Webhook connector in your Teams channel settings to get this URL.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      memory: 1024
      timeout: 15
      alarms:
        - trigger:
            type: lambda-duration
            properties:
              thresholdMilliseconds: 5000
          description: API function is running slow
          notificationTargets:
            - type: ms-teams
              properties:
                webhookUrl: $Secret('ms-teams-webhook-url')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/api.ts' }
    },
    memory: 1024,
    timeout: 15,
    alarms: [
      {
        trigger: { type: 'lambda-duration', properties: { thresholdMilliseconds: 5000 } },
        description: 'API function is running slow',
        notificationTargets: [
          {
            type: 'ms-teams',
            properties: {
              webhookUrl: $Secret('ms-teams-webhook-url')
            }
          }
        ]
      }
    ]
  });
  return { resources: { apiFunction } };
});
```
