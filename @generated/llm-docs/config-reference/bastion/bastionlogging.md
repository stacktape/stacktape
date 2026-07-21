# BastionLogging API Reference

Resource type: `bastion`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type BastionLogging = {
  /** Disable this log type. Stops sending to CloudWatch. */
  disabled?: boolean;
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: BastionLoggingLogForwarding;
  /** Days to keep logs in CloudWatch before automatic deletion. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type BastionLoggingLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable this log type. Stops sending to CloudWatch.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        secure:
          retentionDays: 180
        audit:
          disabled: true
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      secure: { retentionDays: 180 },
      audit: {
        disabled: true
      }
    }
  });
  return { resources: { bastion } };
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

Days to keep logs in CloudWatch before automatic deletion.

### Example 1 (yaml)

```yaml
resources:
  bastion:
    type: bastion
    properties:
      instanceSize: t3.micro
      logging:
        messages:
          retentionDays: 90
        secure:
          retentionDays: 180
```

### Example 2 (typescript)

```typescript
import { Bastion, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.micro',
    logging: {
      messages: {
        retentionDays: 90
      },
      secure: { retentionDays: 180 }
    }
  });
  return { resources: { bastion } };
});
```
