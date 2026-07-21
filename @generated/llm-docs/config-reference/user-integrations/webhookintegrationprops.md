# WebhookIntegrationProps API Reference

## TypeScript definition

```typescript
import type { Record<string,string> } from 'stacktape';

type WebhookIntegrationProps = {
  /** The URL to send webhook POST requests to. */
  url: string;
  /** Optional custom headers to include in each request. */
  headers?: Record<string,string>;
  /** Optional signing secret for HMAC-SHA256 payload verification. */
  secret?: string;
};
```

## Property: `url`

- Required: yes
- Type: `string`

The URL to send webhook POST requests to.

### Example 1 (yaml)

```yaml
resources:
  schedulerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/scheduler.ts
      memory: 256
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 10
          description: Scheduler errors detected
          notificationTargets:
            - type: webhook
              properties:
                url: https://ops.mycompany.com/hooks/stacktape-alarms
                secret: $Secret('webhook-signing-secret')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const schedulerFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/scheduler.ts' }
    },
    memory: 256,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
        description: 'Scheduler errors detected',
        notificationTargets: [
          {
            type: 'webhook',
            properties: {
              url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
              secret: $Secret('webhook-signing-secret')
            }
          }
        ]
      }
    ]
  });
  return { resources: { schedulerFunction } };
});
```

## Property: `headers`

- Required: no
- Type: `Record<string,string>`

Optional custom headers to include in each request.

### Example 1 (yaml)

```yaml
resources:
  schedulerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/scheduler.ts
      memory: 256
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 10
          description: Scheduler errors detected
          notificationTargets:
            - type: webhook
              properties:
                url: https://ops.mycompany.com/hooks/stacktape-alarms
                secret: $Secret('webhook-signing-secret')
                headers:
                  X-Environment: production
                  Authorization: $Secret('webhook-auth-header')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const schedulerFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/scheduler.ts' }
    },
    memory: 256,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
        description: 'Scheduler errors detected',
        notificationTargets: [
          {
            type: 'webhook',
            properties: {
              url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
              secret: $Secret('webhook-signing-secret'),
              headers: {
                'X-Environment': 'production',
                Authorization: $Secret('webhook-auth-header')
              }
            }
          }
        ]
      }
    ]
  });
  return { resources: { schedulerFunction } };
});
```

## Property: `secret`

- Required: no
- Type: `string`

Optional signing secret for HMAC-SHA256 payload verification.

If provided, each request includes an `X-Stacktape-Signature` header.

### Example 1 (yaml)

```yaml
resources:
  schedulerFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/scheduler.ts
      memory: 256
      timeout: 30
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 10
          description: Scheduler errors detected
          notificationTargets:
            - type: webhook
              properties:
                url: https://ops.mycompany.com/hooks/stacktape-alarms
                secret: $Secret('webhook-signing-secret')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const schedulerFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/scheduler.ts' }
    },
    memory: 256,
    timeout: 30,
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
        description: 'Scheduler errors detected',
        notificationTargets: [
          {
            type: 'webhook',
            properties: {
              url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
              secret: $Secret('webhook-signing-secret')
            }
          }
        ]
      }
    ]
  });
  return { resources: { schedulerFunction } };
});
```
