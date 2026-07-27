# DiscordIntegrationProps API Reference

## TypeScript definition

```typescript
type DiscordIntegrationProps = {
  /** Discord Webhook URL for the channel. Store as $Secret() for security. */
  webhookUrl: string;
};
```

## Property: `webhookUrl`

- Required: yes
- Type: `string`

Discord Webhook URL for the channel. Store as `$Secret()` for security.

Create a webhook in your Discord channel settings (Edit Channel → Integrations → Webhooks).

### Example 1 (yaml)

```yaml
resources:
  ingestFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/ingest.ts
      memory: 256
      timeout: 60
      alarms:
        - trigger:
            type: lambda-duration
            properties:
              thresholdMilliseconds: 30000
          description: Ingest job is taking too long
          notificationTargets:
            - type: discord
              properties:
                webhookUrl: $Secret('discord-webhook-url')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const ingestFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/ingest.ts' }
    },
    memory: 256,
    timeout: 60,
    alarms: [
      {
        trigger: { type: 'lambda-duration', properties: { thresholdMilliseconds: 30000 } },
        description: 'Ingest job is taking too long',
        notificationTargets: [
          {
            type: 'discord',
            properties: {
              webhookUrl: $Secret('discord-webhook-url')
            }
          }
        ]
      }
    ]
  });
  return { resources: { ingestFunction } };
});
```
