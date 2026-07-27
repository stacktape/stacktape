# DatadogLogForwardingProps API Reference

## TypeScript definition

```typescript
type DatadogLogForwardingProps = {
  /** Your Datadog API key. Store as $Secret() for security. */
  apiKey: string;
  /** Datadog endpoint. Use the EU URL if your account is in the EU region. */
  endpointUrl?: string;
};
```

## Property: `apiKey`

- Required: yes
- Type: `string`

Your Datadog API key. Store as `$Secret()` for security.

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
      logging:
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
    logging: {
      logForwarding: {
        type: 'datadog',
        properties: {
          apiKey: $Secret('datadog.apiKey')
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `endpointUrl`

- Required: no
- Type: `string`
- Default: `https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input`

Datadog endpoint. Use the EU URL if your account is in the EU region.

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
      logging:
        logForwarding:
          type: datadog
          properties:
            apiKey: $Secret('datadog.apiKey')
            endpointUrl: https://aws-kinesis-http-intake.logs.datadoghq.eu/v1/input
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'datadog',
        properties: {
          apiKey: $Secret('datadog.apiKey'),
          endpointUrl: 'https://aws-kinesis-http-intake.logs.datadoghq.eu/v1/input'
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```
