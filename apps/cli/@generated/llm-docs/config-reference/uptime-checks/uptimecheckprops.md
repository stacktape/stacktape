# UptimeCheckProps API Reference

## TypeScript definition

```typescript
import type { BodyContainsAssertion, ConsoleChannelIntegration, DiscordIntegration, EmailIntegration, MsTeamsIntegration, SlackIntegration, StatusCodeAssertion, UptimeCheckEvaluation, WebhookIntegration } from 'stacktape';

type UptimeCheckProps = {
  /** The URL to monitor. */
  url: string;
  /** Conditions the response must meet for the probe to count as successful. */
  assertions?: Array<UptimeCheckAssertions>;
  /** Temporarily pause the check without deleting it. */
  enabled?: boolean;
  /** How many consecutive failed or successful evaluations flip the check between up and down. */
  evaluation?: UptimeCheckEvaluation;
  /** Whether the probe follows HTTP redirects (up to 5). */
  followRedirects?: boolean;
  /** How often each monitoring region probes the URL, in seconds. */
  intervalSeconds?: 30 | 60;
  /** HTTP method used for the probe. */
  method?: "GET" | "HEAD";
  /** Where to send notifications when the check goes down or recovers. */
  notificationChannels?: Array<UptimeCheckNotificationChannels>;
  /** AWS regions the URL is probed from. */
  regions?: Array<"af-south-1" | "ap-east-1" | "ap-northeast-1" | "ap-northeast-2" | "ap-northeast-3" | "ap-south-1" | "ap-southeast-1" | "ap-southeast-2" | "ca-central-1" | "eu-central-1" | "eu-north-1" | "eu-south-1" | "eu-west-1" | "eu-west-2" | "eu-west-3" | "me-south-1" | "sa-east-1" | "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2">;
  /** How long to wait for a response before the probe counts as failed, in seconds. */
  timeoutSeconds?: number;
};

/** Union choices used by the properties above. */
type UptimeCheckAssertions =
  | StatusCodeAssertion
  | BodyContainsAssertion;

type UptimeCheckNotificationChannels =
  | SlackIntegration
  | MsTeamsIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration
  | ConsoleChannelIntegration;
```

## Property: `url`

- Required: yes
- Type: `string`

The URL to monitor.

The check periodically sends an HTTP request to this URL from multiple AWS regions and alerts you when it
stops responding successfully. Use a literal URL, or reference a deployed resource's URL with
`$ResourceParam()`.

Must be a publicly reachable `https://` or `http://` URL. Monitoring of VPC-internal endpoints is not
supported yet.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512

  apiHealth:
    type: uptime-check
    properties:
      url: $ResourceParam('api', 'url')
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, WebService, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: { entryfilePath: 'src/server.ts' }
    },
    resources: { cpu: 0.25, memory: 512 }
  });

  const apiHealth = new UptimeCheck({
    url: $ResourceParam('api', 'url'),
  });

  return { resources: { api, apiHealth } };
});
```

## Property: `assertions`

- Required: no
- Type: `Array<status-code | body-contains>`

Conditions the response must meet for the probe to count as successful.

When omitted, any `2xx` or `3xx` status code counts as up. All listed assertions must pass.

TLS certificate expiry is tracked automatically on every `https://` check and shown on the
check's Console page; expiry alerts are planned.

Choices:
- `status-code` (`StatusCodeAssertion`). Properties: `accepted: Array<number>`.
- `body-contains` (`BodyContainsAssertion`). Properties: `value: string`.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      assertions:
        - type: status-code
          properties:
            accepted: [200]
        - type: body-contains
          properties:
            value: '"status":"ok"'
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    assertions: [
      { type: 'status-code', properties: { accepted: [200] } },
      { type: 'body-contains', properties: { value: '"status":"ok"' } }
    ]
  });
  return { resources: { apiHealth } };
});
```

## Property: `enabled`

- Required: no
- Type: `boolean`
- Default: `true`

Temporarily pause the check without deleting it.

A paused check keeps its history and incidents but stops probing and alerting. Useful during planned
maintenance.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      enabled: false
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    enabled: false
  });
  return { resources: { apiHealth } };
});
```

## Property: `evaluation`

- Required: no
- Type: `UptimeCheckEvaluation`

How many consecutive failed or successful evaluations flip the check between up and down.

