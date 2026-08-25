# ConsoleChannelIntegrationProps API Reference

## TypeScript definition

```typescript
type ConsoleChannelIntegrationProps = {
  /** Name of a notification channel configured in the Stacktape Console. */
  channelName: string;
};
```

## Property: `channelName`

- Required: yes
- Type: `string`

Name of a notification channel configured in the Stacktape Console.

Channels are created once per organization in the Console (**Monitoring** → **Channels**) and hold the
delivery credentials (Slack tokens, webhook URLs, ...). Referencing a channel by name lets many alarms and
uptime checks share one destination without repeating credentials in the config.

The referenced channel must exist in your organization — the deployment fails with a clear error if it
doesn't. Delivery happens through the Stacktape Console, so events routed to a console channel always
appear in the alert history.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      notificationChannels:
        - type: console-channel
          properties:
            channelName: engineering-slack
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    notificationChannels: [
      {
        type: 'console-channel',
        properties: {
          channelName: 'engineering-slack'
        }
      }
    ]
  });
  return { resources: { apiHealth } };
});
```
