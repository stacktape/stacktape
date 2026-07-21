# HttpApiAccessLogsConfig API Reference

Resource type: `http-api-gateway`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding } from 'stacktape';

type HttpApiAccessLogsConfig = {
  /** Disable access logging. */
  disabled?: boolean;
  /** Log format. Logs include: requestId, IP, method, status, protocol, responseLength. */
  format?: "CLF" | "CSV" | "JSON" | "XML";
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: HttpApiAccessLogsConfigLogForwarding;
  /** How many days to keep logs. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type HttpApiAccessLogsConfigLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable access logging.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      logging:
        disabled: true
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    logging: {
      disabled: true
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `format`

- Required: no
- Type: `string: "CLF" | "CSV" | "JSON" | "XML"`
- Default: `JSON`

Log format. Logs include: requestId, IP, method, status, protocol, responseLength.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      logging:
        format: CLF
        retentionDays: 30
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    logging: {
      format: 'CLF',
      retentionDays: 30
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
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
  apiGateway:
    type: http-api-gateway
    properties:
      logging:
        format: JSON
        retentionDays: 365
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    logging: {
      format: 'JSON',
      retentionDays: 365
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```
