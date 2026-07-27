# BucketCorsRule API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
type BucketCorsRule = {
  /** Allowed request headers. */
  allowedHeaders?: Array<string>;
  /** Allowed HTTP methods. */
  allowedMethods?: Array<"*" | "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT">;
  /** Allowed origins (e.g., https://example.com). Use * for any. */
  allowedOrigins?: Array<string>;
  /** Response headers accessible to browser JavaScript. */
  exposedResponseHeaders?: Array<string>;
  /** How long (seconds) browsers can cache preflight responses. */
  maxAge?: number;
};
```

## Property: `allowedHeaders`

- Required: no
- Type: `Array<string>`

Allowed request headers.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
        corsRules:
          - allowedOrigins:
              - 'https://app.example.com'
            allowedMethods:
              - PUT
            allowedHeaders:
              - 'Content-Type'
              - 'Authorization'
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true,
      corsRules: [
        {
          allowedOrigins: ['https://app.example.com'],
          allowedMethods: ['PUT'],
          allowedHeaders: ['Content-Type', 'Authorization']
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `allowedMethods`

- Required: no
- Type: `Array<string: "*" | "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT">`

Allowed HTTP methods.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
        corsRules:
          - allowedOrigins:
              - 'https://app.example.com'
            allowedMethods:
              - GET
              - PUT
              - POST
              - DELETE
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true,
      corsRules: [
        {
          allowedOrigins: ['https://app.example.com'],
          allowedMethods: ['GET', 'PUT', 'POST', 'DELETE']
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `allowedOrigins`

- Required: no
- Type: `Array<string>`

Allowed origins (e.g., `https://example.com`). Use `*` for any.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
        corsRules:
          - allowedOrigins:
              - 'https://app.example.com'
              - 'https://admin.example.com'
            allowedMethods:
              - GET
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true,
      corsRules: [
        {
          allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
          allowedMethods: ['GET']
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `exposedResponseHeaders`

- Required: no
- Type: `Array<string>`

Response headers accessible to browser JavaScript.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
        corsRules:
          - allowedOrigins:
              - 'https://app.example.com'
            allowedMethods:
              - GET
            exposedResponseHeaders:
              - 'ETag'
              - 'x-amz-request-id'
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true,
      corsRules: [
        {
          allowedOrigins: ['https://app.example.com'],
          allowedMethods: ['GET'],
          exposedResponseHeaders: ['ETag', 'x-amz-request-id']
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `maxAge`

- Required: no
- Type: `number`

How long (seconds) browsers can cache preflight responses.

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
        corsRules:
          - allowedOrigins:
              - 'https://app.example.com'
            allowedMethods:
              - GET
            maxAge: 3600
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true,
      corsRules: [
        {
          allowedOrigins: ['https://app.example.com'],
          allowedMethods: ['GET'],
          maxAge: 3600
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```
