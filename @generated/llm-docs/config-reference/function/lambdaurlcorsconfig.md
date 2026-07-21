# LambdaUrlCorsConfig API Reference

Resource type: `function`

## TypeScript definition

```typescript
type LambdaUrlCorsConfig = {
  /** Enable CORS. When true with no other settings, uses permissive defaults (* for origins and methods). */
  enabled: boolean;
  /** Allow cookies and credentials in cross-origin requests. */
  allowCredentials?: boolean;
  /** Allowed request headers (e.g., Content-Type, Authorization). */
  allowedHeaders?: Array<string>;
  /** Allowed HTTP methods (e.g., GET, POST). */
  allowedMethods?: Array<"*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">;
  /** Allowed origins (e.g., https://example.com). Use * for any origin. */
  allowedOrigins?: Array<string>;
  /** Response headers accessible to browser JavaScript. */
  exposedResponseHeaders?: Array<string>;
  /** How long (seconds) browsers can cache preflight responses. */
  maxAge?: number;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`

Enable CORS. When `true` with no other settings, uses permissive defaults (`*` for origins and methods).

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
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `allowCredentials`

- Required: no
- Type: `boolean`

Allow cookies and credentials in cross-origin requests.

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
          allowCredentials: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        allowCredentials: true
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `allowedHeaders`

- Required: no
- Type: `Array<string>`

Allowed request headers (e.g., `Content-Type`, `Authorization`).

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
          allowedHeaders:
            - Content-Type
            - Authorization
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `allowedMethods`

- Required: no
- Type: `Array<string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">`

Allowed HTTP methods (e.g., `GET`, `POST`).

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
          allowedMethods:
            - GET
            - POST
            - OPTIONS
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        allowedMethods: ['GET', 'POST', 'OPTIONS']
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `allowedOrigins`

- Required: no
- Type: `Array<string>`
- Default: `["*"]`

Allowed origins (e.g., `https://example.com`). Use `*` for any origin.

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
            - https://admin.example.com
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `exposedResponseHeaders`

- Required: no
- Type: `Array<string>`

Response headers accessible to browser JavaScript.

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
          exposedResponseHeaders:
            - X-Request-Id
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        exposedResponseHeaders: ['X-Request-Id']
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `maxAge`

- Required: no
- Type: `number`

How long (seconds) browsers can cache preflight responses.

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
          maxAge: 600
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        maxAge: 600
      }
    }
  });
  return { resources: { apiFunction } };
});
```
