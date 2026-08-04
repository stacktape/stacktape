# BatchJobLogging API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type BatchJobLogging = {
  /** Disable logging to CloudWatch. */
  disabled?: boolean;
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: BatchJobLoggingLogForwarding;
  /** How many days to keep logs. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type BatchJobLoggingLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable logging to CloudWatch.

### Example 1 (yaml)

```yaml
resources:
  quietJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 1
        memory: 1920
      logging:
        disabled: true
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const quietJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/job.ts' }
      }
    },
    resources: { cpu: 1, memory: 1920 },
    logging: {
      disabled: true
    }
  });
  return { resources: { quietJob } };
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
- Default: `90`

How many days to keep logs.

### Example 1 (yaml)

```yaml
resources:
  auditJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/audit.ts
      resources:
        cpu: 1
        memory: 1920
      logging:
        retentionDays: 365
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const auditJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/audit.ts' }
      }
    },
    resources: { cpu: 1, memory: 1920 },
    logging: {
      retentionDays: 365
    }
  });
  return { resources: { auditJob } };
});
```
