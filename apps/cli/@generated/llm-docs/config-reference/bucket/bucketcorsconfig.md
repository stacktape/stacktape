# BucketCorsConfig API Reference

Resource type: `bucket`

## TypeScript definition

```typescript
import type { BucketCorsRule } from 'stacktape';

type BucketCorsConfig = {
  /** Enable CORS. When true with no rules, uses permissive defaults (* origins, all methods). */
  enabled: boolean;
  /** Custom CORS rules. First matching rule wins for each preflight request. */
  corsRules?: Array<BucketCorsRule>;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`

Enable CORS. When `true` with no rules, uses permissive defaults (`*` origins, all methods).

### Example 1 (yaml)

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      cors:
        enabled: true
      accessibility:
        accessibilityMode: public-read
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const myBucket = new Bucket({
    cors: {
      enabled: true
    },
    accessibility: {
      accessibilityMode: 'public-read'
    }
  });
  return { resources: { myBucket } };
});
```

## Property: `corsRules`

- Required: no
- Type: `Array<BucketCorsRule>`

Custom CORS rules. First matching rule wins for each preflight request.

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
              - 'https://example.com'
            allowedMethods:
              - GET
              - PUT
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
          allowedOrigins: ['https://example.com'],
          allowedMethods: ['GET', 'PUT']
        }
      ]
    }
  });
  return { resources: { myBucket } };
});
```
