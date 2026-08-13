# RedisLogging API Reference

Resource type: `redis-cluster`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type RedisLogging = {
  /** Disable slow query logging. */
  disabled?: boolean;
  /** Log format. */
  format?: "json" | "text";
  /** Choose the lower-ingestion-cost CloudWatch Logs class for logs that you inspect only occasionally.

`infrequent-access` still supports Logs Insights, but it does not support live tail, metric or subscription
filters, embedded metrics, or Stacktape log forwarding. A log group's class cannot be changed after it is
created, so use this for new resources or stages. */
  logClass?: "infrequent-access" | "standard";
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: RedisLoggingLogForwarding;
  /** How many days to keep logs. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type RedisLoggingLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable slow query logging.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      logging:
        disabled: true
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    logging: {
      disabled: true
    }
  });

  return { resources: { redis } };
});
```

## Property: `format`

- Required: no
- Type: `string: "json" | "text"`
- Default: `json`

Log format.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      logging:
        format: text
        retentionDays: 90
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    logging: {
      format: 'text',
      retentionDays: 90
    }
  });

  return { resources: { redis } };
});
```

## Property: `logClass`

- Required: no
- Type: `string: "infrequent-access" | "standard"`
- Default: `standard`

Choose the lower-ingestion-cost CloudWatch Logs class for logs that you inspect only occasionally.

`infrequent-access` still supports Logs Insights, but it does not support live tail, metric or subscription
filters, embedded metrics, or Stacktape log forwarding. A log group's class cannot be changed after it is
created, so use this for new resources or stages.

### Example 1 (yaml)

```yaml
resources:
  archiveWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/archive.ts
      logging:
        logClass: infrequent-access
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const archiveWorker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/archive.ts' }),
    logging: {
      logClass: 'infrequent-access'
    }
  });
  return { resources: { archiveWorker } };
});
```

## Property: `logForwarding`

- Required: no
- Type: `http-endpoint | highlight | datadog`

Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).

Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.

Choices:
- `http-endpoint` (`HttpEndpointLogForwarding`). Properties: `endpointUrl: string`, `gzipEncodingEnabled?: boolean`, `parameters?: unknown`, `retryDuration?: number`, `accessKey?: string`.
- `highlight` (`HighlightLogForwarding`). Properties: `projectId: string`, `endpointUrl?: string`.
- `datadog` (`DatadogLogForwarding`). Properties: `apiKey: string`, `endpointUrl?: string`.

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
      memory: 512
      timeout: 10
      logging:
        retentionDays: 90
        logForwarding:
          type: datadog
          properties:
            apiKey: $Secret('datadog.apiKey')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    timeout: 10,
    logging: {
      retentionDays: 90,
      logForwarding: {
        type: 'datadog',
        properties: { apiKey: $Secret('datadog.apiKey') }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `retentionDays`

- Required: no
- Type: `number: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90`
- Default: `30`

How many days to keep logs.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      logging:
        format: json
        retentionDays: 365
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    logging: {
      format: 'json',
      retentionDays: 365
    }
  });

  return { resources: { redis } };
});
```
