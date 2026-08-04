# LambdaUrlConfig API Reference

Resource type: `function`

## TypeScript definition

```typescript
import type { LambdaUrlCorsConfig } from 'stacktape';

type LambdaUrlConfig = {
  /** Enable the function URL. */
  enabled: boolean;
  /** Who can call this URL. */
  authMode?: "AWS_IAM" | "NONE";
  /** CORS settings for the function URL. Overrides any CORS headers from the function itself. */
  cors?: LambdaUrlCorsConfig;
  /** Stream the response progressively instead of buffering the entire response. */
  responseStreamEnabled?: boolean;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`

Enable the function URL.

### Example 1 (yaml)

```yaml
resources:
  publicFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/public.ts
      url:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const publicFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/public.ts' } },
    url: {
      enabled: true
    }
  });
  return { resources: { publicFunction } };
});
```

## Property: `authMode`

- Required: no
- Type: `string: "AWS_IAM" | "NONE"`
- Default: `NONE`

Who can call this URL.

`NONE` — public, anyone can call it.
`AWS_IAM` — only authenticated AWS users/roles with invoke permission.

### Example 1 (yaml)

```yaml
resources:
  internalFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/internal.ts
      url:
        enabled: true
        authMode: AWS_IAM
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const internalFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/internal.ts' } },
    url: {
      enabled: true,
      authMode: 'AWS_IAM'
    }
  });
  return { resources: { internalFunction } };
});
```

## Property: `cors`

- Required: no
- Type: `LambdaUrlCorsConfig`

CORS settings for the function URL. Overrides any CORS headers from the function itself.

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
      url:
        enabled: true
        cors:
          enabled: true
          allowedOrigins:
            - https://app.example.com
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: { enabled: true, allowedOrigins: ['https://app.example.com'] }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `responseStreamEnabled`

- Required: no
- Type: `boolean`

Stream the response progressively instead of buffering the entire response.

Improves Time to First Byte and increases max response size from 6 MB to 20 MB.
Requires using the AWS streaming handler pattern in your code.

### Example 1 (yaml)

```yaml
resources:
  streamingFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/stream.ts
      memory: 1024
      url:
        enabled: true
        responseStreamEnabled: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const streamingFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/stream.ts' } },
    memory: 1024,
    url: {
      enabled: true,
      responseStreamEnabled: true
    }
  });
  return { resources: { streamingFunction } };
});
```
