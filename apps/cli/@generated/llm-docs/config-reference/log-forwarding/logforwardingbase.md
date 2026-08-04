# LogForwardingBase API Reference

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type LogForwardingBase = {
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: LogForwardingBaseLogForwarding;
};

/** Union choices used by the properties above. */
type LogForwardingBaseLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
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
