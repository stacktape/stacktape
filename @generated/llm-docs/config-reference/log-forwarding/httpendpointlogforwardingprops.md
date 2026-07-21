# HttpEndpointLogForwardingProps API Reference

## TypeScript definition

```typescript
type HttpEndpointLogForwardingProps = {
  /** HTTPS endpoint URL where logs are sent. */
  endpointUrl: string;
  /** Auth credential sent in X-Amz-Firehose-Access-Key header. Store as $Secret() for security. */
  accessKey?: string;
  /** Compress request body with GZIP to reduce transfer costs. */
  gzipEncodingEnabled?: boolean;
  /** Extra metadata sent in the X-Amz-Firehose-Common-Attributes header. */
  parameters?: unknown;
  /** Total retry time (seconds) before sending failed logs to a backup S3 bucket. */
  retryDuration?: number;
};
```

## Property: `endpointUrl`

- Required: yes
- Type: `string`

HTTPS endpoint URL where logs are sent.

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
          type: http-endpoint
          properties:
            endpointUrl: https://logs.example.com/v1/ingest
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'http-endpoint',
        properties: {
          endpointUrl: 'https://logs.example.com/v1/ingest'
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `accessKey`

- Required: no
- Type: `string`

Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.

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
          type: http-endpoint
          properties:
            endpointUrl: https://logs.example.com/v1/ingest
            accessKey: $Secret('logForwarding.accessKey')
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
        type: 'http-endpoint',
        properties: {
          endpointUrl: 'https://logs.example.com/v1/ingest',
          accessKey: $Secret('logForwarding.accessKey')
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `gzipEncodingEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Compress request body with GZIP to reduce transfer costs.

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
          type: http-endpoint
          properties:
            endpointUrl: https://logs.example.com/v1/ingest
            gzipEncodingEnabled: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'http-endpoint',
        properties: {
          endpointUrl: 'https://logs.example.com/v1/ingest',
          gzipEncodingEnabled: true
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `parameters`

- Required: no
- Type: `unknown`

Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.

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
          type: http-endpoint
          properties:
            endpointUrl: https://logs.example.com/v1/ingest
            parameters:
              environment: production
              team: backend
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'http-endpoint',
        properties: {
          endpointUrl: 'https://logs.example.com/v1/ingest',
          parameters: {
            environment: 'production',
            team: 'backend'
          }
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `retryDuration`

- Required: no
- Type: `number`
- Default: `300`

Total retry time (seconds) before sending failed logs to a backup S3 bucket.

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
          type: http-endpoint
          properties:
            endpointUrl: https://logs.example.com/v1/ingest
            retryDuration: 600
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    logging: {
      logForwarding: {
        type: 'http-endpoint',
        properties: {
          endpointUrl: 'https://logs.example.com/v1/ingest',
          retryDuration: 600
        }
      }
    }
  });
  return { resources: { apiFunction } };
});
```
