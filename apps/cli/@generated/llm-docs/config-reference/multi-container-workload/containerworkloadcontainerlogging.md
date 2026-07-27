# ContainerWorkloadContainerLogging API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type ContainerWorkloadContainerLogging = {
  /** Disable logging to CloudWatch. */
  disabled?: boolean;
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: ContainerWorkloadContainerLoggingLogForwarding;
  /** How many days to keep logs. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type ContainerWorkloadContainerLoggingLogForwarding =
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
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          logging:
            disabled: true
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        logging: { disabled: true }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
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
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          logging:
            retentionDays: 30
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        logging: { retentionDays: 30 }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```