Failures must be confirmed by multiple monitoring regions within the same evaluation window before the
check is considered down — a blip in a single region never pages you.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      evaluation:
        consecutiveFailures: 3
        consecutiveSuccesses: 2
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    evaluation: { consecutiveFailures: 3, consecutiveSuccesses: 2 }
  });
  return { resources: { apiHealth } };
});
```

## Property: `followRedirects`

- Required: no
- Type: `boolean`
- Default: `true`

Whether the probe follows HTTP redirects (up to 5).

When disabled, a `3xx` response is evaluated directly against your assertions.

### Example 1 (yaml)

```yaml
resources:
  wwwRedirect:
    type: uptime-check
    properties:
      url: https://example.com
      followRedirects: false
      assertions:
        - type: status-code
          properties:
            accepted: [301]
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const wwwRedirect = new UptimeCheck({
    url: 'https://example.com',
    followRedirects: false,
    assertions: [{ type: 'status-code', properties: { accepted: [301] } }]
  });
  return { resources: { wwwRedirect } };
});
```

## Property: `intervalSeconds`

- Required: no
- Type: `number: 30 | 60`
- Default: `60`

How often each monitoring region probes the URL, in seconds.

With the default 3 monitoring regions, an interval of `60` means the endpoint is probed 3 times per
minute in total (once per region).

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      intervalSeconds: 30
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    intervalSeconds: 30
  });
  return { resources: { apiHealth } };
});
```

## Property: `method`

- Required: no
- Type: `string: "GET" | "HEAD"`
- Default: `GET`

HTTP method used for the probe.

`HEAD` is cheaper for endpoints that support it (no response body is transferred), but `body-contains`
assertions require `GET`.

### Example 1 (yaml)

```yaml
resources:
  homepage:
    type: uptime-check
    properties:
      url: https://example.com
      method: HEAD
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const homepage = new UptimeCheck({
    url: 'https://example.com',
    method: 'HEAD'
  });
  return { resources: { homepage } };
});
```

## Property: `notificationChannels`

- Required: no
- Type: `Array<slack | ms-teams | email | discord | webhook | console-channel>`

Where to send notifications when the check goes down or recovers.

Accepts inline destinations (`slack`, `ms-teams`, `discord`, `email`, `webhook`) and references to
channels configured in the Stacktape Console (`console-channel`). State changes always appear in the
Console's monitoring history, even with no channels configured.

Choices:
- `slack` (`SlackIntegration`). Properties: `conversationId: string`, `accessToken: string`.
- `ms-teams` (`MsTeamsIntegration`). Properties: `webhookUrl: string`.
- `email` (`EmailIntegration`). Properties: `sender: string`, `recipient: string`.
- `discord` (`DiscordIntegration`). Properties: `webhookUrl: string`.
- `webhook` (`WebhookIntegration`). Properties: `url: string`, `secret?: string`, `headers?: Record<string,string>`.
- `console-channel` (`ConsoleChannelIntegration`). Properties: `channelName: string`.

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
        - type: email
          properties:
            sender: alerts@example.com
            recipient: oncall@example.com
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    notificationChannels: [
      { type: 'console-channel', properties: { channelName: 'engineering-slack' } },
      { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
    ]
  });
  return { resources: { apiHealth } };
});
```

## Property: `regions`

- Required: no
- Type: `Array<string: "af-south-1" | "ap-east-1" | "ap-northeast-1" | "ap-northeast-2" | "ap-northeast-3" | "ap-south-1" | "ap-southeast-1" | "ap-southeast-2" | "ca-central-1" | "eu-central-1" | "eu-north-1" | "eu-south-1" | "eu-west-1" | "eu-west-2" | "eu-west-3" | "me-south-1" | "sa-east-1" | "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2">`

AWS regions the URL is probed from.

Probes run from lightweight monitoring functions in these regions of your own AWS account. Using multiple
distant regions gives you an outside view per geography and prevents a single region's network blip from
triggering a false alert.

When omitted, the check runs from the stack's region plus two distant regions.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      regions:
        - eu-west-1
        - us-east-1
        - ap-southeast-1
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1']
  });
  return { resources: { apiHealth } };
});
```

## Property: `timeoutSeconds`

- Required: no
- Type: `number`
- Default: `10`

How long to wait for a response before the probe counts as failed, in seconds.

Allowed range: 1 to 30.

Probes run inside shared per-minute workers. When a worker is near its time budget — many slow
checks at once, or 30-second-interval checks sharing the region — a probe that cannot get its
full timeout is dropped for that tick instead of being reported as down.

### Example 1 (yaml)

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      timeoutSeconds: 5
```

### Example 2 (typescript)

```typescript
import { UptimeCheck, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiHealth = new UptimeCheck({
    url: 'https://api.example.com/health',
    timeoutSeconds: 5
  });
  return { resources: { apiHealth } };
});
```
