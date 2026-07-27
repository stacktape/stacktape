# ConvexStorageConfig API Reference

Storage defaults applied to all five Convex S3 buckets.

## TypeScript definition

```typescript
import type { AbortIncompleteMultipartUpload, ClassTransition, Expiration, NonCurrentVersionClassTransition, NonCurrentVersionExpiration } from 'stacktape';

type ConvexStorageConfig = {
  /** Encrypt stored objects at rest (AES-256). */
  encryption?: boolean;
  /** Auto-delete or move objects to cheaper storage classes over time. */
  lifecycleRules?: Array<ConvexStorageConfigLifecycleRules>;
  /** Keep previous versions of overwritten/deleted objects. Useful for recovery; increases storage cost. */
  versioning?: boolean;
};

/** Union choices used by the properties above. */
type ConvexStorageConfigLifecycleRules =
  | Expiration
  | NonCurrentVersionExpiration
  | ClassTransition
  | NonCurrentVersionClassTransition
  | AbortIncompleteMultipartUpload;
```

## Property: `encryption`

- Required: no
- Type: `boolean`
- Default: `true`

Encrypt stored objects at rest (AES-256).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      storage:
        encryption: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    storage: {
      encryption: true
    }
  });
  return { resources: { backend } };
});
```

## Property: `lifecycleRules`

- Required: no
- Type: `Array<expiration | non-current-version-expiration | class-transition | non-current-version-class-transition | abort-incomplete-multipart-upload>`

Auto-delete or move objects to cheaper storage classes over time.

Applied to all five buckets. Most useful for the `exports` bucket if you don't want old
snapshot exports accumulating indefinitely.

Choices:
- `expiration` (`Expiration`). Properties: `daysAfterUpload: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `non-current-version-expiration` (`NonCurrentVersionExpiration`). Properties: `daysAfterVersioned: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `class-transition` (`ClassTransition`). Properties: `daysAfterUpload: number`, `storageClass: string: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA"`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `non-current-version-class-transition` (`NonCurrentVersionClassTransition`). Properties: `daysAfterVersioned: number`, `storageClass: string: "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA"`, `prefix?: string`, `tags?: Array<KeyValuePair>`.
- `abort-incomplete-multipart-upload` (`AbortIncompleteMultipartUpload`). Properties: `daysAfterInitiation: number`, `prefix?: string`, `tags?: Array<KeyValuePair>`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      storage:
        versioning: true
        lifecycleRules:
          - type: expiration
            properties:
              prefix: exports/
              daysAfterUpload: 30
          - type: non-current-version-expiration
            properties:
              daysAfterVersioned: 90
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    storage: {
      versioning: true,
      lifecycleRules: [
        {
          type: 'expiration',
          properties: {
            prefix: 'exports/',
            daysAfterUpload: 30
          }
        },
        {
          type: 'non-current-version-expiration',
          properties: {
            daysAfterVersioned: 90
          }
        }
      ]
    }
  });
  return { resources: { backend } };
});
```

## Property: `versioning`

- Required: no
- Type: `boolean`
- Default: `false`

Keep previous versions of overwritten/deleted objects. Useful for recovery; increases storage cost.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      storage:
        versioning: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    storage: {
      versioning: true
    }
  });
  return { resources: { backend } };
});
```
